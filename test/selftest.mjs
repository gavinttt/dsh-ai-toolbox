/**
 * Self-test for dsh-ai-toolbox's Host half.
 *
 * It mounts the plugin against an in-memory route carrier and a local
 * subprocess adapter, then exercises scanning, README reading, start/stop,
 * URL detection, adding a directory, and adding an executable.
 *
 * Run with: node test/selftest.mjs
 */

import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import { constants } from 'node:fs'
import { access } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { apply } from '../lib/index.js'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const fixtures = path.join(root, 'test', 'fixtures')
const dataDir = path.join(root, 'test', '.data')
const addedDir = path.join(root, 'test', '.added-project')
const executable = path.join(root, 'test', '.echo-tool.sh')
const fakeApp = path.join(root, 'test', '.Fake.app')
const movedNode = path.join(root, 'test', '.moved-node')
const movedExe = path.join(root, 'test', '.echo-tool-moved.sh')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERT: ${message}`)
}

function makeSubprocess() {
  return {
    async resolveExecutable(command) {
      if (command.includes('/')) {
        await access(command, constants.X_OK)
        return command
      }
      if (command === 'node') return process.execPath
      return execFileSync('/usr/bin/which', [command], { encoding: 'utf8' }).trim()
    },
    spawn(spec) {
      const child = spawn(spec.argv[0], spec.argv.slice(1), {
        cwd: spec.cwd,
        env: { ...process.env, ...(spec.env ?? {}) },
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8') })
      child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8') })
      const done = new Promise((resolve, reject) => {
        child.once('error', reject)
        child.once('close', (exitCode, signal) => resolve({ exitCode, signal }))
      })
      const collector = (get) => ({
        readFrom(offset) {
          const text = get()
          return { text: text.slice(offset), nextOffset: text.length }
        },
      })
      return {
        collected: { stdout: collector(() => stdout), stderr: collector(() => stderr) },
        done,
        terminate() {
          try { process.kill(-child.pid, 'SIGTERM') } catch { /* already gone */ }
        },
        async waitForExit() {
          try { await done } catch { /* lost range */ }
          return true
        },
      }
    },
  }
}

async function request(base, pathname, body) {
  const response = await fetch(`${base}${pathname}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, payload: await response.json() }
}

async function main() {
  await fs.rm(dataDir, { recursive: true, force: true })
  await fs.rm(addedDir, { recursive: true, force: true })
  await fs.rm(executable, { force: true })
  await fs.rm(fakeApp, { recursive: true, force: true })
  await fs.rm(movedNode, { recursive: true, force: true })
  await fs.rm(movedExe, { force: true })
  await fs.mkdir(addedDir, { recursive: true })
  await fs.mkdir(fakeApp, { recursive: true })
  await fs.writeFile(path.join(addedDir, 'README.md'), '# Added Project\n\nA project added at runtime.\n')
  await fs.writeFile(path.join(addedDir, 'main.py'), 'print("hello")\n')
  await fs.writeFile(executable, '#!/bin/sh\necho echo-tool\n', { mode: 0o755 })

  let handler
  const cleanups = []
  const ctx = {
    logger: {
      info: (message) => console.log(`  host info: ${message}`),
      warn: (message) => console.warn(`  host warn: ${message}`),
    },
    effect(fn) {
      const dispose = fn()
      if (typeof dispose === 'function') cleanups.push(dispose)
      return dispose
    },
    webServer: {
      register(route) {
        handler = route.handler
        return () => { handler = null }
      },
    },
    subprocess: makeSubprocess(),
    get() { return undefined },
  }

  apply(ctx, {
    dataDir,
    directories: [fixtures],
    startTimeoutMs: 8_000,
    logBytes: 64 * 1024,
  })

  const server = createServer((req, res) => {
    if (!handler) { res.statusCode = 503; res.end('not mounted'); return }
    void handler(req, res)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const base = `http://127.0.0.1:${port}/ai-toolbox`

  try {
    let state
    for (let attempt = 0; attempt < 30; attempt++) {
      const response = await request(base, '/state')
      assert(response.status === 200, `state answers 200 (got ${response.status})`)
      state = response.payload.state
      if (state.tools.length > 0) break
      await sleep(100)
    }
    assert(state, 'state payload exists')
    const names = state.tools.map((tool) => tool.name)
    console.log('  scanned tools:', names.join(', '))
    assert(state.tools.length >= 3, `scans three fixtures (got ${state.tools.length})`)
    assert(state.tools.some((tool) => tool.name.toLowerCase().includes('fixture-node-server')
      || tool.name.toLowerCase().includes('fixture node server')), 'finds the Node fixture')
    assert(state.tools.some((tool) => tool.path.endsWith('python-app')), 'finds the Python fixture')
    assert(state.tools.some((tool) => tool.path.endsWith('readme-only')), 'finds the README fixture')

    const nodeTool = state.tools.find((tool) => tool.path.endsWith('node-server'))
    assert(nodeTool, 'Node fixture tool exists')
    assert(nodeTool.launch?.command, 'Node fixture has a launch command')
    assert(nodeTool.hasReadme, 'Node fixture has a README')
    assert(nodeTool.category === '工具', `Node fixture is auto-categorized as 工具 (got ${nodeTool.category})`)

    const readmeResponse = await request(base, `/readme?id=${encodeURIComponent(nodeTool.id)}`)
    assert(readmeResponse.status === 200, 'README route answers 200')
    assert(readmeResponse.payload.markdown.includes('Fixture Node Server'), 'README content is returned')

    const startResponse = await request(base, '/start', { id: nodeTool.id })
    assert(startResponse.status === 200, `start answers 200 (got ${startResponse.status})`)
    assert(startResponse.payload.tool.lastUsedAt > 0, 'starting marks the tool as recently used')
    assert(startResponse.payload.state.tools[0].id === nodeTool.id, 'recently used tool sorts first')
    let running
    for (let attempt = 0; attempt < 40; attempt++) {
      const response = await request(base, '/state')
      running = response.payload.state.tools.find((tool) => tool.id === nodeTool.id)
      if (running?.runtime?.status === 'running' && running.url) break
      await sleep(150)
    }
    console.log('  node runtime:', JSON.stringify(running?.runtime))
    assert(running?.runtime?.status === 'running', 'Node fixture reaches running')
    assert(running.url.includes('34679'), 'Node fixture discovers its localhost URL')

    const probe = await fetch('http://127.0.0.1:34679/')
    assert((await probe.text()) === 'fixture ok', 'started fixture responds over HTTP')

    const openResponse = await request(base, '/open', { id: nodeTool.id })
    assert(openResponse.status === 200, 'open answers 200')
    assert(openResponse.payload.url.includes('34679'), 'open returns the local URL')

    const stopResponse = await request(base, '/stop', { id: nodeTool.id })
    assert(stopResponse.status === 200, 'stop answers 200')
    await sleep(400)
    const stoppedState = await request(base, '/state')
    const stopped = stoppedState.payload.state.tools.find((tool) => tool.id === nodeTool.id)
    assert(stopped.runtime.status === 'stopped', `Node fixture stops (got ${stopped.runtime.status})`)

    const updateResponse = await request(base, '/update', {
      id: nodeTool.id,
      name: 'Fixture Node Server (edited)',
      description: 'Edited description survives a rescan.',
      command: 'node server.js --edited',
      cwd: path.join(fixtures, 'node-server'),
      url: 'http://localhost:34679',
      category: '小游戏',
    })
    assert(updateResponse.status === 200, `update answers 200 (got ${updateResponse.status})`)
    assert(updateResponse.payload.tool.name === 'Fixture Node Server (edited)', 'update changes the name')
    assert(updateResponse.payload.tool.edited === true, 'update marks a scanned tool as edited')
    assert(updateResponse.payload.tool.launch.args[0] === 'server.js', 'update parses the command')
    assert(updateResponse.payload.tool.launch.args[1] === '--edited', 'update keeps extra arguments')
    assert(updateResponse.payload.tool.category === '小游戏', 'update changes the category')

    const editedStart = await request(base, '/start', { id: nodeTool.id })
    assert(editedStart.status === 200, 'edited command starts')
    let editedRuntime
    for (let attempt = 0; attempt < 40; attempt++) {
      const response = await request(base, '/state')
      editedRuntime = response.payload.state.tools.find((tool) => tool.id === nodeTool.id)
      if (editedRuntime?.runtime?.status === 'running' && editedRuntime.url) break
      await sleep(150)
    }
    assert(editedRuntime?.runtime?.status === 'running', 'edited command reaches running')
    await request(base, '/stop', { id: nodeTool.id })
    await sleep(300)

    const rescanResponse = await request(base, '/rescan', {})
    const rescanned = rescanResponse.payload.state.tools.find((tool) => tool.id === nodeTool.id)
    assert(rescanned.name === 'Fixture Node Server (edited)', 'manual name survives a rescan')
    assert(rescanned.description === 'Edited description survives a rescan.', 'manual description survives a rescan')
    assert(rescanned.edited === true, 'edited marker survives a rescan')
    assert(rescanned.category === '小游戏', 'manual category survives a rescan')

    const notes = rescanResponse.payload.state.tools.find((tool) => tool.path.endsWith('readme-only'))
    assert(notes, 'README fixture is still present')
    const favoriteResponse = await request(base, '/favorite', { id: notes.id, favorite: true })
    assert(favoriteResponse.status === 200, 'favorite answers 200')
    assert(favoriteResponse.payload.tool.favorite === true, 'favorite flag is stored')
    assert(favoriteResponse.payload.state.tools[0].id === notes.id, 'favorite sorts above recent tools')
    const favoriteRescan = await request(base, '/rescan', {})
    assert(favoriteRescan.payload.state.tools.find((tool) => tool.id === notes.id)?.favorite === true, 'favorite survives a rescan')
    const unfavoriteResponse = await request(base, '/favorite', { id: notes.id, favorite: false })
    assert(unfavoriteResponse.payload.tool.favorite === false, 'favorite can be removed')
    assert(unfavoriteResponse.payload.state.tools[0].id !== notes.id, 'unfavorited tool is no longer pinned')

    const secondRescan = await request(base, '/rescan', {})
    const rescannedAgain = secondRescan.payload.state.tools.find((tool) => tool.id === nodeTool.id)
    assert(rescannedAgain.name === 'Fixture Node Server (edited)', 'manual name survives a second rescan')
    assert(rescannedAgain.edited === true, 'lock flags survive a second rescan')

    const resetResponse = await request(base, '/reset', { id: nodeTool.id })
    assert(resetResponse.status === 200, `reset answers 200 (got ${resetResponse.status})`)
    assert(resetResponse.payload.tool.name === 'Fixture Node Server', 'reset restores the detected name')
    assert(resetResponse.payload.tool.edited === false, 'reset clears the edited marker')
    assert(resetResponse.payload.tool.launch.label === 'node server.js', 'reset restores the detected command')
    assert(resetResponse.payload.tool.url === '', 'reset clears a manual URL when detection has none')
    assert(resetResponse.payload.tool.category === '工具', 'reset restores the auto-detected category')

    // Move a scanned project to a different directory. The tool should keep its id,
    // retarget the launch cwd, and a rescan of the original location must not
    // resurrect the old path or drop the override.
    await fs.cp(path.join(fixtures, 'node-server'), movedNode, { recursive: true })
    const moveResponse = await request(base, '/update', { id: nodeTool.id, path: movedNode })
    assert(moveResponse.status === 200, `path update answers 200 (got ${moveResponse.status})`)
    assert(moveResponse.payload.tool.path === movedNode, 'path update moves a scanned project')
    assert(moveResponse.payload.tool.launch.cwd === movedNode, 'path update retargets the launch cwd')
    const movedStart = await request(base, '/start', { id: nodeTool.id })
    assert(movedStart.status === 200, 'moved project starts')
    let movedRuntime
    for (let attempt = 0; attempt < 40; attempt++) {
      const response = await request(base, '/state')
      movedRuntime = response.payload.state.tools.find((tool) => tool.id === nodeTool.id)
      if (movedRuntime?.runtime?.status === 'running' && movedRuntime.url) break
      await sleep(150)
    }
    assert(movedRuntime?.runtime?.status === 'running', 'moved project reaches running')
    await request(base, '/stop', { id: nodeTool.id })
    await sleep(300)

    const pathRescan = await request(base, '/rescan', {})
    const movedAfterScan = pathRescan.payload.state.tools.find((tool) => tool.id === nodeTool.id)
    assert(movedAfterScan.path === movedNode, 'moved path survives a rescan')
    assert(pathRescan.payload.state.tools.every((tool) => !tool.path.endsWith('node-server')), 'old scanned path is not duplicated')
    assert(movedAfterScan.edited === true, 'path override marks the tool as edited')
    const pathRescanAgain = await request(base, '/rescan', {})
    assert(pathRescanAgain.payload.state.tools.find((tool) => tool.id === nodeTool.id)?.path === movedNode, 'moved path survives a second rescan')

    const pathReset = await request(base, '/reset', { id: nodeTool.id })
    assert(pathReset.status === 200, 'reset restores the original path')
    assert(pathReset.payload.tool.path.endsWith('node-server'), 'reset returns to the scanned path')
    assert(pathReset.payload.tool.path !== movedNode, 'reset drops the moved path')

    const addDirResponse = await request(base, '/add-directory', { path: addedDir })
    assert(addDirResponse.status === 200, `add-directory answers 200 (got ${addDirResponse.status})`)
    assert(addDirResponse.payload.state.tools.some((tool) => tool.path.endsWith('.added-project')), 'runtime directory is scanned')

    const addExeResponse = await request(base, '/add', {
      mode: 'executable', name: 'Echo Tool', path: executable, args: '--hello', cwd: root,
    })
    assert(addExeResponse.status === 200, `add executable answers 200 (got ${addExeResponse.status})`)
    const echo = addExeResponse.payload.state.tools.find((tool) => tool.name === 'Echo Tool')
    assert(echo, 'executable appears in the list')
    assert(echo.kind === 'executable', 'executable has the executable kind')
    assert(echo.launch.args[0] === '--hello', 'executable arguments are parsed')
    assert(echo.category === '工具', 'manual executable gets a default category')
    const echoUrl = await request(base, '/update', { id: echo.id, url: 'http://localhost:9997' })
    assert(echoUrl.status === 200, 'setting a local URL on an executable answers 200')
    assert(echoUrl.payload.tool.category === '工具', 'a local URL does not turn an executable into 外部工具')

    await fs.copyFile(executable, movedExe)
    const moveExeResponse = await request(base, '/update', { id: echo.id, path: movedExe })
    assert(moveExeResponse.payload.tool.path === movedExe, 'executable path can be edited')
    assert(moveExeResponse.payload.tool.launch.command === movedExe, 'editing an executable path retargets its command')

    const argsResponse = await request(base, '/update', { id: echo.id, args: '--hello --world' })
    assert(argsResponse.status === 200, 'editing executable arguments answers 200')
    assert(argsResponse.payload.tool.launch.command === movedExe, 'argument editing keeps the executable path')
    assert(argsResponse.payload.tool.launch.args.join(' ') === '--hello --world', 'argument editing updates the argument list')

    const flagCommand = await request(base, '/update', { id: echo.id, command: '--ui=true --port=9749' })
    assert(flagCommand.status === 400, 'a command starting with a flag is rejected')

    const addUrlResponse = await request(base, '/add', {
      mode: 'url', name: 'URL Tool', url: 'http://localhost:9999',
    })
    assert(addUrlResponse.status === 200, 'add URL tool answers 200')
    const urlTool = addUrlResponse.payload.state.tools.find((tool) => tool.name === 'URL Tool')
    assert(urlTool, 'URL tool appears in the list')
    assert(urlTool.category === '外部工具', 'URL tool is categorized as 外部工具')
    const updateUrlResponse = await request(base, '/update', {
      id: urlTool.id, name: 'URL Tool (edited)', url: 'http://localhost:9998', description: 'edited URL',
    })
    assert(updateUrlResponse.status === 200, 'update URL tool answers 200')
    assert(updateUrlResponse.payload.tool.url === 'http://localhost:9998/', 'update normalizes the URL')
    assert(updateUrlResponse.payload.tool.runtime.url === 'http://localhost:9998/', 'update applies the URL to runtime')
    assert(updateUrlResponse.payload.tool.path === 'http://localhost:9998/', 'update moves a URL tool to its new address')
    assert(updateUrlResponse.payload.tool.description === 'edited URL', 'update keeps a custom URL description')
    const clearUrlResponse = await request(base, '/update', { id: urlTool.id, url: '' })
    assert(clearUrlResponse.status === 400, 'a URL tool refuses an empty URL')
    const removeUrlResponse = await request(base, '/remove', { id: urlTool.id })
    assert(removeUrlResponse.status === 200, 'remove URL tool answers 200')

    const addAppResponse = await request(base, '/add', { mode: 'auto', name: 'Fake App', path: fakeApp })
    assert(addAppResponse.status === 200, `add .app answers 200 (got ${addAppResponse.status})`)
    const fake = addAppResponse.payload.state.tools.find((tool) => tool.name === 'Fake App')
    assert(fake, '.app appears in the list')
    assert(fake.kind === 'app', '.app has the app kind')
    assert(fake.appPath?.endsWith('.Fake.app'), '.app keeps its bundle path')

    const removeExeResponse = await request(base, '/remove', { id: echo.id })
    assert(removeExeResponse.status === 200, 'remove answers 200')
    const afterRemove = await request(base, '/state')
    assert(!afterRemove.payload.state.tools.some((tool) => tool.id === echo.id), 'executable is removed')

    console.log('\nSELF-TEST PASSED')
  } finally {
    for (const dispose of cleanups.reverse()) {
      try { await dispose() } catch { /* best effort */ }
    }
    await new Promise((resolve) => server.close(resolve))
    await fs.rm(dataDir, { recursive: true, force: true })
    await fs.rm(addedDir, { recursive: true, force: true })
    await fs.rm(executable, { force: true })
    await fs.rm(fakeApp, { recursive: true, force: true })
    await fs.rm(movedNode, { recursive: true, force: true })
    await fs.rm(movedExe, { force: true })
  }
}

main().catch((error) => {
  console.error('\nSELF-TEST FAILED')
  console.error(error)
  process.exitCode = 1
})