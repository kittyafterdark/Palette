import {
  STYLE_STATES, clonePacketStack, createBoost, createInitialState, createProject, newId,
  type ComponentOverride, type LayoutGroup, type LayoutGroupState, type SmartInvertConfig,
  type StatePacketStacks, type StudioFontFace, type StudioTarget, type StylePacket, type StylePreset, type SavedStyleBundle, type RecipePacketSlot, type StudioSvgAsset,
  type StyleStateName, type ResponsiveScopeName, type ThemeStudioProject, type ThemeStudioState,
} from './model'
import { normalizePacket, normalizeState } from './migrations'
import { normalizeSvgSource } from './model'
import { synthesizeSmartInvertPackets, type ComputedPresentation } from './smart-invert'

export type StoreListener = (state: ThemeStudioState) => void
function allEmpty(states: StatePacketStacks): boolean { return STYLE_STATES.every((state) => !(states[state]?.length)) }
function responsiveStacks(override: ComponentOverride | undefined, scope: ResponsiveScopeName): StatePacketStacks {
  if (!override) return { normal: [] }
  return scope === 'mobile' ? (override.mobileStates ?? { normal: [] }) : override.states
}
function assignResponsiveStacks(override: ComponentOverride, scope: ResponsiveScopeName, states: StatePacketStacks): ComponentOverride {
  return scope === 'mobile' ? { ...override, mobileStates: states } : { ...override, states }
}
function overrideEmpty(override: ComponentOverride): boolean {
  return allEmpty(override.states) && (!override.mobileStates || allEmpty(override.mobileStates))
}
function upsertInto(states: StatePacketStacks, state: StyleStateName, packet: StylePacket): StatePacketStacks {
  const list = [...(states[state] ?? [])]; const index = list.findIndex((entry) => entry.type === packet.type)
  if (index < 0) list.push(structuredClone(packet)); else list[index] = structuredClone(packet)
  return { ...states, [state]: list }
}


function cloneOverrideForSavedStyle(source: ComponentOverride): ComponentOverride {
  const clone = structuredClone(source)
  clone.id = newId('saved-override')
  for (const state of STYLE_STATES) {
    for (const packet of clone.states[state] ?? []) packet.id = newId('packet')
    for (const packet of clone.mobileStates?.[state] ?? []) packet.id = newId('packet')
  }
  return clone
}

function mergeSavedOverride(existing: ComponentOverride | undefined, saved: ComponentOverride): ComponentOverride {
  const incoming = cloneOverrideForSavedStyle(saved)
  incoming.id = existing?.id ?? newId('override')
  const mergeStacks = (base: StatePacketStacks | undefined, extra: StatePacketStacks | undefined): StatePacketStacks => {
    let result: StatePacketStacks = structuredClone(base ?? { normal: [] })
    for (const state of STYLE_STATES) {
      for (const packet of extra?.[state] ?? []) result = upsertInto(result, state, { ...structuredClone(packet), id: newId('packet') })
    }
    return result
  }
  const states = mergeStacks(existing?.states, incoming.states)
  const mobileStates = mergeStacks(existing?.mobileStates, incoming.mobileStates)
  return {
    ...(existing ?? incoming),
    id: existing?.id ?? newId('override'),
    target: structuredClone(incoming.target),
    states,
    ...(allEmpty(mobileStates) ? { mobileStates: undefined } : { mobileStates }),
  }
}

export class ProjectStore {
  private state: ThemeStudioState = createInitialState()
  private readonly listeners = new Set<StoreListener>()
  get snapshot(): ThemeStudioState { return this.state }
  get activeProject(): ThemeStudioProject { return this.state.projects.find((project) => project.id === this.state.activeProjectId) ?? this.state.projects[0] }
  hydrate(value: unknown): void { this.state = normalizeState(value); this.emit() }
  subscribe(listener: StoreListener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  selectProject(projectId: string): void { if (this.state.projects.some((project) => project.id === projectId)) { this.state = { ...this.state, activeProjectId: projectId }; this.emit() } }
  create(name?: string): ThemeStudioProject { const project = createProject(name ?? `Theme ${this.state.projects.length + 1}`); this.state = { ...this.state, activeProjectId: project.id, projects: [...this.state.projects, project] }; this.emit(); return project }
  duplicate(projectId = this.activeProject.id): ThemeStudioProject | null {
    const source = this.state.projects.find((project) => project.id === projectId); if (!source) return null
    const copy = structuredClone(source); const now = Date.now(); copy.id = newId('project'); copy.name = `${source.name} Copy`; copy.createdAt = now; copy.updatedAt = now
    const packetIdMap = new Map<string, string>()
    for (const override of copy.componentOverrides) {
      override.id = newId('override')
      for (const state of STYLE_STATES) {
        for (const packet of override.states[state] ?? []) { const next = newId('packet'); packetIdMap.set(packet.id, next); packet.id = next }
        for (const packet of override.mobileStates?.[state] ?? []) { const next = newId('packet'); packetIdMap.set(packet.id, next); packet.id = next }
      }
    }
    for (const group of copy.layoutGroups) {
      group.id = newId('group')
      for (const member of group.members) member.id = newId('group-member')
      for (const bucket of [group.styles?.base, group.styles?.mobile]) {
        if (!bucket) continue
        for (const packet of bucket.members) packet.id = newId('packet')
        for (const list of Object.values(bucket.contents)) for (const packet of list ?? []) packet.id = newId('packet')
        for (const packet of bucket.frame) packet.id = newId('packet')
      }
    }
    for (const slot of copy.recipeSlots) {
      slot.id = newId('recipe-slot')
      if (slot.base) slot.base.id = packetIdMap.get(slot.base.id) ?? newId('packet')
      for (const layer of slot.layers) layer.packet.id = packetIdMap.get(layer.packet.id) ?? newId('packet')
    }
    copy.fonts.forEach((font) => { font.id = newId('font') }); copy.presets.forEach((preset) => { preset.id = newId('preset') }); copy.svgAssets.forEach((svg) => { svg.id = newId('svg-asset') })
    this.state = { ...this.state, activeProjectId: copy.id, projects: [...this.state.projects, copy] }; this.emit(); return copy
  }
  rename(projectId: string, name: string): void { const trimmed = name.trim().slice(0, 120); if (trimmed) this.updateProject(projectId, (project) => ({ ...project, name: trimmed })) }
  delete(projectId: string): void { if (this.state.projects.length <= 1) return; const projects = this.state.projects.filter((project) => project.id !== projectId); this.state = { ...this.state, projects, activeProjectId: this.state.activeProjectId === projectId ? projects[0].id : this.state.activeProjectId }; this.emit() }
  setCustomCss(value: string): void { this.updateActive((project) => ({ ...project, customCss: value })) }
  setNativeAssetBundleId(bundleId?: string): void { this.updateActive((project) => ({ ...project, nativeAssetBundleId: bundleId || undefined })) }
  setAssets(assets: ThemeStudioProject['assets']): void { this.updateActive((project) => ({ ...project, assets: structuredClone(assets) })) }
  setRecipeSlots(slots: RecipePacketSlot[]): void { this.updateActive((project) => ({ ...project, recipeSlots: structuredClone(slots) })) }

  upsertPacket(target: StudioTarget, packet: StylePacket, state: StyleStateName = 'normal', scope: ResponsiveScopeName = 'base'): void {
    if (target.persistence === 'volatile') return
    const normalized = normalizePacket(packet)
    if (!normalized) return
    this.updateActive((project) => {
      const index = project.componentOverrides.findIndex((override) => override.target.selector === target.selector)
      const componentOverrides = [...project.componentOverrides]
      if (index < 0) {
        const base: ComponentOverride = { id: newId('override'), target: structuredClone(target), states: { normal: [] } }
        componentOverrides.push(assignResponsiveStacks(base, scope, upsertInto({ normal: [] }, state, normalized)))
      } else {
        // Editing a target is an explicit local action. Move that override to the
        // end of the generated Design cascade so equal-authority Strong rules are
        // deterministic: the thing the user touched most recently wins.
        const source = componentOverrides[index]
        const updated = assignResponsiveStacks({ ...source, target: structuredClone(target) }, scope, upsertInto(responsiveStacks(source, scope), state, normalized))
        componentOverrides.splice(index, 1); componentOverrides.push(updated)
      }
      return { ...project, componentOverrides }
    })
  }
  retargetOverride(overrideId: string, target: StudioTarget): void {
    if (target.persistence === 'volatile') return
    this.updateActive((project) => {
      const source = project.componentOverrides.find((override) => override.id === overrideId); if (!source) return project
      const destination = project.componentOverrides.find((override) => override.id !== overrideId && override.target.selector === target.selector)
      if (!destination) return { ...project, componentOverrides: project.componentOverrides.map((override) => override.id === overrideId ? { ...override, target: structuredClone(target) } : override) }
      const states: StatePacketStacks = structuredClone(destination.states)
      for (const state of STYLE_STATES) for (const packet of source.states[state] ?? []) Object.assign(states, upsertInto(states, state, packet))
      const mobileStates: StatePacketStacks = structuredClone(destination.mobileStates ?? { normal: [] })
      for (const state of STYLE_STATES) for (const packet of source.mobileStates?.[state] ?? []) Object.assign(mobileStates, upsertInto(mobileStates, state, packet))
      return { ...project, componentOverrides: project.componentOverrides.filter((override) => override.id !== source.id).map((override) => override.id === destination.id ? { ...override, target: structuredClone(target), states, ...(allEmpty(mobileStates) ? { mobileStates: undefined } : { mobileStates }) } : override) }
    })
  }
  setOverrideStrength(overrideId: string, strength: 'normal' | 'strong'): void {
    this.updateActive((project) => {
      const index = project.componentOverrides.findIndex((override) => override.id === overrideId)
      if (index < 0) return project
      const componentOverrides = [...project.componentOverrides]
      const source = componentOverrides[index]
      componentOverrides.splice(index, 1)
      componentOverrides.push({ ...source, target: { ...source.target, overrideStrength: strength } })
      return { ...project, componentOverrides }
    })
  }
  restoreTarget(selectors: string[]): void {
    const set = new Set(selectors.filter(Boolean))
    if (!set.size) return
    this.updateActive((project) => ({
      ...project,
      componentOverrides: project.componentOverrides.filter((override) => !set.has(override.target.selector)),
      // Restore is an explicit ownership reset. Do not leave recipe provenance
      // behind for a target whose authored Theme Studio state has been removed.
      recipeSlots: project.recipeSlots.filter((slot) => !set.has(slot.target.selector)),
    }))
  }
  removePacket(overrideId: string, packetId: string, state: StyleStateName = 'normal', scope: ResponsiveScopeName = 'base'): void {
    this.updateActive((project) => {
      const source = project.componentOverrides.find((override) => override.id === overrideId)
      const stacks = responsiveStacks(source, scope)
      const removing = (stacks[state] ?? []).find((packet) => packet.id === packetId)
      const componentOverrides = project.componentOverrides.map((override) => {
        if (override.id !== overrideId) return override
        const overrideStacks = responsiveStacks(override, scope)
        const updated = assignResponsiveStacks(override, scope, { ...overrideStacks, [state]: (overrideStacks[state] ?? []).filter((packet) => packet.id !== packetId) })
        return scope === 'mobile' && updated.mobileStates && allEmpty(updated.mobileStates) ? { ...updated, mobileStates: undefined } : updated
      }).filter((override) => !overrideEmpty(override))
      return {
        ...project,
        componentOverrides,
        // A manual packet delete means Theme Studio no longer owns this recipe
        // slot. Reset/apply history must not resurrect a layer the user removed.
        recipeSlots: source && removing
          ? project.recipeSlots.filter((slot) => !(slot.target.selector === source.target.selector && slot.type === removing.type && slot.scope === scope))
          : project.recipeSlots,
      }
    })
  }
  copyStatePackets(overrideId: string, from: StyleStateName, to: StyleStateName, scope: ResponsiveScopeName = 'base'): void {
    if (from === to) return
    this.updateActive((project) => ({ ...project, componentOverrides: project.componentOverrides.map((override) => {
      if (override.id !== overrideId) return override
      const stacks = responsiveStacks(override, scope)
      return assignResponsiveStacks(override, scope, { ...stacks, [to]: clonePacketStack(stacks[from] ?? []) })
    }) }))
  }
  resetState(overrideId: string, state: Exclude<StyleStateName, 'normal'>, scope: ResponsiveScopeName = 'base'): void {
    this.updateActive((project) => ({ ...project, componentOverrides: project.componentOverrides.map((override) => {
      if (override.id !== overrideId) return override
      const stacks = responsiveStacks(override, scope)
      const updated = assignResponsiveStacks(override, scope, { ...stacks, [state]: [] })
      return scope === 'mobile' && updated.mobileStates && allEmpty(updated.mobileStates) ? { ...updated, mobileStates: undefined } : updated
    }).filter((override) => !overrideEmpty(override)) }))
  }
  clonePacketStack(overrideId: string, state: StyleStateName = 'normal', scope: ResponsiveScopeName = 'base'): StylePacket[] {
    return clonePacketStack(responsiveStacks(this.activeProject.componentOverrides.find((override) => override.id === overrideId), scope)[state] ?? [])
  }
  applyPacketStack(target: StudioTarget, packets: StylePacket[], state: StyleStateName = 'normal'): void {
    if (target.persistence === 'volatile') return
    this.updateActive((project) => {
      const existing = project.componentOverrides.find((override) => override.target.selector === target.selector)
      const cloned = clonePacketStack(packets).map(normalizePacket).filter((packet): packet is StylePacket => packet !== null); const states = { ...(existing?.states ?? { normal: [] }), [state]: cloned }
      if (!existing) return { ...project, componentOverrides: [...project.componentOverrides, { id: newId('override'), target: structuredClone(target), states }] }
      const componentOverrides = project.componentOverrides.filter((override) => override.id !== existing.id)
      componentOverrides.push({ ...existing, target: structuredClone(target), states })
      return { ...project, componentOverrides }
    })
  }
  addLayoutGroup(input: Omit<LayoutGroup, 'id'>): LayoutGroup {
    const group: LayoutGroup = { ...structuredClone(input), id: newId('group'), members: input.members.map((member) => ({ ...structuredClone(member), id: member.id || newId('group-member') })) }
    this.updateActive((project) => ({ ...project, layoutGroups: [...project.layoutGroups, group] }))
    return group
  }
  updateLayoutGroup(groupId: string, updater: (group: LayoutGroup) => LayoutGroup): void {
    this.updateActive((project) => ({ ...project, layoutGroups: project.layoutGroups.map((group) => group.id === groupId ? structuredClone(updater(structuredClone(group))) : group) }))
  }
  updateLayoutGroupState(groupId: string, scope: ResponsiveScopeName, patch: Partial<LayoutGroupState>): void {
    this.updateLayoutGroup(groupId, (group) => {
      if (scope === 'base') return { ...group, base: { ...group.base, ...structuredClone(patch) } }
      const mobile = group.mobile ?? structuredClone(group.base)
      return { ...group, mobile: { ...mobile, ...structuredClone(patch) } }
    })
  }
  clearLayoutGroupMobile(groupId: string): void { this.updateLayoutGroup(groupId, (group) => ({ ...group, mobile: undefined })) }
  removeLayoutGroup(groupId: string): void { this.updateActive((project) => ({ ...project, layoutGroups: project.layoutGroups.filter((group) => group.id !== groupId) })) }

  savePreset(name: string, states: Partial<Record<StyleStateName, StylePacket[]>>): StylePreset {
    const preset: StylePreset = { id: newId('preset'), name: name.trim().slice(0, 120) || 'Untitled preset', states: Object.fromEntries(Object.entries(states).map(([state, packets]) => [state, clonePacketStack(packets ?? [])])) }
    this.updateActive((project) => ({ ...project, presets: [...project.presets, preset] })); return preset
  }

  saveStyle(name: string, overrides: ComponentOverride[], options: { scope?: SavedStyleBundle['scope']; sourceLabel?: string } = {}): SavedStyleBundle | null {
    const usable = overrides.filter((entry) => entry.target.persistence === 'persistent')
    if (!usable.length) return null
    const now = Date.now()
    const saved: SavedStyleBundle = {
      id: newId('saved-style'),
      name: name.trim().slice(0, 120) || 'Saved style',
      scope: options.scope ?? 'target',
      sourceLabel: options.sourceLabel?.trim().slice(0, 160) || undefined,
      sourceProjectName: this.activeProject.name,
      overrides: usable.map(cloneOverrideForSavedStyle),
      createdAt: now,
      updatedAt: now,
    }
    this.state = { ...this.state, savedStyles: [...this.state.savedStyles, saved] }
    this.emit()
    return saved
  }
  renameSavedStyle(styleId: string, name: string): void {
    const trimmed = name.trim().slice(0, 120)
    if (!trimmed) return
    const now = Date.now()
    this.state = { ...this.state, savedStyles: this.state.savedStyles.map((entry) => entry.id === styleId ? { ...entry, name: trimmed, updatedAt: now } : entry) }
    this.emit()
  }
  removeSavedStyle(styleId: string): void {
    this.state = { ...this.state, savedStyles: this.state.savedStyles.filter((entry) => entry.id !== styleId) }
    this.emit()
  }
  applySavedStyle(styleId: string): boolean {
    const saved = this.state.savedStyles.find((entry) => entry.id === styleId)
    if (!saved) return false
    this.updateActive((project) => {
      const componentOverrides = [...project.componentOverrides]
      for (const source of saved.overrides) {
        const index = componentOverrides.findIndex((entry) => entry.target.selector === source.target.selector)
        const existing = index >= 0 ? componentOverrides[index] : undefined
        const merged = mergeSavedOverride(existing, source)
        if (index >= 0) componentOverrides.splice(index, 1)
        componentOverrides.push(merged)
      }
      return { ...project, componentOverrides }
    })
    return true
  }

  registerFont(input: Omit<StudioFontFace, 'id'>): StudioFontFace {
    const font: StudioFontFace = { ...structuredClone(input), id: newId('font') }
    this.updateActive((project) => ({ ...project, fonts: [...project.fonts.filter((entry) => entry.family !== font.family), font] })); return font
  }
  removeFont(fontId: string): void { this.updateActive((project) => ({ ...project, fonts: project.fonts.filter((font) => font.id !== fontId) })) }
  saveSvgAsset(name: string, source: string): StudioSvgAsset | null {
    const svg = normalizeSvgSource(source)
    if (!svg) return null
    const entry: StudioSvgAsset = { id: newId('svg-asset'), name: name.trim().slice(0, 80) || `SVG ${this.activeProject.svgAssets.length + 1}`, svg, createdAt: Date.now() }
    this.updateActive((project) => ({ ...project, svgAssets: [...project.svgAssets, entry] }))
    return entry
  }
  removeSvgAsset(svgId: string): void { this.updateActive((project) => ({ ...project, svgAssets: project.svgAssets.filter((entry) => entry.id !== svgId) })) }
  /** v34 compatibility aliases; saved SVGs are project-wide as of v35. */
  saveComposerSvg(name: string, source: string): StudioSvgAsset | null { return this.saveSvgAsset(name, source) }
  removeComposerSvg(svgId: string): void { this.removeSvgAsset(svgId) }

  setBoostEnabled(enabled: boolean): void { this.updateActive((project) => ({ ...project, boost: { ...project.boost, enabled } })) }
  setBoostColorsEnabled(colorsEnabled: boolean): void { this.updateActive((project) => { const { typographyEnabled, canvasEnabled } = project.boost; return { ...project, boost: { ...project.boost, colorsEnabled, enabled: colorsEnabled || typographyEnabled || canvasEnabled } } }) }
  setBoostTypographyEnabled(typographyEnabled: boolean): void { this.updateActive((project) => { const { colorsEnabled, canvasEnabled } = project.boost; return { ...project, boost: { ...project.boost, typographyEnabled, enabled: colorsEnabled || typographyEnabled || canvasEnabled } } }) }
  setBoostCanvasEnabled(canvasEnabled: boolean): void { this.updateActive((project) => { const { colorsEnabled, typographyEnabled } = project.boost; return { ...project, boost: { ...project.boost, canvasEnabled, enabled: colorsEnabled || typographyEnabled || canvasEnabled } } }) }
  setBoostCanvasOpacity(canvasOpacity: number): void { this.updateActive((project) => ({ ...project, boost: { ...project.boost, canvasEnabled: true, enabled: true, canvasOpacity: Math.max(0, Math.min(1, Number.isFinite(canvasOpacity) ? canvasOpacity : 1)) } })) }
  setBoostWallpaperTreatmentEnabled(wallpaperTreatmentEnabled: boolean): void {
    this.updateActive((project) => ({ ...project, boost: { ...project.boost, wallpaperTreatmentEnabled, canvasEnabled: true, enabled: true } }))
  }
  updateBoostWallpaperTreatment(value: Partial<Pick<ThemeStudioProject['boost'], 'wallpaperOpacity' | 'wallpaperBlur' | 'wallpaperSaturation' | 'wallpaperContrast' | 'wallpaperBrightness'>>): void {
    this.updateActive((project) => ({ ...project, boost: { ...project.boost, ...structuredClone(value), wallpaperTreatmentEnabled: true, canvasEnabled: true, enabled: true } }))
  }
  setBoostProtectControls(protectControls: boolean): void { this.updateActive((project) => ({ ...project, boost: { ...project.boost, protectControls } })) }
  setBoostMode(mode: 'recolor' | 'smart-invert'): void { this.updateActive((project) => ({ ...project, boost: { ...project.boost, enabled: true, colorsEnabled: true, mode } })) }
  setBoostTextMode(textMode: ThemeStudioProject['boost']['textMode']): void { this.updateActive((project) => ({ ...project, boost: { ...project.boost, enabled: true, colorsEnabled: true, textMode } })) }
  updateBoostParameters(value: Partial<Pick<ThemeStudioProject['boost'], 'primary' | 'secondary' | 'text' | 'contrast' | 'brightness' | 'originalSaturation'>>): void {
    this.updateActive((project) => ({ ...project, boost: { ...project.boost, ...structuredClone(value), enabled: true, colorsEnabled: true } }))
  }
  setBoostFont(fontFamily?: string, scale?: number): void { this.updateActive((project) => ({ ...project, boost: { ...project.boost, enabled: true, typographyEnabled: true, typography: { fontFamily: fontFamily?.trim() || undefined, scale } } })) }
  resetBoost(): void { this.updateActive((project) => ({ ...project, boost: createBoost() })) }
  applySmartInvertToBoost(_config?: SmartInvertConfig): void { this.setBoostMode('smart-invert') }
  shuffleBoost(): void {
    this.updateActive((project) => {
      let seed = (project.boost.shuffleSeed * 48271) % 0x7fffffff
      const random = () => (seed = (seed * 48271) % 0x7fffffff) / 0x7fffffff
      const hsl = (h: number, s: number, l: number): string => {
        const a = s * Math.min(l, 1 - l); const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)) }
        return `#${[f(0), f(8), f(4)].map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`
      }
      const hue = random() * 360; const primary = { color: hsl(hue, 0.62 + random() * 0.28, 0.48 + random() * 0.14), alpha: 1 }
      const secondary = { color: hsl((hue + 90 + random() * 180) % 360, 0.48 + random() * 0.32, 0.42 + random() * 0.18), alpha: 1 }
      return { ...project, boost: { ...project.boost, enabled: true, colorsEnabled: true, primary, secondary, shuffleSeed: seed } }
    })
  }

  applyCapturedPackets(target: StudioTarget, packets: StylePacket[], state: StyleStateName = 'normal', scope: ResponsiveScopeName = 'base'): void {
    if (target.persistence === 'volatile' || !packets.length) return
    this.updateActive((project) => {
      const existing = project.componentOverrides.find((override) => override.target.selector === target.selector)
      let stacks = responsiveStacks(existing, scope)
      for (const packet of packets) stacks = upsertInto(stacks, state, packet)
      if (!existing) {
        const base: ComponentOverride = { id: newId('override'), target: structuredClone(target), states: { normal: [] } }
        return { ...project, componentOverrides: [...project.componentOverrides, assignResponsiveStacks(base, scope, stacks)] }
      }
      const componentOverrides = project.componentOverrides.filter((override) => override.id !== existing.id)
      componentOverrides.push(assignResponsiveStacks({ ...existing, target: structuredClone(target) }, scope, stacks))
      return { ...project, componentOverrides }
    })
  }

  applySmartInvertToTarget(target: StudioTarget, presentation: ComputedPresentation, config: SmartInvertConfig, state: StyleStateName = 'normal', scope: ResponsiveScopeName = 'base'): void {
    if (target.persistence === 'volatile') return
    const packets = synthesizeSmartInvertPackets(presentation, config)
    this.updateActive((project) => {
      const existing = project.componentOverrides.find((override) => override.target.selector === target.selector)
      let stacks = responsiveStacks(existing, scope)
      for (const packet of packets) stacks = upsertInto(stacks, state, packet)
      if (!existing) {
        const base: ComponentOverride = { id: newId('override'), target: structuredClone(target), states: { normal: [] } }
        return { ...project, componentOverrides: [...project.componentOverrides, assignResponsiveStacks(base, scope, stacks)] }
      }
      const componentOverrides = project.componentOverrides.filter((override) => override.id !== existing.id)
      componentOverrides.push(assignResponsiveStacks({ ...existing, target: structuredClone(target) }, scope, stacks))
      return { ...project, componentOverrides }
    })
  }

  private updateActive(updater: (project: ThemeStudioProject) => ThemeStudioProject): void { this.updateProject(this.state.activeProjectId, updater) }
  private updateProject(projectId: string, updater: (project: ThemeStudioProject) => ThemeStudioProject): void { this.state = { ...this.state, projects: this.state.projects.map((project) => project.id === projectId ? { ...updater(project), updatedAt: Date.now() } : project) }; this.emit() }
  private emit(): void { for (const listener of this.listeners) listener(this.state) }
}
