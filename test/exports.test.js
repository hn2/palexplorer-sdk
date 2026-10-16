import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))

describe('package exports', () => {
  test('PalexplorerClient is importable', async () => {
    const { PalexplorerClient } = await import('../src/index.js')
    assert.ok(PalexplorerClient)
    assert.equal(typeof PalexplorerClient, 'function')
  })

  test('DiscoveryClient is importable', async () => {
    const { DiscoveryClient } = await import('../src/index.js')
    assert.ok(DiscoveryClient)
  })

  test('all 19 named API modules are exported', async () => {
    const mod = await import('../src/index.js')
    const expected = [
      'PalexplorerClient', 'PalexplorerError', 'DiscoveryClient',
      'AuthAPI', 'SharesAPI', 'TransfersAPI', 'ChatAPI', 'PresenceAPI',
      'IdentityAPI', 'CryptoAPI', 'GroupsAPI', 'CommentsAPI', 'BroadcastAPI',
      'AuditAPI', 'SettingsAPI', 'WorkspacesAPI', 'PalsAPI', 'BillingAPI',
      'ShareLinksAPI', 'NetworksAPI',
    ]
    for (const name of expected) {
      assert.ok(mod[name], `Expected export: ${name}`)
    }
  })

  test('dist/index.d.ts exists', () => {
    const p = resolve(__dir, '../dist/index.d.ts')
    assert.ok(existsSync(p), 'dist/index.d.ts must exist')
  })

  test('npm pack would include src/, dist/, README.md, CHANGELOG.md', async () => {
    const { readFileSync } = await import('node:fs')
    const pkg = JSON.parse(readFileSync(resolve(__dir, '../package.json'), 'utf8'))
    const files = pkg.files
    assert.ok(files.includes('src/'))
    assert.ok(files.includes('dist/'))
    assert.ok(files.includes('README.md'))
    assert.ok(files.includes('CHANGELOG.md'))
    assert.ok(!files.some(f => f.startsWith('test')), 'test/ should not be in files')
  })
})
