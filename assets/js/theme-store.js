// RP-Hub Theme Store Engine & Addon Runtime
// Default mode ("native") leaves RP-Hub 100% untouched: zero extra CSS, zero extra DOM widgets.
// Theme packages carry their own CSS, optional docked sidebar flag, and optional addon components
// (audio players, media carousels, HTML badges, or sandboxed iframe widgets).

(function () {
    const { reactive, computed } = Vue;

    const ACTIVE_THEME_KEY = 'rphub-active-theme-pack-v1';
    const NATIVE_MODE_BACKUP_KEY = 'rphub-native-appearance-backup-v1';
    const CUSTOM_THEMES_KEY = 'rphub-installed-themes-v1';
    const API_URL_KEY = 'rphub-theme-store-api-v1';
    const PLAYER_USER_TRACKS_PREFIX = 'rphub-theme-tracks-';
    const LIKED_IDS_KEY = 'rphub-theme-liked-ids-v1';
    const STYLE_TAG_ID = 'rphub-active-theme-pack-style';

    // Clean up any legacy Round-1 / v1 stuck dark state once so native mode always starts clean
    try {
        localStorage.removeItem('rphub-skin');
        localStorage.removeItem('rphub-last-light-skin');
        localStorage.removeItem('rphub-last-dark-skin');
        delete document.documentElement.dataset.appSkin;
        if (localStorage.getItem('rphub-theme-engine-v2-clean') !== '1') {
            localStorage.setItem('rphub-theme-engine-v2-clean', '1');
            localStorage.setItem(NATIVE_MODE_BACKUP_KEY, 'light');
            if ((localStorage.getItem(ACTIVE_THEME_KEY) || 'native') === 'native') {
                localStorage.setItem('rphub-appearance', 'light');
                document.documentElement.dataset.appTheme = 'light';
            }
        }
    } catch (_) {}

    const readJson = (key, fallback) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (_) {
            return fallback;
        }
    };

    const writeJson = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (_) { /* Ignore quota / file-mode errors */ }
    };

    const sanitizeCss = css => String(css || '').replace(/<\/style/gi, '<\\/style');

    const sanitizeHtml = html => {
        const raw = String(html || '');
        if (window.DOMPurify) {
            return window.DOMPurify.sanitize(raw, {
                ADD_TAGS: ['small', 'em', 'strong', 'b', 'i', 'span', 'div', 'section', 'header', 'footer', 'svg', 'path', 'circle', 'rect'],
                ADD_ATTR: ['class', 'style', 'aria-hidden', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'rx']
            });
        }
        return raw.replace(/<script[\s\S]*?<\/script>/gi, '');
    };

    // =========================================================================
    // 5 Built-in Entries: Native Default + User's 4 Signature Card Masterpieces
    // =========================================================================

    const BUILTIN_THEMES = [
        {
            schemaVersion: '1.0',
            id: 'native',
            builtin: true,
            name: 'RP-Hub 原生默认',
            author: 'RP-Hub Official',
            version: '2.0.6',
            category: '官方原生',
            baseMode: null, // Respect user's current light/dark toggle without forcing
            cover: 'linear-gradient(135deg, #eef2ff 0%, #dbeafe 50%, #c7d2fe 100%)',
            accent: '#5a6ff0',
            description: '保持 RP-Hub 100% 原汁原味的纯净默认界面，不注入任何额外样式、不挂载侧栏或播放器挂件，移动端与桌面端完全遵循原生体验。',
            tags: ['原生纯净', '零挂件', '昼夜自适应'],
            capabilities: { dockSidebar: false },
            css: '',
            addons: []
        },
        {
            schemaVersion: '1.0',
            id: 'zzz-new-eridu',
            builtin: true,
            name: '绝区零 · 新艾利都终端',
            author: '陈意非',
            version: '1.4.3',
            category: '游戏重装',
            baseMode: 'dark',
            cover: 'linear-gradient(135deg, #090a09 0%, #1c201d 48%, #2867ff 76%, #ffe100 100%)',
            accent: '#ffe100',
            description: '源自《绝区零》代表作全局改装：启用左侧新艾利都常驻终端栏、H.D.D 指令输入终端（动态 LINK 状态灯与斜切发送键）、录像店黑胶唱片机（含9首原声与自定义加歌）及影像轮播窗。',
            tags: ['H.D.D输入框', '常驻侧边栏', '录像店唱片机', '动态画报'],
            capabilities: { dockSidebar: true },
            css: `
html[data-rphub-theme-pack="zzz-new-eridu"] {
    --zzz-hub-black: #080909;
    --zzz-hub-panel: #151817;
    --zzz-hub-panel-2: #202321;
    --zzz-hub-paper: #f3f2e9;
    --zzz-hub-muted: #9ca29d;
    --zzz-hub-yellow: #ffe100;
    --zzz-hub-blue: #2867ff;
    --zzz-hub-cyan: #00bdc7;
    --zzz-hub-red: #ff4b3e;
    --primary-400: 255 225 0;
    --primary-500: 255 225 0;
    --primary-600: 230 198 0;
    --primary-text-500: 255 225 0;
    --primary-text-600: 255 225 0;
}
html[data-rphub-theme-pack="zzz-new-eridu"] body,
html[data-rphub-theme-pack="zzz-new-eridu"] #app {
    background:
        radial-gradient(circle at 78% 8%, rgba(40,103,255,.15), transparent 29%),
        repeating-linear-gradient(135deg, rgba(255,255,255,.025) 0 1px, transparent 1px 10px),
        var(--zzz-hub-black) !important;
    color: var(--zzz-hub-paper) !important;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .app-sidebar {
    color: var(--zzz-hub-paper) !important;
    background:
        linear-gradient(150deg, rgba(40,103,255,.12), transparent 31%),
        repeating-linear-gradient(135deg, rgba(255,255,255,.035) 0 1px, transparent 1px 8px),
        #111312 !important;
    border-right: 3px solid var(--zzz-hub-yellow) !important;
    box-shadow: 12px 0 28px rgba(0,0,0,.45) !important;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .app-sidebar::before {
    content: "NEW ERIDU";
    position: absolute;
    right: 2px;
    bottom: 108px;
    z-index: 0;
    color: rgba(255,255,255,.045);
    font: 900 52px/.78 Impact,"Arial Black",sans-serif;
    letter-spacing: -.04em;
    writing-mode: vertical-rl;
    pointer-events: none;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .app-sidebar-head {
    background: #090a09 !important;
    border-bottom: 1px solid #4c514d !important;
    box-shadow: inset 0 -3px 0 var(--zzz-hub-yellow);
}
html[data-rphub-theme-pack="zzz-new-eridu"] .app-sidebar .app-logo {
    padding: 5px 11px 6px !important;
    color: #090a09 !important;
    background: var(--zzz-hub-yellow) !important;
    border: 2px solid #050505;
    box-shadow: 3px 3px 0 #050505;
    transform: skew(-5deg);
}
html[data-rphub-theme-pack="zzz-new-eridu"] .app-sidebar .app-logo span { display: none !important; }
html[data-rphub-theme-pack="zzz-new-eridu"] .app-sidebar .app-logo::before {
    content: "绝区零";
    color: #090a09;
    font-size: 19px;
    font-weight: 900;
    letter-spacing: -.04em;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .app-sidebar .app-logo::after {
    content: "新艾利都终端";
    margin-left: 8px;
    padding-left: 8px;
    border-left: 2px solid rgba(9,10,9,.55);
    color: #090a09;
    font-size: 9px;
    font-weight: 900;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .sidebar-nav-button {
    color: #d7dbd7 !important;
    background: linear-gradient(100deg, rgba(255,255,255,.055), rgba(255,255,255,.018)) !important;
    border: 1px solid rgba(255,255,255,.09) !important;
    border-radius: 2px 10px 2px 10px !important;
    font-weight: 800 !important;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .sidebar-nav-button:hover {
    color: #fff !important;
    background: linear-gradient(100deg, rgba(40,103,255,.28), rgba(255,255,255,.05)) !important;
    border-color: rgba(85,135,255,.55) !important;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .sidebar-nav-button.is-active {
    color: #090a09 !important;
    background: var(--zzz-hub-yellow) !important;
    border-color: #050505 !important;
    box-shadow: 4px 4px 0 #050505 !important;
    transform: translateX(3px);
}
html[data-rphub-theme-pack="zzz-new-eridu"] .app-main {
    background:
        radial-gradient(circle at 84% 12%, rgba(40,103,255,.14), transparent 24%),
        repeating-linear-gradient(135deg, rgba(255,255,255,.025) 0 1px, transparent 1px 10px),
        #0a0c0b !important;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .app-main .msg-bubble-glass {
    color: #eceee9 !important;
    background:
        linear-gradient(110deg, rgba(255,225,0,.045), transparent 32%),
        repeating-linear-gradient(135deg, rgba(255,255,255,.025) 0 1px, transparent 1px 9px),
        rgba(24,27,25,.96) !important;
    border: 1px solid #555b56 !important;
    border-left: 5px solid var(--zzz-hub-yellow) !important;
    border-radius: 2px 13px 2px 13px !important;
    box-shadow: 5px 5px 0 rgba(0,0,0,.48) !important;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .app-main [data-role="user"] .msg-bubble-glass {
    background:
        linear-gradient(110deg, rgba(40,103,255,.22), transparent 38%),
        repeating-linear-gradient(135deg, rgba(255,255,255,.025) 0 1px, transparent 1px 9px),
        rgba(20,24,28,.96) !important;
    border-left-color: var(--zzz-hub-blue) !important;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .app-main .msg-name-tag {
    padding: 3px 9px !important;
    color: #090a09 !important;
    background: var(--zzz-hub-yellow) !important;
    border: 1px solid #050505 !important;
    border-radius: 2px 7px 2px 7px !important;
    box-shadow: 2px 2px 0 #050505 !important;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .native-thinking-card.summary-timeline-card {
    position: relative;
    background: linear-gradient(135deg, rgba(40,103,255,.1), transparent 34%), #0d100f !important;
    border: 2px solid #5c625e !important;
    border-radius: 3px 14px 3px 14px !important;
    box-shadow: 5px 5px 0 #050505 !important;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .native-thinking-card.summary-timeline-card::before {
    content: "";
    display: block;
    height: 6px;
    background: repeating-linear-gradient(-45deg, var(--zzz-hub-yellow) 0 10px, #070807 10px 20px);
}
html[data-rphub-theme-pack="zzz-new-eridu"] .input-area-mobile .input-island {
    position: relative !important;
    width: min(100%, 700px) !important;
    max-width: 700px !important;
    padding: 28px 10px 10px !important;
    background:
        linear-gradient(118deg, rgba(255,225,0,.075), transparent 24%),
        repeating-linear-gradient(135deg, rgba(255,255,255,.028) 0 1px, transparent 1px 8px),
        #0a0d0b !important;
    border: 2px solid #505751 !important;
    border-top: 4px solid var(--zzz-hub-yellow) !important;
    border-radius: 2px 13px 2px 13px !important;
    box-shadow: 5px 5px 0 #050505, 0 -2px 18px rgba(255,225,0,.12) !important;
    overflow: visible !important;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .input-area-mobile .input-island::before {
    content: "H.D.D  //  指令输入终端";
    position: absolute;
    left: 0;
    top: 0;
    height: 22px;
    padding: 0 14px 0 10px;
    display: flex;
    align-items: center;
    color: #090a09;
    background: var(--zzz-hub-yellow);
    clip-path: polygon(0 0,100% 0,92% 100%,0 100%);
    font: 900 9px/1 "Microsoft YaHei UI",sans-serif;
    letter-spacing: .08em;
    pointer-events: none;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .input-area-mobile .input-island::after {
    content: "LINK / READY";
    position: absolute;
    right: 12px;
    top: 6px;
    color: var(--zzz-hub-cyan);
    font: 900 8px/1 ui-monospace,Consolas,monospace;
    letter-spacing: .12em;
    pointer-events: none;
}
html[data-rphub-theme-pack="zzz-new-eridu"] .input-area-mobile .input-island:focus-within::after {
    content: "LINK / INPUT";
    color: var(--zzz-hub-yellow);
}
html[data-rphub-theme-pack="zzz-new-eridu"] .input-island .island-send:not(.island-send--stop) {
    color: #090a09 !important;
    background: var(--zzz-hub-yellow) !important;
    border: 2px solid #090a09 !important;
    border-radius: 2px 9px 2px 9px !important;
    clip-path: polygon(12% 0,100% 0,100% 82%,86% 100%,0 100%,0 18%);
}
`,
            addons: [
                {
                    id: 'zzz-sig',
                    type: 'html-widget',
                    slot: 'sidebar-bottom',
                    title: '新艾利都终端铭牌',
                    html: `<div class="tp-zzz-sig"><small>PRESIDENTIAL CUSTOM / NEW ERIDU</small><strong><span>绳匠</span><span>特制终端</span></strong><div class="tp-zzz-sig-row"><i>DEVICE SERIAL</i><b>44449448</b></div></div>`
                },
                {
                    id: 'zzz-media',
                    type: 'media-carousel',
                    slot: 'sidebar-bottom',
                    config: {
                        badge: 'H.D.D SIGNAL',
                        subtitle: '新艾利都影像档案',
                        slides: [
                            { title: '新艾利都联合行动', kicker: 'CH.01 / SEASON 3', url: 'https://act-webstatic.mihoyo.com/puzzle/zzz/pz_I5m4Tfpfo5/resource/puzzle/2026/06/01/1be912398d7a4e1be04b852211589561_4821949196733005819.png' },
                            { title: '代理人影像档案', kicker: 'CH.02 / AGENT ARCHIVE', url: 'https://act-webstatic.mihoyo.com/puzzle/zzz/pz_I5m4Tfpfo5/resource/puzzle/2026/06/01/8103a4c5e254bc17a61f01aec13f869f_5816535644748016896.png' },
                            { title: '邦布特别放送', kicker: 'CH.03 / BANGBOO CAST', url: 'https://act-webstatic.mihoyo.com/puzzle/zzz/pz_I5m4Tfpfo5/resource/puzzle/2026/06/01/482d7e9943c69f158b04d88cc8d11736_6884244322201945432.png' },
                            { title: '星轨讯号接入', kicker: 'CH.04 / AGENT SIGNAL', url: 'https://act-webstatic.mihoyo.com/puzzle/zzz/pz_I5m4Tfpfo5/resource/puzzle/2026/06/01/888ff35243e16ecb782c34b9b2fa298e_3348439353569683341.png' }
                        ]
                    }
                },
                {
                    id: 'zzz-player',
                    type: 'audio-player',
                    slot: 'sidebar-bottom',
                    config: {
                        kicker: 'VIDEO STORE / TRACK',
                        discLabel: 'ZZZ',
                        accent: '#ffe100',
                        tracks: [
                            { name: '绝区零官网主题', url: 'https://pub-c6d74e47e1734ec0af83f0e20518da2c.r2.dev/musics/1.4-zzz-official-web-theme.mp3' },
                            { name: 'Come Alive', url: 'https://pub-c6d74e47e1734ec0af83f0e20518da2c.r2.dev/musics/come-alive.mp3' },
                            { name: '60% Daily · 录像店日常', url: 'https://pub-c6d74e47e1734ec0af83f0e20518da2c.r2.dev/musics/daily-loop-60-daily.mp3' },
                            { name: 'Derailed Order · 白天', url: 'https://pub-c6d74e47e1734ec0af83f0e20518da2c.r2.dev/musics/derailed-order--day.mp3' },
                            { name: 'Derailed Order · 夜晚', url: 'https://pub-c6d74e47e1734ec0af83f0e20518da2c.r2.dev/musics/derailed-order--night.mp3' },
                            { name: 'Loading… 99%', url: 'https://pub-c6d74e47e1734ec0af83f0e20518da2c.r2.dev/musics/loading-99-percent.mp3' }
                        ]
                    }
                }
            ]
        },
        {
            schemaVersion: '1.0',
            id: 'p5r-phantom',
            builtin: true,
            name: '女神异闻录5皇家版 · 怪盗团',
            author: '陈意非',
            version: '7.9.0',
            category: '游戏重装',
            baseMode: 'dark',
            cover: 'linear-gradient(125deg, #050506 0%, #050506 38%, #e20d19 39%, #b80612 76%, #f3f1ea 77%)',
            accent: '#e20d19',
            description: '源自《女神异闻录5皇家版》全局改装：高反差怪盗红黑斜切漫画舞台、硬边双层投影对话框、预告信斜切导航栏与卢布朗咖啡馆爵士唱片电台。',
            tags: ['红黑斜切漫影', '预告信输入框', '常驻怪盗侧栏', '卢布朗电台'],
            capabilities: { dockSidebar: true },
            css: `
html[data-rphub-theme-pack="p5r-phantom"] {
    --p5r-red: #e20d19;
    --p5r-dark: #050506;
    --p5r-paper: #f3f1ea;
    --p5r-cyan: #22d9ef;
    --primary-400: 244 42 54;
    --primary-500: 226 13 25;
    --primary-600: 196 8 18;
    --primary-text-500: 255 77 88;
    --primary-text-600: 255 92 102;
}
html[data-rphub-theme-pack="p5r-phantom"] body,
html[data-rphub-theme-pack="p5r-phantom"] #app,
html[data-rphub-theme-pack="p5r-phantom"] .app-main {
    background:
        linear-gradient(112deg, rgba(5,5,6,.96) 0 15%, rgba(226,13,25,.2) 15.3% 28%, rgba(5,5,6,.9) 28.3% 100%),
        repeating-linear-gradient(-18deg, rgba(255,255,255,.03) 0 4px, transparent 4px 18px),
        #070708 !important;
    color: #f7f7f2 !important;
}
html[data-rphub-theme-pack="p5r-phantom"] .app-sidebar {
    background:
        linear-gradient(165deg, rgba(226,13,25,.18) 0 26%, rgba(5,5,6,.96) 26.4%),
        #060607 !important;
    border-right: 4px solid var(--p5r-red) !important;
    box-shadow: 10px 0 0 rgba(0,0,0,.65) !important;
}
html[data-rphub-theme-pack="p5r-phantom"] .app-sidebar-head {
    background: #050506 !important;
    border-bottom: 2px solid #fff !important;
}
html[data-rphub-theme-pack="p5r-phantom"] .app-sidebar .app-logo {
    padding: 5px 12px !important;
    background: var(--p5r-red) !important;
    color: #fff !important;
    border: 2px solid #fff;
    box-shadow: 4px 4px 0 #000;
    transform: skew(-9deg);
}
html[data-rphub-theme-pack="p5r-phantom"] .sidebar-nav-button {
    background: linear-gradient(110deg, rgba(5,5,6,.94), rgba(35,0,4,.94)) !important;
    color: #fff !important;
    border: 2px solid #fff !important;
    border-radius: 0 !important;
    box-shadow: 4px 4px 0 var(--p5r-red), 7px 7px 0 #000 !important;
    transform: skew(-7deg);
    font-weight: 900 !important;
}
html[data-rphub-theme-pack="p5r-phantom"] .sidebar-nav-button:hover,
html[data-rphub-theme-pack="p5r-phantom"] .sidebar-nav-button.is-active {
    background: var(--p5r-red) !important;
    color: #fff !important;
    box-shadow: 5px 5px 0 #000, 8px 8px 0 #fff !important;
    transform: skew(-7deg) translateX(4px);
}
html[data-rphub-theme-pack="p5r-phantom"] .app-main .msg-bubble-glass {
    background: rgba(11,11,13,.95) !important;
    color: #f7f7f2 !important;
    border: 2px solid #f3f1ea !important;
    border-radius: 0 !important;
    box-shadow: 6px 6px 0 var(--p5r-red), 10px 10px 0 #000 !important;
}
html[data-rphub-theme-pack="p5r-phantom"] .app-main [data-role="user"] .msg-bubble-glass {
    background: linear-gradient(135deg, #1b0508, #0c0c0f) !important;
    border-color: var(--p5r-red) !important;
    box-shadow: 6px 6px 0 #f3f1ea, 10px 10px 0 #000 !important;
}
html[data-rphub-theme-pack="p5r-phantom"] .app-main .msg-name-tag {
    background: var(--p5r-red) !important;
    color: #fff !important;
    border: 2px solid #fff !important;
    border-radius: 0 !important;
    padding: 2px 10px !important;
    transform: skew(-10deg);
    box-shadow: 3px 3px 0 #000 !important;
    font-weight: 900 !important;
}
html[data-rphub-theme-pack="p5r-phantom"] .input-area-mobile .input-island {
    position: relative !important;
    padding-top: 24px !important;
    background: #09090b !important;
    border: 2.5px solid #fff !important;
    border-radius: 0 !important;
    box-shadow: 7px 7px 0 var(--p5r-red), 12px 12px 0 #000 !important;
    overflow: visible !important;
}
html[data-rphub-theme-pack="p5r-phantom"] .input-area-mobile .input-island::before {
    content: "TAKE YOUR HEART // PHANTOM MESSAGE";
    position: absolute;
    left: 12px;
    top: -12px;
    padding: 3px 11px;
    background: var(--p5r-red);
    color: #fff;
    border: 2px solid #fff;
    box-shadow: 3px 3px 0 #000;
    transform: skew(-10deg);
    font: 900 10px/1 Impact,"Microsoft YaHei",sans-serif;
    letter-spacing: .08em;
    pointer-events: none;
}
html[data-rphub-theme-pack="p5r-phantom"] .input-island .island-send:not(.island-send--stop) {
    background: var(--p5r-red) !important;
    color: #fff !important;
    border: 2px solid #fff !important;
    border-radius: 0 !important;
    transform: skew(-8deg);
    box-shadow: 3px 3px 0 #000 !important;
}
`,
            addons: [
                {
                    id: 'p5r-badge',
                    type: 'html-widget',
                    slot: 'sidebar-bottom',
                    title: '怪盗团予告状铭牌',
                    html: `<div class="tp-p5r-sig"><small>PHANTOM THIEVES OF HEARTS</small><strong>TAKE YOUR <em>HEART</em></strong><span>TOKYO // METAVERSE NAVIGATOR</span></div>`
                },
                {
                    id: 'p5r-player',
                    type: 'audio-player',
                    slot: 'sidebar-bottom',
                    config: {
                        kicker: 'CAFE LEBLANC / JUKEBOX',
                        discLabel: 'P5R',
                        accent: '#e20d19',
                        tracks: [
                            { name: '卢布朗咖啡馆 · 涩谷日常', url: 'https://videotourl.com/audio/1782983782981-0c7ff2dd-de24-4673-bc4e-4fec2bcc1374.mp3' },
                            { name: 'Life Will Change · 予告状', url: 'https://videotourl.com/audio/1782984106336-ab0d486a-53bf-4610-be1e-c1e46a47b211.mp3' },
                            { name: '怪盗团先制突袭 · Take Over', url: 'https://videotourl.com/audio/1782984054768-b318c5fa-8b77-4ac3-9b04-3e76d50eb457.mp3' },
                            { name: '心象迷宫交锋 · Last Surprise', url: 'https://videotourl.com/audio/1782984077857-4953f8b1-dfe1-4776-a26a-d9c1d83cd65b.mp3' },
                            { name: '印象空间深层 · Mementos', url: 'https://videotourl.com/audio/1782984261248-6a3741a3-1d29-4d4a-ab58-5ecb2c2fc2d7.mp3' },
                            { name: '东京暮雨 · 夜色抒情', url: 'https://videotourl.com/audio/1782984350425-e49bdfe8-2108-4ba9-9d01-6874b89af38c.mp3' }
                        ]
                    }
                }
            ]
        },
        {
            schemaVersion: '1.0',
            id: 'sanguo-wuxian',
            builtin: true,
            name: '三国：无限 · 汉末军机卷',
            author: '陈意非',
            version: '1.2.1',
            category: '东方国风',
            baseMode: 'light',
            cover: 'linear-gradient(135deg, #221d18 0%, #72261f 46%, #c8b892 82%, #f2ecdd 100%)',
            accent: '#a23b2d',
            description: '源自《三国：无限》原卡视觉：温润古宣纸与松烟墨底色、朱砂官印人物名牌、竹简书卷边框气泡、军机御批书案输入框与古琴曲集音匣（含醉渔唱晚、阳关三叠）。',
            tags: ['古宣朱砂', '御批书案输入', '军机竹简侧栏', '古琴音匣'],
            capabilities: { dockSidebar: true },
            css: `
html[data-rphub-theme-pack="sanguo-wuxian"] {
    --sg-ink: #1d211e;
    --sg-paper: #f2ecdd;
    --sg-paper-light: #faf6ec;
    --sg-paper-deep: #e4d8bf;
    --sg-line: #c8b892;
    --sg-cinnabar: #a23b2d;
    --sg-jade: #315f55;
    --sg-brass: #b38b44;
    --primary-50: 249 239 235;
    --primary-100: 242 222 214;
    --primary-200: 226 188 176;
    --primary-400: 184 82 66;
    --primary-500: 162 59 45;
    --primary-600: 138 46 34;
    --surface: 250 246 236;
}
html[data-rphub-theme-pack="sanguo-wuxian"] body,
html[data-rphub-theme-pack="sanguo-wuxian"] #app,
html[data-rphub-theme-pack="sanguo-wuxian"] .app-main {
    background:
        radial-gradient(ellipse at 18% 0%, rgba(162,59,45,.08), transparent 55%),
        radial-gradient(ellipse at 88% 100%, rgba(49,95,85,.08), transparent 55%),
        var(--sg-paper) !important;
    color: var(--sg-ink) !important;
    font-family: "Noto Serif SC","Source Han Serif SC","Songti SC",STSong,serif !important;
}
html[data-rphub-theme-pack="sanguo-wuxian"] .app-sidebar {
    background: linear-gradient(180deg, #1f1d1a 0%, #171614 100%) !important;
    color: #efe7d4 !important;
    border-right: 3px solid var(--sg-brass) !important;
    box-shadow: 8px 0 24px rgba(24,20,14,.25) !important;
}
html[data-rphub-theme-pack="sanguo-wuxian"] .app-sidebar-head {
    border-bottom: 1px solid rgba(200,184,146,.28) !important;
}
html[data-rphub-theme-pack="sanguo-wuxian"] .app-sidebar .app-logo {
    padding: 4px 12px !important;
    background: var(--sg-cinnabar) !important;
    color: #fbf6eb !important;
    border: 1px solid #d7b77b;
    border-radius: 3px;
}
html[data-rphub-theme-pack="sanguo-wuxian"] .sidebar-nav-button {
    color: #dfd4bc !important;
    background: rgba(255,248,232,.04) !important;
    border: 1px solid rgba(200,184,146,.2) !important;
    border-radius: 4px !important;
}
html[data-rphub-theme-pack="sanguo-wuxian"] .sidebar-nav-button:hover,
html[data-rphub-theme-pack="sanguo-wuxian"] .sidebar-nav-button.is-active {
    background: linear-gradient(90deg, var(--sg-cinnabar), #7c291f) !important;
    color: #fffdf7 !important;
    border-color: #dfb97a !important;
}
html[data-rphub-theme-pack="sanguo-wuxian"] .app-main .msg-bubble-glass {
    background: rgba(252, 248, 239, 0.94) !important;
    color: var(--sg-ink) !important;
    border: 1px solid var(--sg-line) !important;
    border-top: 3px solid var(--sg-cinnabar) !important;
    border-radius: 6px !important;
    box-shadow: 0 8px 24px -12px rgba(45, 34, 20, 0.22) !important;
}
html[data-rphub-theme-pack="sanguo-wuxian"] .app-main [data-role="user"] .msg-bubble-glass {
    background: rgba(239, 244, 239, 0.95) !important;
    border-top-color: var(--sg-jade) !important;
}
html[data-rphub-theme-pack="sanguo-wuxian"] .app-main .msg-name-tag {
    background: var(--sg-cinnabar) !important;
    color: #fffaf0 !important;
    border: 1px solid #72261f !important;
    border-radius: 3px !important;
    padding: 2px 9px !important;
    letter-spacing: .08em;
}
html[data-rphub-theme-pack="sanguo-wuxian"] .input-area-mobile .input-island {
    position: relative !important;
    padding-top: 24px !important;
    background: #faf5e8 !important;
    border: 1.5px solid #bfa980 !important;
    border-top: 3px solid var(--sg-cinnabar) !important;
    border-radius: 6px !important;
    box-shadow: 0 12px 32px -12px rgba(42,31,18,.28) !important;
}
html[data-rphub-theme-pack="sanguo-wuxian"] .input-area-mobile .input-island::before {
    content: "汉末军机处 · 奏折批阅案";
    position: absolute;
    left: 12px;
    top: 4px;
    color: var(--sg-cinnabar);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    pointer-events: none;
}
html[data-rphub-theme-pack="sanguo-wuxian"] .input-island .island-send:not(.island-send--stop) {
    background: var(--sg-cinnabar) !important;
    color: #fffaf0 !important;
    border: 1px solid #d7b77b !important;
    border-radius: 4px !important;
}
`,
            addons: [
                {
                    id: 'sg-seal',
                    type: 'html-widget',
                    slot: 'sidebar-bottom',
                    title: '汉末军机印信',
                    html: `<div class="tp-sg-sig"><small>THREE KINGDOMS // CHRONICLE</small><strong>山河入局 · 天下弈</strong><span>乱世风云 · 执子定乾坤</span></div>`
                },
                {
                    id: 'sg-player',
                    type: 'audio-player',
                    slot: 'sidebar-bottom',
                    config: {
                        kicker: '古琴雅集 / GUQIN ARCHIVE',
                        discLabel: '琴韵',
                        accent: '#b38b44',
                        tracks: [
                            { name: '古琴 · 醉渔唱晚', url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/5/52/Guqin-Zuiyu_Changwan.ogg/Guqin-Zuiyu_Changwan.ogg.mp3' },
                            { name: '古琴 · 阳关三叠', url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/6/60/Guqin-Yangguan_Sandie.ogg/Guqin-Yangguan_Sandie.ogg.mp3' },
                            { name: '东方古曲 · 沈阳', url: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Shenyang_(ISRC_USUAN1600066).mp3' }
                        ]
                    }
                }
            ]
        },
        {
            schemaVersion: '1.0',
            id: 'bug0-matrix',
            builtin: true,
            name: '恶意代码 · BUG_0 母体终端',
            author: '陈意非',
            version: '1.0.0',
            category: '赛博科幻',
            baseMode: 'dark',
            cover: 'linear-gradient(135deg, #1b0912 0%, #92263d 52%, #ff5466 78%, #66eadb 100%)',
            accent: '#ff5466',
            description: '源自《恶意代码：BUG_0》原卡视觉：朱红工业故障终端配色、青红光谱错位阴影、渡鸦耳麦青色通讯玩家框、母体指令输入框与系统偏离度悬浮监控挂件。',
            tags: ['朱红工业终端', '青红故障光效', '渡鸦通讯框', '悬浮偏离监控'],
            capabilities: { dockSidebar: false },
            css: `
html[data-rphub-theme-pack="bug0-matrix"] {
    --bug-crimson: #92263d;
    --bug-neon: #ff5466;
    --bug-yellow: #f7eb39;
    --bug-cyan: #66eadb;
    --primary-400: 255 84 102;
    --primary-500: 255 84 102;
    --primary-600: 218 52 74;
    --primary-text-500: 102 234 219;
    --primary-text-600: 102 234 219;
}
html[data-rphub-theme-pack="bug0-matrix"] body,
html[data-rphub-theme-pack="bug0-matrix"] #app,
html[data-rphub-theme-pack="bug0-matrix"] .app-main {
    background:
        radial-gradient(circle at 82% 14%, rgba(255,84,102,.18), transparent 34%),
        radial-gradient(circle at 14% 88%, rgba(102,234,219,.11), transparent 32%),
        repeating-linear-gradient(0deg, rgba(255,255,255,.02) 0 1px, transparent 1px 4px),
        #160911 !important;
    color: #fff9f8 !important;
}
html[data-rphub-theme-pack="bug0-matrix"] .app-main .msg-bubble-glass {
    position: relative;
    background: linear-gradient(145deg, rgba(146,38,61,.92), rgba(74,20,36,.95)) !important;
    color: #fff9f8 !important;
    border: 1px solid rgba(255,158,174,.35) !important;
    border-top: 4px solid var(--bug-neon) !important;
    border-radius: 0 14px 0 14px !important;
    box-shadow: 0 10px 28px rgba(18,4,10,.55) !important;
}
html[data-rphub-theme-pack="bug0-matrix"] .app-main [data-role="user"] .msg-bubble-glass {
    background: linear-gradient(145deg, rgba(52,23,37,.95), rgba(26,18,32,.95)) !important;
    border-top: 1px solid rgba(102,234,219,.35) !important;
    border-left: 4px solid var(--bug-cyan) !important;
    border-radius: 0 10px 0 10px !important;
}
html[data-rphub-theme-pack="bug0-matrix"] .app-main .msg-name-tag {
    background: var(--bug-yellow) !important;
    color: #421021 !important;
    border: 0 !important;
    border-radius: 0 !important;
    padding: 3px 10px !important;
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%);
    font-weight: 900 !important;
    letter-spacing: .06em;
}
html[data-rphub-theme-pack="bug0-matrix"] .input-area-mobile .input-island {
    position: relative !important;
    padding-top: 25px !important;
    background: rgba(34, 13, 24, 0.96) !important;
    border: 1px solid rgba(255,84,102,.45) !important;
    border-left: 4px solid var(--bug-cyan) !important;
    border-radius: 0 14px 0 14px !important;
    box-shadow: 0 14px 36px rgba(0,0,0,.6) !important;
}
html[data-rphub-theme-pack="bug0-matrix"] .input-area-mobile .input-island::before {
    content: "RAVEN_LINK // MALICIOUS_CODE:BUG_0";
    position: absolute;
    left: 12px;
    top: 6px;
    color: var(--bug-cyan);
    font: 800 9px/1 Consolas,ui-monospace,monospace;
    letter-spacing: .12em;
    text-shadow: -0.6px 0 #ff6a8d, 0.6px 0 #66eadb;
    pointer-events: none;
}
html[data-rphub-theme-pack="bug0-matrix"] .input-island .island-send:not(.island-send--stop) {
    background: var(--bug-yellow) !important;
    color: #421021 !important;
    border-radius: 0 8px 0 8px !important;
    font-weight: 900;
}
`,
            addons: [
                {
                    id: 'bug0-hud',
                    type: 'html-widget',
                    slot: 'floating-br',
                    title: 'BUG_0 母体监控挂件',
                    html: `<div class="tp-bug0-hud"><div class="tp-bug0-tag">SYSTEM DEVIATION</div><div class="tp-bug0-code">ERR::0xBUG_0 // AWAKE</div><div class="tp-bug0-sub">RAVEN CHANNEL CONNECTED</div></div>`
                }
            ]
        }
    ];

    // =========================================================================
    // Store State & Lifecycle
    // =========================================================================

    const defaultApiEndpoint = (() => {
        const saved = localStorage.getItem(API_URL_KEY);
        if (saved !== null) return saved;
        if (location.protocol.startsWith('http')) return location.origin;
        return 'http://127.0.0.1:8765';
    })();

    const state = reactive({
        activeId: localStorage.getItem(ACTIVE_THEME_KEY) || 'native',
        sidebarCollapsed: false,
        installedThemes: readJson(CUSTOM_THEMES_KEY, []),
        communityThemes: [],
        communityLoading: false,
        communityError: '',
        likedIds: readJson(LIKED_IDS_KEY, []),
        apiEndpoint: defaultApiEndpoint
    });

    const allLocalThemes = computed(() => {
        const customList = Array.isArray(state.installedThemes) ? state.installedThemes : [];
        return [...BUILTIN_THEMES, ...customList];
    });

    const getThemeById = id => {
        if (!id || id === 'native') return BUILTIN_THEMES[0];
        return allLocalThemes.value.find(t => t.id === id)
            || state.communityThemes.find(t => t.id === id)
            || BUILTIN_THEMES[0];
    };

    const activeTheme = computed(() => getThemeById(state.activeId));

    // Track native day/night preference separately so theme packs never clobber native appearance
    const getNativeModeBackup = () => {
        try {
            const v = localStorage.getItem(NATIVE_MODE_BACKUP_KEY);
            return (v === 'dark' || v === 'light') ? v : 'light';
        } catch (_) {
            return 'light';
        }
    };

    const setNativeModeBackup = mode => {
        if (mode !== 'dark' && mode !== 'light') return;
        try { localStorage.setItem(NATIVE_MODE_BACKUP_KEY, mode); } catch (_) {}
    };

    let internalThemeSwitchInFlight = false;

    // Listen to manual day/night switches (moon/sun button) ONLY when user clicks it in native mode
    window.addEventListener('rphub-theme-change', event => {
        if (!internalThemeSwitchInFlight && state.activeId === 'native' && (event.detail === 'dark' || event.detail === 'light')) {
            setNativeModeBackup(event.detail);
        }
    });

    // Keep active theme <style> after Tailwind Play CDN's dynamic <style> tag
    let headStyleObserver = null;
    const stopHeadObserver = () => {
        if (headStyleObserver) {
            headStyleObserver.disconnect();
            headStyleObserver = null;
        }
    };
    const ensureThemeStyleLast = () => {
        const el = document.getElementById(STYLE_TAG_ID);
        if (el && document.head && document.head.lastElementChild !== el) {
            document.head.appendChild(el);
        }
    };
    const startHeadObserver = () => {
        stopHeadObserver();
        if (!document.head || typeof MutationObserver === 'undefined') return;
        headStyleObserver = new MutationObserver(() => ensureThemeStyleLast());
        headStyleObserver.observe(document.head, { childList: true });
    };

    const purgeAllInjectedThemeArtifacts = () => {
        stopHeadObserver();
        const root = document.documentElement;
        delete root.dataset.rphubThemePack;
        delete root.dataset.appSkin;
        delete root.dataset.zzzHubTheme;

        // Remove all theme store style tags completely (never mutate in-place so browser drops all rules cleanly)
        document.querySelectorAll(`#${STYLE_TAG_ID}, style[data-rphub-theme-style]`).forEach(el => el.remove());

        // Also neutralize any legacy card-injected global parent styles if present in chat DOM
        try {
            if (window.__ZZZ_RPHUB_PARENT_THEME__ && typeof window.__ZZZ_RPHUB_PARENT_THEME__.destroy === 'function') {
                window.__ZZZ_RPHUB_PARENT_THEME__.destroy(true);
            }
            ['zzzHubParentThemeStyle', 'zzzHubSidebarPlayer', 'zzzHubSidebarSignature', 'zzzHubSidebarMedia'].forEach(legacyId => {
                const node = document.getElementById(legacyId);
                if (node) node.remove();
            });
            document.querySelectorAll('#p5r-global-page-theme').forEach(styleNode => {
                styleNode.disabled = true;
                styleNode.media = 'not all';
            });
        } catch (_) {}
    };

    const setTemporaryAppearance = mode => {
        const valid = mode === 'dark' ? 'dark' : 'light';
        internalThemeSwitchInFlight = true;
        try {
            document.documentElement.dataset.appTheme = valid;
            document.querySelectorAll('iframe').forEach(frame => {
                try {
                    if (!frame.src) return;
                    const url = new URL(frame.src, location.href);
                    if (url.origin === location.origin && /\/(character|novel)\/index\.html$/.test(url.pathname)) {
                        frame.contentWindow?.postMessage({ type: 'RPHUB_THEME', theme: valid }, location.origin === 'null' ? '*' : location.origin);
                    }
                } catch (_) {}
            });
            window.dispatchEvent(new CustomEvent('rphub-theme-change', { detail: valid }));
        } finally {
            internalThemeSwitchInFlight = false;
        }
    };

    const applyThemeToDom = theme => {
        const root = document.documentElement;

        // Step 1: Always completely tear down previous theme styles & attributes first
        purgeAllInjectedThemeArtifacts();

        // Step 2: If returning to Native Default, restore user's genuine native day/night mode
        if (!theme || theme.id === 'native') {
            const restoredMode = getNativeModeBackup();
            internalThemeSwitchInFlight = true;
            try {
                if (window.RPHubTheme?.set) {
                    window.RPHubTheme.set(restoredMode);
                } else {
                    setTemporaryAppearance(restoredMode);
                }
            } finally {
                internalThemeSwitchInFlight = false;
            }
            window.dispatchEvent(new CustomEvent('rphub-theme-pack-change', { detail: BUILTIN_THEMES[0] }));
            return;
        }

        // Step 3: Apply target theme's base mode WITHOUT overwriting native mode backup in localStorage
        setTemporaryAppearance(theme.baseMode === 'light' ? 'light' : 'dark');

        // Step 4: Set fresh data attribute and mount a brand-new <style> element at the end of <head>
        root.dataset.rphubThemePack = theme.id;

        const cssText = sanitizeCss(theme.css || '');
        if (cssText.trim()) {
            const styleEl = document.createElement('style');
            styleEl.id = STYLE_TAG_ID;
            styleEl.setAttribute('data-rphub-theme-style', theme.id);
            styleEl.textContent = cssText;
            (document.head || root).appendChild(styleEl);
            startHeadObserver();
        }

        window.dispatchEvent(new CustomEvent('rphub-theme-pack-change', { detail: theme }));
    };

    const activateTheme = id => {
        // Save current native mode right before leaving native mode
        if (state.activeId === 'native' && id && id !== 'native') {
            const cur = document.documentElement.dataset.appTheme || window.RPHubTheme?.current || 'light';
            setNativeModeBackup(cur === 'dark' ? 'dark' : 'light');
        }
        const target = getThemeById(id);
        state.activeId = target.id;
        try { localStorage.setItem(ACTIVE_THEME_KEY, target.id); } catch (_) {}
        applyThemeToDom(target);
        return target;
    };

    const normalizeThemePack = raw => {
        if (!raw || typeof raw !== 'object') throw new Error('无效的主题包格式');
        const name = String(raw.name || '').trim();
        if (!name) throw new Error('主题名称不能为空');
        const id = String(raw.id || ('custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)))
            .replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
        if (id === 'native') throw new Error('不能覆盖原生默认主题 ID');

        const addons = Array.isArray(raw.addons) ? raw.addons.slice(0, 8).map((item, idx) => ({
            id: String(item.id || `${id}-addon-${idx}`),
            type: ['audio-player', 'media-carousel', 'html-widget', 'iframe-widget'].includes(item.type) ? item.type : 'html-widget',
            slot: ['sidebar-top', 'sidebar-bottom', 'floating-bl', 'floating-br', 'floating-tr'].includes(item.slot) ? item.slot : 'floating-br',
            title: String(item.title || '主题组件').slice(0, 40),
            html: item.html ? sanitizeHtml(item.html) : '',
            srcdoc: item.srcdoc ? String(item.srcdoc) : '',
            config: item.config && typeof item.config === 'object' ? JSON.parse(JSON.stringify(item.config)) : {}
        })) : [];

        return {
            schemaVersion: '1.0',
            id,
            builtin: false,
            name: name.slice(0, 48),
            author: String(raw.author || '匿名创作者').trim().slice(0, 32),
            version: String(raw.version || '1.0.0').trim().slice(0, 16),
            category: String(raw.category || '玩家共创').trim().slice(0, 20),
            baseMode: raw.baseMode === 'light' ? 'light' : 'dark',
            cover: String(raw.cover || 'linear-gradient(135deg, #1e293b 0%, #6366f1 100%)').slice(0, 400),
            accent: String(raw.accent || '#6366f1').slice(0, 32),
            description: String(raw.description || '玩家自定义主题包').trim().slice(0, 240),
            tags: Array.isArray(raw.tags) ? raw.tags.map(t => String(t).trim()).filter(Boolean).slice(0, 6) : ['自定义主题'],
            capabilities: {
                dockSidebar: Boolean(raw.capabilities?.dockSidebar)
            },
            css: sanitizeCss(raw.css || ''),
            addons,
            likes: Number(raw.likes) || 0,
            installs: Number(raw.installs) || 0,
            createdAt: raw.createdAt || new Date().toISOString()
        };
    };

    const saveLocalTheme = rawPack => {
        const pack = normalizeThemePack(rawPack);
        // Avoid colliding with builtin IDs
        if (BUILTIN_THEMES.some(b => b.id === pack.id)) {
            pack.id = `${pack.id}-fork-${Date.now().toString(36).slice(-4)}`;
        }
        const idx = state.installedThemes.findIndex(t => t.id === pack.id);
        if (idx >= 0) {
            state.installedThemes.splice(idx, 1, pack);
        } else {
            state.installedThemes.unshift(pack);
        }
        writeJson(CUSTOM_THEMES_KEY, state.installedThemes);
        if (state.activeId === pack.id) applyThemeToDom(pack);
        return pack;
    };

    const deleteLocalTheme = id => {
        const idx = state.installedThemes.findIndex(t => t.id === id);
        if (idx < 0) return false;
        state.installedThemes.splice(idx, 1);
        writeJson(CUSTOM_THEMES_KEY, state.installedThemes);
        if (state.activeId === id) activateTheme('native');
        return true;
    };

    const exportThemePack = pack => {
        const clean = { ...pack };
        delete clean.builtin;
        const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(pack.name || pack.id).replace(/[\\/:*?"<>|]/g, '_')}.rphub-theme.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    };

    const setApiEndpoint = url => {
        const cleaned = String(url || '').trim().replace(/\/+$/, '');
        state.apiEndpoint = cleaned;
        try { localStorage.setItem(API_URL_KEY, cleaned); } catch (_) {}
    };

    const buildEndpointUrl = path => {
        const base = (state.apiEndpoint || '').replace(/\/+$/, '');
        return base ? `${base}${path}` : path;
    };

    const fetchCommunityThemes = async () => {
        state.communityLoading = true;
        state.communityError = '';
        try {
            const resp = await fetch(buildEndpointUrl('/v1/themes'), { cache: 'no-store' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const items = Array.isArray(data?.items) ? data.items : [];
            state.communityThemes = items.map(item => {
                try { return normalizeThemePack(item); } catch (_) { return null; }
            }).filter(Boolean);
            return state.communityThemes;
        } catch (err) {
            state.communityError = err.message || '无法连接主题商城服务器';
            return [];
        } finally {
            state.communityLoading = false;
        }
    };

    const publishThemeToHub = async rawPack => {
        const pack = normalizeThemePack(rawPack);
        const resp = await fetch(buildEndpointUrl('/v1/themes'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pack)
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            throw new Error(data?.error || `上传失败 (HTTP ${resp.status})`);
        }
        const saved = data?.item ? normalizeThemePack(data.item) : pack;
        const existingIdx = state.communityThemes.findIndex(t => t.id === saved.id);
        if (existingIdx >= 0) state.communityThemes.splice(existingIdx, 1, saved);
        else state.communityThemes.unshift(saved);
        return saved;
    };

    const installFromCommunity = async communityPack => {
        const installed = saveLocalTheme(communityPack);
        activateTheme(installed.id);
        try {
            const resp = await fetch(buildEndpointUrl(`/v1/themes/${encodeURIComponent(communityPack.id)}/install`), { method: 'POST' });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok && typeof data.installs === 'number') {
                communityPack.installs = data.installs;
            }
        } catch (_) {}
        return installed;
    };

    const toggleLikeCommunityTheme = async communityPack => {
        if (state.likedIds.includes(communityPack.id)) return communityPack.likes;
        try {
            const resp = await fetch(buildEndpointUrl(`/v1/themes/${encodeURIComponent(communityPack.id)}/like`), { method: 'POST' });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok && typeof data.likes === 'number') {
                communityPack.likes = data.likes;
                state.likedIds.push(communityPack.id);
                writeJson(LIKED_IDS_KEY, state.likedIds);
            }
        } catch (_) {}
        return communityPack.likes;
    };

    // Initial boot: only apply if user previously chose a non-native theme
    if (state.activeId && state.activeId !== 'native') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => applyThemeToDom(activeTheme.value), { once: true });
        } else {
            applyThemeToDom(activeTheme.value);
        }
    }

    window.RPHubThemeStore = Object.freeze({
        BUILTIN_THEMES,
        PLAYER_USER_TRACKS_PREFIX,
        state,
        allLocalThemes,
        activeTheme,
        sanitizeHtml,
        activateTheme,
        normalizeThemePack,
        saveLocalTheme,
        deleteLocalTheme,
        exportThemePack,
        setApiEndpoint,
        fetchCommunityThemes,
        publishThemeToHub,
        installFromCommunity,
        toggleLikeCommunityTheme
    });
})();
