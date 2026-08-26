import type { ThemeStudioProject } from '../project/model'
import type { NativeThemeVariable } from '../registry/types'

function clean(value: string): string { return value.trim().replace(/^['"]|['"]$/g, '') }
export function knownTypographyChoices(project?: ThemeStudioProject, variables: NativeThemeVariable[] = []): string[] {
  const choices = new Set(['system-ui', 'Segoe UI', 'Arial', 'Verdana', 'Trebuchet MS', 'Georgia', 'Century Gothic'])
  const native = variables.find((entry) => entry.name === '--lumiverse-font-family')
  const nativeValue = native?.value ?? native?.defaultValue
  if (nativeValue) nativeValue.split(',').map(clean).filter(Boolean).forEach((family) => choices.add(family))
  project?.fonts.forEach((font) => choices.add(font.family))
  if (typeof document !== 'undefined' && document.fonts) document.fonts.forEach((font) => { if (font.family) choices.add(clean(font.family)) })
  return [...choices]
}
