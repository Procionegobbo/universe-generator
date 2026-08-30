// The app is a client-routed SPA served as static files on Vercel, so every
// route other than "/" exists only in the browser. Without a catch-all rewrite
// to index.html, loading /system/52, /documentation or /api-reference directly —
// a reload, a bookmark, a shared link — is answered by the CDN with a 404.
//
// Nothing else in CI would notice: the suites exercise the router in memory and
// never ask the host to resolve a path. This reads the deployed config instead.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG = resolve(dirname(fileURLToPath(import.meta.url)), '../../../vercel.json');

type Rewrite = { source: string; destination: string };

const config = () => JSON.parse(readFileSync(CONFIG, 'utf8'));
const rewrites = (): Rewrite[] => config().rewrites as Rewrite[];

/**
 * The shell's own path. `cleanUrls` strips the .html extension, which makes
 * /index.html a 308 back to /, so a rewrite aimed at /index.html resolves to
 * nothing and Vercel answers NOT_FOUND — the first attempt at this fix shipped
 * exactly that and changed nothing in production.
 */
const shellPath = () => (config().cleanUrls ? '/' : '/index.html');

describe('vercel.json routing', () => {
    it('falls back to the shell so client routes survive a direct load', () => {
        const fallback = rewrites().find(r => r.source === '/(.*)');

        expect(fallback, 'no SPA fallback rewrite: deep links will 404').toBeDefined();
        expect(
            fallback!.destination,
            'the fallback must point at a path that actually serves the shell'
        ).toBe(shellPath());
    });

    it('keeps the API rewrite ahead of the fallback', () => {
        // Vercel takes the first matching rewrite, so a fallback placed above
        // /api would swallow every API call and hand back the HTML shell.
        const list = rewrites();
        const api = list.findIndex(r => r.source.startsWith('/api'));
        const fallback = list.findIndex(r => r.source === '/(.*)');

        expect(api).toBeGreaterThanOrEqual(0);
        expect(api).toBeLessThan(fallback);
    });
});
