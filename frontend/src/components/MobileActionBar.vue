<template>
    <div
        class="sticky bottom-0 z-30 flex gap-[9px] border-t border-line-strong px-[14px] py-3 md:hidden"
        style="background: #0d1526"
    >
        <button
            type="button"
            class="ug-btn-outline flex-1 p-[13px]"
            style="font-size: 11px; font-weight: 600"
            @click="emit('open-parameters')"
        >
            PARAMETERS ▲
        </button>
        <button
            type="button"
            class="ug-btn-primary flex-1 p-[13px]"
            style="font-size: 11px; letter-spacing: .08em"
            :disabled="disabled"
            @click="emit('generate')"
        >
            GENERATE
        </button>
    </div>
</template>

<script setup lang="ts">
defineProps<{ disabled?: boolean }>();

const emit = defineEmits<{
    'open-parameters': [];
    generate: [];
}>();
</script>
