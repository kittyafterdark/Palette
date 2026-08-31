# Palette 1.0.1

A tiny release-day compatibility hotfix.

## Fixed

Palette could fail to initialize in mobile/desktop browsers when Lumiverse was opened over a plain HTTP LAN or Tailscale address. Those contexts can expose `crypto.getRandomValues()` while omitting secure-context-only `crypto.randomUUID()`. Because Palette generated its first project ID during frontend setup, the missing function aborted startup and Spindle unloaded the extension before the sidebar tab became usable.

Palette now uses a portable UUID helper everywhere it needs local IDs or request correlation keys:

- native `crypto.randomUUID()` when available;
- RFC 4122 v4-style UUID generation from `crypto.getRandomValues()` when it is not;
- a final non-cryptographic compatibility fallback only for runtimes without Web Crypto.

No themes, presets, editor UX, or project schema changed.

- Public release: **1.0.1**
- Project schema: **v41**
- Minimum Lumiverse version: **1.1.6**
