<script setup>
import { computed, ref } from 'vue'
import { useStore } from 'vuex'

import { APP_VERSION } from '@/config/staging.config'

const store = useStore()
const appVersion = ref(APP_VERSION)

const isProd = computed(() => store.getters.isProductionSite)
</script>

<template>
    <div class="app-version" :class="{ 'app-version-prod': isProd }" data-cy="app-version">
        {{ appVersion }}
    </div>
</template>

<style lang="scss" scoped>
@import '@/scss/webmapviewer-bootstrap-theme';

.app-version {
    color: $gray-800;
}

.app-version-prod {
    color: $gray-500;
}
</style>
