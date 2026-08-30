// Generated fallback bundle for Palette (TypeScript CJS module graph wrapped as ESM)
const __modules = Object.create(null);
__modules["src/backend"] = function(module,exports,__require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const STATE_PATH = 'theme-studio/projects.json';
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function cssValueTrace(value) { return typeof value === 'string' ? { json: JSON.stringify(value), codePoints: [...value].map((character) => character.codePointAt(0) ?? 0) } : { json: JSON.stringify(value), type: typeof value }; }
spindle.onFrontendMessage(async (payload, userId) => {
    if (!isRecord(payload) || typeof payload.type !== 'string' || typeof payload.requestId !== 'string')
        return;
    const requestId = payload.requestId;
    try {
        if (payload.type === 'theme_studio:load_state') {
            const state = await spindle.userStorage.getJson(STATE_PATH, { fallback: null, userId });
            spindle.sendToFrontend({ type: 'theme_studio:state_loaded', requestId, state }, userId);
            return;
        }
        if (payload.type === 'theme_studio:save_state') {
            if (!isRecord(payload.state))
                throw new Error('Invalid Theme Studio state');
            await spindle.userStorage.setJson(STATE_PATH, payload.state, { indent: 2, userId });
            spindle.sendToFrontend({ type: 'theme_studio:state_saved', requestId }, userId);
            return;
        }
        if (payload.type === 'theme_studio:get_theme_baseline') {
            const info = await spindle.theme.getCurrent(userId);
            const variables = await spindle.theme.generateVariables({ accent: info.accent, mode: info.mode, enableGlass: info.enableGlass, radiusScale: info.radiusScale, fontScale: info.fontScale, uiScale: info.uiScale });
            spindle.sendToFrontend({ type: 'theme_studio:theme_baseline', requestId, info, variables }, userId);
            return;
        }
        if (payload.type === 'theme_studio:apply_theme_override') {
            if (!isRecord(payload.variables) || Object.entries(payload.variables).some(([name, value]) => !/^--(?:lumiverse|lcs)-[a-zA-Z0-9-]+$/.test(name) || typeof value !== 'string'))
                throw new Error('Invalid Theme Studio variable override');
            // apply() merges for this extension, so clear first to make project switches
            // and removed semantic roles a true replacement rather than leaving stale keys.
            await spindle.theme.clear(userId);
            console.debug('[Theme Studio backend] outgoing Boost CSS value', { variable: '--lumiverse-primary', ...cssValueTrace(payload.variables['--lumiverse-primary']) });
            await spindle.theme.apply({ variables: payload.variables }, userId);
            const entries = Object.entries(payload.variables);
            spindle.sendToFrontend({ type: 'theme_studio:theme_applied', requestId, appliedCount: entries.length, sample: entries.slice(0, 3) }, userId);
            return;
        }
        if (payload.type === 'theme_studio:clear_theme_override') {
            await spindle.theme.clear(userId);
            spindle.sendToFrontend({ type: 'theme_studio:theme_cleared', requestId }, userId);
        }
    }
    catch (error) {
        spindle.sendToFrontend({
            type: payload.type.includes('theme_') && !payload.type.includes('state') ? 'theme_studio:theme_error' : 'theme_studio:state_error',
            requestId,
            error: error instanceof Error ? error.message : 'Storage operation failed',
        }, userId);
    }
});

};
const __cache = Object.create(null);
function __require(id){ if(__cache[id]) return __cache[id].exports; const fn=__modules[id]; if(!fn) throw new Error("Missing bundled module: "+id); const module={exports:{}}; __cache[id]=module; fn(module,module.exports,__require); return module.exports; }
const __entry = __require("src/backend");
