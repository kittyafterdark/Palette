export const THEME_STUDIO_CSS = `

/* Spindle drawer viewport ownership. The tab host is extension-owned, so make
   the height chain explicit instead of depending on whichever overflow rules
   the drawer shell happens to use. */
.ts-tab-host { display:flex!important; flex-direction:column!important; min-height:0!important; height:100%!important; max-height:100%!important; overflow:hidden!important; overscroll-behavior:contain; }
.ts-tab-host > .ts-studio-mount { flex:1 1 auto!important; min-height:0!important; height:100%!important; max-height:100%!important; overflow:hidden!important; }
.ts-floating-editor-body > .ts-studio-mount { height:100%!important; max-height:100%!important; }
[data-theme-studio-root] {
  --ts-surface: var(--lumiverse-bg, #1c1826);
  --ts-elevated: var(--lumiverse-bg-elevated, #231e30);
  --ts-hover: var(--lumiverse-bg-hover, #2d283a);
  --ts-border: var(--lumiverse-border, rgba(147,112,219,.18));
  --ts-text: var(--lumiverse-text, rgba(255,255,255,.9));
  --ts-muted: var(--lumiverse-text-muted, rgba(255,255,255,.62));
  --ts-dim: var(--lumiverse-text-dim, rgba(255,255,255,.4));
  --ts-accent: var(--lumiverse-primary, #9370db);
  --ts-accent-soft: var(--lumiverse-primary-015, rgba(147,112,219,.15));
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  color: var(--ts-text);
  background: var(--ts-surface);
  font-family: var(--lumiverse-font-family, system-ui, sans-serif);
  font-size: calc(13px * var(--lumiverse-font-scale, 1));
  overflow: hidden;
}
[data-theme-studio-root] *, [data-theme-studio-root] *::before, [data-theme-studio-root] *::after { box-sizing: border-box; }
.ts-shell { display: flex; flex-direction: column; min-height: 0; height: 100%; overflow: hidden; }
.ts-project-bar { display: grid; grid-template-columns: minmax(0,1fr) auto auto; gap: 8px; padding: 10px; border-bottom: 1px solid var(--ts-border); background: var(--ts-elevated); }
.ts-project-select, .ts-input, .ts-textarea, .ts-number, .ts-search {
  width: 100%; min-width: 0; border: 1px solid var(--ts-border); border-radius: var(--lumiverse-radius-sm, 6px);
  background: var(--lumiverse-fill-subtle, rgba(0,0,0,.12)); color: var(--ts-text); padding: 8px 9px; outline: none;
  font: inherit;
}
.ts-project-select:focus, .ts-input:focus, .ts-textarea:focus, .ts-number:focus, .ts-search:focus { border-color: var(--ts-accent); box-shadow: 0 0 0 2px var(--ts-accent-soft); }
.ts-tabbar { display: grid; grid-template-columns: repeat(3, 1fr); padding: 6px 10px 0; gap: 4px; border-bottom: 1px solid var(--ts-border); background: var(--ts-elevated); }
.ts-tab { appearance: none; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--ts-muted); padding: 9px 6px 8px; cursor: pointer; font: inherit; font-weight: 650; }
.ts-tab:hover { color: var(--ts-text); background: var(--lumiverse-fill-subtle, rgba(0,0,0,.1)); }
.ts-tab[aria-selected="true"] { color: var(--ts-text); border-bottom-color: var(--ts-accent); }
.ts-scroll { flex: 1 1 auto; min-height: 0; overflow-x:hidden; overflow-y:auto; padding: 12px; scrollbar-width: thin; touch-action:pan-y; -webkit-overflow-scrolling:touch; }
.ts-section { margin-bottom: 18px; }
.ts-kicker { margin: 0 0 8px; color: var(--ts-dim); font-size: 10px; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
.ts-card { border: 1px solid var(--ts-border); border-radius: var(--lumiverse-radius, 8px); background: var(--ts-elevated); padding: 11px; box-shadow: var(--lumiverse-highlight-inset, inset 0 1px rgba(255,255,255,.05)); }
.ts-target-panel { border: 1px solid var(--ts-border); border-radius: calc(var(--lumiverse-radius, 8px) + 2px); background: var(--ts-elevated); padding: 10px; box-shadow: var(--lumiverse-highlight-inset, inset 0 1px rgba(255,255,255,.05)); }
.ts-target-empty { display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 10px; align-items: center; border: 1px dashed var(--ts-border); border-radius: calc(var(--lumiverse-radius, 8px) + 2px); padding: 12px; background: var(--lumiverse-fill-subtle, rgba(0,0,0,.08)); }
.ts-target-empty-mark { display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--ts-border); border-radius: 9px; color: var(--ts-accent); background: var(--ts-accent-soft); font-size: 18px; }
.ts-target-empty strong { display: block; font-size: 12px; }
.ts-target-empty p { margin: 3px 0 0; color: var(--ts-muted); font-size: 10px; line-height: 1.4; }
.ts-target-head { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; align-items: center; }
.ts-target-identity { min-width: 0; }
.ts-target-eyebrow { display: flex; gap: 6px; align-items: center; color: var(--ts-dim); font-size: 9px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.ts-target-eyebrow span + span::before { content: '·'; margin-right: 6px; }
.ts-target-title { margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ts-text); font-size: 15px; font-weight: 780; line-height: 1.25; }
.ts-target-picked { margin-top: 2px; color: var(--ts-muted); font-size: 10px; }
.ts-target-tools { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
.ts-target-tools .ts-btn { min-height: 30px; padding: 5px 8px; font-size: 10px; }
.ts-target-tools .ts-btn-icon { width: 30px; padding: 0; }
.ts-target-head-meta { display:flex; align-items:center; justify-content:flex-end; gap:5px; flex-wrap:wrap; color:var(--ts-muted); font-size:9px; }
.ts-target-head-meta .ts-btn { min-height:27px; padding:4px 7px; font-size:9px; }
.ts-read-style { border-color:color-mix(in srgb,var(--ts-accent) 45%,var(--ts-border)); background:var(--ts-accent-soft); }
.ts-guide-toggle[aria-pressed="true"] { border-color: var(--ts-accent); background: var(--ts-accent-soft); color: var(--ts-text); }
.ts-picking-banner { display: flex; align-items: baseline; gap: 7px; margin: 9px -2px 0; border-radius: 6px; padding: 6px 8px; background: var(--ts-accent-soft); color: var(--ts-muted); font-size: 10px; line-height: 1.35; }
.ts-picking-banner strong { flex: none; color: var(--ts-text); }
.ts-target-ladder { display: flex; align-items: center; gap: 3px; margin-top: 9px; padding: 4px; overflow-x: auto; border: 1px solid var(--ts-border); border-radius: 7px; background: var(--lumiverse-fill-subtle, rgba(0,0,0,.1)); scrollbar-width: thin; }
.ts-target-chevron { flex: none; color: var(--ts-dim); font-size: 11px; }
.ts-target-crumb { appearance: none; flex: none; display: inline-flex; align-items: center; gap: 4px; min-height: 26px; max-width: 170px; border: 0; border-radius: 5px; padding: 4px 7px; background: transparent; color: var(--ts-muted); cursor: pointer; font: inherit; font-size: 10px; }
.ts-target-crumb:hover { background: var(--ts-hover); color: var(--ts-text); }
.ts-target-crumb[aria-pressed="true"] { background: var(--ts-elevated); color: var(--ts-text); box-shadow: var(--lumiverse-highlight-inset, inset 0 0 0 1px rgba(255,255,255,.07)); }
.ts-target-crumb span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ts-target-crumb b { display: inline-grid; place-items: center; min-width: 16px; height: 16px; border-radius: 99px; padding: 0 4px; background: var(--ts-accent-soft); color: var(--ts-text); font-size: 8px; }
.ts-target-crumb i { color: var(--ts-accent); font-size: 10px; font-style: normal; }
.ts-target-scope { display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 6px 8px; align-items: center; margin-top: 9px; }
.ts-target-scope > label { color: var(--ts-dim); font-size: 9px; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }
.ts-target-scope .ts-input { min-width: 0; height: 31px; padding-block: 4px; font-size: 10px; }
.ts-target-badges { display: flex; align-items: center; gap: 6px; color: var(--ts-muted); font-size: 9px; white-space: nowrap; }
.ts-target-badges .ts-chip { color: var(--ts-text); }
.ts-target-warning { margin-top: 8px; padding: 6px 8px; border-radius: 6px; background: color-mix(in srgb, var(--lumiverse-warning, #f59e0b) 9%, transparent); }
.ts-target-suggestion { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px; align-items: center; margin-top: 8px; border: 1px solid var(--ts-border); border-radius: 7px; padding: 7px 8px; color: var(--ts-muted); font-size: 10px; line-height: 1.35; }
.ts-target-suggestion .ts-btn { min-height: 28px; padding-block: 4px; font-size: 10px; }
.ts-target-details { margin-top: 8px; border-top: 1px solid var(--ts-border); }
.ts-target-details > summary { cursor: pointer; padding: 8px 1px 1px; color: var(--ts-dim); font-size: 9px; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; list-style-position: inside; }
.ts-target-details[open] > summary { color: var(--ts-muted); }
.ts-target-details-body { padding-top: 7px; }
.ts-target-detail-row { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: baseline; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--ts-border); color: var(--ts-muted); font-size: 10px; }
.ts-target-detail-row strong { color: var(--ts-text); }
.ts-target-detail-row small { color: var(--ts-dim); font-size: 9px; text-transform: uppercase; }
.ts-selected-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.ts-selected-name { font-weight: 750; font-size: 14px; line-height: 1.3; }
.ts-breadcrumb { display: flex; flex-wrap: wrap; gap: 4px; color: var(--ts-muted); font-size: 11px; margin-top: 3px; }
.ts-breadcrumb span + span::before { content: '›'; margin-right: 4px; color: var(--ts-dim); }
.ts-source-row { display: flex; gap: 5px; margin-top: 7px; }
.ts-chip { display: inline-flex; align-items: center; border: 1px solid var(--ts-border); border-radius: 99px; padding: 2px 6px; color: var(--ts-muted); font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
.ts-selector { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--ts-border); }
.ts-context { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--ts-border); }
.ts-selector-code { display: block; margin: 5px 0 7px; padding: 7px 8px; border-radius: 5px; background: var(--lumiverse-bg-deep, #0e0b16); color: var(--lumiverse-primary-text, #d2b7ff); font-family: var(--lumiverse-font-mono, monospace); font-size: 11px; overflow-wrap: anywhere; user-select: all; }
.ts-meta { display: flex; flex-wrap: wrap; gap: 6px 12px; color: var(--ts-muted); font-size: 11px; }
.ts-meta strong { color: var(--ts-text); font-weight: 650; }
.ts-boost-role-meta { margin-top:8px; padding-top:8px; border-top:1px solid var(--ts-border); }
.ts-warning { margin-top: 7px; color: var(--lumiverse-warning, #f59e0b); font-size: 11px; line-height: 1.35; }
.ts-actions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 9px; }
.ts-btn { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 32px; border: 1px solid var(--ts-border); border-radius: var(--lumiverse-radius-sm, 6px); padding: 6px 10px; background: var(--lumiverse-fill-subtle, rgba(0,0,0,.12)); color: var(--ts-text); cursor: pointer; font: inherit; font-size: 12px; }
.ts-btn:hover:not(:disabled) { border-color: var(--lumiverse-border-hover, var(--ts-accent)); background: var(--ts-hover); }
.ts-btn:focus-visible { outline: 2px solid var(--ts-accent); outline-offset: 2px; }
.ts-btn-primary { background:var(--ts-accent-soft); border-color:var(--ts-accent); color:var(--ts-text); font-weight:700; box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ts-accent) 12%,transparent); }
.ts-btn-primary:hover:not(:disabled) { background:color-mix(in srgb,var(--ts-accent) 24%,var(--ts-surface)); border-color:var(--ts-accent); color:var(--ts-text); }
.ts-btn-danger { color: var(--lumiverse-danger, #ef4444); }
.ts-btn-icon { width: 32px; padding: 0; }
.ts-btn-block { width: 100%; }
.ts-btn:disabled { opacity: .42; cursor: not-allowed; }
.ts-empty { text-align: center; padding: 22px 12px; color: var(--ts-muted); line-height: 1.5; }
.ts-packet { padding: 0; overflow: hidden; margin-bottom: 9px; }
.ts-packet-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 11px; border-bottom: 1px solid var(--ts-border); background: var(--lumiverse-fill-subtle, rgba(0,0,0,.1)); }
.ts-packet-title { font-weight: 700; }
.ts-packet-summary { color: var(--ts-muted); font-size: 11px; }
.ts-packet-body { padding: 11px; }
.ts-segment { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 3px; border: 1px solid var(--ts-border); border-radius: 7px; background: var(--lumiverse-fill-subtle, rgba(0,0,0,.12)); }
.ts-segment-three { grid-template-columns: repeat(3, 1fr); }
.ts-segment button { border: 0; border-radius: 5px; padding: 7px; background: transparent; color: var(--ts-muted); font: inherit; cursor: pointer; }
.ts-segment button[aria-pressed="true"] { color: var(--ts-text); background: var(--ts-elevated); box-shadow: var(--lumiverse-shadow-sm, 0 2px 8px rgba(0,0,0,.2)); }
.ts-field { margin-top: 12px; }
.ts-label { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 6px; color: var(--ts-muted); font-size: 11px; font-weight: 650; }
.ts-color-row { display: grid; grid-template-columns: 64px minmax(0,1fr); gap: 8px; align-items: center; }
.ts-color-picker { display:grid; grid-template-columns:30px auto; gap:5px; align-items:center; min-height:34px; border:1px solid var(--ts-border); border-radius:7px; padding:2px 6px 2px 2px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); color:var(--ts-muted); cursor:pointer; font-size:8px; font-weight:760; letter-spacing:.04em; text-transform:uppercase; }
.ts-color-picker:hover { border-color:color-mix(in srgb,var(--ts-accent) 55%,var(--ts-border)); color:var(--ts-text); }
.ts-color { width:30px; height:28px; padding:1px; border:0; border-radius:5px; background:transparent; cursor:pointer; }
.ts-color::-webkit-color-swatch-wrapper { padding:0; }
.ts-color::-webkit-color-swatch { border:1px solid color-mix(in srgb,var(--ts-text) 16%,transparent); border-radius:4px; }
.ts-color::-moz-color-swatch { border:1px solid color-mix(in srgb,var(--ts-text) 16%,transparent); border-radius:4px; }
.ts-range { width: 100%; accent-color: var(--ts-accent); }
.ts-range-row { display: grid; grid-template-columns: minmax(0,1fr) 72px; gap: 8px; align-items: center; }
.ts-check { display: flex; align-items: center; gap: 7px; margin-top: 12px; color: var(--ts-muted); font-size: 11px; }
.ts-box-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
.ts-box-grid .ts-label { display: grid; gap: 5px; }
.ts-corner-grid { position:relative; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); grid-template-areas:"tl tr" "bl br"; gap:22px 18px; margin:10px 0 12px; padding:4px; }
.ts-corner-field { position:relative; z-index:1; display:grid; gap:5px; color:var(--ts-muted); font-size:9px; }
.ts-corner-field > span { font-size:8px; font-weight:720; letter-spacing:.03em; }
.ts-corner-tl { grid-area:tl; text-align:left; }
.ts-corner-tr { grid-area:tr; text-align:right; }
.ts-corner-bl { grid-area:bl; text-align:left; }
.ts-corner-br { grid-area:br; text-align:right; }
.ts-corner-tr .ts-number,.ts-corner-br .ts-number { text-align:right; }
.ts-corner-diagram { position:absolute; left:50%; top:50%; width:34px; height:34px; translate:-50% -50%; border:1px solid color-mix(in srgb,var(--ts-accent) 46%,var(--ts-border)); border-radius:8px; background:color-mix(in srgb,var(--ts-accent-soft) 48%,transparent); box-shadow:inset 0 0 0 4px color-mix(in srgb,var(--ts-elevated) 82%,transparent); pointer-events:none; }
.ts-stop-block { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--ts-border); }
.ts-stop-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.ts-stop-remove { width:24px; height:24px; min-height:24px; opacity:.72; }
.ts-gradient-actions { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:10px; padding-top:8px; border-top:1px dashed var(--ts-border); color:var(--ts-dim); font-size:9px; }
.ts-layout-parent-context { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; margin-top:9px; padding:8px 9px; border:1px solid var(--ts-border); border-radius:8px; background:color-mix(in srgb,var(--ts-elevated) 62%,transparent); }
.ts-layout-parent-context > div { display:grid; gap:2px; min-width:0; }
.ts-layout-parent-context strong { font-size:10px; color:var(--ts-text); }
.ts-layout-parent-context small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-dim); font-size:8px; }
.ts-warning .ts-warning-action { margin-left:7px; min-height:24px; padding:3px 7px; color:inherit; border-color:currentColor; }
.ts-generic-selector-suggestion code { font-size:.92em; color:var(--ts-text); }
.ts-style-menu { margin-top: 8px; padding: 0 0 10px; overflow: hidden; }
.ts-style-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; padding: 8px 10px 2px; }
.ts-state-row { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 4px; margin-bottom: 8px; }
.ts-state-row .ts-btn { min-width: 0; padding-inline: 3px; font-size: 10px; }
.ts-state-row .ts-btn[aria-pressed="true"] { border-color: var(--ts-accent); background: var(--ts-accent-soft); }
.ts-dimension-row { display: grid; grid-template-columns: minmax(0,1fr); gap: 7px; align-items:center; }
.ts-dimension-row.is-fixed { grid-template-columns: 86px minmax(70px,1fr) minmax(104px,118px); }
.ts-dimension-row > :only-child { grid-column: 1 / -1; }
.ts-dimension-slider { min-width:0; }
.ts-gradient-preview { height: 72px; border: 1px solid var(--ts-border); border-radius: 7px; margin-top: 10px; }
.ts-stop { display: grid; grid-template-columns: 38px 1fr 72px; gap: 7px; align-items: center; margin-top: 8px; }
.ts-stop .ts-color-picker { grid-template-columns:26px auto; min-height:32px; padding-right:5px; }
.ts-stop .ts-color { width:26px; height:26px; }
.ts-resource-tabs { display: grid; grid-template-columns: repeat(3,1fr); gap: 4px; margin-bottom: 8px; }
.ts-resource-tabs .ts-btn { padding-inline: 4px; font-size: 11px; }
.ts-resource-tabs .ts-btn[aria-pressed="true"] { border-color: var(--ts-accent); background: var(--ts-accent-soft); }
.ts-resource-list { max-height: 330px; overflow: auto; border: 1px solid var(--ts-border); border-radius: 7px; }
.ts-group-title { position: sticky; top: 0; z-index: 1; padding: 7px 9px; background: var(--lumiverse-bg-deep, #0e0b16); color: var(--ts-dim); font-size: 9px; font-weight: 750; letter-spacing: .09em; text-transform: uppercase; }
.ts-list-item { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 9px; border: 0; border-top: 1px solid var(--ts-border); background: var(--ts-elevated); color: var(--ts-text); text-align: left; font: inherit; cursor: pointer; }
.ts-list-item:hover { background: var(--ts-hover); }
.ts-list-primary { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.ts-list-secondary { color: var(--ts-muted); font-size: 10px; overflow-wrap: anywhere; }
.ts-variable { display: block; padding: 9px; border-top: 1px solid var(--ts-border); background: var(--ts-elevated); }
.ts-variable code { display: block; color: var(--lumiverse-primary-text, #d2b7ff); font-size: 11px; overflow-wrap: anywhere; }
.ts-variable span { display: block; margin-top: 4px; color: var(--ts-muted); font-size: 10px; overflow-wrap: anywhere; }
.ts-code-label { display: flex; align-items: center; justify-content: space-between; margin: 0 0 6px; }
.ts-code { width: 100%; min-height: 260px; resize: vertical; white-space: pre; tab-size: 2; font-family: var(--lumiverse-font-mono, monospace); font-size: 11px; line-height: 1.5; }
.ts-code[readonly] { color: var(--lumiverse-primary-text, #d2b7ff); background: var(--lumiverse-bg-deep, #0e0b16); }
.ts-status-ok { color: var(--lumiverse-success, #22c55e); font-size: 10px; }
.ts-status-error { color: var(--lumiverse-danger, #ef4444); font-size: 10px; }
.ts-project-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; margin-top: 8px; }
.ts-capability { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--ts-border); }
.ts-capability:last-child { border-bottom: 0; }
.ts-capability span:last-child { color: var(--ts-muted); font-size: 10px; text-transform: uppercase; }
.ts-note { color: var(--ts-muted); font-size: 11px; line-height: 1.45; }
.ts-utility-note { margin: 0 0 8px; color: var(--ts-muted); font-size: 10px; line-height: 1.45; }


/* UI-maxxed target parts + semantic editing surfaces */
.ts-target-parts { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 7px; align-items: center; margin-top: 7px; }
.ts-target-parts-label, .ts-target-surface > span { color: var(--ts-dim); font-size: 9px; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }
.ts-target-parts-scroll { display: flex; gap: 5px; min-width: 0; overflow-x: auto; padding: 2px 1px; scrollbar-width: thin; }
.ts-part-chip { appearance: none; flex: none; max-width: 160px; min-height: 27px; border: 1px solid var(--ts-border); border-radius: 99px; padding: 4px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: var(--lumiverse-fill-subtle, rgba(0,0,0,.1)); color: var(--ts-muted); cursor: pointer; font: inherit; font-size: 10px; }
.ts-part-chip:hover { border-color: var(--lumiverse-border-hover, var(--ts-accent)); color: var(--ts-text); }
.ts-part-chip[aria-pressed="true"] { border-color: var(--ts-accent); background: var(--ts-accent-soft); color: var(--ts-text); }
.ts-target-surface { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 8px; align-items: center; margin-top: 8px; }
.ts-target-surface .ts-segment { min-width: 0; }
.ts-target-surface-label { display: inline-flex; margin-left: 6px; border: 1px solid var(--ts-border); border-radius: 99px; padding: 1px 6px; color: var(--ts-muted); font-size: 9px; font-weight: 650; vertical-align: 2px; }
.ts-target-surface-note { margin-top: 6px; border-left: 2px solid var(--ts-border); padding: 2px 0 2px 8px; color: var(--ts-muted); font-size: 10px; line-height: 1.4; }

/* Packet cockpit */
.ts-packet { padding: 0; overflow: hidden; margin-bottom: 9px; }
.ts-packet-head { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 5px; align-items: stretch; padding: 0; border-bottom: 1px solid var(--ts-border); background: var(--lumiverse-fill-subtle, rgba(0,0,0,.1)); }
.ts-packet.is-collapsed .ts-packet-head { border-bottom: 0; }
.ts-packet-toggle { appearance: none; display: grid; grid-template-columns: 30px minmax(0,1fr) auto; gap: 8px; align-items: center; min-width: 0; border: 0; padding: 9px 8px 9px 10px; background: transparent; color: inherit; cursor: pointer; text-align: left; font: inherit; }
.ts-packet-toggle:hover { background: var(--ts-hover); }
.ts-packet-icon { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid var(--ts-border); border-radius: 8px; background: var(--ts-accent-soft); color: var(--ts-accent); font-size: 13px; font-weight: 750; }
.ts-packet-copy { display: grid; min-width: 0; gap: 2px; }
.ts-packet-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ts-text); font-weight: 720; }
.ts-packet-summary { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ts-muted); font-size: 10px; }
.ts-packet-chevron { color: var(--ts-dim); font-size: 11px; transform: rotate(0deg); transition: transform .12s ease; }
.ts-packet.is-collapsed .ts-packet-chevron { transform: rotate(-90deg); }
.ts-packet-remove { align-self: center; margin-right: 7px; width: 28px; min-height: 28px; }
.ts-packet-body { padding: 11px; }
.ts-advanced { margin-top: 11px; border-top: 1px solid var(--ts-border); }
.ts-advanced > summary { cursor: pointer; padding: 9px 0 1px; color: var(--ts-dim); font-size: 10px; font-weight: 700; }
.ts-advanced[open] > summary { color: var(--ts-muted); }

/* Capability picker */
.ts-style-menu { margin-top: 8px; padding: 0; overflow: hidden; }
.ts-style-group + .ts-style-group { border-top: 1px solid var(--ts-border); }
.ts-style-menu .ts-group-title { position: static; padding: 8px 10px 5px; background: transparent; }
.ts-style-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; padding: 3px 9px 9px; }
.ts-style-option { appearance: none; display: grid; grid-template-columns: 30px minmax(0,1fr); gap: 8px; align-items: center; min-width: 0; min-height: 48px; border: 1px solid var(--ts-border); border-radius: 7px; padding: 7px; background: var(--lumiverse-fill-subtle, rgba(0,0,0,.08)); color: var(--ts-text); cursor: pointer; text-align: left; font: inherit; }
.ts-style-option:hover:not(:disabled) { border-color: var(--lumiverse-border-hover, var(--ts-accent)); background: var(--ts-hover); }
.ts-style-option:disabled { opacity: .38; cursor: not-allowed; }
.ts-style-icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 7px; background: var(--ts-accent-soft); color: var(--ts-accent); font-size: 12px; font-weight: 750; }
.ts-style-option strong, .ts-style-option small { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.ts-style-option strong { font-size: 11px; white-space: nowrap; }
.ts-style-option small { margin-top: 2px; color: var(--ts-muted); font-size: 9px; line-height: 1.25; }

/* Compact sizing */
.ts-size-primary { display: grid; gap: 2px; }
.ts-primary-size { margin-top: 10px; }
.ts-primary-dimension { display: grid; grid-template-columns: minmax(0,1fr); gap: 7px; align-items: center; }
.ts-primary-dimension.is-fixed { grid-template-columns: 86px minmax(70px,1fr) minmax(104px,118px); }
.ts-size-mode { height: 34px; }
.ts-size-slider { min-width: 0; }
.ts-value-unit { display: grid; grid-template-columns: minmax(54px,1fr) 52px; min-width: 0; border: 1px solid var(--ts-border); border-radius: var(--lumiverse-radius-sm, 6px); background: var(--lumiverse-fill-subtle, rgba(0,0,0,.12)); overflow: hidden; }
.ts-value-unit:focus-within { border-color: var(--ts-accent); box-shadow: 0 0 0 2px var(--ts-accent-soft); }
.ts-value-unit .ts-number, .ts-value-unit .ts-input { height: 32px; border: 0; border-radius: 0; padding: 6px 7px; background: transparent; box-shadow: none; }
.ts-value-unit .ts-input { border-left: 1px solid var(--ts-border); padding-inline: 5px; }
.ts-slider-hint { margin: 4px 0 0; font-size: 9px; }
.ts-boundary-field { margin-top: 14px; padding-top: 11px; border-top: 1px solid var(--ts-border); }
.ts-mobile-safe { align-items: flex-start; }
.ts-mobile-safe > span { margin-left: auto; color: var(--ts-dim); font-size: 9px; text-align: right; }

/* Color memory */
.ts-recent { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 8px; align-items: center; margin-top: 6px; }
.ts-recent > span { color: var(--ts-dim); font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
.ts-recent-swatches { display: flex; gap: 5px; min-width: 0; overflow-x: auto; padding: 1px; scrollbar-width: none; }
.ts-recent-swatches::-webkit-scrollbar { display: none; }
.ts-recent-swatch { appearance: none; flex: 0 0 19px; width: 19px; height: 19px; border: 1px solid color-mix(in srgb, var(--ts-text) 22%, var(--ts-border)); border-radius: 99px; background: var(--ts-recent); box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); cursor: pointer; }
.ts-recent-swatch:hover { transform: scale(1.12); }

/* Typography */
.ts-font-strip { display: flex; gap: 6px; min-width: 0; overflow-x: auto; padding: 2px 1px 4px; scrollbar-width: thin; }
.ts-font-sample { appearance: none; flex: 0 0 74px; display: grid; place-items: center; gap: 2px; min-height: 54px; border: 1px solid var(--ts-border); border-radius: 7px; padding: 5px; background: var(--lumiverse-fill-subtle, rgba(0,0,0,.08)); color: var(--ts-text); cursor: pointer; font: inherit; }
.ts-font-sample:hover { background: var(--ts-hover); }
.ts-font-sample[aria-pressed="true"] { border-color: var(--ts-accent); background: var(--ts-accent-soft); }
.ts-font-sample span { font-size: 18px; line-height: 1; }
.ts-font-sample small { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ts-muted); font-size: 8px; text-align: center; }
.ts-font-select { margin-top: 7px; }
.ts-inline-fields { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }

/* Image treatment */
.ts-image-preview { display: flex; justify-content: space-between; gap: 10px; align-items: center; border: 1px solid var(--ts-border); border-radius: 7px; padding: 8px 9px; background: linear-gradient(110deg, var(--ts-accent-soft), transparent); color: var(--ts-muted); font-size: 10px; }
.ts-image-preview strong { color: var(--ts-text); font-size: 10px; text-align: right; }
.ts-segment-four { grid-template-columns: repeat(4, 1fr); }
.ts-segment-five { grid-template-columns: repeat(5, 1fr); }
.ts-segment-five button { min-width: 0; padding-inline: 3px; font-size: 9px; }
.ts-fade-grid { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 5px; }
.ts-fade-grid button { appearance: none; min-height: 34px; border: 1px solid var(--ts-border); border-radius: 6px; background: var(--lumiverse-fill-subtle, rgba(0,0,0,.1)); color: var(--ts-muted); cursor: pointer; font: inherit; }
.ts-fade-grid button[aria-pressed="true"] { border-color: var(--ts-accent); background: var(--ts-accent-soft); color: var(--ts-text); }

.ts-fade-grid-five { grid-template-columns: repeat(5,minmax(0,1fr)); }
.ts-mask-effects { gap:10px; }
.ts-mask-effects .ts-magic-head span { color:var(--ts-muted); font-size:8px; }
.ts-mask-modes { margin-top:0; }
.ts-mask-clear-note { display:grid; gap:3px; padding:9px 10px; border:1px solid color-mix(in srgb,var(--ts-accent) 34%,var(--ts-border)); border-radius:7px; background:color-mix(in srgb,var(--ts-accent-soft) 24%,transparent); }
.ts-mask-clear-note strong { font-size:10px; color:var(--ts-text); }
.ts-mask-clear-note span { font-size:8px; line-height:1.35; color:var(--ts-muted); }
.ts-mask-preview { display:grid; grid-template-columns:auto minmax(0,1fr); gap:9px; align-items:center; color:var(--ts-muted); font-size:8px; }
.ts-mask-preview i { display:block; min-height:54px; border:1px solid var(--ts-border); border-radius:7px; background:linear-gradient(135deg,color-mix(in srgb,var(--ts-accent) 78%,#fff),color-mix(in srgb,var(--ts-accent) 34%,#111)); box-shadow:inset 0 0 0 1px rgba(255,255,255,.03); }
.ts-mask-layer { display:grid; gap:7px; padding:9px; border:1px solid var(--ts-border); border-radius:8px; background:color-mix(in srgb,var(--ts-surface) 76%,transparent); }
.ts-mask-layer-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.ts-mask-layer-head strong { font-size:9px; color:var(--ts-text); }
.ts-mask-layer-head .ts-check { margin:0; }
.ts-mask-layer .ts-range-field { margin-top:0; }

/* Position + layer */
.ts-position-modes { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; }
.ts-position-modes button { appearance: none; display: grid; gap: 2px; min-width: 0; border: 1px solid var(--ts-border); border-radius: 7px; padding: 7px 8px; background: var(--lumiverse-fill-subtle, rgba(0,0,0,.08)); color: var(--ts-text); cursor: pointer; text-align: left; font: inherit; }
.ts-position-modes button:last-child { grid-column: 1 / -1; }
.ts-position-modes button[aria-pressed="true"] { border-color: var(--ts-accent); background: var(--ts-accent-soft); }
.ts-position-modes small { color: var(--ts-muted); font-size: 9px; }
.ts-offset-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 6px; margin-top: 12px; }
.ts-offset-grid label { display: grid; gap: 4px; color: var(--ts-dim); font-size: 9px; text-transform: uppercase; }
.ts-offset-grid .ts-number { padding-inline: 5px; }

/* Boost is a set of independent app-wide layers */
.ts-boost-heading { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
.ts-boost-heading .ts-kicker { margin-bottom: 3px; }
.ts-boost-heading .ts-note { margin: 0; }
.ts-boost-card + .ts-boost-card { margin-top: 8px; }
.ts-boost-card { padding: 10px; }
.ts-boost-card-head { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; align-items: center; }
.ts-boost-card-head strong, .ts-boost-card-head small { display: block; }
.ts-boost-card-head strong { font-size: 12px; }
.ts-boost-card-head small { margin-top: 2px; color: var(--ts-muted); font-size: 9px; }
.ts-switch { position: relative; display: inline-flex; width: 34px; height: 20px; cursor: pointer; }
.ts-switch input { position: absolute; opacity: 0; pointer-events: none; }
.ts-switch span { width: 100%; border: 1px solid var(--ts-border); border-radius: 99px; background: var(--lumiverse-fill-subtle, rgba(0,0,0,.18)); transition: background .12s ease, border-color .12s ease; }
.ts-switch span::after { content: ''; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: var(--ts-muted); transition: transform .12s ease, background .12s ease; }
.ts-switch input:checked + span { border-color: var(--ts-accent); background: var(--ts-accent-soft); }
.ts-switch input:checked + span::after { transform: translateX(14px); background: var(--ts-accent); }
.ts-switch input:focus-visible + span { outline: 2px solid var(--ts-accent); outline-offset: 2px; }
.ts-boost-card > .ts-segment, .ts-boost-card > .ts-field, .ts-boost-card > .ts-note, .ts-boost-card > .ts-advanced { margin-top: 10px; }
.ts-boost-actions { padding-top: 2px; }


/* Sticky inspect workbar: global tools stay reachable while packet-editing. */
.ts-workbar { position: sticky; top: 0; z-index: 30; display: flex; justify-content: space-between; gap: 7px; margin: -12px -12px 10px; padding: 8px 12px; border-bottom: 1px solid var(--ts-border); background: color-mix(in srgb, var(--ts-surface) 88%, transparent); backdrop-filter: blur(14px) saturate(1.15); -webkit-backdrop-filter: blur(14px) saturate(1.15); box-shadow: 0 8px 18px rgba(0,0,0,.08); }
.ts-workbar-group { display: flex; align-items: center; gap: 5px; min-width: 0; }
.ts-workbar .ts-btn { min-height: 31px; padding: 5px 8px; font-size: 10px; }
.ts-workbar .ts-btn-icon { width: 31px; padding: 0; }
.ts-guide-mode { width: 92px; height: 31px; padding-block: 4px; font-size: 10px; }
.ts-guide-toggle[aria-pressed="true"] { border-color: var(--ts-accent); background: var(--ts-accent-soft); color: var(--ts-text); }
.ts-hide-toggle[aria-pressed="true"] { border-color: color-mix(in srgb, var(--lumiverse-danger, #ef6a75) 55%, var(--ts-border)); color: var(--lumiverse-danger, #ef6a75); }
.ts-picking-banner-sticky { margin: -4px 0 10px; }

/* Target card is identity + navigation; global inspect tools live above it. */
.ts-target-head { grid-template-columns: minmax(0,1fr) auto; align-items: start; }
.ts-target-head-meta { align-self: center; color: var(--ts-dim); font-size: 9px; white-space: nowrap; }
.ts-target-ladder { scrollbar-width: none; }
.ts-target-ladder::-webkit-scrollbar { display: none; width: 0; height: 0; }
.ts-target-parts-disclosure { margin-top: 7px; border-top: 1px solid var(--ts-border); border-bottom: 1px solid var(--ts-border); }
.ts-target-parts-disclosure > summary { display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 8px; align-items: center; min-height: 34px; padding: 5px 2px; cursor: pointer; list-style: none; }
.ts-target-parts-disclosure > summary::-webkit-details-marker { display: none; }
.ts-target-parts-disclosure > summary > span { color: var(--ts-dim); font-size: 9px; font-weight: 750; text-transform: uppercase; letter-spacing: .07em; }
.ts-target-parts-disclosure > summary > strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ts-text); font-size: 10px; }
.ts-target-parts-disclosure > summary > small { color: var(--ts-dim); font-size: 9px; }
.ts-target-parts-disclosure[open] > summary { margin-bottom: 3px; }
.ts-target-parts-disclosure .ts-target-parts-scroll { padding: 3px 0 8px; scrollbar-width: none; }
.ts-target-parts-disclosure .ts-target-parts-scroll::-webkit-scrollbar { display:none; width:0; height:0; }
.ts-target-controls { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(0,.95fr); gap: 8px; margin-top: 8px; }
.ts-target-message-side { grid-column:1 / -1; display:grid; grid-template-columns:auto minmax(0,1fr); gap:8px; align-items:center; border:1px solid var(--ts-border); border-radius:7px; padding:6px 7px; background:color-mix(in srgb, var(--ts-elevated) 88%, transparent); }
.ts-target-message-side > span { color:var(--ts-dim); font-size:9px; font-weight:750; letter-spacing:.07em; text-transform:uppercase; }
.ts-target-message-side .ts-segment { min-width:0; }
.ts-target-controls .ts-target-surface, .ts-target-controls .ts-target-scope { display: grid; grid-template-columns: 1fr; gap: 5px; align-content: start; margin: 0; }
.ts-target-controls .ts-target-surface > span, .ts-target-controls .ts-target-scope > label { color: var(--ts-dim); font-size: 9px; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }
.ts-target-controls .ts-target-scope .ts-input { grid-column: auto; grid-row: auto; height: 31px; min-width: 0; }

/* Typeface rails are intentionally scrollbarless and dimension-stable in Chromium. */
.ts-font-strip { overflow-x: auto; overflow-y: hidden; padding: 2px 1px 5px; scrollbar-width: none; -ms-overflow-style: none; overscroll-behavior-inline: contain; }
.ts-font-strip::-webkit-scrollbar { display: none; width: 0; height: 0; }
.ts-type-size { max-width: 170px; }
.ts-image-move { margin-top: 11px; padding-top: 10px; border-top: 1px solid var(--ts-border); }
.ts-image-move .ts-field { margin: 0; }
.ts-visibility-modes { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 6px; }
.ts-visibility-modes button { appearance:none; display:grid; gap:2px; min-width:0; border:1px solid var(--ts-border); border-radius:7px; padding:8px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); color:var(--ts-text); cursor:pointer; font:inherit; text-align:left; }
.ts-visibility-modes button[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); }
.ts-visibility-modes small { color:var(--ts-muted); font-size:8px; line-height:1.25; }
.ts-visibility-modes strong { font-size:10px; }

/* Themes → common-part jump pad. */
.ts-section-heading { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
.ts-section-heading .ts-note { margin:3px 0 0; }
.ts-quick-parts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin-top:8px; }
.ts-quick-part { appearance:none; display:grid; grid-template-columns:30px minmax(0,1fr); grid-template-rows:auto auto; gap:1px 8px; align-items:center; min-width:0; border:1px solid var(--ts-border); border-radius:8px; padding:8px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); color:var(--ts-text); cursor:pointer; text-align:left; font:inherit; }
.ts-quick-part:hover { border-color:var(--lumiverse-border-hover,var(--ts-accent)); background:var(--ts-hover); }
.ts-quick-part > span { grid-row:1 / 3; display:grid; place-items:center; width:30px; height:30px; border-radius:7px; background:var(--ts-accent-soft); color:var(--ts-accent); font-weight:750; }
.ts-quick-part strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; }
.ts-quick-part small { color:var(--ts-dim); font-size:8px; }

/* Dynamic on-page geometry guides. */
[data-theme-studio-inspector="guide-layer"] { position:fixed; inset:0; z-index:2147483642; pointer-events:none; overflow:visible; }
[data-theme-studio-inspector="guide-layer"] [data-guide-kind] { position:fixed; box-sizing:border-box; pointer-events:none; }
[data-theme-studio-inspector="guide-layer"] [data-guide-kind] > span { position:absolute; top:3px; left:3px; max-width:min(360px,70vw); padding:2px 5px; border-radius:4px; background:rgba(10,10,14,.88); color:#fff; font:9px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace; white-space:nowrap; box-shadow:0 1px 5px rgba(0,0,0,.35); }
[data-guide-kind="margin"] { outline:1px dashed #f0a44b; background:rgba(240,164,75,.08); }
[data-guide-kind="border"] { outline:2px solid #f264b8; }
[data-guide-kind="padding"] { outline:1px dashed #7ac97b; background:rgba(122,201,123,.08); }
[data-guide-kind="content"] { outline:1px solid #55bce8; background:rgba(85,188,232,.06); }
[data-guide-kind="containing-block"] { outline:1px dashed rgba(191,161,255,.85); background:rgba(191,161,255,.035); }
[data-guide-kind="size"] { outline:2px solid #55bce8; background:rgba(85,188,232,.04); }
[data-guide-kind="dimension-x"] { border-top:1px dashed rgba(85,188,232,.85); }
[data-guide-kind="dimension-y"] { border-left:1px dashed rgba(85,188,232,.85); }
[data-guide-kind="layout-parent"] { outline:2px solid rgba(191,161,255,.9); background:rgba(191,161,255,.035); }
[data-guide-kind="layout-child"] { outline:1px dashed rgba(255,255,255,.38); background:rgba(255,255,255,.018); }
[data-guide-kind="layout-selected-child"] { outline:2px solid #55bce8; background:rgba(85,188,232,.07); }
[data-guide-kind="grid-line-x"] { border-left:1px dashed rgba(122,201,123,.85); }
[data-guide-kind="grid-line-y"] { border-top:1px dashed rgba(122,201,123,.85); }
[data-guide-kind="flex-gap"] { background:rgba(240,164,75,.10); outline:1px dashed rgba(240,164,75,.72); }
[data-guide-kind="flex-gap"] > span { top:50%; left:50%; transform:translate(-50%,-50%); }
[data-guide-kind="flex-axis"] { background:rgba(240,164,75,.95); box-shadow:0 0 0 1px rgba(0,0,0,.25); }
[data-guide-kind="flex-axis"][data-axis="row"] { height:1px!important; }
[data-guide-kind="flex-axis"][data-axis="column"] { width:1px!important; }
[data-guide-kind="flex-axis"]::after { content:'›'; position:absolute; color:#f0a44b; font:18px/1 system-ui,sans-serif; text-shadow:0 1px 2px rgba(0,0,0,.6); }
[data-guide-kind="flex-axis"][data-axis="row"]::after { right:-3px; top:-9px; }
[data-guide-kind="flex-axis"][data-axis="column"]::after { bottom:-6px; left:-5px; transform:rotate(90deg); }
[data-guide-kind="flex-axis"][data-reverse="true"]::after { transform:rotate(180deg); }
[data-guide-kind="flex-axis"][data-axis="column"][data-reverse="true"]::after { transform:rotate(-90deg); }

[data-theme-studio-inspector="overlay"] { position: fixed; inset: auto; z-index: 2147483645; pointer-events: none; border: 2px solid var(--lumiverse-primary, #bd69e4); background: color-mix(in srgb, var(--lumiverse-primary, #bd69e4) 13%, transparent); box-shadow: 0 0 0 1px rgba(255,255,255,.6) inset, 0 0 24px color-mix(in srgb, var(--lumiverse-primary, #bd69e4) 25%, transparent); }
[data-theme-studio-inspector="label"] { position: fixed; z-index: 2147483646; pointer-events: none; max-width: min(420px, calc(100vw - 8px)); padding: 4px 7px; border: 1px solid color-mix(in srgb, var(--lumiverse-primary, #bd69e4) 45%, transparent); border-radius: 5px; background: var(--lumiverse-bg-deep, #21142b); color: var(--lumiverse-primary-text, #f5eaff); box-shadow: 0 2px 10px rgba(0,0,0,.5); font: 10px/1.35 var(--lumiverse-font-mono, ui-monospace, monospace); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-theme-studio-inspector="selected-overlay"] { position: fixed; inset: auto; z-index: 2147483643; pointer-events: none; border: 1px solid var(--lumiverse-info, #5dd8ff); background: color-mix(in srgb, var(--lumiverse-info, #5dd8ff) 6%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--lumiverse-info, #5dd8ff) 26%, transparent), 0 0 0 3px color-mix(in srgb, var(--lumiverse-info, #5dd8ff) 7%, transparent); }
[data-theme-studio-inspector="selected-label"] { position: fixed; z-index: 2147483644; pointer-events: none; max-width: min(420px, calc(100vw - 8px)); padding: 4px 7px; border: 1px solid color-mix(in srgb, var(--lumiverse-info, #5dd8ff) 35%, transparent); border-radius: 5px; background: var(--lumiverse-bg-deep, #102a35); color: var(--ts-text, #e8fbff); box-shadow: 0 2px 10px rgba(0,0,0,.5); font: 10px/1.35 var(--lumiverse-font-mono, ui-monospace, monospace); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }


/* Part picker: make "which internal box am I editing?" impossible to miss. */
.ts-part-picker { display:grid; grid-template-columns:minmax(118px,.42fr) minmax(0,1fr); gap:8px; align-items:stretch; margin-top:9px; padding:8px; border:1px solid color-mix(in srgb,var(--ts-accent) 24%,var(--ts-border)); border-radius:8px; background:linear-gradient(120deg,var(--ts-accent-soft),transparent 58%); }
.ts-part-picker-copy { display:grid; align-content:center; gap:2px; min-width:0; }
.ts-part-picker-copy > span { color:var(--ts-text); font-size:10px; font-weight:780; letter-spacing:.055em; text-transform:uppercase; }
.ts-part-picker-copy > small { color:var(--ts-muted); font-size:8px; line-height:1.35; }
.ts-part-browser { min-width:0; }
.ts-part-browser > summary { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:7px; align-items:center; min-height:38px; border:1px solid var(--ts-border); border-radius:7px; padding:6px 8px; background:var(--ts-elevated); cursor:pointer; list-style:none; }
.ts-part-browser > summary::-webkit-details-marker { display:none; }
.ts-part-browser > summary strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; }
.ts-part-browser > summary span { color:var(--ts-dim); font-size:8px; white-space:nowrap; }
.ts-part-browser > summary i { color:var(--ts-accent); font-style:normal; transition:transform .12s ease; }
.ts-part-browser[open] > summary i { transform:rotate(180deg); }
.ts-part-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; max-height:214px; overflow:auto; margin-top:6px; padding:5px; border:1px solid var(--ts-border); border-radius:7px; background:var(--lumiverse-bg-deep,#0e0b16); scrollbar-width:thin; }
.ts-part-grid .ts-part-chip { width:100%; max-width:none; min-height:31px; border-radius:6px; padding:5px 7px; text-align:left; }

/* Font browser: stable box, explicit expand/collapse, no mystery hover scrollbar. */
.ts-font-browser { margin-top:2px; }
.ts-font-browser > summary { display:grid; grid-template-columns:34px minmax(0,1fr) auto auto; gap:8px; align-items:center; min-height:46px; border:1px solid var(--ts-border); border-radius:8px; padding:6px 8px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); cursor:pointer; list-style:none; }
.ts-font-browser > summary::-webkit-details-marker { display:none; }
.ts-font-current-aa { display:grid; place-items:center; width:34px; height:32px; border-radius:7px; background:var(--ts-accent-soft); color:var(--ts-text); font-size:18px; line-height:1; }
.ts-font-browser > summary strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; }
.ts-font-browser > summary small { color:var(--ts-dim); font-size:8px; white-space:nowrap; }
.ts-font-browser > summary i { color:var(--ts-accent); font-style:normal; transition:transform .12s ease; }
.ts-font-browser[open] > summary i { transform:rotate(180deg); }
.ts-font-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:5px; max-height:248px; overflow:auto; margin-top:6px; padding:5px; border:1px solid var(--ts-border); border-radius:8px; background:var(--lumiverse-bg-deep,#0e0b16); scrollbar-gutter:stable; }
.ts-font-grid .ts-font-sample { width:100%; min-width:0; min-height:46px; padding:4px; }
.ts-font-grid .ts-font-sample span { font-size:16px; }
.ts-font-grid .ts-font-sample small { font-size:7px; }

/* Themes → quick-style recipe library. */
.ts-preset-library { --ts-preset-card-bg:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); }
.ts-preset-categories { display:flex; gap:5px; overflow-x:auto; padding:2px 0 5px; scrollbar-width:none; }
.ts-preset-categories::-webkit-scrollbar { display:none; }
.ts-preset-categories button { appearance:none; flex:none; display:inline-flex; align-items:center; gap:5px; min-height:31px; border:1px solid var(--ts-border); border-radius:99px; padding:5px 9px; background:var(--ts-preset-card-bg); color:var(--ts-muted); cursor:pointer; font:inherit; font-size:9px; }
.ts-preset-categories button span { color:var(--ts-accent); }
.ts-preset-categories button[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); color:var(--ts-text); }
.ts-preset-category-copy { display:flex; justify-content:space-between; gap:10px; align-items:baseline; margin:5px 1px 8px; }
.ts-preset-category-copy strong { font-size:11px; }
.ts-preset-category-copy span { color:var(--ts-muted); font-size:9px; text-align:right; }
.ts-preset-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.ts-preset-card { display:grid; grid-template-rows:92px minmax(0,1fr) auto; min-width:0; overflow:hidden; border:1px solid var(--ts-border); border-radius:10px; background:var(--ts-elevated); }
.ts-preset-card:hover { border-color:color-mix(in srgb,var(--ts-accent) 54%,var(--ts-border)); }
.ts-preset-preview { position:relative; overflow:hidden; border-bottom:1px solid var(--ts-border); background:linear-gradient(145deg,color-mix(in srgb,var(--ts-accent-soft) 40%,transparent),var(--lumiverse-bg-deep,#0e0b16)); }
.ts-preset-card-copy { padding:8px 9px 6px; }
.ts-preset-card-copy strong { display:block; font-size:10px; }
.ts-preset-card-copy p { min-height:2.7em; margin:3px 0 5px; color:var(--ts-muted); font-size:8px; line-height:1.35; }
.ts-preset-card-copy span { color:var(--ts-dim); font-size:7px; text-transform:uppercase; letter-spacing:.06em; }
.ts-preset-card > .ts-btn { margin:0 8px 8px; min-height:30px; font-size:9px; }
.ts-preset-preview .ts-preview-avatar { position:absolute; left:13px; top:17px; width:38px; height:38px; border-radius:9px; background:linear-gradient(135deg,#3a637d,#b85a96); box-shadow:inset 0 0 0 1px rgba(255,255,255,.18); }
.ts-preset-preview .ts-preview-name { position:absolute; left:58px; top:17px; max-width:calc(100% - 68px); overflow:hidden; color:var(--ts-text); font-size:11px; font-weight:760; white-space:nowrap; }
.ts-preset-preview .ts-preview-line { position:absolute; left:58px; height:4px; border-radius:99px; background:color-mix(in srgb,var(--ts-text) 22%,transparent); }
.ts-preset-preview .ts-preview-line-a { top:38px; width:58%; }
.ts-preset-preview .ts-preview-line-b { top:48px; width:42%; }
.ts-preset-preview .ts-preview-meta { position:absolute; left:58px; bottom:13px; color:var(--ts-dim); font:6px/1.2 var(--lumiverse-font-mono,monospace); }
.ts-preset-preview[data-preset-preview="avatar-large"] .ts-preview-avatar { width:58px; height:58px; top:15px; border-radius:14px; }
.ts-preset-preview[data-preset-preview="avatar-large"] .ts-preview-name,.ts-preset-preview[data-preset-preview="avatar-large"] .ts-preview-line,.ts-preset-preview[data-preset-preview="avatar-large"] .ts-preview-meta { left:79px; }
.ts-preset-preview[data-preset-preview="avatar-fade"] .ts-preview-avatar { inset:0; width:100%; height:100%; border-radius:0; background:linear-gradient(to bottom,rgba(58,99,125,.95) 0%,rgba(184,90,150,.75) 46%,transparent 100%); }
.ts-preset-preview[data-preset-preview="avatar-fade"] .ts-preview-name { left:50%; top:auto; bottom:25px; max-width:90%; transform:translateX(-50%); font-family:Georgia,serif; font-size:13px; text-align:center; text-shadow:0 1px 5px rgba(0,0,0,.65); }
.ts-preset-preview[data-preset-preview="avatar-fade"] .ts-preview-line { display:none; }
.ts-preset-preview[data-preset-preview="avatar-fade"] .ts-preview-meta { display:block; left:50%; bottom:8px; transform:translateX(-50%); border-radius:99px; padding:3px 6px; background:rgba(0,0,0,.68); color:#eee8f5; white-space:nowrap; }
.ts-preset-preview[data-preset-preview="avatar-halo"] .ts-preview-avatar { border-radius:99px; box-shadow:0 0 0 2px var(--ts-quick-accent,#a98cff),0 0 16px color-mix(in srgb,var(--ts-quick-accent,#8b6cff) 65%,transparent); }
.ts-preset-preview[data-preset-preview="name-serif"] .ts-preview-name { left:14px; top:22px; font-family:Georgia,serif; font-size:24px; }
.ts-preset-preview[data-preset-preview="name-serif"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="name-serif"] .ts-preview-line,.ts-preset-preview[data-preset-preview="name-serif"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="name-gradient"] .ts-preview-name { left:14px; top:23px; font-size:22px; background:linear-gradient(105deg,var(--ts-quick-accent,#f08bd8),var(--ts-quick-text,#8c7bff)); background-clip:text; -webkit-background-clip:text; color:transparent; }
.ts-preset-preview[data-preset-preview="name-gradient"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="name-gradient"] .ts-preview-line,.ts-preset-preview[data-preset-preview="name-gradient"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="name-caps"] .ts-preview-name { left:14px; top:34px; font-size:8px; letter-spacing:2px; text-transform:uppercase; color:var(--ts-muted); }
.ts-preset-preview[data-preset-preview="name-caps"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="name-caps"] .ts-preview-line,.ts-preset-preview[data-preset-preview="name-caps"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="message-prose"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="message-prose"] .ts-preview-name,.ts-preset-preview[data-preset-preview="message-prose"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="message-prose"] .ts-preview-line { left:14px; height:5px; }
.ts-preset-preview[data-preset-preview="message-prose"] .ts-preview-line-a { top:29px; width:78%; }
.ts-preset-preview[data-preset-preview="message-prose"] .ts-preview-line-b { top:43px; width:64%; }
.ts-preset-preview[data-preset-preview="message-media-wide"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="message-media-wide"] .ts-preview-name,.ts-preset-preview[data-preset-preview="message-media-wide"] .ts-preview-line,.ts-preset-preview[data-preset-preview="message-media-wide"] .ts-preview-meta,.ts-preset-preview[data-preset-preview="message-media-inset"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="message-media-inset"] .ts-preview-name,.ts-preset-preview[data-preset-preview="message-media-inset"] .ts-preview-line,.ts-preset-preview[data-preset-preview="message-media-inset"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="message-media-wide"]::after { content:''; position:absolute; left:12px; right:12px; top:13px; bottom:13px; border-radius:8px; background:linear-gradient(135deg,#232937 0 33%,#596271 33% 58%,#1a1f2a 58%); box-shadow:inset 0 0 0 1px rgba(255,255,255,.12); }
.ts-preset-preview[data-preset-preview="message-media-inset"]::after { content:''; position:absolute; width:72%; left:14%; top:15px; bottom:15px; border-radius:10px; background:linear-gradient(135deg,#252b38,#626b79 50%,#1c2029); box-shadow:0 8px 18px rgba(0,0,0,.34),inset 0 0 0 1px rgba(255,255,255,.14); }
.ts-preset-preview[data-preset-preview="message-soft"]::before { content:''; position:absolute; inset:13px; border:1px solid var(--ts-border); border-radius:10px; background:rgba(255,255,255,.045); }
.ts-preset-preview[data-preset-preview="message-soft"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="message-soft"] .ts-preview-name,.ts-preset-preview[data-preset-preview="message-soft"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="message-soft"] .ts-preview-line { left:26px; z-index:1; }
.ts-preset-preview[data-preset-preview="meta-caps"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="meta-caps"] .ts-preview-name,.ts-preset-preview[data-preset-preview="meta-caps"] .ts-preview-line { display:none; }
.ts-preset-preview[data-preset-preview="meta-caps"] .ts-preview-meta { left:14px; bottom:auto; top:38px; letter-spacing:1.7px; font-size:8px; }
.ts-preset-preview[data-preset-preview="meta-pill"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="meta-pill"] .ts-preview-name,.ts-preset-preview[data-preset-preview="meta-pill"] .ts-preview-line { display:none; }
.ts-preset-preview[data-preset-preview="meta-pill"] .ts-preview-meta { left:14px; bottom:auto; top:31px; border-radius:99px; padding:7px 9px; background:var(--ts-accent-soft); color:var(--ts-muted); font-size:7px; }
.ts-preset-preview[data-preset-preview="bubble-glass"]::before,.ts-preset-preview[data-preset-preview="bubble-outline"]::before { content:''; position:absolute; inset:11px; border-radius:15px; }
.ts-preset-preview[data-preset-preview="bubble-glass"]::before { border:1px solid rgba(255,255,255,.12); background:rgba(20,18,29,.58); box-shadow:0 12px 25px rgba(0,0,0,.28); }
.ts-preset-preview[data-preset-preview="bubble-outline"]::before { border:1px solid rgba(184,168,255,.42); }
.ts-preset-preview[data-preset-preview^="bubble-"] .ts-preview-avatar { width:24px; height:24px; left:23px; top:24px; z-index:1; }
.ts-preset-preview[data-preset-preview^="bubble-"] .ts-preview-name { left:53px; top:23px; z-index:1; font-size:8px; }
.ts-preset-preview[data-preset-preview^="bubble-"] .ts-preview-line { left:23px; z-index:1; }
.ts-preset-preview[data-preset-preview^="bubble-"] .ts-preview-line-a { top:56px; width:62%; }
.ts-preset-preview[data-preset-preview^="bubble-"] .ts-preview-line-b { display:none; }
.ts-preset-preview[data-preset-preview^="bubble-"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview^="actions-"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview^="actions-"] .ts-preview-name,.ts-preset-preview[data-preset-preview^="actions-"] .ts-preview-line,.ts-preset-preview[data-preset-preview^="actions-"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview^="actions-"]::before { content:'•••'; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); min-width:74px; border-radius:999px; padding:9px 13px; color:var(--ts-muted); text-align:center; font:700 10px/1 var(--lumiverse-font-family,system-ui,sans-serif); letter-spacing:5px; }
.ts-preset-preview[data-preset-preview="actions-glass"]::before { border:1px solid rgba(255,255,255,.14); background:rgba(23,19,31,.64); box-shadow:0 8px 18px rgba(0,0,0,.24); backdrop-filter:blur(8px); }
.ts-preset-preview[data-preset-preview="actions-quiet"]::before { border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.035); opacity:.72; }
.ts-preset-preview[data-preset-preview="input-glass"]::before,.ts-preset-preview[data-preset-preview="input-compact"]::before { content:''; position:absolute; left:12px; right:12px; bottom:17px; height:34px; border-radius:12px; border:1px solid var(--ts-border); }
.ts-preset-preview[data-preset-preview="input-glass"]::before { background:rgba(23,19,31,.78); box-shadow:0 12px 22px rgba(0,0,0,.28); }
.ts-preset-preview[data-preset-preview="input-compact"]::before { height:25px; bottom:22px; border-radius:9px; background:rgba(255,255,255,.035); }
.ts-preset-preview[data-preset-preview="input-jewel-send"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="input-jewel-send"] .ts-preview-name,.ts-preset-preview[data-preset-preview="input-jewel-send"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="input-jewel-send"]::before { content:''; position:absolute; left:14px; right:58px; bottom:25px; height:22px; border:1px solid var(--ts-border); border-radius:8px; background:rgba(255,255,255,.025); }
.ts-preset-preview[data-preset-preview="input-jewel-send"]::after { content:'➤'; position:absolute; right:16px; bottom:17px; display:grid; place-items:center; width:36px; height:36px; border-radius:999px; border:1px solid rgba(174,183,195,.5); background:#29313b; color:#f4f7fb; font:700 12px/1 system-ui,sans-serif; box-shadow:0 4px 12px rgba(0,0,0,.26); }
.ts-preset-preview[data-preset-preview="input-jewel-send"] .ts-preview-line { display:none; }
.ts-preset-preview[data-preset-preview^="input-"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview^="input-"] .ts-preview-name,.ts-preset-preview[data-preset-preview^="input-"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview^="input-"] .ts-preview-line { left:25px; bottom:31px; top:auto; z-index:1; width:58%; height:3px; }
.ts-preset-preview[data-preset-preview^="input-"] .ts-preview-line-b { display:none; }

/* Zen-ish floating bridge. It is intentionally small until the user undocks the real editor. */
.ts-widget-root,.ts-floating-editor,.ts-drawer-placeholder { --ts-surface:var(--lumiverse-bg,#1c1826); --ts-elevated:var(--lumiverse-bg-elevated,#231e30); --ts-hover:var(--lumiverse-bg-hover,#2d283a); --ts-border:var(--lumiverse-border,rgba(147,112,219,.18)); --ts-text:var(--lumiverse-text,rgba(255,255,255,.9)); --ts-muted:var(--lumiverse-text-muted,rgba(255,255,255,.62)); --ts-dim:var(--lumiverse-text-dim,rgba(255,255,255,.4)); --ts-accent:var(--lumiverse-primary,#9370db); --ts-accent-soft:var(--lumiverse-primary-015,rgba(147,112,219,.15)); font-family:var(--lumiverse-font-family,system-ui,sans-serif); color:var(--ts-text); }
.ts-widget-root { position:fixed; left:18px; bottom:72px; z-index:2147483638; pointer-events:none; }
.ts-widget-root > * { pointer-events:auto; }
.ts-widget-launch { appearance:none; display:flex; align-items:center; gap:6px; min-width:42px; height:42px; border:1px solid var(--ts-border); border-radius:14px; padding:0 11px; background:color-mix(in srgb,var(--ts-elevated) 92%,transparent); color:var(--ts-text); box-shadow:0 12px 36px rgba(0,0,0,.36),inset 0 1px rgba(255,255,255,.06); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); cursor:pointer; }
.ts-widget-launch span { color:var(--ts-accent); font-size:17px; }
.ts-widget-launch i { border-radius:99px; padding:2px 5px; background:var(--ts-accent-soft); color:var(--ts-accent); font-size:8px; font-style:normal; font-weight:800; text-transform:uppercase; }
.ts-widget-panel { width:242px; overflow:hidden; border:1px solid var(--ts-border); border-radius:12px; background:color-mix(in srgb,var(--ts-elevated) 94%,transparent); box-shadow:0 18px 46px rgba(0,0,0,.42),inset 0 1px rgba(255,255,255,.055); backdrop-filter:blur(18px) saturate(1.12); -webkit-backdrop-filter:blur(18px) saturate(1.12); }
.ts-widget-panel > header { display:flex; justify-content:space-between; align-items:center; gap:8px; height:34px; border-bottom:1px solid var(--ts-border); padding:0 8px 0 10px; }
.ts-widget-panel > header > div { display:flex; align-items:center; gap:7px; min-width:0; }
.ts-widget-mark { color:var(--ts-accent); }
.ts-widget-panel > header strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px; }
.ts-widget-panel > header button,.ts-floating-editor-actions button { appearance:none; border:0; border-radius:6px; background:transparent; color:var(--ts-muted); cursor:pointer; font:inherit; }
.ts-widget-panel > header button { width:26px; height:26px; font-size:15px; }
.ts-widget-panel > header button:hover,.ts-floating-editor-actions button:hover { background:var(--ts-hover); color:var(--ts-text); }
.ts-widget-target { appearance:none; display:grid; width:calc(100% - 16px); gap:2px; margin:8px; border:1px solid var(--ts-border); border-radius:8px; padding:7px 8px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); color:var(--ts-text); text-align:left; cursor:pointer; font:inherit; }
.ts-widget-target span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; font-weight:720; }
.ts-widget-target small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-muted); font-size:7px; }
.ts-widget-boost { appearance:none; display:flex; align-items:center; gap:8px; width:calc(100% - 16px); margin:0 8px 7px; border:1px solid var(--ts-border); border-radius:8px; padding:6px 7px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); color:var(--ts-text); text-align:left; cursor:pointer; font:inherit; }
.ts-widget-boost:hover { background:var(--ts-hover); }
.ts-widget-swatches { position:relative; width:29px; height:24px; flex:none; }
.ts-widget-swatches i { position:absolute; width:18px; height:18px; border:2px solid var(--ts-elevated); border-radius:999px; background:var(--swatch); box-shadow:0 0 0 1px rgba(255,255,255,.18); }
.ts-widget-swatches i:first-child { left:0; top:0; }
.ts-widget-swatches i:last-child { right:0; bottom:0; }
.ts-widget-boost > span:nth-child(2) { display:grid; min-width:0; flex:1; gap:1px; }
.ts-widget-boost strong,.ts-widget-boost small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ts-widget-boost strong { font-size:8px; }
.ts-widget-boost small { color:var(--ts-muted); font-size:6px; }
.ts-widget-boost > b { color:var(--ts-dim); font-size:13px; font-weight:500; }
.ts-widget-tools { display:grid; grid-template-columns:repeat(5,1fr); gap:5px; padding:0 8px 8px; }
.ts-widget-tools button { appearance:none; display:grid; place-items:center; gap:2px; min-width:0; min-height:43px; border:1px solid var(--ts-border); border-radius:8px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); color:var(--ts-text); cursor:pointer; font:12px/1 var(--lumiverse-font-family,system-ui,sans-serif); }
.ts-widget-tools button small { color:var(--ts-muted); font-size:6px; line-height:1; }
.ts-widget-tools button:hover:not(:disabled) { background:var(--ts-hover); }
.ts-widget-tools button[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); color:var(--ts-accent); }
.ts-widget-tools button:disabled { opacity:.35; cursor:not-allowed; }
.ts-widget-popover { margin:0 8px 8px; border:1px solid var(--ts-border); border-radius:8px; padding:7px; background:var(--lumiverse-bg-deep,#0e0b16); }
.ts-widget-popover-actions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px; }
.ts-widget-popover-actions button { min-width:0; min-height:29px; border:1px solid var(--ts-border); border-radius:6px; padding:4px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.045)); color:var(--ts-text); cursor:pointer; font:7px/1.2 var(--lumiverse-font-family,system-ui,sans-serif); }
.ts-widget-popover-actions button:disabled { opacity:.35; }
.ts-widget-popover code { display:block; margin-top:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--lumiverse-primary-text,#d2b7ff); font:7px/1.35 var(--lumiverse-font-mono,monospace); }
.ts-widget-popover p { margin:6px 1px 0; color:var(--ts-muted); font-size:7px; line-height:1.35; }
.ts-floating-editor { position:fixed; left:22px; top:58px; z-index:2147483639; display:flex; flex-direction:column; width:min(430px,calc(100vw - 28px)); height:min(780px,calc(100vh - 76px)); overflow:hidden; border:1px solid var(--ts-border); border-radius:13px; background:var(--ts-surface); box-shadow:0 28px 80px rgba(0,0,0,.58),0 0 0 1px rgba(255,255,255,.035) inset; }
.ts-floating-editor[hidden] { display:none!important; }
.ts-floating-editor-head { flex:none; display:flex; justify-content:space-between; align-items:center; gap:10px; min-height:42px; border-bottom:1px solid var(--ts-border); padding:6px 8px 6px 11px; background:var(--ts-elevated); cursor:move; touch-action:none; user-select:none; }
.ts-floating-editor-head > div:first-child { display:grid; min-width:0; gap:1px; }
.ts-floating-editor-head strong { font-size:10px; }
.ts-floating-editor-head span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-muted); font-size:7px; }
.ts-floating-editor-actions { display:flex; gap:3px; }
.ts-floating-editor-actions button { min-height:28px; padding:4px 8px; font-size:8px; cursor:pointer; }
.ts-floating-editor-actions button:last-child { width:28px; padding:0; font-size:15px; }
.ts-floating-editor-body { flex:1; min-height:0; overflow:hidden; }
.ts-floating-editor-body > [data-theme-studio-root] { height:100%; min-height:0; }
.ts-drawer-placeholder { display:grid; gap:7px; margin:12px; border:1px dashed var(--ts-border); border-radius:10px; padding:14px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); }
.ts-drawer-placeholder[hidden] { display:none!important; }
.ts-drawer-placeholder strong { font-size:11px; }
.ts-drawer-placeholder span { color:var(--ts-muted); font-size:9px; line-height:1.4; }
.ts-drawer-placeholder button { min-height:32px; border:1px solid var(--ts-border); border-radius:7px; background:var(--ts-accent-soft); color:var(--ts-text); cursor:pointer; font:9px var(--lumiverse-font-family,system-ui,sans-serif); }

@media (max-width: 600px) {
  .ts-scroll { padding: 10px; }
  .ts-target-empty { grid-template-columns: auto minmax(0,1fr); }
  .ts-target-empty .ts-btn { grid-column: 1 / -1; width: 100%; }
  .ts-target-head { align-items: start; }
  .ts-target-tools { max-width: 190px; }
  .ts-target-tools .ts-btn { min-height: 34px; }
  .ts-target-tools .ts-btn-icon { width: 34px; }
  .ts-target-scope { grid-template-columns: auto 1fr; }
  .ts-target-scope .ts-input { grid-column: 1 / -1; grid-row: 2; }
  .ts-target-badges { justify-self: end; }
  .ts-project-bar { padding: 8px; }
  .ts-btn { min-height: 38px; }
  .ts-code { min-height: 180px; }
  .ts-resource-list { max-height: 42vh; }
  .ts-workbar { margin: -10px -10px 9px; padding: 7px 10px; gap: 5px; }
  .ts-workbar-group { gap: 4px; }
  .ts-guide-mode { width: 82px; }
  .ts-target-controls { grid-template-columns: 1fr; }
  .ts-target-message-side { grid-column:auto; grid-template-columns:1fr; gap:5px; }
  .ts-target-parts, .ts-target-surface { grid-template-columns: 1fr; }
  .ts-target-parts-label, .ts-target-surface > span { margin-bottom: -2px; }
  .ts-visibility-modes { grid-template-columns: 1fr; }
  .ts-quick-parts { grid-template-columns: 1fr 1fr; }
  .ts-style-option { min-height: 54px; }
  .ts-primary-dimension.is-fixed, .ts-dimension-row.is-fixed { grid-template-columns: 80px minmax(64px,1fr) minmax(96px,108px); gap: 6px; }
  .ts-value-unit { grid-template-columns: minmax(46px,1fr) 48px; }
  .ts-offset-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .ts-font-sample { flex-basis: 82px; min-height: 58px; }
  .ts-fade-grid { grid-template-columns: repeat(3, 1fr); }
  .ts-part-picker { grid-template-columns: 1fr; }
  .ts-part-picker-copy { padding-bottom: 0; }
  .ts-part-grid { grid-template-columns: repeat(2,minmax(0,1fr)); max-height: 190px; }
  .ts-font-grid { grid-template-columns: repeat(3,minmax(0,1fr)); max-height: 220px; }
  .ts-font-grid .ts-font-sample { min-height: 44px; flex-basis:auto; }
  .ts-preset-grid { grid-template-columns: 1fr; }
  .ts-preset-categories { margin-inline: -2px; }
  .ts-widget-root { left: 8px; bottom: 58px; max-width: calc(100vw - 16px); }
  .ts-widget-panel { width: min(242px,calc(100vw - 16px)); }
  .ts-floating-editor { inset: 8px; width: auto; height: auto; max-width: none; max-height: none; }
  .ts-floating-editor-head { cursor: default; }
}

/* v5 · spelunking pass ---------------------------------------------------- */
.ts-editing-path { display:flex; align-items:center; gap:6px; min-width:0; margin:7px 0 0; padding:6px 8px; border:1px solid color-mix(in srgb,var(--ts-accent) 30%,var(--ts-border)); border-radius:7px; background:color-mix(in srgb,var(--ts-accent-soft) 34%,transparent); }
.ts-editing-path > span { color:var(--ts-dim); font-size:8px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
.ts-editing-path > strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; }
.ts-editing-path > i { flex:none; color:var(--ts-dim); font-style:normal; }
.ts-part-picker { margin-top:8px; border:1px solid color-mix(in srgb,var(--ts-accent) 36%,var(--ts-border)); border-radius:8px; overflow:hidden; background:color-mix(in srgb,var(--ts-accent-soft) 24%,transparent); }
.ts-part-picker > summary { list-style:none; display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:8px; align-items:center; min-height:43px; padding:7px 9px; cursor:pointer; }
.ts-part-picker > summary::-webkit-details-marker { display:none; }
.ts-part-picker > summary > span { display:grid; min-width:0; gap:1px; }
.ts-part-picker > summary small { color:var(--ts-accent); font-size:8px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
.ts-part-picker > summary strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-text); font-size:11px; }
.ts-part-picker > summary > b { color:var(--ts-muted); font-size:8px; font-weight:650; }
.ts-part-picker > summary > i { color:var(--ts-dim); font-size:10px; font-style:normal; transition:transform .12s ease; }
.ts-part-picker[open] > summary > i { transform:rotate(180deg); }
.ts-part-picker .ts-part-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); max-height:210px; overflow-y:auto; overflow-x:hidden; gap:5px; border-top:1px solid var(--ts-border); padding:7px; scrollbar-gutter:stable; }
.ts-part-picker .ts-part-chip { display:grid; gap:2px; min-height:40px; padding:6px 7px; text-align:left; white-space:normal; }
.ts-part-picker .ts-part-chip > span { color:var(--ts-dim); font-size:7px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; }
.ts-override-strength { display:grid; grid-template-columns:minmax(0,1fr) 138px; gap:10px; align-items:center; margin-top:9px; border-top:1px solid var(--ts-border); padding-top:9px; }
.ts-override-strength strong,.ts-override-strength small { display:block; }
.ts-override-strength strong { font-size:10px; }
.ts-override-strength small { margin-top:2px; color:var(--ts-muted); font-size:8px; line-height:1.35; }

.ts-pattern-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; }
.ts-pattern-grid button { appearance:none; display:grid; grid-template-columns:30px minmax(0,1fr); gap:7px; align-items:center; min-width:0; min-height:40px; border:1px solid var(--ts-border); border-radius:7px; padding:5px 6px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); color:var(--ts-muted); cursor:pointer; text-align:left; font:9px/1.1 var(--lumiverse-font-family,system-ui,sans-serif); }
.ts-pattern-grid button[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); color:var(--ts-text); }
.ts-pattern-grid button > span { width:30px; height:30px; border:1px solid var(--ts-border); border-radius:6px; background-color:var(--lumiverse-bg-deep,#0e0b16); }
.ts-pattern-grid [data-pattern-chip="dots"] { background-image:radial-gradient(circle,var(--pattern-color) 0 1px,transparent 1.2px); background-size:8px 8px; }
.ts-pattern-grid [data-pattern-chip="grid"] { background-image:linear-gradient(var(--pattern-color) 1px,transparent 1px),linear-gradient(90deg,var(--pattern-color) 1px,transparent 1px); background-size:8px 8px; }
.ts-pattern-grid [data-pattern-chip="checker"] { background-image:conic-gradient(var(--pattern-color) 25%,transparent 0 50%,var(--pattern-color) 0 75%,transparent 0); background-size:10px 10px; }
.ts-pattern-grid [data-pattern-chip="diamonds"] { background-image:linear-gradient(45deg,transparent 43%,var(--pattern-color) 44% 56%,transparent 57%),linear-gradient(-45deg,transparent 43%,var(--pattern-color) 44% 56%,transparent 57%); background-size:11px 11px; }
.ts-pattern-grid [data-pattern-chip="stripes"] { background-image:repeating-linear-gradient(45deg,var(--pattern-color) 0 2px,transparent 2px 7px); }
.ts-pattern-grid [data-pattern-chip="grain"] { background-image:radial-gradient(circle at 20% 20%,var(--pattern-color) 0 1px,transparent 1.2px),radial-gradient(circle at 70% 60%,var(--pattern-color) 0 1px,transparent 1.2px); background-size:7px 7px,11px 11px; }

/* Quick Styles are a gallery, not a sideways timeline. */
.ts-preset-categories { flex-wrap:wrap; overflow:visible; padding-bottom:3px; }
.ts-preset-grid { align-items:stretch; }

/* Widget v2: readable, movable, still intentionally compact. */
.ts-widget-panel { width:260px; }
.ts-widget-panel > header { height:38px; cursor:move; touch-action:none; user-select:none; }
.ts-widget-panel > header strong { font-size:10px; }
.ts-widget-target span { font-size:11px; }
.ts-widget-target small { font-size:8px; }
.ts-widget-boost strong { font-size:9px; }
.ts-widget-boost small { font-size:7.5px; }
.ts-widget-tools button { min-height:46px; font-size:13px; }
.ts-widget-tools button small { font-size:7.5px; }
.ts-widget-popover-actions button { font-size:8px; }
.ts-widget-popover code,.ts-widget-popover p { font-size:8px; }

/* The floating cockpit stays task-focused. Reference catalogs remain in the drawer. */
.ts-floating-editor .ts-native-references { display:none; }

@media (max-width:600px) {
  .ts-override-strength { grid-template-columns:1fr; }
  .ts-pattern-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .ts-widget-root { max-width:calc(100vw - 16px); }
  .ts-widget-panel { width:min(270px,calc(100vw - 16px)); }
  .ts-widget-panel > header { cursor:move; }
  /* Mobile Float is a working sheet, not a full-screen hostage situation. */
  .ts-floating-editor { left:8px!important; right:8px!important; top:auto!important; bottom:8px!important; width:auto!important; height:min(68dvh,680px)!important; max-width:none; max-height:none; border-radius:16px 16px 12px 12px; }
  .ts-floating-editor-head { cursor:default; }
  .ts-preset-grid { grid-template-columns:1fr; }
}

/* v6 · cockpit correction pass ------------------------------------------- */
/* Inspect controls are a fixed flex child of the editor shell now; no nested
   scroll math or negative margins means Pick / Guides cannot scroll away. */
.ts-workbar {
  position: relative;
  top: auto;
  z-index: 32;
  flex: 0 0 auto;
  margin: 0;
  padding: 7px 10px;
  border-bottom: 1px solid var(--ts-border);
  background: color-mix(in srgb, var(--ts-elevated) 94%, transparent);
  box-shadow: 0 7px 16px rgba(0,0,0,.08);
}
.ts-picking-banner-sticky { margin: 0; }

/* Selected stays legible: target identity first, part is a normal disclosure. */
.ts-target-head-meta { display:flex; align-items:center; justify-content:flex-end; gap:6px; }
.ts-restore-target { min-height:26px!important; padding:3px 7px!important; font-size:8px!important; }
.ts-editing-path { margin-top:7px; padding:5px 7px; border-color:var(--ts-border); background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); }
.ts-part-row { margin-top:7px; border:1px solid var(--ts-border); border-radius:7px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.06)); }
.ts-part-row > summary { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:8px; align-items:center; min-height:36px; border:0; border-radius:7px; padding:5px 8px; background:transparent; }
.ts-part-row > summary > span { display:grid; min-width:0; gap:0; }
.ts-part-row > summary small { color:var(--ts-dim); font-size:7px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; }
.ts-part-row > summary strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-text); font-size:10px; }
.ts-part-row > summary b { color:var(--ts-dim); font-size:8px; font-weight:600; white-space:nowrap; }
.ts-part-row > summary i { color:var(--ts-accent); font-style:normal; transition:transform .12s ease; }
.ts-part-row[open] > summary { border-bottom:1px solid var(--ts-border); border-radius:7px 7px 0 0; }
.ts-part-row[open] > summary i { transform:rotate(180deg); }
.ts-part-row .ts-part-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); max-height:176px; overflow-y:auto; overflow-x:hidden; gap:5px; margin:0; border:0; border-radius:0 0 7px 7px; padding:6px; background:transparent; scrollbar-gutter:stable; }
.ts-part-row .ts-part-chip { display:grid; gap:1px; min-height:34px; padding:5px 7px; border-radius:6px; white-space:normal; }
.ts-part-row .ts-part-chip > span { color:var(--ts-dim); font-size:7px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; }

/* Range controls should unmistakably read as sliders. */
.ts-range { min-height:22px; accent-color:var(--ts-accent); cursor:ew-resize; }
.ts-type-scale-row { display:grid; grid-template-columns:minmax(100px,1fr) minmax(112px,160px); gap:8px; align-items:center; }
.ts-type-size { max-width:none; }
.ts-direction-range { display:grid; gap:4px; margin-top:7px; }
.ts-direction-range > div { display:grid; grid-template-columns:1fr auto 1fr; gap:8px; align-items:center; color:var(--ts-dim); font-size:8px; }
.ts-direction-range > div span:last-child { text-align:right; }
.ts-direction-range > div strong { color:var(--ts-muted); font-size:8px; font-weight:700; }
.ts-fill-frame { margin-top:8px; }
.ts-nudge-panel { margin-top:9px; padding:8px; border:1px solid var(--ts-border); border-radius:7px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.06)); }

/* Core galleries wrap; sideways scrolling belongs to timelines, not presets. */
.ts-preset-categories { display:flex; flex-wrap:wrap; overflow:visible; gap:5px; padding:2px 0 5px; }
.ts-preset-categories button { flex:0 1 auto; }

/* Guide labels live outside the thing they explain instead of covering it. */
[data-theme-studio-inspector="selected-label"] { transform-origin:top left; }
[data-theme-studio-inspector="guide-layer"] [data-guide-kind="size"] > span,
[data-theme-studio-inspector="guide-layer"] [data-guide-kind="layout-selected-child"] > span { top:calc(100% + 4px); left:0; }
[data-theme-studio-inspector="guide-layer"] [data-guide-kind="containing-block"] > span { top:auto; bottom:calc(100% + 4px); left:0; }

/* Tiny prose previews for the new MessageContent starter looks. */
.ts-preset-preview[data-preset-preview^="prose-"] { padding:12px 14px; }
.ts-preset-preview[data-preset-preview^="prose-"] .ts-preview-avatar,
.ts-preset-preview[data-preset-preview^="prose-"] .ts-preview-name,
.ts-preset-preview[data-preset-preview^="prose-"] .ts-preview-line,
.ts-preset-preview[data-preset-preview^="prose-"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="prose-h1"]::after { content:'Chapter One'; font:700 22px/1.1 Georgia,serif; background:linear-gradient(105deg,var(--ts-quick-text,#f0c8df),var(--ts-quick-accent,#a98cff)); -webkit-background-clip:text; background-clip:text; color:transparent; }
.ts-preset-preview[data-preset-preview="prose-h2"]::after { content:'A quieter heading'; color:#d9c8f2; font:700 17px/1.2 Georgia,serif; }
.ts-preset-preview[data-preset-preview="prose-h3"]::after { content:'Third-level heading'; color:#cbbbe2; font:700 14px/1.22 Georgia,serif; }
.ts-preset-preview[data-preset-preview="prose-h4"]::after { content:'SMALL SECTION LABEL'; color:#bcaad8; font:800 10px/1.25 var(--lumiverse-font-family,system-ui,sans-serif); letter-spacing:.8px; }
.ts-preset-preview[data-preset-preview="prose-p"]::after { content:'A paragraph with enough room to breathe, without changing the entire message surface.'; color:var(--ts-muted); font:10px/1.65 var(--lumiverse-font-family,system-ui,sans-serif); }
.ts-preset-preview[data-preset-preview="prose-code"]::after { content:'const cute = true;'; display:block; border:1px solid rgba(255,255,255,.1); border-radius:8px; padding:9px; background:rgba(11,10,18,.68); color:#ddd6e8; font:9px/1.4 var(--lumiverse-font-mono,monospace); }
.ts-preset-preview[data-preset-preview="prose-bold"]::after { content:'Important words'; color:#d8c3ff; font:800 15px/1.2 var(--lumiverse-font-family,system-ui,sans-serif); }
.ts-preset-preview[data-preset-preview="prose-italic"]::after { content:'a quieter aside…'; color:#cbc1d8; opacity:.78; font:italic 14px/1.2 Georgia,serif; letter-spacing:.18px; }

@media (max-width:600px) {
  .ts-workbar { margin:0; padding:6px 8px; overflow-x:auto; scrollbar-width:none; }
  .ts-workbar::-webkit-scrollbar { display:none; }
  .ts-type-scale-row { grid-template-columns:1fr; }
  .ts-part-row .ts-part-grid { grid-template-columns:1fr 1fr; max-height:160px; }
}


/* v8 · cockpit stabilization + recipe families -------------------------- */
/* Only .ts-scroll scrolls.  The project bar, tabs, and inspect workbar are
   fixed flex children, which also survives Spindle drawers that have their
   own overflow contexts. */
.ts-project-bar,.ts-tabbar,.ts-workbar { flex:0 0 auto; }
.ts-scroll { overscroll-behavior:contain; touch-action:pan-y; -webkit-overflow-scrolling:touch; }

/* Selected: the ladder explains ancestry; the part disclosure only answers
   "which paintable part inside this component?".  No duplicate Editing slab. */
.ts-target-panel { padding:9px; }
.ts-target-head-meta { font-size:8px; color:var(--ts-dim); }
.ts-part-row { overflow:hidden; }
.ts-part-row > summary { grid-template-columns:minmax(0,1fr) auto 14px; cursor:pointer; }
.ts-part-current { display:grid; min-width:0; gap:1px; }
.ts-part-current small { color:var(--ts-dim); font-size:7px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.ts-part-current strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; }
.ts-part-row > summary b { border-radius:999px; padding:2px 5px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.04)); }
.ts-part-row .ts-part-chip[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); }

/* Boost range safety: the control itself stays buttery, but expensive app-wide
   theme application is deferred until the interaction settles. */
.ts-boost-card { position:relative; }
.ts-boost-release-hint { display:none; position:sticky; bottom:5px; width:max-content; margin:8px 0 0 auto; border:1px solid var(--ts-border); border-radius:999px; padding:3px 7px; background:color-mix(in srgb,var(--ts-elevated) 92%,transparent); color:var(--ts-muted); font-size:8px; box-shadow:0 4px 14px rgba(0,0,0,.2); }
.ts-boost-card.is-adjusting .ts-boost-release-hint { display:block; }
.ts-boost-card.is-adjusting .ts-range { filter:brightness(1.08); }

/* The collapsed widget has a real grab handle so dragging never competes with
   the click that opens it. */
.ts-widget-launch-shell { position:relative; display:flex; align-items:stretch; overflow:visible; border:1px solid var(--ts-border); border-radius:14px; background:color-mix(in srgb,var(--ts-elevated) 94%,transparent); box-shadow:0 12px 36px rgba(0,0,0,.36),inset 0 1px rgba(255,255,255,.06); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); }
.ts-widget-launch-shell .ts-widget-launch { border:0; border-radius:inherit; min-width:40px; height:42px; box-shadow:none; background:transparent; }
.ts-widget-grip { appearance:none; width:18px; border:0; border-right:1px solid var(--ts-border); padding:0; background:transparent; color:var(--ts-dim); cursor:grab; font:12px/1 var(--lumiverse-font-mono,monospace); touch-action:none; }
.ts-widget-grip:active,.ts-widget-panel > header:active { cursor:grabbing; }
.ts-widget-context-menu { position:absolute; left:0; bottom:calc(100% + 7px); z-index:2; min-width:132px; border:1px solid var(--ts-border); border-radius:9px; padding:4px; background:color-mix(in srgb,var(--ts-elevated) 97%,transparent); box-shadow:0 12px 34px rgba(0,0,0,.42); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); }
.ts-widget-context-menu button { appearance:none; width:100%; min-height:30px; border:0; border-radius:6px; padding:6px 8px; background:transparent; color:var(--ts-text); text-align:left; cursor:pointer; font:8px/1.2 var(--lumiverse-font-family,system-ui,sans-serif); }
.ts-widget-context-menu button:hover,.ts-widget-context-menu button:focus-visible { outline:none; background:var(--ts-hover); }
.ts-widget-visibility-toggle[aria-pressed="true"] { border-color:color-mix(in srgb,var(--ts-accent) 52%,var(--ts-border)); background:var(--ts-accent-soft); color:var(--ts-text); }
.ts-widget-panel { width:272px; }
.ts-widget-panel > header strong { font-size:11px; }
.ts-widget-target { padding:8px 9px; }
.ts-widget-target span { font-size:11px; }
.ts-widget-target small { font-size:8.5px; }
.ts-widget-boost strong { font-size:9.5px; }
.ts-widget-boost small { font-size:8px; }
.ts-widget-tools button small { font-size:8px; }
.ts-widget-popover code,.ts-widget-popover p { font-size:8.5px; }

/* Three mobile sheet heights share the exact same live editor. Dragging the
   floating header chooses the nearest snap point on release. */
@media (max-width:600px) {
  .ts-floating-editor { left:8px!important; right:8px!important; top:auto!important; bottom:8px!important; width:auto!important; max-width:none; max-height:none; transition:height .16s ease; }
  .ts-floating-editor[data-mobile-snap="peek"] { height:38dvh!important; }
  .ts-floating-editor[data-mobile-snap="work"] { height:68dvh!important; }
  .ts-floating-editor[data-mobile-snap="full"] { height:90dvh!important; }
  .ts-floating-editor-head { cursor:ns-resize; touch-action:none; }
  .ts-floating-editor-head::before { content:''; position:absolute; left:50%; top:4px; width:34px; height:3px; border-radius:99px; transform:translateX(-50%); background:color-mix(in srgb,var(--ts-text) 22%,transparent); }
  .ts-floating-editor-head { position:relative; padding-top:9px; }
}

/* Quick-style hero family previews. */
.ts-preset-preview[data-preset-preview="avatar-hero-left"] .ts-preview-avatar,
.ts-preset-preview[data-preset-preview="avatar-hero-soft"] .ts-preview-avatar { inset:0; width:100%; height:100%; border-radius:0; }
.ts-preset-preview[data-preset-preview="avatar-hero-left"] .ts-preview-avatar { background:linear-gradient(to bottom,rgba(38,86,111,.98),rgba(153,72,127,.7) 50%,transparent 100%); }
.ts-preset-preview[data-preset-preview="avatar-hero-left"] .ts-preview-name { left:13px; top:auto; bottom:25px; max-width:80%; font-family:Georgia,serif; font-size:13px; text-shadow:0 1px 5px rgba(0,0,0,.65); }
.ts-preset-preview[data-preset-preview="avatar-hero-left"] .ts-preview-meta { left:13px; bottom:7px; border-radius:99px; padding:3px 6px; background:rgba(0,0,0,.65); }
.ts-preset-preview[data-preset-preview="avatar-hero-left"] .ts-preview-line { display:none; }
.ts-preset-preview[data-preset-preview="avatar-hero-soft"] .ts-preview-avatar { background:linear-gradient(to bottom,rgba(72,102,123,.92),rgba(133,87,143,.55) 55%,transparent 100%); }
.ts-preset-preview[data-preset-preview="avatar-hero-soft"] .ts-preview-name { left:50%; top:auto; bottom:24px; transform:translateX(-50%); font-family:Georgia,serif; font-size:12px; }
.ts-preset-preview[data-preset-preview="avatar-hero-soft"] .ts-preview-meta { left:50%; bottom:7px; transform:translateX(-50%); border-radius:99px; padding:3px 6px; background:rgba(0,0,0,.58); }
.ts-preset-preview[data-preset-preview="avatar-hero-soft"] .ts-preview-line { display:none; }
.ts-preset-preview[data-preset-preview="avatar-backdrop"]::before { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(73,84,117,.33),transparent),radial-gradient(circle at 65% 32%,rgba(171,116,195,.28),transparent 58%); opacity:.8; }
.ts-preset-preview[data-preset-preview="avatar-backdrop"] .ts-preview-avatar { width:34px; height:34px; top:24px; left:18px; z-index:1; border-radius:10px; }
.ts-preset-preview[data-preset-preview="avatar-backdrop"] .ts-preview-name { left:60px; top:27px; z-index:1; }
.ts-preset-preview[data-preset-preview="avatar-backdrop"] .ts-preview-line { left:60px; z-index:1; }
.ts-preset-preview[data-preset-preview="avatar-backdrop"] .ts-preview-meta { left:60px; z-index:1; }
.ts-preset-preview[data-preset-preview="avatar-scene-backdrop"]::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,rgba(47,69,86,.94),rgba(122,69,108,.92)); opacity:1; }
.ts-preset-preview[data-preset-preview="avatar-scene-backdrop"]::after { content:''; position:absolute; left:0; right:0; bottom:0; height:58%; background:linear-gradient(to bottom,transparent,rgba(0,0,0,.52)); }
.ts-preset-preview[data-preset-preview="avatar-scene-backdrop"] .ts-preview-avatar { width:34px; height:34px; top:24px; left:18px; z-index:2; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,.38); }
.ts-preset-preview[data-preset-preview="avatar-scene-backdrop"] .ts-preview-name { left:60px; top:27px; z-index:2; color:#fff; text-shadow:0 1px 5px rgba(0,0,0,.72); }
.ts-preset-preview[data-preset-preview="avatar-scene-backdrop"] .ts-preview-line { left:60px; z-index:2; background:rgba(255,255,255,.34); }
.ts-preset-preview[data-preset-preview="avatar-scene-backdrop"] .ts-preview-meta { left:60px; z-index:2; color:rgba(255,255,255,.72); }

/* Whole-prose suites get mini composition previews instead of pretending one
   token is the entire recipe. */
.ts-preset-preview[data-preset-preview^="prose-suite-"] .ts-preview-avatar,
.ts-preset-preview[data-preset-preview^="prose-suite-"] .ts-preview-name,
.ts-preset-preview[data-preset-preview^="prose-suite-"] .ts-preview-line,
.ts-preset-preview[data-preset-preview^="prose-suite-"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview^="prose-suite-"]::before { position:absolute; left:12px; right:12px; top:12px; content:'CHAPTER TITLE'; font-size:11px; font-weight:800; letter-spacing:.7px; }
.ts-preset-preview[data-preset-preview^="prose-suite-"]::after { position:absolute; left:12px; right:12px; top:35px; content:'Section heading\A Small prose rhythm with emphasis.\A  const style = cute;'; white-space:pre-line; color:var(--ts-muted); font-size:8px; line-height:1.8; }
.ts-preset-preview[data-preset-preview="prose-suite-editorial"]::before { color:#efe7f7; font-family:Georgia,serif; letter-spacing:0; }
.ts-preset-preview[data-preset-preview="prose-suite-editorial"]::after { font-family:Georgia,serif; }
.ts-preset-preview[data-preset-preview="prose-suite-neon"]::before { background:linear-gradient(90deg,var(--ts-quick-accent,#f16bd7),var(--ts-quick-text,#8e8cff)); -webkit-background-clip:text; background-clip:text; color:transparent; text-shadow:0 0 10px rgba(160,92,255,.25); }
.ts-preset-preview[data-preset-preview="prose-suite-terminal"]::before { color:#c9ffd8; font-family:var(--lumiverse-font-mono,monospace); letter-spacing:1.4px; }
.ts-preset-preview[data-preset-preview="prose-suite-terminal"]::after { color:#b4c5ba; font-family:var(--lumiverse-font-mono,monospace); }

/* Inspector labels prefer outside/below; guide-layer labels keep enough room
   to avoid obscuring the selected content even on thin text rows. */
[data-theme-studio-inspector="guide-layer"] [data-guide-kind="size"] > span,
[data-theme-studio-inspector="guide-layer"] [data-guide-kind="layout-selected-child"] > span { top:calc(100% + 6px); left:0; }
[data-theme-studio-inspector="guide-layer"] [data-guide-kind="content"] > span { top:calc(100% + 4px); left:0; }



/* v9 · world-state Boost + Build-a-Bear recipes ------------------------- */
.ts-quick-builder { margin:8px 0 11px; border:1px solid color-mix(in srgb,var(--ts-quick-accent,var(--ts-accent)) 38%,var(--ts-border)); border-radius:10px; padding:9px; background:linear-gradient(145deg,color-mix(in srgb,var(--ts-quick-accent,var(--ts-accent)) 8%,var(--ts-elevated)),var(--ts-elevated)); }
.ts-quick-builder-head { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:8px; }
.ts-quick-builder-head > div { display:grid; gap:2px; min-width:0; }
.ts-quick-builder-head strong { font-size:10px; }
.ts-quick-builder-head span:not(.ts-chip) { color:var(--ts-muted); font-size:8px; line-height:1.35; }
.ts-quick-builder-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
.ts-quick-builder-grid > label { min-width:0; }
.ts-quick-builder-grid > label > span { display:block; margin-bottom:4px; color:var(--ts-muted); font-size:8px; font-weight:700; }
.ts-quick-intensity { margin-top:8px; }
.ts-preset-subsection { margin-top:11px; }
.ts-preset-subheading { display:flex; justify-content:space-between; align-items:center; gap:8px; margin:0 1px 6px; }
.ts-preset-subheading strong { color:var(--ts-text); font-size:9px; letter-spacing:.04em; text-transform:uppercase; }
.ts-preset-subheading span { display:grid; place-items:center; min-width:20px; height:18px; border-radius:999px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.04)); color:var(--ts-dim); font-size:7px; }
.ts-preset-card-actions { display:grid; grid-template-columns:minmax(0,1fr) 34px; gap:6px; padding:0 8px 8px; }
.ts-preset-card-actions .ts-btn { margin:0; min-height:31px; }
.ts-preset-card-actions .ts-btn-icon { width:34px; padding:0; }
.ts-preset-card-actions svg { width:14px; height:14px; }
.ts-preset-preview { --preview-accent:var(--ts-quick-accent,var(--ts-accent)); --preview-text:var(--ts-quick-text,var(--ts-text)); }
.ts-preset-card:hover { box-shadow:0 0 0 1px color-mix(in srgb,var(--ts-quick-accent,var(--ts-accent)) 20%,transparent); }
.ts-preset-card[data-preset-applied="true"] { border-color:color-mix(in srgb,var(--ts-quick-accent,var(--ts-accent)) 38%,var(--ts-border)); }
.ts-preset-card-title { display:flex; align-items:center; justify-content:space-between; gap:7px; }
.ts-preset-card-title .ts-chip { flex:none; font-size:7px; }
.ts-preset-reset:not(:disabled) { color:var(--ts-muted); }
.ts-preset-reset:not(:disabled):hover { color:var(--ts-text); border-color:var(--ts-accent); }
.ts-boost-protect { align-items:flex-start; margin-top:8px; }
.ts-boost-protect > span { display:grid; gap:1px; }
.ts-boost-protect strong { font-size:9px; }
.ts-boost-protect small { color:var(--ts-muted); font-size:8px; font-weight:400; line-height:1.35; }

/* The floating editor's handle owns sheet dragging; its scroll body remains a
   normal touch/trackpad surface. The visual scrollbar can disappear without
   disabling scrolling. */
.ts-floating-editor-body,.ts-floating-editor .ts-scroll { touch-action:pan-y; -webkit-overflow-scrolling:touch; }
.ts-floating-editor .ts-scroll { overscroll-behavior:contain; touch-action:pan-y; -webkit-overflow-scrolling:touch; }
@media (max-width:600px) {
  .ts-floating-editor[data-mobile-dragging="true"] { height:var(--ts-mobile-drag-height)!important; transition:none!important; }
  .ts-floating-editor .ts-scroll { scrollbar-width:none; }
  .ts-floating-editor .ts-scroll::-webkit-scrollbar { display:none; width:0; height:0; }
  .ts-quick-builder-grid { grid-template-columns:1fr; }
}

.ts-font-grid,.ts-part-grid { touch-action:pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
.ts-font-grid::-webkit-scrollbar,.ts-part-grid::-webkit-scrollbar { display:none; width:0; height:0; }
.ts-boost-subsection { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--ts-border); }
.ts-boost-subsection:first-of-type { border-top: 0; padding-top: 0; }
.ts-boost-subhead { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; align-items: center; margin-bottom: 8px; }
.ts-boost-subhead strong, .ts-boost-subhead small { display: block; }
.ts-boost-subhead strong { font-size: 11px; }
.ts-boost-subhead small { margin-top: 2px; color: var(--ts-muted); font-size: 9px; }
.ts-boost-subsection > .ts-field + .ts-field { margin-top: 8px; }
/* Coordinated H1-H4 Quick Style previews. Each card is a full heading system. */
.ts-preset-preview[data-preset-preview^="prose-headings-"] { padding:10px 12px; }
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-avatar { display:none; }
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-name,
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-line,
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-meta { display:block; position:absolute; left:12px; right:12px; width:auto; height:auto; transform:none; background:none; border:0; padding:0; }
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-name { top:10px; }
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-name { font-size:0; }
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-name::before { content:'H1 · Chapter'; }
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-line-a { top:37px; }
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-line-a::before { content:'H2 · Section'; }
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-line-b { top:56px; }
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-line-b::before { content:'H3 · Minor heading'; }
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-meta { top:74px; bottom:auto; }
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-meta { font-size:0; }
.ts-preset-preview[data-preset-preview^="prose-headings-"] .ts-preview-meta::before { content:'H4 · LABEL'; }
.ts-preset-preview[data-preset-preview="prose-headings-editorial"] .ts-preview-name::before { font:700 19px/1 Georgia,serif; background:linear-gradient(90deg,var(--ts-quick-text),var(--ts-quick-accent)); -webkit-background-clip:text; background-clip:text; color:transparent; }
.ts-preset-preview[data-preset-preview="prose-headings-editorial"] .ts-preview-line-a::before { color:var(--ts-quick-accent); font:700 13px/1 Georgia,serif; }
.ts-preset-preview[data-preset-preview="prose-headings-editorial"] .ts-preview-line-b::before { color:color-mix(in srgb,var(--ts-quick-text) 78%,transparent); font:700 10px/1 Georgia,serif; }
.ts-preset-preview[data-preset-preview="prose-headings-editorial"] .ts-preview-meta::before { color:color-mix(in srgb,var(--ts-quick-accent) 70%,var(--ts-quick-text)); font:800 7px/1 system-ui,sans-serif; letter-spacing:1px; }
.ts-preset-preview[data-preset-preview="prose-headings-terminal"] :is(.ts-preview-name,.ts-preview-line,.ts-preview-meta)::before { font-family:var(--lumiverse-font-mono,monospace); }
.ts-preset-preview[data-preset-preview="prose-headings-terminal"] .ts-preview-name::before { color:var(--ts-quick-text); font-size:15px; font-weight:800; letter-spacing:1px; }
.ts-preset-preview[data-preset-preview="prose-headings-terminal"] .ts-preview-line-a::before { color:var(--ts-quick-accent); font-size:10px; font-weight:700; }
.ts-preset-preview[data-preset-preview="prose-headings-terminal"] .ts-preview-line-b::before { color:color-mix(in srgb,var(--ts-quick-text) 70%,transparent); font-size:8px; }
.ts-preset-preview[data-preset-preview="prose-headings-terminal"] .ts-preview-meta::before { color:color-mix(in srgb,var(--ts-quick-accent) 72%,transparent); font-size:7px; letter-spacing:1px; }
.ts-preset-preview[data-preset-preview="prose-headings-neon"] .ts-preview-name::before { background:linear-gradient(90deg,var(--ts-quick-accent),var(--ts-quick-text)); -webkit-background-clip:text; background-clip:text; color:transparent; font:850 16px/1 system-ui,sans-serif; letter-spacing:1px; text-shadow:0 0 9px color-mix(in srgb,var(--ts-quick-accent) 45%,transparent); }
.ts-preset-preview[data-preset-preview="prose-headings-neon"] .ts-preview-line-a::before { color:var(--ts-quick-accent); font:800 10px/1 system-ui,sans-serif; text-transform:uppercase; letter-spacing:.8px; }
.ts-preset-preview[data-preset-preview="prose-headings-neon"] .ts-preview-line-b::before { color:color-mix(in srgb,var(--ts-quick-text) 82%,var(--ts-quick-accent)); font:800 8px/1 system-ui,sans-serif; }
.ts-preset-preview[data-preset-preview="prose-headings-neon"] .ts-preview-meta::before { color:color-mix(in srgb,var(--ts-quick-accent) 70%,transparent); font:800 7px/1 system-ui,sans-serif; letter-spacing:1.1px; }
.ts-preset-preview[data-preset-preview="prose-headings-minimal"] .ts-preview-name::before { color:var(--ts-quick-text); font:760 17px/1 system-ui,sans-serif; }
.ts-preset-preview[data-preset-preview="prose-headings-minimal"] .ts-preview-line-a::before { color:color-mix(in srgb,var(--ts-quick-text) 88%,transparent); font:720 11px/1 system-ui,sans-serif; }
.ts-preset-preview[data-preset-preview="prose-headings-minimal"] .ts-preview-line-b::before { color:color-mix(in srgb,var(--ts-quick-text) 72%,transparent); font:680 9px/1 system-ui,sans-serif; }
.ts-preset-preview[data-preset-preview="prose-headings-minimal"] .ts-preview-meta::before { color:color-mix(in srgb,var(--ts-quick-text) 58%,transparent); font:760 7px/1 system-ui,sans-serif; letter-spacing:.8px; }

/* v13 · floating cockpit diet ------------------------------------------- */
/* The full drawer is the primary project-management surface. Float is a
   working inspector: one title row, icon workspaces, then Pick / Guides. */
.ts-floating-editor .ts-project-bar,
.ts-floating-editor .ts-tabbar { display:none!important; }
.ts-floating-editor-head {
  display:grid;
  grid-template-columns:minmax(0,1fr) auto auto;
  justify-content:stretch;
  min-height:40px;
  gap:7px;
  padding:5px 7px 5px 10px;
}
.ts-floating-editor-title { display:grid; min-width:0; gap:1px; }
.ts-floating-editor-title strong { font-size:10px; }
.ts-floating-editor-title span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-muted); font-size:7px; }
.ts-floating-workspaces { display:flex; align-items:center; gap:2px; }
.ts-floating-workspaces button {
  appearance:none;
  display:grid;
  place-items:center;
  width:29px;
  height:29px;
  border:1px solid transparent;
  border-radius:7px;
  padding:0;
  background:transparent;
  color:var(--ts-muted);
  cursor:pointer;
}
.ts-floating-workspaces button:hover { background:var(--ts-hover); color:var(--ts-text); }
.ts-floating-workspaces button[aria-pressed="true"] { border-color:color-mix(in srgb,var(--ts-accent) 55%,var(--ts-border)); background:var(--ts-accent-soft); color:var(--ts-text); }
.ts-floating-workspaces svg { width:15px; height:15px; }
.ts-floating-editor .ts-workbar { border-top:0; }
.ts-floating-editor .ts-workbar-secondary { display:none; }

/* Read Style belongs to the style stack, not target forensics. */
.ts-style-stack-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
.ts-style-stack-head .ts-kicker { margin:0; }
.ts-style-stack-head .ts-read-style { display:inline-flex; align-items:center; gap:5px; min-height:27px; padding:4px 7px; font-size:9px; }
.ts-style-stack-head .ts-read-style svg { width:12px; height:12px; }

/* Boost's project-wide actions stay next to Boost instead of below every
   enabled layer. */
.ts-boost-actions-top { margin:7px 0 9px; padding:0; }
.ts-boost-actions-top .ts-btn { flex:1 1 auto; }

@media (max-width:600px) {
  .ts-floating-editor-head {
    grid-template-columns:minmax(0,1fr) auto auto;
    min-height:38px;
    gap:4px;
    padding:8px 5px 4px 9px;
  }
  .ts-floating-editor-title span { display:none; }
  .ts-floating-workspaces { gap:1px; }
  .ts-floating-workspaces button { width:31px; height:31px; border-radius:8px; }
  .ts-floating-workspaces svg { width:16px; height:16px; }
  .ts-floating-editor-actions { gap:1px; }
  .ts-floating-editor-actions button:first-child { width:30px; padding:0; overflow:hidden; color:transparent; position:relative; }
  .ts-floating-editor-actions button:first-child::after { content:'↩'; position:absolute; inset:0; display:grid; place-items:center; color:var(--ts-muted); font-size:16px; }
  .ts-floating-editor-actions button:last-child { width:28px; }
  .ts-floating-editor .ts-workbar { padding:5px 7px; }
  .ts-boost-actions-top { display:grid; grid-template-columns:1fr auto auto; gap:5px; }
  .ts-boost-actions-top .ts-btn { min-width:0; padding-inline:7px; }
  .ts-style-stack-head .ts-read-style span { display:none; }
  .ts-style-stack-head .ts-read-style { width:30px; padding:0; justify-content:center; }
}

/* v15 · mobile QA / widget polish --------------------------------------- */
/* Compact widget tools read as icons with labels, not glyphs floating over
   microscopic captions. */
.ts-widget-tools button {
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:5px;
  padding:6px 3px 5px;
  line-height:1;
}
.ts-widget-tools button > svg { width:16px; height:16px; flex:0 0 auto; }
.ts-widget-tools button small { display:block; line-height:1.05; }
.ts-widget-boost-row {
  display:grid;
  grid-template-columns:minmax(0,1fr) 34px;
  gap:5px;
  margin:0 8px 7px;
}
.ts-widget-boost-row .ts-widget-boost { width:100%; margin:0; min-width:0; }
.ts-widget-boost-shuffle {
  appearance:none;
  display:grid;
  place-items:center;
  width:34px;
  min-width:34px;
  border:1px solid var(--ts-border);
  border-radius:8px;
  padding:0;
  background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08));
  color:var(--ts-accent);
  cursor:pointer;
}
.ts-widget-boost-shuffle:hover:not(:disabled) { background:var(--ts-hover); color:var(--ts-text); }
.ts-widget-boost-shuffle:disabled { opacity:.3; cursor:not-allowed; }
.ts-widget-boost-shuffle svg { width:16px; height:16px; }
.ts-boost-actions-top [data-action="shuffle-boost"] { display:inline-flex; align-items:center; justify-content:center; gap:6px; }
.ts-boost-actions-top .ts-shuffle-icon { width:13px; height:13px; flex:0 0 auto; }

/* Seeded --ts-mobile-drag-height prevents the first-touch jump; once a drag
   starts, transforms/height are controlled exclusively by the handle. */
@media (max-width:600px) {
  .ts-widget-tools button { gap:5px; min-height:50px; padding-block:7px 6px; }
  .ts-widget-tools button > svg { width:17px; height:17px; }
  .ts-widget-tools button small { font-size:8.5px; }
}

/* v16 · immutable Boost handoff + mobile edge float ----------------------- */
/* Desktop keeps the titlebar drag affordance. Mobile gets a dedicated edge
   handle so the title/actions never need to move when the sheet flips sides. */
.ts-mobile-sheet-handle { display:none; }
.ts-mobile-edge-toggle { display:none!important; }

@media (max-width:600px) {
  .ts-floating-editor[data-mobile-edge="bottom"] { top:auto!important; bottom:8px!important; border-radius:16px 16px 12px 12px; }
  .ts-floating-editor[data-mobile-edge="top"] { top:8px!important; bottom:auto!important; border-radius:12px 12px 16px 16px; }
  .ts-floating-editor-head { cursor:default; padding-top:9px; }
  .ts-floating-editor-head::before { display:none!important; }

  .ts-mobile-sheet-handle {
    display:block;
    position:absolute;
    left:50%;
    top:0;
    z-index:8;
    width:78px;
    height:16px;
    transform:translateX(-50%);
    cursor:ns-resize;
    touch-action:none;
  }
  .ts-floating-editor[data-mobile-edge="top"] .ts-mobile-sheet-handle { top:auto; bottom:0; }
  .ts-mobile-sheet-handle > i {
    position:absolute;
    left:50%;
    top:5px;
    width:34px;
    height:3px;
    border-radius:99px;
    transform:translateX(-50%);
    background:color-mix(in srgb,var(--ts-text) 25%,transparent);
    pointer-events:none;
  }
  .ts-floating-editor[data-mobile-edge="top"] .ts-mobile-sheet-handle > i { top:auto; bottom:5px; }

  /* One button always offers the only useful opposite edge. */
  .ts-mobile-edge-toggle {
    display:grid!important;
    place-items:center;
    width:30px!important;
    min-width:30px;
    padding:0!important;
    color:var(--ts-muted)!important;
    overflow:visible!important;
    position:relative;
  }
  .ts-mobile-edge-toggle::after { content:none!important; }
  .ts-mobile-edge-toggle svg { width:15px; height:15px; transition:transform .14s ease; }
  .ts-floating-editor[data-mobile-edge="top"] .ts-mobile-edge-toggle svg { transform:rotate(180deg); }

  /* v13 used :first-child for the Return icon. The edge toggle now comes first,
     so bind the compact Return treatment to the actual Return action instead. */
  .ts-floating-editor-actions [data-widget-action="dock"] {
    width:30px;
    min-width:30px;
    padding:0;
    overflow:hidden;
    color:transparent;
    position:relative;
  }
  .ts-floating-editor-actions [data-widget-action="dock"]::after {
    content:'↩';
    position:absolute;
    inset:0;
    display:grid;
    place-items:center;
    color:var(--ts-muted);
    font-size:16px;
  }
}


/* v18 · Style Library ----------------------------------------------------- */
.ts-quick-front-head { align-items:center; }
.ts-browse-styles { flex:none; }
.ts-preset-grid-compact { grid-template-columns:repeat(2,minmax(0,1fr)); }
.ts-library-context-note,
.ts-library-audit { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; margin:9px 0; border:1px solid color-mix(in srgb,var(--ts-accent) 28%,var(--ts-border)); border-radius:10px; padding:9px 10px; background:var(--ts-accent-soft); }
.ts-library-context-note { grid-template-columns:1fr; }
.ts-library-context-note strong,.ts-library-audit strong { display:block; font-size:10px; }
.ts-library-context-note span,.ts-library-audit span:not(.ts-chip) { display:block; margin-top:2px; color:var(--ts-muted); font-size:8px; line-height:1.4; }
.ts-library-empty-cta { width:100%; margin-top:8px; border:1px dashed var(--ts-border); border-radius:10px; padding:18px 12px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); color:var(--ts-muted); cursor:pointer; font:inherit; font-size:10px; }
.ts-library-empty-cta:hover { border-color:var(--ts-accent); color:var(--ts-text); }

.ts-style-map-root {
  --ts-surface:var(--lumiverse-bg,#1c1826);
  --ts-elevated:var(--lumiverse-bg-elevated,#231e30);
  --ts-hover:var(--lumiverse-bg-hover,#2d283a);
  --ts-border:var(--lumiverse-border,rgba(147,112,219,.18));
  --ts-text:var(--lumiverse-text,rgba(255,255,255,.9));
  --ts-muted:var(--lumiverse-text-muted,rgba(255,255,255,.62));
  --ts-dim:var(--lumiverse-text-dim,rgba(255,255,255,.4));
  --ts-accent:var(--lumiverse-primary,#9370db);
  --ts-accent-soft:var(--lumiverse-primary-015,rgba(147,112,219,.15));
  color:var(--ts-text);
  font-family:var(--lumiverse-font-family,system-ui,sans-serif);
  font-size:calc(13px * var(--lumiverse-font-scale,1));
}
.ts-style-map-root *,.ts-style-map-root *::before,.ts-style-map-root *::after { box-sizing:border-box; }
.ts-style-library-root {
  --ts-surface:var(--lumiverse-bg,#1c1826);
  --ts-elevated:var(--lumiverse-bg-elevated,#231e30);
  --ts-hover:var(--lumiverse-bg-hover,#2d283a);
  --ts-border:var(--lumiverse-border,rgba(147,112,219,.18));
  --ts-text:var(--lumiverse-text,rgba(255,255,255,.9));
  --ts-muted:var(--lumiverse-text-muted,rgba(255,255,255,.62));
  --ts-dim:var(--lumiverse-text-dim,rgba(255,255,255,.4));
  --ts-accent:var(--lumiverse-primary,#9370db);
  --ts-accent-soft:var(--lumiverse-primary-015,rgba(147,112,219,.15));
  position:fixed;
  inset:0;
  z-index:2147483647;
  color:var(--ts-text);
  font-family:var(--lumiverse-font-family,system-ui,sans-serif);
  font-size:calc(13px * var(--lumiverse-font-scale,1));
}
.ts-style-library-root[hidden] { display:none!important; }
.ts-style-library-root *,.ts-style-library-root *::before,.ts-style-library-root *::after { box-sizing:border-box; }
.ts-style-library-backdrop { position:absolute; inset:0; background:rgba(5,4,9,.68); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); }
.ts-style-library-modal { position:absolute; inset:6dvh max(18px,calc((100vw - 1080px)/2)); display:grid; grid-template-rows:auto auto minmax(0,1fr); min-width:0; overflow:hidden; border:1px solid color-mix(in srgb,var(--ts-accent) 28%,var(--ts-border)); border-radius:18px; background:color-mix(in srgb,var(--ts-surface) 96%,transparent); box-shadow:0 24px 90px rgba(0,0,0,.55); }
.ts-style-library-head { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:start; padding:16px 18px 13px; border-bottom:1px solid var(--ts-border); background:var(--ts-elevated); }
.ts-style-library-head .ts-kicker { margin-bottom:3px; }
.ts-style-library-head h2 { margin:0; font-size:20px; line-height:1.1; font-weight:760; }
.ts-style-library-head > div > span { display:block; margin-top:4px; color:var(--ts-muted); font-size:9px; }
.ts-style-library-head .ts-btn-icon { width:34px; height:34px; }
.ts-style-library-toolbar { display:grid; gap:8px; padding:11px 16px; border-bottom:1px solid var(--ts-border); background:color-mix(in srgb,var(--ts-elevated) 88%,transparent); }
.ts-library-search { display:grid; grid-template-columns:auto minmax(0,1fr); gap:9px; align-items:center; }
.ts-library-search > span,.ts-library-layout-filter > span { color:var(--ts-dim); font-size:8px; font-weight:750; letter-spacing:.08em; text-transform:uppercase; }
.ts-library-filter-row { display:flex; flex-wrap:wrap; gap:5px; }
.ts-library-filter-row button { appearance:none; border:1px solid var(--ts-border); border-radius:999px; padding:5px 9px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); color:var(--ts-muted); cursor:pointer; font:inherit; font-size:8px; }
.ts-library-filter-row button:hover { color:var(--ts-text); border-color:color-mix(in srgb,var(--ts-accent) 48%,var(--ts-border)); }
.ts-library-filter-row button[aria-pressed="true"] { color:var(--ts-text); border-color:var(--ts-accent); background:var(--ts-accent-soft); }
.ts-library-family-row { max-height:66px; overflow-y:auto; scrollbar-width:thin; }
.ts-library-layout-filter { display:grid; grid-template-columns:auto minmax(0,1fr); gap:9px; align-items:center; }
.ts-style-library-toolbar .ts-quick-builder { margin:1px 0 0; padding:8px 9px; }
.ts-style-library-toolbar .ts-quick-builder-head { margin-bottom:6px; }
.ts-style-library-toolbar .ts-recent { display:none; }
.ts-style-library-scroll { min-height:0; overflow:auto; padding:15px 16px 24px; overscroll-behavior:contain; touch-action:pan-y; -webkit-overflow-scrolling:touch; }
.ts-library-group + .ts-library-group { margin-top:18px; }
.ts-library-group-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:0 2px 8px; }
.ts-library-group-head strong { font-size:11px; }
.ts-library-group-head span { min-width:24px; border-radius:99px; padding:2px 6px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.04)); color:var(--ts-dim); text-align:center; font-size:8px; }
.ts-style-library-modal .ts-preset-grid { grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.ts-style-library-modal .ts-preset-card { grid-template-rows:112px minmax(0,1fr) auto; }
.ts-library-targets { display:grid; gap:2px; margin-top:6px; min-width:0; }
.ts-preset-card-copy .ts-library-targets span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-muted); font-size:7px; line-height:1.35; text-transform:none; letter-spacing:0; }
.ts-preset-card-copy .ts-library-targets b { color:var(--ts-dim); font-size:6.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
.ts-library-badges { display:flex!important; flex-wrap:wrap; gap:4px; margin-top:5px; }
.ts-library-badge { display:inline-flex!important; width:auto!important; margin:0!important; border:1px solid var(--ts-border); border-radius:999px; padding:2px 5px!important; color:var(--ts-dim)!important; font-size:6.5px!important; font-weight:700; letter-spacing:.04em!important; line-height:1!important; text-transform:uppercase; }
.ts-library-family { color:var(--ts-text)!important; border-color:color-mix(in srgb,var(--ts-accent) 35%,var(--ts-border)); background:var(--ts-accent-soft); }
.ts-library-empty { display:grid; place-items:center; min-height:220px; border:1px dashed var(--ts-border); border-radius:14px; padding:24px; text-align:center; }
.ts-library-empty strong { font-size:13px; }
.ts-library-empty span { max-width:460px; margin-top:5px; color:var(--ts-muted); font-size:9px; line-height:1.5; }
.ts-library-audit { margin:0 0 13px; }

@media (max-width:860px) {
  .ts-style-library-modal { inset:3dvh 10px; }
  .ts-style-library-modal .ts-preset-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (max-width:600px) {
  .ts-quick-front-head { align-items:stretch; }
  .ts-quick-front-head .ts-browse-styles { min-height:34px; }
  .ts-preset-grid-compact { grid-template-columns:1fr; }
  .ts-style-library-backdrop { background:rgba(5,4,9,.5); }
  .ts-style-library-modal { inset:22px 6px 6px; border-radius:18px 18px 12px 12px; }
  .ts-style-library-head { padding:13px 13px 10px; }
  .ts-style-library-head h2 { font-size:17px; }
  .ts-style-library-head > div > span { font-size:8px; }
  .ts-style-library-toolbar { padding:9px 11px; gap:7px; }
  .ts-library-search { grid-template-columns:1fr; gap:4px; }
  .ts-library-layout-filter { grid-template-columns:1fr; gap:5px; }
  .ts-library-family-row { flex-wrap:wrap; overflow-x:hidden; overflow-y:auto; max-height:88px; padding-bottom:2px; scrollbar-width:none; }
  .ts-library-family-row::-webkit-scrollbar { display:none; }
  .ts-style-library-scroll { padding:11px 10px 20px; scrollbar-width:none; }
  .ts-style-library-scroll::-webkit-scrollbar { display:none; }
  .ts-style-library-modal .ts-preset-grid { grid-template-columns:1fr; }
  .ts-style-library-modal .ts-preset-card { grid-template-rows:104px minmax(0,1fr) auto; }
}


/* V19 · pack browser + Manga family */
.ts-library-view-row { display:flex; flex-wrap:wrap; gap:5px; }
.ts-library-view-row button { appearance:none; border:1px solid var(--ts-border); border-radius:999px; padding:5px 10px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); color:var(--ts-muted); cursor:pointer; font:inherit; font-size:8px; }
.ts-library-view-row button[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); color:var(--ts-text); }
.ts-pack-group { margin-bottom:18px; }
.ts-pack-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.ts-pack-card { position:relative; min-width:0; overflow:hidden; border:1px solid color-mix(in srgb,var(--ts-accent) 24%,var(--ts-border)); border-radius:12px; background:var(--ts-elevated); }
.ts-pack-card:hover { border-color:color-mix(in srgb,var(--ts-accent) 58%,var(--ts-border)); }
.ts-pack-open { appearance:none; display:grid; grid-template-columns:minmax(150px,.9fr) minmax(0,1.1fr); width:100%; min-height:152px; padding:0; border:0; background:transparent; color:inherit; text-align:left; cursor:pointer; font:inherit; }
.ts-pack-copy { display:flex; flex-direction:column; justify-content:center; min-width:0; padding:14px 44px 14px 14px; }
.ts-pack-copy > div { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
.ts-pack-copy strong { font-size:14px; }
.ts-pack-copy p { margin:7px 0 9px; color:var(--ts-muted); font-size:9px; line-height:1.45; }
.ts-pack-copy > span { color:var(--ts-dim); font-size:7px; font-weight:720; letter-spacing:.06em; text-transform:uppercase; }
.ts-pack-favorite { position:absolute; top:9px; right:9px; width:30px; height:30px; z-index:2; }
.ts-pack-preview { position:relative; min-width:0; overflow:hidden; border-right:1px solid var(--ts-border); background:linear-gradient(145deg,color-mix(in srgb,var(--ts-quick-accent,var(--ts-accent)) 13%,#09090c),#07070a 64%); }
.ts-pack-preview::before { content:''; position:absolute; inset:0; opacity:.34; background-image:radial-gradient(circle,currentColor .7px,transparent .9px); background-size:10px 10px; color:var(--ts-quick-accent,var(--ts-accent)); }
.ts-pack-preview > strong { position:absolute; left:14px; bottom:30px; z-index:2; color:var(--ts-quick-text,var(--ts-text)); font:900 18px/1 Georgia,serif; letter-spacing:.04em; }
.ts-pack-preview > small { position:absolute; left:14px; right:10px; bottom:12px; z-index:2; color:color-mix(in srgb,var(--ts-quick-text,var(--ts-text)) 72%,transparent); font-size:7px; text-transform:uppercase; letter-spacing:.08em; }
.ts-pack-panel { position:absolute; display:block; border:1px solid color-mix(in srgb,var(--ts-quick-accent,var(--ts-accent)) 68%,var(--ts-border)); background:rgba(255,255,255,.035); }
.ts-pack-panel-a { left:13px; top:13px; width:45%; height:54px; transform:skewX(-7deg); }
.ts-pack-panel-b { right:13px; top:24px; width:31%; height:68px; border-width:2px; }
.ts-pack-detail { grid-template-rows:auto minmax(0,1fr); }
.ts-pack-detail-head { align-items:center; }
.ts-pack-head-title { display:flex; align-items:flex-start; gap:10px; min-width:0; }
.ts-pack-head-title .ts-btn-icon { flex:none; }
.ts-pack-head-actions { display:flex; gap:6px; }

/* V21 · pack detail becomes a two-pane workspace. The recipe canvas owns the
   roomy side; persistent pack controls live in their own independently
   scrolling rail instead of pushing every recipe below palette/asset chrome. */
.ts-pack-workspace { display:grid; grid-template-columns:minmax(0,1fr) 286px; min-width:0; min-height:0; overflow:hidden; }
.ts-pack-main { min-width:0; min-height:0; overflow:auto; overscroll-behavior:contain; touch-action:pan-y; -webkit-overflow-scrolling:touch; scrollbar-width:thin; }
.ts-pack-sidebar { min-width:0; min-height:0; overflow:auto; overscroll-behavior:contain; border-left:1px solid var(--ts-border); padding:11px; background:color-mix(in srgb,var(--ts-elevated) 92%,var(--ts-surface)); scrollbar-width:thin; }
.ts-pack-sidebar-inner { display:grid; gap:9px; }
.ts-pack-side-actions,.ts-pack-side-section { border:1px solid color-mix(in srgb,var(--ts-accent) 22%,var(--ts-border)); border-radius:10px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.07)); }
.ts-pack-side-actions { padding:10px; }
.ts-pack-side-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
.ts-pack-side-heading > div { display:grid; gap:2px; min-width:0; }
.ts-pack-side-heading .ts-kicker { margin:0; }
.ts-pack-side-heading strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; }
.ts-pack-side-actions > p { margin:8px 1px 0; color:var(--ts-muted); font-size:7.5px; line-height:1.42; }
.ts-pack-main-actions { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:6px; margin-top:9px; }
.ts-pack-main-actions .ts-btn { min-width:0; }
.ts-pack-side-section { overflow:hidden; }
.ts-pack-side-section > summary { list-style:none; display:grid; grid-template-columns:minmax(0,1fr) auto 12px; gap:7px; align-items:center; padding:9px 10px; cursor:pointer; user-select:none; }
.ts-pack-side-section > summary::-webkit-details-marker { display:none; }
.ts-pack-side-section > summary > div { display:grid; gap:2px; min-width:0; }
.ts-pack-side-section > summary strong { font-size:9px; }
.ts-pack-side-section > summary span:not(.ts-chip) { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-muted); font-size:7px; }
.ts-pack-side-section > summary > i { color:var(--ts-dim); font-style:normal; font-size:10px; transform:rotate(-90deg); transition:transform .12s ease; }
.ts-pack-side-section[open] > summary > i { transform:rotate(0); }
.ts-pack-side-section[open] > summary { border-bottom:1px solid var(--ts-border); }
.ts-pack-side-body { padding:9px; }
.ts-pack-sidebar .ts-quick-builder { margin:0; border:0; border-radius:0; padding:0; background:transparent; }
.ts-pack-sidebar .ts-quick-builder-head { display:none; }
.ts-pack-sidebar .ts-quick-builder-grid { grid-template-columns:1fr; gap:7px; }
.ts-pack-sidebar .ts-quick-intensity { margin-top:7px; }
.ts-pack-sidebar .ts-recent { margin-top:7px; }

.ts-pack-hero { display:grid; grid-template-columns:minmax(230px,.86fr) minmax(0,1.14fr); min-height:166px; border-bottom:1px solid var(--ts-border); background:var(--ts-elevated); }
.ts-pack-preview-large { min-height:166px; border-right:1px solid var(--ts-border); }
.ts-pack-preview-large > strong { left:20px; bottom:45px; font-size:26px; }
.ts-pack-preview-large > small { left:21px; bottom:23px; font-size:7px; }
.ts-pack-preview-large .ts-pack-panel-a { left:20px; top:19px; width:47%; height:67px; }
.ts-pack-preview-large .ts-pack-panel-b { right:22px; top:31px; width:33%; height:88px; }
.ts-pack-summary { align-self:center; padding:16px 18px; }
.ts-pack-summary-row { display:flex; flex-wrap:wrap; gap:5px; }
.ts-pack-summary > strong { display:block; margin-top:10px; font-size:11px; }
.ts-pack-summary p { margin:5px 0 0; color:var(--ts-muted); font-size:8px; line-height:1.45; }
.ts-pack-detail-scroll { padding:14px 16px 24px; }
.ts-pack-assets { display:grid; gap:6px; }
.ts-pack-asset { display:grid; grid-template-columns:28px minmax(0,1fr) auto; gap:7px; align-items:center; border:1px solid var(--ts-border); border-radius:8px; padding:7px; background:color-mix(in srgb,var(--ts-elevated) 72%,transparent); }
.ts-pack-asset-icon { display:grid; place-items:center; width:28px; height:28px; border-radius:7px; background:var(--ts-accent-soft); color:var(--ts-accent); font-size:13px; }
.ts-pack-asset strong,.ts-pack-asset span:not(.ts-chip) { display:block; font-size:7.5px; }
.ts-pack-asset small { display:-webkit-box; margin-top:2px; overflow:hidden; -webkit-box-orient:vertical; -webkit-line-clamp:2; color:var(--ts-muted); font-size:6.5px; line-height:1.35; }
.ts-pack-asset .ts-chip { align-self:start; font-size:6px; }
.ts-library-card-actions { grid-template-columns:minmax(0,1fr) 34px 34px 34px; }
.ts-library-card-actions [data-library-favorite][aria-pressed="true"],.ts-pack-favorite[aria-pressed="true"],.ts-pack-head-actions [data-library-favorite][aria-pressed="true"] { color:var(--ts-accent); border-color:color-mix(in srgb,var(--ts-accent) 55%,var(--ts-border)); background:var(--ts-accent-soft); }


/* V24 · Editorial is a composition system, not Manga with another palette.
   Pack art reads like a publication spread: hairline rules, image crop, column
   rhythm, and serif identity. The anatomy preview owns its Bubble/Minimal morph. */
.ts-pack-preview[data-pack-preview="editorial"] { background:linear-gradient(145deg,#101419,#080a0d 68%); }
.ts-pack-preview[data-pack-preview="editorial"]::before { opacity:.42; color:var(--ts-quick-accent,var(--ts-accent)); background-image:linear-gradient(90deg,transparent 0 9%,currentColor 9% 9.35%,transparent 9.35% 63%,currentColor 63% 63.25%,transparent 63.25%),linear-gradient(0deg,transparent 0 73%,color-mix(in srgb,currentColor 42%,transparent) 73% 73.5%,transparent 73.5%); background-size:100% 100%; }
.ts-pack-preview[data-pack-preview="editorial"] > strong { font-weight:700; letter-spacing:-.025em; }
.ts-pack-preview[data-pack-preview="editorial"] > small { letter-spacing:.13em; }
.ts-pack-preview[data-pack-preview="editorial"] .ts-pack-panel { transform:none; background:transparent; }
.ts-pack-preview[data-pack-preview="editorial"] .ts-pack-panel-a { left:12%; top:13%; width:42%; height:43%; border:0; border-top:1px solid color-mix(in srgb,var(--ts-quick-accent,var(--ts-accent)) 58%,var(--ts-border)); border-bottom:1px solid color-mix(in srgb,var(--ts-quick-accent,var(--ts-accent)) 28%,var(--ts-border)); background:linear-gradient(135deg,rgba(255,255,255,.025),rgba(255,255,255,.095)); }
.ts-pack-preview[data-pack-preview="editorial"] .ts-pack-panel-b { right:9%; top:19%; width:27%; height:32%; border:0; border-left:1px solid color-mix(in srgb,var(--ts-quick-accent,var(--ts-accent)) 42%,var(--ts-border)); background:repeating-linear-gradient(0deg,transparent 0 8px,rgba(255,255,255,.10) 8px 10px,transparent 10px 14px); }
.ts-pack-preview-large[data-pack-preview="editorial"] .ts-pack-panel-a { left:11%; top:12%; width:44%; height:45%; }
.ts-pack-preview-large[data-pack-preview="editorial"] .ts-pack-panel-b { right:9%; top:18%; width:28%; height:34%; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="editorial"] .ts-pack-preview-rail { display:block; left:24%; top:16px; bottom:17px; width:1px; box-shadow:none; opacity:.55; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="editorial"] .ts-pack-panel-a { left:8%; top:18%; width:12%; height:38%; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="editorial"] .ts-pack-panel-b { left:29%; right:10%; top:19%; width:auto; height:31%; border-left:0; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="editorial"] > strong { left:29%; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="editorial"] > small { left:29%; }
.ts-pack-hero[data-pack-layout-preview="bubble"] .ts-pack-preview[data-pack-preview="editorial"] .ts-pack-preview-rail { display:none; }

/* Editorial recipe thumbnails stay deliberately quiet. The pack should remain
   editorial even when the shared accent is hot pink, cyan, or cursed lime. */
.ts-preset-preview[data-preset-preview^="editorial-"] { background:linear-gradient(145deg,#101419,#080a0d); color:var(--ts-quick-text,#f4eef8); }
.ts-preset-preview[data-preset-preview^="editorial-"]::before { content:''; position:absolute; inset:10px 12px auto; height:1px; background:color-mix(in srgb,var(--ts-quick-accent,#9370db) 42%,transparent); }
.ts-preset-preview[data-preset-preview^="editorial-"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview^="editorial-"] .ts-preview-name,.ts-preset-preview[data-preset-preview^="editorial-"] .ts-preview-line,.ts-preset-preview[data-preset-preview^="editorial-"] .ts-preview-meta { z-index:2; }
.ts-preset-preview[data-preset-preview="editorial-feature"] .ts-preview-avatar { left:12px; top:18px; width:48%; height:59px; border-radius:0; background:linear-gradient(135deg,#242126,#4c4548); filter:saturate(.72); }
.ts-preset-preview[data-preset-preview="editorial-feature"] .ts-preview-name { left:55%; top:24px; font-family:Georgia,serif; font-size:13px; font-weight:700; letter-spacing:-.25px; }
.ts-preset-preview[data-preset-preview="editorial-feature"] .ts-preview-line { left:55%; height:2px; opacity:.55; }
.ts-preset-preview[data-preset-preview="editorial-feature"] .ts-preview-line-a { top:47px; width:34%; }
.ts-preset-preview[data-preset-preview="editorial-feature"] .ts-preview-line-b { top:55px; width:27%; }
.ts-preset-preview[data-preset-preview="editorial-feature"] .ts-preview-meta { left:55%; bottom:15px; background:transparent; border:0; padding:0; text-transform:uppercase; letter-spacing:.7px; }
.ts-preset-preview[data-preset-preview="editorial-column"]::after { content:''; position:absolute; left:26px; top:17px; bottom:14px; width:1px; background:color-mix(in srgb,var(--ts-quick-accent,#9370db) 58%,transparent); }
.ts-preset-preview[data-preset-preview="editorial-column"] .ts-preview-avatar { left:10px; top:25px; width:12px; height:32px; border-radius:0; border:1px solid color-mix(in srgb,var(--ts-quick-accent,#9370db) 48%,transparent); }
.ts-preset-preview[data-preset-preview="editorial-column"] .ts-preview-name { left:38px; top:22px; font-family:Georgia,serif; font-size:11px; font-weight:700; }
.ts-preset-preview[data-preset-preview="editorial-column"] .ts-preview-line { left:38px; height:3px; }
.ts-preset-preview[data-preset-preview="editorial-column"] .ts-preview-line-a { top:44px; width:58%; }
.ts-preset-preview[data-preset-preview="editorial-column"] .ts-preview-line-b { top:53px; width:46%; }
.ts-preset-preview[data-preset-preview="editorial-column"] .ts-preview-meta { left:38px; bottom:14px; background:transparent; border:0; padding:0; }
.ts-preset-preview[data-preset-preview="editorial-correspondence"] { background:linear-gradient(112deg,#e3ded4 0%,#d7d5cf 62%,#ccd5d3 100%); border-color:color-mix(in srgb,var(--ts-quick-accent,#92a6b3) 58%,#bfc8c5); color:#30383c; }
.ts-preset-preview[data-preset-preview="editorial-correspondence"]::before { background:color-mix(in srgb,var(--ts-quick-accent,#92a6b3) 44%,transparent); }
.ts-preset-preview[data-preset-preview="editorial-correspondence"] .ts-preview-avatar { left:12px; top:15px; width:50px; height:50px; border-radius:999px; border:4px solid #e9e2d6; box-shadow:0 0 0 1px color-mix(in srgb,var(--ts-quick-accent,#92a6b3) 62%,transparent); background:linear-gradient(135deg,#d7d2c9,#7a7f80); filter:saturate(.52) contrast(1.02); }
.ts-preset-preview[data-preset-preview="editorial-correspondence"] .ts-preview-name { left:73px; top:19px; color:#30383c; font-family:Georgia,serif; font-size:13px; font-weight:700; letter-spacing:-.2px; }
.ts-preset-preview[data-preset-preview="editorial-correspondence"] .ts-preview-meta { left:73px; top:44px; bottom:auto; color:#657278; background:transparent; border:0; padding:0; text-transform:uppercase; letter-spacing:.8px; }
.ts-preset-preview[data-preset-preview="editorial-correspondence"] .ts-preview-line { left:18px; height:2px; color:#566368; opacity:.6; }
.ts-preset-preview[data-preset-preview="editorial-correspondence"] .ts-preview-line-a { top:73px; width:72%; box-shadow:0 9px 0 currentColor; }
.ts-preset-preview[data-preset-preview="editorial-correspondence"] .ts-preview-line-b { top:91px; width:48%; }
.ts-preset-preview[data-preset-preview="editorial-byline"] .ts-preview-avatar { display:none; }
.ts-preset-preview[data-preset-preview="editorial-byline"] .ts-preview-name { left:17px; top:27px; font-family:Georgia,serif; font-size:16px; font-weight:700; letter-spacing:-.35px; }
.ts-preset-preview[data-preset-preview="editorial-byline"] .ts-preview-meta { left:17px; top:51px; bottom:auto; background:transparent; border:0; padding:0; text-transform:uppercase; letter-spacing:1px; }
.ts-preset-preview[data-preset-preview="editorial-byline"] .ts-preview-line { left:17px; top:auto; bottom:18px; height:1px; }
.ts-preset-preview[data-preset-preview="editorial-byline"] .ts-preview-line-a { width:66%; }
.ts-preset-preview[data-preset-preview="editorial-byline"] .ts-preview-line-b { display:none; }
.ts-preset-preview[data-preset-preview="editorial-headings"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="editorial-headings"] .ts-preview-name,.ts-preset-preview[data-preset-preview="editorial-headings"] .ts-preview-line,.ts-preset-preview[data-preset-preview="editorial-headings"] .ts-preview-meta,.ts-preset-preview[data-preset-preview="editorial-quote"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="editorial-quote"] .ts-preview-name,.ts-preset-preview[data-preset-preview="editorial-quote"] .ts-preview-line,.ts-preset-preview[data-preset-preview="editorial-quote"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="editorial-headings"]::after { content:'FEATURE TITLE\A Section heading\A SMALL DECK\A ISSUE NOTE'; position:absolute; left:15px; top:20px; white-space:pre-line; color:var(--ts-quick-text,#f4eef8); font:700 8px/1.95 Georgia,serif; letter-spacing:-.05px; }
.ts-preset-preview[data-preset-preview="editorial-quote"]::after { content:'“A sentence worth\A pulling into the margin.”'; position:absolute; left:18px; right:16px; top:25px; border-left:1px solid var(--ts-quick-accent,#9370db); padding:8px 0 8px 12px; white-space:pre-line; color:var(--ts-quick-text,#f4eef8); font:italic 11px/1.45 Georgia,serif; }
.ts-preset-preview[data-preset-preview="editorial-prose"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="editorial-prose"] .ts-preview-name,.ts-preset-preview[data-preset-preview="editorial-prose"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="editorial-prose"] .ts-preview-line { left:18px; height:3px; opacity:.58; }
.ts-preset-preview[data-preset-preview="editorial-prose"] .ts-preview-line-a { top:31px; width:72%; box-shadow:0 11px 0 currentColor,0 22px 0 currentColor; }
.ts-preset-preview[data-preset-preview="editorial-prose"] .ts-preview-line-b { top:64px; width:51%; }
.ts-preset-preview[data-preset-preview="editorial-avatar"] .ts-preview-avatar { left:50%; top:19px; width:58px; height:58px; transform:translateX(-50%); border-radius:999px; border:1px solid color-mix(in srgb,var(--ts-quick-accent,#9370db) 68%,transparent); background:linear-gradient(135deg,#d8d3ca,#706c70); filter:saturate(.45) contrast(.98); box-shadow:0 7px 14px -9px #000; }
.ts-preset-preview[data-preset-preview="editorial-avatar"] .ts-preview-name,.ts-preset-preview[data-preset-preview="editorial-avatar"] .ts-preview-line,.ts-preset-preview[data-preset-preview="editorial-avatar"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="editorial-composer"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="editorial-composer"] .ts-preview-name,.ts-preset-preview[data-preset-preview="editorial-composer"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="editorial-composer"] { background:linear-gradient(135deg,#e9dfd0,#d3d8d4); border-color:color-mix(in srgb,var(--ts-quick-accent,#9370db) 44%,#738288); }
.ts-preset-preview[data-preset-preview="editorial-composer"]::after { content:'✒'; position:absolute; right:17px; bottom:18px; display:grid; place-items:center; width:33px; height:33px; border:0; background:#efe3d3; color:#355d69; font:17px/1 Georgia,serif; box-shadow:inset 0 0 0 1px rgba(109,133,140,.38); transform:rotate(-2.4deg); clip-path:polygon(8% 0,16% 4%,24% 0,32% 4%,40% 0,48% 4%,56% 0,64% 4%,72% 0,80% 4%,88% 0,96% 4%,100% 8%,96% 16%,100% 24%,96% 32%,100% 40%,96% 48%,100% 56%,96% 64%,100% 72%,96% 80%,100% 88%,96% 96%,92% 100%,84% 96%,76% 100%,68% 96%,60% 100%,52% 96%,44% 100%,36% 96%,28% 100%,20% 96%,12% 100%,4% 96%,0 92%,4% 84%,0 76%,4% 68%,0 60%,4% 52%,0 44%,4% 36%,0 28%,4% 20%,0 12%,4% 4%); }
.ts-preset-preview[data-preset-preview="editorial-composer"] .ts-preview-line { left:18px; right:62px; top:auto; bottom:28px; width:auto; height:2px; opacity:.48; background:#59666b; }

/* Manga recipe thumbnails intentionally read like paper/panel composition rather than generic cards. */
.ts-preset-preview[data-preset-preview^="manga-"] { background:#08080b; color:var(--ts-quick-text,#f4eef8); }
.ts-preset-preview[data-preset-preview^="manga-"]::before { content:''; position:absolute; inset:0; opacity:.25; background-image:radial-gradient(circle,var(--ts-quick-accent,#9370db) .6px,transparent .9px); background-size:9px 9px; }
.ts-preset-preview[data-preset-preview^="manga-"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview^="manga-"] .ts-preview-name,.ts-preset-preview[data-preset-preview^="manga-"] .ts-preview-line,.ts-preset-preview[data-preset-preview^="manga-"] .ts-preview-meta { z-index:2; }
.ts-preset-preview[data-preset-preview="manga-panel"] { border-bottom:3px solid var(--ts-quick-accent,#9370db); }
.ts-preset-preview[data-preset-preview="manga-panel"] .ts-preview-avatar { left:9px; top:9px; width:62%; height:74px; border-radius:0; background:linear-gradient(135deg,#20232b,#444a59); box-shadow:4px 4px 0 rgba(0,0,0,.7); }
.ts-preset-preview[data-preset-preview="manga-panel"] .ts-preview-name { left:56%; top:26px; font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:1px; }
.ts-preset-preview[data-preset-preview="manga-panel"] .ts-preview-line { left:56%; height:4px; }
.ts-preset-preview[data-preset-preview="manga-panel"] .ts-preview-line-a { top:48px; width:33%; }
.ts-preset-preview[data-preset-preview="manga-panel"] .ts-preview-line-b { top:59px; width:25%; }
.ts-preset-preview[data-preset-preview="manga-panel"] .ts-preview-meta { left:56%; bottom:12px; border:1px solid var(--ts-quick-accent,#9370db); border-radius:0; padding:2px 4px; background:#050507; }
.ts-preset-preview[data-preset-preview="manga-margin"]::after { content:''; position:absolute; left:16px; top:11px; bottom:11px; width:2px; background:var(--ts-quick-accent,#9370db); }
.ts-preset-preview[data-preset-preview="manga-margin"] .ts-preview-avatar { left:25px; top:18px; width:38px; height:52px; border-radius:0; border:2px solid var(--ts-quick-text,#f4eef8); }
.ts-preset-preview[data-preset-preview="manga-margin"] .ts-preview-name { left:74px; top:21px; font-size:10px; font-weight:900; text-transform:uppercase; }
.ts-preset-preview[data-preset-preview="manga-margin"] .ts-preview-line { left:74px; height:4px; }
.ts-preset-preview[data-preset-preview="manga-margin"] .ts-preview-line-a { top:43px; width:46%; }
.ts-preset-preview[data-preset-preview="manga-margin"] .ts-preview-line-b { top:54px; width:35%; }
.ts-preset-preview[data-preset-preview="manga-margin"] .ts-preview-meta { left:74px; bottom:14px; }
.ts-preset-preview[data-preset-preview="manga-ink"]::after { content:''; position:absolute; inset:13px; border:2px solid var(--ts-quick-accent,#9370db); }
.ts-preset-preview[data-preset-preview="manga-ink"] .ts-preview-avatar { display:none; }
.ts-preset-preview[data-preset-preview="manga-ink"] .ts-preview-name { left:25px; top:25px; font-weight:900; text-transform:uppercase; }
.ts-preset-preview[data-preset-preview="manga-ink"] .ts-preview-line { left:25px; }
.ts-preset-preview[data-preset-preview="manga-headings"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="manga-headings"] .ts-preview-name,.ts-preset-preview[data-preset-preview="manga-headings"] .ts-preview-line,.ts-preset-preview[data-preset-preview="manga-headings"] .ts-preview-meta,.ts-preset-preview[data-preset-preview="manga-caption"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="manga-caption"] .ts-preview-name,.ts-preset-preview[data-preset-preview="manga-caption"] .ts-preview-line,.ts-preset-preview[data-preset-preview="manga-caption"] .ts-preview-meta,.ts-preset-preview[data-preset-preview="manga-code"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="manga-code"] .ts-preview-name,.ts-preset-preview[data-preset-preview="manga-code"] .ts-preview-line,.ts-preset-preview[data-preset-preview="manga-code"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="manga-headings"]::after { content:'CHAPTER 01\A SECOND SCENE\A MINOR BEAT\A SMALL LABEL'; position:absolute; left:13px; right:13px; top:12px; white-space:pre-line; color:var(--ts-quick-accent,#9370db); font:900 8px/2 var(--lumiverse-font-family,system-ui,sans-serif); letter-spacing:.8px; }
.ts-preset-preview[data-preset-preview="manga-caption"]::after { content:'NARRATION BOX'; position:absolute; left:17px; right:17px; top:22px; border:2px solid var(--ts-quick-accent,#9370db); padding:14px 9px; color:var(--ts-quick-text,#f4eef8); background:#0a0a0d; font:800 8px/1.2 var(--lumiverse-font-family,system-ui,sans-serif); letter-spacing:.8px; }
.ts-preset-preview[data-preset-preview="manga-avatar"] .ts-preview-avatar { left:50%; top:10px; width:64px; height:76px; transform:translateX(-50%) rotate(-4deg); border:6px solid #fff; border-radius:0; background:linear-gradient(135deg,#ececec,#555); filter:saturate(.12) contrast(1.25); box-shadow:8px 8px 0 #000; }
.ts-preset-preview[data-preset-preview="manga-avatar"] .ts-preview-name,.ts-preset-preview[data-preset-preview="manga-avatar"] .ts-preview-line,.ts-preset-preview[data-preset-preview="manga-avatar"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="manga-composer"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="manga-composer"] .ts-preview-name,.ts-preset-preview[data-preset-preview="manga-composer"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="manga-composer"]::after { content:'→'; position:absolute; right:16px; bottom:19px; display:grid; place-items:center; width:30px; height:30px; border:2px solid #fff; background:#fff; color:#050506; font-weight:950; box-shadow:4px 4px 0 #000; }
.ts-preset-preview[data-preset-preview="manga-composer"] .ts-preview-line { left:16px; right:58px; top:auto; bottom:23px; width:auto; height:16px; border:2px solid #fff; background:#f4f1e9; opacity:1; box-shadow:3px 3px 0 #000; }
.ts-preset-preview[data-preset-preview="manga-code"]::after { content:'01  panel.draw();\A02  // ink + dots'; position:absolute; left:15px; right:15px; top:18px; border:2px solid var(--ts-quick-accent,#9370db); padding:11px; white-space:pre-line; color:var(--ts-quick-text,#f4eef8); font:9px/1.6 var(--lumiverse-font-mono,monospace); }
.ts-preset-preview[data-preset-preview="manga-media"] .ts-preview-avatar,.ts-preset-preview[data-preset-preview="manga-media"] .ts-preview-name,.ts-preset-preview[data-preset-preview="manga-media"] .ts-preview-line,.ts-preset-preview[data-preset-preview="manga-media"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="manga-media"]::after { content:''; position:absolute; left:12px; right:12px; top:11px; bottom:11px; border:2px solid #fff; background:linear-gradient(118deg,#0b0b0c 0 19%,#e9e9e9 19% 34%,#4c4c4e 34% 52%,#f5f5f5 52% 64%,#222 64% 100%); filter:grayscale(1) contrast(1.2); box-shadow:5px 5px 0 #000; }

@media (max-width:760px) {
  .ts-pack-grid { grid-template-columns:1fr; }
  .ts-pack-open { grid-template-columns:120px minmax(0,1fr); min-height:134px; }
  .ts-pack-workspace { grid-template-columns:1fr; grid-template-rows:auto minmax(0,1fr); grid-template-areas:"sidebar" "main"; }
  .ts-pack-main { grid-area:main; scrollbar-width:none; }
  .ts-pack-main::-webkit-scrollbar { display:none; }
  .ts-pack-sidebar { grid-area:sidebar; overflow:visible; border-left:0; border-bottom:1px solid var(--ts-border); padding:7px 9px; }
  .ts-pack-sidebar-inner { grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
  .ts-pack-side-actions { grid-column:1 / -1; display:grid; grid-template-columns:minmax(0,1fr) minmax(190px,.9fr); gap:8px; align-items:center; padding:7px 8px; }
  .ts-pack-side-heading { min-width:0; }
  .ts-pack-side-heading > .ts-chip { flex:none; }
  .ts-pack-side-actions .ts-pack-main-actions { margin:0; }
  .ts-pack-side-actions > p { display:none; }
  .ts-pack-side-section > summary { min-height:39px; padding:7px 8px; }
  .ts-pack-side-section > summary .ts-chip { display:none; }
  .ts-pack-side-body { padding:8px; }
  .ts-pack-hero { grid-template-columns:minmax(170px,.8fr) minmax(0,1.2fr); min-height:136px; }
  .ts-pack-preview-large { min-height:136px; }
  .ts-pack-preview-large > strong { left:15px; bottom:38px; font-size:21px; }
  .ts-pack-preview-large > small { left:16px; bottom:19px; }
  .ts-pack-preview-large .ts-pack-panel-a { left:15px; top:15px; height:52px; }
  .ts-pack-preview-large .ts-pack-panel-b { right:16px; top:25px; height:70px; }
  .ts-pack-summary { padding:11px 12px; }
  .ts-pack-summary > strong { margin-top:7px; font-size:10px; }
  .ts-pack-detail-scroll { padding:11px 10px 20px; }
  .ts-library-card-actions { grid-template-columns:minmax(0,1fr) 38px 38px 38px; }
}

@media (max-width:520px) {
  .ts-pack-detail-head > .ts-pack-head-title > div > span { display:none; }
  .ts-pack-sidebar-inner { grid-template-columns:1fr 1fr; }
  .ts-pack-side-actions { grid-template-columns:1fr; gap:6px; }
  .ts-pack-side-heading > div > strong { display:none; }
  .ts-pack-main-actions { grid-template-columns:1fr 1fr; }
  .ts-pack-side-section > summary { grid-template-columns:minmax(0,1fr) 12px; }
  .ts-pack-side-section > summary > .ts-chip { display:none; }
  .ts-pack-hero { grid-template-columns:1fr; }
  .ts-pack-preview-large { min-height:112px; border-right:0; border-bottom:1px solid var(--ts-border); }
  .ts-pack-summary { display:none; }
}

/* V20 · lazy Read Style + page style map */
.ts-style-stack-tools { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.ts-style-stack-tools .ts-btn svg { width:14px; height:14px; }
.ts-observed-banner { display:flex; align-items:center; gap:8px; margin:7px 0 9px; padding:8px 10px; border:1px dashed color-mix(in srgb,var(--ts-accent) 44%,var(--ts-border)); border-radius:8px; background:color-mix(in srgb,var(--ts-accent-soft) 48%,transparent); }
.ts-observed-banner strong { flex:none; font-size:9px; }
.ts-observed-banner span { color:var(--ts-muted); font-size:8px; line-height:1.4; }
.ts-packet.is-observed { border-style:dashed; border-color:color-mix(in srgb,var(--ts-accent) 38%,var(--ts-border)); }
.ts-packet.is-observed .ts-packet-icon { opacity:.7; }
.ts-packet-origin { display:inline-flex; margin-left:6px; border:1px solid color-mix(in srgb,var(--ts-accent) 45%,var(--ts-border)); border-radius:999px; padding:2px 5px; color:var(--ts-accent); font-size:6px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; vertical-align:middle; }
.ts-packet-origin.is-owned { color:var(--ts-text); background:var(--ts-accent-soft); }
.ts-observed-note { margin:-2px 0 10px; padding:7px 8px; border-left:2px solid var(--ts-accent); color:var(--ts-muted); background:color-mix(in srgb,var(--ts-accent-soft) 38%,transparent); font-size:8px; line-height:1.45; }
.ts-style-map-root[hidden] { display:none !important; }
.ts-style-map-root { position:fixed; inset:0; z-index:2147483004; display:grid; place-items:center; padding:20px; background:rgba(4,4,8,.64); backdrop-filter:blur(5px); }
.ts-style-map-modal { display:grid; grid-template-rows:auto auto minmax(0,1fr); width:min(880px,calc(100vw - 24px)); height:min(82dvh,760px); overflow:hidden; border:1px solid var(--ts-border); border-radius:15px; background:var(--ts-panel); color:var(--ts-text); box-shadow:0 28px 80px rgba(0,0,0,.46); }
.ts-style-map-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 15px 11px; border-bottom:1px solid var(--ts-border); }
.ts-style-map-head > div { display:grid; gap:2px; }
.ts-style-map-head strong { font-size:16px; }
.ts-style-map-head small { color:var(--ts-muted); font-size:8px; }
.ts-style-map-toolbar { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid var(--ts-border); }
.ts-style-map-toolbar span { color:var(--ts-muted); font-size:8px; white-space:nowrap; }
.ts-style-map-list { overflow:auto; padding:12px 14px 24px; scrollbar-width:thin; }
.ts-style-map-group + .ts-style-map-group { margin-top:15px; }
.ts-style-map-item { appearance:none; display:grid; grid-template-columns:minmax(0,1fr) minmax(150px,.75fr) 14px; align-items:center; gap:12px; width:100%; margin-top:5px; padding:9px 10px; border:1px solid var(--ts-border); border-radius:9px; background:var(--ts-elevated); color:inherit; text-align:left; cursor:pointer; font:inherit; }
.ts-style-map-item:hover { border-color:color-mix(in srgb,var(--ts-accent) 52%,var(--ts-border)); background:color-mix(in srgb,var(--ts-accent-soft) 36%,var(--ts-elevated)); }
.ts-style-map-item strong,.ts-style-map-item small,.ts-style-map-source b { display:block; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ts-style-map-item strong { font-size:9px; }
.ts-style-map-item small { margin-top:2px; color:var(--ts-muted); font-size:7px; }
.ts-style-map-source { min-width:0; }
.ts-style-map-source b { color:var(--ts-accent); font-size:7px; font-weight:700; }
@media (max-width:600px) {
  .ts-style-stack-head { align-items:flex-start; }
  .ts-style-stack-tools .ts-btn span { display:none; }
  .ts-style-map-root { place-items:end stretch; padding:0; background:rgba(4,4,8,.45); }
  .ts-style-map-modal { width:100%; height:86dvh; border-radius:18px 18px 0 0; border-bottom:0; }
  .ts-style-map-toolbar { grid-template-columns:1fr; gap:5px; }
  .ts-style-map-list { scrollbar-width:none; }
  .ts-style-map-list::-webkit-scrollbar { display:none; }
  .ts-style-map-item { grid-template-columns:minmax(0,1fr) 14px; }
  .ts-style-map-source { grid-column:1 / -1; grid-row:2; }
}


/* V22 · Style Library browser shell
   Packs and recipe cards are the content; navigation/search/filter chrome gets
   out of their way. Families now filter recipe cards only and live behind a
   nested filter dialog instead of occupying the top half of the library. */
.ts-library-browser { grid-template-rows:auto minmax(0,1fr); }
.ts-library-workspace { display:grid; grid-template-columns:218px minmax(0,1fr); min-width:0; min-height:0; overflow:hidden; }
.ts-library-sidebar { display:flex; flex-direction:column; gap:12px; min-width:0; min-height:0; overflow:auto; padding:12px; border-right:1px solid var(--ts-border); background:color-mix(in srgb,var(--ts-elevated) 90%,var(--ts-surface)); scrollbar-width:thin; }
.ts-library-view-nav { display:grid; gap:4px; }
.ts-library-view-nav button { appearance:none; display:grid; grid-template-columns:20px minmax(0,1fr); gap:7px; align-items:center; width:100%; border:1px solid transparent; border-radius:8px; padding:8px 9px; background:transparent; color:var(--ts-muted); text-align:left; cursor:pointer; font:inherit; font-size:9px; }
.ts-library-view-nav button > span { display:grid; place-items:center; width:20px; height:20px; border-radius:6px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.035)); color:var(--ts-dim); font-size:10px; }
.ts-library-view-nav button:hover { border-color:var(--ts-border); color:var(--ts-text); background:var(--lumiverse-fill-subtle,rgba(255,255,255,.025)); }
.ts-library-view-nav button[aria-pressed="true"] { border-color:color-mix(in srgb,var(--ts-accent) 42%,var(--ts-border)); background:var(--ts-accent-soft); color:var(--ts-text); }
.ts-library-view-nav button[aria-pressed="true"] > span { color:var(--ts-accent); background:color-mix(in srgb,var(--ts-accent) 14%,transparent); }
.ts-library-side-status { display:grid; gap:4px; padding:11px 10px; border-top:1px solid var(--ts-border); border-bottom:1px solid var(--ts-border); }
.ts-library-side-status .ts-kicker { margin:0; }
.ts-library-side-status > strong { font-size:10px; }
.ts-library-side-status > p { margin:0; color:var(--ts-muted); font-size:7.5px; line-height:1.45; }
.ts-library-tune { margin-top:auto; overflow:hidden; border:1px solid color-mix(in srgb,var(--ts-accent) 22%,var(--ts-border)); border-radius:10px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.06)); }
.ts-library-tune > summary { list-style:none; display:grid; grid-template-columns:minmax(0,1fr) 12px; gap:8px; align-items:center; min-height:46px; padding:8px 9px; cursor:pointer; user-select:none; }
.ts-library-tune > summary::-webkit-details-marker { display:none; }
.ts-library-tune > summary > div { display:grid; gap:4px; min-width:0; }
.ts-library-tune > summary strong { font-size:8.5px; }
.ts-library-tune > summary span { display:flex; align-items:center; gap:4px; color:var(--ts-muted); font-size:7px; }
.ts-library-tune > summary i { width:9px; height:9px; border:1px solid color-mix(in srgb,var(--ts-text) 30%,transparent); border-radius:999px; background:var(--swatch); }
.ts-library-tune > summary b { color:var(--ts-dim); font-size:10px; font-weight:500; transform:rotate(-90deg); transition:transform .12s ease; }
.ts-library-tune[open] > summary b { transform:rotate(0); }
.ts-library-tune[open] > summary { border-bottom:1px solid var(--ts-border); }
.ts-library-tune-body { padding:9px; }
.ts-library-tune .ts-quick-builder { margin:0; border:0; border-radius:0; padding:0; background:transparent; }
.ts-library-tune .ts-quick-builder-head { display:none; }
.ts-library-tune .ts-quick-builder-grid { grid-template-columns:1fr; gap:7px; }
.ts-library-tune .ts-quick-intensity { margin-top:7px; }
.ts-library-tune .ts-recent { margin-top:7px; }

.ts-library-results { display:grid; grid-template-rows:auto minmax(0,1fr); min-width:0; min-height:0; overflow:hidden; }
.ts-library-results-toolbar { display:grid; gap:8px; padding:11px 14px 10px; border-bottom:1px solid var(--ts-border); background:color-mix(in srgb,var(--ts-elevated) 88%,transparent); }
.ts-library-results-title { display:flex; align-items:end; justify-content:space-between; gap:12px; min-width:0; }
.ts-library-results-title > div { display:grid; gap:1px; min-width:0; }
.ts-library-results-title .ts-kicker { margin:0; }
.ts-library-results-title strong { font-size:12px; }
.ts-library-results-title > span { flex:none; color:var(--ts-dim); font-size:8px; }
.ts-library-search-row { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:7px; align-items:end; }
.ts-library-browser .ts-library-search { display:grid; grid-template-columns:1fr; gap:4px; min-width:0; }
.ts-library-browser .ts-library-search > span { color:var(--ts-dim); font-size:7px; font-weight:750; letter-spacing:.07em; text-transform:uppercase; }
.ts-library-browser .ts-library-search .ts-search { width:100%; min-width:0; }
.ts-library-pack-owned-toggle { appearance:none; display:flex; align-items:center; gap:7px; min-height:34px; border:1px solid var(--ts-border); border-radius:9px; padding:5px 9px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.06)); color:var(--ts-muted); cursor:pointer; font:inherit; font-size:8.5px; font-weight:680; white-space:nowrap; }
.ts-library-pack-owned-toggle:hover { border-color:color-mix(in srgb,var(--ts-accent) 48%,var(--ts-border)); color:var(--ts-text); }
.ts-library-toggle-track { position:relative; flex:none; width:25px; height:14px; border:1px solid var(--ts-border); border-radius:999px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.04)); transition:border-color .12s ease,background .12s ease; }
.ts-library-toggle-track > i { position:absolute; top:2px; left:2px; width:8px; height:8px; border-radius:999px; background:var(--ts-dim); transition:translate .12s ease,background .12s ease; }
.ts-library-pack-owned-toggle[aria-pressed="true"] { border-color:color-mix(in srgb,var(--ts-accent) 46%,var(--ts-border)); color:var(--ts-text); background:color-mix(in srgb,var(--ts-accent-soft) 64%,transparent); }
.ts-library-pack-owned-toggle[aria-pressed="true"] .ts-library-toggle-track { border-color:color-mix(in srgb,var(--ts-accent) 68%,var(--ts-border)); background:color-mix(in srgb,var(--ts-accent) 22%,transparent); }
.ts-library-pack-owned-toggle[aria-pressed="true"] .ts-library-toggle-track > i { translate:11px 0; background:var(--ts-accent); }
.ts-library-filter-trigger { position:relative; min-width:78px; height:34px; }
.ts-library-filter-trigger > span { display:grid; place-items:center; min-width:16px; height:16px; margin-left:5px; border-radius:999px; background:var(--ts-accent); color:var(--ts-on-accent,#fff); font-size:7px; }
.ts-library-active-filters { display:flex; flex-wrap:wrap; gap:5px; align-items:center; min-height:24px; }
.ts-library-active-filters > span { margin-right:2px; color:var(--ts-dim); font-size:7px; font-weight:750; letter-spacing:.06em; text-transform:uppercase; }
.ts-library-active-filters button { appearance:none; border:1px solid color-mix(in srgb,var(--ts-accent) 35%,var(--ts-border)); border-radius:999px; padding:4px 7px; background:var(--ts-accent-soft); color:var(--ts-muted); cursor:pointer; font:inherit; font-size:7px; }
.ts-library-active-filters button:hover { color:var(--ts-text); border-color:var(--ts-accent); }
.ts-library-active-filters button > span { margin-left:3px; color:var(--ts-accent); }
.ts-library-active-filters button:last-child { margin-left:auto; border-color:transparent; background:transparent; color:var(--ts-dim); }
.ts-library-browser .ts-style-library-scroll { padding:13px 14px 24px; }
.ts-library-browser .ts-library-group + .ts-library-group { margin-top:20px; }
.ts-library-browser .ts-library-group-head { align-items:end; margin:0 1px 8px; }
.ts-library-browser .ts-library-group-head > div { display:grid; gap:2px; }
.ts-library-browser .ts-library-group-head strong { font-size:10.5px; }
.ts-library-browser .ts-library-group-head small { color:var(--ts-dim); font-size:7px; font-weight:500; }

/* Packs read like album covers instead of oversized recipe cards. */
.ts-library-browser .ts-pack-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:11px; }
.ts-library-browser .ts-pack-card { border-radius:10px; }
.ts-library-browser .ts-pack-open { display:grid; grid-template-columns:1fr; grid-template-rows:118px minmax(0,1fr); min-height:238px; }
.ts-library-browser .ts-pack-preview { min-height:118px; border-right:0; border-bottom:1px solid var(--ts-border); }
.ts-library-browser .ts-pack-preview > strong { font-size:17px; }
.ts-library-browser .ts-pack-copy { justify-content:flex-start; padding:11px 38px 11px 11px; }
.ts-library-browser .ts-pack-copy strong { font-size:11px; }
.ts-library-browser .ts-pack-copy p { display:-webkit-box; margin:6px 0 8px; overflow:hidden; -webkit-box-orient:vertical; -webkit-line-clamp:3; font-size:7.5px; line-height:1.42; }
.ts-library-browser .ts-pack-copy > span { margin-top:auto; font-size:6.5px; }
.ts-library-browser .ts-pack-favorite { top:8px; right:8px; width:28px; height:28px; }

/* Yes, this is intentionally a modal in the modal. The filter vocabulary can
   grow without turning the library header into a tag-management dashboard. */
.ts-library-filter-layer { position:absolute; inset:0; z-index:20; display:grid; place-items:center; padding:18px; }
.ts-library-filter-scrim { position:absolute; inset:0; width:100%; height:100%; border:0; padding:0; background:rgba(0,0,0,.58); backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px); cursor:default; }
.ts-library-filter-dialog { position:relative; display:grid; grid-template-rows:auto minmax(0,1fr) auto; width:min(540px,calc(100% - 24px)); max-height:min(680px,calc(100% - 28px)); overflow:hidden; border:1px solid color-mix(in srgb,var(--ts-accent) 38%,var(--ts-border)); border-radius:14px; background:var(--ts-elevated); box-shadow:0 22px 70px rgba(0,0,0,.55); }
.ts-library-filter-dialog > header { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:start; padding:13px 14px 11px; border-bottom:1px solid var(--ts-border); }
.ts-library-filter-dialog > header .ts-kicker { margin:0 0 2px; }
.ts-library-filter-dialog > header h3 { margin:0; font-size:15px; }
.ts-library-filter-dialog > header span { display:block; max-width:430px; margin-top:4px; color:var(--ts-muted); font-size:8px; line-height:1.4; }
.ts-library-filter-body { min-height:0; overflow:auto; padding:12px 14px; scrollbar-width:thin; }
.ts-library-filter-body > section + section { margin-top:15px; padding-top:14px; border-top:1px solid var(--ts-border); }
.ts-library-filter-label { display:flex; justify-content:space-between; gap:10px; align-items:baseline; margin-bottom:7px; }
.ts-library-filter-label strong { font-size:9px; }
.ts-library-filter-label span { color:var(--ts-dim); font-size:7px; }
.ts-library-filter-grid,.ts-library-family-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; }
.ts-library-filter-grid-small { grid-template-columns:repeat(3,minmax(0,1fr)); max-width:320px; }
.ts-library-filter-grid button,.ts-library-family-grid button { appearance:none; min-height:33px; border:1px solid var(--ts-border); border-radius:8px; padding:6px 8px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.06)); color:var(--ts-muted); cursor:pointer; font:inherit; font-size:8px; text-align:left; }
.ts-library-filter-grid button:hover,.ts-library-family-grid button:hover { border-color:color-mix(in srgb,var(--ts-accent) 48%,var(--ts-border)); color:var(--ts-text); }
.ts-library-filter-grid button[aria-pressed="true"],.ts-library-family-grid button[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); color:var(--ts-text); }
.ts-library-filter-dialog > footer { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:7px; align-items:center; padding:10px 14px; border-top:1px solid var(--ts-border); background:color-mix(in srgb,var(--ts-surface) 72%,transparent); }
.ts-library-filter-dialog > footer > span { color:var(--ts-dim); font-size:7.5px; }

@media (max-width:960px) {
  .ts-library-workspace { grid-template-columns:188px minmax(0,1fr); }
  .ts-library-browser .ts-pack-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
}

@media (max-width:760px) {
  .ts-library-browser { grid-template-rows:auto minmax(0,1fr); }
  .ts-library-browser .ts-style-library-head { padding:11px 12px 9px; }
  .ts-library-workspace { grid-template-columns:1fr; grid-template-rows:auto minmax(0,1fr); }
  .ts-library-sidebar { display:grid; gap:6px; overflow:visible; padding:7px 8px; border-right:0; border-bottom:1px solid var(--ts-border); }
  .ts-library-view-nav { grid-template-columns:repeat(4,minmax(0,1fr)); gap:4px; }
  .ts-library-view-nav button { display:flex; justify-content:center; gap:4px; min-width:0; padding:6px 4px; text-align:center; font-size:7px; }
  .ts-library-view-nav button > span { width:16px; height:16px; font-size:8px; }
  .ts-library-side-status { display:none; }
  .ts-library-tune { margin-top:0; }
  .ts-library-tune > summary { min-height:34px; padding:5px 8px; }
  .ts-library-tune > summary > div { display:flex; justify-content:space-between; gap:8px; align-items:center; }
  .ts-library-tune > summary strong { font-size:7.5px; }
  .ts-library-results-toolbar { gap:6px; padding:8px 9px; }
  .ts-library-results-title { display:none; }
  .ts-library-search-row { grid-template-columns:minmax(0,1fr) auto auto; align-items:end; }
  .ts-library-browser .ts-library-search > span { display:none; }
  .ts-library-filter-trigger { height:32px; min-width:72px; }
  .ts-library-active-filters { flex-wrap:nowrap; overflow-x:auto; padding-bottom:1px; scrollbar-width:none; }
  .ts-library-active-filters::-webkit-scrollbar { display:none; }
  .ts-library-active-filters > span { display:none; }
  .ts-library-active-filters button { flex:none; }
  .ts-library-active-filters button:last-child { margin-left:0; }
  .ts-library-browser .ts-style-library-scroll { padding:10px 9px 18px; }
  .ts-library-browser .ts-library-group-head small { display:none; }
  .ts-library-browser .ts-pack-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .ts-library-browser .ts-pack-open { grid-template-rows:102px minmax(0,1fr); min-height:218px; }
  .ts-library-browser .ts-pack-preview { min-height:102px; }
  .ts-library-filter-layer { place-items:end center; padding:0; }
  .ts-library-filter-dialog { width:100%; max-height:82%; border-width:1px 0 0; border-radius:16px 16px 0 0; }
  .ts-library-filter-dialog > header { padding:11px 12px 9px; }
  .ts-library-filter-dialog > header span { font-size:7.5px; }
  .ts-library-filter-body { padding:10px 12px; }
  .ts-library-filter-grid,.ts-library-family-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .ts-library-filter-grid-small { grid-template-columns:repeat(3,minmax(0,1fr)); max-width:none; }
  .ts-library-filter-dialog > footer { grid-template-columns:1fr 1fr; padding:9px 12px; }
  .ts-library-filter-dialog > footer > span { display:none; }
}

@media (max-width:520px) {
  .ts-library-browser .ts-style-library-head > div > span { display:none; }
  .ts-library-view-nav button > span { display:none; }
  .ts-library-browser .ts-pack-grid { grid-template-columns:1fr; }
  .ts-library-browser .ts-pack-open { grid-template-columns:112px minmax(0,1fr); grid-template-rows:1fr; min-height:132px; }
  .ts-library-browser .ts-pack-preview { min-height:132px; border-right:1px solid var(--ts-border); border-bottom:0; }
  .ts-library-browser .ts-pack-copy p { -webkit-line-clamp:3; }
  .ts-library-search-row { grid-template-columns:minmax(0,1fr) auto; }
  .ts-library-browser .ts-library-search { grid-column:1 / -1; }
  .ts-library-pack-owned-toggle { grid-column:1; justify-self:start; min-height:31px; padding:4px 8px; font-size:8px; }
  .ts-library-filter-trigger { grid-column:2; }
  .ts-library-filter-label { display:grid; gap:2px; }
}
.ts-library-family-jump { appearance:none; cursor:pointer; font:inherit; }
.ts-library-family-jump:hover { border-color:var(--ts-accent); color:var(--ts-text)!important; }


/* V23 · pack workbench. Packs are no longer just recipe shelves: choose the
   message anatomy, stage a custom subset, then apply/reset that blend without
   inventing a second styling engine. */
.ts-pack-workbench-actions { padding:10px; }
.ts-pack-layout-picker { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px; margin-top:9px; padding:3px; border:1px solid var(--ts-border); border-radius:8px; background:color-mix(in srgb,var(--ts-surface) 72%,transparent); }
.ts-pack-layout-picker button { appearance:none; min-width:0; border:0; border-radius:6px; padding:6px 5px; background:transparent; color:var(--ts-muted); cursor:pointer; font:inherit; font-size:7.5px; font-weight:720; }
.ts-pack-layout-picker button:hover:not(:disabled) { color:var(--ts-text); background:var(--lumiverse-fill-subtle,rgba(255,255,255,.04)); }
.ts-pack-layout-picker button[aria-pressed="true"] { background:var(--ts-accent-soft); color:var(--ts-text); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ts-accent) 50%,var(--ts-border)); }
.ts-pack-layout-picker button:disabled { opacity:.35; cursor:not-allowed; }
.ts-pack-selection-summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; margin-top:8px; }
.ts-pack-selection-summary > div { display:grid; gap:1px; min-width:0; border:1px solid var(--ts-border); border-radius:7px; padding:6px 7px; background:color-mix(in srgb,var(--ts-elevated) 58%,transparent); }
.ts-pack-selection-summary strong { font-size:11px; line-height:1; }
.ts-pack-selection-summary span { overflow:hidden; color:var(--ts-dim); font-size:6.5px; text-overflow:ellipsis; white-space:nowrap; }
.ts-pack-selection-tools { display:flex; flex-wrap:wrap; gap:4px; margin-top:7px; }
.ts-pack-selection-tools button { appearance:none; border:1px solid var(--ts-border); border-radius:999px; padding:4px 7px; background:transparent; color:var(--ts-muted); cursor:pointer; font:inherit; font-size:6.5px; }
.ts-pack-selection-tools button:hover:not(:disabled) { border-color:color-mix(in srgb,var(--ts-accent) 50%,var(--ts-border)); color:var(--ts-text); }
.ts-pack-selection-tools button:disabled { opacity:.35; cursor:not-allowed; }
.ts-pack-main-actions-workbench { margin-top:8px; }
.ts-pack-secondary-actions { display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-top:5px; padding-top:7px; border-top:1px solid var(--ts-border); }
.ts-pack-workbench-actions > p { margin-top:7px; }
.ts-pack-recipe-manifest[open] { border-color:color-mix(in srgb,var(--ts-accent) 38%,var(--ts-border)); }
.ts-pack-manifest { display:grid; gap:9px; }
.ts-pack-manifest-group { display:grid; gap:4px; }
.ts-pack-manifest-group > span { color:var(--ts-dim); font-size:6.5px; font-weight:780; letter-spacing:.07em; text-transform:uppercase; }
.ts-pack-manifest-row { appearance:none; display:grid; grid-template-columns:20px minmax(0,1fr) auto; gap:6px; align-items:center; width:100%; border:1px solid transparent; border-radius:7px; padding:5px; background:transparent; color:inherit; cursor:pointer; font:inherit; text-align:left; }
.ts-pack-manifest-row:hover:not(:disabled) { border-color:var(--ts-border); background:color-mix(in srgb,var(--ts-elevated) 62%,transparent); }
.ts-pack-manifest-row[aria-pressed="true"] { border-color:color-mix(in srgb,var(--ts-accent) 42%,var(--ts-border)); background:var(--ts-accent-soft); }
.ts-pack-manifest-row:disabled { opacity:.35; cursor:not-allowed; }
.ts-pack-check { display:grid; place-items:center; width:19px; height:19px; border:1px solid var(--ts-border); border-radius:5px; color:var(--ts-accent); font-size:9px; font-weight:900; }
.ts-pack-manifest-row[aria-pressed="true"] .ts-pack-check { border-color:var(--ts-accent); background:color-mix(in srgb,var(--ts-accent) 18%,transparent); }
.ts-pack-manifest-row > span:nth-child(2) { min-width:0; }
.ts-pack-manifest-row strong,.ts-pack-manifest-row small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ts-pack-manifest-row strong { font-size:7.5px; }
.ts-pack-manifest-row small { margin-top:1px; color:var(--ts-dim); font-size:6.2px; }
.ts-pack-manifest-row i { color:var(--ts-accent); font-size:6px; font-style:normal; font-weight:800; text-transform:uppercase; }

.ts-pack-section-nav { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:4px; overflow-x:auto; padding:7px 14px; border-bottom:1px solid var(--ts-border); background:color-mix(in srgb,var(--ts-panel) 94%,transparent); backdrop-filter:blur(10px); scrollbar-width:none; }
.ts-pack-section-nav::-webkit-scrollbar { display:none; }
.ts-pack-section-nav > span { flex:none; margin-right:2px; color:var(--ts-dim); font-size:6.5px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; }
.ts-pack-section-nav button { appearance:none; flex:none; border:1px solid var(--ts-border); border-radius:999px; padding:4px 8px; background:transparent; color:var(--ts-muted); cursor:pointer; font:inherit; font-size:6.8px; }
.ts-pack-section-nav button:hover { border-color:color-mix(in srgb,var(--ts-accent) 50%,var(--ts-border)); color:var(--ts-text); }
.ts-pack-recipe-section { scroll-margin-top:46px; }
.ts-pack-section-head { align-items:center!important; }
.ts-pack-section-head > div { display:grid; gap:2px; }
.ts-pack-section-head small { color:var(--ts-dim); font-size:6.5px; font-weight:500; }
.ts-pack-section-tools { display:flex; align-items:center; gap:5px; }
.ts-pack-section-tools > span { min-width:22px!important; }
.ts-pack-section-tools .ts-btn { min-height:25px; padding:4px 7px; font-size:6.5px; }

.ts-pack-recipe-card { position:relative; transition:border-color .12s ease,opacity .12s ease,box-shadow .12s ease; }
.ts-pack-recipe-card.is-pack-chosen { border-color:color-mix(in srgb,var(--ts-accent) 62%,var(--ts-border)); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ts-accent) 15%,transparent); }
.ts-pack-recipe-card.is-pack-incompatible { opacity:.44; }
.ts-pack-card-select { position:absolute; z-index:4; top:7px; right:7px; appearance:none; display:flex; align-items:center; gap:4px; min-height:24px; border:1px solid color-mix(in srgb,var(--ts-accent) 38%,var(--ts-border)); border-radius:999px; padding:3px 7px 3px 4px; background:color-mix(in srgb,var(--ts-panel) 90%,transparent); color:var(--ts-muted); cursor:pointer; font:inherit; font-size:6.5px; font-weight:750; backdrop-filter:blur(7px); }
.ts-pack-card-select > span { display:grid; place-items:center; width:15px; height:15px; border-radius:50%; background:var(--ts-accent-soft); color:var(--ts-accent); font-size:8px; }
.ts-pack-card-select[aria-pressed="true"] { border-color:var(--ts-accent); color:var(--ts-text); background:color-mix(in srgb,var(--ts-accent-soft) 78%,var(--ts-panel)); }
.ts-pack-card-select:disabled { opacity:.72; cursor:not-allowed; }

.ts-pack-preview-rail { display:none; position:absolute; z-index:2; left:21px; top:19px; bottom:19px; width:3px; background:var(--ts-quick-accent,var(--ts-accent)); box-shadow:12px 0 0 color-mix(in srgb,var(--ts-quick-accent,var(--ts-accent)) 18%,transparent); }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="manga"] .ts-pack-preview-rail { display:block; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="manga"] .ts-pack-panel-a { display:none; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="manga"] .ts-pack-panel-b { left:48px; right:auto; top:22px; width:33%; height:86px; transform:none; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="manga"] > strong { left:48%; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="manga"] > small { left:48%; }
.ts-pack-hero[data-pack-layout-preview="bubble"] .ts-pack-preview[data-pack-preview="manga"] .ts-pack-preview-rail { display:none; }

@media (max-width:760px) {
  .ts-pack-workbench-actions { display:block; grid-column:1 / -1; }
  .ts-pack-workbench-actions .ts-pack-side-heading { margin-bottom:0; }
  .ts-pack-workbench-actions .ts-pack-main-actions { margin-top:7px; }
  .ts-pack-workbench-actions > p { display:none; }
  .ts-pack-selection-summary { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .ts-pack-recipe-manifest { grid-column:1 / -1; }
  .ts-pack-section-nav { padding:6px 9px; }
  .ts-pack-card-select { top:6px; right:6px; }
}

@media (max-width:520px) {
  .ts-pack-selection-summary { display:none; }
  .ts-pack-selection-tools { margin-top:6px; }
  .ts-pack-secondary-actions { padding-top:5px; }
  .ts-pack-workbench-actions .ts-pack-main-actions-workbench { grid-template-columns:1fr 1fr; }
  .ts-pack-section-nav > span { display:none; }
  .ts-pack-section-head small { display:none; }
  .ts-pack-section-tools .ts-btn { padding-inline:6px; }
  .ts-pack-card-select { min-height:22px; padding-right:6px; }
}

/* Native ctx.theme authoring bridge */
.ts-native-asset { display:grid; grid-template-columns:48px minmax(0,1fr) auto; gap:9px; align-items:center; padding:9px; border-top:1px solid var(--ts-border); background:var(--ts-elevated); }
.ts-native-asset:first-child { border-top:0; }
.ts-native-asset-preview { display:grid; place-items:center; width:48px; height:48px; overflow:hidden; border:1px solid var(--ts-border); border-radius:7px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.04)); color:var(--ts-muted); }
.ts-native-asset-preview img { width:100%; height:100%; object-fit:cover; }
.ts-native-asset-copy { display:grid; min-width:0; gap:2px; }
.ts-native-asset-copy strong, .ts-native-asset-copy span, .ts-native-asset-copy code { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ts-native-asset-copy strong { color:var(--ts-text); font-size:11px; }
.ts-native-asset-copy span { color:var(--ts-muted); font-size:9px; }
.ts-native-asset-copy code { color:var(--lumiverse-primary-text,#d2b7ff); font-size:9px; }
.ts-native-asset-actions { display:flex; gap:4px; }
.ts-native-status { margin-top:8px; border:1px solid var(--ts-border); border-left:2px solid var(--ts-accent); border-radius:7px; padding:8px 9px; background:var(--ts-accent-soft); color:var(--ts-text); font-size:10px; line-height:1.45; }
@media (max-width: 520px) {
  .ts-native-asset { grid-template-columns:42px minmax(0,1fr); }
  .ts-native-asset-preview { width:42px; height:42px; }
  .ts-native-asset-actions { grid-column:2; justify-content:flex-end; }
}


/* v26 · Responsive authoring ------------------------------------------------ */
.ts-responsive-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; margin:0 0 7px; padding:7px 8px; border:1px solid color-mix(in srgb,var(--ts-accent) 18%,var(--ts-border)); border-radius:9px; background:color-mix(in srgb,var(--ts-accent) 4%,var(--ts-surface)); }
.ts-responsive-row > div:first-child { min-width:0; display:grid; gap:2px; }
.ts-responsive-row > div:first-child strong { font-size:10px; font-weight:700; color:var(--ts-text); }
.ts-responsive-row .ts-kicker { margin:0; font-size:7px; color:var(--ts-muted); }
.ts-responsive-switch { display:grid; grid-template-columns:1fr 1fr; gap:4px; min-width:180px; }
.ts-responsive-switch .ts-btn { min-height:28px; padding:4px 9px; font-size:8px; }
.ts-responsive-switch .ts-btn[aria-pressed="true"] { border-color:color-mix(in srgb,var(--ts-accent) 70%,var(--ts-border)); background:color-mix(in srgb,var(--ts-accent) 14%,var(--ts-elevated)); color:var(--ts-text); }

/* Pack detail is a workspace now, not a modal inside a modal. */
.ts-style-library-modal.ts-pack-detail { inset:0; border:0; border-radius:0; box-shadow:none; }
.ts-pack-detail .ts-pack-detail-head { min-height:62px; padding:10px 14px 9px; }
.ts-pack-detail .ts-pack-detail-head h2 { font-size:18px; }
.ts-pack-detail .ts-pack-detail-head > div > span { max-width:980px; }
.ts-pack-detail .ts-pack-workspace { grid-template-columns:minmax(0,1fr) 310px; }
.ts-pack-detail .ts-pack-main { padding-bottom:18px; }
.ts-pack-detail .ts-pack-sidebar { padding:10px; }
.ts-pack-detail .ts-pack-hero { min-height:116px; }
.ts-pack-detail .ts-preset-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }

@media (min-width: 1500px) {
  .ts-pack-detail .ts-pack-workspace { grid-template-columns:minmax(0,1fr) 326px; }
  .ts-pack-detail .ts-preset-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
}
@media (max-width: 900px) {
  .ts-responsive-row { grid-template-columns:1fr; gap:6px; }
  .ts-responsive-switch { min-width:0; }
  .ts-style-library-modal.ts-pack-detail { inset:0; border-radius:0; }
  .ts-pack-detail .ts-pack-workspace { grid-template-columns:1fr; grid-template-rows:auto minmax(0,1fr); }
  .ts-pack-detail .ts-preset-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (max-width: 560px) {
  .ts-pack-detail .ts-preset-grid { grid-template-columns:1fr; }
  .ts-pack-detail .ts-pack-detail-head > div > span { display:none; }
}

/* v27 · magic controls, full-screen library, and guided placement */
.ts-style-library-modal { inset:0; border:0; border-radius:0; box-shadow:none; }
.ts-style-library-head { border-radius:0; }
.ts-style-library-backdrop { background:rgba(0,0,0,.66); }

.ts-magic-effects { display:grid; gap:9px; margin-top:10px; padding:10px; border:1px solid color-mix(in srgb,var(--ts-accent) 32%,var(--ts-border)); border-radius:9px; background:color-mix(in srgb,var(--ts-accent-soft) 28%,var(--ts-elevated)); }
.ts-magic-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.ts-magic-head > div { display:grid; gap:2px; }
.ts-magic-head strong { font-size:10px; }

.ts-offset-pad { --ts-offset-x:0; --ts-offset-y:0; position:relative; width:min(100%,240px); aspect-ratio:1.7/1; margin:8px auto 10px; overflow:hidden; border:1px solid var(--ts-border); border-radius:9px; background:linear-gradient(90deg,transparent calc(50% - .5px),color-mix(in srgb,var(--ts-border) 70%,transparent) 50%,transparent calc(50% + .5px)),linear-gradient(transparent calc(50% - .5px),color-mix(in srgb,var(--ts-border) 70%,transparent) 50%,transparent calc(50% + .5px)),color-mix(in srgb,var(--ts-surface) 72%,transparent); cursor:crosshair; touch-action:none; }
.ts-offset-pad::before { content:''; position:absolute; inset:10px; border:1px dashed color-mix(in srgb,var(--ts-muted) 26%,transparent); border-radius:6px; pointer-events:none; }
.ts-offset-dot { position:absolute; left:var(--ts-offset-left,50%); top:var(--ts-offset-top,50%); width:18px; height:18px; border-radius:999px; border:2px solid var(--ts-text); background:var(--ts-accent); box-shadow:0 4px 16px rgba(0,0,0,.35); transform:translate(-50%,-50%); padding:0; cursor:grab; }
.ts-offset-dot:active { cursor:grabbing; }
.ts-offset-values { display:grid; grid-template-columns:1fr 1fr auto; gap:7px; align-items:end; }
.ts-offset-values label { display:grid; gap:4px; min-width:0; color:var(--ts-muted); font-size:8px; }
.ts-offset-values .ts-btn { min-height:31px; }

[data-packet-id].is-arrived { animation:ts-slot-arrive .85s ease; }
@keyframes ts-slot-arrive { 0%,100% { box-shadow:var(--lumiverse-highlight-inset,inset 0 1px rgba(255,255,255,.05)); } 25% { box-shadow:0 0 0 2px color-mix(in srgb,var(--ts-accent) 72%,transparent),0 0 26px color-mix(in srgb,var(--ts-accent) 24%,transparent); } }

.ts-pack-asset-bound { display:grid !important; grid-template-columns:1fr !important; gap:8px; }
.ts-pack-asset-bound-head { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:8px; align-items:center; }
.ts-pack-asset-bound-head > div { display:grid; gap:2px; min-width:0; }
.ts-pack-asset-bound-head > div span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ts-pack-asset-bound > small { color:var(--ts-dim); font-size:8px; line-height:1.4; }
.ts-pack-asset-placement { display:grid; gap:8px; padding-top:7px; border-top:1px solid var(--ts-border); }
.ts-asset-corners { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; }
.ts-asset-corners button { appearance:none; min-height:30px; border:1px solid var(--ts-border); border-radius:6px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); color:var(--ts-text); cursor:pointer; }
.ts-asset-corners button[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); }
.ts-pack-asset-offsets { grid-template-columns:1fr 1fr; }

@media (max-width:760px) {
  .ts-style-library-modal { inset:0; border-radius:0; }
  .ts-offset-pad { width:100%; }
}


/* V27.8 selector-path cleanup + mounted structure browser. */
.ts-target-ladder {
  flex-wrap: wrap;
  overflow-x: hidden;
  align-items: center;
  row-gap: 3px;
}
.ts-target-crumb {
  flex: 0 1 auto;
  min-width: 0;
  max-width: min(150px, 100%);
}
.ts-target-chevron { flex: none; }

.ts-structure-browser { margin-top: 7px; min-width: 0; }
.ts-structure-browser > summary {
  display: grid;
  grid-template-columns: minmax(0,1fr) auto auto;
  gap: 7px;
  align-items: center;
  min-height: 36px;
  border: 1px solid var(--ts-border);
  border-radius: 7px;
  padding: 6px 8px;
  background: color-mix(in srgb, var(--ts-elevated) 88%, transparent);
  cursor: pointer;
  list-style: none;
}
.ts-structure-browser > summary::-webkit-details-marker { display:none; }
.ts-structure-browser > summary > span { display:grid; gap:1px; min-width:0; }
.ts-structure-browser > summary small { color:var(--ts-dim); font-size:8px; font-weight:720; letter-spacing:.055em; text-transform:uppercase; }
.ts-structure-browser > summary strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-text); font-size:10px; }
.ts-structure-browser > summary > b { color:var(--ts-dim); font-size:8px; font-weight:650; white-space:nowrap; }
.ts-structure-browser > summary > i { color:var(--ts-accent); font-style:normal; transition:transform .12s ease; }
.ts-structure-browser[open] > summary > i { transform:rotate(180deg); }
.ts-structure-tree {
  display:grid;
  gap:2px;
  max-height:248px;
  min-width:0;
  overflow-x:hidden;
  overflow-y:auto;
  margin-top:5px;
  padding:5px;
  border:1px solid var(--ts-border);
  border-radius:7px;
  background:var(--lumiverse-bg-deep,#0e0b16);
  scrollbar-width:thin;
  overscroll-behavior:contain;
}
.ts-structure-node {
  appearance:none;
  position:relative;
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:7px;
  width:100%;
  min-width:0;
  min-height:27px;
  border:0;
  border-radius:5px;
  padding:4px 7px 4px calc(8px + (var(--ts-tree-depth) * 11px));
  background:transparent;
  color:var(--ts-muted);
  cursor:pointer;
  font:inherit;
  text-align:left;
}
.ts-structure-node::before {
  content:'';
  position:absolute;
  left:calc(4px + (var(--ts-tree-depth) * 11px));
  top:6px;
  bottom:6px;
  border-left:1px solid color-mix(in srgb,var(--ts-border) 78%,transparent);
}
.ts-structure-node:hover { background:var(--ts-hover); color:var(--ts-text); }
.ts-structure-node[aria-current="true"] { background:var(--ts-accent-soft); color:var(--ts-text); }
.ts-structure-node span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px; }
.ts-structure-node small { color:var(--ts-dim); font-size:7px; text-transform:uppercase; white-space:nowrap; }
.ts-structure-note { margin:5px 2px 0; color:var(--ts-dim); font-size:8px; line-height:1.35; }

@media (max-width: 600px) {
  .ts-target-crumb { max-width:min(132px,100%); }
  .ts-structure-tree { max-height:210px; }
  .ts-structure-node { padding-left:calc(7px + (var(--ts-tree-depth) * 9px)); }
  .ts-structure-node::before { left:calc(3px + (var(--ts-tree-depth) * 9px)); }
}

/* v27.14 · sibling layout groups ----------------------------------------- */
/* Pick/Group are target modes; Guides/Smart are visualization tools. Keep
   them visually separated so Group reads as a peer of Pick, not a guide. */
.ts-workbar-primary { display:flex; align-items:center; gap:7px; min-width:0; }
.ts-workbar-mode-group,
.ts-workbar-guide-group {
  padding:3px;
  border:1px solid var(--ts-border);
  border-radius:8px;
  background:color-mix(in srgb,var(--ts-surface) 70%,transparent);
}
.ts-workbar-divider { flex:0 0 1px; width:1px; height:22px; background:var(--ts-border); opacity:.85; }
.ts-workbar-secondary.is-group-mode > :not([data-action="toggle-widget"]) { opacity:.42; }

.ts-group-title { display:block; margin-top:2px; color:var(--ts-text); font-size:11px; }
.ts-group-builder,.ts-group-editor { display:grid; gap:10px; margin-top:8px; }
.ts-group-head { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:start; }
.ts-group-head > div { display:grid; gap:2px; min-width:0; }
.ts-group-head > div > strong { color:var(--ts-text); font-size:11px; }
.ts-group-head > div > small { color:var(--ts-muted); font-size:8.5px; line-height:1.35; }
.ts-group-name { min-width:0; width:100%; border:0; padding:0; background:transparent; color:var(--ts-text); font:700 12px/1.3 inherit; outline:none; }
.ts-group-name:focus { box-shadow:0 1px 0 var(--ts-accent); }
.ts-group-drop { display:grid; place-items:center; gap:5px; min-height:88px; border:1px dashed var(--ts-border); border-radius:8px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.02)); color:var(--ts-muted); text-align:center; }
.ts-group-drop strong { color:var(--ts-accent); font-size:18px; letter-spacing:6px; }
.ts-group-drop span { font-size:9px; }
.ts-group-members { display:grid; gap:5px; }
.ts-group-member { display:grid; grid-template-columns:24px minmax(0,1fr) auto; gap:8px; align-items:center; min-width:0; padding:7px; border:1px solid var(--ts-border); border-radius:7px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.025)); }
.ts-group-member-number { display:grid; place-items:center; width:24px; height:24px; border-radius:6px; background:var(--ts-accent-soft); color:var(--ts-text); font-size:9px; font-weight:800; }
.ts-group-member > span:nth-child(2) { display:grid; min-width:0; gap:1px; }
.ts-group-member strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-text); font-size:9.5px; }
.ts-group-member small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-dim); font:7.5px/1.3 var(--lumiverse-font-mono,monospace); }
.ts-group-responsive { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; padding-top:8px; border-top:1px solid var(--ts-border); }
.ts-group-responsive > div:first-child { display:grid; gap:1px; }
.ts-group-responsive strong { color:var(--ts-text); font-size:9px; }
.ts-group-layout-modes { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; }
.ts-group-layout-modes button { appearance:none; display:grid; gap:2px; min-width:0; border:1px solid var(--ts-border); border-radius:8px; padding:9px 8px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.08)); color:var(--ts-text); cursor:pointer; font:inherit; text-align:left; }
.ts-group-layout-modes button[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); }
.ts-group-layout-modes strong { font-size:10px; }
.ts-group-layout-modes small { color:var(--ts-muted); font-size:7.5px; line-height:1.25; }
.ts-group-siblings { display:grid; gap:8px; padding:9px; border:1px solid var(--ts-border); border-radius:8px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.02)); }
.ts-group-siblings > div:first-child { display:grid; gap:2px; }
.ts-group-siblings strong { color:var(--ts-text); font-size:9.5px; }
.ts-group-siblings small { color:var(--ts-muted); font-size:8px; line-height:1.35; }
.ts-group-members-detail { border-top:1px solid var(--ts-border); padding-top:7px; }
.ts-group-members-detail > summary { display:flex; justify-content:space-between; align-items:center; color:var(--ts-muted); cursor:pointer; font-size:9px; }
.ts-group-members-detail[open] > summary { margin-bottom:7px; }
.ts-group-list { display:grid; gap:5px; }
.ts-group-list-item { appearance:none; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; width:100%; border:1px solid var(--ts-border); border-radius:8px; padding:8px 9px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.02)); color:var(--ts-text); cursor:pointer; font:inherit; text-align:left; }
.ts-group-list-item[aria-pressed="true"],.ts-group-list-item:hover { border-color:color-mix(in srgb,var(--ts-accent) 55%,var(--ts-border)); background:var(--ts-accent-soft); }
.ts-group-list-item > span:first-child { display:grid; min-width:0; gap:2px; }
.ts-group-list-item strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9.5px; }
.ts-group-list-item small { color:var(--ts-muted); font-size:8px; }
.ts-group-empty { padding:10px; border:1px dashed var(--ts-border); border-radius:8px; color:var(--ts-muted); font-size:9px; text-align:center; }
[data-theme-studio-inspector="guide-layer"] [data-group-member] { outline-style:solid; }
[data-theme-studio-inspector="guide-layer"] [data-group-member] > span { min-width:18px; text-align:center; font-weight:900; }

@media (max-width:600px) {
  .ts-workbar-primary { gap:5px; }
  .ts-workbar-mode-group,.ts-workbar-guide-group { gap:3px; padding:2px; }
  .ts-workbar-divider { height:20px; }
  .ts-group-head,.ts-group-responsive { grid-template-columns:1fr; }
  .ts-group-head > .ts-btn { width:100%; }
  .ts-group-layout-modes { grid-template-columns:1fr 1fr 1fr; }
  .ts-group-member { grid-template-columns:22px minmax(0,1fr) auto; }
}
/* v27.15 · group styling --------------------------------------------------- */
.ts-group-editor-tabs,
.ts-group-content-targets {
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:4px;
  padding:3px;
  border:1px solid var(--ts-border);
  border-radius:8px;
  background:color-mix(in srgb,var(--ts-surface) 72%,transparent);
}
.ts-group-editor-tabs button,
.ts-group-content-targets button {
  appearance:none;
  min-width:0;
  border:0;
  border-radius:6px;
  padding:7px 5px;
  background:transparent;
  color:var(--ts-muted);
  cursor:pointer;
  font:700 8.5px/1.2 inherit;
}
.ts-group-editor-tabs button[aria-pressed="true"],
.ts-group-content-targets button[aria-pressed="true"] {
  background:var(--ts-accent-soft);
  color:var(--ts-text);
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ts-accent) 58%,transparent);
}
.ts-group-content-targets { margin-top:2px; }
.ts-group-editor > .ts-packet { margin-top:0; }
@media (max-width:600px) {
  .ts-group-editor-tabs,
  .ts-group-content-targets { grid-template-columns:repeat(2,minmax(0,1fr)); }
}

/* Packpocalypse VIII · Journal preview */
.ts-pack-preview[data-pack-preview="journal"] {
  background:
    linear-gradient(0deg, rgba(141,181,176,.08), rgba(141,181,176,.08)),
    #e9e2d5;
  color:#53615e;
}
.ts-pack-preview[data-pack-preview="journal"]::before {
  opacity:.7;
  color:color-mix(in srgb,var(--ts-quick-accent,#8db5b0) 58%,#8f8170);
  background-image:
    linear-gradient(90deg,transparent 0 8%,currentColor 8% 8.25%,transparent 8.25% 91%,currentColor 91% 91.2%,transparent 91.2%),
    repeating-linear-gradient(0deg,transparent 0 13px,rgba(90,96,91,.07) 13px 14px);
  background-size:100% 100%;
}
.ts-pack-preview[data-pack-preview="journal"] > strong { color:#475451; font-family:Georgia,serif; font-weight:700; letter-spacing:0; }
.ts-pack-preview[data-pack-preview="journal"] > small { color:#687773; letter-spacing:.09em; }
.ts-pack-preview[data-pack-preview="journal"] .ts-pack-panel { border:6px solid #fffdf7; border-radius:2px; background:linear-gradient(135deg,#a9b9b4,#667975); box-shadow:4px 6px 14px rgba(59,55,49,.22); }
.ts-pack-preview[data-pack-preview="journal"] .ts-pack-panel-a { left:11%; top:12%; width:35%; height:48%; transform:rotate(-2deg); }
.ts-pack-preview[data-pack-preview="journal"] .ts-pack-panel-a::after { content:''; position:absolute; width:42%; height:13px; left:30%; top:-12px; background:color-mix(in srgb,var(--ts-quick-accent,#8db5b0) 66%,#f5e3c6); opacity:.82; transform:rotate(3deg); }
.ts-pack-preview[data-pack-preview="journal"] .ts-pack-panel-b { right:11%; top:21%; width:31%; height:36%; transform:rotate(1.5deg); background:repeating-linear-gradient(0deg,#f7f3e9 0 10px,#dfe9e5 10px 11px); border-width:1px; }
.ts-pack-preview-large[data-pack-preview="journal"] .ts-pack-panel-a { left:10%; top:10%; width:34%; height:51%; }
.ts-pack-preview-large[data-pack-preview="journal"] .ts-pack-panel-b { right:10%; top:18%; width:33%; height:38%; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="journal"] .ts-pack-preview-rail { display:block; left:28%; top:18px; bottom:18px; width:1px; background:color-mix(in srgb,var(--ts-quick-accent,#8db5b0) 70%,#766e63); box-shadow:none; opacity:.6; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="journal"] .ts-pack-panel-a { left:8%; top:18%; width:15%; height:42%; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="journal"] .ts-pack-panel-b { left:34%; right:10%; top:20%; width:auto; height:29%; transform:none; }
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="journal"] > strong,
.ts-pack-hero[data-pack-layout-preview="minimal"] .ts-pack-preview[data-pack-preview="journal"] > small { left:34%; }


/* v27.77 · Style Library legibility + real pack navigation -----------------
   The library had grown into a full-screen workspace while still using the
   microtype and elastic card rows from its compact-drawer ancestry. This pass
   gives the browser adult spacing, collapses the empty description acreage,
   turns pack sections into real sticky navigation, and finally gives Visual
   Novel its own preview identity. */
.ts-library-browser .ts-library-workspace { grid-template-columns:248px minmax(0,1fr); }
.ts-library-browser .ts-library-sidebar { gap:15px; padding:16px; }
.ts-library-browser .ts-library-view-nav { gap:6px; }
.ts-library-browser .ts-library-view-nav button { grid-template-columns:24px minmax(0,1fr); gap:9px; min-height:42px; border-radius:9px; padding:9px 10px; font-size:11px; font-weight:650; }
.ts-library-browser .ts-library-view-nav button > span { width:24px; height:24px; font-size:11px; }
.ts-library-browser .ts-library-side-status { gap:5px; padding:13px 11px; }
.ts-library-browser .ts-library-side-status > strong { font-size:12px; }
.ts-library-browser .ts-library-side-status > p { font-size:9px; line-height:1.5; }
.ts-library-browser .ts-library-tune > summary { min-height:54px; padding:10px 11px; }
.ts-library-browser .ts-library-tune > summary strong { font-size:10px; }
.ts-library-browser .ts-library-tune > summary span { font-size:8.5px; }
.ts-library-browser .ts-library-results-toolbar { gap:10px; padding:14px 18px 13px; }
.ts-library-browser .ts-library-results-title strong { font-size:14px; }
.ts-library-browser .ts-library-results-title > span { font-size:9.5px; }
.ts-library-browser .ts-library-search > span { font-size:8.5px; }
.ts-library-browser .ts-library-search .ts-search { min-height:38px; font-size:11px; }
.ts-library-browser .ts-library-filter-trigger { min-width:88px; height:38px; font-size:10px; }
.ts-library-browser .ts-style-library-scroll { padding:17px 18px 30px; }
.ts-library-browser .ts-library-group + .ts-library-group { margin-top:26px; }
.ts-library-browser .ts-library-group-head { margin:0 2px 10px; }
.ts-library-browser .ts-library-group-head strong { font-size:12.5px; }
.ts-library-browser .ts-library-group-head small { font-size:8.5px; line-height:1.35; }

/* Descriptions were intentionally removed; stop reserving their old apartment. */
.ts-library-browser .ts-pack-grid { gap:13px; }
.ts-library-browser .ts-pack-open { grid-template-rows:132px auto; min-height:0; }
.ts-library-browser .ts-pack-preview { min-height:132px; }
.ts-library-browser .ts-pack-preview > strong { font-size:19px; }
.ts-library-browser .ts-pack-preview > small { font-size:8px; }
.ts-library-browser .ts-pack-copy { min-height:64px; padding:11px 42px 12px 12px; }
.ts-library-browser .ts-pack-copy strong { font-size:12.5px; }
.ts-library-browser .ts-pack-copy > span { margin-top:7px; font-size:8px; }
.ts-library-browser .ts-preset-grid { align-items:start; gap:13px; }
.ts-library-browser .ts-preset-card { grid-template-rows:122px auto auto; }
.ts-library-browser .ts-preset-card-copy { padding:10px 10px 8px; }
.ts-library-browser .ts-preset-card-copy strong { font-size:11.5px; line-height:1.2; }
.ts-library-browser .ts-preset-card-copy .ts-library-targets span { font-size:7.7px; }
.ts-library-browser .ts-library-badges { gap:5px; margin-top:7px; }
.ts-library-browser .ts-library-badge { padding:3px 6px!important; font-size:7.3px!important; }
.ts-library-browser .ts-library-card-actions { padding:0 9px 9px; }
.ts-library-browser .ts-library-card-actions .ts-btn { min-height:34px; font-size:9.5px; }

/* Visual Novel finally stops borrowing the generic purple pack thumbnail. */
.ts-pack-preview[data-pack-preview="visual-novel"] {
  background:
    radial-gradient(circle at 72% 24%,color-mix(in srgb,var(--ts-quick-accent,#b88cff) 28%,transparent),transparent 34%),
    linear-gradient(150deg,#08070d 0%,#130c1e 58%,#08070d 100%);
}
.ts-pack-preview[data-pack-preview="visual-novel"]::before {
  opacity:.76;
  color:color-mix(in srgb,var(--ts-quick-accent,#b88cff) 78%,#ffffff);
  background-image:
    linear-gradient(90deg,transparent 0 4%,currentColor 4% 4.18%,transparent 4.18% 95.82%,currentColor 95.82% 96%,transparent 96%),
    linear-gradient(0deg,transparent 0 76%,color-mix(in srgb,currentColor 34%,transparent) 76% 76.4%,transparent 76.4%),
    radial-gradient(circle,currentColor .65px,transparent .8px);
  background-size:100% 100%,100% 100%,13px 13px;
}
.ts-pack-preview[data-pack-preview="visual-novel"] .ts-pack-panel { transform:none; }
.ts-pack-preview[data-pack-preview="visual-novel"] .ts-pack-panel-a {
  left:7%; top:9%; width:49%; height:49%;
  border:1px solid color-mix(in srgb,var(--ts-quick-accent,#b88cff) 64%,transparent);
  border-radius:8px 8px 2px 2px;
  background:
    linear-gradient(180deg,transparent 48%,rgba(4,3,8,.84)),
    radial-gradient(ellipse at 58% 32%,color-mix(in srgb,var(--ts-quick-accent,#b88cff) 32%,#d8b2ca),transparent 24%),
    linear-gradient(135deg,#252433,#09090f 72%);
  box-shadow:inset 0 -20px 34px rgba(0,0,0,.55),0 8px 24px rgba(0,0,0,.2);
}
.ts-pack-preview[data-pack-preview="visual-novel"] .ts-pack-panel-a::after {
  content:'♥'; position:absolute; right:9px; bottom:7px; color:var(--ts-quick-accent,#b88cff); font-size:12px; text-shadow:0 0 12px currentColor;
}
.ts-pack-preview[data-pack-preview="visual-novel"] .ts-pack-panel-b {
  left:31%; right:6%; top:auto; bottom:12%; width:auto; height:31%;
  border:1px solid color-mix(in srgb,var(--ts-quick-accent,#b88cff) 70%,#ffffff 8%);
  border-radius:5px;
  background:linear-gradient(180deg,rgba(23,13,35,.9),rgba(9,6,15,.96));
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.025),0 10px 30px rgba(0,0,0,.34);
}
.ts-pack-preview[data-pack-preview="visual-novel"] .ts-pack-panel-b::before,
.ts-pack-preview[data-pack-preview="visual-novel"] .ts-pack-panel-b::after {
  content:''; position:absolute; left:10px; right:18%; height:1px; background:color-mix(in srgb,var(--ts-quick-text,var(--ts-text)) 58%,transparent);
}
.ts-pack-preview[data-pack-preview="visual-novel"] .ts-pack-panel-b::before { top:10px; }
.ts-pack-preview[data-pack-preview="visual-novel"] .ts-pack-panel-b::after { top:17px; right:38%; opacity:.65; }
.ts-pack-preview[data-pack-preview="visual-novel"] > strong { color:var(--ts-quick-text,var(--ts-text)); font-family:Georgia,serif; letter-spacing:.02em; text-shadow:0 3px 16px #000; }
.ts-pack-preview[data-pack-preview="visual-novel"] > small { color:color-mix(in srgb,var(--ts-quick-text,var(--ts-text)) 70%,transparent); }

/* Workbench hierarchy: banner first, then sticky section navigation, then cards. */
.ts-pack-detail .ts-pack-hero { position:relative; grid-template-columns:1fr; min-height:150px; }
.ts-pack-detail .ts-pack-preview-large { min-height:150px; border-right:0; }
.ts-pack-detail .ts-pack-summary {
  position:absolute; z-index:4; top:12px; right:14px; align-self:auto; min-width:160px;
  border:1px solid color-mix(in srgb,var(--ts-accent) 32%,var(--ts-border)); border-radius:10px;
  padding:9px 10px; background:color-mix(in srgb,var(--ts-panel) 82%,transparent);
  box-shadow:0 8px 28px rgba(0,0,0,.22); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
}
.ts-pack-detail .ts-pack-summary > strong { margin-top:7px; font-size:11px; }
.ts-pack-detail .ts-pack-preview-large > strong { font-size:27px; }
.ts-pack-detail .ts-pack-preview-large > small { font-size:8px; }

.ts-pack-detail .ts-pack-section-nav {
  position:sticky; top:0; z-index:8; display:flex; align-items:stretch; gap:6px; overflow-x:auto;
  padding:9px 14px; border-bottom:1px solid var(--ts-border);
  background:color-mix(in srgb,var(--ts-panel) 96%,transparent); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
  scrollbar-width:none;
}
.ts-pack-detail .ts-pack-section-nav::-webkit-scrollbar { display:none; }
.ts-pack-detail .ts-pack-section-nav > span { display:flex; align-items:center; flex:none; margin:0 3px 0 0; color:var(--ts-dim); font-size:8px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.ts-pack-detail .ts-pack-section-nav button {
  appearance:none; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center;
  flex:1 0 145px; min-height:42px; border:1px solid var(--ts-border); border-radius:9px; padding:8px 10px;
  background:color-mix(in srgb,var(--ts-elevated) 66%,transparent); color:var(--ts-muted); cursor:pointer;
  font:inherit; font-size:10px; font-weight:720; text-align:left; transition:border-color .12s ease,background .12s ease,color .12s ease;
}
.ts-pack-detail .ts-pack-section-nav button small { display:grid; place-items:center; min-width:22px; height:22px; border-radius:999px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.05)); color:var(--ts-dim); font-size:8px; }
.ts-pack-detail .ts-pack-section-nav button:hover { border-color:color-mix(in srgb,var(--ts-accent) 52%,var(--ts-border)); color:var(--ts-text); }
.ts-pack-detail .ts-pack-section-nav button[aria-current="true"] { border-color:color-mix(in srgb,var(--ts-accent) 72%,var(--ts-border)); background:var(--ts-accent-soft); color:var(--ts-text); box-shadow:inset 0 -2px 0 var(--ts-accent); }
.ts-pack-detail .ts-pack-section-nav button[aria-current="true"] small { color:var(--ts-accent); background:color-mix(in srgb,var(--ts-accent) 14%,transparent); }
.ts-pack-detail .ts-pack-recipe-section { scroll-margin-top:72px; }
.ts-pack-detail .ts-pack-detail-scroll { padding:18px 18px 30px; }
.ts-pack-detail .ts-pack-recipe-section + .ts-pack-recipe-section { margin-top:30px; padding-top:4px; border-top:1px solid color-mix(in srgb,var(--ts-border) 70%,transparent); }
.ts-pack-detail .ts-pack-section-head { margin-bottom:11px; }
.ts-pack-detail .ts-pack-section-head strong { font-size:13px; }
.ts-pack-detail .ts-pack-section-head small { font-size:8.5px; }
.ts-pack-detail .ts-pack-section-tools .ts-btn { min-height:30px; padding:5px 9px; font-size:8.5px; }

/* The right rail was functionally good and typographically microscopic. */
.ts-pack-detail .ts-pack-sidebar { padding:12px; }
.ts-pack-detail .ts-pack-sidebar-inner { gap:11px; }
.ts-pack-detail .ts-pack-side-actions { padding:12px; }
.ts-pack-detail .ts-pack-side-heading strong { font-size:12px; }
.ts-pack-detail .ts-pack-layout-picker button { min-height:32px; font-size:9.5px; }
.ts-pack-detail .ts-pack-selection-summary { gap:6px; }
.ts-pack-detail .ts-pack-selection-summary > div { padding:8px; }
.ts-pack-detail .ts-pack-selection-summary strong { font-size:13px; }
.ts-pack-detail .ts-pack-selection-summary span { font-size:8px; }
.ts-pack-detail .ts-pack-selection-tools button { padding:5px 8px; font-size:8px; }
.ts-pack-detail .ts-pack-main-actions-workbench .ts-btn,
.ts-pack-detail .ts-pack-secondary-actions .ts-btn { min-height:35px; font-size:9px; }
.ts-pack-detail .ts-pack-side-section > summary { padding:11px 12px; }
.ts-pack-detail .ts-pack-side-section > summary strong { font-size:10.5px; }
.ts-pack-detail .ts-pack-side-section > summary span:not(.ts-chip) { font-size:8px; }
.ts-pack-detail .ts-pack-manifest-group > span { font-size:8px; }
.ts-pack-detail .ts-pack-manifest-row { grid-template-columns:22px minmax(0,1fr) auto; gap:7px; padding:7px; }
.ts-pack-detail .ts-pack-manifest-row strong { font-size:9.5px; }
.ts-pack-detail .ts-pack-manifest-row small { font-size:8px; }
.ts-pack-detail .ts-pack-manifest-row i { font-size:7px; }
.ts-pack-detail .ts-pack-card-select { min-height:27px; padding:4px 8px 4px 5px; font-size:8px; }
.ts-pack-detail .ts-pack-recipe-card { grid-template-rows:118px auto auto; }
.ts-pack-detail .ts-preset-card-copy { padding:9px 9px 7px; }
.ts-pack-detail .ts-preset-card-copy strong { font-size:10.5px; }
.ts-pack-detail .ts-library-badge { font-size:7px!important; }

@media (max-width:900px) {
  .ts-library-browser .ts-library-workspace { grid-template-columns:190px minmax(0,1fr); }
  .ts-pack-detail .ts-pack-summary { right:10px; top:10px; }
}
@media (max-width:760px) {
  .ts-pack-detail .ts-pack-summary { display:none; }
  .ts-pack-detail .ts-pack-section-nav { padding:7px 9px; }
  .ts-pack-detail .ts-pack-section-nav > span { display:none; }
  .ts-pack-detail .ts-pack-section-nav button { flex:0 0 132px; min-height:38px; padding:7px 8px; font-size:9px; }
  .ts-pack-detail .ts-pack-detail-scroll { padding:13px 10px 24px; }
}
@media (max-width:600px) {
  .ts-library-browser .ts-library-workspace { grid-template-columns:1fr; }
  .ts-library-browser .ts-library-sidebar { display:grid; grid-template-columns:1fr auto; gap:8px; overflow:visible; padding:9px 10px; border-right:0; border-bottom:1px solid var(--ts-border); }
  .ts-library-browser .ts-library-view-nav { display:flex; gap:4px; overflow-x:auto; }
  .ts-library-browser .ts-library-view-nav button { display:flex; flex:none; min-height:36px; padding:7px 9px; font-size:9px; }
  .ts-library-browser .ts-library-view-nav button > span { width:20px; height:20px; }
  .ts-library-browser .ts-library-side-status { display:none; }
  .ts-library-browser .ts-library-tune { margin:0; align-self:start; }
  .ts-library-browser .ts-style-library-scroll { padding:12px 10px 22px; }
  .ts-library-browser .ts-pack-open { grid-template-columns:120px minmax(0,1fr); grid-template-rows:1fr; min-height:138px; }
  .ts-library-browser .ts-pack-preview { min-height:138px; border-right:1px solid var(--ts-border); border-bottom:0; }
  .ts-library-browser .ts-pack-copy { min-height:0; justify-content:center; }
}

/* v27.78 · Surface is navigation, not a hidden filter ----------------------
   The library has only a handful of stable surface families. Keep that
   primary browse axis visible beside the current result heading; reserve the
   filter sheet for compatibility/family constraints that actually need it. */
.ts-library-browser .ts-library-results-title {
  display:grid;
  grid-template-columns:auto minmax(0,1fr) auto;
  gap:16px;
  align-items:end;
}
.ts-library-browser .ts-library-results-heading { min-width:max-content; }
.ts-library-browser .ts-library-surface-nav {
  display:flex;
  min-width:0;
  gap:6px;
  align-items:center;
  overflow-x:auto;
  padding:0 2px 1px;
  scrollbar-width:none;
}
.ts-library-browser .ts-library-surface-nav::-webkit-scrollbar { display:none; }
.ts-library-browser .ts-library-surface-nav button {
  appearance:none;
  flex:none;
  min-height:30px;
  border:1px solid var(--ts-border);
  border-radius:999px;
  padding:6px 11px;
  background:transparent;
  color:var(--ts-muted);
  cursor:pointer;
  font:inherit;
  font-size:9.5px;
  font-weight:680;
  line-height:1;
}
.ts-library-browser .ts-library-surface-nav button:hover {
  border-color:color-mix(in srgb,var(--ts-accent) 48%,var(--ts-border));
  color:var(--ts-text);
  background:var(--lumiverse-fill-subtle,rgba(255,255,255,.035));
}
.ts-library-browser .ts-library-surface-nav button[aria-pressed="true"] {
  border-color:color-mix(in srgb,var(--ts-accent) 78%,var(--ts-border));
  background:var(--ts-accent-soft);
  color:var(--ts-text);
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ts-accent) 22%,transparent);
}
.ts-library-browser .ts-library-filter-trigger { min-width:108px; }

@media (max-width:760px) {
  .ts-library-browser .ts-library-results-title {
    grid-template-columns:minmax(0,1fr) auto;
    align-items:center;
    gap:8px;
  }
  .ts-library-browser .ts-library-results-heading { grid-column:1; grid-row:1; }
  .ts-library-browser .ts-library-results-title > [data-library-result-count] { grid-column:2; grid-row:1; }
  .ts-library-browser .ts-library-surface-nav {
    grid-column:1 / -1;
    grid-row:2;
    margin-top:2px;
  }
  .ts-library-browser .ts-library-surface-nav button { min-height:29px; padding:6px 10px; font-size:8.5px; }
  .ts-library-browser .ts-library-filter-trigger { min-width:92px; }
}

/* v27.85 · Composer Composer foundation ---------------------------------- */
.ts-composer-workshop { display:grid; grid-template-columns:minmax(230px,.62fr) minmax(320px,1.38fr); gap:12px; margin:0 0 18px; border:1px solid color-mix(in srgb,var(--ts-accent) 34%,var(--ts-border)); border-radius:12px; padding:12px; background:linear-gradient(135deg,color-mix(in srgb,var(--ts-accent-soft) 52%,var(--ts-elevated)),var(--ts-elevated)); overflow:hidden; }
.ts-composer-workshop-copy { grid-column:1; display:flex; justify-content:space-between; gap:12px; align-items:flex-start; min-width:0; }
.ts-composer-workshop-copy > div { min-width:0; }
.ts-composer-workshop-copy .ts-kicker { margin:0 0 3px; }
.ts-composer-workshop-copy strong { display:block; font-size:15px; line-height:1.1; }
.ts-composer-workshop-copy span:not(.ts-chip) { display:block; max-width:430px; margin-top:5px; color:var(--ts-muted); font-size:8px; line-height:1.45; }
.ts-composer-workshop-preview { grid-column:2; grid-row:1 / span 2; align-self:start; display:grid; gap:7px; min-height:96px; border:1px solid color-mix(in srgb,var(--ts-accent) 30%,var(--ts-border)); border-radius:10px; padding:10px; background:color-mix(in srgb,var(--ts-surface) 86%,black 14%); box-shadow:inset 0 1px 0 color-mix(in srgb,var(--ts-text) 5%,transparent); }
.ts-composer-workshop-toolbar { display:flex; flex-wrap:wrap; gap:4px; }
.ts-composer-workshop-toolbar i { width:22px; height:20px; border:1px solid color-mix(in srgb,var(--ts-accent) 30%,var(--ts-border)); border-radius:5px; background:color-mix(in srgb,var(--ts-accent-soft) 40%,transparent); }
.ts-composer-workshop-input { display:grid; grid-template-columns:28px minmax(0,1fr) 30px; gap:6px; align-items:center; }
.ts-composer-workshop-input b,.ts-composer-workshop-input em { display:block; width:28px; height:28px; border:1px solid color-mix(in srgb,var(--ts-accent) 40%,var(--ts-border)); border-radius:8px; background:color-mix(in srgb,var(--ts-accent-soft) 58%,transparent); }
.ts-composer-workshop-input em { width:30px; border-radius:999px; background:color-mix(in srgb,var(--ts-accent) 30%,transparent); }
.ts-composer-workshop-input span { display:block; height:28px; border:1px solid var(--ts-border); border-radius:8px; background:color-mix(in srgb,var(--ts-text) 5%,transparent); }
.ts-composer-workshop-groups { grid-column:1; display:grid; gap:8px; }
.ts-composer-workshop-groups > section { display:grid; gap:5px; }
.ts-composer-workshop-groups header { display:flex; justify-content:space-between; gap:10px; align-items:baseline; }
.ts-composer-workshop-groups header strong { font-size:8.5px; }
.ts-composer-workshop-groups header span { color:var(--ts-dim); font-size:6.8px; }
.ts-composer-workshop-groups > section > div { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px; }
.ts-composer-workshop-groups button { appearance:none; display:grid; gap:1px; min-width:0; border:1px solid var(--ts-border); border-radius:8px; padding:6px 7px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.06)); color:var(--ts-text); cursor:pointer; text-align:left; font:inherit; }
.ts-composer-workshop-groups button:hover:not(:disabled) { border-color:color-mix(in srgb,var(--ts-accent) 56%,var(--ts-border)); background:var(--ts-accent-soft); }
.ts-composer-workshop-groups button:disabled { opacity:.38; cursor:default; }
.ts-composer-workshop-groups button span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:8px; font-weight:720; }
.ts-composer-workshop-groups button small { color:var(--ts-dim); font-size:6.5px; }
@media (max-width: 820px) {
  .ts-composer-workshop { grid-template-columns:1fr; }
  .ts-composer-workshop-copy,.ts-composer-workshop-preview,.ts-composer-workshop-groups { grid-column:1; grid-row:auto; }
  .ts-composer-workshop-preview { min-height:82px; }
  .ts-composer-workshop-groups > section > div { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (max-width: 520px) {
  .ts-composer-workshop { padding:9px; }
  .ts-composer-workshop-groups > section > div { grid-template-columns:1fr; }
}


/* v27.86 · Composer Composer sidecar + readable anatomy ------------------ */
.ts-composer-workshop {
  grid-template-columns:1fr; gap:14px; padding:16px; min-height:360px;
}
.ts-composer-workshop-copy { grid-column:1; align-items:center; }
.ts-composer-workshop-copy .ts-kicker { font-size:9px; letter-spacing:.1em; }
.ts-composer-workshop-copy strong { font-size:19px; line-height:1.12; }
.ts-composer-workshop-copy span:not(.ts-chip) { max-width:720px; margin-top:6px; font-size:11px; line-height:1.48; }
.ts-composer-workshop-main { display:grid; grid-template-columns:minmax(250px,330px) minmax(0,1fr); gap:14px; min-height:310px; }
.ts-composer-workshop-groups { grid-column:1; align-content:start; gap:13px; padding:2px 0; }
.ts-composer-workshop-groups > section { gap:7px; }
.ts-composer-workshop-groups header { align-items:center; }
.ts-composer-workshop-groups header strong { font-size:11.5px; }
.ts-composer-workshop-groups header span { font-size:9px; line-height:1.3; }
.ts-composer-workshop-groups > section > div { grid-template-columns:1fr; gap:5px; }
.ts-composer-workshop-groups button {
  grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:10px; min-height:42px;
  padding:8px 10px; border-radius:8px;
}
.ts-composer-workshop-groups button span { font-size:11px; font-weight:730; }
.ts-composer-workshop-groups button small { font-size:9px; white-space:nowrap; }
.ts-composer-workshop-groups button[aria-pressed="true"] {
  border-color:color-mix(in srgb,var(--ts-accent) 76%,var(--ts-border));
  background:var(--ts-accent-soft); box-shadow:inset 3px 0 0 var(--ts-accent);
}
.ts-composer-workshop-groups button[aria-pressed="true"] small { color:var(--ts-accent); }
.ts-composer-workshop-preview,
.ts-composer-workshop-sidecar { grid-column:2; grid-row:1; min-width:0; }
.ts-composer-workshop-preview { min-height:180px; align-self:stretch; align-content:center; padding:18px; gap:13px; }
.ts-composer-workshop-toolbar { gap:7px; }
.ts-composer-workshop-toolbar i { width:31px; height:29px; border-radius:7px; }
.ts-composer-workshop-input { grid-template-columns:38px minmax(0,1fr) 40px; gap:8px; }
.ts-composer-workshop-input b,.ts-composer-workshop-input em { width:38px; height:38px; border-radius:10px; }
.ts-composer-workshop-input em { width:40px; border-radius:999px; }
.ts-composer-workshop-input span { height:38px; border-radius:10px; }
.ts-composer-workshop-sidecar {
  display:grid; grid-template-rows:auto minmax(0,1fr); min-height:460px; max-height:660px;
  border:1px solid color-mix(in srgb,var(--ts-accent) 34%,var(--ts-border)); border-radius:11px;
  background:color-mix(in srgb,var(--ts-panel) 96%,black 4%); overflow:hidden;
}
.ts-composer-sidecar-head {
  display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:10px; align-items:center;
  padding:10px 11px; border-bottom:1px solid var(--ts-border); background:color-mix(in srgb,var(--ts-elevated) 88%,transparent);
}
.ts-composer-sidecar-head > div { min-width:0; }
.ts-composer-sidecar-head .ts-kicker { display:block; margin:0 0 2px; font-size:8px; }
.ts-composer-sidecar-head strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; }
.ts-composer-sidecar-head small { display:block; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-dim); font-size:9px; }
.ts-composer-sidecar-head > .ts-btn:last-child { min-height:31px; padding:6px 9px; font-size:9px; }
.ts-composer-sidecar-scroll { min-height:0; overflow:auto; padding:11px; scrollbar-gutter:stable; }
.ts-composer-sidecar-scroll .ts-section { margin:0; padding:0; border:0; background:transparent; }
.ts-composer-sidecar-scroll .ts-style-stack-head { position:sticky; top:-11px; z-index:5; margin:-11px -11px 9px; padding:10px 11px 8px; border-bottom:1px solid var(--ts-border); background:color-mix(in srgb,var(--ts-panel) 96%,transparent); backdrop-filter:blur(12px); }
.ts-composer-sidecar-scroll .ts-style-stack-head .ts-kicker { font-size:9px; }
.ts-composer-sidecar-scroll .ts-card { margin-bottom:9px; }
.ts-composer-sidecar-scroll .ts-packet-title strong { font-size:12px; }
.ts-composer-sidecar-scroll .ts-label { font-size:10px; }
.ts-composer-sidecar-scroll .ts-note,.ts-composer-sidecar-scroll .ts-utility-note { font-size:9.5px; line-height:1.45; }
.ts-composer-sidecar-scroll .ts-btn { min-height:31px; font-size:9.5px; }
.ts-icon-family-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:6px; }
.ts-icon-family-grid button { appearance:none; display:grid; justify-items:center; gap:5px; min-height:61px; border:1px solid var(--ts-border); border-radius:8px; padding:7px 5px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.03)); color:var(--ts-muted); cursor:pointer; font:inherit; }
.ts-icon-family-grid button:hover { border-color:color-mix(in srgb,var(--ts-accent) 50%,var(--ts-border)); color:var(--ts-text); }
.ts-icon-family-grid button[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); color:var(--ts-text); }
.ts-icon-family-grid button strong { font-size:8.5px; line-height:1.1; text-align:center; }
.ts-icon-family-sample { display:grid; place-items:center; width:26px; height:26px; border:1px solid currentColor; font-size:12px; }
.ts-icon-family-native { border-radius:7px; }
.ts-icon-family-manga { border-radius:0; box-shadow:3px 3px 0 currentColor; }
.ts-icon-family-editorial { border-width:0 0 1px; }
.ts-icon-family-journal { border-radius:10px 4px 9px 5px; transform:rotate(-2deg); }
.ts-icon-family-visual-novel { clip-path:polygon(12% 0,100% 0,100% 78%,82% 100%,0 100%,0 18%); }

/* Preview anatomy highlights teach the vocabulary without opening DevTools. */
.ts-composer-workshop-preview[data-active-composer-role="input.shell"] { box-shadow:inset 0 0 0 2px var(--ts-accent); }
.ts-composer-workshop-preview[data-active-composer-role="input.actionbar"] .ts-composer-workshop-toolbar,
.ts-composer-workshop-preview[data-active-composer-role="input.actionbar.controls"] .ts-composer-workshop-toolbar { outline:2px solid var(--ts-accent); outline-offset:4px; border-radius:7px; }
.ts-composer-workshop-preview[data-active-composer-role="input.field"] .ts-composer-workshop-input,
.ts-composer-workshop-preview[data-active-composer-role="input.textarea"] .ts-composer-workshop-input span,
.ts-composer-workshop-preview[data-active-composer-role="input.placeholder"] .ts-composer-workshop-input span { outline:2px solid var(--ts-accent); outline-offset:3px; }
.ts-composer-workshop-preview[data-active-composer-role="input.attach"] .ts-composer-workshop-input b { outline:2px solid var(--ts-accent); outline-offset:3px; }
.ts-composer-workshop-preview[data-active-composer-role="input.send"] .ts-composer-workshop-input em,
.ts-composer-workshop-preview[data-active-composer-role="input.send.controls"] .ts-composer-workshop-input em { outline:2px solid var(--ts-accent); outline-offset:3px; }

@media (max-width:900px) {
  .ts-composer-workshop-main { grid-template-columns:minmax(220px,280px) minmax(0,1fr); }
  .ts-icon-family-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
}
@media (max-width:760px) {
  .ts-composer-workshop { padding:11px; min-height:0; }
  .ts-composer-workshop-copy strong { font-size:17px; }
  .ts-composer-workshop-copy span:not(.ts-chip) { font-size:10px; }
  .ts-composer-workshop-main { grid-template-columns:1fr; min-height:0; }
  .ts-composer-workshop-groups,.ts-composer-workshop-preview,.ts-composer-workshop-sidecar { grid-column:1; grid-row:auto; }
  .ts-composer-workshop.is-editing .ts-composer-workshop-copy,
  .ts-composer-workshop.is-editing .ts-composer-workshop-groups { display:none; }
  .ts-composer-workshop-sidecar { max-height:none; min-height:520px; }
  .ts-composer-sidecar-head { grid-template-columns:auto minmax(0,1fr) auto; }
  .ts-composer-sidecar-head > .ts-btn:last-child { padding:5px 7px; font-size:8px; }
}
@media (max-width:520px) {
  .ts-composer-workshop-groups > section > div { grid-template-columns:1fr; }
  .ts-icon-family-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
}


/* v27.87 · Composer Atelier navigator + SVG wardrobe -------------------- */
.ts-composer-workshop-main { grid-template-columns:minmax(360px,.86fr) minmax(520px,1.14fr); align-items:start; }
.ts-composer-workshop-groups > section > div { grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
.ts-composer-workshop-groups button { min-height:39px; padding:7px 9px; }
.ts-composer-workshop-preview { grid-column:2; grid-row:1; min-height:250px; align-self:stretch; align-content:center; position:relative; cursor:pointer; }
.ts-composer-workshop-sidecar { grid-column:1 / -1; grid-row:2; min-height:420px; max-height:620px; }
.ts-composer-workshop-toolbar { display:flex; flex-wrap:wrap; gap:7px; }
.ts-composer-workshop-toolbar > button { appearance:none; position:relative; display:grid; place-items:center; width:34px; height:32px; padding:0; border:1px solid color-mix(in srgb,var(--ts-accent) 30%,var(--ts-border)); border-radius:7px; background:color-mix(in srgb,var(--ts-accent-soft) 40%,transparent); color:var(--ts-text); cursor:pointer; }
.ts-composer-workshop-toolbar > button:hover,.ts-composer-workshop-toolbar > button[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); box-shadow:0 0 0 2px color-mix(in srgb,var(--ts-accent) 12%,transparent); }
.ts-composer-workshop-toolbar > button i { display:block; width:13px; height:13px; border:1.5px solid currentColor; border-radius:3px; transform:rotate(3deg); }
.ts-composer-workshop-toolbar > button:nth-child(3n+2) i { border-radius:999px; transform:none; }
.ts-composer-workshop-toolbar > button:nth-child(4n) i { border-width:0 0 1.5px; border-radius:0; }
.ts-composer-workshop-toolbar > button span { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
.ts-composer-workshop-input { grid-template-columns:40px minmax(0,1fr) 42px; }
.ts-composer-workshop-input button { appearance:none; border:1px solid color-mix(in srgb,var(--ts-accent) 40%,var(--ts-border)); background:color-mix(in srgb,var(--ts-accent-soft) 45%,transparent); color:var(--ts-muted); cursor:pointer; }
.ts-composer-workshop-input button:hover { border-color:var(--ts-accent); color:var(--ts-text); box-shadow:0 0 0 2px color-mix(in srgb,var(--ts-accent) 12%,transparent); }
.ts-composer-mock-attach { width:40px; height:40px; border-radius:10px; display:grid; place-items:center; }
.ts-composer-mock-attach i { width:12px; height:18px; border:1.5px solid currentColor; border-radius:7px; transform:rotate(35deg); }
.ts-composer-mock-text { min-width:0; height:40px; border-radius:10px; text-align:left; padding:0 13px; }
.ts-composer-mock-text span { display:block; height:auto; border:0; border-radius:0; background:transparent; color:var(--ts-dim); font-size:11px; }
.ts-composer-mock-send { width:42px; height:42px; border-radius:999px; display:grid; place-items:center; }
.ts-composer-mock-send > i { display:block; width:15px; height:15px; border:1.5px solid currentColor; clip-path:polygon(0 0,100% 50%,0 100%,24% 50%); background:currentColor; }
.ts-composer-preview-hint { display:block; margin-top:2px; color:var(--ts-dim); font-size:9px; text-align:right; }
.ts-composer-workshop-preview[data-active-composer-role="input.attach"] .ts-composer-mock-attach,
.ts-composer-workshop-preview[data-active-composer-role="input.textarea"] .ts-composer-mock-text,
.ts-composer-workshop-preview[data-active-composer-role="input.send"] .ts-composer-mock-send,
.ts-composer-workshop-preview[data-active-composer-role="input.send.controls"] .ts-composer-mock-send > i { outline:2px solid var(--ts-accent); outline-offset:3px; }

.ts-composer-action-picker { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:5px; }
.ts-composer-action-picker button { appearance:none; display:flex; justify-content:space-between; gap:5px; min-width:0; border:1px solid var(--ts-border); border-radius:7px; padding:6px 7px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.03)); color:var(--ts-muted); cursor:pointer; font:inherit; }
.ts-composer-action-picker button:hover,.ts-composer-action-picker button[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); color:var(--ts-text); }
.ts-composer-action-picker button span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px; }
.ts-composer-action-picker button i { color:var(--ts-accent); font-size:7px; font-style:normal; text-transform:uppercase; }
.ts-composer-icon-current { display:grid; grid-template-columns:34px minmax(0,1fr) auto; gap:9px; align-items:center; margin:8px 0 12px; border:1px solid color-mix(in srgb,var(--ts-accent) 28%,var(--ts-border)); border-radius:9px; padding:8px; background:color-mix(in srgb,var(--ts-accent-soft) 24%,transparent); }
.ts-composer-icon-current > span:first-child,.ts-saved-svg-item button > span { display:block; width:28px; height:28px; background:currentColor; -webkit-mask-image:var(--ts-composer-svg); mask-image:var(--ts-composer-svg); -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; -webkit-mask-position:center; mask-position:center; -webkit-mask-size:contain; mask-size:contain; }
.ts-composer-icon-current > div { min-width:0; }
.ts-composer-icon-current strong,.ts-composer-icon-current small { display:block; }
.ts-composer-icon-current strong { font-size:10px; }
.ts-composer-icon-current small { margin-top:2px; color:var(--ts-dim); font-size:8.5px; }
.ts-saved-svg-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; }
.ts-saved-svg-item { position:relative; min-width:0; }
.ts-saved-svg-item > button:first-child { appearance:none; width:100%; min-height:74px; display:grid; justify-items:center; align-content:center; gap:5px; border:1px solid var(--ts-border); border-radius:8px; padding:8px 20px 7px 7px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.03)); color:var(--ts-muted); cursor:pointer; font:inherit; }
.ts-saved-svg-item > button:first-child:hover { border-color:var(--ts-accent); background:var(--ts-accent-soft); color:var(--ts-text); }
.ts-saved-svg-item strong { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:8.5px; }
.ts-saved-svg-delete { appearance:none; position:absolute; top:4px; right:4px; display:grid; place-items:center; width:18px; height:18px; border:0; border-radius:5px; background:transparent; color:var(--ts-dim); cursor:pointer; }
.ts-saved-svg-delete:hover { background:color-mix(in srgb,var(--lumiverse-danger,#f66) 16%,transparent); color:var(--lumiverse-danger,#f66); }
.ts-empty-inline { border:1px dashed var(--ts-border); border-radius:8px; padding:10px; color:var(--ts-dim); font-size:9px; }
.ts-svg-save-fields { display:grid; gap:7px; margin-top:8px; }
.ts-svg-source { min-height:94px; resize:vertical; font-family:var(--lumiverse-font-mono,monospace); font-size:9px; line-height:1.4; }
.ts-svg-save-status { color:var(--ts-muted); font-size:9px; align-self:center; }

@media (max-width: 980px) {
  .ts-composer-workshop-main { grid-template-columns:1fr; }
  .ts-composer-workshop-groups,.ts-composer-workshop-preview,.ts-composer-workshop-sidecar { grid-column:1; grid-row:auto; }
  .ts-composer-workshop-groups > section > div { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .ts-composer-workshop-preview { min-height:170px; }
}
@media (max-width: 620px) {
  .ts-composer-workshop-groups > section > div,.ts-saved-svg-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .ts-composer-action-picker { display:flex; overflow-x:auto; padding-bottom:4px; scrollbar-gutter:stable; }
  .ts-composer-action-picker button { flex:0 0 auto; min-width:96px; }
  .ts-composer-workshop-sidecar { max-height:none; }
}


.ts-composer-sidecar-actions{display:flex;align-items:center;gap:8px;margin-left:auto}.ts-composer-sidecar-actions .ts-btn{white-space:nowrap}
@media(max-width:760px){.ts-composer-sidecar-actions{gap:6px}.ts-composer-sidecar-actions .ts-btn{padding-inline:10px}}

/* v27.88 · Composer strip navigator + live-ish preview ------------------ */
.ts-composer-workshop { gap:10px; padding:12px; min-height:0; }
.ts-composer-workshop-copy { min-height:44px; }
.ts-composer-workshop-copy strong { font-size:17px; }
.ts-composer-workshop-copy span:not(.ts-chip) { margin-top:4px; font-size:10px; }
.ts-composer-workshop-main {
  display:grid;
  grid-template-columns:minmax(210px,255px) minmax(0,1fr);
  grid-template-rows:auto auto;
  gap:10px 12px;
  min-height:0;
}
.ts-composer-workshop-groups {
  grid-column:1; grid-row:1;
  max-height:168px; overflow:auto; scrollbar-gutter:stable;
  align-content:start; gap:8px; padding:0 5px 0 0;
}
.ts-composer-workshop-groups > section { gap:4px; }
.ts-composer-workshop-groups header { position:sticky; top:0; z-index:2; padding:2px 0; background:color-mix(in srgb,var(--ts-elevated) 96%,transparent); }
.ts-composer-workshop-groups header strong { font-size:9.5px; }
.ts-composer-workshop-groups header span { display:none; }
.ts-composer-workshop-groups > section > div { grid-template-columns:1fr; gap:3px; }
.ts-composer-workshop-groups button { min-height:30px; padding:5px 7px; border-radius:7px; }
.ts-composer-workshop-groups button span { font-size:9.5px; }
.ts-composer-workshop-groups button small { font-size:8px; }
.ts-composer-workshop-preview {
  grid-column:2; grid-row:1;
  min-height:168px; max-height:168px;
  align-self:stretch; align-content:center;
  padding:12px 14px; gap:9px;
}
.ts-composer-workshop-toolbar { gap:5px; }
.ts-composer-workshop-toolbar > button { width:29px; height:28px; border-radius:6px; }
.ts-composer-workshop-toolbar > button i { width:12px; height:12px; }
.ts-composer-workshop-toolbar > button i.has-svg {
  border:0; border-radius:0; transform:none; background:currentColor;
  -webkit-mask-image:var(--ts-composer-svg); mask-image:var(--ts-composer-svg);
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
  -webkit-mask-position:center; mask-position:center;
  -webkit-mask-size:contain; mask-size:contain;
}
.ts-composer-workshop-input { grid-template-columns:34px minmax(0,1fr) 36px; gap:6px; }
.ts-composer-mock-attach,.ts-composer-mock-text { height:34px; }
.ts-composer-mock-attach { width:34px; border-radius:8px; }
.ts-composer-mock-send { width:36px; height:36px; }
.ts-composer-preview-hint { font-size:8.5px; }
.ts-composer-workshop-sidecar {
  grid-column:1 / -1; grid-row:2;
  min-height:540px; max-height:760px;
}
.ts-composer-sidecar-scroll { padding:10px 12px 14px; }

@media (max-width:760px) {
  .ts-composer-workshop-main { grid-template-columns:1fr; grid-template-rows:auto auto auto; }
  .ts-composer-workshop-groups { grid-column:1; grid-row:1; max-height:148px; }
  .ts-composer-workshop-preview { grid-column:1; grid-row:2; min-height:126px; max-height:126px; }
  .ts-composer-workshop-sidecar { grid-column:1; grid-row:3; min-height:520px; }
  .ts-composer-workshop.is-editing .ts-composer-workshop-groups { display:block; }
}

/* v27.90 · hidden-state markers + placeholder target -------------------- */
.ts-hidden-mark {
  display:inline-grid !important; place-items:center; flex:none;
  width:15px; height:15px; border-radius:999px;
  background:color-mix(in srgb,#ff4d67 16%,transparent);
  color:#ff6078 !important; border:1px solid color-mix(in srgb,#ff6078 38%,transparent);
  font:900 10px/1 system-ui,sans-serif !important; font-style:normal !important;
}
.ts-target-crumb .ts-hidden-mark { margin-left:1px; }
.ts-target-hidden-badge { display:inline-flex; align-items:center; gap:4px; margin-left:7px; padding:2px 6px; border:1px solid color-mix(in srgb,#ff6078 34%,transparent); border-radius:999px; background:color-mix(in srgb,#ff6078 10%,transparent); color:#ff6c82; font-size:8px; font-weight:800; vertical-align:middle; }
.ts-target-hidden-badge i { font-style:normal; font-size:10px; line-height:1; }
.ts-composer-workshop-groups button { position:relative; grid-template-columns:minmax(0,1fr) auto; align-items:center; }
.ts-composer-workshop-groups button > span { grid-column:1; }
.ts-composer-workshop-groups button > small { grid-column:1; }
.ts-composer-workshop-groups button > .ts-hidden-mark { grid-column:2; grid-row:1 / span 2; }
.ts-composer-mock-text > span[data-composer-mock-role="input.placeholder"] { display:flex; align-items:center; min-width:0; padding:0 8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }


/* v28.11 · Palette identity + reusable My Styles + cockpit cleanup -------- */
.ts-save-style-menu { position:relative; }
.ts-save-style-menu > summary { list-style:none; cursor:pointer; user-select:none; }
.ts-save-style-menu > summary::-webkit-details-marker { display:none; }
.ts-save-style-menu[open] > summary { border-color:var(--ts-accent); background:var(--ts-accent-soft); }
.ts-save-style-popover {
  position:absolute; right:0; top:calc(100% + 6px); z-index:70; width:min(300px,calc(100vw - 32px));
  display:grid; gap:4px; padding:6px; border:1px solid var(--ts-border); border-radius:10px;
  background:color-mix(in srgb,var(--ts-elevated) 97%,var(--ts-surface)); box-shadow:var(--lumiverse-shadow-lg,0 18px 50px rgba(0,0,0,.45));
}
.ts-save-style-popover button { appearance:none; display:grid; gap:2px; width:100%; border:1px solid transparent; border-radius:7px; padding:8px 9px; background:transparent; color:var(--ts-text); text-align:left; cursor:pointer; font:inherit; }
.ts-save-style-popover button:hover:not(:disabled) { border-color:var(--ts-border); background:var(--ts-hover); }
.ts-save-style-popover button:disabled { opacity:.38; cursor:not-allowed; }
.ts-save-style-popover strong { font-size:10px; }
.ts-save-style-popover span { color:var(--ts-muted); font-size:8.5px; line-height:1.35; }

.ts-library-view-nav button[data-library-view="my-styles"] { margin-top:7px; border-top-color:color-mix(in srgb,var(--ts-accent) 26%,transparent); }
.ts-saved-style-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
.ts-saved-style-card { display:grid; grid-template-columns:auto minmax(0,1fr); gap:9px 10px; align-items:start; border:1px solid var(--ts-border); border-radius:10px; padding:11px; background:color-mix(in srgb,var(--ts-elevated) 94%,var(--ts-surface)); }
.ts-saved-style-card:hover { border-color:color-mix(in srgb,var(--ts-accent) 34%,var(--ts-border)); }
.ts-saved-style-mark { display:grid; place-items:center; width:30px; height:30px; border:1px solid color-mix(in srgb,var(--ts-accent) 38%,var(--ts-border)); border-radius:9px; background:var(--ts-accent-soft); color:var(--ts-accent); font-size:14px; }
.ts-saved-style-copy { min-width:0; display:grid; gap:3px; }
.ts-saved-style-title { display:flex; gap:6px; align-items:center; min-width:0; }
.ts-saved-style-title strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; }
.ts-saved-style-copy > span,.ts-saved-style-copy > small { color:var(--ts-muted); font-size:8.5px; line-height:1.35; }
.ts-saved-style-copy > small { color:var(--ts-dim); }
.ts-saved-style-actions { grid-column:1/-1; display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:5px; }
.ts-saved-style-actions .ts-btn { min-height:29px; font-size:9px; }

.ts-theme-stash .ts-section-heading { align-items:center; margin-bottom:9px; }
.ts-theme-stash .ts-section-heading .ts-kicker { margin-bottom:3px; }
.ts-theme-stash .ts-section-heading .ts-note { max-width:560px; }
.ts-project-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.ts-project-card { overflow:hidden; border:1px solid var(--ts-border); border-radius:10px; background:color-mix(in srgb,var(--ts-elevated) 93%,var(--ts-surface)); transition:border-color .15s ease,background .15s ease; }
.ts-project-card:hover { border-color:color-mix(in srgb,var(--ts-accent) 34%,var(--ts-border)); }
.ts-project-card.is-active { border-color:color-mix(in srgb,var(--ts-accent) 62%,var(--ts-border)); background:color-mix(in srgb,var(--ts-accent) 6%,var(--ts-elevated)); box-shadow:inset 3px 0 0 color-mix(in srgb,var(--ts-accent) 72%,transparent); }
.ts-project-card-select { appearance:none; display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:9px; align-items:center; width:100%; border:0; padding:10px; background:transparent; color:var(--ts-text); text-align:left; cursor:pointer; font:inherit; }
.ts-project-swatches { display:flex; width:38px; height:28px; overflow:hidden; border:1px solid var(--ts-border); border-radius:7px; background:var(--ts-surface); }
.ts-project-swatches i { flex:1 1 0; min-width:6px; background:var(--swatch); }
.ts-project-card-copy { min-width:0; display:grid; gap:2px; }
.ts-project-card-copy strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10.5px; }
.ts-project-card-copy small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-muted); font-size:8px; }
.ts-project-card-actions { display:flex; gap:4px; padding:0 8px 8px; }
.ts-project-card-actions .ts-btn { width:27px; min-height:27px; margin:0; padding:0; font-size:9px; }

.ts-native-handoff-actions { display:flex; flex-wrap:wrap; align-items:stretch; gap:6px; }
.ts-native-handoff-actions .ts-btn { flex:1 1 150px; min-width:0; }
.ts-code-generated { min-height:210px; max-height:42vh; }
.ts-code-custom { min-height:200px; }
.ts-code-handoff { padding-top:2px; border-top:1px solid var(--ts-border); }
.ts-code-handoff .ts-code-label { align-items:flex-start; }

/* Flatten routine editing chrome: packet cards stay cards; scope/state are toolbars. */
.ts-responsive-row { margin-bottom:5px; padding:2px 0 6px; border:0; border-radius:0; background:transparent; }
.ts-responsive-row .ts-responsive-switch .ts-btn { min-height:28px; }
.ts-state-row { margin:0 0 9px; padding-top:6px; border-top:1px solid color-mix(in srgb,var(--ts-border) 70%,transparent); }
.ts-target-ladder { border-color:color-mix(in srgb,var(--ts-border) 70%,transparent); box-shadow:none; }
.ts-target-suggestion { background:color-mix(in srgb,var(--ts-surface) 42%,transparent); }

/* Collapsed Boost should read like three switches, not three empty forms. */
.ts-boost-card:has(.ts-switch input:not(:checked)) { padding-block:8px; }
.ts-boost-card:has(.ts-switch input:not(:checked)) > p.ts-note { display:none; }
.ts-boost-card:has(.ts-switch input:not(:checked)) .ts-boost-card-head small { margin-top:1px; }

@media (max-width:760px) {
  .ts-saved-style-grid,.ts-project-grid { grid-template-columns:1fr; }
  .ts-library-browser .ts-library-view-nav { grid-template-columns:none; }
  .ts-library-view-nav button[data-library-view="my-styles"] { margin-top:0; }
  .ts-theme-stash .ts-section-heading { align-items:flex-start; }
  .ts-native-handoff-actions .ts-btn { flex-basis:calc(50% - 4px); }
}
@media (max-width:440px) {
  .ts-native-handoff-actions .ts-btn { flex-basis:100%; }
  .ts-save-style-menu > summary span { display:none; }
}

.ts-quick-palette-fold { margin:8px 0 10px; border:1px solid var(--ts-border); border-radius:9px; background:color-mix(in srgb,var(--ts-elevated) 92%,var(--ts-surface)); overflow:hidden; }
.ts-quick-palette-fold > summary { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 10px; cursor:pointer; list-style:none; }
.ts-quick-palette-fold > summary::-webkit-details-marker { display:none; }
.ts-quick-palette-fold > summary > div { display:flex; align-items:center; justify-content:space-between; gap:10px; min-width:0; flex:1; }
.ts-quick-palette-fold > summary strong { font-size:10px; }
.ts-quick-palette-fold > summary span { display:flex; align-items:center; gap:4px; color:var(--ts-muted); font-size:8px; }
.ts-quick-palette-fold > summary i { width:10px; height:10px; border-radius:50%; background:var(--swatch); border:1px solid var(--ts-border); }
.ts-quick-palette-fold > summary b { color:var(--ts-dim); font-size:10px; transition:transform .15s ease; }
.ts-quick-palette-fold[open] > summary b { transform:rotate(180deg); }
.ts-quick-palette-fold-body { padding:0 8px 8px; }
.ts-quick-palette-fold-body .ts-quick-builder { margin:0; border:0; background:transparent; box-shadow:none; padding:8px 2px 2px; }
.ts-quick-palette-fold-body .ts-quick-builder-head { display:none; }

/* v28.12 · My Styles bundles + cockpit fit pass -------------------------- */
.ts-style-stack-tools { max-width:100%; }
.ts-save-style-popover { left:50%; right:auto; transform:translateX(-50%); width:min(280px,calc(100vw - 28px)); }
.ts-save-style-chooser { margin:0 0 10px; overflow:hidden; border:1px solid color-mix(in srgb,var(--ts-accent) 36%,var(--ts-border)); border-radius:10px; background:color-mix(in srgb,var(--ts-elevated) 97%,var(--ts-surface)); box-shadow:0 12px 34px rgba(0,0,0,.18); }
.ts-save-style-chooser-head { display:flex; justify-content:space-between; gap:10px; align-items:start; padding:10px 10px 8px; border-bottom:1px solid var(--ts-border); }
.ts-save-style-chooser-head > div { display:grid; gap:2px; min-width:0; }
.ts-save-style-chooser-head strong { font-size:10px; }
.ts-save-style-chooser-head span { color:var(--ts-muted); font-size:8px; line-height:1.35; }
.ts-save-style-chooser-list { max-height:270px; overflow:auto; padding:7px; scrollbar-width:thin; }
.ts-save-style-group + .ts-save-style-group { margin-top:8px; padding-top:8px; border-top:1px solid color-mix(in srgb,var(--ts-border) 72%,transparent); }
.ts-save-style-group > header { display:flex; justify-content:space-between; gap:8px; align-items:center; padding:0 3px 5px; }
.ts-save-style-group > header strong { font-size:8px; text-transform:uppercase; letter-spacing:.55px; color:var(--ts-muted); }
.ts-save-style-group > header button { appearance:none; border:0; padding:2px 3px; background:transparent; color:var(--ts-accent); cursor:pointer; font:inherit; font-size:7.5px; }
.ts-save-style-check { display:grid; grid-template-columns:auto minmax(0,1fr); gap:7px; align-items:center; min-height:34px; padding:5px 6px; border-radius:7px; cursor:pointer; }
.ts-save-style-check:hover { background:var(--ts-hover); }
.ts-save-style-check input { accent-color:var(--ts-accent); }
.ts-save-style-check > span { display:grid; gap:1px; min-width:0; }
.ts-save-style-check strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:8.5px; }
.ts-save-style-check small { color:var(--ts-dim); font-size:7.5px; }
.ts-save-style-chooser > footer { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:6px; align-items:center; padding:8px; border-top:1px solid var(--ts-border); }
.ts-save-style-chooser > footer > span { color:var(--ts-muted); font-size:8px; }
.ts-saved-style-resolution { margin-top:4px; border-top:1px solid color-mix(in srgb,var(--ts-border) 65%,transparent); padding-top:4px; }
.ts-saved-style-resolution > summary { cursor:pointer; color:var(--ts-muted); font-size:8px; }
.ts-saved-style-resolution > div { display:grid; gap:2px; padding-top:4px; color:var(--ts-dim); font-size:7.5px; line-height:1.35; }
.ts-code { white-space:pre-wrap; overflow-wrap:anywhere; word-break:break-word; overflow-x:hidden; }
.ts-boost-summary { align-self:start; color:var(--ts-muted); font-size:8px; line-height:1.25; text-align:right; white-space:nowrap; }
.ts-floating-editor .ts-style-stack-head { flex-wrap:wrap; }
.ts-floating-editor .ts-style-stack-tools { width:100%; justify-content:flex-start; }
.ts-floating-editor .ts-save-style-menu { flex:0 0 auto; }
.ts-floating-editor .ts-save-style-popover { width:min(250px,calc(100vw - 24px)); }
@media (max-width:520px) {
  .ts-style-stack-tools { width:100%; }
  .ts-save-style-popover { width:min(240px,calc(100vw - 20px)); }
  .ts-save-style-chooser-list { max-height:220px; }
  .ts-save-style-chooser > footer { grid-template-columns:1fr 1fr; }
  .ts-save-style-chooser > footer > span { grid-column:1/-1; }
  .ts-boost-summary { max-width:150px; white-space:normal; }
}

/* v28.13 · Drawer identity + readability pass --------------------------- */
/* Save Style is the first Style Stack action. Anchor its popover to that
   button instead of centering a 280px panel around an ~80px trigger; the
   centered version put half the menu outside Float's clipped viewport. */
.ts-save-style-popover { left:0; right:auto; transform:none; max-width:calc(100vw - 24px); }
.ts-floating-editor .ts-save-style-popover { left:0; right:auto; transform:none; width:min(260px,calc(100vw - 24px)); }

/* The cockpit had slowly accumulated 6–8px helper copy during UI-maxxing.
   Keep it compact, but restore normal-human reading sizes on the authoring
   surfaces rather than making users zoom the browser to inspect Palette. */
.ts-style-stack-tools .ts-btn { font-size:10.5px; }
.ts-save-style-popover strong { font-size:11px; }
.ts-save-style-popover span { font-size:9.5px; }
.ts-save-style-chooser-head strong { font-size:11px; }
.ts-save-style-chooser-head span { font-size:9.5px; }
.ts-save-style-group > header strong { font-size:9px; }
.ts-save-style-group > header button { font-size:8.75px; }
.ts-save-style-check { min-height:38px; }
.ts-save-style-check strong { font-size:10px; }
.ts-save-style-check small { font-size:8.75px; }
.ts-save-style-chooser > footer > span { font-size:9px; }

.ts-library-view-nav button { font-size:10.5px; }
.ts-library-side-status > strong { font-size:11px; }
.ts-library-side-status > p { font-size:9px; }
.ts-library-tune > summary strong { font-size:10px; }
.ts-library-tune > summary span { font-size:8.5px; }
.ts-library-results-title strong { font-size:13px; }
.ts-library-results-title > span { font-size:9px; }
.ts-library-browser .ts-library-search > span { font-size:8.5px; }
.ts-library-browser .ts-library-group-head strong { font-size:12px; }
.ts-library-browser .ts-library-group-head small { font-size:9px; }
.ts-saved-style-title strong { font-size:12px; }
.ts-saved-style-copy > span,.ts-saved-style-copy > small { font-size:9.5px; }
.ts-saved-style-actions .ts-btn { font-size:10px; }
.ts-saved-style-resolution > summary { font-size:9px; }
.ts-saved-style-resolution > div { font-size:8.5px; }

.ts-target-parts-label,.ts-target-surface > span { font-size:9.5px; }
.ts-target-surface-note { font-size:10.5px; }
.ts-packet-summary { font-size:10.5px; }
.ts-observed-banner strong { font-size:10px; }
.ts-observed-banner span { font-size:9px; }

@media (max-width:520px) {
  .ts-save-style-popover,.ts-floating-editor .ts-save-style-popover { left:0; transform:none; width:min(250px,calc(100vw - 18px)); }
  .ts-library-view-nav button { font-size:10px; }
}

/* v28.15 · cockpit nitpick pass ----------------------------------------- */
/* Quick-look actions stay on one line. Reset no longer rents a second row. */
.ts-preset-card-actions:not(.ts-library-card-actions) { grid-template-columns:minmax(0,1fr) 34px 34px; }
.ts-preset-card-actions:not(.ts-library-card-actions):not(:has(.ts-preset-reset)) { grid-template-columns:minmax(0,1fr) 34px; }
.ts-preset-card-compact .ts-preset-card-actions { align-items:stretch; }

/* Backdrop belongs to the Boost world; Typography remains standalone. */
.ts-boost-world-card { display:grid; gap:0; padding:0; overflow:hidden; }
.ts-boost-world-card > .ts-boost-card-head { padding:10px; border-bottom:1px solid var(--ts-border); }
.ts-boost-layer { display:grid; gap:0; padding:10px; }
.ts-boost-layer + .ts-boost-layer { border-top:1px solid var(--ts-border); }
.ts-boost-layer-head { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; }
.ts-boost-layer-head strong,.ts-boost-layer-head small { display:block; }
.ts-boost-layer-head strong { font-size:11px; }
.ts-boost-layer-head small { margin-top:2px; color:var(--ts-muted); font-size:9px; }
.ts-boost-layer > .ts-segment,.ts-boost-layer > .ts-field,.ts-boost-layer > .ts-note,.ts-boost-layer > .ts-advanced,.ts-boost-layer > .ts-boost-subsection { margin-top:10px; }
.ts-boost-world-card .ts-boost-release-hint { margin-right:0; }
/* The compact-off treatment applies to the genuinely standalone card only;
   one disabled Boost sub-layer must not collapse its enabled sibling. */
.ts-boost-world-card:has(.ts-switch input:not(:checked)) { padding-block:0; }
.ts-boost-world-card:has(.ts-switch input:not(:checked)) .ts-boost-card-head small { margin-top:2px; }
.ts-boost-typography-card:has(.ts-switch input:not(:checked)) { padding-block:8px; }
.ts-boost-typography-card:has(.ts-switch input:not(:checked)) > p.ts-note { display:none; }

/* Read Page is a full inspection surface, not an ant farm. */
.ts-style-map-modal { width:min(1040px,calc(100vw - 24px)); height:min(86dvh,820px); }
.ts-style-map-head { padding:17px 18px 14px; }
.ts-style-map-head .ts-kicker { font-size:10px; }
.ts-style-map-head strong { font-size:18px; }
.ts-style-map-head small { margin-top:1px; font-size:11px; line-height:1.35; }
.ts-style-map-toolbar { gap:12px; padding:12px 18px; }
.ts-style-map-toolbar .ts-search { min-height:38px; font-size:13px; padding-inline:12px; }
.ts-style-map-toolbar span { font-size:11px; }
.ts-style-map-list { padding:14px 18px 28px; }
.ts-style-map-group + .ts-style-map-group { margin-top:18px; }
.ts-style-map-group .ts-group-title { padding:7px 8px; font-size:12px; letter-spacing:.035em; }
.ts-style-map-item { grid-template-columns:minmax(0,1.25fr) minmax(220px,.75fr) 18px; gap:16px; min-height:50px; margin-top:6px; padding:10px 12px; border-radius:10px; }
.ts-style-map-item strong { font-size:12.5px; line-height:1.25; }
.ts-style-map-item small { margin-top:3px; font-size:10.5px; line-height:1.3; }
.ts-style-map-source b { font-size:10px; }
.ts-style-map-source small { font-size:9.5px; }
.ts-style-map-item > span:last-child { font-size:18px; color:var(--ts-muted); }

/* Group structural navigation: choose a nearby rung without pixel hunting,
   then add other direct children from the established shared parent. */
.ts-group-member { grid-template-columns:24px minmax(0,1fr) auto; }
.ts-group-member-main { display:grid; min-width:0; gap:5px; }
.ts-group-member-copy { display:grid; min-width:0; gap:1px; }
.ts-group-member-copy strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-text); font-size:9.5px; }
.ts-group-member-copy small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ts-dim); font:7.5px/1.3 var(--lumiverse-font-mono,monospace); }
.ts-group-target-select,.ts-group-add-select { width:100%; min-width:0; min-height:29px; border:1px solid var(--ts-border); border-radius:6px; padding:4px 25px 4px 7px; background:var(--lumiverse-fill-subtle,rgba(0,0,0,.12)); color:var(--ts-text); font:9px/1.2 inherit; }
.ts-group-target-select:hover,.ts-group-add-select:hover { border-color:color-mix(in srgb,var(--ts-accent) 48%,var(--ts-border)); }
.ts-group-add-row { display:grid; grid-template-columns:auto minmax(0,1fr); gap:8px; align-items:center; padding:2px 1px 0; }
.ts-group-add-row > span { color:var(--ts-muted); font-size:9px; white-space:nowrap; }

@media (max-width:720px) {
  .ts-style-map-head { padding:15px 14px 12px; }
  .ts-style-map-head strong { font-size:17px; }
  .ts-style-map-toolbar { padding:10px 14px; }
  .ts-style-map-toolbar span { font-size:10px; }
  .ts-style-map-list { padding:10px 12px 24px; }
  .ts-style-map-item { grid-template-columns:minmax(0,1fr) 18px; min-height:54px; padding:10px; }
  .ts-style-map-source { grid-column:1 / -1; grid-row:2; padding-top:3px; border-top:1px solid color-mix(in srgb,var(--ts-border) 65%,transparent); }
  .ts-group-add-row { grid-template-columns:1fr; gap:4px; }
}

/* v28.24 · Quick Align --------------------------------------------------- */
.ts-quick-align-axis button { min-width:0; }
.ts-quick-align-context > div { gap:2px; }
.ts-quick-align-context > div > small:last-child { margin-top:2px; white-space:normal; line-height:1.35; color:var(--ts-muted); }

/* v28.30 · Composer textarea metrics + physical send shell -------------- */
.ts-composer-mock-text > span[data-composer-mock-role="input.placeholder"] { padding:0; color:inherit; font:inherit; }
.ts-composer-mock-send-shell { display:grid; place-items:center; justify-self:center; align-self:center; width:36px; height:36px; box-sizing:border-box; }
.ts-composer-mock-send-shell .ts-composer-mock-send { max-width:100%; max-height:100%; }
.ts-composer-workshop-preview[data-active-composer-role="input.send.shell"] .ts-composer-mock-send-shell,
.ts-composer-workshop-preview[data-active-composer-role="input.send"] .ts-composer-mock-send,
.ts-composer-workshop-preview[data-active-composer-role="input.send.icon"] .ts-composer-mock-send > i { outline:2px solid var(--ts-accent); outline-offset:3px; }

/* v28.30 · Editorial contributors preview ------------------------------- */
.ts-preset-preview[data-preset-preview="editorial-roster"] { background:linear-gradient(100deg,#dad5cb,#cfd5d1); border-color:#6d7c82; }
.ts-preset-preview[data-preset-preview="editorial-roster"]::before { content:'CONTRIBUTORS'; position:absolute; left:10px; top:14px; color:#53636a; font:800 6px/1 ui-monospace,monospace; letter-spacing:.9px; opacity:.72; }
.ts-preset-preview[data-preset-preview="editorial-roster"] .ts-preview-avatar { left:18px; top:35px; width:25px; height:25px; border:1px solid #68787e; border-radius:1px; filter:saturate(.62) grayscale(.08); box-shadow:46px 0 0 -1px #d4d0c8,92px 0 0 -1px #d4d0c8; }
.ts-preset-preview[data-preset-preview="editorial-roster"] .ts-preview-name { left:13px; top:64px; width:35px; color:#39474c; font-family:Georgia,serif; font-size:7px; text-align:center; box-shadow:46px 8px 0 -7px #52666d; }
.ts-preset-preview[data-preset-preview="editorial-roster"] .ts-preview-meta { display:none; }
.ts-preset-preview[data-preset-preview="editorial-roster"] .ts-preview-line { display:none; }


/* v28.52 · mobile workbench ------------------------------------------------
   Float keeps the same authoring surface on phones, but the chrome stops
   pretending it has desktop acreage. Density scales only the scroll body;
   the title/workspace/window controls remain full-size touch targets. */
.ts-inspector-density { width:100%; min-width:0; }
.ts-floating-minimize { display:grid; place-items:center; width:30px; padding:0!important; }
.ts-floating-minimize svg { width:15px; height:15px; }
.ts-floating-action-divider { display:block; width:1px; height:20px; margin:0 2px; background:var(--ts-border); opacity:.8; }
.ts-mobile-density-toggle { display:none!important; }

@media (max-width:600px) {
  .ts-floating-editor {
    --ts-mobile-density-scale:1;
    --ts-mobile-scroll-gutter:18px;
  }
  .ts-floating-editor[data-mobile-density="80"] { --ts-mobile-density-scale:.8; }
  .ts-floating-editor[data-mobile-density="60"] { --ts-mobile-density-scale:.6; }

  /* Palette owns its cockpit typography. Theme font/scale can style the app,
     not turn Smart into a 22px display heading inside the editor. */
  .ts-floating-editor [data-theme-studio-root] {
    --lumiverse-font-scale:1;
    font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    font-size:12px;
  }

  /* Tabs are one semantic island; edge/density/minimize/close are another. */
  .ts-floating-editor-head {
    grid-template-columns:minmax(40px,1fr) auto auto;
    align-items:center;
    gap:5px;
    min-height:42px;
    padding:8px 5px 5px 8px;
  }
  .ts-floating-editor-title { min-width:40px; }
  .ts-floating-editor-title strong { font:750 9px/1 ui-sans-serif,system-ui,sans-serif; }
  .ts-floating-workspaces {
    display:grid;
    grid-template-columns:repeat(3,30px);
    gap:1px;
    padding:2px;
    border:1px solid var(--ts-border);
    border-radius:8px;
    background:color-mix(in srgb,var(--ts-surface) 74%,transparent);
  }
  .ts-floating-workspaces button { width:30px; height:30px; border-radius:6px; }
  .ts-floating-workspaces svg { width:15px; height:15px; }
  .ts-floating-editor-actions {
    display:flex;
    align-items:center;
    gap:1px;
    min-width:0;
    padding-left:5px;
    border-left:1px solid var(--ts-border);
  }
  .ts-floating-editor-actions button {
    display:grid;
    place-items:center;
    width:29px;
    min-width:29px;
    height:30px;
    min-height:30px;
    padding:0;
    font-family:ui-sans-serif,system-ui,sans-serif;
  }
  .ts-mobile-density-toggle {
    display:grid!important;
    width:38px!important;
    min-width:38px!important;
    color:var(--ts-muted)!important;
    font:800 8px/1 ui-sans-serif,system-ui,sans-serif!important;
    letter-spacing:-.2px;
  }
  .ts-floating-editor-actions [data-widget-action="dock"] {
    width:30px;
    min-width:30px;
    color:var(--ts-muted)!important;
    overflow:visible;
  }
  .ts-floating-editor-actions [data-widget-action="dock"]::after { content:none!important; }
  .ts-floating-minimize svg,.ts-mobile-edge-toggle svg { width:15px; height:15px; }
  .ts-floating-close { font-size:15px!important; }

  /* Workbar remains unscaled and tappable, but its select/text no longer
     inherits giant theme typography. Pick/Group and Guides/Smart stay two
     visibly separate tool families. */
  .ts-floating-editor .ts-workbar { padding:5px 6px; gap:4px; overflow:hidden; }
  .ts-floating-editor .ts-workbar-primary { width:100%; gap:4px; }
  .ts-floating-editor .ts-workbar-mode-group,
  .ts-floating-editor .ts-workbar-guide-group { gap:2px; padding:2px; border-radius:7px; }
  .ts-floating-editor .ts-workbar-divider { height:20px; }
  .ts-floating-editor .ts-workbar .ts-btn { min-height:29px; padding:4px 7px; font:700 9px/1 ui-sans-serif,system-ui,sans-serif; }
  .ts-floating-editor .ts-guide-mode {
    width:76px;
    min-width:72px;
    height:29px;
    min-height:29px;
    padding:4px 22px 4px 7px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font:700 10px/1 ui-sans-serif,system-ui,sans-serif!important;
  }

  /* The padding itself is deliberately empty: either edge is always a safe
     vertical pan lane even when a packet contains several range sliders. */
  .ts-floating-editor .ts-scroll {
    display:flex;
    flex-direction:column;
    align-items:center;
    padding:7px var(--ts-mobile-scroll-gutter) 16px!important;
    touch-action:pan-y;
  }
  .ts-floating-editor .ts-inspector-density {
    width:100%;
    max-width:100%;
    min-width:0;
    box-sizing:border-box;
    zoom:var(--ts-mobile-density-scale);
  }

  /* Mobile form density. 100% is still fully usable; 80/60 expose more of
     the same controls without scaling the persistent toolbar itself. */
  .ts-floating-editor .ts-inspector-density :is(.ts-input,.ts-number,.ts-project-select,.ts-search) {
    min-height:34px;
    padding:6px 8px;
    font:500 11px/1.2 ui-sans-serif,system-ui,sans-serif;
  }
  .ts-floating-editor .ts-inspector-density select.ts-input {
    height:34px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .ts-floating-editor .ts-inspector-density .ts-field { margin-top:8px; }
  .ts-floating-editor .ts-inspector-density .ts-label { margin-bottom:4px; font-size:10px; }
  .ts-floating-editor .ts-inspector-density .ts-range-row { grid-template-columns:minmax(0,1fr) 64px; gap:6px; }
  .ts-floating-editor .ts-inspector-density .ts-range { touch-action:none; }
  .ts-floating-editor .ts-inspector-density .ts-advanced { margin-top:8px; }
  .ts-floating-editor .ts-inspector-density .ts-advanced > summary { padding:7px 0 1px; font-size:9px; }
  .ts-floating-editor .ts-inspector-density .ts-packet { margin-bottom:7px; }
  .ts-floating-editor .ts-inspector-density .ts-packet-body { padding:9px; }
  .ts-floating-editor .ts-inspector-density .ts-inline-fields { gap:6px; }
  .ts-floating-editor .ts-inspector-density .ts-dimension-row.is-fixed { grid-template-columns:76px minmax(56px,1fr) minmax(92px,104px); gap:6px; }
  .ts-floating-editor .ts-inspector-density .ts-primary-dimension.is-fixed { grid-template-columns:76px minmax(56px,1fr) minmax(92px,104px); gap:6px; }
  .ts-floating-editor .ts-inspector-density .ts-size-mode { height:34px; }
  .ts-floating-editor .ts-inspector-density .ts-box-grid { gap:6px; margin-top:8px; }
}


/* v29 · 1.0.3 Community UX Pass -------------------------------------------
   The Style Library can now move into Lumiverse's native left dock without
   cloning state, while Quick Looks stays useful inside Palette itself. */
.ts-quick-look-switch {
  display:flex;
  align-items:end;
  justify-content:space-between;
  gap:10px;
  margin:10px 0 7px;
}
.ts-quick-look-switch label { display:grid; gap:4px; min-width:0; flex:1; }
.ts-quick-look-switch label > span {
  color:var(--ts-dim);
  font-size:7.5px;
  font-weight:800;
  letter-spacing:.07em;
  text-transform:uppercase;
}
.ts-quick-look-switch .ts-select { width:100%; min-width:0; }
.ts-quick-look-switch small {
  flex:none;
  max-width:42%;
  overflow:hidden;
  color:var(--ts-muted);
  font-size:7.5px;
  line-height:1.3;
  text-align:right;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.ts-quick-look-carousel {
  width:100%;
  min-width:0;
  overflow-x:auto;
  overflow-y:hidden;
  scroll-snap-type:x mandatory;
  overscroll-behavior-inline:contain;
  scrollbar-width:none;
  touch-action:pan-x pan-y;
}
.ts-quick-look-carousel::-webkit-scrollbar { display:none; }
.ts-quick-look-track { display:flex; width:100%; min-width:0; }
.ts-quick-look-page {
  flex:0 0 100%;
  width:100%;
  min-width:0;
  scroll-snap-align:start;
  scroll-snap-stop:always;
}
.ts-quick-look-page .ts-preset-grid {
  width:100%;
  grid-template-columns:repeat(2,minmax(0,1fr));
}
.ts-quick-look-pagination {
  display:flex;
  justify-content:center;
  gap:5px;
  min-height:13px;
  padding:7px 0 0;
}
.ts-quick-look-pagination button {
  appearance:none;
  width:5px;
  height:5px;
  border:0;
  border-radius:999px;
  padding:0;
  background:color-mix(in srgb,var(--ts-text) 22%,transparent);
  cursor:pointer;
  transition:width .14s ease,background .14s ease;
}
.ts-quick-look-pagination button[aria-pressed="true"] {
  width:14px;
  background:var(--ts-accent);
}

/* Header actions remain reachable in either presentation. */
.ts-style-library-head-actions,
.ts-pack-head-actions { display:flex; align-items:center; justify-content:flex-end; gap:7px; }
.ts-library-presentation-toggle {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  min-height:34px;
  padding:6px 9px;
  white-space:nowrap;
}
.ts-library-presentation-toggle > span:first-child { font-size:12px; }
.ts-library-presentation-toggle > span:last-child { font-size:8.5px; font-weight:720; }

/* Native dock mode: the host owns placement and resize geometry. Palette owns
   only the panel contents, so there is no fixed overlay/backdrop at all. */
.ts-style-library-dock-host {
  min-width:0;
  min-height:0;
  height:100%;
  overflow:hidden;
}
.ts-style-library-root-docked {
  position:relative;
  inset:auto;
  z-index:auto;
  width:100%;
  height:100%;
  min-width:0;
  min-height:0;
  overflow:hidden;
}
.ts-style-library-root-docked .ts-style-library-backdrop { display:none!important; }
.ts-style-library-root-docked .ts-style-library-modal {
  position:relative!important;
  inset:auto!important;
  width:100%;
  height:100%;
  min-width:0;
  min-height:0;
  border:0!important;
  border-radius:0!important;
  box-shadow:none!important;
}
.ts-style-library-root-docked .ts-style-library-head {
  padding:10px 11px 9px;
  align-items:center;
}
.ts-style-library-root-docked .ts-style-library-head h2 { font-size:16px; }
.ts-style-library-root-docked .ts-style-library-head > div > span { display:none; }
.ts-style-library-root-docked .ts-library-presentation-toggle > span:last-child { display:none; }
.ts-style-library-root-docked .ts-library-presentation-toggle { width:34px; padding:0; }

.ts-style-library-root-docked .ts-library-workspace {
  grid-template-columns:1fr!important;
  grid-template-rows:auto minmax(0,1fr);
}
.ts-style-library-root-docked .ts-library-sidebar {
  display:grid!important;
  grid-template-columns:1fr!important;
  gap:8px!important;
  min-height:0;
  overflow:visible!important;
  padding:9px 10px!important;
  border-right:0!important;
  border-bottom:1px solid var(--ts-border);
}
.ts-style-library-root-docked .ts-library-view-nav {
  display:flex!important;
  gap:4px!important;
  overflow-x:auto;
  scrollbar-width:none;
}
.ts-style-library-root-docked .ts-library-view-nav::-webkit-scrollbar { display:none; }
.ts-style-library-root-docked .ts-library-view-nav button {
  display:flex!important;
  flex:none;
  width:auto;
  min-height:34px;
  padding:6px 8px;
  font-size:8.5px;
}
.ts-style-library-root-docked .ts-library-view-nav button > span { width:18px; height:18px; }
.ts-style-library-root-docked .ts-library-side-status { display:none!important; }
.ts-style-library-root-docked .ts-library-tune {
  width:100%;
  margin:0!important;
  align-self:stretch!important;
}
.ts-style-library-root-docked .ts-library-tune > summary { min-height:38px; padding:7px 9px; }
.ts-style-library-root-docked .ts-library-tune > summary > div {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
}
.ts-style-library-root-docked .ts-library-results-toolbar { padding:10px; }
.ts-style-library-root-docked .ts-library-results-title {
  grid-template-columns:minmax(0,1fr) auto;
  align-items:center;
  gap:7px;
}
.ts-style-library-root-docked .ts-library-results-heading { grid-column:1; grid-row:1; }
.ts-style-library-root-docked .ts-library-results-title > [data-library-result-count] { grid-column:2; grid-row:1; }
.ts-style-library-root-docked .ts-library-surface-nav {
  grid-column:1 / -1;
  grid-row:2;
  margin-top:1px;
}
.ts-style-library-root-docked .ts-library-search-row {
  grid-template-columns:minmax(0,1fr) auto;
  gap:7px;
}
.ts-style-library-root-docked .ts-library-search { grid-column:1 / -1; }
.ts-style-library-root-docked .ts-library-pack-owned-toggle { justify-self:start; }
.ts-style-library-root-docked .ts-library-filter-trigger { min-width:90px; }
.ts-style-library-root-docked .ts-style-library-scroll { padding:11px 10px 22px!important; }
.ts-style-library-root-docked .ts-pack-grid { grid-template-columns:1fr!important; gap:12px!important; }
.ts-style-library-root-docked .ts-pack-open {
  grid-template-columns:116px minmax(0,1fr)!important;
  grid-template-rows:1fr!important;
  min-height:132px!important;
}
.ts-style-library-root-docked .ts-pack-preview {
  min-height:132px!important;
  border-right:1px solid var(--ts-border)!important;
  border-bottom:0!important;
}
.ts-style-library-root-docked .ts-pack-copy { min-height:0!important; justify-content:center; }
.ts-style-library-root-docked .ts-style-library-modal .ts-preset-grid { grid-template-columns:1fr!important; }

/* Pack workbench in a 340–720px native dock uses one scroll lane. Controls
   come first, then the recipe gallery, instead of crushing a 310px side rail. */
.ts-style-library-root-docked .ts-pack-workspace {
  display:flex!important;
  flex-direction:column;
  min-height:0;
  overflow:auto!important;
  scrollbar-width:thin;
}
.ts-style-library-root-docked .ts-pack-sidebar {
  order:-1;
  flex:none;
  overflow:visible!important;
  padding:10px!important;
  border-left:0!important;
  border-bottom:1px solid var(--ts-border);
}
.ts-style-library-root-docked .ts-pack-main {
  flex:none;
  overflow:visible!important;
  min-height:0;
}
.ts-style-library-root-docked .ts-pack-detail .ts-pack-hero { min-height:116px; }
.ts-style-library-root-docked .ts-pack-detail .ts-pack-preview-large { min-height:116px; }
.ts-style-library-root-docked .ts-pack-detail .ts-pack-summary { display:none; }
.ts-style-library-root-docked .ts-pack-detail .ts-pack-detail-scroll { padding:13px 10px 24px; }
.ts-style-library-root-docked .ts-pack-detail .ts-pack-section-nav { position:sticky; top:0; }

/* Phone geometry: stay inside app/safe-area chrome, keep Close touchable, and
   never force Browse + Tune previews to share one microscopic row. */
@media (max-width:760px) {
  .ts-style-library-root:not(.ts-style-library-root-docked) .ts-style-library-modal {
    top:max(var(--app-interactive-safe-top, 0px), env(safe-area-inset-top, 0px))!important;
    right:env(safe-area-inset-right, 0px)!important;
    bottom:env(safe-area-inset-bottom, 0px)!important;
    left:env(safe-area-inset-left, 0px)!important;
    height:auto!important;
  }
  .ts-style-library-root:not(.ts-style-library-root-docked) .ts-style-library-head {
    min-height:58px;
    align-items:center;
    padding:10px max(12px,env(safe-area-inset-right,0px)) 9px max(12px,env(safe-area-inset-left,0px));
  }
  .ts-style-library-head .ts-btn-icon {
    flex:none;
    width:42px;
    min-width:42px;
    height:42px;
    min-height:42px;
  }
  .ts-library-presentation-toggle { display:none; }
}
@media (max-width:600px) {
  .ts-quick-look-page .ts-preset-grid { grid-template-columns:1fr; }
  .ts-quick-look-switch { align-items:stretch; flex-direction:column; gap:6px; }
  .ts-quick-look-switch small { max-width:none; text-align:left; }

  .ts-library-browser .ts-library-sidebar {
    grid-template-columns:minmax(0,1fr)!important;
    gap:8px!important;
  }
  .ts-library-browser .ts-library-view-nav {
    width:100%;
    min-width:0;
  }
  .ts-library-browser .ts-library-tune {
    grid-column:1 / -1;
    width:100%;
    margin:0!important;
    align-self:stretch!important;
  }
  .ts-library-browser .ts-library-tune > summary {
    width:100%;
    min-height:42px;
    padding:7px 9px;
  }
  .ts-library-browser .ts-pack-grid {
    grid-template-columns:1fr!important;
    gap:14px!important;
  }
  .ts-library-browser .ts-pack-card { border-radius:14px; }
}

/* 1.0.3 QA follow-up -------------------------------------------------------
   Mobile's view strip should read like the dock strip, not like a sequence of
   mysterious full-width pages. The browse/filter block can also get out of
   the way without hiding the actual style cards. */
.ts-library-mobile-browse-toggle { display:none; }
.ts-quick-revert {
  border-color:color-mix(in srgb,var(--ts-accent) 48%,var(--ts-border));
  background:color-mix(in srgb,var(--ts-accent-soft) 58%,transparent);
  color:var(--ts-text);
}

@media (max-width:600px) {
  .ts-library-browser .ts-library-view-nav {
    display:flex!important;
    width:100%!important;
    min-width:0!important;
    gap:4px!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    padding:0 18px 1px 0;
    scroll-snap-type:x proximity;
    overscroll-behavior-inline:contain;
    scrollbar-width:none;
  }
  .ts-library-browser .ts-library-view-nav::-webkit-scrollbar { display:none; }
  .ts-library-browser .ts-library-view-nav button {
    flex:0 0 auto!important;
    width:auto!important;
    min-width:max-content!important;
    scroll-snap-align:start;
  }
  .ts-library-mobile-browse-toggle {
    appearance:none;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    width:100%;
    min-height:42px;
    border:0;
    border-bottom:1px solid var(--ts-border);
    padding:8px 11px;
    background:color-mix(in srgb,var(--ts-elevated) 78%,transparent);
    color:var(--ts-text);
    cursor:pointer;
    font:inherit;
    text-align:left;
  }
  .ts-library-mobile-browse-toggle > span { display:grid; gap:1px; min-width:0; }
  .ts-library-mobile-browse-toggle small {
    color:var(--ts-dim);
    font-size:7px;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
  }
  .ts-library-mobile-browse-toggle strong { overflow:hidden; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
  .ts-library-mobile-browse-toggle b { color:var(--ts-muted); font-size:11px; font-weight:500; transition:transform .14s ease; }
  .ts-library-results.is-mobile-browse-collapsed .ts-library-mobile-browse-toggle b { transform:rotate(-90deg); }
  .ts-library-results.is-mobile-browse-collapsed .ts-library-results-toolbar { display:none!important; }
}

@media (max-width:520px) {
  .ts-library-browser .ts-pack-open {
    grid-template-columns:1fr!important;
    grid-template-rows:126px auto!important;
    min-height:0!important;
  }
  .ts-library-browser .ts-pack-preview {
    min-height:126px!important;
    border-right:0!important;
    border-bottom:1px solid var(--ts-border)!important;
  }
  .ts-library-browser .ts-pack-copy {
    min-height:76px!important;
    padding:12px 48px 13px 13px!important;
    justify-content:center;
  }
}



/* 1.0.3 QA follow-up II -----------------------------------------------------
   The browser now has three real rows on phones (collapse toggle, browse
   controls, results). The old two-row grid let the implicit results row escape
   the available viewport and visually crawl behind Packs. Pack control details
   also promote to full width while open, and docked workbenches use the same
   compact disclosure rhythm as narrow/mobile layouts. */
@media (max-width:600px) {
  .ts-library-browser .ts-library-results {
    grid-template-rows:auto auto minmax(0,1fr)!important;
  }
  .ts-library-browser .ts-library-results.is-mobile-browse-collapsed {
    grid-template-rows:auto minmax(0,1fr)!important;
  }
}

@media (max-width:760px) {
  .ts-pack-sidebar-inner > .ts-pack-side-section[open] {
    grid-column:1 / -1;
    width:100%;
    min-width:0;
  }
}

/* v30 · SVG/Icon capability primitive -------------------------------------
   SVG replacement stays inside the native SVG box; this UI only exposes the
   target/corpus choices and does not invent a second icon layout system. */
.ts-style-option.is-capability-match:not(:disabled) {
  border-color: color-mix(in srgb,var(--ts-accent) 48%,var(--ts-border));
  background: color-mix(in srgb,var(--ts-accent-soft) 36%,var(--lumiverse-fill-subtle,transparent));
}
.ts-style-option.is-capability-match:not(:disabled) .ts-style-icon { color:var(--ts-accent); }
.ts-svg-target-picker { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
.ts-svg-target-picker button { appearance:none; min-width:0; display:grid; grid-template-columns:22px minmax(0,1fr); gap:7px; align-items:center; border:1px solid var(--ts-border); border-radius:8px; padding:7px 8px; background:var(--lumiverse-fill-subtle,rgba(255,255,255,.03)); color:var(--ts-muted); cursor:pointer; font:inherit; text-align:left; }
.ts-svg-target-picker button:hover,.ts-svg-target-picker button[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); color:var(--ts-text); }
.ts-svg-target-picker button > span { display:grid; place-items:center; width:22px; height:22px; border-radius:6px; background:color-mix(in srgb,var(--ts-accent) 14%,transparent); color:var(--ts-accent); font-size:9px; }
.ts-svg-target-picker strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px; }
.ts-svg-library { margin-top:8px; }
.ts-svg-library > summary { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.ts-svg-library > summary span { color:var(--ts-dim); font-size:8px; font-weight:600; }
.ts-svg-builtin-grid { max-height:244px; overflow:auto; overscroll-behavior:contain; padding-right:2px; }
.ts-svg-builtin-grid .ts-saved-svg-item > button:first-child { padding-right:7px; }
.ts-svg-builtin-grid .ts-saved-svg-item > button:first-child[aria-pressed="true"] { border-color:var(--ts-accent); background:var(--ts-accent-soft); color:var(--ts-text); box-shadow:0 0 0 1px color-mix(in srgb,var(--ts-accent) 18%,transparent); }
@media (max-width:620px) {
  .ts-svg-target-picker { grid-template-columns:1fr; }
  .ts-svg-builtin-grid { max-height:320px; }
}
`
