<template>
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        @click.self="onClose"
    >
        <div class="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden shadow-2xl"
             style="aspect-ratio: 16/9;">
            <button
                @click="onClose"
                class="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                title="Close"
            >
                ✕
            </button>
            <canvas ref="canvasRef" class="w-full h-full block" />
            <div class="absolute bottom-3 left-3 text-xs text-gray-600 select-none pointer-events-none">
                Drag or use arrow keys to rotate
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import type { System, Star } from '../types';
import { getStarHexColor } from '../utils/starHexColors';

const props = defineProps<{
    systems: System[];
    stars: Star[];
    sectorVolume: number;
    onClose: () => void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

let renderer: THREE.WebGLRenderer | null = null;
let animFrameId: number | null = null;

// Spherical camera orbit state
let theta = Math.PI / 4;
let phi = Math.PI / 3;
const RADIUS = 280;
const ROT_SPEED_KEY = 0.04;
const ROT_SPEED_MOUSE = 0.005;

// Mouse drag state
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Active arrow keys
const keysDown = new Set<string>();

onMounted(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const rect = canvas.parentElement!.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 2000);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(W, H, false);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Build star points
    const sectorSide = Math.cbrt(props.sectorVolume);
    const norm = (v: number) => (v / sectorSide) * 200 - 100;

    // Group stars by systemId for multi-star offset
    const starsBySystem = new Map<number, Star[]>();
    for (const star of props.stars) {
        const list = starsBySystem.get(star.systemId) ?? [];
        list.push(star);
        starsBySystem.set(star.systemId, list);
    }

    const systemMap = new Map<number, System>(
        props.systems.map(s => [s.systemId, s])
    );

    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    for (const [systemId, systemStars] of starsBySystem) {
        const system = systemMap.get(systemId);
        if (!system) continue;

        const baseX = norm(system.xPos);
        const baseY = norm(system.yPos);
        const baseZ = norm(system.zPos);

        systemStars.forEach((star, i) => {
            // Offset multi-star systems along X by ~1.5 units per star
            positions.push(baseX + i * 1.5, baseY, baseZ);
            color.setHex(getStarHexColor(star.spectralClass));
            colors.push(color.r, color.g, color.b);
        });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        sizeAttenuation: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Camera position updater
    function updateCamera() {
        camera.position.set(
            RADIUS * Math.sin(phi) * Math.sin(theta),
            RADIUS * Math.cos(phi),
            RADIUS * Math.sin(phi) * Math.cos(theta)
        );
        camera.lookAt(0, 0, 0);
    }

    updateCamera();

    // Animation loop
    function animate() {
        animFrameId = requestAnimationFrame(animate);

        // Handle held arrow keys
        if (keysDown.has('ArrowLeft'))  theta -= ROT_SPEED_KEY;
        if (keysDown.has('ArrowRight')) theta += ROT_SPEED_KEY;
        if (keysDown.has('ArrowUp'))    phi = Math.max(0.1, phi - ROT_SPEED_KEY);
        if (keysDown.has('ArrowDown'))  phi = Math.min(Math.PI - 0.1, phi + ROT_SPEED_KEY);

        if (keysDown.size > 0) updateCamera();

        renderer!.render(scene, camera);
    }
    animate();

    // Mouse events
    function onMouseDown(e: MouseEvent) {
        if (e.button !== 0) return;
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }

    function onMouseMove(e: MouseEvent) {
        if (!isDragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        theta += dx * ROT_SPEED_MOUSE * 2;
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi + dy * ROT_SPEED_MOUSE * 2));
        updateCamera();
    }

    function onMouseUp() {
        isDragging = false;
    }

    function onKeyDown(e: KeyboardEvent) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            keysDown.add(e.key);
        }
    }

    function onKeyUp(e: KeyboardEvent) {
        keysDown.delete(e.key);
    }

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Cleanup registered on unmount
    onUnmounted(() => {
        if (animFrameId !== null) cancelAnimationFrame(animFrameId);
        canvas.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        geometry.dispose();
        material.dispose();
        renderer?.dispose();
    });
});
</script>
