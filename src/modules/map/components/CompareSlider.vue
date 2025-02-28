<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { unByKey } from 'ol/Observable'
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStore } from 'vuex'

import log from '@/utils/logging'
import { round } from '@/utils/numberUtils'

const dispatcher = { dispatcher: 'CompareSlider.vue' }

const olMap = inject('olMap')

const preRenderKey = ref(null)
const postRenderKey = ref(null)
const compareSliderOffset = ref(0)
const showLayerName = ref(false)

const compareRatio = ref(-0.5)
const store = useStore()
const storeCompareRatio = computed(() => store.state.ui.compareRatio)
const isCompareSliderActive = computed(() => store.state.ui.isCompareSliderActive)
const clientWidth = computed(() => store.state.ui.width)
const compareSliderPosition = computed(() => {
    return {
        left: compareRatio.value * 100 + '%',
    }
})
const visibleLayerOnTop = computed(() => store.getters.visibleLayerOnTop)
const visibleLayers = computed(() => store.getters.visibleLayers)

watch(storeCompareRatio, (newValue) => {
    compareRatio.value = newValue
    slice()
})

watch(visibleLayers, () => {
    nextTick(slice)
})

onMounted(() => {
    compareRatio.value = storeCompareRatio.value
    nextTick(slice)
})

onUnmounted(() => {
    compareRatio.value = storeCompareRatio.value

    slice()
})

function slice() {
    if (preRenderKey.value != null && postRenderKey.value != null) {
        unByKey(preRenderKey.value)
        unByKey(postRenderKey.value)
        preRenderKey.value = null
        postRenderKey.value = null
    }
    const topVisibleLayer = olMap
        ?.getAllLayers()
        .toSorted((a, b) => b.get('zIndex') - a.get('zIndex'))
        .find((layer) => layer.get('id') === visibleLayerOnTop.value?.id)
    log.debug(`Compare slider slicing`, topVisibleLayer, visibleLayerOnTop.value)
    if (topVisibleLayer && isCompareSliderActive.value) {
        preRenderKey.value = topVisibleLayer.on('prerender', onPreRender)
        postRenderKey.value = topVisibleLayer.on('postrender', onPostRender)
    }
    olMap.render()
}

function onPreRender(event) {
    const ctx = event.context
    // the offset is there to ensure we get to the slider line, and not the border of the element
    let width = ctx.canvas.width
    if (compareRatio.value < 1.0 && compareRatio.value > 0.0) {
        width = ctx.canvas.width * compareRatio.value
    }

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, width, ctx.canvas.height)
    ctx.clip()
}

function onPostRender(event) {
    event.context.restore()
}

function grabSlider(event) {
    window.addEventListener('mousemove', listenToMouseMove, { passive: true })
    window.addEventListener('touchmove', listenToMouseMove, { passive: true })
    window.addEventListener('mouseup', releaseSlider, { passive: true })
    window.addEventListener('touchend', releaseSlider, { passive: true })
    if (event.type === 'touchstart') {
        compareSliderOffset.value =
            event.touches[0].clientX - compareRatio.value * clientWidth.value
    } else {
        compareSliderOffset.value = event.clientX - compareRatio.value * clientWidth.value
    }
}

function listenToMouseMove(event) {
    let currentPosition
    if (event.type === 'touchmove') {
        currentPosition = event.touches[0].clientX - compareSliderOffset.value
    } else {
        currentPosition = event.clientX - compareSliderOffset.value
    }
    // we ensure the slider can't get off the screen
    if (currentPosition < 14) {
        currentPosition = 14
    }
    // same on the other side, but with also the idea of keeping the cartes completely in the screen
    if (currentPosition > clientWidth.value - 14) {
        currentPosition = clientWidth.value - 14
    }

    compareRatio.value = round(currentPosition / clientWidth.value, 3)
    olMap.render()
}

function releaseSlider() {
    window.removeEventListener('mousemove', listenToMouseMove)
    window.removeEventListener('touchmove', listenToMouseMove)
    window.removeEventListener('mouseup', releaseSlider)
    window.removeEventListener('touchend', releaseSlider)
    compareSliderOffset.value = 0
    store.dispatch('setCompareRatio', {
        compareRatio: compareRatio.value,
        ...dispatcher,
    })
}
</script>

<template>
    <div
        class="compare-slider position-absolute top-0 translate-middle-x h-100 d-inline-block"
        data-cy="compareSlider"
        :style="compareSliderPosition"
        @touchstart.passive="grabSlider"
        @mousedown.passive="grabSlider"
        @mouseenter="showLayerName = true"
        @mouseleave="showLayerName = false"
    >
        <FontAwesomeIcon
            class="compare-slider-caret-left bg-primary text-white rounded-start"
            :icon="['fas', 'caret-left']"
        />
        <div class="compare-slider-line"></div>
        <FontAwesomeIcon
            class="compare-slider-caret-right bg-primary text-white rounded-end"
            :icon="['fas', 'caret-right']"
        />
        <div v-if="showLayerName" class="compare-slider-layer-name">
            <FontAwesomeIcon icon="arrow-left" class="me-1" />
            <strong>{{ visibleLayerOnTop.name }}</strong>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import '@/scss/webmapviewer-bootstrap-theme';
@import '@/scss/media-query.mixin';

.compare-slider {
    width: 40px;
    z-index: $zindex-compare-slider;
    cursor: ew-resize;
    &-caret-left,
    &-caret-right {
        position: inherit;
        top: 50%;
        z-index: inherit;
        padding: 2px 6px;
    }
    &-caret-right {
        translate: 20px;
    }
    &-line {
        position: relative;
        margin: auto;
        width: 4px;
        height: 100%;
        background: $primary;
        z-index: inherit;
    }
    &-layer-name {
        position: absolute;
        width: 120px;
        z-index: $zindex-compare-slider;
        bottom: $screen-padding-for-ui-elements;
        background: $white;
        right: 30px;
        padding: 0.2rem 0.4rem;
        font-size: 0.8rem;
    }
}

@include respond-above(phone) {
    .compare-slider {
        &-layer-name {
            bottom: calc($screen-padding-for-ui-elements + $footer-height);
        }
    }
}
</style>
