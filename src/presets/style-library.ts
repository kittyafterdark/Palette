import { COMMON_PART_PRESETS, type CommonPartPreset, type KnownPartRoleId } from './common-parts'

export type StyleLibraryArea = 'message' | 'prose' | 'avatar' | 'composer' | 'global'
export type StyleLibraryScale = 'small' | 'component' | 'layout' | 'pack'
export type MessageLayoutSupport = 'bubble' | 'minimal'
export type PackWorkbenchLayout = 'all' | MessageLayoutSupport
export type StyleLibraryItemKey = `recipe:${string}` | `pack:${string}`

export interface StyleLibraryRecipeMeta {
  preset: CommonPartPreset
  area: StyleLibraryArea
  family: string
  scale: StyleLibraryScale
  supports: MessageLayoutSupport[]
  keywords: string[]
}

export interface StyleLibraryAssetSlot {
  id: string
  label: string
  kind: 'image' | 'procedural'
  optional: boolean
  defaultLabel: string
  description: string
  /** Preferred semantic wrapper for authored decorative placement. */
  defaultAnchor?: KnownPartRoleId
  /** Plane assets use ::before/::after. Stencil assets replace the anchor's own visual contents. */
  placement?: 'plane' | 'plane-stencil' | 'stencil'
  /** Optional bundled SVG ornaments shown before project/current-theme assets. */
  builtInIds?: string[]
  /** Decorative pseudo-surface. Back maps to ::before; front maps to ::after. */
  defaultSurface?: 'before' | 'after'
  /** Optional curated placement used before a user moves/resizes the bound asset. */
  defaultCorner?: 'tl' | 'tr' | 'bl' | 'br'
  defaultX?: number
  defaultY?: number
  defaultSize?: number
}

export interface StyleLibraryPackSection {
  label: string
  presetIds: string[]
}

export interface StyleLibraryPack {
  id: string
  name: string
  description: string
  family: string
  areas: StyleLibraryArea[]
  supports: MessageLayoutSupport[]
  preview: 'manga' | 'editorial' | 'journal' | 'visual-novel'
  keywords: string[]
  sections: StyleLibraryPackSection[]
  applyAllPresetIds: string[]
  assetSlots: StyleLibraryAssetSlot[]
  /** Palette used when entering the pack workbench; users can refine it before applying. */
  defaultPalette: { accent: string; text: string; intensity: number }
}

const FAMILY_BY_PRESET: Record<string, string> = {
  'avatar-big-portrait': 'Portrait',
  'avatar-soft-fade': 'Portrait',
  'avatar-hero-left': 'Editorial',
  'avatar-hero-soft': 'Soft',
  'avatar-ghost-backdrop': 'Ghost',
  'avatar-halo': 'Glow',
  'name-display-serif': 'Editorial',
  'name-gradient': 'Gradient',
  'name-quiet-caps': 'Minimal',
  'message-readable-prose': 'Readable',
  'message-soft-surface': 'Soft',
  'message-wide-frame': 'Layout',
  'prose-headings-editorial': 'Editorial',
  'prose-headings-terminal': 'Terminal',
  'prose-headings-neon': 'Glow',
  'prose-headings-minimal': 'Minimal',
  'prose-paragraph-readable': 'Readable',
  'prose-code-glass': 'Glass',
  'prose-bold-accent': 'Accent',
  'prose-italic-whisper': 'Soft',
  'prose-editorial-suite': 'Editorial',
  'prose-neon-suite': 'Glow',
  'prose-terminal-suite': 'Terminal',
  'meta-tiny-caps': 'Minimal',
  'meta-soft-pill': 'Soft',
  'bubble-glass-card': 'Glass',
  'bubble-clean-outline': 'Outline',
  'actions-glass-pill': 'Glass',
  'actions-quiet-pill': 'Minimal',
  'input-glass-dock': 'Glass',
  'input-compact': 'Minimal',
  'input-jewel-send': 'Accent',
  'global-buttons-soft': 'Soft',
  'global-textareas-glass': 'Glass',
  'global-inputs-soft': 'Soft',
  'global-panels-outline': 'Outline',
  'manga-panel-portrait': 'Manga',
  'manga-media-panel': 'Manga',
  'manga-margin-speaker': 'Manga',
  'manga-ink-frame': 'Manga',
  'manga-minimal-ink-frame': 'Manga',
  'manga-chapter-set': 'Manga',
  'manga-caption-box': 'Manga',
  'manga-body-copy': 'Manga',
  'manga-sticker-portrait': 'Manga',
  'manga-minimal-sticker-portrait': 'Manga',
  'manga-composer': 'Manga',
  'manga-code-panel': 'Manga',
  'manga-greetings-tag': 'Manga',
  'manga-minimal-greetings-tag': 'Manga',
  'manga-swipe-strip': 'Manga',
  'manga-read-more': 'Manga',
  'manga-temper-mark': 'Manga',
  'manga-minimal-temper-mark': 'Manga',
  'manga-scroll-cue': 'Manga',
  'manga-cast-strip': 'Manga',
  'editorial-feature-lead': 'Editorial',
  'editorial-user-correspondent': 'Editorial',
  'editorial-actions-rail': 'Editorial',
  'editorial-column-rule': 'Editorial',
  'editorial-byline': 'Editorial',
  'editorial-minimal-byline': 'Editorial',
  'editorial-heading-set': 'Editorial',
  'editorial-media-plate': 'Editorial',
  'editorial-pull-quote': 'Editorial',
  'editorial-reading-column': 'Editorial',
  'editorial-author-portrait': 'Editorial',
  'editorial-minimal-author-portrait': 'Editorial',
  'editorial-composer': 'Editorial',
  'editorial-scroll-cue': 'Editorial',
  'editorial-cast-strip': 'Editorial',
  'minimal-actions-overlay': 'Minimal',
  'minimal-native-strip-off': 'Minimal',
  'message-greetings-editorial': 'Editorial',
  'minimal-greetings-editorial': 'Editorial',
  'message-swipes-compact': 'Minimal',
  'editorial-read-more': 'Editorial',
  'message-thinking-editorial': 'Editorial',
  'minimal-thinking-editorial': 'Editorial',
  'message-thinking-manga': 'Manga',
  'minimal-thinking-manga': 'Manga',
  'visual-novel-stage': 'Visual Novel',
  'visual-novel-attachment-mount': 'Visual Novel',
  'visual-novel-attachments': 'Visual Novel',
  'visual-novel-prose': 'Visual Novel',
  'visual-novel-minimal-prose': 'Visual Novel',
  'visual-novel-inner-voice': 'Visual Novel',
  'visual-novel-greetings': 'Visual Novel',
  'visual-novel-hud': 'Visual Novel',
  'visual-novel-user-choice': 'Visual Novel',
  'visual-novel-read-more': 'Visual Novel',
  'visual-novel-roster': 'Visual Novel',
  'visual-novel-composer': 'Visual Novel',
  'visual-novel-user-speaker': 'Visual Novel',
  'visual-novel-minimal-route-log': 'Visual Novel',
  'visual-novel-minimal-user-log': 'Visual Novel',
  'visual-novel-minimal-inner-voice': 'Visual Novel',
  'visual-novel-minimal-hud': 'Visual Novel',
  'journal-polaroid-note': 'Journal',
  'journal-entry-ledger': 'Journal',
  'journal-minimal-card': 'Journal',
  'journal-corner-sticker': 'Journal',
  'journal-minimal-corner-sticker': 'Journal',
  'journal-prose': 'Journal',
  'journal-photo-insert': 'Journal',
  'journal-quote-card': 'Journal',
  'journal-pasted-ephemera': 'Journal',
  'journal-thinking-note': 'Journal',
  'journal-minimal-thinking-note': 'Journal',
  'journal-greetings-ticket': 'Journal',
  'journal-minimal-greetings-ticket': 'Journal',
  'journal-page-pager': 'Journal',
  'journal-read-more': 'Journal',
  'journal-paper-actions': 'Journal',
  'journal-minimal-paper-actions': 'Journal',
  'journal-composer': 'Journal',
  'journal-scroll-stamp': 'Journal',
}

const BOTH_MANGA = new Set(['manga-media-panel', 'manga-chapter-set', 'manga-caption-box', 'manga-body-copy', 'manga-code-panel', 'manga-swipe-strip', 'manga-read-more', 'manga-scroll-cue'])
const BOTH_JOURNAL = new Set(['journal-prose', 'journal-photo-insert', 'journal-quote-card', 'journal-pasted-ephemera', 'journal-page-pager', 'journal-read-more', 'journal-composer', 'journal-scroll-stamp'])
const BOTH_EDITORIAL = new Set(['editorial-heading-set', 'editorial-media-plate', 'editorial-pull-quote', 'editorial-reading-column', 'editorial-composer', 'editorial-read-more', 'editorial-scroll-cue', 'editorial-cast-strip'])
const BOTH_MESSAGE_CHROME = new Set(['message-swipes-compact'])

function areaFor(preset: CommonPartPreset): StyleLibraryArea {
  if (preset.category === 'prose') return 'prose'
  if (preset.category === 'avatar' || preset.category === 'name' || preset.category === 'meta' || preset.category === 'bubble' || preset.category === 'actions' || preset.category === 'message') return preset.category === 'avatar' ? 'avatar' : 'message'
  if (preset.category === 'input') return 'composer'
  return 'global'
}

function scaleFor(preset: CommonPartPreset): StyleLibraryScale {
  if (preset.groups?.length) return 'layout'
  if (preset.id === 'manga-panel-portrait' || preset.id === 'manga-margin-speaker' || preset.id === 'editorial-feature-lead' || preset.id === 'editorial-column-rule' || preset.id === 'minimal-actions-overlay') return 'layout'
  if (preset.category === 'prose' && preset.section === 'Sets') return 'pack'
  if (preset.steps.length >= 5) return 'layout'
  if (preset.steps.length >= 2) return 'component'
  return 'small'
}

function supportsFor(preset: CommonPartPreset): MessageLayoutSupport[] {
  if (preset.id === 'manga-panel-portrait' || preset.id === 'manga-ink-frame' || preset.id === 'manga-sticker-portrait' || preset.id === 'manga-greetings-tag' || preset.id === 'message-thinking-manga' || preset.id === 'manga-temper-mark' || preset.id === 'editorial-byline' || preset.id === 'editorial-author-portrait' || preset.id === 'message-greetings-editorial' || preset.id === 'message-thinking-editorial' || preset.id === 'journal-corner-sticker' || preset.id === 'journal-thinking-note' || preset.id === 'journal-greetings-ticket' || preset.id === 'journal-paper-actions' || preset.id === 'editorial-feature-lead' || preset.id === 'editorial-actions-rail' || preset.id === 'journal-polaroid-note' || preset.id === 'journal-entry-ledger' || preset.id === 'visual-novel-stage' || preset.id === 'visual-novel-user-speaker' || preset.id === 'visual-novel-user-choice' || preset.id === 'visual-novel-inner-voice' || preset.id === 'visual-novel-greetings' || preset.id === 'visual-novel-hud' || preset.id === 'visual-novel-attachment-mount') return ['bubble']
  if (preset.id === 'manga-margin-speaker' || preset.id === 'manga-minimal-ink-frame' || preset.id === 'manga-minimal-sticker-portrait' || preset.id === 'manga-minimal-greetings-tag' || preset.id === 'minimal-thinking-manga' || preset.id === 'manga-minimal-temper-mark' || preset.id === 'editorial-minimal-byline' || preset.id === 'editorial-minimal-author-portrait' || preset.id === 'minimal-greetings-editorial' || preset.id === 'minimal-thinking-editorial' || preset.id === 'journal-minimal-corner-sticker' || preset.id === 'journal-minimal-thinking-note' || preset.id === 'journal-minimal-greetings-ticket' || preset.id === 'journal-minimal-paper-actions' || preset.id === 'editorial-column-rule' || preset.id === 'editorial-user-correspondent' || preset.id === 'journal-minimal-card' || preset.id === 'minimal-actions-overlay' || preset.id === 'minimal-native-strip-off' || preset.id === 'visual-novel-minimal-route-log' || preset.id === 'visual-novel-minimal-user-log' || preset.id === 'visual-novel-minimal-inner-voice' || preset.id === 'visual-novel-minimal-hud' || preset.id === 'visual-novel-minimal-prose') return ['minimal']
  if (preset.id === 'visual-novel-attachments' || preset.id === 'visual-novel-prose' || preset.id === 'visual-novel-read-more') return ['bubble', 'minimal']
  if (BOTH_MANGA.has(preset.id) || preset.id === 'manga-composer' || BOTH_EDITORIAL.has(preset.id) || BOTH_JOURNAL.has(preset.id) || BOTH_MESSAGE_CHROME.has(preset.id)) return ['bubble', 'minimal']
  // Existing message recipes were authored against BubbleMessage. MinimalMessage
  // gets explicit adapters rather than compatibility-by-optimism.
  if (['avatar', 'name', 'message', 'prose', 'meta', 'bubble', 'actions'].includes(preset.category)) return ['bubble']
  return ['bubble', 'minimal']
}

function keywordsFor(preset: CommonPartPreset): string[] {
  const words = `${preset.name} ${preset.description} ${preset.category} ${preset.section ?? ''} ${(preset.groups ?? []).map((group) => `${group.name} group ${group.memberRoles.join(' ')}`).join(' ')}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  return [...new Set(words)]
}

const HIDDEN_LIBRARY_PRESET_IDS = new Set(['journal-washi-photo'])

export const STYLE_LIBRARY_RECIPES: StyleLibraryRecipeMeta[] = COMMON_PART_PRESETS.filter((preset) => !HIDDEN_LIBRARY_PRESET_IDS.has(preset.id)).map((preset) => ({
  preset,
  area: areaFor(preset),
  family: FAMILY_BY_PRESET[preset.id] ?? 'Basic',
  scale: scaleFor(preset),
  supports: supportsFor(preset),
  keywords: keywordsFor(preset),
}))

export const STYLE_LIBRARY_PACKS: StyleLibraryPack[] = [
  {
    id: 'manga',
    name: 'Manga',
    description: 'Hard panels, cropped portraits, halftone details, printed headings, and a matching composer. Apply the whole set or steal only the pieces you want.',
    family: 'Manga',
    areas: ['message', 'prose', 'avatar', 'composer', 'global'],
    supports: ['bubble', 'minimal'],
    preview: 'manga',
    defaultPalette: { accent: '#ffffff', text: '#f4f1e9', intensity: 100 },
    keywords: ['manga', 'comic', 'panel', 'halftone', 'portrait', 'speaker', 'chapter', 'caption', 'black', 'white', 'monochrome', 'pager', 'composer', 'roster', 'cast strip', 'group chat'],
    applyAllPresetIds: ['manga-panel-portrait', 'manga-media-panel', 'manga-margin-speaker', 'minimal-native-strip-off', 'manga-chapter-set', 'manga-body-copy', 'manga-caption-box', 'manga-code-panel', 'manga-greetings-tag', 'manga-minimal-greetings-tag', 'manga-swipe-strip', 'manga-read-more', 'message-thinking-manga', 'minimal-thinking-manga', 'manga-temper-mark', 'manga-minimal-temper-mark', 'manga-scroll-cue', 'manga-cast-strip', 'manga-composer'],
    sections: [
      { label: 'Messages', presetIds: ['manga-panel-portrait', 'manga-media-panel', 'manga-margin-speaker', 'minimal-native-strip-off', 'manga-ink-frame', 'manga-minimal-ink-frame', 'manga-greetings-tag', 'manga-minimal-greetings-tag', 'manga-swipe-strip', 'manga-read-more', 'message-thinking-manga', 'minimal-thinking-manga', 'manga-temper-mark', 'manga-minimal-temper-mark', 'manga-scroll-cue'] },
      { label: 'Prose', presetIds: ['manga-chapter-set', 'manga-body-copy', 'manga-caption-box', 'manga-code-panel'] },
      { label: 'Avatar', presetIds: ['manga-sticker-portrait', 'manga-minimal-sticker-portrait'] },
      { label: 'Scene furniture', presetIds: ['manga-cast-strip'] },
      { label: 'Composer', presetIds: ['manga-composer'] },
    ],
    assetSlots: [
      { id: 'portrait', label: 'Portrait source', kind: 'image', optional: true, defaultLabel: 'Current character avatar', description: 'Portrait recipes use the mounted character image by default. Bind a native bundle image here when you want an alternate portrait/decorative layer, then anchor and drag it into place in the workbench.' },
      { id: 'screen', label: 'Halftone', kind: 'procedural', optional: true, defaultLabel: 'Built-in dots', description: 'Procedural dots keep the pack asset-free by default; imported or uploaded native bundle textures remain available from Resources when you want a custom source.' },
      { id: 'corner-art', label: 'Corner art', kind: 'image', optional: true, defaultLabel: 'None', description: 'Optional stickers, marks, or panel art. Bind a native image, anchor it to message anatomy, choose a back/front layer, then drag and size it without writing positioning CSS.', defaultAnchor: 'message.frame', defaultSurface: 'before' },
      { id: 'thinking-mark', label: 'Thought mark', kind: 'image', optional: true, defaultLabel: 'Built-in burst', description: 'The pack skins the native brain icon box with a tintable SVG/image stencil. Pick any PNG/SVG here to replace the built-in burst without changing the control layout.', defaultAnchor: 'message.thinking.icon', placement: 'stencil', builtInIds: ['impact-burst','four-spark','manga-anger'], defaultSize: 14 },
      { id: 'temper-ornament', label: 'Temper ornament', kind: 'image', optional: true, defaultLabel: 'Built-in temper mark', description: 'Tintable comic punctuation for a wrapper corner. Swap the default angry mark for a burst, sparkle, sweat drop, or any project/current-theme SVG.', defaultAnchor: 'message.frame', placement: 'plane-stencil', builtInIds: ['manga-anger','impact-burst','four-spark','sweat-drop'], defaultSurface: 'after', defaultCorner: 'tr', defaultX: -14, defaultY: 12, defaultSize: 34 },
    ],
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Split mastheads, cool paper rules, literary spacing, serif display type, ghosted portrait bleeds, and a writing-desk composer. Built to make the conversation read like a publication instead of a card stack.',
    family: 'Editorial',
    areas: ['message', 'prose', 'avatar', 'composer', 'global'],
    supports: ['bubble', 'minimal'],
    preview: 'editorial',
    defaultPalette: { accent: '#92a6b3', text: '#ece8df', intensity: 78 },
    keywords: ['editorial', 'magazine', 'journal', 'literary', 'publication', 'serif', 'byline', 'column', 'quote', 'feature', 'composer', 'writing desk', 'postage', 'contributors', 'roster'],
    applyAllPresetIds: ['editorial-feature-lead', 'editorial-actions-rail', 'minimal-actions-overlay', 'editorial-column-rule', 'minimal-native-strip-off', 'message-greetings-editorial', 'minimal-greetings-editorial', 'message-swipes-compact', 'editorial-read-more', 'message-thinking-editorial', 'minimal-thinking-editorial', 'editorial-media-plate', 'editorial-heading-set', 'editorial-pull-quote', 'editorial-reading-column', 'editorial-scroll-cue', 'editorial-cast-strip', 'editorial-composer', 'editorial-user-correspondent'],
    sections: [
      { label: 'Messages', presetIds: ['editorial-feature-lead', 'editorial-actions-rail', 'editorial-column-rule', 'editorial-user-correspondent', 'editorial-byline', 'editorial-minimal-byline', 'minimal-actions-overlay', 'minimal-native-strip-off', 'message-greetings-editorial', 'minimal-greetings-editorial', 'message-swipes-compact', 'editorial-read-more', 'message-thinking-editorial', 'minimal-thinking-editorial'] },
      { label: 'Prose', presetIds: ['editorial-media-plate', 'editorial-heading-set', 'editorial-pull-quote', 'editorial-reading-column'] },
      { label: 'Avatar', presetIds: ['editorial-author-portrait', 'editorial-minimal-author-portrait'] },
      { label: 'Publication furniture', presetIds: ['editorial-cast-strip', 'editorial-scroll-cue'] },
      { label: 'Composer', presetIds: ['editorial-composer'] },
    ],
    assetSlots: [
      { id: 'portrait', label: 'Author portrait', kind: 'image', optional: true, defaultLabel: 'Current character avatar', description: 'Feature and author-portrait recipes use the mounted character image by default. Bind a native bundle image for an alternate portrait/decorative layer and place it visually from the workbench.' },
      { id: 'masthead', label: 'Masthead mark', kind: 'image', optional: true, defaultLabel: 'None', description: 'Optional publication mark or monogram. Bind a native image, choose a back/front layer, and anchor it to the header/message anatomy; Editorial stays fully procedural when the slot is empty.', defaultAnchor: 'header.root', defaultSurface: 'after' },
      { id: 'thinking-mark', label: 'Thinking mark', kind: 'image', optional: true, defaultLabel: 'Built-in diamond', description: 'Editorial skins the native brain icon box with a restrained tintable stencil. Bind any project/current-theme SVG or image here to override it without creating extra pseudo chrome.', defaultAnchor: 'message.thinking.icon', placement: 'stencil', builtInIds: ['four-spark','tiny-flower'], defaultSize: 12 },
    ],
  },
  {
    id: 'visual-novel',
    name: 'Visual Novel',
    description: 'Two visual-novel grammars in one pack: Bubble plays the active cinematic scene; Minimal becomes a classic dialogue stage with centered character art, name/meta plates, translucent text frames, inner-voice plates, and authored route furniture.',
    family: 'Visual Novel',
    areas: ['message', 'prose', 'avatar', 'composer', 'global'],
    supports: ['bubble', 'minimal'],
    preview: 'visual-novel',
    defaultPalette: { accent: '#b88cff', text: '#f5f0fb', intensity: 88 },
    keywords: ['visual novel', 'vn', 'otome', 'dialogue', 'choice', 'speaker', 'scene', 'romance', 'hearts', 'hud', 'backdrop', 'scrim', 'composer', 'roster', 'member bar'],
    applyAllPresetIds: ['visual-novel-stage', 'visual-novel-attachment-mount', 'visual-novel-attachments', 'visual-novel-prose', 'visual-novel-inner-voice', 'visual-novel-greetings', 'visual-novel-hud', 'visual-novel-read-more', 'visual-novel-user-choice', 'visual-novel-minimal-route-log', 'visual-novel-minimal-user-log', 'visual-novel-minimal-prose', 'visual-novel-minimal-inner-voice', 'visual-novel-minimal-hud', 'visual-novel-roster', 'visual-novel-composer'],
    sections: [
      { label: 'Assistant scene', presetIds: ['visual-novel-stage', 'visual-novel-attachment-mount', 'visual-novel-inner-voice', 'visual-novel-greetings', 'visual-novel-hud'] },
      { label: 'Minimal VN dialogue stage', presetIds: ['visual-novel-minimal-route-log', 'visual-novel-minimal-user-log', 'visual-novel-minimal-prose', 'visual-novel-minimal-inner-voice', 'visual-novel-minimal-hud'] },
      { label: 'Shared route media', presetIds: ['visual-novel-attachments', 'visual-novel-read-more'] },
      { label: 'Prose', presetIds: ['visual-novel-prose', 'visual-novel-minimal-prose'] },
      { label: 'User role', presetIds: ['visual-novel-user-choice', 'visual-novel-user-speaker'] },
      { label: 'Scene furniture', presetIds: ['visual-novel-roster'] },
      { label: 'Composer', presetIds: ['visual-novel-composer'] },
    ],
    assetSlots: [
      { id: 'scene-art', label: 'Scene art', kind: 'image', optional: true, defaultLabel: 'Current character portrait', description: 'The assistant stage uses the mounted character portrait as the cinematic scene. Bind another project/current-theme image if you want an alternate scene layer.', defaultAnchor: 'assistant.avatar', defaultSurface: 'before' },
      { id: 'dialogue-jewel', label: 'Dialogue jewel', kind: 'image', optional: true, defaultLabel: 'Built-in heart jewel', description: 'Swap the little romance crest on the dialogue frame for another tintable ornament.', defaultAnchor: 'assistant.content.mount', placement: 'plane-stencil', builtInIds: ['vn-heart-jewel','four-spark','tiny-flower','scribble-heart'], defaultSurface: 'after', defaultCorner: 'tl', defaultX: 48, defaultY: -10, defaultSize: 26 },
      { id: 'thinking-mark', label: 'Inner voice mark', kind: 'image', optional: true, defaultLabel: 'Built-in sparkle', description: 'Replace the reasoning icon with a tintable VN mark while keeping the native thought control intact.', defaultAnchor: 'assistant.thinking.icon', placement: 'stencil', builtInIds: ['four-spark','vn-heart-jewel','scribble-heart'], defaultSize: 12 },
    ],
  },
  {
    id: 'journal',
    name: 'Journal',
    description: 'Conversation as assembled stationery: paper photo cards, washi tape, tiny stamps, clipped thoughts, soft ink prose, and a matching writing strip. Decorative by design, but mobile collapses back into a clean page instead of CSS Jenga.',
    family: 'Journal',
    areas: ['message', 'prose', 'avatar', 'composer'],
    supports: ['bubble', 'minimal'],
    preview: 'journal',
    defaultPalette: { accent: '#8db5b0', text: '#4b5553', intensity: 72 },
    keywords: ['journal', 'scrapbook', 'stationery', 'polaroid', 'washi', 'tape', 'sticker', 'paper', 'cute', 'ornament', 'diary', 'stamp'],
    applyAllPresetIds: ['journal-polaroid-note', 'journal-entry-ledger', 'journal-minimal-card', 'minimal-native-strip-off', 'journal-corner-sticker', 'journal-minimal-corner-sticker', 'journal-thinking-note', 'journal-minimal-thinking-note', 'journal-greetings-ticket', 'journal-minimal-greetings-ticket', 'journal-page-pager', 'journal-read-more', 'journal-paper-actions', 'journal-minimal-paper-actions', 'journal-scroll-stamp', 'journal-photo-insert', 'journal-prose', 'journal-quote-card', 'journal-pasted-ephemera', 'journal-composer'],
    sections: [
      { label: 'Messages', presetIds: ['journal-polaroid-note', 'journal-entry-ledger', 'journal-minimal-card', 'minimal-native-strip-off', 'journal-corner-sticker', 'journal-minimal-corner-sticker', 'journal-thinking-note', 'journal-minimal-thinking-note', 'journal-greetings-ticket', 'journal-minimal-greetings-ticket', 'journal-page-pager', 'journal-read-more', 'journal-paper-actions', 'journal-minimal-paper-actions', 'journal-pasted-ephemera'] },
      { label: 'Prose', presetIds: ['journal-photo-insert', 'journal-prose', 'journal-quote-card'] },
      { label: 'Furniture', presetIds: ['journal-scroll-stamp'] },
      { label: 'Composer', presetIds: ['journal-composer'] },
    ],
    assetSlots: [
      { id: 'photo-pin', label: 'Photo pin', kind: 'image', optional: true, defaultLabel: 'Built-in washi tape', description: 'Tintable ornament on the portrait front plane. Use the built-in tape/clip set or borrow any SVG/image from the active theme.', defaultAnchor: 'avatar.frame', placement: 'plane-stencil', builtInIds: ['washi-tape','paperclip','four-spark','tiny-flower'], defaultSurface: 'after', defaultCorner: 'tl', defaultX: 34, defaultY: -12, defaultSize: 72 },
      { id: 'page-sticker', label: 'Page sticker', kind: 'image', optional: true, defaultLabel: 'Built-in sparkle', description: 'Tiny corner punctuation for the page. Flowers, stamps, hearts, sparkles, or your own borrowed art all ride the same pseudo-plane primitive.', defaultAnchor: 'message.frame', placement: 'plane-stencil', builtInIds: ['four-spark','postage-star','tiny-flower','scribble-heart'], defaultSurface: 'after', defaultCorner: 'tr', defaultX: -16, defaultY: 14, defaultSize: 30 },
      { id: 'divider-ornament', label: 'Divider ornament', kind: 'image', optional: true, defaultLabel: 'None', description: 'Optional wide separator or tiny flourish for the reading plane.', defaultAnchor: 'message.content', placement: 'plane-stencil', builtInIds: ['star-divider','four-spark','tiny-flower'], defaultSurface: 'after', defaultCorner: 'bl', defaultX: 12, defaultY: -6, defaultSize: 96 },
      { id: 'ephemera-tape', label: 'Clipping tape', kind: 'image', optional: true, defaultLabel: 'Built-in washi tape', description: 'Swap the tape/sticker on pasted regex or custom HTML without changing the embedded markup itself.', defaultAnchor: 'message.html-island', placement: 'plane-stencil', builtInIds: ['washi-tape','paperclip','four-spark','tiny-flower'], defaultSurface: 'after', defaultCorner: 'tl', defaultX: 18, defaultY: -15, defaultSize: 92 },
      { id: 'thinking-mark', label: 'Thought mark', kind: 'image', optional: true, defaultLabel: 'Built-in sparkle', description: 'Skin the native reasoning icon box with a cute tintable mark instead of the stock brain.', defaultAnchor: 'message.thinking.icon', placement: 'stencil', builtInIds: ['four-spark','tiny-flower','scribble-heart'], defaultSize: 13 },
    ],
  },
]

export const STYLE_LIBRARY_AREAS: Array<{ id: 'all' | StyleLibraryArea; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'message', label: 'Messages' },
  { id: 'prose', label: 'Prose' },
  { id: 'avatar', label: 'Avatars' },
  { id: 'composer', label: 'Composer' },
  { id: 'global', label: 'Global UI' },
]

export function styleLibraryFamilies(): string[] {
  // Families classify individual recipe cards. Packs are first-class collections
  // and stay browseable independently instead of being swept into style filters.
  return [...new Set(STYLE_LIBRARY_RECIPES.map((entry) => entry.family))].sort((a, b) => a.localeCompare(b))
}

export function styleLibrarySearchText(entry: StyleLibraryRecipeMeta): string {
  return [entry.preset.name, entry.preset.description, entry.area, entry.family, entry.scale, ...entry.keywords, ...entry.supports].join(' ').toLowerCase()
}

export function styleLibraryPackSearchText(pack: StyleLibraryPack): string {
  return [pack.name, pack.description, pack.family, ...pack.areas, ...pack.supports, ...pack.keywords].join(' ').toLowerCase()
}

export function packPresetIds(pack: StyleLibraryPack): string[] { return pack.sections.flatMap((section) => section.presetIds) }
export function packDefaultPresetIds(pack: StyleLibraryPack): string[] { return pack.applyAllPresetIds }
export function packCompatiblePresetIds(pack: StyleLibraryPack, layout: PackWorkbenchLayout = 'all'): string[] {
  const ids = packPresetIds(pack)
  if (layout === 'all') return ids
  return ids.filter((id) => recipeMetaForId(id)?.supports.includes(layout) ?? true)
}
export function packDefaultPresetIdsForLayout(pack: StyleLibraryPack, layout: PackWorkbenchLayout = 'all'): string[] {
  const compatible = new Set(packCompatiblePresetIds(pack, layout))
  return packDefaultPresetIds(pack).filter((id) => compatible.has(id))
}
export function packForId(id: string): StyleLibraryPack | undefined { return STYLE_LIBRARY_PACKS.find((pack) => pack.id === id) }
export function recipeMetaForId(id: string): StyleLibraryRecipeMeta | undefined { return STYLE_LIBRARY_RECIPES.find((entry) => entry.preset.id === id) }
