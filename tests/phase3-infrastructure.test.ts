import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'
import { createStylePacket, type StudioTarget } from '../src/project/model'
import { isMediaElement, smartInvertColor, synthesizeSmartInvertPackets } from '../src/project/smart-invert'
import { ProjectStore } from '../src/project/store'

const config = { enabled: true, strength: 1, preserveAccents: true, preserveMedia: true }
const target: StudioTarget = { selector: '.panel', strategy: 'exact-class', stability: 'low', persistence: 'persistent', source: 'dom-scoped', label: 'div · panel' }

describe('Smart Invert semantic transformations', () => {
  test('light/dark roles exchange perceptual lightness while accents keep hue family', () => {
    expect(smartInvertColor('#f4f4f4', 'surface', config)).toBe('#1f1f1f')
    expect(smartInvertColor('#181818', 'surface', config)).toBe('#e6e6e6')
    expect(smartInvertColor('#181818', 'text', config)).toBe('#ebebeb')
    const purple = smartInvertColor('#7b4ed8', 'accent', config)
    expect(purple).toMatch(/^#[0-9a-f]{6}$/)
    expect(smartInvertColor('#7b4ed8', 'accent', { ...config, strength: 0 })).toBe('#7b4ed8')
  })
  test('computed colors become ordinary editable semantic packets', () => {
    const packets = synthesizeSmartInvertPackets({ backgroundColor: 'rgb(244, 244, 244)', color: 'rgb(24, 24, 24)', borderColor: 'rgb(210, 210, 210)' }, config)
    expect(packets.map((packet) => packet.type)).toEqual(['background', 'text', 'border'])
    expect(synthesizeSmartInvertPackets({ backgroundColor: 'rgba(0, 0, 0, 0)', color: 'rgb(24 24 24)' }, config).map((packet) => packet.type)).toEqual(['text'])
  })
})

describe('Phase Three store infrastructure', () => {
  test('volatile targets are not persisted', () => {
    const store = new ProjectStore(); store.upsertPacket({ ...target, selector: 'main > div', persistence: 'volatile', strategy: 'volatile' }, createStylePacket('background'))
    expect(store.activeProject.componentOverrides).toHaveLength(0)
  })
  test('retargeting preserves all state stacks and cloning shares no references', () => {
    const store = new ProjectStore(); store.upsertPacket(target, createStylePacket('background'), 'normal'); store.upsertPacket(target, createStylePacket('shadow'), 'hover')
    const original = store.activeProject.componentOverrides[0]; const cloned = store.clonePacketStack(original.id, 'normal')
    store.retargetOverride(original.id, { ...target, selector: '.new-panel' })
    const moved = store.activeProject.componentOverrides[0]
    expect(moved.target.selector).toBe('.new-panel'); expect(moved.states.hover?.[0].type).toBe('shadow')
    expect(cloned[0].id).not.toBe(moved.states.normal[0].id)
  })
  test('scoped Smart Invert creates packets on DOM-only targets', () => {
    const store = new ProjectStore(); store.applySmartInvertToTarget(target, { backgroundColor: '#ffffff', color: '#111111', borderColor: '#cccccc' }, config)
    expect(store.activeProject.componentOverrides[0].states.normal.map((packet) => packet.type)).toEqual(['background', 'text', 'border'])
  })
  test('store normalization prevents non-finite semantic dimensions', () => {
    const store = new ProjectStore(); const size = createStylePacket('size'); if (size.type !== 'size') throw new Error(); size.width = { mode: 'fixed', value: Number.NaN, unit: 'px' }
    store.upsertPacket(target, size); const saved = store.activeProject.componentOverrides[0].states.normal[0]
    expect(saved.type === 'size' && saved.width?.mode === 'fixed' && saved.width.value).toBe(0)
  })
})

describe('media preservation', () => {
  let window: Window
  beforeEach(() => { window = new Window(); Object.assign(globalThis, { document: window.document }) })
  afterEach(async () => { await window.close() })
  test('images, video, canvas and picture descendants are excluded', () => {
    document.body.innerHTML = '<picture><img></picture><video></video><canvas></canvas><div></div>'
    expect(isMediaElement(document.querySelector('img')!)).toBe(true); expect(isMediaElement(document.querySelector('video')!)).toBe(true); expect(isMediaElement(document.querySelector('canvas')!)).toBe(true); expect(isMediaElement(document.querySelector('div')!)).toBe(false)
  })
})
