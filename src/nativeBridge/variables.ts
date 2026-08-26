import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import type { NativeThemeVariable } from '../registry/types'

export function listNativeThemeVariables(ctx: SpindleFrontendContext): NativeThemeVariable[] {
  return ctx.theme.catalog.listVariables().map((entry) => ({
    name: entry.name,
    defaultValue: entry.defaultValue,
    value: entry.value ?? entry.defaultValue,
    category: entry.category,
  }))
}

export function nativeVariableMap(variables: NativeThemeVariable[]): Record<string, string> {
  return Object.fromEntries(variables.flatMap((entry) => {
    const value = entry.value ?? entry.defaultValue
    return value ? [[entry.name, value] as const] : []
  }))
}

export function resolveNativeThemeVariable(variables: NativeThemeVariable[], name: string): string | undefined {
  const entry = variables.find((candidate) => candidate.name === name)
  return entry?.value ?? entry?.defaultValue
}

export function findKnownThemeVariable(variables: NativeThemeVariable[], value: string): NativeThemeVariable | undefined {
  const normalized = value.replaceAll(' ', '').toLowerCase()
  return variables.find((entry) => entry.value?.replaceAll(' ', '').toLowerCase() === normalized)
}
