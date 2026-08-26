/**
 * Message-layout anatomy discovered from Lumiverse's shipped native catalog.
 * This is deliberately boring data: recipes describe visual intent, while a
 * layout adapter resolves that intent against one of these structures.
 */
export type MessageLayoutId = 'bubble' | 'minimal'
export type MessageSemanticRole =
  | 'frame'
  | 'bubble'
  | 'header'
  | 'header-left'
  | 'avatar-frame'
  | 'avatar-image'
  | 'avatar-backdrop'
  | 'name'
  | 'meta-wrap'
  | 'meta-pill'
  | 'meta-number'
  | 'meta-timestamp'
  | 'meta-tokens'
  | 'content'
  | 'attachments'
  | 'attachment'
  | 'thinking'
  | 'greetings'
  | 'swipes'
  | 'long-message-toggle'
  | 'actions'

export interface MessageRoleCandidate {
  selector: string
  confidence: 'high' | 'medium'
  note?: string
}

export interface MessageLayoutAudit {
  id: MessageLayoutId
  component: 'BubbleMessage' | 'MinimalMessage'
  catalogClasses: string[]
  roles: Partial<Record<MessageSemanticRole, MessageRoleCandidate[]>>
  absentOrDifferent: string[]
}

export const MESSAGE_LAYOUT_AUDITS: Record<MessageLayoutId, MessageLayoutAudit> = {
  bubble: {
    id: 'bubble',
    component: 'BubbleMessage',
    catalogClasses: ['card', 'user', 'bubble', 'content', 'header', 'headerLeft', 'avatar', 'avatarBg', 'avatarBgImg', 'avatarBgScrim', 'name', 'nameUser', 'nameChar', 'metaWrap', 'metaPill', 'actionsPill'],
    roles: {
      frame: [{ selector: '[data-component="BubbleMessage"]', confidence: 'high' }],
      bubble: [{ selector: '[data-component="BubbleMessage"] [class*="_bubble_"]', confidence: 'high' }],
      header: [{ selector: '[data-component="BubbleMessage"] [class*="_header_"]:not([class*="_headerLeft_"])', confidence: 'high' }],
      'header-left': [{ selector: '[data-component="BubbleMessage"] [class*="_headerLeft_"]', confidence: 'high' }],
      'avatar-frame': [{ selector: '[data-component="BubbleMessage"] [class*="_avatar_"]', confidence: 'high' }],
      'avatar-image': [{ selector: '[data-component="BubbleMessage"] [class*="_avatar_"] img', confidence: 'high' }],
      'avatar-backdrop': [{ selector: '[data-component="BubbleMessage"] [class*="_avatarBgImg_"]', confidence: 'high' }],
      name: [{ selector: '[data-component="BubbleMessage"] [class*="_nameChar_"]', confidence: 'high' }, { selector: '[data-component="BubbleMessage"] [class*="_name_"]', confidence: 'medium' }],
      'meta-wrap': [{ selector: '[data-component="BubbleMessage"] [class*="_metaWrap_"]', confidence: 'high' }],
      'meta-pill': [{ selector: '[data-component="BubbleMessage"] [class*="_metaPill_"]', confidence: 'high' }],
      'meta-number': [{ selector: '[data-component="BubbleMessage"] [class*="_metaPill_"] > [class*="_metaSegment_"]:nth-child(1 of [class*="_metaSegment_"])', confidence: 'high', note: 'Order-derived mounted metadata segment: message number.' }],
      'meta-timestamp': [{ selector: '[data-component="BubbleMessage"] [class*="_metaPill_"] > [class*="_metaSegment_"]:nth-child(2 of [class*="_metaSegment_"])', confidence: 'high', note: 'Order-derived mounted metadata segment: timestamp.' }],
      'meta-tokens': [{ selector: '[data-component="BubbleMessage"] [class*="_metaPill_"] > [class*="_metaSegment_"]:nth-child(3 of [class*="_metaSegment_"])', confidence: 'high', note: 'Order-derived mounted metadata segment: token count.' }],
      content: [{ selector: '[data-component="BubbleMessage"] [data-component="MessageContent"]', confidence: 'high' }, { selector: '[data-component="BubbleMessage"] [class*="_content_"]', confidence: 'medium' }],
      attachments: [{ selector: '[data-component="BubbleMessage"] :is([class*="_attachments_"], [data-component="MessageAttachments"])', confidence: 'medium', note: 'Attachment surfaces do not currently expose a guaranteed public component id; Theme Studio recognizes the mounted attachment family when present.' }],
      attachment: [{ selector: '[data-component="BubbleMessage"] :is([class*="_attachment_"], [class*="_inlineImageBtn_"], [class*="_inlineImageWrap_"] )', confidence: 'medium', note: 'Mounted attachment item fallback; current inline-image mounts expose Inline Image Btn/Wrap classes but still no stable public component id.' }],
      thinking: [{ selector: '[data-component="BubbleMessage"] [class*="_container_"]:has(> button[data-reasoning-toggle="true"])', confidence: 'high', note: 'Current ReasoningBlock is identified by its stable reasoning toggle marker; it does not expose a dedicated data-component root.' }],
      greetings: [{ selector: '[data-component="BubbleMessage"] button[title="Browse alternate greetings"]', confidence: 'high', note: 'Mounted Lumiverse exposes the launcher as a titled button; the indicator class lives inside it and is not the interactive owner.' }, { selector: '[data-component="BubbleMessage"] button[class*="_indicator_"]', confidence: 'medium' }],
      swipes: [{ selector: '[data-component="BubbleMessage"] [data-component="SwipeControls"]', confidence: 'high' }],
      'long-message-toggle': [{ selector: '[data-component="BubbleMessage"] [data-component="MessageContent"] [class*="_longMessageTogglePill_"]', confidence: 'high', note: 'Added in current Lumiverse long-message truncation UI; the control is owned by MessageContent and may mount in either message renderer.' }],
      actions: [{ selector: '[data-component="BubbleMessage"] [data-component="BubbleActions"][class*="_pill_"]', confidence: 'high', note: 'Mounted BubbleActions exposes its own semantic component root; keep the historical actionsPill class as fallback.' }, { selector: '[data-component="BubbleMessage"] [class*="_actionsPill_"]', confidence: 'medium' }],
    },
    absentOrDifferent: [],
  },
  minimal: {
    id: 'minimal',
    component: 'MinimalMessage',
    // Runtime catalog roots are enriched from mounted CSS-module class names for stable part scopes.
    catalogClasses: ['card', 'character', 'user', 'avatar', 'avatarFallback', 'bubble', 'header', 'name', 'nameUser', 'nameChar', 'metaPill', 'metaSegment', 'metaDot', 'actionsWrap'],
    roles: {
      frame: [{ selector: '[data-component="MinimalMessage"]', confidence: 'high' }],
      bubble: [{ selector: '[data-component="MinimalMessage"] [class*="_bubble_"]', confidence: 'high' }],
      header: [{ selector: '[data-component="MinimalMessage"] [class*="_header_"]', confidence: 'high' }],
      'avatar-frame': [{ selector: '[data-component="MinimalMessage"] [class*="_avatar_"]', confidence: 'high' }],
      'avatar-image': [{ selector: '[data-component="MinimalMessage"] [class*="_avatar_"] img', confidence: 'medium', note: 'The catalog exposes the avatar wrapper; img is the expected replaced-element child and should be confirmed on a mounted message.' }],
      name: [{ selector: '[data-component="MinimalMessage"] [class*="_nameChar_"]', confidence: 'high' }, { selector: '[data-component="MinimalMessage"] [class*="_name_"]', confidence: 'medium' }],
      'meta-pill': [{ selector: '[data-component="MinimalMessage"] [class*="_metaPill_"]', confidence: 'high' }],
      'meta-number': [{ selector: '[data-component="MinimalMessage"] [class*="_metaPill_"] > [class*="_metaSegment_"]:nth-child(1 of [class*="_metaSegment_"])', confidence: 'high' }],
      'meta-timestamp': [{ selector: '[data-component="MinimalMessage"] [class*="_metaPill_"] > [class*="_metaSegment_"]:nth-child(2 of [class*="_metaSegment_"])', confidence: 'high' }],
      'meta-tokens': [{ selector: '[data-component="MinimalMessage"] [class*="_metaPill_"] > [class*="_metaSegment_"]:nth-child(3 of [class*="_metaSegment_"])', confidence: 'high' }],
      content: [{ selector: '[data-component="MinimalMessage"] [data-component="MessageContent"]', confidence: 'medium', note: 'MessageContent is shared elsewhere in Lumiverse; confirm its mounted nesting before composition adapters depend on it.' }],
      attachments: [{ selector: '[data-component="MinimalMessage"] :is([class*="_attachments_"], [data-component="MessageAttachments"])', confidence: 'medium' }],
      attachment: [{ selector: '[data-component="MinimalMessage"] :is([class*="_attachment_"], [class*="_inlineImageBtn_"], [class*="_inlineImageWrap_"] )', confidence: 'medium' }],
      thinking: [{ selector: '[data-component="MinimalMessage"] [class*="_container_"]:has(> button[data-reasoning-toggle="true"])', confidence: 'high', note: 'Current ReasoningBlock is identified by its stable reasoning toggle marker; it does not expose a dedicated data-component root.' }],
      greetings: [{ selector: '[data-component="MinimalMessage"] button[title="Browse alternate greetings"]', confidence: 'high', note: 'Mounted Lumiverse exposes the launcher as a titled button; the indicator class lives inside it and is not the interactive owner.' }, { selector: '[data-component="MinimalMessage"] button[class*="_indicator_"]', confidence: 'medium' }],
      swipes: [{ selector: '[data-component="MinimalMessage"] [data-component="SwipeControls"]', confidence: 'high' }],
      'long-message-toggle': [{ selector: '[data-component="MinimalMessage"] [data-component="MessageContent"] [class*="_longMessageTogglePill_"]', confidence: 'high', note: 'Mounted receipt confirms the new Read more control under MinimalMessage MessageContent.' }],
      actions: [{ selector: '[data-component="MinimalMessage"] [class*="_actionsWrap_"]', confidence: 'high' }],
    },
    absentOrDifferent: [
      'No headerLeft class in the native catalog.',
      'No metaWrap class; metadata appears to live directly in metaPill/metaSegment.',
      'No avatar backdrop class.',
      'Actions use actionsWrap rather than BubbleMessage actionsPill.',
      'Its composition should be adapted, not forced through BubbleMessage hero choreography.',
    ],
  },
}

export function mountedMessageRole(layout: MessageLayoutId, role: MessageSemanticRole): Element | null {
  if (typeof document === 'undefined') return null
  for (const candidate of MESSAGE_LAYOUT_AUDITS[layout].roles[role] ?? []) {
    try {
      const element = document.querySelector(candidate.selector)
      if (element) return element
    } catch { /* catalog audit selectors are best-effort */ }
  }
  return null
}
