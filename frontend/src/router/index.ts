import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import SystemDetailView from '../views/SystemDetailView.vue';
import ApiReferenceView from '../views/ApiReferenceView.vue';
import DocumentationView from '../views/DocumentationView.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView
        },
        {
            path: '/system/:id',
            name: 'system-detail',
            component: SystemDetailView
        },
        {
            path: '/api-reference',
            name: 'api-reference',
            component: ApiReferenceView
        },
        {
            path: '/documentation',
            name: 'documentation',
            component: DocumentationView
        }
    ]
});

export default router;
