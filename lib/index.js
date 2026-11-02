/**
 * dsh-ai-toolbox — Host half.
 *
 * Scans configured folders for local AI projects, infers a launch command and
 * a local URL, and owns the lifecycle of the tools it starts. The browser half
 * (lib/client.js) only talks to the `/ai-toolbox` routes registered here.
 *
 * Design rules:
 * - No implicit shell: every child is an argv array, never an interpolated
 *   shell string.
 * - All managed processes go through ctx.subprocess, so a plugin reload and a
 *   DSH shutdown terminate the complete managed range.
 * - The tool registry lives in ~/.dsh/ai-toolbox/tools.json and is written
 *   atomically. READMEs are read on demand and never persisted.
 */

import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { existsSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

export const name = 'ai-toolbox'
/** Route carrier, browser trust fence, and the process capability. */
export const inject = ['webServer', 'connection', 'subprocess']

/** Absolute route prefix; every route is same-origin and cookie-authenticated. */
const ROUTE = '/ai-toolbox'
const VERSION = '0.1.0'
const MAX_BODY_BYTES = 512 * 1024
const MAX_README_BYTES = 512 * 1024
const LOG_LIMIT = 192 * 1024

const UNSORTED_CATEGORY = '未分类'
const GAME_PATTERN = /小游戏|游戏|game(?:play|s|ing)?|moba|roguelike|racing|drone|puzzle|shooter|rpg|platformer|arcade|pixel|fps|跑酷|射击|冒险/i
const KNOWLEDGE_PATTERN = /知识库|知识|knowledge|memory|rag\b|向量|embedding|检索|codebase|graph|文档库|wiki/i

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'out', 'target',
  'vendor', '.venv', 'venv', 'env', '__pycache__', '.next', '.nuxt', '.turbo',
  'coverage', '.cache', '.idea', '.vscode', 'Pods', 'DerivedData', 'tmp', 'temp',
])

const README_NAMES = [
  'README.md', 'readme.md', 'Readme.md', 'README.MD', 'README.markdown',
  'README.zh.md', 'README.zh-CN.md', 'README.zh-cn.md', 'README', 'readme',
]

const DEFAULT_FOLDER_NAMES = [
  ['Documents', 'deepseek-harness'],
  ['Documents', 'GitHub'],
  ['Documents', 'Projects'],
  ['Projects'],
  ['projects'],
  ['code'],
  ['Code'],
]

/** HTTP JSON response, never cached: every answer is live process state. */
function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/** A bounded JSON error line. */
function fail(res, status, code, message) {
  sendJson(res, status, { ok: false, error: { code, message } })
}

/** A user-correctable host error; the route maps it to HTTP 400. */
function userError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

/** Short stable hash used by directory and tool ids. */
function shortHash(value) {
  return createHash('sha1').update(value).digest('hex').slice(0, 12)
}

function directoryId(realPath) {
  return `d_${shortHash(realPath)}`
}

function toolId(kind, realPath) {
  return `t_${shortHash(`${kind}\u0000${realPath}`)}`
}

function expandHome(value) {
  if (value === '~') return os.homedir()
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2))
  return value
}

function dshHome() {
  return process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
}

function cleanText(value, max = 400) {
  return String(value ?? '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function parseBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function parseNumber(value, fallback, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.floor(number)))
}

async function statSafe(target) {
  try { return await fs.stat(target) } catch { return null }
}

async function readTextFile(file, maxBytes = MAX_README_BYTES) {
  let handle
  try {
    handle = await fs.open(file, 'r')
    const stat = await handle.stat()
    const size = Math.min(stat.size, maxBytes)
    const buffer = Buffer.alloc(size)
    await handle.read(buffer, 0, size, 0)
    return buffer.toString('utf8').replace(/^\uFEFF/, '')
  } catch {
    return ''
  } finally {
    await handle?.close().catch(() => {})
  }
}

async function readJsonFile(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) } catch { return null }
}

function commandLabel(launch) {
  if (!launch) return ''
  return [launch.command, ...(launch.args ?? [])].join(' ')
}

/** Detect a package manager from the manifest and the lockfiles beside it. */
function detectPackageManager(dir, pkg, files) {
  const declared = typeof pkg?.packageManager === 'string' ? pkg.packageManager.split('@')[0] : ''
  if (['pnpm', 'yarn', 'bun', 'npm'].includes(declared)) return declared
  if (files.has('pnpm-lock.yaml') || files.has('pnpm-workspace.yaml')) return 'pnpm'
  if (files.has('bun.lockb') || files.has('bun.lock')) return 'bun'
  if (files.has('yarn.lock')) return 'yarn'
  return 'npm'
}

function scriptCommand(pm, scriptName) {
  if (pm === 'npm') return ['npm', ['run', scriptName]]
  if (pm === 'bun') return ['bun', ['run', scriptName]]
  if (pm === 'yarn') return ['yarn', [scriptName]]
  return ['pnpm', [scriptName]]
}

/** Read a PORT from dotenv files without loading them into the host process. */
async function portFromEnvFiles(dir, files) {
  for (const name of ['.env.local', '.env.development.local', '.env.development', '.env']) {
    if (!files.has(name)) continue
    const text = await readTextFile(path.join(dir, name), 64 * 1024)
    const match = /^(?:export\s+)?PORT\s*=\s*["']?(\d{2,5})/m.exec(text)
    if (match) return Number(match[1])
  }
  return 0
}

/** Framework defaults used only when no explicit port appears anywhere. */
function frameworkPort(pkg, files, scriptName = '') {
  if (scriptName === 'preview') return 4173
  const deps = {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
  }
  if (deps.vite) return scriptName === 'preview' ? 4173 : 5173
  if (deps.next || deps.nuxt) return 3000
  if (deps['react-scripts']) return 3000
  if (deps['@angular/cli']) return 4200
  if (deps.astro) return 4321
  if (deps['@storybook/react'] || deps['@storybook/react-vite']) return 6006
  if (deps.expo) return 8081
  if (files.has('vite.config.ts') || files.has('vite.config.js') || files.has('vite.config.mjs')) {
    return scriptName === 'preview' ? 4173 : 5173
  }
  if (files.has('next.config.js') || files.has('next.config.mjs') || files.has('next.config.ts')) return 3000
  return 0
}

function localUrl(port) {
  return port > 0 && port < 65536 ? `http://localhost:${port}` : ''
}

/** Find a localhost URL in prose or command output. */
function extractLocalUrl(text) {
  if (!text) return ''
  const withScheme = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d{2,5})?(?:\/[^\s"'<>]*)?/i.exec(text)
  let found = withScheme?.[0] ?? ''
  if (!found) {
    const bare = /(?:localhost|127\.0\.0\.1):(\d{2,5})/i.exec(text)
    if (bare) found = `http://${bare[0]}`
  }
  if (!found) return ''
  return found
    .replace('0.0.0.0', '127.0.0.1')
    .replace(/[),.;]+$/, '')
    .replace(/\/$/, '')
}

/** Extract a port written beside a --port/-p flag in a package script. */
function portFromScript(script) {
  const match = /(?:--port(?:=|\s+)|-p(?:=|\s+))(\d{2,5})/i.exec(String(script ?? ''))
  return match ? Number(match[1]) : 0
}

/** Strip markdown noise from a README paragraph. */
function plainMarkdown(text) {
  return cleanText(
    String(text ?? '')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[`*_~>#]/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
    240,
  )
}

/** First meaningful paragraph of a README, skipping badges and headings. */
function describeReadme(markdown) {
  if (!markdown) return ''
  const withoutFrontMatter = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
  const lines = withoutFrontMatter.split(/\r?\n/)
  let paragraph = []
  let started = false
  for (const raw of lines) {
    const line = raw.trim()
    if (!started) {
      if (!line || line.startsWith('#') || line.startsWith('[![') || line.startsWith('![')
        || line.startsWith('<') || line.startsWith('|') || line.startsWith('```')
        || /^[-=]{3,}$/.test(line) || /^table of contents/i.test(line)) continue
      started = true
    }
    if (!line) break
    if (line.startsWith('#')) break
    paragraph.push(line)
  }
  if (paragraph.length === 0) return ''
  return plainMarkdown(paragraph.join(' '))
}

/** The first level-one heading, used when the package has no better name. */
function readmeTitle(markdown) {
  const match = /^#\s+(.+)$/m.exec(markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''))
  return match ? plainMarkdown(match[1]) : ''
}

/** Human title from a package name, preserving common acronyms. */
function titleFromName(value) {
  const base = String(value ?? '').split('/').pop() ?? ''
  const words = base.replace(/^dsh[-_]/, '').split(/[-_\s]+/).filter(Boolean)
  const acronyms = new Map([
    ['ai', 'AI'], ['ui', 'UI'], ['api', 'API'], ['dsh', 'DSH'], ['llm', 'LLM'],
    ['mcp', 'MCP'], ['cli', 'CLI'], ['html', 'HTML'], ['css', 'CSS'], ['os', 'OS'],
  ])
  return words.map((word) => acronyms.get(word.toLowerCase())
    ?? (word.length <= 2 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1))).join(' ')
}

/** Whether a directory holds a project rather than a generic folder. */
function looksLikeProject(files) {
  const manifests = ['package.json', 'pyproject.toml', 'requirements.txt', 'Cargo.toml', 'go.mod', 'index.html', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']
  if (manifests.some((name) => files.has(name))) return true
  if (files.has('README.md') || files.has('readme.md') || files.has('README')) {
    for (const name of files) {
      if (/\.(?:py|js|mjs|cjs|ts|tsx|jsx|go|rs|sh|html|ipynb)$/i.test(name)) return true
    }
  }
  return false
}

async function findReadme(dir, files) {
  for (const name of README_NAMES) {
    if (!files.has(name)) continue
    const file = path.join(dir, name)
    const stat = await statSafe(file)
    if (stat?.isFile()) return file
  }
  if (existsSync(path.join(dir, 'docs'))) {
    const nested = path.join(dir, 'docs')
    const nestedFiles = await fs.readdir(nested).catch(() => [])
    for (const name of README_NAMES) {
      if (!nestedFiles.includes(name)) continue
      const file = path.join(nested, name)
      const stat = await statSafe(file)
      if (stat?.isFile()) return file
    }
  }
  return null
}

/** Candidate executables in a project root: .app bundles, scripts, and executable files. */
async function findExecutables(dir, entries) {
  const results = []
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.endsWith('.app')) {
      results.push({ kind: 'app', path: path.join(dir, entry.name) })
      continue
    }
    if (!entry.isFile()) continue
    if (/^(?:start|dev|run|launch|serve)\.(?:sh|command)$/i.test(entry.name)) {
      results.push({ kind: 'executable', path: path.join(dir, entry.name) })
      continue
    }
    if (entry.name.endsWith('.command')) {
      results.push({ kind: 'executable', path: path.join(dir, entry.name) })
    }
  }
  return results.slice(0, 4)
}

/** Commands mentioned in a README, used only when no manifest yields one. */
function commandFromReadme(markdown) {
  if (!markdown) return null
  const text = markdown.replace(/\r/g, '')
  const patterns = [
    /^\s*(?:[$>]\s*)?(pnpm(?:\s+run)?\s+[a-z0-9:_-]+)\s*$/im,
    /^\s*(?:[$>]\s*)?(npm\s+run\s+[a-z0-9:_-]+)\s*$/im,
    /^\s*(?:[$>]\s*)?(yarn\s+[a-z0-9:_-]+)\s*$/im,
    /^\s*(?:[$>]\s*)?(bun\s+run\s+[a-z0-9:_-]+)\s*$/im,
    /^\s*(?:[$>]\s*)?((?:python3?|uvicorn|streamlit|flask)\s+[^\n`]+)\s*$/im,
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (!match) continue
    const parts = match[1].trim().split(/\s+/)
    return { command: parts[0], args: parts.slice(1) }
  }
  return null
}

/** Infer the launch command of one project directory. */
async function detectLaunch(dir, files, entries, pkg, readme, readmeText) {
  if (pkg && typeof pkg === 'object') {
    const scripts = pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {}
    const preferred = ['dev', 'start', 'serve', 'preview', 'web', 'ui', 'app', 'run']
    const scriptName = preferred.find((name) => typeof scripts[name] === 'string' && scripts[name].trim().length > 0)
    if (scriptName) {
      const pm = detectPackageManager(dir, pkg, files)
      const [command, args] = scriptCommand(pm, scriptName)
      return {
        command,
        args,
        cwd: dir,
        label: pm === 'npm' ? `npm run ${scriptName}` : `${pm} ${scriptName}`,
        script: scripts[scriptName],
        packageManager: pm,
        frameworkPort: portFromScript(scripts[scriptName]) || frameworkPort(pkg, files, scriptName),
      }
    }
    if (typeof pkg.bin === 'string') {
      const binPath = path.join(dir, pkg.bin)
      if (existsSync(binPath)) return { command: process.execPath, args: [binPath], cwd: dir, label: `node ${pkg.bin}` }
    } else if (pkg.bin && typeof pkg.bin === 'object') {
      const first = Object.values(pkg.bin).find((value) => typeof value === 'string')
      if (first && existsSync(path.join(dir, first))) {
        return { command: process.execPath, args: [path.join(dir, first)], cwd: dir, label: `node ${first}` }
      }
    }
    if (typeof pkg.main === 'string' && /\.(?:js|mjs|cjs)$/.test(pkg.main) && existsSync(path.join(dir, pkg.main))) {
      return { command: process.execPath, args: [pkg.main], cwd: dir, label: `node ${pkg.main}` }
    }
  }

  const python = existsSync(path.join(dir, '.venv', 'bin', 'python'))
    ? path.join(dir, '.venv', 'bin', 'python')
    : 'python3'
  const hasPython = (name) => files.has(name)

  if (hasPython('manage.py')) {
    return { command: python, args: ['manage.py', 'runserver', '8000'], cwd: dir, label: 'Django', frameworkPort: 8000 }
  }
  if (hasPython('app.py')) {
    const source = await readTextFile(path.join(dir, 'app.py'), 64 * 1024)
    if (/\bstreamlit\b/i.test(source)) {
      return { command: 'streamlit', args: ['run', 'app.py'], cwd: dir, label: 'Streamlit', frameworkPort: 8501 }
    }
    if (/\bgradio\b/i.test(source)) {
      return { command: python, args: ['app.py'], cwd: dir, label: 'Gradio', frameworkPort: 7860 }
    }
    if (/\bFlask\s*\(/i.test(source)) {
      return { command: python, args: ['app.py'], cwd: dir, label: 'Flask', frameworkPort: 5000 }
    }
    if (/\bFastAPI\s*\(/i.test(source)) {
      return { command: python, args: ['-m', 'uvicorn', 'app:app', '--reload', '--port', '8000'], cwd: dir, label: 'FastAPI', frameworkPort: 8000 }
    }
    return { command: python, args: ['app.py'], cwd: dir, label: 'python app.py' }
  }
  if (hasPython('main.py')) {
    const source = await readTextFile(path.join(dir, 'main.py'), 64 * 1024)
    if (/\bstreamlit\b/i.test(source)) {
      return { command: 'streamlit', args: ['run', 'main.py'], cwd: dir, label: 'Streamlit', frameworkPort: 8501 }
    }
    return { command: python, args: ['main.py'], cwd: dir, label: 'python main.py' }
  }
  if (hasPython('server.py')) {
    return { command: python, args: ['server.py'], cwd: dir, label: 'python server.py' }
  }

  if (files.has('Cargo.toml')) return { command: 'cargo', args: ['run'], cwd: dir, label: 'cargo run' }
  if (files.has('go.mod')) return { command: 'go', args: ['run', '.'], cwd: dir, label: 'go run .' }
  if (files.has('docker-compose.yml') || files.has('docker-compose.yaml') || files.has('compose.yml') || files.has('compose.yaml')) {
    return { command: 'docker', args: ['compose', 'up'], cwd: dir, label: 'docker compose up' }
  }

  if (files.has('pom.xml')) {
    const pom = await readTextFile(path.join(dir, 'pom.xml'), 128 * 1024)
    if (/spring-boot/i.test(pom)) {
      return { command: 'mvn', args: ['spring-boot:run'], cwd: dir, label: 'mvn spring-boot:run', frameworkPort: 8080 }
    }
  }
  if (files.has('build.gradle') || files.has('build.gradle.kts')) {
    const gradle = await readTextFile(path.join(dir, files.has('build.gradle') ? 'build.gradle' : 'build.gradle.kts'), 128 * 1024)
    if (/spring-boot/i.test(gradle)) {
      const wrapper = files.has('gradlew') ? './gradlew' : 'gradle'
      return { command: wrapper, args: ['bootRun'], cwd: dir, label: `${wrapper} bootRun`, frameworkPort: 8080 }
    }
  }
  const csproj = [...files].find((name) => name.endsWith('.csproj'))
  if (csproj) return { command: 'dotnet', args: ['run'], cwd: dir, label: 'dotnet run', frameworkPort: 5000 }
  if (files.has('index.html')) {
    const port = 8100 + (Number.parseInt(shortHash(dir).slice(0, 4), 16) % 800)
    return {
      command: 'python3',
      args: ['-m', 'http.server', String(port), '--bind', '127.0.0.1'],
      cwd: dir,
      label: `python3 -m http.server ${port}`,
      frameworkPort: port,
    }
  }

  const shellScripts = [...files].filter((file) => /\.sh$/i.test(file) && /^(?:start|dev|run|launch|serve|server)(?:[-_.].*)?\.sh$/i.test(file))
  const shellScript = shellScripts.find((file) => /server|serve/i.test(file)) ?? shellScripts[0]
  if (shellScript) return { command: '/bin/sh', args: [shellScript], cwd: dir, label: `/bin/sh ${shellScript}` }

  if (files.has('Makefile')) {
    const makefile = await readTextFile(path.join(dir, 'Makefile'), 64 * 1024)
    const target = ['dev', 'start', 'run', 'serve'].find((name) => new RegExp(`^${name}:`, 'm').test(makefile))
    if (target) return { command: 'make', args: [target], cwd: dir, label: `make ${target}` }
  }

  const app = (await findExecutables(dir, entries)).find((entry) => entry.kind === 'app')
  if (app) return { appPath: app.path, cwd: dir, label: `open ${path.basename(app.path)}` }

  const readmeCommand = commandFromReadme(readmeText)
  if (readmeCommand) {
    return { ...readmeCommand, cwd: dir, label: [readmeCommand.command, ...readmeCommand.args].join(' ') }
  }

  const executable = (await findExecutables(dir, entries)).find((entry) => entry.kind === 'executable')
  if (executable) {
    return { command: executable.path, args: [], cwd: dir, label: path.basename(executable.path) }
  }

  return null
}

/** Build one tool descriptor from a project directory. */
async function detectProject(dir, rootId) {
  let real
  try { real = await fs.realpath(dir) } catch { return null }
  const stat = await statSafe(real)
  if (!stat?.isDirectory()) return null

  if (real.endsWith('.app')) {
    const now = Date.now()
    return {
      id: toolId('app', real),
      name: path.basename(real, '.app'),
      description: '本地应用',
      kind: 'app',
      origin: 'scan',
      rootId,
      path: real,
      sourcePath: real,
      appPath: real,
      readmePath: null,
      hasReadme: false,
      launch: null,
      url: '',
      tags: ['应用'],
      category: inferCategory({ name: path.basename(real, '.app'), description: '本地应用', kind: 'app' }),
      createdAt: now,
      updatedAt: now,
    }
  }

  let entries
  try { entries = await fs.readdir(real, { withFileTypes: true }) } catch { return null }
  const files = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name))
  const hasApp = entries.some((entry) => entry.isDirectory() && entry.name.endsWith('.app'))
  const hasExecutable = entries.some((entry) => entry.isFile() && /\.(?:command|sh)$/i.test(entry.name))
  if (!looksLikeProject(files) && !hasApp && !hasExecutable) return null

  const pkg = files.has('package.json') ? await readJsonFile(path.join(real, 'package.json')) : null
  const readmePath = await findReadme(real, files)
  const readmeText = readmePath ? await readTextFile(readmePath, 96 * 1024) : ''
  const launch = await detectLaunch(real, files, entries, pkg, Boolean(readmePath), readmeText)

  let port = launch?.frameworkPort || 0
  if (!port) port = await portFromEnvFiles(real, files)
  if (!port) {
    const readmePort = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})/i.exec(readmeText)
    if (readmePort) port = Number(readmePort[1])
  }
  const url = launch?.appPath ? '' : localUrl(port)

  const packageName = typeof pkg?.name === 'string' ? pkg.name : ''
  const readmeHeading = readmeTitle(readmeText)
  const fallbackName = readmeHeading || packageName || path.basename(real)
  const name = packageName ? titleFromName(packageName) : plainMarkdown(fallbackName)
  const description = cleanText(
    (typeof pkg?.description === 'string' && pkg.description.trim())
    || describeReadme(readmeText)
    || (launch ? `本地项目 · ${launch.label}` : '本地项目'),
    240,
  )

  return {
    id: toolId('project', real),
    name: name || path.basename(real),
    description,
    kind: launch?.appPath ? 'app' : 'project',
    origin: 'scan',
    rootId,
    path: real,
    sourcePath: real,
    appPath: launch?.appPath || null,
    readmePath: readmePath || null,
    hasReadme: Boolean(readmePath),
    launch: launch?.command
      ? {
          command: launch.command,
          args: launch.args ?? [],
          cwd: launch.cwd || real,
          label: launch.label || commandLabel(launch),
        }
      : null,
    url,
    tags: [
      packageName ? 'Node' : '',
      files.has('pyproject.toml') || files.has('requirements.txt') || files.has('app.py') || files.has('main.py') ? 'Python' : '',
      files.has('Cargo.toml') ? 'Rust' : '',
      files.has('go.mod') ? 'Go' : '',
      launch ? '可启动' : '仅文档',
    ].filter(Boolean),
    category: inferCategory({ name, description, readme: readmeText, kind: launch?.appPath ? 'app' : 'project' }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/** A small helper that limits concurrent filesystem reads. */
async function mapLimited(items, limit, worker) {
  const results = new Array(items.length)
  let index = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++
      results[current] = await worker(items[current], current)
    }
  })
  await Promise.all(runners)
  return results
}

/** Repair older executable entries whose command was accidentally saved as a flag. */
function inferCategory({ name = '', description = '', readme = '', kind = 'project' } = {}) {
  if (kind === 'url') return '外部工具'
  // Name and description are deliberate labels; matching the whole README
  // mislabels tools that merely mention memory or a game in passing.
  const text = `${name}\n${description}`
  if (GAME_PATTERN.test(text)) return '小游戏'
  if (KNOWLEDGE_PATTERN.test(text)) return '知识库'
  return '工具'
}

function normalizeStoredTool(tool) {
  const launch = tool?.launch
  if (tool?.kind === 'executable' && launch && typeof launch.command === 'string'
    && launch.command.startsWith('-') && typeof tool.path === 'string') {
    const args = [launch.command, ...(Array.isArray(launch.args) ? launch.args : [])]
    tool.launch = {
      ...launch,
      command: tool.path,
      args,
      label: [tool.path, ...args].join(' '),
    }
    tool.launchLocked = true
  }
  if (tool && !tool.categoryLocked) {
    tool.category = inferCategory(tool)
  }
  return tool
}

export function apply(ctx, rawConfig = {}) {
  const config = rawConfig && typeof rawConfig === 'object' ? rawConfig : {}
  const dataDir = path.resolve(expandHome(typeof config.dataDir === 'string' && config.dataDir
    ? config.dataDir
    : path.join(dshHome(), 'ai-toolbox')))
  const storePath = path.join(dataDir, 'tools.json')
  const logsDir = path.join(dataDir, 'logs')
  const startTimeoutMs = parseNumber(config.startTimeoutMs, 30_000, 3_000, 180_000)
  const logBytes = parseNumber(config.logBytes, LOG_LIMIT, 16 * 1024, 2 * 1024 * 1024)

  /** @type {any} */
  let store = null
  let readyPromise = null
  let saveChain = Promise.resolve()
  /** @type {Map<string, any>} */
  const runtimes = new Map()
  let disposed = false

  const logger = () => {
    try { return ctx.logger } catch { return undefined }
  }
  const logInfo = (message) => {
    try { logger()?.info?.(`[ai-toolbox] ${message}`) } catch { /* logging must never break a route */ }
  }
  const logWarn = (message) => {
    try { logger()?.warn?.(`[ai-toolbox] ${message}`) } catch { /* logging must never break a route */ }
  }

  function defaultDirectories() {
    const candidates = Array.isArray(config.directories) && config.directories.length > 0
      ? config.directories
      : DEFAULT_FOLDER_NAMES.map((parts) => path.join(os.homedir(), ...parts))
    const result = []
    const seen = new Set()
    for (const candidate of candidates) {
      if (typeof candidate !== 'string' || !candidate.trim()) continue
      const resolved = path.resolve(expandHome(candidate.trim()))
      if (seen.has(resolved) || !existsSync(resolved)) continue
      seen.add(resolved)
      result.push({
        id: directoryId(resolved),
        path: resolved,
        label: path.basename(resolved) || resolved,
        addedAt: Date.now(),
      })
      if (result.length >= 6) break
    }
    return result
  }

  async function ensureDirectories() {
    await fs.mkdir(dataDir, { recursive: true })
    await fs.mkdir(logsDir, { recursive: true })
  }

  async function saveStore() {
    const write = async () => {
      const temporary = `${storePath}.${process.pid}.tmp`
      await fs.writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
      await fs.rename(temporary, storePath)
    }
    saveChain = saveChain.then(write, write)
    return saveChain
  }

  async function loadStore() {
    await ensureDirectories()
    const parsed = await readJsonFile(storePath)
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tools)) {
      store = {
        version: 1,
        seeded: parseBoolean(parsed.seeded, true),
        directories: Array.isArray(parsed.directories) ? parsed.directories.filter((dir) => dir && typeof dir.path === 'string') : [],
        tools: parsed.tools
          .filter((tool) => tool && typeof tool.id === 'string' && typeof tool.path === 'string')
          .map(normalizeStoredTool),
        hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter((item) => typeof item === 'string') : [],
      }
    } else {
      store = { version: 1, seeded: false, directories: [], tools: [], hidden: [] }
    }
    if (!store.seeded) {
      store.directories = defaultDirectories()
      store.seeded = true
    }
    store.hidden = Array.from(new Set(store.hidden))
    await saveStore()
  }

  async function ensureReady() {
    if (readyPromise) return readyPromise
    readyPromise = (async () => {
      await loadStore()
      if (store.directories.length > 0) {
        if (store.tools.length === 0) await rescanAll({ persist: true })
        else void rescanAll({ persist: true }).catch((error) => logWarn(`background rescan failed: ${cleanText(error?.message ?? error)}`))
      }
    })().catch((error) => {
      readyPromise = null
      throw error
    })
    return readyPromise
  }

  function hiddenSet() {
    return new Set(store?.hidden ?? [])
  }

  function mergeTool(previous, next) {
    if (!previous) return next
    const pathLocked = Boolean(previous.pathLocked)
    return {
      ...next,
      id: pathLocked ? previous.id : next.id,
      path: pathLocked ? previous.path : next.path,
      appPath: pathLocked ? previous.appPath : next.appPath,
      readmePath: pathLocked ? previous.readmePath : next.readmePath,
      hasReadme: pathLocked ? previous.hasReadme : next.hasReadme,
      sourcePath: previous.sourcePath || next.sourcePath || next.path,
      pathLocked,
      nameLocked: previous.nameLocked,
      descriptionLocked: previous.descriptionLocked,
      urlLocked: previous.urlLocked,
      launchLocked: previous.launchLocked,
      categoryLocked: Boolean(previous.categoryLocked),
      category: previous.categoryLocked ? previous.category : next.category,
      favorite: Boolean(previous.favorite),
      lastUsedAt: Number(previous.lastUsedAt) || 0,
      createdAt: previous.createdAt ?? next.createdAt,
      name: previous.nameLocked ? previous.name : next.name,
      description: previous.descriptionLocked ? previous.description : next.description,
      url: previous.urlLocked ? previous.url : next.url,
      launch: previous.launchLocked ? previous.launch : next.launch,
    }
  }

  async function scanDirectory(directory) {
    const found = []
    const rootTool = await detectProject(directory.path, directory.id)
    if (rootTool) found.push(rootTool)

    let entries
    try { entries = await fs.readdir(directory.path, { withFileTypes: true }) } catch { return found }
    const children = entries
      .filter((entry) => entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.'))
      .slice(0, 300)
    const detected = await mapLimited(children, 6, (entry) => detectProject(path.join(directory.path, entry.name), directory.id))
    for (const tool of detected) {
      if (!tool) continue
      if (found.some((item) => item.path === tool.path)) continue
      found.push(tool)
    }
    return found
  }

  let scanChain = Promise.resolve()
  async function rescanAll(options = {}) {
    let release
    const previous = scanChain
    scanChain = new Promise((resolve) => { release = resolve })
    await previous
    try {
      return await rescanAllNow(options)
    } finally {
      release()
    }
  }

  async function rescanAllNow({ persist = true } = {}) {
    const scanned = []
    const seen = new Set()
    for (const directory of store.directories) {
      const stat = await statSafe(directory.path)
      if (!stat?.isDirectory()) continue
      const found = await scanDirectory(directory)
      for (const tool of found) {
        if (seen.has(tool.path)) continue
        seen.add(tool.path)
        scanned.push(tool)
      }
    }
    const hidden = hiddenSet()
    const previous = new Map(store.tools.map((tool) => [tool.path, tool]))
    const previousBySource = new Map()
    for (const tool of store.tools) {
      if (tool.origin === 'scan') previousBySource.set(tool.sourcePath || tool.path, tool)
    }
    const manual = store.tools.filter((tool) => tool.origin === 'manual')
    const nextScanned = scanned
      .filter((tool) => !hidden.has(tool.path))
      .map((tool) => mergeTool(previous.get(tool.path) ?? previousBySource.get(tool.path), tool))
    store.tools = [...manual, ...nextScanned].sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
    if (persist) await saveStore()
    return store.tools
  }

  function runtimeOf(tool) {
    let runtime = runtimes.get(tool.id)
    if (!runtime) {
      runtime = {
        status: tool.kind === 'url' ? 'external' : 'stopped',
        message: '',
        url: tool.url || '',
        startedAt: null,
        exitCode: null,
        ready: false,
        handle: null,
        pump: null,
        intentionalStop: false,
        logs: '',
        logOffset: 0,
      }
      runtimes.set(tool.id, runtime)
    }
    if (!runtime.url && tool.url) runtime.url = tool.url
    return runtime
  }

  function serializeTool(tool) {
    const runtime = runtimeOf(tool)
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category || inferCategory(tool),
      kind: tool.kind,
      origin: tool.origin,
      rootId: tool.rootId || null,
      path: tool.path,
      appPath: tool.appPath || null,
      readmePath: tool.readmePath || null,
      hasReadme: Boolean(tool.readmePath),
      launch: tool.launch
        ? {
            command: tool.launch.command,
            args: tool.launch.args ?? [],
            cwd: tool.launch.cwd || tool.path,
            label: tool.launch.label || commandLabel(tool.launch),
          }
        : null,
      url: runtime.url || tool.url || '',
      tags: tool.tags ?? [],
      favorite: Boolean(tool.favorite),
      lastUsedAt: Number(tool.lastUsedAt) || 0,
      edited: Boolean(tool.origin === 'scan' && (tool.nameLocked || tool.descriptionLocked || tool.urlLocked || tool.launchLocked || tool.pathLocked || tool.categoryLocked)),
      createdAt: tool.createdAt,
      updatedAt: tool.updatedAt,
      runtime: {
        status: runtime.status,
        message: runtime.message || '',
        url: runtime.url || tool.url || '',
        startedAt: runtime.startedAt,
        exitCode: runtime.exitCode,
        ready: Boolean(runtime.ready),
        hasLogs: Boolean(runtime.logs),
      },
    }
  }

  function sortToolsForDisplay(input) {
    return [...input].sort((left, right) => {
      const favoriteDelta = Number(Boolean(right.favorite)) - Number(Boolean(left.favorite))
      if (favoriteDelta !== 0) return favoriteDelta
      const leftRecent = Number(left.lastUsedAt) || Number(left.createdAt) || 0
      const rightRecent = Number(right.lastUsedAt) || Number(right.createdAt) || 0
      if (leftRecent !== rightRecent) return rightRecent - leftRecent
      const live = (tool) => ['running', 'starting', 'stopping'].includes(runtimes.get(tool.id)?.status)
      const liveDelta = Number(live(right)) - Number(live(left))
      if (liveDelta !== 0) return liveDelta
      return left.name.localeCompare(right.name, 'zh-Hans-CN')
    })
  }

  async function touchTool(tool) {
    tool.lastUsedAt = Date.now()
    await saveStore()
  }

  function serializeState() {
    const tools = sortToolsForDisplay(store?.tools ?? []).map(serializeTool)
    const counts = {
      total: tools.length,
      running: tools.filter((tool) => tool.runtime.status === 'running' || tool.runtime.status === 'starting').length,
      error: tools.filter((tool) => tool.runtime.status === 'error').length,
    }
    return {
      tools,
      directories: store?.directories ?? [],
      counts,
      platform: process.platform,
      dataDir,
      version: VERSION,
      startTimeoutMs,
    }
  }

  function findTool(id) {
    return store?.tools.find((tool) => tool.id === id) ?? null
  }

  async function appendLog(tool, runtime, text) {
    if (!text) return
    const clean = text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
    runtime.logs += clean
    if (runtime.logs.length > logBytes) runtime.logs = runtime.logs.slice(-logBytes)
    const discovered = extractLocalUrl(clean)
    if (discovered && discovered !== runtime.url) {
      runtime.url = discovered
      if (runtime.status === 'starting' || runtime.status === 'running') runtime.ready = true
    }
    if (runtime.logOffset > logBytes * 8) runtime.logOffset = 0
    runtime.logOffset += clean.length
    try {
      await fs.appendFile(path.join(logsDir, `${tool.id}.log`), clean, 'utf8')
    } catch { /* a log write must never affect the process */ }
  }

  function drain(runtime) {
    const handle = runtime.handle
    if (!handle?.collected) return
    for (const [stream, key] of [[handle.collected.stdout, 'stdout'], [handle.collected.stderr, 'stderr']]) {
      if (!stream) continue
      try {
        const offsetKey = key === 'stdout' ? 'stdoutOffset' : 'stderrOffset'
        const read = stream.readFrom(runtime[offsetKey] ?? 0)
        runtime[offsetKey] = read.nextOffset
        if (read.text) void appendLog(runtime.tool, runtime, read.text)
      } catch { /* a closed collector has nothing left to read */ }
    }
  }

  function attachPump(tool, runtime, handle) {
    runtime.handle = handle
    runtime.tool = tool
    runtime.stdoutOffset = 0
    runtime.stderrOffset = 0
    runtime.pump = setInterval(() => drain(runtime), 350)
    runtime.pump.unref?.()
    handle.done.then((outcome) => {
      if (runtime.pump) clearInterval(runtime.pump)
      runtime.pump = null
      drain(runtime)
      runtime.handle = null
      runtime.exitCode = outcome.exitCode
      if (runtime.intentionalStop) {
        runtime.status = 'stopped'
        runtime.message = ''
        runtime.ready = false
        return
      }
      runtime.ready = false
      runtime.status = 'error'
      runtime.message = outcome.exitCode === 0
        ? '进程已退出'
        : `进程已退出${outcome.exitCode == null ? '' : `（退出码 ${outcome.exitCode}）`}`
    }).catch((error) => {
      if (runtime.pump) clearInterval(runtime.pump)
      runtime.pump = null
      runtime.handle = null
      runtime.status = 'error'
      runtime.ready = false
      runtime.message = `启动失败：${cleanText(error?.message ?? error, 300)}`
    })
  }

  async function resolveExecutable(command) {
    if (typeof command !== 'string' || !command.trim()) {
      throw userError('invalid-command', '这个工具没有配置启动命令')
    }
    const value = expandHome(command.trim())
    if (path.isAbsolute(value)) {
      const stat = await statSafe(value)
      if (!stat?.isFile()) throw userError('executable-not-found', `找不到可执行文件：${value}`)
      return value
    }
    try {
      return await ctx.subprocess.resolveExecutable(value)
    } catch {
      if (value === 'node') return process.execPath
      const extra = [
        '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin',
        path.join(os.homedir(), '.local', 'bin'),
        path.join(os.homedir(), '.bun', 'bin'),
        path.join(os.homedir(), '.volta', 'bin'),
      ]
      for (const directory of extra) {
        const candidate = path.join(directory, value)
        if (existsSync(candidate)) return candidate
      }
      throw userError('executable-not-found', `找不到命令「${value}」，请确认它已安装并在 PATH 中`)
    }
  }

  function portOpen(url) {
    return new Promise((resolve) => {
      let parsed
      try { parsed = new URL(url) } catch { resolve(false); return }
      const host = parsed.hostname === '0.0.0.0' ? '127.0.0.1' : parsed.hostname
      const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80))
      if (!port) { resolve(false); return }
      const socket = net.createConnection({ host, port })
      let settled = false
      const finish = (value) => {
        if (settled) return
        settled = true
        socket.destroy()
        resolve(value)
      }
      socket.setTimeout(900, () => finish(false))
      socket.once('connect', () => finish(true))
      socket.once('error', () => finish(false))
    })
  }

  async function waitForUrl(tool, runtime, timeoutMs) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline && !disposed) {
      if (runtime.handle === null && runtime.status !== 'starting') return ''
      const candidate = runtime.url || tool.url
      if (candidate && await portOpen(candidate)) return candidate
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
    return runtime.url || tool.url || ''
  }

  function watchdog(tool, runtime, handle) {
    const startedAt = Date.now()
    const tick = async () => {
      if (disposed || runtime.handle !== handle) return
      if (runtime.status !== 'starting') return
      const candidate = runtime.url || tool.url
      if (candidate && await portOpen(candidate)) {
        runtime.status = 'running'
        runtime.ready = true
        runtime.message = ''
        return
      }
      if (!candidate && Date.now() - startedAt > 1_600) {
        runtime.status = 'running'
        runtime.ready = false
        runtime.message = ''
        return
      }
      if (Date.now() - startedAt > startTimeoutMs) {
        runtime.status = 'running'
        runtime.ready = false
        runtime.message = candidate ? '进程已启动，网页暂未响应' : ''
        return
      }
      setTimeout(tick, 500).unref?.()
    }
    setTimeout(tick, 350).unref?.()
  }

  async function startTool(tool) {
    const runtime = runtimeOf(tool)
    if (runtime.status === 'running' || runtime.status === 'starting' || runtime.status === 'stopping') return runtime
    if (tool.kind === 'url') {
      runtime.status = 'external'
      runtime.url = tool.url || runtime.url
      runtime.message = '外部网址'
      return runtime
    }
    if (tool.kind === 'app') return openApp(tool)
    if (tool.url && await portOpen(tool.url)) {
      runtime.status = 'external'
      runtime.url = tool.url
      runtime.ready = true
      runtime.message = '检测到该地址已有实例在运行（不是由工具箱启动）。可以直接打开；如需由工具箱管理，请先停止旧实例。'
      return runtime
    }
    if (!tool.launch?.command) {
      throw userError('no-launch', '这个项目没有识别到启动命令；可以把它添加为可执行文件，或在 README 中写明运行命令后重新扫描')
    }

    runtime.status = 'starting'
    runtime.message = '正在启动…'
    runtime.ready = false
    runtime.intentionalStop = false
    runtime.exitCode = null
    runtime.url = tool.url || runtime.url || ''
    runtime.logs = ''
    runtime.stdoutOffset = 0
    runtime.stderrOffset = 0

    let executable
    try {
      executable = await resolveExecutable(tool.launch.command)
    } catch (error) {
      runtime.status = 'error'
      runtime.message = cleanText(error?.message ?? error, 300)
      throw error
    }

    const cwd = tool.launch.cwd || tool.path
    const cwdStat = await statSafe(cwd)
    if (!cwdStat?.isDirectory()) {
      runtime.status = 'error'
      runtime.message = `工作目录不存在：${cwd}`
      throw userError('cwd-not-found', runtime.message)
    }

    let handle
    try {
      handle = ctx.subprocess.spawn({
        argv: [executable, ...(tool.launch.args ?? [])],
        cwd,
        stdio: {
          // Keep stdin open: stdio-style MCP servers exit on EOF, even when
          // they also expose an HTTP UI.
          stdin: 'pipe',
          stdout: { maxBytes: logBytes },
          stderr: { maxBytes: logBytes },
        },
        graceMs: 5_000,
        env: { FORCE_COLOR: '1', NO_COLOR: '1' },
      })
    } catch (error) {
      runtime.status = 'error'
      runtime.message = `启动失败：${cleanText(error?.message ?? error, 300)}`
      throw error
    }

    runtime.startedAt = Date.now()
    attachPump(tool, runtime, handle)
    watchdog(tool, runtime, handle)
    logInfo(`started ${tool.name} (${tool.launch.label || commandLabel(tool.launch)})`)
    return runtime
  }

  async function stopTool(tool) {
    const runtime = runtimeOf(tool)
    if (tool.kind === 'url') {
      runtime.status = 'external'
      return runtime
    }
    if (tool.kind === 'app' && !runtime.handle) {
      await quitApp(tool, runtime)
      return runtime
    }
    const handle = runtime.handle
    if (!handle) {
      runtime.status = 'stopped'
      runtime.message = ''
      runtime.ready = false
      return runtime
    }
    runtime.intentionalStop = true
    runtime.status = 'stopping'
    runtime.message = '正在停止…'
    try {
      handle.terminate()
      const exited = await Promise.race([
        handle.waitForExit().catch(() => false),
        new Promise((resolve) => setTimeout(() => resolve(false), 9_000)),
      ])
      runtime.status = 'stopped'
      runtime.message = exited ? '' : '停止信号已发送，进程可能仍在退出'
      runtime.ready = false
      runtime.url = tool.url || ''
      logInfo(`stopped ${tool.name}`)
    } catch (error) {
      runtime.status = 'error'
      runtime.message = `停止失败：${cleanText(error?.message ?? error, 300)}`
    }
    return runtime
  }

  async function openApp(tool) {
    const runtime = runtimeOf(tool)
    const target = tool.appPath || tool.path
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open'
    const executable = await resolveExecutable(opener)
    const argv = [executable, target]
    try {
      const handle = ctx.subprocess.spawn({
        argv,
        cwd: path.dirname(target),
        stdio: { stdin: 'ignore', stdout: { maxBytes: 8_192 }, stderr: { maxBytes: 8_192 } },
        graceMs: 3_000,
      })
      runtime.status = 'opened'
      runtime.startedAt = Date.now()
      runtime.message = '应用已打开'
      runtime.handle = null
      handle.done.catch(() => {})
      logInfo(`opened ${target}`)
    } catch (error) {
      runtime.status = 'error'
      runtime.message = `打开失败：${cleanText(error?.message ?? error, 300)}`
      throw error
    }
    return runtime
  }

  async function quitApp(tool, runtime) {
    const target = tool.appPath || tool.path
    const appName = path.basename(target, '.app')
    let argv
    if (process.platform === 'darwin') {
      argv = ['/usr/bin/osascript', '-e', `tell application "${appName.replace(/"/g, '\\"')}" to quit`]
    } else if (process.platform === 'win32') {
      argv = ['taskkill', '/IM', `${appName}.exe`, '/F']
    } else {
      argv = ['pkill', '-f', target]
    }
    try {
      const executable = await resolveExecutable(argv[0])
      const handle = ctx.subprocess.spawn({
        argv: [executable, ...argv.slice(1)],
        cwd: os.homedir(),
        stdio: { stdin: 'ignore', stdout: { maxBytes: 8_192 }, stderr: { maxBytes: 8_192 } },
        graceMs: 2_000,
      })
      await Promise.race([handle.done.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2_500))])
      runtime.status = 'stopped'
      runtime.message = '已请求退出应用'
      runtime.ready = false
      return { ok: true, message: '已请求退出应用' }
    } catch (error) {
      runtime.status = 'error'
      runtime.message = `退出应用失败：${cleanText(error?.message ?? error, 300)}`
      return { ok: false, message: runtime.message }
    }
  }

  async function revealTool(tool) {
    const target = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open'
    const executable = await resolveExecutable(target)
    const argv = process.platform === 'darwin'
      ? [executable, '-R', tool.path]
      : process.platform === 'win32'
        ? [executable, `/select,${tool.path}`]
        : [executable, path.dirname(tool.path)]
    const handle = ctx.subprocess.spawn({
      argv,
      cwd: os.homedir(),
      stdio: { stdin: 'ignore', stdout: { maxBytes: 8_192 }, stderr: { maxBytes: 8_192 } },
      graceMs: 2_000,
    })
    await Promise.race([handle.done.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2_000))])
  }

  async function openTool(tool) {
    const runtime = runtimeOf(tool)
    if (tool.kind === 'url') {
      return { url: tool.url || runtime.url, message: '外部网址' }
    }
    if (tool.kind === 'app') {
      await openApp(tool)
      return { launched: true, message: '应用已打开' }
    }
    if (!tool.launch?.command) {
      if (tool.url) return { url: tool.url, message: '外部网址' }
      if (tool.path) {
        await revealTool(tool)
        return { revealed: true, message: '已在文件管理器中显示' }
      }
      throw userError('no-launch', '这个工具既没有启动命令，也没有可显示的路径')
    }
    if (runtime.status !== 'running' && runtime.status !== 'starting') {
      await startTool(tool)
    }
    const url = await waitForUrl(tool, runtime, Math.min(startTimeoutMs, 25_000))
    if (url) return { url, message: runtime.message || '' }
    if (runtime.status === 'error') throw userError('start-failed', runtime.message || '启动失败')
    return { launched: true, message: tool.url ? '进程已启动，网页暂未响应' : '进程已启动' }
  }

  async function readReadme(tool) {
    if (!tool.readmePath) return { markdown: '', path: null, missing: true }
    const stat = await statSafe(tool.readmePath)
    if (!stat?.isFile()) return { markdown: '', path: tool.readmePath, missing: true }
    const markdown = await readTextFile(tool.readmePath, MAX_README_BYTES)
    return { markdown, path: tool.readmePath, missing: false, truncated: stat.size > MAX_README_BYTES }
  }

  async function addDirectory(inputPath) {
    const value = String(inputPath ?? '').trim()
    if (!value) throw userError('invalid-path', '请输入目录路径')
    const resolved = path.resolve(expandHome(value))
    const stat = await statSafe(resolved)
    if (!stat?.isDirectory()) throw userError('directory-not-found', `目录不存在：${resolved}`)
    const real = await fs.realpath(resolved)
    if (store.directories.some((entry) => entry.path === real)) {
      await rescanAll()
      return { directory: store.directories.find((entry) => entry.path === real), duplicate: true }
    }
    const directory = {
      id: directoryId(real),
      path: real,
      label: path.basename(real) || real,
      addedAt: Date.now(),
    }
    store.directories.push(directory)
    store.directories.sort((left, right) => left.label.localeCompare(right.label, 'zh-Hans-CN'))
    await rescanAll()
    return { directory }
  }

  async function removeDirectory(id) {
    const directory = store.directories.find((entry) => entry.id === id)
    if (!directory) throw userError('directory-not-found', '目录不在列表中')
    await scanChain
    for (const tool of store.tools.filter((entry) => entry.rootId === id)) {
      await stopTool(tool)
      runtimes.delete(tool.id)
    }
    store.tools = store.tools.filter((entry) => entry.rootId !== id)
    store.directories = store.directories.filter((entry) => entry.id !== id)
    await saveStore()
  }

  async function addCustomTool(input) {
    const payload = input && typeof input === 'object' ? input : {}
    const mode = payload.mode === 'url' || payload.mode === 'executable' ? payload.mode : 'auto'
    const label = cleanText(payload.name, 100)
    const description = cleanText(payload.description, 240)
    const now = Date.now()

    if (mode === 'url') {
      const url = String(payload.url ?? '').trim()
      let parsed
      try { parsed = new URL(url) } catch { throw userError('invalid-url', '请输入完整的网址（含 http:// 或 https://）') }
      if (!['http:', 'https:'].includes(parsed.protocol)) throw userError('invalid-url', '只支持 http/https 网址')
      const id = toolId('url', parsed.href)
      const existing = findTool(id) ?? store.tools.find((tool) => tool.kind === 'url' && tool.path === parsed.href)
      if (existing) return { tool: existing, duplicate: true }
      const customCategory = cleanText(payload.category, 30)
      const tool = {
        id,
        name: label || parsed.hostname,
        description: description || parsed.href,
        kind: 'url',
        origin: 'manual',
        path: parsed.href,
        readmePath: null,
        hasReadme: false,
        launch: null,
        url: parsed.href,
        tags: ['网址'],
        category: customCategory || '外部工具',
        ...(customCategory ? { categoryLocked: true } : {}),
        createdAt: now,
        updatedAt: now,
      }
      store.tools.push(tool)
      await saveStore()
      return { tool }
    }

    const target = String(payload.path ?? '').trim()
    if (!target) throw userError('invalid-path', '请输入可执行文件或项目目录的绝对路径')
    const resolved = path.resolve(expandHome(target))
    const stat = await statSafe(resolved)
    if (!stat) throw userError('path-not-found', `路径不存在：${resolved}`)

    const looksLikeApp = resolved.endsWith('.app')
    if (stat.isDirectory() && !looksLikeApp) {
      const discovered = await detectProject(resolved, null)
      if (!discovered) throw userError('not-a-project', '这个目录没有被识别为项目；请选择包含 README、package.json 或入口脚本的目录')
      discovered.origin = 'manual'
      discovered.rootId = null
      discovered.name = label || discovered.name
      discovered.description = description || discovered.description
      const customCategory = cleanText(payload.category, 30)
      if (customCategory) {
        discovered.category = customCategory
        discovered.categoryLocked = true
      }
      const existing = findTool(discovered.id)
      if (existing) return { tool: existing, duplicate: true }
      store.tools.push(discovered)
      await saveStore()
      return { tool: discovered }
    }

    if (!stat.isFile() && !looksLikeApp) throw userError('invalid-path', '请选择普通文件或 .app 应用')
    const real = await fs.realpath(resolved)
    const isApp = real.endsWith('.app')
    const args = typeof payload.args === 'string' && payload.args.trim()
      ? splitArgs(payload.args)
      : []
    const cwd = typeof payload.cwd === 'string' && payload.cwd.trim()
      ? path.resolve(expandHome(payload.cwd.trim()))
      : path.dirname(real)
    const url = String(payload.url ?? '').trim()
    const kind = isApp ? 'app' : 'executable'
    const id = toolId(kind, real)
    const existing = findTool(id)
    if (existing) return { tool: existing, duplicate: true }
    const customCategory = cleanText(payload.category, 30)
    const tool = {
      id,
      name: label || path.basename(real, isApp ? '.app' : path.extname(real)),
      description: description || (isApp ? '本地应用' : `可执行文件 · ${path.basename(real)}`),
      kind,
      origin: 'manual',
      path: real,
      appPath: isApp ? real : null,
      readmePath: null,
      hasReadme: false,
      launch: isApp ? null : {
        command: real,
        args,
        cwd: existsSync(cwd) ? cwd : path.dirname(real),
        label: [path.basename(real), ...args].join(' '),
      },
      url,
      tags: isApp ? ['应用'] : ['可执行文件'],
      category: customCategory || inferCategory({
        name: label || path.basename(real, isApp ? '.app' : path.extname(real)),
        description: description || (isApp ? '本地应用' : `可执行文件 · ${path.basename(real)}`),
        kind,
      }),
      ...(customCategory ? { categoryLocked: true } : {}),
      createdAt: now,
      updatedAt: now,
    }
    store.tools.push(tool)
    await saveStore()
    return { tool }
  }

  /** Split a simple command-line argument string, honoring quotes. */
  function splitArgs(text) {
    const result = []
    let current = ''
    let quote = ''
    for (const char of String(text)) {
      if (quote) {
        if (char === quote) quote = ''
        else current += char
        continue
      }
      if (char === '"' || char === "'") { quote = char; continue }
      if (/\s/.test(char)) {
        if (current) { result.push(current); current = '' }
        continue
      }
      current += char
    }
    if (current) result.push(current)
    return result
  }

  /** Apply manual edits while preserving the distinction between detected and edited fields. */
  async function updateTool(input) {
    await scanChain
    const payload = input && typeof input === 'object' ? input : {}
    const tool = findTool(String(payload.id ?? ''))
    if (!tool) throw userError('tool-not-found', '工具不存在')
    const has = (key) => Object.prototype.hasOwnProperty.call(payload, key)
    const now = Date.now()
    let launchChanged = false
    let pathChanged = false

    if (has('path') && tool.kind !== 'url') {
      const rawPath = String(payload.path ?? '').trim()
      if (!rawPath) throw userError('invalid-path', '路径不能为空')
      const target = path.resolve(expandHome(rawPath))
      const stat = await statSafe(target)
      if (!stat) throw userError('path-not-found', `路径不存在：${target}`)
      if (tool.kind === 'app') {
        if (!stat.isDirectory() || !target.endsWith('.app')) throw userError('invalid-app', '应用路径必须是一个 .app 目录')
      } else if (tool.kind === 'executable') {
        if (!stat.isFile()) throw userError('invalid-executable', '可执行文件路径必须是一个文件')
      } else {
        if (!stat.isDirectory()) throw userError('invalid-project', '项目路径必须是一个目录')
        if (target.endsWith('.app')) throw userError('invalid-project', '.app 请作为应用添加，而不是项目目录')
      }
      const real = await fs.realpath(target).catch(() => target)
      if (real !== tool.path) {
        const oldPath = tool.path
        if (tool.kind === 'app') {
          const runtime = runtimeOf(tool)
          if (runtime.status === 'opened') await quitApp(tool, runtime)
        }
        if (tool.origin === 'scan') {
          if (!tool.sourcePath) tool.sourcePath = oldPath
          tool.pathLocked = true
        }
        tool.path = real
        if (tool.kind === 'app') tool.appPath = real
        if (tool.kind === 'executable' && tool.launch) {
          tool.launch = { ...tool.launch, command: real, label: commandLabel({ ...tool.launch, command: real }) }
        }
        pathChanged = true

        if (tool.kind === 'project') {
          try {
            const entries = await fs.readdir(real, { withFileTypes: true })
            const files = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name))
            const readmePath = await findReadme(real, files)
            tool.readmePath = readmePath || null
            tool.hasReadme = Boolean(readmePath)
          } catch {
            tool.readmePath = null
            tool.hasReadme = false
          }
        }

        if (tool.launch) {
          const retarget = (value) => {
            if (!value) return value
            const resolved = path.isAbsolute(expandHome(value)) ? path.resolve(expandHome(value)) : ''
            if (value === oldPath || resolved === oldPath) return real
            if (value.startsWith(oldPath + path.sep)) return real + value.slice(oldPath.length)
            return value
          }
          const command = retarget(tool.launch.command)
          let cwd = retarget(tool.launch.cwd)
          if (tool.kind !== 'project' && cwd === path.dirname(oldPath)) cwd = path.dirname(real)
          if (command !== tool.launch.command || cwd !== tool.launch.cwd) {
            const nextLaunch = { ...tool.launch, command, cwd }
            tool.launch = {
              ...nextLaunch,
              label: command !== tool.launch.command
                ? commandLabel(nextLaunch)
                : tool.launch.label || commandLabel(nextLaunch),
            }
          }
        }
        if (tool.launch) launchChanged = true
      }
    }

    if (has('name')) {
      const name = cleanText(payload.name, 100)
      if (!name) throw userError('invalid-name', '名称不能为空')
      if (name !== tool.name) {
        tool.name = name
        tool.nameLocked = true
      }
    }
    if (has('description')) {
      const description = cleanText(payload.description, 240)
      if (description !== tool.description) {
        tool.description = description
        tool.descriptionLocked = true
      }
    }
    if (has('category')) {
      const category = cleanText(payload.category, 30) || UNSORTED_CATEGORY
      if (category !== tool.category) {
        tool.category = category
        tool.categoryLocked = true
      }
    }

    if (tool.kind !== 'url' && tool.kind !== 'app' && (has('command') || has('cwd'))) {
      if (has('command')) {
        const commandText = String(payload.command ?? '').trim()
        if (commandText) {
          const tokens = splitArgs(commandText)
          if (tokens.length === 0) throw userError('invalid-command', '启动命令不能为空')
          if (tokens[0].startsWith('-')) {
            throw userError('invalid-command', '启动命令的第一段必须是可执行文件，--ui=true 这类内容属于启动参数。例如：/Users/me/.local/bin/tool --ui=true --port=9749')
          }
          const cwdInput = has('cwd') ? String(payload.cwd ?? '').trim() : ''
          const cwd = cwdInput ? path.resolve(expandHome(cwdInput)) : (tool.launch?.cwd || tool.path)
          const stat = await statSafe(cwd)
          if (!stat?.isDirectory()) throw userError('invalid-cwd', `工作目录不存在：${cwd}`)
          const previous = tool.launch ? commandLabel(tool.launch) : ''
          const previousCwd = tool.launch?.cwd
          tool.launch = {
            command: tokens[0],
            args: tokens.slice(1),
            cwd,
            label: commandText,
          }
          tool.launchLocked = true
          launchChanged = previous !== commandText || previousCwd !== cwd
        }
      } else if (tool.launch && has('cwd')) {
        const cwdInput = String(payload.cwd ?? '').trim()
        const cwd = cwdInput ? path.resolve(expandHome(cwdInput)) : tool.path
        const stat = await statSafe(cwd)
        if (!stat?.isDirectory()) throw userError('invalid-cwd', `工作目录不存在：${cwd}`)
        if (tool.launch.cwd !== cwd) launchChanged = true
        tool.launch = { ...tool.launch, cwd, label: tool.launch.label || commandLabel(tool.launch) }
        tool.launchLocked = true
      }
    }

    if (has('args') && tool.kind !== 'url' && tool.kind !== 'app') {
      const command = tool.kind === 'executable'
        ? tool.path
        : (tool.launch?.command || tool.path)
      const args = splitArgs(String(payload.args ?? ''))
      const previousArgs = JSON.stringify(tool.launch?.args ?? [])
      const cwd = tool.launch?.cwd || tool.path
      tool.launch = { command, args, cwd, label: commandLabel({ command, args }) }
      tool.launchLocked = true
      if (previousArgs !== JSON.stringify(args)) launchChanged = true
    }

    if (tool.kind !== 'app' && has('url')) {
      const value = String(payload.url ?? '').trim()
      if (!value) {
        if (tool.kind === 'url') throw userError('invalid-url', '网址不能为空')
        tool.url = ''
        tool.urlLocked = true
      } else {
        let parsed
        try { parsed = new URL(value) } catch { throw userError('invalid-url', '请输入完整的网址（含 http:// 或 https://）') }
        if (!['http:', 'https:'].includes(parsed.protocol)) throw userError('invalid-url', '只支持 http/https 网址')
        const previousPath = tool.path
        tool.url = parsed.href
        tool.urlLocked = true
        if (tool.kind === 'url') {
          if (tool.description === previousPath) tool.description = tool.url
          tool.path = tool.url
        }
      }
    }

    tool.updatedAt = now
    const runtime = runtimeOf(tool)
    if (tool.kind === 'url') {
      runtime.url = tool.url || ''
      runtime.status = 'external'
    } else if (has('url')) {
      runtime.url = tool.url || ''
    }
    if (launchChanged && ['running', 'starting', 'stopping'].includes(runtime.status)) {
      runtime.message = '启动配置已修改，重新启动后生效'
    } else if (tool.kind === 'app' && runtime.status === 'opened' && (has('name') || has('description'))) {
      runtime.message = '应用已打开'
    }
    await saveStore()
    return tool
  }

  /** Drop all manual overrides so the next scan supplies the detected values again. */
  async function resetTool(id) {
    await scanChain
    const tool = findTool(String(id ?? ''))
    if (!tool) throw userError('tool-not-found', '工具不存在')
    if (tool.origin !== 'scan') throw userError('not-resettable', '只有扫描发现的项目可以恢复自动识别')
    const sourcePath = tool.sourcePath || tool.path
    delete tool.nameLocked
    delete tool.descriptionLocked
    delete tool.urlLocked
    delete tool.launchLocked
    delete tool.pathLocked
    delete tool.categoryLocked
    await rescanAll()
    const refreshed = findTool(tool.id) ?? store.tools.find((entry) => entry.path === sourcePath)
    if (refreshed) {
      const runtime = runtimeOf(refreshed)
      if (['running', 'starting', 'stopping'].includes(runtime.status)) {
        runtime.message = '已恢复自动识别，重新启动后生效'
      } else {
        runtime.url = refreshed.url || ''
      }
    }
    return refreshed
  }

  async function removeTool(id) {
    await scanChain
    const tool = findTool(id)
    if (!tool) throw userError('tool-not-found', '工具不存在')
    await stopTool(tool)
    runtimes.delete(tool.id)
    store.tools = store.tools.filter((entry) => entry.id !== id)
    if (tool.origin === 'scan') {
      store.hidden.push(tool.sourcePath || tool.path)
      store.hidden = Array.from(new Set(store.hidden))
    }
    await saveStore()
  }

  async function readBody(req) {
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.byteLength
      if (size > MAX_BODY_BYTES) {
        req.resume()
        throw userError('body-too-large', '请求内容过大')
      }
      chunks.push(chunk)
    }
    if (chunks.length === 0) return {}
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      throw userError('invalid-json', '请求内容不是合法 JSON')
    }
  }

  function rejected(req, res) {
    try {
      const connection = typeof ctx.get === 'function' ? ctx.get('connection') : ctx.connection
      if (connection && typeof connection.requestRejection === 'function') {
        const rejection = connection.requestRejection(req)
        if (rejection !== undefined) {
          res.statusCode = rejection
          res.end()
          return true
        }
      }
    } catch (error) {
      logWarn(`connection check failed: ${cleanText(error?.message ?? error)}`)
    }
    return false
  }

  async function route(req, res) {
    if (disposed) { fail(res, 503, 'disposed', '插件正在卸载'); return }
    if (rejected(req, res)) return
    let requestUrl
    try { requestUrl = new URL(req.url || '/', 'http://localhost') } catch {
      fail(res, 400, 'bad-request', '无法解析请求地址')
      return
    }
    const sub = requestUrl.pathname === ROUTE
      ? '/'
      : requestUrl.pathname.startsWith(`${ROUTE}/`)
        ? requestUrl.pathname.slice(ROUTE.length)
        : null
    if (sub === null) { fail(res, 404, 'not-found', '未知路由'); return }
    const normalized = sub !== '/' && sub.endsWith('/') ? sub.slice(0, -1) : sub

    try {
      await ensureReady()
      const method = req.method ?? 'GET'

      if (normalized === '/state' && method === 'GET') {
        sendJson(res, 200, { ok: true, state: serializeState() })
        return
      }

      if (normalized === '/readme' && method === 'GET') {
        const tool = findTool(requestUrl.searchParams.get('id') ?? '')
        if (!tool) { fail(res, 404, 'tool-not-found', '工具不存在'); return }
        sendJson(res, 200, { ok: true, ...(await readReadme(tool)) })
        return
      }

      if (normalized === '/logs' && method === 'GET') {
        const tool = findTool(requestUrl.searchParams.get('id') ?? '')
        if (!tool) { fail(res, 404, 'tool-not-found', '工具不存在'); return }
        const runtime = runtimeOf(tool)
        sendJson(res, 200, {
          ok: true,
          id: tool.id,
          status: runtime.status,
          message: runtime.message || '',
          url: runtime.url || tool.url || '',
          exitCode: runtime.exitCode,
          logs: runtime.logs || '',
          hasLogs: Boolean(runtime.logs),
        })
        return
      }

      if (method !== 'POST') { fail(res, 405, 'method-not-allowed', '不支持的请求方法'); return }
      const contentType = String(req.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase()
      if (contentType !== 'application/json') {
        fail(res, 415, 'unsupported-media-type', 'content-type 必须是 application/json')
        return
      }
      const body = await readBody(req)

      if (normalized === '/favorite') {
        const tool = findTool(String(body.id ?? ''))
        if (!tool) { fail(res, 404, 'tool-not-found', '工具不存在'); return }
        if (typeof body.favorite !== 'boolean') { fail(res, 400, 'invalid-favorite', '收藏状态必须是布尔值'); return }
        tool.favorite = body.favorite
        tool.updatedAt = Date.now()
        await saveStore()
        sendJson(res, 200, { ok: true, tool: serializeTool(tool), state: serializeState() })
        return
      }

      if (normalized === '/start' || normalized === '/stop' || normalized === '/restart' || normalized === '/open' || normalized === '/reveal') {
        const tool = findTool(String(body.id ?? ''))
        if (!tool) { fail(res, 404, 'tool-not-found', '工具不存在'); return }
        if (normalized === '/start') { await startTool(tool); await touchTool(tool) }
        if (normalized === '/stop') await stopTool(tool)
        if (normalized === '/restart') { await stopTool(tool); await startTool(tool); await touchTool(tool) }
        if (normalized === '/reveal') await revealTool(tool)
        if (normalized === '/open') {
          const result = await openTool(tool)
          await touchTool(tool)
          sendJson(res, 200, { ok: true, ...result, state: serializeState() })
          return
        }
        sendJson(res, 200, { ok: true, tool: serializeTool(tool), state: serializeState() })
        return
      }

      if (normalized === '/add-directory') {
        const result = await addDirectory(body.path)
        sendJson(res, 200, { ok: true, ...result, state: serializeState() })
        return
      }

      if (normalized === '/remove-directory') {
        await removeDirectory(String(body.id ?? ''))
        sendJson(res, 200, { ok: true, state: serializeState() })
        return
      }

      if (normalized === '/add') {
        const result = await addCustomTool(body)
        sendJson(res, 200, { ok: true, ...result, state: serializeState() })
        return
      }

      if (normalized === '/update') {
        const tool = await updateTool(body)
        sendJson(res, 200, { ok: true, tool: serializeTool(tool), state: serializeState() })
        return
      }

      if (normalized === '/reset') {
        const tool = await resetTool(String(body.id ?? ''))
        sendJson(res, 200, { ok: true, tool: tool ? serializeTool(tool) : null, state: serializeState() })
        return
      }

      if (normalized === '/remove') {
        await removeTool(String(body.id ?? ''))
        sendJson(res, 200, { ok: true, state: serializeState() })
        return
      }

      if (normalized === '/rescan') {
        await rescanAll()
        sendJson(res, 200, { ok: true, state: serializeState() })
        return
      }

      fail(res, 404, 'not-found', '未知操作')
    } catch (error) {
      const message = cleanText(error?.message ?? error, 500)
      logWarn(`route ${sub} failed: ${message}`)
      fail(res, error?.code ? 400 : 500, error?.code ?? 'internal', message)
    }
  }

  async function shutdown() {
    disposed = true
    const pending = []
    for (const runtime of runtimes.values()) {
      if (runtime.pump) clearInterval(runtime.pump)
      const handle = runtime.handle
      if (!handle) continue
      try {
        handle.terminate()
        pending.push(handle.waitForExit().catch(() => false))
      } catch { /* provider may already be gone */ }
    }
    await Promise.race([
      Promise.allSettled(pending),
      new Promise((resolve) => setTimeout(resolve, 6_000)),
    ])
  }

  ctx.effect(() => {
    const dispose = ctx.webServer.register({ kind: 'prefix', path: ROUTE, handler: route })
    void ensureReady().catch((error) => logWarn(`initialization failed: ${cleanText(error?.message ?? error)}`))
    return () => {
      try { dispose() } catch { /* route carrier may already be gone */ }
      void shutdown()
    }
  }, 'ai-toolbox routes')

  logInfo(`mounted at ${ROUTE} (data: ${dataDir})`)
}
