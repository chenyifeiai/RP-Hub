import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.THEME_DATA_DIR || path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'community-themes.json');
const MAX_BODY_BYTES = 1_500_000; // 1.5MB max per theme pack

const INITIAL_COMMUNITY_SEED = [
    {
        schemaVersion: '1.0',
        id: 'yunkui-ink-gold',
        name: '云岿山 · 墨形影踪画报',
        author: '新艾利都人特刊',
        version: '1.0.0',
        category: '新中式潮酷',
        baseMode: 'dark',
        cover: 'linear-gradient(135deg, #0d0d10 0%, #26231d 52%, #d4af63 85%, #f5f2e9 100%)',
        accent: '#d4af63',
        description: '新中式潮流杂志刊物主题：玄墨飞白底纹搭配流沙金切角边框、随主题附带「随便观 · 墨金刊号悬浮铭牌」，适合国潮与都市奇幻角色卡。',
        tags: ['新中式潮酷', '墨金杂志风', '带刊号悬浮铭牌'],
        capabilities: { dockSidebar: false },
        css: `html[data-rphub-theme-pack="yunkui-ink-gold"] {
    --primary-400: 224 188 114;
    --primary-500: 212 175 99;
    --primary-600: 184 146 72;
    --primary-text-500: 228 196 128;
    --primary-text-600: 236 208 148;
}
html[data-rphub-theme-pack="yunkui-ink-gold"] body,
html[data-rphub-theme-pack="yunkui-ink-gold"] #app,
html[data-rphub-theme-pack="yunkui-ink-gold"] .app-main {
    background:
        radial-gradient(ellipse at 80% 18%, rgba(212,175,99,.16), transparent 42%),
        radial-gradient(ellipse at 15% 85%, rgba(255,255,255,.05), transparent 40%),
        #111113 !important;
    color: #f3f0e8 !important;
}
html[data-rphub-theme-pack="yunkui-ink-gold"] .app-main .msg-bubble-glass {
    background: rgba(22, 21, 24, 0.94) !important;
    color: #f4f1e8 !important;
    border: 1px solid rgba(212, 175, 99, 0.36) !important;
    border-left: 4px solid #d4af63 !important;
    border-radius: 2px 14px 2px 14px !important;
}
html[data-rphub-theme-pack="yunkui-ink-gold"] .app-main .msg-name-tag {
    background: #d4af63 !important;
    color: #12110e !important;
    font-weight: 900 !important;
    border-radius: 2px !important;
}
html[data-rphub-theme-pack="yunkui-ink-gold"] .input-area-mobile .input-island {
    position: relative !important;
    padding-top: 24px !important;
    background: rgba(18, 18, 20, 0.96) !important;
    border: 1.5px solid rgba(212, 175, 99, 0.5) !important;
    border-radius: 2px 14px 2px 14px !important;
}
html[data-rphub-theme-pack="yunkui-ink-gold"] .input-area-mobile .input-island::before {
    content: "TRACES OF INK // 云岿山 · 随便观";
    position: absolute;
    left: 12px;
    top: 6px;
    color: #d4af63;
    font: 800 9px/1 ui-monospace, "Microsoft YaHei", sans-serif;
    letter-spacing: .12em;
}`,
        addons: [
            {
                id: 'yunkui-issue-badge',
                type: 'html-widget',
                slot: 'floating-br',
                title: '墨形影踪刊号铭牌',
                html: '<div style="padding:9px 13px;background:rgba(17,17,19,.92);border:1px solid rgba(212,175,99,.55);border-left:3px solid #d4af63;color:#f4f1e8;border-radius:2px 10px 2px 10px;box-shadow:0 10px 24px rgba(0,0,0,.45);"><div style="font-size:9px;letter-spacing:.14em;color:#d4af63;font-weight:800;">ISSUE 05 // Z.Z.Z.</div><div style="font-size:13px;font-weight:900;margin-top:2px;">云岿山 · 随便观</div><div style="font-size:10px;opacity:.7;margin-top:1px;">阴阳相生 · 术道归一</div></div>'
            }
        ],
        likes: 18,
        installs: 42,
        createdAt: '2026-11-17T07:00:00.000Z'
    }
];

let themesCache = null;

const ensureLoaded = () => {
    if (themesCache) return themesCache;
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        if (fs.existsSync(STORE_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
            if (Array.isArray(parsed)) {
                themesCache = parsed;
                return themesCache;
            }
        }
    } catch (_) {}
    themesCache = structuredClone(INITIAL_COMMUNITY_SEED);
    saveStore();
    return themesCache;
};

const saveStore = () => {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(STORE_FILE, JSON.stringify(themesCache || [], null, 2), 'utf8');
    } catch (err) {
        console.warn('Failed to persist community themes:', err.message);
    }
};

const sanitizeServerPack = raw => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid JSON payload');
    const name = String(raw.name || '').trim();
    if (!name) throw new Error('Theme name is required');
    const rawId = String(raw.id || ('community-' + Date.now().toString(36)))
        .replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
    if (rawId === 'native') throw new Error('Reserved theme id');

    const stripScripts = str => String(str || '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+\s*=/gi, ' data-blocked-handler=');

    const addons = Array.isArray(raw.addons) ? raw.addons.slice(0, 8).map((a, idx) => ({
        id: String(a.id || `${rawId}-addon-${idx}`).slice(0, 48),
        type: ['audio-player', 'media-carousel', 'html-widget', 'iframe-widget'].includes(a.type) ? a.type : 'html-widget',
        slot: ['sidebar-top', 'sidebar-bottom', 'floating-bl', 'floating-br', 'floating-tr'].includes(a.slot) ? a.slot : 'floating-br',
        title: String(a.title || '主题组件').slice(0, 40),
        html: a.html ? stripScripts(a.html).slice(0, 20_000) : '',
        srcdoc: a.srcdoc ? String(a.srcdoc).slice(0, 60_000) : '',
        config: a.config && typeof a.config === 'object' ? a.config : {}
    })) : [];

    return {
        schemaVersion: '1.0',
        id: rawId,
        name: name.slice(0, 48),
        author: String(raw.author || '匿名创作者').trim().slice(0, 32),
        version: String(raw.version || '1.0.0').trim().slice(0, 16),
        category: String(raw.category || '玩家共创').trim().slice(0, 20),
        baseMode: raw.baseMode === 'light' ? 'light' : 'dark',
        cover: String(raw.cover || 'linear-gradient(135deg, #1e293b 0%, #6366f1 100%)').slice(0, 400),
        accent: String(raw.accent || '#6366f1').slice(0, 32),
        description: String(raw.description || '').trim().slice(0, 240),
        tags: Array.isArray(raw.tags) ? raw.tags.map(t => String(t).trim()).filter(Boolean).slice(0, 6) : ['玩家共创'],
        capabilities: {
            dockSidebar: Boolean(raw.capabilities?.dockSidebar)
        },
        css: String(raw.css || '').replace(/<\/style/gi, '<\\/style').slice(0, 400_000),
        addons
    };
};

const readBodyJson = async req => {
    let total = 0;
    const chunks = [];
    for await (const chunk of req) {
        total += chunk.length;
        if (total > MAX_BODY_BYTES) throw new Error('Theme package exceeds 1.5MB limit');
        chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    return JSON.parse(text || '{}');
};

export const handleThemeRequest = async (request, url, sendJson) => {
    const list = ensureLoaded();

    // GET /v1/themes
    if (request.method === 'GET' && url.pathname === '/v1/themes') {
        return sendJson(200, { items: list, total: list.length });
    }

    // POST /v1/themes (Player uploads / updates a theme)
    if (request.method === 'POST' && url.pathname === '/v1/themes') {
        try {
            const payload = await readBodyJson(request);
            const clean = sanitizeServerPack(payload);
            const existingIdx = list.findIndex(item => item.id === clean.id);
            const now = new Date().toISOString();
            let record;
            if (existingIdx >= 0) {
                const prev = list[existingIdx];
                record = { ...clean, likes: prev.likes || 0, installs: prev.installs || 0, createdAt: prev.createdAt || now, updatedAt: now };
                list.splice(existingIdx, 1);
                list.unshift(record);
            } else {
                record = { ...clean, likes: 1, installs: 1, createdAt: now, updatedAt: now };
                list.unshift(record);
            }
            saveStore();
            return sendJson(201, { ok: true, item: record });
        } catch (err) {
            return sendJson(400, { error: err.message || 'Invalid theme submission' });
        }
    }

    // POST /v1/themes/:id/like or /install
    const actionMatch = url.pathname.match(/^\/v1\/themes\/([^/]+)\/(like|install)$/);
    if (request.method === 'POST' && actionMatch) {
        const id = decodeURIComponent(actionMatch[1]);
        const action = actionMatch[2];
        const target = list.find(item => item.id === id);
        if (!target) return sendJson(404, { error: 'Theme not found' });
        if (action === 'like') target.likes = (Number(target.likes) || 0) + 1;
        if (action === 'install') target.installs = (Number(target.installs) || 0) + 1;
        saveStore();
        return sendJson(200, { ok: true, id: target.id, likes: target.likes || 0, installs: target.installs || 0 });
    }

    return sendJson(404, { error: 'Unknown theme endpoint' });
};
