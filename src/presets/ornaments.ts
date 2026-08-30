export interface BuiltinOrnament {
  id: string
  label: string
  assetPath: string
  keywords: string[]
}

function svgData(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const ornament = (id: string, label: string, viewBox: string, body: string, keywords: string[] = []): BuiltinOrnament => ({
  id,
  label,
  assetPath: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`),
  keywords,
})

export const BUILTIN_ORNAMENTS: BuiltinOrnament[] = [
  ornament('manga-anger', 'Temper mark', '0 0 512 512', '<g transform="translate(0 512) scale(.1 -.1)" fill="white" stroke="none"><path d="M1973 4763l-202-106 51-96c28-53 71-134 96-181 276-522 565-803 918-892 127-32 339-32 474 1 217 53 456 173 675 339 146 111 336 276 331 289-3 7-70 89-148 182l-143 168-70-59c-317-267-476-371-676-440-86-30-104-32-214-32-102 0-128 3-174 22-209 88-366 277-609 737-49 93-94 170-98 172-5 1-100-45-211-104z"/><path d="M889 4208c-80-68-160-135-178-150l-32-28 83-97c139-163 163-194 242-311 214-316 266-560 164-769-94-193-315-362-786-602-56-29-102-57-102-63 0-9 82-170 172-335l39-73 82 41c587 295 867 524 1017 833 72 147 94 248 93 421-1 354-140 652-521 1112-64 78-119 142-122 143-3 0-71-55-151-122z"/><path d="M4455 3274c-349-186-538-316-691-477-213-222-308-443-307-717 1-351 164-692 550-1144 52-61 97-110 100-110 2 1 83 68 179 149l175 147-23 29c-13 15-71 86-130 157-228 275-348 495-379 700-16 108-2 191 50 298 92 185 274 329 703 556l187 99-80 152c-44 84-92 176-107 205-14 28-31 52-37 52-5 0-91-44-190-96z"/><path d="M1860 1671c-217-48-451-161-680-329-83-61-360-291-360-299 0-4 78-98 271-327l27-31 118 101c327 276 553 403 766 433 77 11 185 0 249-25 74-29 172-100 247-178 118-124 200-251 363-559 51-95 93-173 94-175 2-2 401 204 413 213 5 4-174 339-240 450-136 231-304 429-463 548-91 69-226 136-335 168-108 31-350 36-470 10z"/></g>', ['manga','anger','anime','temper','vein']),
  ornament('impact-burst', 'Impact burst', '0 0 48 48', '<path fill="white" d="m24 2 4.3 12.8L40 8l-6.8 11.7L46 24l-12.8 4.3L40 40l-11.7-6.8L24 46l-4.3-12.8L8 40l6.8-11.7L2 24l12.8-4.3L8 8l11.7 6.8z"/>', ['burst','impact','comic','star']),
  ornament('four-spark', 'Four-point sparkle', '0 0 48 48', '<g fill="white"><path d="m24 2 3.8 18.2L46 24l-18.2 3.8L24 46l-3.8-18.2L2 24l18.2-3.8z"/><path opacity=".55" d="m9 3 1.6 6.4L17 11l-6.4 1.6L9 19l-1.6-6.4L1 11l6.4-1.6z"/></g>', ['sparkle','star','shine']),
  ornament('sweat-drop', 'Sweat drop', '0 0 32 48', '<path fill="white" d="M18 2C14 11 7 19 7 29c0 9 5 15 12 15s11-6 10-14C28 21 22 11 18 2Z"/>', ['sweat','drop','anime','comic']),
  ornament('washi-tape', 'Washi tape', '0 0 96 36', '<path fill="white" d="M5 6 91 2l-3 31-83 1L1 25l4-6-4-6z"/><path fill="black" opacity=".13" d="m17 7 3 26h7L24 6zm24-1 2 27h8L48 5zm26-2 1 28h7L73 4z"/>', ['tape','washi','journal','scrapbook']),
  ornament('paperclip', 'Paper clip', '0 0 40 56', '<path d="M28 8 13 34c-4 7-1 15 5 18 6 3 13 0 17-7L49 20" transform="translate(-9 -5)" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"/><path d="m28 13-13 23c-2 4-1 8 3 10 4 2 8 0 10-4l12-21" transform="translate(-9 -5)" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/>', ['paperclip','clip','journal','office']),
  ornament('postage-star', 'Postage star', '0 0 64 64', '<path fill="white" fill-rule="evenodd" d="M8 4h48v56H8V4Zm6 7v42h36V11H14Zm18 4 4.1 10.7 11.4.6-8.9 7.2 3 11-9.6-6.2-9.6 6.2 3-11-8.9-7.2 11.4-.6L32 15Z"/>', ['stamp','postage','star','journal']),
  ornament('postage-edge', 'Postage edge', '0 0 64 64', '<path fill="white" fill-rule="evenodd" d="M0 0H64V64H0Z M11 0a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z M23 0a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z M35 0a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z M47 0a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z M59 0a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z M11 64a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z M23 64a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z M35 64a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z M47 64a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z M59 64a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z M0 11a3 3 0 1 1 0-6 3 3 0 1 1 0 6Z M0 23a3 3 0 1 1 0-6 3 3 0 1 1 0 6Z M0 35a3 3 0 1 1 0-6 3 3 0 1 1 0 6Z M0 47a3 3 0 1 1 0-6 3 3 0 1 1 0 6Z M0 59a3 3 0 1 1 0-6 3 3 0 1 1 0 6Z M64 11a3 3 0 1 1 0-6 3 3 0 1 1 0 6Z M64 23a3 3 0 1 1 0-6 3 3 0 1 1 0 6Z M64 35a3 3 0 1 1 0-6 3 3 0 1 1 0 6Z M64 47a3 3 0 1 1 0-6 3 3 0 1 1 0 6Z M64 59a3 3 0 1 1 0-6 3 3 0 1 1 0 6Z"/>', ['stamp','postage','perforated','edge','editorial']),
  ornament('editorial-quill', 'Editorial quill', '0 0 64 64', '<g fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round"><path d="M54 7C42 8 30 13 21 22 13 30 10 40 10 52c6-8 13-14 22-18 9-4 16-12 22-27Z" stroke-width="4"/><path d="M11 53c10-12 20-23 34-34M20 43l-7-1M28 34l-8-3M37 26l-7-5M30 36l3 8M39 27l4 6" stroke-width="3"/></g>', ['quill','feather','writing','ink','editorial']),
  ornament('tiny-flower', 'Tiny flower', '0 0 48 48', '<g fill="white"><ellipse cx="24" cy="12" rx="7" ry="11"/><ellipse cx="36" cy="24" rx="11" ry="7"/><ellipse cx="24" cy="36" rx="7" ry="11"/><ellipse cx="12" cy="24" rx="11" ry="7"/><circle cx="24" cy="24" r="6"/></g>', ['flower','botanical','cute']),
  ornament('scribble-heart', 'Scribble heart', '0 0 64 56', '<path d="M32 50S5 34 5 17C5 5 20 1 32 14 44 1 59 5 59 17c0 17-27 33-27 33Z" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 19c2-7 9-9 15-3" fill="none" stroke="white" stroke-width="2" opacity=".65"/>', ['heart','scribble','journal','cute']),
  ornament('vn-corners', 'VN corner brackets', '0 0 120 64', '<g fill="none" stroke="white" stroke-width="1.8" stroke-linecap="square"><path d="M2 18V2h28M90 2h28v16M118 46v16H90M30 62H2V46"/><path opacity=".42" d="M7 23V7h18M95 7h18v16M113 41v16H95M25 57H7V41"/></g>', ['visual','novel','vn','corner','bracket','frame']),
  ornament('vn-wide-corners', 'VN wide corner cap', '0 0 1000 64', '<g fill="none" stroke="white" stroke-width="3" stroke-linecap="square"><path d="M4 60V4h218M778 4h218v56"/><path opacity=".42" d="M18 52V18h154M828 18h154v34"/><path opacity=".24" d="M230 4h112M658 4h112"/></g>', ['visual','novel','vn','wide','corner','frame','cap','top']),
  ornament('vn-mobile-corners', 'VN mobile corner cap', '0 0 400 64', '<g fill="none" stroke="white" stroke-width="3" stroke-linecap="square"><path d="M4 60V4h104M292 4h104v56"/><path opacity=".42" d="M16 52V16h74M310 16h74v36"/><path opacity=".24" d="M116 4h38M246 4h38"/></g>', ['visual','novel','vn','mobile','corner','frame','cap']),
  ornament('vn-heart-jewel', 'VN heart jewel', '0 0 64 40', '<g fill="white"><path d="M32 37S12 25 12 13c0-8 10-11 20-2 10-9 20-6 20 2 0 12-20 24-20 24Z"/><path opacity=".48" d="M4 20 10 14l6 6-6 6-6-6Zm44 0 6-6 6 6-6 6-6-6Z"/></g>', ['visual','novel','vn','heart','jewel','romance']),
  ornament('vn-arrow-left', 'VN arrow left', '0 0 64 32', '<path fill="white" d="M25 4 7 16l18 12v-8h30v-8H25V4Z"/>', ['visual','novel','vn','arrow','previous','left']),
  ornament('vn-arrow-right', 'VN arrow right', '0 0 64 32', '<path fill="white" d="m39 4 18 12-18 12v-8H9v-8h30V4Z"/>', ['visual','novel','vn','arrow','next','right']),
  ornament('star-divider', 'Star divider', '0 0 120 20', '<g fill="white"><path opacity=".4" d="M4 9h42v2H4zm70 0h42v2H74z"/><path d="m60 1 2.4 6.6L69 10l-6.6 2.4L60 19l-2.4-6.6L51 10l6.6-2.4z"/></g>', ['divider','separator','star','chapter']),
]

export function builtinOrnament(id: string): BuiltinOrnament | undefined {
  return BUILTIN_ORNAMENTS.find((entry) => entry.id === id)
}
