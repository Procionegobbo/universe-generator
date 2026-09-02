// The route table itself, resolved rather than navigated: what each address
// matches is the whole contract this slice rests on. The sector moved into the
// first path segment and the old `/system/:id` route went with the query format
// it depended on, so the cases that matter most here are the ones that must now
// *fail* — and fail soft, into the catch-all `useSectorLink` answers with "/".
//
// A `.dom.test.ts` because the app's router is built on `createWebHistory()`,
// which reads `window` at construction. Nothing here needs a DOM beyond that,
// but resolving the real table is the point: a table rebuilt for the test would
// pin the test's own copy rather than what the app ships.

import { describe, it, expect } from 'vitest';
import router from './index';

const SID = '766207-m-100-1000';

const nameOf = (path: string) => String(router.resolve(path).name);

describe('the route table — what a sid-carrying address matches', () => {
    it('resolves a bare sid to the sector console', () => {
        const resolved = router.resolve(`/${SID}`);

        expect(resolved.name).toBe('sector');
        expect(resolved.params.sid).toBe(SID);
    });

    it('resolves a sid + system to the detail view, carrying both params', () => {
        const resolved = router.resolve(`/${SID}/system/66`);

        expect(resolved.name).toBe('system-detail');
        expect(resolved.params.sid).toBe(SID);
        expect(resolved.params.id).toBe('66');
    });

    // Vue Router's default matching is non-strict, and `vercel.json` sets
    // `trailingSlash: false`, so the canonical form needs no redirect of its own.
    it('resolves a trailing slash to the same sector route', () => {
        const resolved = router.resolve(`/${SID}/`);

        expect(resolved.name).toBe('sector');
        expect(resolved.params.sid).toBe(SID);
    });

    it('resolves "/" to home with no redirect', () => {
        const resolved = router.resolve('/');

        expect(resolved.name).toBe('home');
        expect(resolved.redirectedFrom).toBeUndefined();
    });

    // Static before dynamic, whatever the declaration order: a documentation
    // link must never be read as a sector that failed to decode.
    it.each([
        ['/documentation', 'documentation'],
        ['/api-reference', 'api-reference']
    ])('resolves %s to its own route, never to "sector"', (path, name) => {
        expect(nameOf(path)).toBe(name);
    });
});

describe('the route table — the old link format is read by nothing', () => {
    it('no longer has a /system/:id route', () => {
        expect(nameOf('/system/66')).toBe('not-found');
    });

    // The same address as a shared link actually carried. The query is not read
    // by anything any more, so it cannot rescue the path.
    it('does not read the old sector query on the legacy path either', () => {
        const resolved = router.resolve(
            '/system/66?seed=766207&zone=medium&systems=100&volume=1000'
        );

        expect(resolved.name).toBe('not-found');
    });

    it('leaves an old home link on "home", with the query inert', () => {
        const resolved = router.resolve(
            '/?seed=766207&zone=medium&systems=100&volume=1000'
        );

        expect(resolved.name).toBe('home');
        expect(resolved.redirectedFrom).toBeUndefined();
    });

    it('sends an arbitrary unknown path to the catch-all', () => {
        expect(nameOf('/a/b/c')).toBe('not-found');
    });

    // Pinned so a legacy shim cannot be reintroduced by accident: backward
    // compatibility with the query format is a settled decision, not an
    // oversight, and a redirect route is how it would quietly come back.
    it('has no redirect and no beforeEnter anywhere in the table', () => {
        for (const route of router.getRoutes()) {
            expect(route.redirect).toBeUndefined();
            expect(route.beforeEnter).toBeUndefined();
        }
    });
});
