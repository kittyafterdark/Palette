import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import type { ThemeStudioState } from './model'

interface StateLoadedMessage {
  type: 'theme_studio:state_loaded'
  requestId: string
  state: unknown
}

interface StateSavedMessage {
  type: 'theme_studio:state_saved'
  requestId: string
}

interface StateErrorMessage {
  type: 'theme_studio:state_error'
  requestId: string
  error: string
}

type BackendMessage = StateLoadedMessage | StateSavedMessage | StateErrorMessage

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isBackendMessage(value: unknown): value is BackendMessage {
  return isRecord(value)
    && typeof value.type === 'string'
    && value.type.startsWith('theme_studio:')
    && typeof value.requestId === 'string'
}

export class ProjectPersistence {
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private pendingState: ThemeStudioState | null = null
  private readonly pending = new Map<string, {
    resolve(value: unknown): void
    reject(error: Error): void
  }>()
  private readonly unsubscribe: () => void

  constructor(private readonly ctx: SpindleFrontendContext) {
    this.unsubscribe = ctx.onBackendMessage((payload) => {
      if (!isBackendMessage(payload)) return
      const request = this.pending.get(payload.requestId)
      if (!request) return
      this.pending.delete(payload.requestId)
      if (payload.type === 'theme_studio:state_error') request.reject(new Error(payload.error))
      else request.resolve(payload.type === 'theme_studio:state_loaded' ? payload.state : undefined)
    })
  }

  load(): Promise<unknown> {
    return this.request({ type: 'theme_studio:load_state' })
  }

  scheduleSave(state: ThemeStudioState): void {
    this.pendingState = structuredClone(state)
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.flush().catch((error) => console.error('[Theme Studio] Save failed', error))
    }, 350)
  }

  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    const state = this.pendingState
    if (!state) return
    this.pendingState = null
    await this.request({ type: 'theme_studio:save_state', state })
  }

  async destroy(): Promise<void> {
    try {
      await this.flush()
    } finally {
      this.unsubscribe()
      for (const request of this.pending.values()) request.reject(new Error('Theme Studio unloaded'))
      this.pending.clear()
    }
  }

  private request(payload: Record<string, unknown>): Promise<unknown> {
    const requestId = crypto.randomUUID()
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject })
      this.ctx.sendToBackend({ ...payload, requestId })
      setTimeout(() => {
        const pending = this.pending.get(requestId)
        if (!pending) return
        this.pending.delete(requestId)
        pending.reject(new Error('Theme Studio storage request timed out'))
      }, 10_000)
    })
  }
}
