/**
 * Build the browser half of dsh-ai-toolbox.
 *
 * The DSH client loader expects a CommonJS closure-factory artifact:
 *
 *   window.__ModuleLoader__.load({ id, factory: (require) => { … } })
 *
 * React and the JSX runtime are platform modules, so they stay external and
 * resolve through the loader's frozen module table. Everything else (the
 * Markdown renderer and plugin CSS) is bundled into the single artifact.
 */

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, context } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const watch = process.argv.includes('--watch')

const options = {
  absWorkingDir: root,
  entryPoints: ['src/client/index.jsx'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['chrome120'],
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'],
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env': '{"MODE":"production"}',
  },
  banner: {
    js: [
      `window.__ModuleLoader__.load({`,
      `  id: ${JSON.stringify(manifest.name)},`,
      `  factory: (require) => {`,
      `    var module = { exports: {} };`,
      `    var exports = module.exports;`,
    ].join('\n'),
  },
  footer: {
    js: [
      `    return module.exports;`,
      `  }`,
      `});`,
    ].join('\n'),
  },
  legalComments: 'none',
  minify: false,
  sourcemap: false,
  logLevel: 'info',
}

if (watch) {
  const ctx = await context(options)
  await ctx.watch()
  console.log('[dsh-ai-toolbox] watching src/client…')
} else {
  await build(options)
  console.log(`[dsh-ai-toolbox] built lib/client.js for ${manifest.name}`)
}