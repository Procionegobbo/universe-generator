import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import SystemDetailView from '../views/SystemDetailView.vue';
import ApiReferenceView from '../views/ApiReferenceView.vue';
import DocumentationView from '../views/DocumentationView.vue';

// The sector lives in the first path segment, so no navigation can drop it the
// way a query string was dropped by every `router.push('/path')`.
//
// Static paths are declared before `/:sid` for the reader; Vue Router's own
// ranking already prefers a static segment over a dynamic one, so
// `/documentation` can never be read as a sid whatever the order here.
//
// There is deliberately no legacy handling: no redirect, no `beforeEnter`, and
// nothing anywhere that reads the old seed/zone/systems/volume query form. An
// old `/system/66` link falls through to the catch-all, which `useSectorLink`
// fails soft exactly as it fails an unreadable sid — one path, never a blank
// page.
const routes: RouteRecordRaw[] = [
    {
        path: '/documentation',
        name: 'documentation',
        component: DocumentationView
    },
    {
        path: '/api-reference',
        name: 'api-reference',
        component: ApiReferenceView
    },
    {
        path: '/',
        name: 'home',
        component: HomeView
    },
    {
        path: '/:sid',
        name: 'sector',
        component: HomeView
    },
    {
        path: '/:sid/system/:id',
        name: 'system-detail',
        component: SystemDetailView
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: HomeView
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
