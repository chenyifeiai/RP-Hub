// RP-Hub Theme Store UI Components, Addon Widgets & Creator Workshop
(function () {
    const { ref, reactive, computed, watch, onMounted, onBeforeUnmount } = Vue;

    const formatSec = sec => {
        const v = Number.isFinite(sec) ? Math.max(0, Math.floor(sec)) : 0;
        return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
    };

    // 1. Theme-Carried Audio Player Addon
    const ThemeAudioPlayerAddon = {
        name: 'ThemeAudioPlayerAddon',
        props: {
            themeId: { type: String, required: true },
            addon: { type: Object, required: true },
            compact: { type: Boolean, default: false }
        },
        setup(props) {
            const storeKey = window.RPHubThemeStore.PLAYER_USER_TRACKS_PREFIX + props.themeId;
            const loadUserTracks = () => {
                try { return JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch (_) { return []; }
            };
            const userTracks = ref(Array.isArray(loadUserTracks()) ? loadUserTracks() : []);
            const tracks = computed(() => {
                const base = Array.isArray(props.addon.config?.tracks) ? props.addon.config.tracks : [];
                return [...base, ...userTracks.value].filter(t => t && t.url);
            });

            const index = ref(0);
            const playing = ref(false);
            const currentTime = ref(0);
            const duration = ref(0);
            const volume = ref(0.7);
            const showList = ref(false);
            const showAdd = ref(false);
            const isMini = ref(window.innerWidth <= 768 && props.addon.slot?.startsWith('floating'));
            const newName = ref('');
            const newUrl = ref('');

            const audio = new Audio();
            audio.preload = 'metadata';
            audio.volume = volume.value;

            const currentTrack = computed(() => tracks.value[index.value] || null);
            const accentStyle = computed(() => ({
                '--tp-accent': props.addon.config?.accent || '#ffe100'
            }));

            const syncTime = () => { currentTime.value = audio.currentTime || 0; };
            const syncMeta = () => { duration.value = audio.duration || 0; };
            const syncPlay = () => { playing.value = !audio.paused && !audio.ended; };
            const onEnded = () => playAt(index.value + 1, true);

            audio.addEventListener('timeupdate', syncTime);
            audio.addEventListener('loadedmetadata', syncMeta);
            audio.addEventListener('play', syncPlay);
            audio.addEventListener('pause', syncPlay);
            audio.addEventListener('ended', onEnded);

            const playAt = (nextIdx, autoPlay = true) => {
                if (!tracks.value.length) {
                    showAdd.value = true;
                    return;
                }
                index.value = (nextIdx + tracks.value.length) % tracks.value.length;
                audio.src = tracks.value[index.value].url;
                audio.load();
                if (autoPlay) {
                    audio.play().catch(() => { playing.value = false; });
                }
            };

            const togglePlay = () => {
                if (!currentTrack.value) {
                    showAdd.value = true;
                    return;
                }
                if (!audio.src) {
                    playAt(index.value, true);
                    return;
                }
                if (audio.paused) audio.play().catch(() => {});
                else audio.pause();
            };

            const onScrub = e => {
                if (duration.value > 0) {
                    audio.currentTime = (Number(e.target.value) / 1000) * duration.value;
                }
            };

            const onVol = e => {
                volume.value = Math.max(0, Math.min(1, Number(e.target.value)));
                audio.volume = volume.value;
            };

            const addTrack = () => {
                const url = newUrl.value.trim();
                if (!/^https?:\/\//i.test(url)) return;
                const name = newName.value.trim() || decodeURIComponent(url.split('/').pop().split('?')[0] || '自定义曲目');
                userTracks.value.push({ name, url });
                try { localStorage.setItem(storeKey, JSON.stringify(userTracks.value)); } catch (_) {}
                newName.value = '';
                newUrl.value = '';
                showAdd.value = false;
                playAt(tracks.value.length - 1, true);
            };

            watch(() => props.compact, val => {
                if (val) {
                    showList.value = false;
                    showAdd.value = false;
                }
            });

            onBeforeUnmount(() => {
                audio.pause();
                audio.src = '';
                audio.removeEventListener('timeupdate', syncTime);
                audio.removeEventListener('loadedmetadata', syncMeta);
                audio.removeEventListener('play', syncPlay);
                audio.removeEventListener('pause', syncPlay);
                audio.removeEventListener('ended', onEnded);
            });

            const progressPermille = computed(() => (
                duration.value > 0 ? Math.round((currentTime.value / duration.value) * 1000) : 0
            ));

            return {
                tracks, index, playing, currentTime, duration, volume,
                showList, showAdd, isMini, newName, newUrl,
                currentTrack, accentStyle, progressPermille,
                formatSec, playAt, togglePlay, onScrub, onVol, addTrack
            };
        },
        template: `
            <div class="tp-player" :class="{ 'is-playing': playing, 'is-mini': compact || isMini }" :style="accentStyle">
                <div class="tp-player__top">
                    <button type="button" class="tp-player__disc"
                        :title="(compact || isMini) ? '点击展开或播放：' + (currentTrack?.name || '音乐播放器') : '播放 / 暂停'"
                        @click="(compact || isMini) ? (isMini ? (isMini = false) : togglePlay()) : togglePlay()">
                        {{ addon.config?.discLabel || 'BGM' }}
                    </button>
                    <template v-if="!compact && !isMini">
                        <div class="tp-player__meta">
                            <small>{{ addon.config?.kicker || 'THEME SOUNDTRACK' }}</small>
                            <b>{{ currentTrack ? currentTrack.name : '点击 + 添加音频链接' }}</b>
                        </div>
                        <div class="tp-player__head-btns">
                            <button type="button" class="tp-player__btn" @click="togglePlay" :title="playing ? '暂停' : '播放'">
                                {{ playing ? 'Ⅱ' : '▶' }}
                            </button>
                            <button v-if="addon.slot?.startsWith('floating')" type="button" class="tp-player__btn" @click="isMini = true" title="收起为迷你唱片">
                                －
                            </button>
                        </div>
                    </template>
                </div>
                <template v-if="!compact && !isMini">
                    <div class="tp-player__bar">
                        <span>{{ formatSec(currentTime) }}</span>
                        <input type="range" min="0" max="1000" :value="progressPermille" @input="onScrub" aria-label="播放进度">
                        <span>{{ formatSec(duration) }}</span>
                    </div>
                    <div class="tp-player__controls">
                        <button type="button" class="tp-player__btn" @click="playAt(index - 1, true)" title="上一首">◀</button>
                        <button type="button" class="tp-player__btn" @click="playAt(index + 1, true)" title="下一首">▶</button>
                        <button type="button" class="tp-player__btn" @click="showList = !showList; showAdd = false" title="歌单列表">☷</button>
                        <button type="button" class="tp-player__btn" @click="showAdd = !showAdd; showList = false" title="添加网络音频">＋</button>
                        <input type="range" class="tp-player__vol" min="0" max="1" step="0.02" :value="volume" @input="onVol" aria-label="音量">
                    </div>
                    <div v-if="showList && tracks.length" class="tp-player__list custom-scrollbar">
                        <button v-for="(t, tIdx) in tracks" :key="tIdx + t.url" type="button"
                            class="tp-player__track" :class="{ 'is-current': tIdx === index }"
                            @click="playAt(tIdx, true); showList = false">
                            <span>{{ String(tIdx + 1).padStart(2, '0') }}</span>
                            <span class="truncate">{{ t.name }}</span>
                        </button>
                    </div>
                    <div v-if="showAdd" class="tp-player__add">
                        <input v-model="newName" type="text" placeholder="曲目名称（选填）">
                        <input v-model="newUrl" type="url" placeholder="填入 https://... 音频直链">
                        <div class="grid grid-cols-2 gap-1.5">
                            <button type="button" class="tp-player__btn py-1" @click="addTrack">保存并播放</button>
                            <button type="button" class="tp-player__btn py-1" @click="showAdd = false">取消</button>
                        </div>
                    </div>
                </template>
            </div>`
    };

    // 2. Theme-Carried Media Carousel Addon
    const ThemeCarouselAddon = {
        name: 'ThemeCarouselAddon',
        props: { addon: { type: Object, required: true } },
        setup(props) {
            const idx = ref(0);
            const slides = computed(() => Array.isArray(props.addon.config?.slides) ? props.addon.config.slides.filter(s => s?.url) : []);
            const current = computed(() => slides.value[idx.value] || null);
            let timer = null;
            const next = () => {
                if (slides.value.length > 1) idx.value = (idx.value + 1) % slides.value.length;
            };
            onMounted(() => {
                timer = setInterval(next, 7500);
            });
            onBeforeUnmount(() => clearInterval(timer));
            return { idx, slides, current, next };
        },
        template: `
            <div v-if="current" class="tp-carousel tp-addon-hide-collapsed" @click="next" title="点击切换主题画报">
                <img :src="current.url" :alt="current.title || ''">
                <div class="tp-carousel__head">
                    <b>{{ addon.config?.badge || 'SIGNAL' }}</b>
                    <div class="tp-carousel__dots">
                        <i v-for="(_, sIdx) in slides" :key="sIdx" :class="{ 'is-on': sIdx === idx }"></i>
                    </div>
                </div>
                <div class="tp-carousel__foot">
                    <small>{{ current.kicker || ('0' + (idx + 1) + ' / GALLERY') }}</small>
                    <strong>{{ current.title || addon.title }}</strong>
                </div>
            </div>`
    };

    // 3. Generic Addon Item Dispatcher
    const ThemeAddonItem = {
        name: 'ThemeAddonItem',
        components: { ThemeAudioPlayerAddon, ThemeCarouselAddon },
        props: {
            themeId: { type: String, required: true },
            addon: { type: Object, required: true },
            compact: { type: Boolean, default: false },
            floating: { type: Boolean, default: false }
        },
        setup(props) {
            const collapsed = ref(props.floating && window.innerWidth <= 768 && props.addon.type !== 'audio-player');
            const safeHtml = computed(() => window.RPHubThemeStore.sanitizeHtml(props.addon.html || ''));
            return { collapsed, safeHtml };
        },
        template: `
            <div class="tp-widget-shell" :class="{ 'tp-addon-hide-collapsed': addon.type !== 'audio-player' }">
                <template v-if="addon.type === 'audio-player'">
                    <theme-audio-player-addon :theme-id="themeId" :addon="addon" :compact="compact"></theme-audio-player-addon>
                </template>
                <template v-else-if="collapsed && floating">
                    <button type="button" class="tp-widget-pill" @click="collapsed = false">
                        <span>✦</span>
                        <span>{{ addon.title || '展开挂件' }}</span>
                    </button>
                </template>
                <template v-else>
                    <button v-if="floating" type="button" class="tp-widget-collapse" @click="collapsed = true" title="收起挂件">×</button>
                    <theme-carousel-addon v-if="addon.type === 'media-carousel'" :addon="addon"></theme-carousel-addon>
                    <iframe v-else-if="addon.type === 'iframe-widget' && addon.srcdoc"
                        sandbox="allow-scripts"
                        :srcdoc="addon.srcdoc"
                        :title="addon.title || '主题悬浮窗'"
                        class="w-full rounded-xl border border-gray-200/30 bg-transparent"
                        :style="{ height: (addon.config?.height || 140) + 'px' }"></iframe>
                    <div v-else-if="safeHtml" v-html="safeHtml"></div>
                </template>
            </div>`
    };

    // 4. Optional Theme-Carried Docked Left Sidebar
    const ThemeDockSidebar = {
        name: 'ThemeDockSidebar',
        components: { ThemeAddonItem },
        props: {
            currentView: { type: String, required: true }
        },
        emits: ['update:current-view'],
        setup() {
            const store = window.RPHubThemeStore;
            const theme = store.activeTheme;
            const enabled = computed(() => theme.value && theme.value.id !== 'native' && Boolean(theme.value.capabilities?.dockSidebar));
            const collapsed = computed(() => store.state.sidebarCollapsed);
            const toggleCollapse = () => { store.state.sidebarCollapsed = !store.state.sidebarCollapsed; };

            const navItems = [
                { view: 'chat', label: '角色对话', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
                { view: 'characters', label: '角色卡管理', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
                { view: 'themestore', label: '主题商城', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
                { view: 'worldinfo', label: '世界书', icon: 'M12 6.25v13m0-13C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5S19.83 5.48 21 6.25v13C19.83 18.48 18.25 18 16.5 18s-3.33.48-4.5 1.25' },
                { view: 'regex', label: '正则脚本', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
                { view: 'uitemplates', label: 'UI 模板', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
                { view: 'settings', label: '系统设置', icon: '' }
            ];

            const topAddons = computed(() => (theme.value?.addons || []).filter(a => a.slot === 'sidebar-top'));
            const bottomAddons = computed(() => (theme.value?.addons || []).filter(a => a.slot === 'sidebar-bottom'));

            return { theme, enabled, collapsed, toggleCollapse, navItems, topAddons, bottomAddons };
        },
        template: `
            <aside v-if="enabled" :key="theme.id" class="app-sidebar tp-dock-sidebar" :class="{ 'is-collapsed': collapsed, 'zzz-hub-sidebar-collapsed': collapsed }">
                <div class="app-sidebar-head">
                    <div class="app-logo font-bold tracking-wide text-sm">
                        <span>RP HUB</span>
                    </div>
                    <button type="button" class="tp-sidebar-collapse-btn" @click="toggleCollapse" :title="collapsed ? '展开侧边栏' : '收起侧边栏'">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                :d="collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'"></path>
                        </svg>
                    </button>
                </div>

                <div v-if="topAddons.length" class="tp-sidebar-addons">
                    <theme-addon-item v-for="addon in topAddons" :key="theme.id + '-' + addon.id"
                        :theme-id="theme.id" :addon="addon" :compact="collapsed"></theme-addon-item>
                </div>

                <nav class="sidebar-nav custom-scrollbar" aria-label="主题侧边导航">
                    <button v-for="item in navItems" :key="item.view" type="button"
                        class="sidebar-nav-button"
                        :class="{ 'is-active bg-primary-50': currentView === item.view }"
                        :title="item.label"
                        @click="$emit('update:current-view', item.view)">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path v-if="item.icon" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="item.icon"></path>
                            <use v-else href="#icon-settings"></use>
                        </svg>
                        <span>{{ item.label }}</span>
                    </button>
                </nav>

                <div v-if="bottomAddons.length" class="tp-sidebar-addons">
                    <theme-addon-item v-for="addon in bottomAddons" :key="theme.id + '-' + addon.id"
                        :theme-id="theme.id" :addon="addon" :compact="collapsed"></theme-addon-item>
                </div>
            </aside>`
    };

    // 5. Floating Addons Layer (renders ONLY when active theme carries floating addons)
    const ThemeFloatingAddons = {
        name: 'ThemeFloatingAddons',
        components: { ThemeAddonItem },
        setup() {
            const theme = window.RPHubThemeStore.activeTheme;
            const active = computed(() => theme.value && theme.value.id !== 'native');
            const blAddons = computed(() => (theme.value?.addons || []).filter(a => a.slot === 'floating-bl'));
            const brAddons = computed(() => (theme.value?.addons || []).filter(a => a.slot === 'floating-br'));
            const trAddons = computed(() => (theme.value?.addons || []).filter(a => a.slot === 'floating-tr'));
            return { theme, active, blAddons, brAddons, trAddons };
        },
        template: `
            <div v-if="active" :key="theme.id" class="tp-floating-layer">
                <div v-if="blAddons.length" class="tp-floating-slot tp-floating-slot--bl">
                    <theme-addon-item v-for="a in blAddons" :key="theme.id + '-' + a.id" :theme-id="theme.id" :addon="a" floating></theme-addon-item>
                </div>
                <div v-if="brAddons.length" class="tp-floating-slot tp-floating-slot--br">
                    <theme-addon-item v-for="a in brAddons" :key="theme.id + '-' + a.id" :theme-id="theme.id" :addon="a" floating></theme-addon-item>
                </div>
                <div v-if="trAddons.length" class="tp-floating-slot tp-floating-slot--tr">
                    <theme-addon-item v-for="a in trAddons" :key="theme.id + '-' + a.id" :theme-id="theme.id" :addon="a" floating></theme-addon-item>
                </div>
            </div>`
    };

    // 6. Theme Store Main View + Visual Creator / Upload Workshop
    const CSS_SNIPPETS = {
        composer: `/* 改造底部输入框（示例：斜切工业指令终端） */
html[data-rphub-theme-pack="{{ID}}"] .input-area-mobile .input-island {
    position: relative !important;
    padding-top: 26px !important;
    background: #101318 !important;
    border: 2px solid var(--tp-main, #6366f1) !important;
    border-radius: 4px 14px 4px 14px !important;
}
html[data-rphub-theme-pack="{{ID}}"] .input-area-mobile .input-island::before {
    content: "COMMAND // INPUT READY";
    position: absolute;
    left: 12px;
    top: 5px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--tp-main, #6366f1);
}`,
        bubble: `/* 改造对话气泡与楼层名牌 */
html[data-rphub-theme-pack="{{ID}}"] .app-main .msg-bubble-glass {
    background: rgba(18, 22, 32, 0.92) !important;
    color: #f4f6fb !important;
    border-left: 4px solid var(--tp-main, #6366f1) !important;
    border-radius: 4px 16px 4px 16px !important;
}
html[data-rphub-theme-pack="{{ID}}"] .app-main .msg-name-tag {
    background: var(--tp-main, #6366f1) !important;
    color: #fff !important;
    border-radius: 4px !important;
}`,
        sidebar: `/* 改造左侧常驻侧边栏（需勾选开启常驻侧边栏） */
html[data-rphub-theme-pack="{{ID}}"] .app-sidebar {
    background: #0d1017 !important;
    border-right: 2px solid var(--tp-main, #6366f1) !important;
}
html[data-rphub-theme-pack="{{ID}}"] .sidebar-nav-button.is-active {
    background: var(--tp-main, #6366f1) !important;
    color: #fff !important;
}`
    };

    const ThemeStoreView = {
        name: 'ThemeStoreView',
        emits: ['menu', 'toast'],
        setup(_, { emit }) {
            const store = window.RPHubThemeStore;
            const activeTab = ref('featured'); // 'featured' | 'community' | 'mine'
            const searchQuery = ref('');
            const showStudio = ref(false);
            const studioTab = ref('basic'); // 'basic' | 'css' | 'addons'
            const showApiModal = ref(false);
            const apiDraft = ref(store.state.apiEndpoint);
            const publishing = ref(false);
            const fileInputRef = ref(null);

            const notify = (msg, type = 'success') => {
                try { emit('toast', { msg, type }); } catch (_) {}
            };

            const activeId = computed(() => store.state.activeId || 'native');
            const currentTheme = computed(() => store.activeTheme.value || store.BUILTIN_THEMES[0]);

            const equipTheme = pack => {
                store.activateTheme(pack.id);
                if (pack.id === 'native') {
                    notify('已恢复 RP-Hub 原生纯净默认界面', 'info');
                } else {
                    notify('已切换至主题「' + pack.name + '」', 'success');
                }
            };

            const resetToNative = () => {
                store.activateTheme('native');
                notify('已恢复 RP-Hub 原生纯净默认界面', 'info');
            };

            const draft = reactive({
                id: '',
                name: '',
                author: '',
                version: '1.0.0',
                category: '玩家共创',
                baseMode: 'dark',
                accent: '#6366f1',
                cover: 'linear-gradient(135deg, #111827 0%, #4f46e5 60%, #ec4899 100%)',
                description: '',
                tagsText: '自定义输入框, 气泡美化',
                dockSidebar: false,
                css: '',
                enablePlayer: false,
                playerSlot: 'floating-bl',
                playerKicker: 'CUSTOM SOUNDTRACK',
                playerDisc: 'OST',
                playerTracksText: '',
                enableWidget: false,
                widgetSlot: 'floating-br',
                widgetTitle: '主题悬浮铭牌',
                widgetHtml: '<div style="padding:10px 14px;border-radius:12px;background:rgba(15,23,42,.9);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:12px;"><b>CUSTOM HUD</b><div style="opacity:.75;font-size:11px;margin-top:2px;">玩家自制主题悬浮窗</div></div>'
            });

            const openBlankStudio = () => {
                Object.assign(draft, {
                    id: 'theme-' + Date.now().toString(36).slice(-6),
                    name: '',
                    author: '',
                    version: '1.0.0',
                    category: '玩家共创',
                    baseMode: 'dark',
                    accent: '#6366f1',
                    cover: 'linear-gradient(135deg, #111827 0%, #4f46e5 60%, #ec4899 100%)',
                    description: '',
                    tagsText: '自定义主题',
                    dockSidebar: false,
                    css: '',
                    enablePlayer: false,
                    playerSlot: 'floating-bl',
                    playerKicker: 'CUSTOM SOUNDTRACK',
                    playerDisc: 'OST',
                    playerTracksText: '',
                    enableWidget: false,
                    widgetSlot: 'floating-br',
                    widgetTitle: '主题悬浮铭牌',
                    widgetHtml: '<div style="padding:10px 14px;border-radius:12px;background:rgba(15,23,42,.9);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:12px;"><b>CUSTOM HUD</b><div style="opacity:.75;font-size:11px;margin-top:2px;">玩家自制主题悬浮窗</div></div>'
                });
                studioTab.value = 'basic';
                showStudio.value = true;
            };

            const forkThemeIntoStudio = pack => {
                const playerAddon = (pack.addons || []).find(a => a.type === 'audio-player');
                const htmlAddon = (pack.addons || []).find(a => a.type === 'html-widget');
                const forkId = pack.builtin ? `${pack.id}-custom` : pack.id;
                Object.assign(draft, {
                    id: forkId,
                    name: pack.builtin ? `${pack.name}（二改版）` : pack.name,
                    author: pack.author || '',
                    version: pack.version || '1.0.0',
                    category: pack.builtin ? '玩家共创' : (pack.category || '玩家共创'),
                    baseMode: pack.baseMode || 'dark',
                    accent: pack.accent || '#6366f1',
                    cover: pack.cover || 'linear-gradient(135deg, #1e293b, #6366f1)',
                    description: pack.description || '',
                    tagsText: (pack.tags || []).join(', '),
                    dockSidebar: Boolean(pack.capabilities?.dockSidebar),
                    css: pack.builtin ? String(pack.css || '').replaceAll(pack.id, forkId) : (pack.css || ''),
                    enablePlayer: Boolean(playerAddon),
                    playerSlot: playerAddon?.slot || 'floating-bl',
                    playerKicker: playerAddon?.config?.kicker || 'CUSTOM SOUNDTRACK',
                    playerDisc: playerAddon?.config?.discLabel || 'OST',
                    playerTracksText: (playerAddon?.config?.tracks || []).map(t => `${t.name} | ${t.url}`).join('\n'),
                    enableWidget: Boolean(htmlAddon),
                    widgetSlot: htmlAddon?.slot || 'floating-br',
                    widgetTitle: htmlAddon?.title || '主题挂件',
                    widgetHtml: htmlAddon?.html || ''
                });
                studioTab.value = 'basic';
                showStudio.value = true;
            };

            const buildPackFromDraft = () => {
                const addons = [];
                if (draft.enableWidget && draft.widgetHtml.trim()) {
                    addons.push({
                        id: `${draft.id}-widget`,
                        type: 'html-widget',
                        slot: draft.widgetSlot,
                        title: draft.widgetTitle || '主题挂件',
                        html: draft.widgetHtml
                    });
                }
                if (draft.enablePlayer) {
                    const tracks = draft.playerTracksText.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
                        if (line.includes('|')) {
                            const [n, u] = line.split('|');
                            return { name: n.trim(), url: u.trim() };
                        }
                        return { name: '曲目', url: line };
                    }).filter(t => /^https?:\/\//i.test(t.url));
                    addons.push({
                        id: `${draft.id}-player`,
                        type: 'audio-player',
                        slot: draft.dockSidebar && draft.playerSlot === 'sidebar-bottom' ? 'sidebar-bottom' : draft.playerSlot,
                        config: {
                            kicker: draft.playerKicker || 'SOUNDTRACK',
                            discLabel: draft.playerDisc || 'BGM',
                            accent: draft.accent || '#6366f1',
                            tracks
                        }
                    });
                }
                const autoVarCss = `html[data-rphub-theme-pack="${draft.id}"] { --tp-main: ${draft.accent || '#6366f1'}; }\n`;
                const rawCss = draft.css.includes('--tp-main') && !draft.css.includes(`--tp-main:`)
                    ? autoVarCss + draft.css
                    : draft.css;

                return store.normalizeThemePack({
                    id: draft.id,
                    name: draft.name || '未命名自制主题',
                    author: draft.author || '本地玩家',
                    version: draft.version || '1.0.0',
                    category: draft.category || '玩家共创',
                    baseMode: draft.baseMode,
                    accent: draft.accent,
                    cover: draft.cover,
                    description: draft.description,
                    tags: draft.tagsText.split(/[,，]/).map(s => s.trim()).filter(Boolean),
                    capabilities: { dockSidebar: draft.dockSidebar },
                    css: rawCss,
                    addons
                });
            };

            const insertSnippet = key => {
                const tpl = (CSS_SNIPPETS[key] || '').replaceAll('{{ID}}', draft.id || 'my-theme');
                draft.css = (draft.css ? draft.css + '\n\n' : '') + tpl;
                if (key === 'sidebar') draft.dockSidebar = true;
            };

            const saveAndEquipDraft = () => {
                try {
                    const saved = store.saveLocalTheme(buildPackFromDraft());
                    store.activateTheme(saved.id);
                    showStudio.value = false;
                    notify(`已保存并启用主题「${saved.name}」`);
                } catch (err) {
                    notify(err.message || '保存失败', 'error');
                }
            };

            const publishDraftToCommunity = async () => {
                publishing.value = true;
                try {
                    const pack = buildPackFromDraft();
                    const localSaved = store.saveLocalTheme(pack);
                    const remoteSaved = await store.publishThemeToHub(localSaved);
                    store.activateTheme(localSaved.id);
                    showStudio.value = false;
                    activeTab.value = 'community';
                    notify(`主题「${remoteSaved.name}」已成功发布到共创广场！`);
                } catch (err) {
                    notify(err.message || '上传到主题商城失败，请检查接口设置', 'error');
                } finally {
                    publishing.value = false;
                }
            };

            const triggerImport = () => fileInputRef.value?.click();
            const handleImportFile = async e => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                    const text = await file.text();
                    const parsed = JSON.parse(text);
                    const saved = store.saveLocalTheme(parsed);
                    store.activateTheme(saved.id);
                    notify(`成功导入并启用主题「${saved.name}」`);
                } catch (err) {
                    notify('导入失败：主题 JSON 文件格式无效', 'error');
                }
            };

            const saveApiEndpoint = () => {
                store.setApiEndpoint(apiDraft.value);
                showApiModal.value = false;
                store.fetchCommunityThemes();
                notify('主题商城接口地址已更新');
            };

            const displayedList = computed(() => {
                const q = searchQuery.value.trim().toLowerCase();
                let list = [];
                if (activeTab.value === 'featured') list = store.BUILTIN_THEMES;
                else if (activeTab.value === 'community') list = store.state.communityThemes;
                else list = store.state.installedThemes;

                if (!q) return list;
                return list.filter(t => (
                    (t.name || '').toLowerCase().includes(q)
                    || (t.author || '').toLowerCase().includes(q)
                    || (t.description || '').toLowerCase().includes(q)
                    || (t.tags || []).some(tag => tag.toLowerCase().includes(q))
                ));
            });

            watch(activeTab, tab => {
                if (tab === 'community') store.fetchCommunityThemes();
            });

            onMounted(() => {
                store.fetchCommunityThemes();
            });

            return {
                store, activeId, currentTheme, activeTab, searchQuery, displayedList,
                showStudio, studioTab, draft, publishing,
                showApiModal, apiDraft, fileInputRef,
                equipTheme, resetToNative,
                openBlankStudio, forkThemeIntoStudio, buildPackFromDraft, insertSnippet,
                saveAndEquipDraft, publishDraftToCommunity,
                triggerImport, handleImportFile, saveApiEndpoint, notify
            };
        },
        template: `
            <div class="management-view">
                <div class="max-w-5xl mx-auto">
                    <div class="settings-page-header">
                        <div class="management-page-heading">
                            <button type="button" class="app-nav-trigger" @click="$emit('menu')" aria-label="打开导航">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor"><use href="#icon-menu"></use></svg>
                            </button>
                            <h2 class="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
                                </svg>
                                主题商城
                            </h2>
                        </div>
                        <div class="flex items-center gap-2">
                            <input ref="fileInputRef" type="file" accept=".json,application/json" class="hidden" @change="handleImportFile">
                            <button type="button" class="settings-action" @click="triggerImport" title="从本地 JSON 导入主题包">
                                导入主题包
                            </button>
                            <button type="button" class="settings-action" @click="apiDraft = store.state.apiEndpoint; showApiModal = true" title="配置玩家上传与社区拉取服务器接口">
                                接口设置
                            </button>
                            <button type="button" class="modal-primary-button !py-2 !px-3.5 text-xs" @click="openBlankStudio">
                                ＋ 制作 / 投稿主题
                            </button>
                        </div>
                    </div>

                    <!-- Current Equipped Banner -->
                    <div class="ts-hero flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="min-w-0">
                            <div class="text-xs font-bold uppercase tracking-wider text-primary-600 mb-1">当前生效主题</div>
                            <div class="flex flex-wrap items-center gap-2.5">
                                <h3 class="text-lg md:text-xl font-bold text-gray-900">{{ currentTheme.name }}</h3>
                                <span class="ts-chip">作者：{{ currentTheme.author }}</span>
                                <span v-if="currentTheme.capabilities?.dockSidebar" class="ts-chip">常驻侧栏</span>
                                <span v-if="(currentTheme.addons || []).length" class="ts-chip">
                                    自带 {{ currentTheme.addons.length }} 个挂件组件
                                </span>
                            </div>
                            <p class="mt-1.5 text-xs md:text-sm text-gray-500 leading-relaxed">
                                {{ currentTheme.description }}
                            </p>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <button v-if="activeId !== 'native'" type="button"
                                class="modal-secondary-button !py-2 !px-4 text-xs font-bold"
                                @click="resetToNative">
                                恢复原生默认
                            </button>
                            <button v-if="activeId !== 'native'" type="button"
                                class="settings-action"
                                @click="forkThemeIntoStudio(currentTheme)">
                                二改当前主题
                            </button>
                        </div>
                    </div>

                    <!-- Filter Tabs & Search -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        <div class="ts-tabs !mb-0">
                            <button type="button" class="ts-tab" :class="{ 'is-active': activeTab === 'featured' }" @click="activeTab = 'featured'">
                                官方与代表作预设 ({{ store.BUILTIN_THEMES.length }})
                            </button>
                            <button type="button" class="ts-tab" :class="{ 'is-active': activeTab === 'community' }" @click="activeTab = 'community'">
                                玩家共创广场 ({{ store.state.communityThemes.length }})
                            </button>
                            <button type="button" class="ts-tab" :class="{ 'is-active': activeTab === 'mine' }" @click="activeTab = 'mine'">
                                我的安装与自制 ({{ store.state.installedThemes.length }})
                            </button>
                        </div>
                        <div class="relative w-full sm:w-64">
                            <input v-model="searchQuery" type="text" placeholder="搜索主题、作者或组件标签..."
                                class="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs md:text-sm text-gray-800 focus:border-primary-500 focus:outline-none">
                            <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                    </div>

                    <!-- Community Loading / Error Hint -->
                    <div v-if="activeTab === 'community' && store.state.communityLoading" class="empty-state mb-4">
                        <p>正在连接共创主题服务器拉取最新玩家作品…</p>
                    </div>
                    <div v-else-if="activeTab === 'community' && store.state.communityError" class="empty-state mb-4">
                        <p>暂未连接到远程主题接口（{{ store.state.communityError }}）</p>
                        <small>可在右上角「接口设置」填写你的云服务器地址，或直接通过「导入/导出主题包」分享</small>
                        <button type="button" class="settings-action mt-3" @click="store.fetchCommunityThemes()">重试连接</button>
                    </div>

                    <!-- Empty State -->
                    <div v-if="!store.state.communityLoading && displayedList.length === 0" class="empty-state">
                        <p>{{ activeTab === 'community' ? '共创广场还没有玩家投稿，快来发布第一个主题吧！' : '暂无匹配的主题包' }}</p>
                        <button type="button" class="modal-primary-button mt-3 text-xs" @click="openBlankStudio">立即创作并上架第一个主题</button>
                    </div>

                    <!-- Theme Cards Grid -->
                    <div v-else class="ts-grid pb-10">
                        <article v-for="pack in displayedList" :key="activeTab + '-' + pack.id"
                            class="ts-card" :class="{ 'is-equipped': activeId === pack.id }">
                            <div class="ts-card__banner" :style="{ background: pack.cover || 'linear-gradient(135deg,#1e293b,#6366f1)' }">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/45 backdrop-blur-md border border-white/20">
                                        {{ pack.category || '主题' }}
                                    </span>
                                    <span v-if="activeId === pack.id"
                                        class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-500/85 text-white shadow">
                                        ● 使用中
                                    </span>
                                    <span v-else-if="pack.baseMode"
                                        class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/40 border border-white/15">
                                        {{ pack.baseMode === 'dark' ? '深色底' : '浅色底' }}
                                    </span>
                                </div>
                                <div class="ts-mockup">
                                    <span class="ts-mockup__dot" :style="{ background: pack.accent || '#6366f1' }"></span>
                                    <div class="ts-mockup__bars"><i></i><i></i></div>
                                    <span class="text-[10px] font-mono opacity-80">v{{ pack.version || '1.0' }}</span>
                                </div>
                            </div>

                            <div class="ts-card__body">
                                <div class="flex items-start justify-between gap-2">
                                    <h3 class="font-bold text-gray-900 text-base leading-snug">{{ pack.name }}</h3>
                                </div>
                                <div class="mt-1 text-xs text-gray-400">作者：{{ pack.author || '匿名' }}</div>
                                <p class="mt-2.5 text-xs text-gray-600 leading-relaxed line-clamp-3 flex-1">
                                    {{ pack.description }}
                                </p>

                                <div class="mt-3 flex flex-wrap gap-1.5">
                                    <span v-for="tag in (pack.tags || []).slice(0, 4)" :key="tag" class="ts-chip">{{ tag }}</span>
                                </div>

                                <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                    <template v-if="activeTab === 'community'">
                                        <button type="button" class="modal-primary-button !py-1.5 !px-3.5 text-xs"
                                            @click="store.installFromCommunity(pack).then(() => notify('已安装并启用「' + pack.name + '」'))">
                                            安装并启用 ({{ pack.installs || 0 }})
                                        </button>
                                        <div class="flex items-center gap-1.5">
                                            <button type="button" class="settings-action !min-h-0 !py-1.5 !px-2.5 text-xs"
                                                @click="store.toggleLikeCommunityTheme(pack)">
                                                ♥ {{ pack.likes || 0 }}
                                            </button>
                                            <button type="button" class="settings-action !min-h-0 !py-1.5 !px-2.5 text-xs"
                                                @click="store.exportThemePack(pack)" title="下载 JSON">
                                                导出
                                            </button>
                                        </div>
                                    </template>

                                    <template v-else>
                                        <button v-if="activeId !== pack.id" type="button"
                                            class="modal-primary-button !py-1.5 !px-4 text-xs"
                                            @click="equipTheme(pack)">
                                            立即启用
                                        </button>
                                        <span v-else class="text-xs font-bold text-primary-600 px-2">当前已装备</span>

                                        <div class="flex items-center gap-1">
                                            <button v-if="pack.id !== 'native'" type="button"
                                                class="settings-action !min-h-0 !py-1.5 !px-2.5 text-xs"
                                                @click="forkThemeIntoStudio(pack)" title="打开工坊编辑或基于此主题二改">
                                                {{ pack.builtin ? '二改' : '编辑' }}
                                            </button>
                                            <button v-if="pack.id !== 'native'" type="button"
                                                class="settings-action !min-h-0 !py-1.5 !px-2.5 text-xs"
                                                @click="store.exportThemePack(pack)" title="导出 .rphub-theme.json 主题文件">
                                                导出
                                            </button>
                                            <button v-if="!pack.builtin && pack.id !== 'native'" type="button"
                                                class="settings-action !min-h-0 !py-1.5 !px-2.5 text-xs text-red-500"
                                                @click="store.deleteLocalTheme(pack.id); notify('已移除本地主题', 'info')">
                                                删除
                                            </button>
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>

                <!-- Theme Creator & Submission Studio Modal -->
                <modal-shell :open="showStudio" panel-class="max-w-3xl w-full max-h-[90dvh] flex flex-col overflow-hidden" @close="showStudio = false">
                    <modal-header title="主题制作与投稿工坊" subtitle="支持全局 CSS 变形（输入框/侧栏/气泡）并可随主题携带播放器与悬浮组件" @close="showStudio = false"></modal-header>
                    <div class="px-5 pt-3 border-b border-gray-100 flex gap-2 flex-shrink-0">
                        <button type="button" class="ts-tab !py-1.5 !text-xs" :class="{ 'is-active': studioTab === 'basic' }" @click="studioTab = 'basic'">1. 基础信息与封面</button>
                        <button type="button" class="ts-tab !py-1.5 !text-xs" :class="{ 'is-active': studioTab === 'css' }" @click="studioTab = 'css'">2. 侧边栏与全局 CSS</button>
                        <button type="button" class="ts-tab !py-1.5 !text-xs" :class="{ 'is-active': studioTab === 'addons' }" @click="studioTab = 'addons'">3. 随主题携带组件（播放器/悬浮窗）</button>
                    </div>

                    <div class="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar text-sm">
                        <template v-if="studioTab === 'basic'">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="settings-label">主题名称 *</label>
                                    <input v-model="draft.name" type="text" class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2" placeholder="例如：赛博酒保 · 霓虹夜雨">
                                </div>
                                <div>
                                    <label class="settings-label">创作者署名</label>
                                    <input v-model="draft.author" type="text" class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2" placeholder="你的昵称">
                                </div>
                                <div>
                                    <label class="settings-label">主题唯一标识 (ID)</label>
                                    <input v-model="draft.id" type="text" class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 font-mono text-xs" placeholder="english-theme-id">
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="settings-label">基底明暗模式</label>
                                        <select v-model="draft.baseMode" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2">
                                            <option value="dark">深色基底 (Dark)</option>
                                            <option value="light">浅色基底 (Light)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="settings-label">主强调色</label>
                                        <input v-model="draft.accent" type="text" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-mono text-xs" placeholder="#ffe100">
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="settings-label">商城展示封面（支持 CSS 渐变或 url(...)）</label>
                                <input v-model="draft.cover" type="text" class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 font-mono text-xs">
                            </div>
                            <div>
                                <label class="settings-label">特性标签（逗号分隔）</label>
                                <input v-model="draft.tagsText" type="text" class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2" placeholder="终端输入框, 黑胶播放器, 悬浮窗">
                            </div>
                            <div>
                                <label class="settings-label">主题简介</label>
                                <textarea v-model="draft.description" rows="2" class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2" placeholder="介绍一下这套主题改动了哪些界面元素与挂件…"></textarea>
                            </div>
                        </template>

                        <template v-else-if="studioTab === 'css'">
                            <label class="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
                                <div>
                                    <div class="font-bold text-gray-800">开启桌面端左侧常驻侧边栏 (.app-sidebar)</div>
                                    <div class="text-xs text-gray-500 mt-0.5">开启后，装备此主题时桌面左侧将常驻显示侧栏，可放置唱片机、画报与自定义导航样式</div>
                                </div>
                                <input v-model="draft.dockSidebar" type="checkbox" class="w-4 h-4 accent-primary-600">
                            </label>

                            <div>
                                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <label class="settings-label !mb-0">主题全局 CSS 样式表</label>
                                    <div class="flex flex-wrap gap-1.5">
                                        <button type="button" class="settings-action !min-h-0 !py-1 !px-2.5 text-xs" @click="insertSnippet('composer')">＋ 输入框改装模板</button>
                                        <button type="button" class="settings-action !min-h-0 !py-1 !px-2.5 text-xs" @click="insertSnippet('bubble')">＋ 气泡改装模板</button>
                                        <button type="button" class="settings-action !min-h-0 !py-1 !px-2.5 text-xs" @click="insertSnippet('sidebar')">＋ 侧边栏改装模板</button>
                                    </div>
                                </div>
                                <textarea v-model="draft.css" class="ts-code-editor custom-scrollbar"
                                    placeholder="在此编写任意 CSS，例如改造 .input-island（输入框）、.msg-bubble-glass（气泡）、.app-sidebar（侧边栏）等…"></textarea>
                            </div>
                        </template>

                        <template v-else>
                            <!-- Addon 1: Music Player -->
                            <div class="p-4 rounded-2xl border border-gray-200 space-y-3">
                                <label class="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <div class="font-bold text-gray-900">🎵 随主题携带「音乐唱片机组件」</div>
                                        <div class="text-xs text-gray-500">仅在玩家使用该主题时出现，切回默认主题自动销毁</div>
                                    </div>
                                    <input v-model="draft.enablePlayer" type="checkbox" class="w-4 h-4 accent-primary-600">
                                </label>
                                <div v-if="draft.enablePlayer" class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                                    <div>
                                        <label class="settings-label">挂载位置</label>
                                        <select v-model="draft.playerSlot" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs">
                                            <option value="sidebar-bottom">左侧常驻侧边栏底部</option>
                                            <option value="floating-bl">左下角可收起悬浮窗</option>
                                            <option value="floating-br">右下角可收起悬浮窗</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="settings-label">播放器顶栏副标</label>
                                        <input v-model="draft.playerKicker" type="text" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs">
                                    </div>
                                    <div>
                                        <label class="settings-label">黑胶碟芯文字</label>
                                        <input v-model="draft.playerDisc" type="text" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs">
                                    </div>
                                    <div class="md:col-span-3">
                                        <label class="settings-label">预置歌单（每行一首，格式：曲名 | https://音频直链.mp3）</label>
                                        <textarea v-model="draft.playerTracksText" rows="3" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-mono text-xs"
                                            placeholder="夜雨爵士 | https://example.com/jazz.mp3"></textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- Addon 2: Custom Floating / Sidebar HTML Widget -->
                            <div class="p-4 rounded-2xl border border-gray-200 space-y-3">
                                <label class="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <div class="font-bold text-gray-900">🪟 随主题携带「自定义悬浮窗 / 侧栏铭牌组件」</div>
                                        <div class="text-xs text-gray-500">支持编写自定义 HTML 结构并与你的主题 CSS 联动</div>
                                    </div>
                                    <input v-model="draft.enableWidget" type="checkbox" class="w-4 h-4 accent-primary-600">
                                </label>
                                <div v-if="draft.enableWidget" class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                                    <div>
                                        <label class="settings-label">挂件名称</label>
                                        <input v-model="draft.widgetTitle" type="text" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs">
                                    </div>
                                    <div>
                                        <label class="settings-label">挂载位置</label>
                                        <select v-model="draft.widgetSlot" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs">
                                            <option value="floating-br">右下角悬浮挂件（手机端可收起）</option>
                                            <option value="floating-tr">右上角悬浮挂件</option>
                                            <option value="sidebar-bottom">左侧常驻侧边栏底部</option>
                                            <option value="sidebar-top">左侧常驻侧边栏顶部</option>
                                        </select>
                                    </div>
                                    <div class="md:col-span-2">
                                        <label class="settings-label">组件 HTML 内容</label>
                                        <textarea v-model="draft.widgetHtml" rows="4" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-mono text-xs"></textarea>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>

                    <div class="px-5 py-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-gray-50/60 flex-shrink-0">
                        <button type="button" class="settings-action text-xs" @click="store.exportThemePack(buildPackFromDraft())">
                            导出 JSON 主题包
                        </button>
                        <div class="flex items-center gap-2">
                            <button type="button" class="modal-secondary-button !py-2 !px-4 text-xs" @click="saveAndEquipDraft">
                                本地保存并启用
                            </button>
                            <button type="button" class="modal-primary-button !py-2 !px-4 text-xs" :disabled="publishing" @click="publishDraftToCommunity">
                                {{ publishing ? '正在上传…' : '🚀 发布上架到共创广场' }}
                            </button>
                        </div>
                    </div>
                </modal-shell>

                <!-- API Endpoint Config & Developer Spec Modal -->
                <modal-shell :open="showApiModal" panel-class="max-w-lg w-full overflow-hidden" @close="showApiModal = false">
                    <modal-header title="玩家主题上传接口配置与规范" subtitle="可连接本地预览服务或部署到你自己的云服务器上" @close="showApiModal = false"></modal-header>
                    <div class="p-5 space-y-4 text-sm">
                        <div>
                            <label class="settings-label">主题商城后端接口根地址</label>
                            <input v-model="apiDraft" type="url" class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 font-mono text-xs"
                                placeholder="例如：https://themes.yourdomain.com 或 http://127.0.0.1:8765">
                            <p class="mt-1.5 text-xs text-gray-500">客户端将自动调用该地址下的公开 REST 接口拉取和发布玩家主题。</p>
                        </div>
                        <div class="rounded-xl bg-gray-50 border border-gray-200 p-3.5 text-xs space-y-1.5 font-mono text-gray-700">
                            <div class="font-bold font-sans text-gray-900 mb-1">开放接口协议（供玩家或外部制卡器直接提交）：</div>
                            <div>• GET  /v1/themes — 获取玩家共享主题列表</div>
                            <div>• POST /v1/themes — 上传新主题包 JSON（含 css 与 addons 组件）</div>
                            <div>• POST /v1/themes/:id/install — 记录主题安装次数</div>
                            <div>• POST /v1/themes/:id/like — 为主题点赞</div>
                        </div>
                        <div class="flex justify-end gap-2 pt-2">
                            <button type="button" class="modal-secondary-button !py-2 !px-4 text-xs" @click="showApiModal = false">取消</button>
                            <button type="button" class="modal-primary-button !py-2 !px-4 text-xs" @click="saveApiEndpoint">保存并刷新广场</button>
                        </div>
                    </div>
                </modal-shell>
            </div>`
    };

    window.RPHubThemeStoreComponents = Object.freeze({
        ThemeDockSidebar,
        ThemeFloatingAddons,
        ThemeStoreView
    });
})();
