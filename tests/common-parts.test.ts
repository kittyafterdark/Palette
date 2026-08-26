import { describe, expect, test } from 'bun:test'
import { COMMON_PART_CATEGORIES, COMMON_PART_PRESETS, KNOWN_PART_ROLES, applyTextInkPolicyForRole, presetRoles, targetForKnownRole, textInkModeForRole } from '../src/presets/common-parts'

describe('common-part quick style library', () => {
  test('each gallery category has reusable semantic recipes built from known roles', () => {
    for (const category of COMMON_PART_CATEGORIES) {
      const presets = COMMON_PART_PRESETS.filter((entry) => entry.category === category.id)
      expect(presets.length).toBeGreaterThanOrEqual(2)
      for (const preset of presets) {
        expect(preset.steps.length).toBeGreaterThan(0)
        for (const step of preset.steps) {
          const role = KNOWN_PART_ROLES[step.role]
          expect(role.component.length).toBeGreaterThan(0)
          if (role.source === 'dom-scoped') expect(role.selectors[0].selector).toMatch(/:where\(#root\)|\[data-component="(?:BubbleMessage|MinimalMessage|MessageContent)"\]/)
          else expect(role.selectors[0].selector).toContain(`[data-component="${role.component}"]`)
          expect(step.createPackets().length).toBeGreaterThan(0)
        }
        expect(presetRoles(preset).length).toBe(preset.steps.length)
      }
    }
  })

  test('the avatar fade recipe builds a real header hero from semantic roles', () => {
    const preset = COMMON_PART_PRESETS.find((entry) => entry.id === 'avatar-soft-fade')!
    expect(preset.steps.map((step) => step.role)).toEqual([
      'header.root', 'header.left', 'avatar.frame', 'avatar.image', 'meta.row', 'name.character', 'meta.pill',
    ])
    const headerPackets = preset.steps[0].createPackets()
    const framePackets = preset.steps[2].createPackets()
    const imagePackets = preset.steps[3].createPackets()
    const metaPackets = preset.steps[4].createPackets()
    expect(headerPackets.map((packet) => packet.type)).toEqual(['size'])
    expect(framePackets.map((packet) => packet.type)).toEqual(['position', 'size', 'corners'])
    expect(imagePackets.map((packet) => packet.type)).toEqual(['image'])
    expect(metaPackets.map((packet) => packet.type)).toEqual(['position', 'size', 'layout'])
    const framePosition = framePackets[0]
    expect(framePosition.type === 'position' && framePosition.anchorLabel).toBe('Header')
    const image = imagePackets[0]
    expect(image.type === 'image' && image.fade).toEqual({ direction: 'bottom', amount: 52 })
    expect(image.type === 'image' && image.fillFrame).toBe(true)
    expect(KNOWN_PART_ROLES['header.root'].selectors[0].selector).toContain('_header_')
    expect(KNOWN_PART_ROLES['avatar.frame'].selectors[0].selector).toBe('[data-component="BubbleMessage"] [class*="_avatar_"]')
    expect(KNOWN_PART_ROLES['avatar.image'].selectors[0].selector).toBe('[data-component="BubbleMessage"] [class*="_avatar_"] img')
    expect(preset.steps.some((step) => step.role === 'avatar.backdrop')).toBe(false)
  })

  test('MessageContent prose gallery covers individual roles plus whole hierarchy suites', () => {
    const prose = COMMON_PART_PRESETS.filter((entry) => entry.category === 'prose' && !['Manga', 'Editorial'].includes(entry.section ?? ''))
    const individual = prose.filter((entry) => !entry.id.includes('suite'))
    expect(individual.map((entry) => entry.steps[0].role)).toEqual([
      'message.h1', 'message.h2', 'message.h3', 'message.h4', 'message.paragraph', 'message.codeblock', 'message.bold', 'message.italic',
    ])
    const suites = prose.filter((entry) => entry.id.includes('suite'))
    expect(suites.map((entry) => entry.id)).toEqual(['prose-editorial-suite', 'prose-neon-suite', 'prose-terminal-suite'])
    for (const suite of suites) expect(new Set(suite.steps.map((step) => step.role))).toEqual(new Set(['message.h1', 'message.h2', 'message.h3', 'message.h4', 'message.paragraph', 'message.bold', 'message.italic', 'message.codeblock']))
    expect(KNOWN_PART_ROLES['message.h1'].selectors[0].selector).toContain('[data-component="MessageContent"] h1')
    expect(KNOWN_PART_ROLES['message.codeblock'].selectors[0].selector).toContain('_codeBlock_')
  })

  test('hero recipe family shares the same composition roles and exposes a backdrop variant', () => {
    const heroes = COMMON_PART_PRESETS.filter((entry) => ['avatar-soft-fade', 'avatar-hero-left', 'avatar-hero-soft'].includes(entry.id))
    expect(heroes).toHaveLength(3)
    for (const hero of heroes) expect(hero.steps.map((step) => step.role)).toEqual([
      'header.root', 'header.left', 'avatar.frame', 'avatar.image', 'meta.row', 'name.character', 'meta.pill',
    ])
    const backdrops = COMMON_PART_PRESETS.filter((entry) => ['avatar-ghost-backdrop', 'avatar-scene-backdrop'].includes(entry.id))
    expect(backdrops).toHaveLength(2)
    for (const preset of backdrops) expect(preset.steps.map((step) => step.role)).toEqual(['header.root', 'avatar.backdrop.frame', 'avatar.backdrop.image', 'avatar.backdrop.scrim'])
    const backdrop = backdrops.find((entry) => entry.id === 'avatar-ghost-backdrop')!
    const sceneBackdrop = backdrops.find((entry) => entry.id === 'avatar-scene-backdrop')!
    const sceneFrame = sceneBackdrop.steps.find((step) => step.role === 'avatar.backdrop.frame')!.createPackets()
    expect(sceneFrame.find((packet) => packet.type === 'image')).toMatchObject({ type: 'image', maskMode: 'none' })
    const sceneImage = sceneBackdrop.steps.find((step) => step.role === 'avatar.backdrop.image')!.createPackets()
    expect(sceneImage.find((packet) => packet.type === 'opacity')).toMatchObject({ type: 'opacity', value: 1 })
    expect(sceneImage.find((packet) => packet.type === 'image')).toMatchObject({ type: 'image', fillFrame: true, objectFit: 'cover', objectPositionX: 50, objectPositionY: 50 })
    expect(sceneImage.some((packet) => packet.type === 'size')).toBe(false)
    const backdropFrame = backdrop.steps.find((step) => step.role === 'avatar.backdrop.frame')!.createPackets()
    expect(backdropFrame.find((packet) => packet.type === 'layout')).toMatchObject({ type: 'layout', display: 'block' })
    expect(backdropFrame.find((packet) => packet.type === 'position')).toMatchObject({ type: 'position', mode: 'anchored', anchorLabel: 'Message frame', top: 0, right: 0, left: 0 })
    expect(backdropFrame.find((packet) => packet.type === 'size')).toMatchObject({ type: 'size', width: { mode: 'parent' }, height: { mode: 'fixed', value: 170, unit: 'px' } })
    const backdropImagePackets = backdrop.steps.find((step) => step.role === 'avatar.backdrop.image')!.createPackets()
    const backdropImage = backdropImagePackets.find((packet) => packet.type === 'image')
    expect(backdropImage).toMatchObject({ type: 'image', fillFrame: true, objectFit: 'cover', objectPositionX: 50, objectPositionY: 50 })
    expect(backdropImagePackets.some((packet) => packet.type === 'size')).toBe(false)
    const backdropScrim = backdrop.steps.find((step) => step.role === 'avatar.backdrop.scrim')!.createPackets()
    expect(backdropScrim.find((packet) => packet.type === 'background')?.type).toBe('background')
  })


  test('prose and avatar recipes expose useful browsing subsections', () => {
    const coreProse = COMMON_PART_PRESETS.filter((entry) => entry.category === 'prose' && !['Manga', 'Editorial'].includes(entry.section ?? ''))
    const proseSections = new Set(coreProse.map((entry) => entry.section))
    expect(proseSections).toEqual(new Set(['Sets', 'Headings', 'Body', 'Inline', 'Code']))
    const headingSystems = coreProse.filter((entry) => entry.section === 'Headings')
    expect(headingSystems).toHaveLength(4)
    for (const system of headingSystems) expect(system.steps.map((step) => step.role)).toEqual(['message.h1', 'message.h2', 'message.h3', 'message.h4'])
    const packProseSections = new Set(COMMON_PART_PRESETS.filter((entry) => entry.category === 'prose' && ['Manga', 'Editorial'].includes(entry.section ?? '')).map((entry) => entry.section))
    expect(packProseSections).toEqual(new Set(['Manga', 'Editorial']))
    const coreAvatar = COMMON_PART_PRESETS.filter((entry) => entry.category === 'avatar' && !['Manga', 'Editorial'].includes(entry.section ?? ''))
    const avatarSections = new Set(coreAvatar.map((entry) => entry.section))
    expect(avatarSections).toEqual(new Set(['Hero', 'Portrait', 'Frames', 'Backdrop']))
  })

  test('Meta gallery styles the visible meta pill rather than the layout wrap', () => {
    const meta = COMMON_PART_PRESETS.filter((entry) => entry.category === 'meta' && entry.section !== 'Journal')
    expect(meta.length).toBeGreaterThanOrEqual(2)
    for (const preset of meta) expect(preset.steps.map((step) => step.role)).toEqual(['meta.pill'])
    expect(KNOWN_PART_ROLES['meta.pill'].selectors[0].selector).toContain('_metaPill_')
  })

  test('persistent actions recipe describes the behavior it actually provides', () => {
    const preset = COMMON_PART_PRESETS.find((entry) => entry.id === 'actions-quiet-pill')!
    expect(preset.name).toBe('Persistent actions')
    expect(preset.description.toLowerCase()).toContain('visible')
  })

  test('whole-message and global roles stay semantically distinct and low-specificity', () => {
    expect(KNOWN_PART_ROLES['message.frame'].selectors[0].selector).toBe('[data-component="BubbleMessage"]')
    expect(KNOWN_PART_ROLES['bubble.root'].selectors[0].selector).toContain('_bubble_')
    const wide = COMMON_PART_PRESETS.find((entry) => entry.id === 'message-wide-frame')!
    expect(wide.steps[0].role).toBe('message.frame')
    for (const roleId of ['global.buttons', 'global.textareas', 'global.inputs', 'global.panels'] as const) {
      const target = targetForKnownRole(roleId)
      expect(target.source).toBe('dom-scoped')
      expect(target.overrideStrength).toBe('normal')
      expect(target.selector).toContain(':where(#root)')
    }
  })

  test('input shell can resolve same-node, semantic-root, or legacy descendant containers', () => {
    const selectors = KNOWN_PART_ROLES['input.shell'].selectors.map((entry) => entry.selector)
    expect(selectors).toEqual([
      '[data-component="InputArea"][class*="_container_"]',
      '[data-component="InputArea"]',
      '[data-component="InputArea"] [class*="_container_"]',
    ])
    const target = targetForKnownRole('input.shell')
    expect(target.overrideStrength).toBe('strong')
    expect(selectors).toContain(target.selector)
  })

  test('message chrome exposes Minimal dock, native strip, greetings and swipe pager as semantic surfaces', () => {
    expect(KNOWN_PART_ROLES['minimal.actions'].label).toBe('Minimal actions dock')
    expect(KNOWN_PART_ROLES['minimal.actions'].selectors[0].selector).toContain('_actionsWrap_')
    expect(KNOWN_PART_ROLES['minimal.decorative-rail'].selectors[0].selector).toBe('[data-component="MinimalMessage"]::before')
    expect(KNOWN_PART_ROLES['message.greetings'].selectors.map((entry) => entry.selector)).toEqual([
      '[data-component="BubbleMessage"] button[title="Browse alternate greetings"]',
      '[data-component="MinimalMessage"] button[title="Browse alternate greetings"]',
      '[data-component="BubbleMessage"] button[class*="_indicator_"]',
      '[data-component="MinimalMessage"] button[class*="_indicator_"]',
    ])
    expect(KNOWN_PART_ROLES['message.greetings'].source).toBe('dom-scoped')
    const greetingsTarget = targetForKnownRole('message.greetings')
    expect(greetingsTarget.nativeContextSelector).toBeUndefined()
    expect(greetingsTarget.selector).toContain('Browse alternate greetings')
    expect(KNOWN_PART_ROLES['message.greetings.content'].selectors[0].selector).toContain('Browse alternate greetings')
    expect(KNOWN_PART_ROLES['message.greetings.content'].selectors[0].selector).toContain('_indicator_')
    expect(KNOWN_PART_ROLES['message.swipes'].selectors[0].selector).toBe('[data-component="SwipeControls"]')
    expect(KNOWN_PART_ROLES['message.long-toggle'].selectors[0].selector).toBe('[data-component="MessageContent"] [class*="_longMessageTogglePill_"]')
    expect(KNOWN_PART_ROLES['message.long-toggle.label'].selectors[0].selector).toContain('_longMessageTogglePill_')
    expect(KNOWN_PART_ROLES['message.html-island'].selectors[0].selector).toBe('[data-component="MessageContent"] [class*="_htmlIsland_"]')
    expect(KNOWN_PART_ROLES['message.html-island'].source).toBe('dom-scoped')
    expect(KNOWN_PART_ROLES['message.html-island.back'].selectors[0].selector).toContain('_htmlIsland_"]::before')
    expect(KNOWN_PART_ROLES['message.html-island.ornament'].selectors[0].selector).toContain('_htmlIsland_"]::after')
    expect(targetForKnownRole('message.long-toggle').nativeContextSelector).toBe('[data-component="MessageContent"]')
    expect(KNOWN_PART_ROLES['message.thinking'].label).toBe('Thinking box')
    expect(KNOWN_PART_ROLES['message.thinking'].source).toBe('dom-scoped')
    expect(KNOWN_PART_ROLES['message.thinking'].selectors[0].selector).toContain('[class*="_container_"][class*="_bubble_"]')
    expect(KNOWN_PART_ROLES['message.thinking'].selectors[0].selector).toContain(':has(')
    expect(KNOWN_PART_ROLES['message.thinking.header'].selectors[0].selector).toContain('> [class*="_toggle_"]')
    expect(KNOWN_PART_ROLES['message.thinking.toggle'].selectors[0].selector).toContain('> [class*="_toggle_"] button')
    expect(KNOWN_PART_ROLES['message.thinking.icon'].selectors[0].selector).toContain('_brain_')
    expect(KNOWN_PART_ROLES['message.thinking.mark'].selectors[0].selector).toContain('::after')
    expect(KNOWN_PART_ROLES['name.user'].selectors[0].selector).toContain('_nameUser_')
    expect(KNOWN_PART_ROLES['minimal.name.user'].selectors[0].selector).toContain('_nameUser_')
    expect(KNOWN_PART_ROLES['minimal.content.rule'].selectors[0].selector).toContain('::before')
    expect(KNOWN_PART_ROLES['actions.pill'].selectors[0].selector).toContain('data-component="BubbleActions"')
    expect(KNOWN_PART_ROLES['input.action-unit'].selectors[0].selector).toContain('[data-composer-action][data-toolbar-action]')
    expect(KNOWN_PART_ROLES['input.action-unit.controls'].selectors[0].selector).toContain('[data-composer-action][data-toolbar-action]')
    expect(KNOWN_PART_ROLES['input.actionbar.controls'].selectors[0].selector).toContain('[data-composer-action][data-toolbar-action]')
    expect(KNOWN_PART_ROLES['input.extension-toolbar'].selectors.some((entry) => entry.selector.includes('_extensionToolbar_'))).toBe(true)
    expect(KNOWN_PART_ROLES['input.extension-toolbar'].selectors.some((entry) => entry.selector.includes('data-spindle-mount="chat_toolbar"'))).toBe(true)
    expect(KNOWN_PART_ROLES['input.field'].selectors[0].selector).toContain('_inputWrapper_')
    expect(KNOWN_PART_ROLES['input.attach'].selectors[0].selector).toContain('_attachBtn_')
    expect(KNOWN_PART_ROLES['input.attach'].selectors[0].selector).toContain(':not([class*="_sttBtn_"])')
    expect(KNOWN_PART_ROLES['input.send.controls'].selectors[0].selector).toContain('_sendBtnIcon_')
    expect(KNOWN_PART_ROLES['input.status.badges'].selectors[0].selector).toContain('[data-composer-action="persona"][data-toolbar-action="persona"]')
    expect(KNOWN_PART_ROLES['input.status.badges'].selectors[0].selector).toContain('[data-composer-action="guides"][data-toolbar-action="guides"]')
    expect(KNOWN_PART_ROLES['input.status.selected'].selectors[0].selector).toContain('_actionBtnHasSelection_')
    expect(KNOWN_PART_ROLES['input.popover'].selectors[0].selector).toContain('_popover_')
    expect(KNOWN_PART_ROLES['input.popover.rows'].selectors[0].selector).toContain('_popRowBtn_')
    expect(KNOWN_PART_ROLES['chat.scroll-bottom'].selectors[0].selector).toBe('[data-component="ChatView"] button[aria-label="Scroll to bottom"]')
    expect(KNOWN_PART_ROLES['message.thinking.content'].selectors[0].selector).toContain('_body_')
    expect(KNOWN_PART_ROLES['prose.bold'].selectors[0].selector).toContain('MessageContent')
    expect(KNOWN_PART_ROLES['prose.italic'].selectors[0].selector).toContain('MessageContent')
    const editorialThinking = COMMON_PART_PRESETS.find((entry) => entry.id === 'message-thinking-editorial')!
    expect(editorialThinking.steps.map((step) => step.role)).toEqual(['message.thinking', 'message.thinking.header', 'message.thinking.toggle', 'message.thinking.icon', 'message.thinking.content'])
    expect(editorialThinking.steps.find((step) => step.role === 'message.thinking.header')!.createPackets().map((packet) => packet.type)).toContain('corners')
    const mangaThinking = COMMON_PART_PRESETS.find((entry) => entry.id === 'message-thinking-manga')!
    expect(mangaThinking.steps.map((step) => step.role)).toEqual(['message.thinking', 'message.thinking.header', 'message.thinking.toggle', 'message.thinking.icon', 'message.thinking.content'])
    expect(mangaThinking.steps.find((step) => step.role === 'message.thinking.header')!.createPackets().map((packet) => packet.type)).toContain('border')
    const mangaGreetings = COMMON_PART_PRESETS.find((entry) => entry.id === 'manga-greetings-tag')!
    expect(mangaGreetings.steps.map((step) => step.role)).toEqual(['message.greetings', 'message.greetings.content'])
    const mangaReadMore = COMMON_PART_PRESETS.find((entry) => entry.id === 'manga-read-more')!
    expect(mangaReadMore.steps.map((step) => step.role)).toEqual(['message.long-toggle', 'message.long-toggle.label'])
    expect(mangaReadMore.steps[1].createPackets().find((packet) => packet.type === 'typography')?.type).toBe('typography')
    const editorialReadMore = COMMON_PART_PRESETS.find((entry) => entry.id === 'editorial-read-more')!
    expect(editorialReadMore.steps.map((step) => step.role)).toEqual(['message.long-toggle', 'message.long-toggle.label'])

    const mangaLead = COMMON_PART_PRESETS.find((entry) => entry.id === 'manga-panel-portrait')!
    expect(mangaLead.steps.some((step) => Boolean(step.createMobilePackets))).toBe(true)
    const mangaHeader = mangaLead.steps.find((step) => step.role === 'header.left')!
    const mangaHeaderSpacing = mangaHeader.createPackets().find((packet) => packet.type === 'spacing')
    expect(mangaHeaderSpacing?.type === 'spacing' && mangaHeaderSpacing.padding?.top).toBe(34)
    const mangaActions = mangaLead.steps.find((step) => step.role === 'actions.pill')!
    const mangaActionsPosition = mangaActions.createPackets().find((packet) => packet.type === 'position')
    expect(mangaActionsPosition?.type === 'position' && mangaActionsPosition.mode).toBe('anchored')
    expect(mangaActionsPosition?.type === 'position' && mangaActionsPosition.right).toBe(54)
    const mangaUserName = mangaLead.steps.find((step) => step.role === 'user.name')!
    const mangaUserTypography = mangaUserName.createPackets().find((packet) => packet.type === 'typography')
    const mangaUserMobileTypography = mangaUserName.createMobilePackets!().find((packet) => packet.type === 'typography')
    const mangaUserPosition = mangaUserName.createPackets().find((packet) => packet.type === 'position')
    expect(mangaUserTypography?.type === 'typography' && mangaUserTypography.fontSize).toBe(25)
    expect(mangaUserMobileTypography?.type === 'typography' && mangaUserMobileTypography.fontSize).toBe(19)
    expect(mangaUserPosition?.type === 'position' && mangaUserPosition.mode).toBe('anchored')
    expect(mangaUserPosition?.type === 'position' && mangaUserPosition.anchorSelector).toBe(KNOWN_PART_ROLES['user.header'].selectors[0].selector)
    expect(mangaUserPosition?.type === 'position' && mangaUserPosition.nudgeX).toBe(-2)
    expect(mangaUserPosition?.type === 'position' && mangaUserPosition.nudgeY).toBe(-36)
    const mangaUserFrameMobile = mangaLead.steps.find((step) => step.role === 'user.frame')!.createMobilePackets!().find((packet) => packet.type === 'size')
    const mangaUserBubbleMobile = mangaLead.steps.find((step) => step.role === 'user.bubble')!.createMobilePackets!().find((packet) => packet.type === 'size')
    const mangaUserHeaderMobile = mangaLead.steps.find((step) => step.role === 'user.header')!.createMobilePackets!().find((packet) => packet.type === 'size')
    const mangaUserHeaderLeftMobile = mangaLead.steps.find((step) => step.role === 'user.header.left')!.createMobilePackets!().find((packet) => packet.type === 'size')
    const mangaUserAvatarMobile = mangaLead.steps.find((step) => step.role === 'user.avatar')!.createMobilePackets!().find((packet) => packet.type === 'size')
    for (const size of [mangaUserFrameMobile, mangaUserBubbleMobile, mangaUserHeaderMobile, mangaUserHeaderLeftMobile, mangaUserAvatarMobile]) {
      expect(size?.type === 'size' && size.width?.mode).toBe('parent')
      expect(size?.type === 'size' && size.maxWidth?.mode).toBe('parent')
    }
    const mangaActionsMobile = mangaActions.createMobilePackets!()
    const mangaActionsMobilePosition = mangaActionsMobile.find((packet) => packet.type === 'position')
    const mangaActionsMobileSize = mangaActionsMobile.find((packet) => packet.type === 'size')
    expect(mangaActionsMobilePosition?.type === 'position' && mangaActionsMobilePosition.anchorSelector).toBe(KNOWN_PART_ROLES['header.root'].selectors[0].selector)
    expect(mangaActionsMobilePosition?.type === 'position' && mangaActionsMobilePosition.bottom).toBe(8)
    expect(mangaActionsMobilePosition?.type === 'position' && mangaActionsMobilePosition.right).toBe(8)
    expect(mangaActionsMobileSize?.type === 'size' && mangaActionsMobileSize.height?.mode === 'fixed' && mangaActionsMobileSize.height.value).toBe(20)
    const mangaSwipeSafe = mangaLead.steps.find((step) => step.role === 'assistant.actions.pill.swipe-safe')!
    const mangaSwipeSafePosition = mangaSwipeSafe.createMobilePackets!().find((packet) => packet.type === 'position')
    expect(mangaSwipeSafePosition?.type === 'position' && mangaSwipeSafePosition.right).toBe(140)
    expect(mangaSwipeSafePosition?.type === 'position' && mangaSwipeSafePosition.bottom).toBe(8)
    expect(mangaLead.steps.map((step) => step.role)).toContain('avatar.backdrop')
    const mangaBackdrop = mangaLead.steps.find((step) => step.role === 'avatar.backdrop')!.createPackets()
    expect(mangaBackdrop.map((packet) => packet.type)).toEqual(['image', 'opacity'])
    const editorialLead = COMMON_PART_PRESETS.find((entry) => entry.id === 'editorial-feature-lead')!
    expect(editorialLead.steps.some((step) => Boolean(step.createMobilePackets))).toBe(true)
    expect(editorialLead.name).toBe('Split masthead')
    expect(editorialLead.steps.map((step) => step.role)).toContain('avatar.backdrop')
    expect(editorialLead.steps.map((step) => step.role)).toContain('meta.row')
    expect(editorialLead.steps.map((step) => step.role)).toContain('message.content.rule')
    const editorialHeader = editorialLead.steps.find((step) => step.role === 'header.left')!
    const baseLayout = editorialHeader.createPackets().find((packet) => packet.type === 'layout')
    const mobileLayout = editorialHeader.createMobilePackets!().find((packet) => packet.type === 'layout')
    expect(baseLayout?.type === 'layout' && baseLayout.direction).toBe('row')
    expect(mobileLayout?.type === 'layout' && mobileLayout.direction).toBe('column')
    const editorialActions = COMMON_PART_PRESETS.find((entry) => entry.id === 'editorial-actions-rail')!
    expect(editorialActions.steps[0].role).toBe('actions.pill')
    const editorialActionsLayout = editorialActions.steps[0].createPackets().find((packet) => packet.type === 'layout')
    const editorialActionsMobileLayout = editorialActions.steps[0].createMobilePackets!().find((packet) => packet.type === 'layout')
    expect(editorialActionsLayout?.type === 'layout' && editorialActionsLayout.direction).toBe('column')
    expect(editorialActionsMobileLayout?.type === 'layout' && editorialActionsMobileLayout.direction).toBe('row')
    const mangaBody = COMMON_PART_PRESETS.find((entry) => entry.id === 'manga-body-copy')!
    expect(mangaBody.steps.map((step) => step.role)).toEqual(['prose.paragraph', 'prose.bold', 'prose.italic'])

    const overlay = COMMON_PART_PRESETS.find((entry) => entry.id === 'minimal-actions-overlay')!
    const position = overlay.steps[0].createPackets()[0]
    expect(position.type === 'position' && position.mode).toBe('anchored')
    expect(position.type === 'position' && position.anchorLabel).toBe('Minimal message frame')

    const journalEphemera = COMMON_PART_PRESETS.find((entry) => entry.id === 'journal-pasted-ephemera')!
    expect(journalEphemera.steps.map((step) => step.role)).toEqual(['message.html-island', 'message.html-island.back', 'message.html-island.ornament'])
    const ephemeraOpacity = journalEphemera.steps[0].createPackets().find((packet) => packet.type === 'opacity')
    expect(ephemeraOpacity?.type === 'opacity' && ephemeraOpacity.value).toBe(1)
    const ephemeraBackPosition = journalEphemera.steps[1].createPackets().find((packet) => packet.type === 'position')
    expect(ephemeraBackPosition?.type === 'position' && ephemeraBackPosition.zIndex).toBe(-1)
    const ephemeraTapePosition = journalEphemera.steps[2].createPackets().find((packet) => packet.type === 'position')
    expect(ephemeraTapePosition?.type === 'position' && ephemeraTapePosition.top).toBe(-15)

    const mangaMinimal = COMMON_PART_PRESETS.find((entry) => entry.id === 'manga-margin-speaker')!
    expect(mangaMinimal.name).toBe('Portrait rail')
    expect(mangaMinimal.steps.map((step) => step.role)).toContain('minimal.content.rule')
    expect(mangaMinimal.steps.map((step) => step.role)).toContain('minimal.name.user')
    const mangaMinimalAvatar = mangaMinimal.steps.find((step) => step.role === 'minimal.avatar.frame')!
    const mangaMinimalPosition = mangaMinimalAvatar.createPackets().find((packet) => packet.type === 'position')
    const mangaMinimalMobilePosition = mangaMinimalAvatar.createMobilePackets!().find((packet) => packet.type === 'position')
    expect(mangaMinimalPosition?.type === 'position' && mangaMinimalPosition.mode).toBe('anchored')
    expect(mangaMinimalMobilePosition?.type === 'position' && mangaMinimalMobilePosition.mode).toBe('nudge')

    const editorialMinimal = COMMON_PART_PRESETS.find((entry) => entry.id === 'editorial-column-rule')!
    expect(editorialMinimal.name).toBe('Author rail')
    expect(editorialMinimal.steps.map((step) => step.role)).toContain('minimal.content.rule')
    expect(editorialMinimal.steps.map((step) => step.role)).toContain('minimal.name.user')

    expect(KNOWN_PART_ROLES['meta.segment.number'].selectors[0].selector).toContain(':nth-child(1 of [class*="_metaSegment_"])')
    expect(KNOWN_PART_ROLES['meta.segment.timestamp'].selectors[0].selector).toContain(':nth-child(2 of [class*="_metaSegment_"])')
    expect(KNOWN_PART_ROLES['meta.segment.tokens'].selectors[0].selector).toContain(':nth-child(3 of [class*="_metaSegment_"])')
    expect(KNOWN_PART_ROLES['meta.label.number'].selectors[0].selector).toContain('::before')

    const journalLedger = COMMON_PART_PRESETS.find((entry) => entry.id === 'journal-entry-ledger')!
    expect(journalLedger.steps.map((step) => step.role)).toEqual(['meta.pill', 'meta.segment.number', 'meta.segment.timestamp', 'meta.segment.tokens', 'meta.segment.dots', 'meta.label.number', 'meta.label.timestamp', 'meta.label.tokens'])
    const ledgerPackets = journalLedger.steps.find((step) => step.role === 'meta.pill')!.createPackets()
    const ledgerGrid = ledgerPackets.find((packet) => packet.type === 'layout')
    expect(ledgerGrid).toMatchObject({ type: 'layout', display: 'grid', gridColumns: { mode: 'count', count: 3 } })
    const ledgerSize = ledgerPackets.find((packet) => packet.type === 'size')
    expect(ledgerSize).toMatchObject({ type: 'size', width: { mode: 'parent' } })
    expect(ledgerPackets.some((packet) => packet.type === 'position')).toBe(false)
    const ledgerSegment = journalLedger.steps.find((step) => step.role === 'meta.segment.timestamp')!.createPackets()
    expect(ledgerSegment.find((packet) => packet.type === 'border')).toMatchObject({ type: 'border', width: 0 })
    expect(ledgerSegment.find((packet) => packet.type === 'text')).toMatchObject({ type: 'text', solid: { color: '#3d4946', alpha: .96 } })
    const ledgerLabels = ['meta.label.number', 'meta.label.timestamp', 'meta.label.tokens'] as const
    expect(ledgerLabels.map((role) => {
      const packet = journalLedger.steps.find((step) => step.role === role)!.createPackets().find((entry) => entry.type === 'content')
      return packet?.type === 'content' ? packet.value : ''
    })).toEqual(['ENTRY', 'FILED', 'LENGTH'])
    for (const role of ledgerLabels) {
      const pos = journalLedger.steps.find((step) => step.role === role)!.createPackets().find((entry) => entry.type === 'position')
      expect(pos?.type === 'position' && pos.mode).toBe('anchored')
      expect(pos?.type === 'position' && pos.anchorSelector).toBeUndefined()
    }

    const journalThinking = COMMON_PART_PRESETS.find((entry) => entry.id === 'journal-thinking-note')!
    expect(journalThinking.name).toBe('Private note')
    const thinkingCaption = journalThinking.steps.find((step) => step.role === 'message.thinking.caption')!
    const thinkingContent = thinkingCaption.createPackets().find((entry) => entry.type === 'content')
    expect(thinkingContent?.type === 'content' && thinkingContent.value).toBe('PRIVATE NOTE')
    const thinkingCaptionPosition = thinkingCaption.createPackets().find((entry) => entry.type === 'position')
    expect(thinkingCaptionPosition?.type === 'position' && thinkingCaptionPosition.anchorSelector).toBeUndefined()
    const thinkingShell = journalThinking.steps.find((step) => step.role === 'message.thinking')!.createPackets()
    expect(thinkingShell.find((entry) => entry.type === 'size')).toMatchObject({ type: 'size', width: { mode: 'fixed', value: 272, unit: 'px' } })
    const thinkingToggle = journalThinking.steps.find((step) => step.role === 'message.thinking.toggle')!.createPackets()
    expect(thinkingToggle.find((entry) => entry.type === 'text')).toMatchObject({ type: 'text', solid: { color: '#394542', alpha: 1 } })
    expect(thinkingToggle.find((entry) => entry.type === 'opacity')).toMatchObject({ type: 'opacity', value: 1 })
    expect(journalThinking.steps.find((step) => step.role === 'message.thinking.content')!.createPackets().some((entry) => entry.type === 'pattern')).toBe(true)

    const journalBubble = COMMON_PART_PRESETS.find((entry) => entry.id === 'journal-polaroid-note')!
    const journalFrame = journalBubble.steps.find((step) => step.role === 'message.frame')!
    expect(journalFrame.tuneText).toBe(false)
    const journalInk = journalFrame.createPackets().find((packet) => packet.type === 'text')
    expect(journalInk?.type === 'text' && journalInk.solid.color).toBe('#46504e')
    const journalBackdrop = journalBubble.steps.find((step) => step.role === 'avatar.backdrop.stack')!.createPackets()[0]
    expect(journalBackdrop.type === 'visibility' && journalBackdrop.mode).toBe('gone')
    expect(KNOWN_PART_ROLES['avatar.backdrop.stack'].selectors[0].selector).toContain('[class*="_avatarBg_"] img')
    const journalMetaRow = journalBubble.steps.find((step) => step.role === 'meta.row')!.createPackets()
    expect(journalMetaRow.find((packet) => packet.type === 'size')).toMatchObject({ type: 'size', width: { mode: 'fixed', value: 420, unit: 'px' } })
    const journalHeaderSpacing = journalBubble.steps.find((step) => step.role === 'header.root')!.createPackets().find((packet) => packet.type === 'spacing')
    expect(journalHeaderSpacing).toMatchObject({ type: 'spacing', padding: { bottom: 22 } })
    const journalFramePackets = journalFrame.createPackets()
    expect(journalFramePackets.find((packet) => packet.type === 'background')?.type).toBe('background')
    expect(journalFramePackets.some((packet) => packet.type === 'pattern')).toBe(true)
    expect(journalFramePackets.some((packet) => packet.type === 'shadow')).toBe(true)
    expect(journalBubble.steps.map((step) => step.role)).toContain('header.root')
    expect(journalBubble.steps.map((step) => step.role)).toContain('message.content.rule')
    expect(journalBubble.steps.map((step) => step.role)).toContain('message.content.ornament')
    expect(KNOWN_PART_ROLES['header.ornament'].selectors[0].selector).toContain('::after')
    const journalAvatar = journalBubble.steps.find((step) => step.role === 'avatar.frame')!
    const journalAvatarTransform = journalAvatar.createPackets().find((packet) => packet.type === 'transform')
    const journalAvatarMobileTransform = journalAvatar.createMobilePackets!().find((packet) => packet.type === 'transform')
    expect(journalAvatarTransform?.type === 'transform' && journalAvatarTransform.rotate).toBe(-3)
    expect(journalAvatarMobileTransform?.type === 'transform' && journalAvatarMobileTransform.rotate).toBe(-1)
    const journalMinimal = COMMON_PART_PRESETS.find((entry) => entry.id === 'journal-minimal-card')!
    expect(journalMinimal.steps.find((step) => step.role === 'minimal.frame')?.tuneText).toBe(false)
    expect(journalMinimal.steps.map((step) => step.role)).toContain('minimal.content.rule')
    expect(journalMinimal.steps.map((step) => step.role)).toContain('minimal.content.ornament')
    expect(KNOWN_PART_ROLES['minimal.header.ornament'].selectors[0].selector).toContain('::after')
    const journalMinimalAvatar = journalMinimal.steps.find((step) => step.role === 'minimal.avatar.frame')!
    const journalMinimalTransform = journalMinimalAvatar.createPackets().find((packet) => packet.type === 'transform')
    const journalMinimalMobileTransform = journalMinimalAvatar.createMobilePackets!().find((packet) => packet.type === 'transform')
    expect(journalMinimalTransform?.type === 'transform' && journalMinimalTransform.rotate).toBe(2)
    expect(journalMinimalMobileTransform?.type === 'transform' && journalMinimalMobileTransform.rotate).toBe(0)
    expect(journalBubble.steps.map((step) => step.role)).toContain('header.ornament')
    expect(journalBubble.steps.find((step) => step.role === 'header.ornament')!.createPackets().find((packet) => packet.type === 'transform')).toMatchObject({ type: 'transform', rotate: -7 })
    expect(journalMinimal.steps.map((step) => step.role)).toContain('minimal.header.ornament')
    const washiLegacy = COMMON_PART_PRESETS.find((entry) => entry.id === 'journal-washi-photo')!
    expect(washiLegacy.section).toBe('Legacy')
    const journalActions = COMMON_PART_PRESETS.find((entry) => entry.id === 'journal-paper-actions')!
    expect(journalActions.steps.map((step) => step.role)).toEqual(['actions.pill', 'actions.controls', 'minimal.actions', 'minimal.actions.controls'])
    expect(journalActions.steps.every((step) => step.tuneText === false)).toBe(true)
    const journalActionsStep = journalActions.steps.find((step) => step.role === 'actions.pill')!
    const journalActionsPosition = journalActionsStep.createPackets().find((packet) => packet.type === 'position')
    const journalActionsMobilePosition = journalActionsStep.createMobilePackets!().find((packet) => packet.type === 'position')
    expect(journalActionsPosition?.type === 'position' && journalActionsPosition.mode).toBe('nudge')
    expect(journalActionsPosition?.type === 'position' && journalActionsPosition.nudgeX).toBe(-12)
    expect(journalActionsPosition?.type === 'position' && journalActionsPosition.nudgeY).toBe(138)
    expect(journalActionsPosition?.type === 'position' && journalActionsPosition.anchorSelector).toBeUndefined()
    expect(journalActionsMobilePosition?.type === 'position' && journalActionsMobilePosition.mode).toBe('nudge')
    expect(journalActionsMobilePosition?.type === 'position' && journalActionsMobilePosition.nudgeX).toBe(0)
    expect(journalActionsMobilePosition?.type === 'position' && journalActionsMobilePosition.nudgeY).toBe(0)
    const journalScroll = COMMON_PART_PRESETS.find((entry) => entry.id === 'journal-scroll-stamp')!
    expect(journalScroll.steps[0].role).toBe('chat.scroll-bottom')
    expect(journalScroll.steps[0].createPackets().map((packet) => packet.type)).toEqual(['background', 'border', 'corners', 'text', 'shadow', 'size', 'transform'])
    const journalPager = COMMON_PART_PRESETS.find((entry) => entry.id === 'journal-page-pager')!
    expect(journalPager.steps[0].role).toBe('message.swipes')
    expect(journalPager.steps[0].tuneText).toBe(false)
    const pagerInk = journalPager.steps[0].createPackets().find((packet) => packet.type === 'text')
    expect(pagerInk?.type === 'text' && pagerInk.solid.color).toBe('#46504e')
    expect(KNOWN_PART_ROLES['actions.controls'].selectors[0].selector).toContain('[data-component="BubbleActions"] :is(button, svg)')
    expect(KNOWN_PART_ROLES['minimal.actions.controls'].selectors[0].selector).toContain(':is(button, svg)')
    const journalComposer = COMMON_PART_PRESETS.find((entry) => entry.id === 'journal-composer')!
    expect(journalComposer.steps.map((step) => step.role)).toContain('input.placeholder')
    expect(journalComposer.steps.map((step) => step.role)).toContain('input.actionbar.controls')
    expect(journalComposer.steps.map((step) => step.role)).toContain('input.extension-toolbar')
    expect(journalComposer.steps.map((step) => step.role)).toContain('input.extension-toolbar.controls')
    const placeholderInk = journalComposer.steps.find((step) => step.role === 'input.placeholder')!.createPackets().find((packet) => packet.type === 'text')
    expect(placeholderInk?.type === 'text' && placeholderInk.solid.color).toBe('#566460')
    const placeholderOpacity = journalComposer.steps.find((step) => step.role === 'input.placeholder')!.createPackets().find((packet) => packet.type === 'opacity')
    expect(placeholderOpacity?.type === 'opacity' && placeholderOpacity.value).toBe(1)

    for (const presetId of ['manga-composer', 'editorial-composer', 'journal-composer', 'visual-novel-composer']) {
      const composer = COMMON_PART_PRESETS.find((entry) => entry.id === presetId)!
      const roles = composer.steps.map((step) => step.role)
      expect(roles).toContain('input.status.badges')
      expect(roles).toContain('input.status.selected')
      expect(roles).toContain('input.popover')
      expect(roles).toContain('input.popover.rows')
      expect(roles).toContain('input.popover.rows.hover')
      const badgeVisibility = composer.steps.find((step) => step.role === 'input.status.badges')!.createPackets().find((packet) => packet.type === 'visibility')
      expect(badgeVisibility?.type === 'visibility' && badgeVisibility.mode).toBe('gone')
    }
    const editorialComposer = COMMON_PART_PRESETS.find((entry) => entry.id === 'editorial-composer')!
    const editorialActionInk = editorialComposer.steps.find((step) => step.role === 'input.actionbar.controls')!.createPackets().find((packet) => packet.type === 'text')
    expect(editorialActionInk?.type === 'text' && editorialActionInk.solid.color).toBe('#2f383c')
    expect(editorialActionInk?.type === 'text' && editorialActionInk.solid.alpha).toBeGreaterThanOrEqual(.9)
    const editorialToolbarOpacity = editorialComposer.steps.find((step) => step.role === 'input.actionbar')!.createPackets().find((packet) => packet.type === 'opacity')
    expect(editorialToolbarOpacity?.type === 'opacity' && editorialToolbarOpacity.value).toBe(1)
    for (const presetId of ['manga-composer', 'editorial-composer', 'journal-composer']) {
      const composer = COMMON_PART_PRESETS.find((entry) => entry.id === presetId)!
      expect(composer.steps.map((step) => step.role)).toContain('input.attach')
      expect(composer.steps.map((step) => step.role)).toContain('input.send.controls')
      expect(composer.steps.find((step) => step.role === 'input.textarea')?.tuneText).toBe(false)
      expect(composer.steps.find((step) => step.role === 'input.placeholder')?.tuneText).toBe(false)
      expect(composer.steps.find((step) => step.role === 'input.send')?.tuneText).toBe(false)
    }
    const composerFamilies = new Map([
      ['manga-composer', 'manga'],
      ['editorial-composer', 'editorial'],
      ['journal-composer', 'journal'],
      ['visual-novel-composer', 'visual-novel'],
    ] as const)
    for (const [presetId, family] of composerFamilies) {
      const composer = COMMON_PART_PRESETS.find((entry) => entry.id === presetId)!
      const icons = composer.steps.find((step) => step.role === 'input.actionbar')!.createPackets().find((packet) => packet.type === 'composer-icons')
      expect(icons?.type === 'composer-icons' && icons.family).toBe(family)
    }
    const mangaComposer = COMMON_PART_PRESETS.find((entry) => entry.id === 'manga-composer')!
    const mangaSendInk = mangaComposer.steps.find((step) => step.role === 'input.send.controls')!.createPackets().find((packet) => packet.type === 'text')
    expect(mangaSendInk?.type === 'text' && mangaSendInk.solid.color).toBe('#050506')

    const vnStage = COMMON_PART_PRESETS.find((entry) => entry.id === 'visual-novel-stage')!
    const vnGreetings = COMMON_PART_PRESETS.find((entry) => entry.id === 'visual-novel-greetings')!
    expect(vnGreetings.steps.map((step) => step.role)).toEqual(['message.greetings', 'message.greetings.content'])
    const vnGreetingBasePackets = vnGreetings.steps[0].createPackets()
    const vnGreetingBasePosition = vnGreetingBasePackets.find((packet) => packet.type === 'position')
    const vnGreetingBaseSpacing = vnGreetingBasePackets.find((packet) => packet.type === 'spacing')
    expect(vnGreetingBasePosition).toMatchObject({ type: 'position', mode: 'anchored', anchorLabel: 'Bubble', top: 12, right: 12, zIndex: 14 })
    expect(vnGreetingBaseSpacing?.type === 'spacing' && vnGreetingBaseSpacing.padding).toMatchObject({ top: 6, right: 10, bottom: 6, left: 10, unit: 'px' })
    const vnGreetingMobilePackets = vnGreetings.steps[0].createMobilePackets!()
    const vnGreetingMobilePosition = vnGreetingMobilePackets.find((packet) => packet.type === 'position')
    const vnGreetingMobileSpacing = vnGreetingMobilePackets.find((packet) => packet.type === 'spacing')
    expect(vnGreetingMobilePosition).toMatchObject({ type: 'position', mode: 'anchored', anchorLabel: 'Bubble', top: 8, right: 8, zIndex: 14 })
    expect(vnGreetingMobileSpacing?.type === 'spacing' && vnGreetingMobileSpacing.padding).toMatchObject({ top: 4, right: 8, bottom: 4, left: 8, unit: 'px' })
    expect(KNOWN_PART_ROLES['assistant.content.mount.back'].selectors[0].selector).toContain('[class*="_content_"]:has(> [data-component="MessageContent"])::before')
    expect(KNOWN_PART_ROLES['assistant.content.mount.back'].selectors[0].selector).not.toContain('[data-component="MessageContent"]::before')
    expect(vnStage.steps.map((step) => step.role)).toContain('assistant.content.mount.back')
    expect(vnStage.steps.map((step) => step.role)).toContain('assistant.content.mount.front')
    expect(vnStage.steps.map((step) => step.role)).not.toContain('assistant.frame.back')
    expect(vnStage.steps.map((step) => step.role)).not.toContain('assistant.frame.front')
    const vnTopFrameMobile = vnStage.steps.find((step) => step.role === 'assistant.content.mount.back')!.createMobilePackets!()
    const vnTopFrameMobileBg = vnTopFrameMobile.find((packet) => packet.type === 'background')
    const vnTopFrameMobileSize = vnTopFrameMobile.find((packet) => packet.type === 'size')
    expect(vnTopFrameMobileBg?.type === 'background' && decodeURIComponent(vnTopFrameMobileBg.image.assetPath)).toContain('viewBox="0 0 400 64"')
    expect(vnTopFrameMobileSize?.type === 'size' && vnTopFrameMobileSize.height.mode === 'fixed' && vnTopFrameMobileSize.height.value).toBe(64)
    const vnTopFrameMobilePosition = vnTopFrameMobile.find((packet) => packet.type === 'position')
    expect(vnTopFrameMobilePosition).toMatchObject({ type: 'position', mode: 'anchored', anchorLabel: 'Assistant dialogue frame', nudgeX: -13, nudgeY: -11 })
    expect(vnTopFrameMobilePosition).not.toHaveProperty('top')
    expect(vnTopFrameMobilePosition).not.toHaveProperty('bottom')

    const vnAssistantHeaderPackets = vnStage.steps.find((step) => step.role === 'assistant.header')!.createPackets()
    const vnAssistantHeaderLayout = vnAssistantHeaderPackets.find((packet) => packet.type === 'layout')
    const vnAssistantHeaderSize = vnAssistantHeaderPackets.find((packet) => packet.type === 'size')
    expect(vnAssistantHeaderLayout?.type === 'layout' && vnAssistantHeaderLayout.display).toBe('block')
    expect(vnAssistantHeaderSize?.type === 'size' && vnAssistantHeaderSize.height.mode === 'fixed' && vnAssistantHeaderSize.height.value).toBe(238)
    const vnAssistantHeaderMobileSize = vnStage.steps.find((step) => step.role === 'assistant.header')!.createMobilePackets!().find((packet) => packet.type === 'size')
    expect(vnAssistantHeaderMobileSize?.type === 'size' && vnAssistantHeaderMobileSize.height.mode === 'fixed' && vnAssistantHeaderMobileSize.height.value).toBe(176)

    const vnAssistantImage = vnStage.steps.find((step) => step.role === 'assistant.avatar.image')!
    const vnAssistantImageBase = vnAssistantImage.createPackets().find((packet) => packet.type === 'image')
    const vnAssistantImageMobile = vnAssistantImage.createMobilePackets!().find((packet) => packet.type === 'image')
    expect(vnAssistantImageBase?.type === 'image' && vnAssistantImageBase.objectPositionY).toBe(50)
    expect(vnAssistantImageMobile?.type === 'image' && vnAssistantImageMobile.objectPositionY).toBe(50)

    const vnAssistantBackdropVisibility = vnStage.steps.find((step) => step.role === 'assistant.backdrop.frame')!.createPackets().find((packet) => packet.type === 'visibility')
    const vnAssistantBackdropImageVisibility = vnStage.steps.find((step) => step.role === 'assistant.backdrop.image')!.createPackets().find((packet) => packet.type === 'visibility')
    const vnAssistantBackdropScrimVisibility = vnStage.steps.find((step) => step.role === 'assistant.backdrop.scrim')!.createPackets().find((packet) => packet.type === 'visibility')
    expect(vnAssistantBackdropVisibility?.type === 'visibility' && vnAssistantBackdropVisibility.mode).toBe('gone')
    expect(vnAssistantBackdropImageVisibility?.type === 'visibility' && vnAssistantBackdropImageVisibility.mode).toBe('gone')
    expect(vnAssistantBackdropScrimVisibility?.type === 'visibility' && vnAssistantBackdropScrimVisibility.mode).toBe('gone')

    const vnAssistantNamePosition = vnStage.steps.find((step) => step.role === 'assistant.name')!.createPackets().find((packet) => packet.type === 'position')
    expect(vnAssistantNamePosition?.type === 'position' && vnAssistantNamePosition.mode).toBe('nudge')
    expect(vnAssistantNamePosition?.type === 'position' && vnAssistantNamePosition.nudgeX).toBe(0)
    expect(vnAssistantNamePosition?.type === 'position' && vnAssistantNamePosition.nudgeY).toBe(-5)
    expect(vnAssistantNamePosition?.type === 'position' && vnAssistantNamePosition.unit).toBe('rem')
    const vnAssistantNameMobilePackets = vnStage.steps.find((step) => step.role === 'assistant.name')!.createMobilePackets!()
    expect(vnAssistantNameMobilePackets.some((packet) => packet.type === 'position')).toBe(false)
    const vnAssistantNameMobileType = vnAssistantNameMobilePackets.find((packet) => packet.type === 'typography')
    expect(vnAssistantNameMobileType?.type === 'typography' && vnAssistantNameMobileType.fontSize).toBe(22)
    const vnDialogueFrameTop = vnStage.steps.find((step) => step.role === 'assistant.content.mount.back')!.createPackets()
    const vnDialogueFrameBottom = vnStage.steps.find((step) => step.role === 'assistant.content.mount.front')!.createPackets()
    expect(vnDialogueFrameTop.find((packet) => packet.type === 'background')?.type).toBe('background')
    expect(vnDialogueFrameTop.find((packet) => packet.type === 'position')).toMatchObject({ type: 'position', anchorLabel: 'Assistant dialogue frame', top: -5, left: 0 })
    expect(vnDialogueFrameTop.find((packet) => packet.type === 'position')).not.toHaveProperty('right')
    expect(vnDialogueFrameBottom.find((packet) => packet.type === 'position')).toMatchObject({ type: 'position', anchorLabel: 'Assistant dialogue frame', bottom: -5, left: 0 })
    expect(vnDialogueFrameBottom.find((packet) => packet.type === 'position')).not.toHaveProperty('right')
    expect(vnDialogueFrameTop.find((packet) => packet.type === 'size')).toMatchObject({ type: 'size', width: { mode: 'parent' }, height: { mode: 'fixed', value: 64, unit: 'px' } })
    expect(vnDialogueFrameBottom.find((packet) => packet.type === 'size')).toMatchObject({ type: 'size', width: { mode: 'parent' }, height: { mode: 'fixed', value: 64, unit: 'px' } })
    expect(vnStage.steps.find((step) => step.role === 'assistant.content.mount.back')!.createMobilePackets!().find((packet) => packet.type === 'size')).toMatchObject({ type: 'size', width: { mode: 'parent' } })
    expect(vnStage.steps.find((step) => step.role === 'assistant.content.mount.front')!.createMobilePackets!().find((packet) => packet.type === 'position')).toMatchObject({ type: 'position', mode: 'anchored', nudgeX: -13, nudgeY: -46 })
    expect(vnDialogueFrameBottom.find((packet) => packet.type === 'transform')).toMatchObject({ type: 'transform', rotate: 180 })

    const vnAttachments = COMMON_PART_PRESETS.find((entry) => entry.id === 'visual-novel-attachments')!
    expect(vnAttachments.steps.map((step) => step.role)).toEqual(['message.media.paragraph', 'message.media.wrapper', 'message.media.image', 'assistant.attachment.mount', 'message.attachments', 'message.attachment.inline-button', 'message.attachment.inline-wrap', 'message.attachment.image'])
    const vnAttachmentButtonSize = vnAttachments.steps.find((step) => step.role === 'message.attachment.inline-button')!.createPackets().find((packet) => packet.type === 'size')
    expect(vnAttachmentButtonSize?.type === 'size' && vnAttachmentButtonSize.width?.mode).toBe('native')
    expect(vnAttachmentButtonSize?.type === 'size' && vnAttachmentButtonSize.height?.mode).toBe('content')
    expect(vnAttachmentButtonSize?.type === 'size' && vnAttachmentButtonSize.boundary?.label).toBe('Attachments')
    const vnAttachmentWrapSize = vnAttachments.steps.find((step) => step.role === 'message.attachment.inline-wrap')!.createMobilePackets!().find((packet) => packet.type === 'size')
    expect(vnAttachmentWrapSize?.type === 'size' && vnAttachmentWrapSize.width?.mode === 'fixed' && vnAttachmentWrapSize.width.value).toBe(236)
    expect(vnAttachmentWrapSize?.type === 'size' && vnAttachmentWrapSize.height?.mode === 'fixed' && vnAttachmentWrapSize.height.value).toBe(176)
    const vnAttachmentImagePackets = vnAttachments.steps.find((step) => step.role === 'message.attachment.image')!.createPackets()
    const vnAttachmentImage = vnAttachmentImagePackets.find((packet) => packet.type === 'image')
    expect(vnAttachmentImagePackets.some((packet) => packet.type === 'size')).toBe(false)
    expect(vnAttachmentImagePackets.some((packet) => packet.type === 'media-flow' && packet.mode === 'full')).toBe(true)
    expect(vnAttachmentImage?.type === 'image' && vnAttachmentImage.fillFrame).toBe(true)
    expect(vnAttachmentImage?.type === 'image' && vnAttachmentImage.objectFit).toBe('contain')
    expect(KNOWN_PART_ROLES['message.attachment.inline-button'].selectors[0].selector).toContain('_inlineImageBtn_')
    expect(KNOWN_PART_ROLES['message.attachment.inline-wrap'].selectors[0].selector).toContain('_inlineImageWrap_')
    const vnAttachmentMountPackets = vnAttachments.steps.find((step) => step.role === 'assistant.attachment.mount')!.createPackets()
    const vnAttachmentMountSpacing = vnAttachmentMountPackets.find((packet) => packet.type === 'spacing')
    expect(vnAttachmentMountSpacing?.type === 'spacing' && vnAttachmentMountSpacing.margin.bottom).toBe(52)
    const vnAttachmentMountOrder = vnAttachmentMountPackets.find((packet) => packet.type === 'layout-item')
    expect(vnAttachmentMountOrder?.type === 'layout-item' && vnAttachmentMountOrder.order).toBe(3)
    const vnDialogueOrder = vnStage.steps.find((step) => step.role === 'assistant.content.mount')!.createPackets().find((packet) => packet.type === 'layout-item')
    expect(vnDialogueOrder?.type === 'layout-item' && vnDialogueOrder.order).toBe(4)

    const vnInnerVoice = COMMON_PART_PRESETS.find((entry) => entry.id === 'visual-novel-inner-voice')!
    expect(vnInnerVoice.steps.map((step) => step.role)).toContain('assistant.thinking.content.label')
    expect(KNOWN_PART_ROLES['assistant.thinking.content'].selectors[0].selector).toContain('_bodyWrapper_')
    expect(KNOWN_PART_ROLES['assistant.thinking.content'].selectors[0].selector).toContain('_bodyInner_')
    const vnInnerBodyType = vnInnerVoice.steps.find((step) => step.role === 'assistant.thinking.content')!.createPackets().find((packet) => packet.type === 'typography')
    expect(vnInnerBodyType?.type === 'typography' && vnInnerBodyType.fontFamily).toBe('Georgia')
    const vnInnerLabelContent = vnInnerVoice.steps.find((step) => step.role === 'assistant.thinking.content.label')!.createPackets().find((packet) => packet.type === 'content')
    expect(vnInnerLabelContent?.type === 'content' && vnInnerLabelContent.value).toBe('INNER MONOLOGUE')

    const vnHud = COMMON_PART_PRESETS.find((entry) => entry.id === 'visual-novel-hud')!
    const vnSwipesPackets = vnHud.steps.find((step) => step.role === 'assistant.swipes')!.createPackets()
    const vnSwipesLayout = vnSwipesPackets.find((packet) => packet.type === 'layout')
    const vnSwipesSize = vnSwipesPackets.find((packet) => packet.type === 'size')
    const vnSwipesPosition = vnSwipesPackets.find((packet) => packet.type === 'position')
    expect(vnSwipesLayout?.type === 'layout' && vnSwipesLayout.justify).toBe('end')
    expect(vnSwipesSize?.type === 'size' && vnSwipesSize.width.mode).toBe('content')
    expect(vnSwipesPosition?.type === 'position' && vnSwipesPosition.right).toBe(14)
    expect(vnSwipesPosition?.type === 'position' && vnSwipesPosition.left).toBeUndefined()
    const vnSwipesMobilePosition = vnHud.steps.find((step) => step.role === 'assistant.swipes')!.createMobilePackets!().find((packet) => packet.type === 'position')
    expect(vnSwipesMobilePosition?.type === 'position' && vnSwipesMobilePosition.right).toBe(8)
    expect(vnSwipesMobilePosition?.type === 'position' && vnSwipesMobilePosition.left).toBeUndefined()
    const vnActions = vnHud.steps.find((step) => step.role === 'assistant.actions.pill')!
    const vnActionPosition = vnActions.createPackets().find((packet) => packet.type === 'position')
    expect(vnActionPosition?.type === 'position' && vnActionPosition.nudgeX).toBe(-9)
    expect(vnActionPosition?.type === 'position' && vnActionPosition.nudgeY).toBe(-13)

    const vnReadMore = COMMON_PART_PRESETS.find((entry) => entry.id === 'visual-novel-read-more')!
    expect(vnReadMore.steps.map((step) => step.role)).toEqual(['message.long-toggle', 'message.long-toggle.label'])
    const vnReadMoreBackground = vnReadMore.steps[0].createPackets().find((packet) => packet.type === 'background')
    expect(vnReadMoreBackground?.type === 'background' && vnReadMoreBackground.gradient.stops).toHaveLength(3)

    const vnChoice = COMMON_PART_PRESETS.find((entry) => entry.id === 'visual-novel-user-choice')!
    expect(vnChoice.steps.map((step) => step.role)).toContain('user.avatar')
    expect(vnChoice.steps.map((step) => step.role)).toContain('user.name')
    expect(vnChoice.steps.map((step) => step.role)).toContain('user.actions.button.heart')
    const vnChoiceAvatarVisibility = vnChoice.steps.find((step) => step.role === 'user.avatar')!.createPackets().find((packet) => packet.type === 'visibility')
    expect(vnChoiceAvatarVisibility?.type === 'visibility' && vnChoiceAvatarVisibility.mode).toBe('visible')
    const vnChoiceAvatarPosition = vnChoice.steps.find((step) => step.role === 'user.avatar')!.createPackets().find((packet) => packet.type === 'position')
    expect(vnChoiceAvatarPosition?.type === 'position' && vnChoiceAvatarPosition.mode).toBe('anchored')
    expect(vnChoiceAvatarPosition?.type === 'position' && vnChoiceAvatarPosition.left).toBe(54)
    expect(vnChoiceAvatarPosition?.type === 'position' && vnChoiceAvatarPosition.top).toBe(33)
    const vnChoiceNamePosition = vnChoice.steps.find((step) => step.role === 'user.name')!.createPackets().find((packet) => packet.type === 'position')
    expect(vnChoiceNamePosition?.type === 'position' && vnChoiceNamePosition.mode).toBe('anchored')
    expect(vnChoiceNamePosition?.type === 'position' && vnChoiceNamePosition.left).toBe(54)
    expect(vnChoiceNamePosition?.type === 'position' && vnChoiceNamePosition.top).toBe(101)
    const vnChoiceNameMobilePosition = vnChoice.steps.find((step) => step.role === 'user.name')!.createMobilePackets!().find((packet) => packet.type === 'position')
    const vnChoiceNameMobileSize = vnChoice.steps.find((step) => step.role === 'user.name')!.createMobilePackets!().find((packet) => packet.type === 'size')
    expect(vnChoiceNameMobilePosition?.type === 'position' && vnChoiceNameMobilePosition.left).toBe(74)
    expect(vnChoiceNameMobilePosition?.type === 'position' && vnChoiceNameMobilePosition.top).toBe(30)
    expect(vnChoiceNameMobileSize?.type === 'size' && vnChoiceNameMobileSize.width.mode === 'fixed' && vnChoiceNameMobileSize.width.value).toBe(120)
    const vnChoiceMetaVisibility = vnChoice.steps.find((step) => step.role === 'user.meta.pill')!.createPackets().find((packet) => packet.type === 'visibility')
    expect(vnChoiceMetaVisibility?.type === 'visibility' && vnChoiceMetaVisibility.mode).toBe('gone')
    const vnChoiceActionsPosition = vnChoice.steps.find((step) => step.role === 'user.actions.pill')!.createPackets().find((packet) => packet.type === 'position')
    expect(vnChoiceActionsPosition?.type === 'position' && vnChoiceActionsPosition.bottom).toBe(20)
    expect(vnChoiceActionsPosition?.type === 'position' && vnChoiceActionsPosition.anchorLabel).toBe('User choice window')
    expect(vnChoiceActionsPosition?.type === 'position' && vnChoiceActionsPosition.right).toBe(18)
    const vnChoiceActionsMobilePosition = vnChoice.steps.find((step) => step.role === 'user.actions.pill')!.createMobilePackets!().find((packet) => packet.type === 'position')
    expect(vnChoiceActionsMobilePosition?.type === 'position' && vnChoiceActionsMobilePosition.bottom).toBe(13)
    expect(vnChoiceActionsMobilePosition?.type === 'position' && vnChoiceActionsMobilePosition.right).toBe(22)
    expect(vnChoiceActionsMobilePosition?.type === 'position' && vnChoiceActionsMobilePosition.nudgeX).toBe(-3)
    expect(vnChoiceActionsMobilePosition?.type === 'position' && vnChoiceActionsMobilePosition.nudgeY).toBe(-12)
    const vnChoiceRimPosition = vnChoice.steps.find((step) => step.role === 'user.content.mount.back')!.createPackets().find((packet) => packet.type === 'position')
    expect(vnChoiceRimPosition?.type === 'position' && vnChoiceRimPosition.anchorLabel).toBe('User content mount')
    const vnChoiceStatePosition = vnChoice.steps.find((step) => step.role === 'user.content.mount.front')!.createPackets().find((packet) => packet.type === 'position')
    expect(vnChoiceStatePosition?.type === 'position' && vnChoiceStatePosition.anchorLabel).toBe('User content mount')


    const vnSecondSpeaker = COMMON_PART_PRESETS.find((entry) => entry.id === 'visual-novel-user-speaker')!
    expect(vnSecondSpeaker.steps.map((step) => step.role)).toContain('user.name')
    const vnSecondSpeakerBackdropFramePackets = vnSecondSpeaker.steps.find((step) => step.role === 'user.backdrop.frame')!.createPackets()
    const vnSecondSpeakerBackdropMask = vnSecondSpeakerBackdropFramePackets.find((packet) => packet.type === 'image')
    const vnSecondSpeakerBackdropLayout = vnSecondSpeakerBackdropFramePackets.find((packet) => packet.type === 'layout')
    expect(vnSecondSpeakerBackdropMask?.type === 'image' && vnSecondSpeakerBackdropMask.maskMode).toBe('none')
    expect(vnSecondSpeakerBackdropLayout?.type === 'layout' && vnSecondSpeakerBackdropLayout.display).toBe('block')
    const vnSecondSpeakerBackdropImagePackets = vnSecondSpeaker.steps.find((step) => step.role === 'user.backdrop.image')!.createPackets()
    expect(vnSecondSpeakerBackdropImagePackets.some((packet) => packet.type === 'size')).toBe(false)
    const vnSecondSpeakerBackdropImage = vnSecondSpeakerBackdropImagePackets.find((packet) => packet.type === 'image')
    expect(vnSecondSpeakerBackdropImage?.type === 'image' && vnSecondSpeakerBackdropImage.objectPositionY).toBe(50)
    expect(vnSecondSpeaker.steps.map((step) => step.role)).not.toContain('user.frame.back')
    expect(vnSecondSpeaker.steps.map((step) => step.role)).not.toContain('user.frame.front')
    expect(vnSecondSpeaker.steps.map((step) => step.role)).toContain('user.content.mount.back')
    expect(vnSecondSpeaker.steps.map((step) => step.role)).toContain('user.content.mount.front')
    const vnSecondSpeakerScrimPackets = vnSecondSpeaker.steps.find((step) => step.role === 'user.backdrop.scrim')!.createPackets()
    const vnSecondSpeakerScrimSize = vnSecondSpeakerScrimPackets.find((packet) => packet.type === 'size')
    const vnSecondSpeakerScrimBg = vnSecondSpeakerScrimPackets.find((packet) => packet.type === 'background')
    expect(vnSecondSpeakerScrimSize?.type === 'size' && vnSecondSpeakerScrimSize.width.mode).toBe('parent')
    expect(vnSecondSpeakerScrimSize?.type === 'size' && vnSecondSpeakerScrimSize.height.mode === 'fixed' && vnSecondSpeakerScrimSize.height.value).toBe(62)
    expect(vnSecondSpeakerScrimBg?.type === 'background' && vnSecondSpeakerScrimBg.gradient.angle).toBe(180)
    expect(vnSecondSpeakerScrimBg?.type === 'background' && vnSecondSpeakerScrimBg.gradient.stops[0]?.alpha).toBe(0)
    const vnSecondSpeakerScrimMobile = vnSecondSpeaker.steps.find((step) => step.role === 'user.backdrop.scrim')!.createMobilePackets!()
    const vnSecondSpeakerScrimMobileSize = vnSecondSpeakerScrimMobile.find((packet) => packet.type === 'size')
    expect(vnSecondSpeakerScrimMobileSize?.type === 'size' && vnSecondSpeakerScrimMobileSize.height.mode === 'fixed' && vnSecondSpeakerScrimMobileSize.height.value).toBe(68)

    const vnSecondSpeakerNamePackets = vnSecondSpeaker.steps.find((step) => step.role === 'user.name')!.createPackets()
    const vnSecondSpeakerNameVisibility = vnSecondSpeakerNamePackets.find((packet) => packet.type === 'visibility')
    const vnSecondSpeakerNamePosition = vnSecondSpeakerNamePackets.find((packet) => packet.type === 'position')
    expect(vnSecondSpeakerNameVisibility?.type === 'visibility' && vnSecondSpeakerNameVisibility.mode).toBe('visible')
    expect(vnSecondSpeakerNamePosition?.type === 'position' && vnSecondSpeakerNamePosition.mode).toBe('flow')
    const vnSecondSpeakerHeaderPackets = vnSecondSpeaker.steps.find((step) => step.role === 'user.header')!.createPackets()
    const vnSecondSpeakerHeaderLayout = vnSecondSpeakerHeaderPackets.find((packet) => packet.type === 'layout')
    expect(vnSecondSpeakerHeaderLayout?.type === 'layout' && vnSecondSpeakerHeaderLayout.display).toBe('flex')
    expect(vnSecondSpeakerHeaderLayout?.type === 'layout' && vnSecondSpeakerHeaderLayout.justify).toBe('end')
    const vnSecondSpeakerHeaderLeftPackets = vnSecondSpeaker.steps.find((step) => step.role === 'user.header.left')!.createPackets()
    const vnSecondSpeakerHeaderLeftPosition = vnSecondSpeakerHeaderLeftPackets.find((packet) => packet.type === 'position')
    const vnSecondSpeakerHeaderLeftLayout = vnSecondSpeakerHeaderLeftPackets.find((packet) => packet.type === 'layout')
    expect(vnSecondSpeakerHeaderLeftPosition?.type === 'position' && vnSecondSpeakerHeaderLeftPosition.mode).toBe('flow')
    expect(vnSecondSpeakerHeaderLeftLayout?.type === 'layout' && vnSecondSpeakerHeaderLeftLayout.direction).toBe('row-reverse')
    const vnSecondSpeakerContentMountPackets = vnSecondSpeaker.steps.find((step) => step.role === 'user.content.mount')!.createPackets()
    const vnSecondSpeakerContentSize = vnSecondSpeakerContentMountPackets.find((packet) => packet.type === 'size')
    expect(vnSecondSpeakerContentSize?.type === 'size' && vnSecondSpeakerContentSize.width.mode).toBe('content')
    expect(vnSecondSpeakerContentSize?.type === 'size' && vnSecondSpeakerContentSize.height?.mode).toBe('content')
    expect(vnSecondSpeakerContentSize?.type === 'size' && vnSecondSpeakerContentSize.maxWidth?.mode === 'fixed' && vnSecondSpeakerContentSize.maxWidth.value).toBe(88)
    const vnSecondSpeakerTopFrame = vnSecondSpeaker.steps.find((step) => step.role === 'user.content.mount.back')!.createPackets()
    const vnSecondSpeakerBottomFrame = vnSecondSpeaker.steps.find((step) => step.role === 'user.content.mount.front')!.createPackets()
    expect(vnSecondSpeakerTopFrame.find((packet) => packet.type === 'background')?.type).toBe('background')
    expect(vnSecondSpeakerTopFrame.find((packet) => packet.type === 'position')).toMatchObject({ type: 'position', anchorLabel: 'User dialogue frame', top: -5, left: 0 })
    expect(vnSecondSpeakerTopFrame.find((packet) => packet.type === 'position')).not.toHaveProperty('right')
    expect(vnSecondSpeakerBottomFrame.find((packet) => packet.type === 'position')).toMatchObject({ type: 'position', anchorLabel: 'User dialogue frame', bottom: -5, left: 0 })
    expect(vnSecondSpeakerBottomFrame.find((packet) => packet.type === 'position')).not.toHaveProperty('right')
    expect(vnSecondSpeakerTopFrame.find((packet) => packet.type === 'size')).toMatchObject({ type: 'size', width: { mode: 'parent' }, height: { mode: 'fixed', value: 64, unit: 'px' } })
    expect(vnSecondSpeakerBottomFrame.find((packet) => packet.type === 'size')).toMatchObject({ type: 'size', width: { mode: 'parent' }, height: { mode: 'fixed', value: 64, unit: 'px' } })
    expect(vnSecondSpeaker.steps.find((step) => step.role === 'user.content.mount.back')!.createMobilePackets!().find((packet) => packet.type === 'size')).toMatchObject({ type: 'size', width: { mode: 'parent' } })
    expect(vnSecondSpeaker.steps.find((step) => step.role === 'user.content.mount.back')!.createMobilePackets!().find((packet) => packet.type === 'position')).toMatchObject({ type: 'position', mode: 'anchored', nudgeX: -13, nudgeY: -11 })
    expect(vnSecondSpeaker.steps.find((step) => step.role === 'user.content.mount.front')!.createMobilePackets!().find((packet) => packet.type === 'position')).toMatchObject({ type: 'position', mode: 'anchored', nudgeX: -13, nudgeY: -46 })
    expect(vnSecondSpeakerBottomFrame.find((packet) => packet.type === 'transform')).toMatchObject({ type: 'transform', rotate: 180 })
    expect(vnSecondSpeaker.steps.map((step) => step.role)).toContain('user.actions.pill')

    const jewelSend = COMMON_PART_PRESETS.find((entry) => entry.id === 'input-jewel-send')!
    expect(jewelSend.steps.map((step) => step.role)).toEqual(['input.send', 'input.send.controls'])
    const jewelSendSize = jewelSend.steps.find((step) => step.role === 'input.send')!.createPackets().find((packet) => packet.type === 'size')
    expect(jewelSendSize?.type === 'size' && jewelSendSize.width.mode === 'fixed' && jewelSendSize.width.value).toBe(38)
    expect(KNOWN_PART_ROLES['input.placeholder'].selectors[0].selector).toContain('::placeholder')

    const strip = COMMON_PART_PRESETS.find((entry) => entry.id === 'minimal-native-strip-off')!
    const visibility = strip.steps[0].createPackets()[0]
    expect(visibility.type === 'visibility' && visibility.mode).toBe('gone')
    expect(visibility.editedFields).toEqual(['mode'])
  })

  test('Visual Novel now owns a full MessageContent prose hierarchy', () => {
    const prose = COMMON_PART_PRESETS.find((entry) => entry.id === 'visual-novel-prose')!
    expect(prose).toBeTruthy()
    expect(prose.steps.map((step) => step.role)).toEqual(['prose.h1','prose.h2','prose.h3','prose.h4','prose.paragraph','prose.bold','prose.italic','prose.codeblock'])
    expect(prose.steps.find((step) => step.role === 'prose.h2')!.createPackets().some((packet) => packet.type === 'typography')).toBe(true)
  })

  test('Editorial, Visual Novel, and Journal media recipes cover raw prose images plus native Lumi attachments', () => {
    for (const id of ['editorial-media-plate', 'visual-novel-attachments', 'journal-photo-insert']) {
      const preset = COMMON_PART_PRESETS.find((entry) => entry.id === id)!
      expect(preset).toBeTruthy()
      const roles = preset.steps.map((step) => step.role)
      expect(roles).toContain('message.media.paragraph')
      expect(roles).toContain('message.media.wrapper')
      expect(roles).toContain('message.media.image')
      expect(roles).toContain('message.attachment.inline-button')
      expect(roles).toContain('message.attachment.inline-wrap')
      expect(roles).toContain('message.attachment.image')
      expect(preset.steps.find((step) => step.role === 'message.media.image')!.createPackets().some((packet) => packet.type === 'media-flow')).toBe(true)
      expect(preset.steps.find((step) => step.role === 'message.attachment.image')!.createPackets().some((packet) => packet.type === 'media-flow')).toBe(true)
    }
  })

  test('Media basics and Manga cover raw prose images plus native Lumi attachments', () => {
    for (const id of ['message-media-full-width', 'message-media-inset-card', 'manga-media-panel']) {
      const preset = COMMON_PART_PRESETS.find((entry) => entry.id === id)!
      expect(preset).toBeTruthy()
      const roles = preset.steps.map((step) => step.role)
      expect(roles).toContain('message.media.image')
      expect(roles).toContain('message.attachment.image')
      expect(roles).toContain('message.attachment.inline-button')
    }
    const manga = COMMON_PART_PRESETS.find((entry) => entry.id === 'manga-media-panel')!
    const proseImage = manga.steps.find((step) => step.role === 'message.media.image')!.createPackets()
    const nativeImage = manga.steps.find((step) => step.role === 'message.attachment.image')!.createPackets()
    expect(proseImage.some((packet) => packet.type === 'media-flow' && packet.mode === 'full')).toBe(true)
    expect(nativeImage.some((packet) => packet.type === 'media-flow' && packet.mode === 'full')).toBe(true)
  })

  test('Manga Temper mark is a real SVG Asset on the card front plane', () => {
    const temper = COMMON_PART_PRESETS.find((entry) => entry.id === 'manga-temper-mark')!
    const packets = temper.steps[0].createPackets()
    expect(packets.some((packet) => packet.type === 'content')).toBe(false)
    const svg = packets.find((packet) => packet.type === 'svg-asset')
    expect(svg?.type === 'svg-asset' && svg.renderMode).toBe('mask')
    expect(svg?.type === 'svg-asset' && svg.svg).toContain('<svg')
    expect(svg?.type === 'svg-asset' && svg.color).toBe('#ff2d3d')
    const position = packets.find((packet) => packet.type === 'position')
    expect(position?.type === 'position' && position.right).toBe(8)
    const size = packets.find((packet) => packet.type === 'size')
    expect(size?.type === 'size' && size.width.mode === 'fixed' && size.width.value).toBe(44)
  })

  test('Manga foreground portrait focal defaults stay near neutral on desktop and mobile', () => {
    const lead = COMMON_PART_PRESETS.find((entry) => entry.id === 'manga-panel-portrait')!
    const avatar = lead.steps.find((step) => step.role === 'avatar.image')!
    const base = avatar.createPackets().find((packet) => packet.type === 'image')
    const mobile = avatar.createMobilePackets!().find((packet) => packet.type === 'image')
    expect(base?.type === 'image' && base.objectPositionY).toBe(46)
    expect(mobile?.type === 'image' && mobile.objectPositionY).toBe(46)
    const rail = COMMON_PART_PRESETS.find((entry) => entry.id === 'manga-margin-speaker')!
    const railImage = rail.steps.find((step) => step.role === 'minimal.avatar.image')!
    expect(railImage.createPackets().find((packet) => packet.type === 'image')?.type).toBe('image')
    expect((railImage.createPackets().find((packet) => packet.type === 'image') as any).objectPositionY).toBe(50)
  })

  test('Manga owns the floating move-down cue and textarea breathing room', () => {
    const cue = COMMON_PART_PRESETS.find((entry) => entry.id === 'manga-scroll-cue')!
    expect(cue.steps[0].role).toBe('chat.scroll-bottom')
    const composer = COMMON_PART_PRESETS.find((entry) => entry.id === 'manga-composer')!
    const textarea = composer.steps.find((step) => step.role === 'input.textarea')!.createPackets()
    const spacing = textarea.find((packet) => packet.type === 'spacing')
    expect(spacing?.type === 'spacing' && spacing.padding?.top).toBe(8)
  })


  test('pack text ink audit keeps prose/dialogue cascade-safe and forces hostile composer controls', () => {
    const packPrefixes = ['manga-', 'editorial-', 'journal-', 'visual-novel-']
    const packPresets = COMMON_PART_PRESETS.filter((preset) => packPrefixes.some((prefix) => preset.id.startsWith(prefix)))
    let sawProse = false, sawComposer = false
    for (const preset of packPresets) for (const step of preset.steps) {
      const packets = applyTextInkPolicyForRole(step.role, step.createPackets())
      const textPackets = packets.filter((packet) => packet.type === 'text')
      for (const packet of textPackets) {
        if (packet.type !== 'text' || packet.colorMode !== 'solid') continue
        expect(packet.inkMode).toBe(textInkModeForRole(step.role))
        if (step.role.startsWith('input.')) { sawComposer = true; expect(packet.inkMode).toBe('force') }
        if (['message.content','minimal.content','assistant.content','user.content','prose.paragraph','prose.blockquote','message.thinking.content','assistant.thinking.content'].includes(step.role)) { sawProse = true; expect(packet.inkMode).toBe('cascade') }
      }
    }
    expect(sawProse).toBe(true)
    expect(sawComposer).toBe(true)
  })

})
