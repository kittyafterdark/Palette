import { describe, expect, test } from 'bun:test'
import { compileLayoutGroup, compileThemeProject } from '../src/compiler/compiler'
import { createProject, type LayoutGroup } from '../src/project/model'
import { normalizeState } from '../src/project/migrations'

const parent = {
  selector: '[data-component="PersonaEditor"] [class*="_editor_"]', strategy: 'native-context-local' as const,
  stability: 'high' as const, persistence: 'persistent' as const, source: 'native-aware' as const,
  label: 'Editor', nativeComponentId: 'PersonaEditor', nativeContextSelector: '[data-component="PersonaEditor"]', localSelector: '[class*="_editor_"]', overrideStrength: 'strong' as const,
}
const member = (label: string, local: string) => ({
  id: `member-${local}`, label,
  target: {
    selector: `[data-component="PersonaEditor"] [class*="_${local}_"]`, strategy: 'native-context-local' as const,
    stability: 'high' as const, persistence: 'persistent' as const, source: 'native-aware' as const,
    label, nativeComponentId: 'PersonaEditor', nativeContextSelector: '[data-component="PersonaEditor"]', localSelector: `[class*="_${local}_"]`, overrideStrength: 'strong' as const,
  },
})
const group: LayoutGroup = {
  id: 'group-a', name: 'Folder + Binding', parent,
  members: [member('Folder Row', 'folderRow'), member('Binding Row', 'bindingRow')],
  base: { mode: 'row', columns: 2, gap: { mode: 'fixed', value: 8, unit: 'px' }, justify: 'stretch', align: 'stretch', otherSiblings: 'full-width' },
  mobile: { mode: 'column', columns: 1, gap: { mode: 'fixed', value: 6, unit: 'px' }, justify: 'stretch', align: 'stretch', otherSiblings: 'full-width' },
}

describe('layout groups', () => {
  test('compile selected siblings through their shared parent', () => {
    const css = compileLayoutGroup(group)
    expect(css).toContain('Layout Group · Folder + Binding · 2 members')
    expect(css).toContain('display: grid !important')
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important')
    expect(css).toContain('grid-column: 1 / -1 !important')
    expect(css).toContain('[class*="_folderRow_"]')
    expect(css).toContain('[class*="_bindingRow_"]')
    expect(css).toContain('@media (max-width: 720px)')
    expect(css).toContain('grid-template-columns: repeat(1, minmax(0, 1fr)) !important')
  })

  test('project compiler includes groups with ordinary element overrides', () => {
    const project = createProject('Groups')
    project.layoutGroups.push(group)
    expect(compileThemeProject(project)).toContain('Layout Group · Folder + Binding')
  })

  test('schema v25 persists reusable groups and drops one-member junk', () => {
    const project = createProject('Groups')
    project.layoutGroups.push(group, { ...structuredClone(group), id: 'bad', members: [group.members[0]] })
    const state = normalizeState({ version: 26, activeProjectId: project.id, projects: [project] })
    expect(state.version).toBe(42)
    expect(state.projects[0].layoutGroups).toHaveLength(1)
    expect(state.projects[0].layoutGroups[0].members).toHaveLength(2)
  })

  test('group members can share paint without a synthetic wrapper', () => {
    const styled = structuredClone(group)
    styled.styles = {
      base: {
        members: [
          { id: 'bg', type: 'background', mode: 'solid', solid: { color: '#17111f', alpha: .9 }, gradient: { type: 'linear', angle: 135, stops: [] }, image: { assetPath: '', size: 'cover', positionX: 50, positionY: 50, repeat: 'no-repeat' } },
          { id: 'border', type: 'border', width: 1, style: 'solid', color: '#9370db', alpha: .7 },
        ],
        contents: {},
        frame: [],
      },
    }
    const css = compileLayoutGroup(styled)
    expect(css).toContain('Group members')
    expect(css).toContain('[class*="_folderRow_"]')
    expect(css).toContain('[class*="_bindingRow_"]')
    expect(css).toContain('background: rgba(23, 17, 31, 0.9) !important')
    expect(css).toContain('border: 1px solid rgba(147, 112, 219, 0.7) !important')
  })

  test('group contents can target icons inside every member', () => {
    const styled = structuredClone(group)
    styled.styles = { base: { members: [], contents: { icons: [{ id: 'icon', type: 'text', colorMode: 'solid', inkMode: 'cascade', solid: { color: '#ff66cc', alpha: 1 }, gradient: { type: 'linear', angle: 135, stops: [] }, strokeWidth: 0, strokeColor: '#000000', strokeAlpha: 1 }] }, frame: [] } }
    const css = compileLayoutGroup(styled)
    expect(css).toContain('Group contents · icons')
    expect(css).toContain(':is(svg,[data-icon]')
    expect(css).toContain('color: #ff66cc !important')
  })

  test('group frame uses the real parent pseudo-layer and does not insert DOM', () => {
    const styled = structuredClone(group)
    styled.styles = { base: { members: [], contents: {}, frame: [{ id: 'frame', type: 'border', width: 2, style: 'solid', color: '#ffffff', alpha: .5 }] } }
    const css = compileLayoutGroup(styled)
    expect(css).toContain('Group frame geometry')
    expect(css).toContain('::before')
    expect(css).toContain('grid-row: 1 / span 1 !important')
    expect(css).toContain('border: 2px solid rgba(255, 255, 255, 0.5) !important')
  })

  test('preserves recipe provenance on pack-owned groups', () => {
    const project = createProject('Recipe groups')
    project.layoutGroups.push({ ...structuredClone(group), recipeSource: { presetId: 'surface-layout', groupId: 'toolbar-cluster' } })
    const state = normalizeState({ version: 26, activeProjectId: project.id, projects: [project] })
    expect(state.projects[0].layoutGroups[0].recipeSource).toEqual({ presetId: 'surface-layout', groupId: 'toolbar-cluster' })
  })


})
