// Decision 6: a link that went wrong is said inline, above wherever the
// corrective navigation landed.
//
// The interesting property is the one the timing makes easy to get wrong: the
// notice is raised *after* its own `router.replace`, so it must survive the
// navigation that caused it and clear on the next one. Both directions are
// asserted here against a real router rather than by setting the ref by hand.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router';
import axios from 'axios';
import { useSectorStore, type LinkNoticeKind } from '../stores/sectorStore';
import { useSectorLink } from '../composables/useSectorLink';
import LinkNotice from './LinkNotice.vue';
import HomeView from '../views/HomeView.vue';

vi.mock('axios', () => ({
    default: { post: vi.fn(), get: vi.fn(), isCancel: vi.fn(() => false) }
}));

const post = vi.mocked(axios.post);

const MESSAGES: Record<LinkNoticeKind, string> = {
    sid: 'That address does not name a sector that can be generated.',
    planet: 'The planet in that link does not exist in this sector.',
    coordinates: 'The coordinates in that link are not consistent, so it opened the sector instead.'
};

const SID = '644212-m-100-1000';

let mounted: VueWrapper[] = [];

const makeRouter = (): Router => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/documentation', name: 'documentation', component: { template: '<div />' } },
        { path: '/', name: 'home', component: HomeView },
        { path: '/:sid', name: 'sector', component: HomeView },
        { path: '/:sid/system/:id', name: 'system-detail', component: { template: '<div />' } },
        { path: '/:pathMatch(.*)*', name: 'not-found', component: HomeView }
    ]
});

/** The strip alone, at one URL, over a store the caller primes. */
async function mountStrip(url = '/', prime?: (store: ReturnType<typeof useSectorStore>) => void) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();
    prime?.(store);

    const router = makeRouter();
    router.push(url);
    await router.isReady();

    const wrapper = mount(LinkNotice, { global: { plugins: [pinia, router] } });
    mounted.push(wrapper);
    await nextTick();
    return { store, wrapper, router };
}

/**
 * The strip under the same sector/URL sync App.vue installs, which is the only
 * way to exercise "raised after the replace it caused" without staging it.
 */
async function mountApp(url: string) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSectorStore();

    const router = makeRouter();
    router.push(url);
    await router.isReady();

    const Harness = {
        setup() {
            useSectorLink();
            return () => h('div', [h(LinkNotice), h(RouterView)]);
        }
    };
    const wrapper = mount(Harness, { global: { plugins: [pinia, router] } });
    mounted.push(wrapper);
    await flushPromises();
    await flushPromises();
    return { store, wrapper, router };
}

const strip = (wrapper: VueWrapper) => wrapper.find('[data-link-notice]');

beforeEach(() => {
    localStorage.clear();
    post.mockReset();
    post.mockResolvedValue({ data: { success: true, data: null, stats: null } });
    mounted = [];
});

afterEach(() => {
    for (const wrapper of mounted) wrapper.unmount();
    vi.useRealTimers();
});

describe('LinkNotice — what it says', () => {
    it.each(Object.keys(MESSAGES) as LinkNoticeKind[])(
        'renders the message for a %s notice',
        async (kind) => {
            const { wrapper } = await mountStrip('/', s => s.raiseLinkNotice(kind, '/'));

            const notice = strip(wrapper);
            expect(notice.exists()).toBe(true);
            expect(notice.attributes('data-link-notice-kind')).toBe(kind);
            expect(notice.text()).toContain(MESSAGES[kind]);
        }
    );

    it('renders nothing at all when no link went wrong', async () => {
        const { wrapper, store } = await mountStrip();

        expect(store.linkNotice).toBeNull();
        expect(strip(wrapper).exists()).toBe(false);
    });
});

describe('LinkNotice — how it goes away', () => {
    it('clears on the close button', async () => {
        const { wrapper, store } = await mountStrip('/', s => s.raiseLinkNotice('sid', '/'));

        const close = wrapper.get('[data-link-notice-close]');
        expect(close.attributes('aria-label')).toBe('Dismiss');

        await close.trigger('click');

        expect(store.linkNotice).toBeNull();
        expect(strip(wrapper).exists()).toBe(false);
    });

    it('clears itself after eight seconds', async () => {
        vi.useFakeTimers();
        const { wrapper, store } = await mountStrip();

        store.raiseLinkNotice('sid', '/');
        await nextTick();
        expect(strip(wrapper).exists()).toBe(true);

        vi.advanceTimersByTime(7999);
        await nextTick();
        expect(store.linkNotice).not.toBeNull();

        vi.advanceTimersByTime(1);
        await nextTick();
        expect(store.linkNotice).toBeNull();
        expect(strip(wrapper).exists()).toBe(false);
    });

    it('re-arms the timer for a second notice rather than inheriting the first one\'s', async () => {
        vi.useFakeTimers();
        const { wrapper, store } = await mountStrip();

        store.raiseLinkNotice('sid', '/');
        await nextTick();
        vi.advanceTimersByTime(7000);

        store.raiseLinkNotice('planet', '/');
        await nextTick();
        vi.advanceTimersByTime(7000);
        await nextTick();

        // The first notice's remaining 1 000 ms must not take the second one out.
        expect(store.linkNotice).toEqual({ kind: 'planet', path: '/' });
        expect(strip(wrapper).exists()).toBe(true);
    });

    it('clears on a navigation away from the path it was raised on', async () => {
        const { wrapper, store, router } = await mountStrip('/', s => s.raiseLinkNotice('sid', '/'));
        expect(strip(wrapper).exists()).toBe(true);

        await router.push('/documentation');
        await nextTick();

        expect(store.linkNotice).toBeNull();
        expect(strip(wrapper).exists()).toBe(false);
    });

    it('stays through a query-only change on the path it was raised on', async () => {
        // The guard's own remedy for a bad planet key is to strip the query and
        // leave the user where they are; the notice explaining it must survive
        // exactly that navigation.
        const path = `/${SID}/system/66`;
        const { wrapper, store, router } = await mountStrip(
            `${path}?planet=87-3`, s => s.raiseLinkNotice('planet', path));

        await router.replace({ path });
        await nextTick();

        expect(store.linkNotice).toEqual({ kind: 'planet', path });
        expect(strip(wrapper).exists()).toBe(true);
    });
});

describe('LinkNotice — against the real corrective navigation', () => {
    it('survives the replace that raised it and is read on the destination', async () => {
        const { wrapper, store, router } = await mountApp('/not-a-sector');

        expect(router.currentRoute.value.path).toBe('/');
        expect(store.linkNotice).toEqual({ kind: 'sid', path: '/' });
        expect(strip(wrapper).text()).toContain(MESSAGES.sid);
    });

    it('is absent when the corrected address is opened afresh', async () => {
        // The reload case: nothing persists the notice, and the replace has
        // already cleaned the URL, so the same path opened cold shows nothing.
        const { wrapper, store } = await mountApp('/');

        expect(store.linkNotice).toBeNull();
        expect(strip(wrapper).exists()).toBe(false);
    });
});

describe('LinkNotice — the full-page generation error is a different surface', () => {
    it('still renders HomeView\'s own error state, independently of the strip', async () => {
        const { wrapper, store } = await mountApp('/');
        store.error = 'network down';
        store.generationStatus = 'error';
        await nextTick();

        const home = wrapper.findComponent(HomeView);
        expect(home.text()).toContain('Generation failed');
        expect(home.text()).toContain('network down');
        expect(strip(wrapper).exists()).toBe(false);
    });
});
