import { describe, expect, test } from 'bun:test'
import type { SpindleFrontendContext, SpindleThemeAsset } from 'lumiverse-spindle-types'
import { createThemesBackup, parseThemesBackup, restoreThemesBackup } from '../src/project/backup'
import { normalizeState } from '../src/project/migrations'
import { ProjectStore } from '../src/project/store'
import { createStylePacket } from '../src/project/model'

const asset: SpindleThemeAsset = { id: 'old-asset', bundleId: 'old-bundle', slug: 'wall', originalFilename: 'wall.png', mimeType: 'image/png', sizeBytes: 4, cssPath: 'assets/wall.png', contentUrl: '/old-instance/assets/wall.png' }
function host() {
  const uploads: Array<{ bytes: Uint8Array; bundleId: string }> = []
  const deleted: string[] = []
  let failUpload = false
  const ctx = {
    host: { capabilities: { 'theme-assets-v1': 1 } },
    theme: { assets: {
      list: async () => [asset],
      getBytes: async () => new Uint8Array([0, 127, 128, 255]),
      createBundle: () => 'new-bundle',
      upload: async (file: { bytes: Uint8Array }, options: { bundleId: string }) => {
        if (failUpload && uploads.length) throw new Error('Upload unavailable')
        uploads.push({ bytes: file.bytes, bundleId: options.bundleId })
        return { ...asset, id: `new-asset-${uploads.length}`, bundleId: options.bundleId, cssPath: 'assets/new-wall.png', contentUrl: '/new-instance/assets/wall.png' }
      },
      delete: async (id: string) => { deleted.push(id) },
    } },
  } as unknown as SpindleFrontendContext
  return { ctx, uploads, deleted, fail: () => { failUpload = true } }
}
function collection() {
  const store = new ProjectStore()
  store.rename(store.activeProject.id, 'First theme')
  store.setNativeAssetBundleId(asset.bundleId)
  store.setAssets([{ assetId: asset.id, path: asset.cssPath, contentUrl: asset.contentUrl }])
  store.setCustomCss(`.wall { background: url("${asset.contentUrl}"); mask: url("${asset.cssPath}"); }`)
  store.setSourceTheme({ origin: 'lumitheme', editable: true, previewEnabled: false, globalCSS: '@import url("https://fonts.example/font.css");', components: { Message: { css: '.message { color: pink; }', enabled: false, tsx: '<section />' } } })
  store.upsertPacket({ selector: '.wall', strategy: 'structural', stability: 'medium', persistence: 'persistent', source: 'dom-scoped', label: 'Wall' }, createStylePacket('background'))
  store.saveStyle('Saved wall', store.activeProject.componentOverrides, { scope: 'target' })
  store.create('Second theme')
  return store
}

describe('full themes backup', () => {
  test('round-trips every project and My Styles, rewrites asset references, and stays editable after reload', async () => {
    const store = collection(); const { ctx, uploads } = host()
    const original = structuredClone(store.snapshot)
    const backup = parseThemesBackup(JSON.stringify(await createThemesBackup(ctx, store.snapshot)))
    expect(backup.state).toEqual(normalizeState(original))
    const restored = await restoreThemesBackup(ctx, backup)
    expect(uploads[0]).toEqual({ bytes: new Uint8Array([0, 127, 128, 255]), bundleId: 'new-bundle' })
    expect(restored.projects.map((project) => project.name)).toEqual(['First theme', 'Second theme'])
    expect(restored.projects[0].customCss).toContain('/new-instance/assets/wall.png')
    expect(restored.projects[0].customCss).toContain('assets/new-wall.png')
    expect(restored.projects[0].assets[0].assetId).toBe('new-asset-1')
    expect(restored.projects[0].nativeAssetBundleId).toBe('new-bundle')
    expect(restored.projects[0].sourceTheme).toEqual(normalizeState(original).projects[0].sourceTheme)
    expect(restored.projects[0].componentOverrides).toEqual(normalizeState(original).projects[0].componentOverrides)
    expect(restored.savedStyles[0].id).not.toBe(original.savedStyles[0].id)
    const again = await restoreThemesBackup(ctx, backup)
    expect(again.projects[0].id).not.toBe(restored.projects[0].id)
    expect(store.snapshot).toEqual(original)
    const reload = new ProjectStore(); reload.hydrate(JSON.parse(JSON.stringify(restored)))
    reload.selectProject(restored.projects[0].id); reload.rename(restored.projects[0].id, 'Remix')
    expect(reload.activeProject.name).toBe('Remix')
    expect(reload.activeProject.assets[0].contentUrl).toBe('/new-instance/assets/wall.png')
  })

  test('rejects malformed, future, duplicate, missing-asset and corrupt backups before uploading', async () => {
    const { ctx, uploads } = host()
    const backup = await createThemesBackup(ctx, collection().snapshot)
    const invalid = [null, {}, { ...backup, version: 2 }, { ...backup, state: { ...backup.state, version: 99999 } }, { ...backup, state: { ...backup.state, projects: [backup.state.projects[0], backup.state.projects[0]] } }, { ...backup, assets: [] }, { ...backup, assets: [{ ...backup.assets[0], base64: 'broken!' }] }]
    for (const value of invalid) expect(() => parseThemesBackup(JSON.stringify(value))).toThrow()
    expect(uploads).toHaveLength(0)
  })

  test('supports asset-free collections without native capabilities and does not retain empty bundle IDs', async () => {
    const ctx = { host: { capabilities: {} } } as SpindleFrontendContext
    const store = new ProjectStore()
    const backup = await createThemesBackup(ctx, store.snapshot)
    backup.state.projects[0].nativeAssetBundleId = 'empty-old-bundle'
    const restored = await restoreThemesBackup(ctx, parseThemesBackup(JSON.stringify(backup)))
    expect(restored.projects[0].nativeAssetBundleId).toBeUndefined()
  })

  test('cleans successful uploads if a later upload fails and never mutates the source', async () => {
    const store = collection(); const mock = host()
    const backup = await createThemesBackup(mock.ctx, store.snapshot)
    backup.assets.push({ asset: { ...asset, id: 'second-asset', slug: 'second' }, base64: backup.assets[0].base64 })
    const original = structuredClone(backup)
    mock.fail()
    await expect(restoreThemesBackup(mock.ctx, backup)).rejects.toThrow('Upload unavailable')
    expect(mock.deleted).toEqual(['new-asset-1'])
    expect(backup).toEqual(original)
  })

  test('backs up multi-megabyte assets without base64 stack limits or byte loss', async () => {
    const mock = host(); const bytes = new Uint8Array(2 * 1024 * 1024).fill(243)
    mock.ctx.theme.assets.getBytes = async () => bytes
    const backup = parseThemesBackup(JSON.stringify(await createThemesBackup(mock.ctx, collection().snapshot)))
    await restoreThemesBackup(mock.ctx, backup)
    expect(mock.uploads[0].bytes).toEqual(bytes)
  })

  test('adding a collection preserves existing project data and active selection exactly', async () => {
    const current = collection(); const snapshot = structuredClone(current.snapshot)
    const source = new ProjectStore(); const mock = host()
    const restored = await restoreThemesBackup(mock.ctx, await createThemesBackup(mock.ctx, source.snapshot))
    current.appendCollection(restored)
    expect(current.snapshot.projects.slice(0, snapshot.projects.length)).toEqual(snapshot.projects)
    expect(current.snapshot.savedStyles).toEqual(snapshot.savedStyles)
    expect(current.snapshot.activeProjectId).toBe(snapshot.activeProjectId)
  })

  test('refuses to export a missing uploaded asset rather than silently dropping its bytes', async () => {
    const store = collection(); const { ctx } = host()
    ctx.theme.assets.list = async () => []
    await expect(createThemesBackup(ctx, store.snapshot)).rejects.toThrow('Missing uploaded asset')
  })
})
