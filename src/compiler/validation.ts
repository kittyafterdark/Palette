import type { ComponentOverride, DimensionValue, StylePacket, StyleStateName } from '../project/model'

export interface StudioWarning { code: string; message: string; state: StyleStateName; packetIds: string[] }
function packets(override: ComponentOverride, state: StyleStateName): StylePacket[] { return override.states[state] ?? [] }

/** Pure, non-fatal semantic validation. Compilation always continues. */
export interface ValidationContext { parentDisplay?: string }
function contradictory(minimum: DimensionValue | undefined, maximum: DimensionValue | undefined): boolean {
  return minimum?.mode === 'fixed' && maximum?.mode === 'fixed' && minimum.unit === maximum.unit && minimum.value > maximum.value
}
export function validateOverride(override: ComponentOverride, context: ValidationContext = {}): StudioWarning[] {
  const warnings: StudioWarning[] = []
  for (const state of ['normal', 'hover', 'active', 'focusVisible', 'disabled'] as StyleStateName[]) {
    const stack = packets(override, state); if (!stack.length) continue
    const background = stack.find((packet) => packet.type === 'background')
    const pattern = stack.find((packet) => packet.type === 'pattern')
    const text = stack.find((packet) => packet.type === 'text')
    const layout = stack.find((packet) => packet.type === 'layout')
    const layoutItem = stack.find((packet) => packet.type === 'layout-item')
    const placement = stack.find((packet) => packet.type === 'placement')
    const size = stack.find((packet) => packet.type === 'size')
    const spacing = stack.find((packet) => packet.type === 'spacing')
    const alignment = stack.find((packet) => packet.type === 'alignment')
    const glass = stack.find((packet) => packet.type === 'glass')
    if (background && text?.type === 'text' && text.colorMode === 'gradient') warnings.push({ code: 'gradient-text-background', message: 'Gradient Text and Background both use the element background painting layer; prefer a nested text target if rendering competes.', state, packetIds: [background.id, text.id] })
    if (pattern && text?.type === 'text' && text.colorMode === 'gradient') warnings.push({ code: 'gradient-text-pattern', message: 'Pattern and Gradient Text both need background-image on this element. Put the pattern on a wrapper or decorative layer so both can render.', state, packetIds: [pattern.id, text.id] })
    if (layout?.type === 'layout' && layout.display === 'normal' && (layout.justify || layout.align || layout.gap)) warnings.push({ code: 'layout-normal-alignment', message: 'Layout alignment and gap have no effect while display remains Normal.', state, packetIds: [layout.id] })
    if (layout?.type === 'layout' && !['flex', 'inline-flex'].includes(layout.display) && (layout.direction && layout.direction !== 'row' || layout.wrap && layout.wrap !== 'nowrap') && layout.display !== 'normal') warnings.push({ code: 'layout-flex-settings', message: 'Flex direction and wrapping only apply to Flex or Inline Flex.', state, packetIds: [layout.id] })
    if (layout?.type === 'layout' && !['grid', 'inline-grid'].includes(layout.display) && layout.gridColumns?.mode !== 'auto') warnings.push({ code: 'layout-grid-settings', message: 'Grid column settings only apply to Grid or Inline Grid.', state, packetIds: [layout.id] })
    if (layoutItem?.type === 'layout-item' && context.parentDisplay && !['flex', 'inline-flex', 'grid', 'inline-grid'].includes(context.parentDisplay)) warnings.push({ code: 'layout-item-parent', message: `Layout Item controls may have no effect because the current parent display is ${context.parentDisplay}. Quick Align is safer for ordinary left/center/right placement.`, state, packetIds: [layoutItem.id] })
    if (placement?.type === 'placement' && placement.vertical !== 'native' && context.parentDisplay && !['flex', 'inline-flex', 'grid', 'inline-grid'].includes(context.parentDisplay)) warnings.push({ code: 'placement-vertical-parent', message: `Vertical Quick Align may have no free space to distribute because the current parent display is ${context.parentDisplay}. Horizontal Quick Align still works.`, state, packetIds: [placement.id] })
    if (size?.type === 'size' && contradictory(size.minWidth, size.maxWidth)) warnings.push({ code: 'size-width-constraints', message: 'Minimum width exceeds maximum width.', state, packetIds: [size.id] })
    if (size?.type === 'size' && contradictory(size.minHeight, size.maxHeight)) warnings.push({ code: 'size-height-constraints', message: 'Minimum height exceeds maximum height.', state, packetIds: [size.id] })
    if (!layout && (spacing?.type === 'spacing' && spacing.gap !== undefined || alignment)) warnings.push({ code: 'layout-required', message: 'Gap or content alignment may have no effect without Flex or Grid Layout.', state, packetIds: [spacing?.id, alignment?.id].filter((id): id is string => Boolean(id)) })
    if (glass?.type === 'glass' && !background && !glass.tintColor) warnings.push({ code: 'glass-transparency', message: 'Backdrop blur may not be visible unless the target or its existing background is translucent.', state, packetIds: [glass.id] })
  }
  return warnings
}
