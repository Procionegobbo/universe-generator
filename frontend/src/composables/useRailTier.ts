import { onUnmounted, ref, type Ref } from 'vue';

/**
 * The three responsive homes of the parameter rail (spec §4d):
 *
 * - `sheet`   below 768px — the sticky PARAMETERS sheet opened from MobileActionBar
 * - `drawer`  768–1023px — a collapsible top drawer above the results
 * - `inline`  1024px and up — the side rail (260px, 300px from 1280px)
 *
 * The tier is resolved in JavaScript rather than by Tailwind breakpoint classes
 * so that exactly one host is ever in the DOM. A CSS-only version leaves all
 * three mounted and relies on the stylesheet to hide two of them, which means
 * three live copies of `SectorControls` and no way to assert the hand-over.
 */
export type RailTier = 'sheet' | 'drawer' | 'inline';

/** Spec §4d: the top drawer starts here; the sticky sheet is below it. */
export const DRAWER_MIN_PX = 768;

/** Spec §4d: the inline side rail starts here. */
export const INLINE_MIN_PX = 1024;

export function useRailTier(): { tier: Ref<RailTier> } {
    // Server-rendered there is no viewport, so the documented desktop layout is
    // the default — the same assumption the CSS tiers make with their mobile-up
    // ordering reversed.
    const tier = ref<RailTier>('inline');

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return { tier };
    }

    const drawerUp = window.matchMedia(`(min-width: ${DRAWER_MIN_PX}px)`);
    const inlineUp = window.matchMedia(`(min-width: ${INLINE_MIN_PX}px)`);

    const sync = () => {
        if (inlineUp.matches) tier.value = 'inline';
        else if (drawerUp.matches) tier.value = 'drawer';
        else tier.value = 'sheet';
    };

    sync();
    drawerUp.addEventListener('change', sync);
    inlineUp.addEventListener('change', sync);

    onUnmounted(() => {
        drawerUp.removeEventListener('change', sync);
        inlineUp.removeEventListener('change', sync);
    });

    return { tier };
}
