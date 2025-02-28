<script setup>
import { computed, defineAsyncComponent, inject, onBeforeMount, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'

import { useLayerZIndexCalculation } from '@/modules/map/components/common/z-index.composable'
import OpenLayersAccuracyCircle from '@/modules/map/components/openlayers/OpenLayersAccuracyCircle.vue'
import OpenLayersMarker from '@/modules/map/components/openlayers/OpenLayersMarker.vue'
import OpenLayersVisionCone from '@/modules/map/components/openlayers/OpenLayersVisionCone.vue'
import { OpenLayersMarkerStyles } from '@/modules/map/components/openlayers/utils/markerStyle'
import useDeviceOrientation from '@/modules/map/components/openlayers/utils/useDeviceOrientation.composable'
import log from '@/utils/logging'
import { isNumber, round } from '@/utils/numberUtils'

const OpenLayersDeviceOrientationDebugInfo = defineAsyncComponent(
    () =>
        import('@/modules/map/components/openlayers/debug/OpenLayersDeviceOrientationDebugInfo.vue')
)

const dispatcher = { dispatcher: 'OpenLayersGeolocationFeedback.vue' }

const olMap = inject('olMap')

const store = useStore()
const { zIndexGeolocation } = useLayerZIndexCalculation()
const { heading, headingDegree, orientation, orientationSampled } = useDeviceOrientation()

const hasDevSiteWarning = computed(() => store.getters.hasDevSiteWarning)
const geolocationPosition = computed(() => store.state.geolocation.position)
const isTracking = computed(() => store.state.geolocation.tracking)
const hasOrientation = computed(() => store.state.position.hasOrientation)

const orientationParameters = computed(() => {
    return [
        {
            title: 'Default listener',
            parameters: [
                { key: 'Absolute', value: `${orientation.value.default.absolute}` },
                { key: 'Alpha', value: roundIfNumber(orientation.value.default.degree, 2) },
                {
                    key: 'Alpha Sampled',
                    value: roundIfNumber(orientationSampled.value.default.degree, 0),
                },
                {
                    key: 'webkitCompassHeading Sampled',
                    value: roundIfNumber(orientationSampled.value.default.compassHeading, 0),
                },
            ],
        },
        {
            title: 'Absolute listener',
            parameters: [
                { key: 'Alpha', value: roundIfNumber(orientation.value.absolute.degree, 2) },
                {
                    key: 'Alpha Sampled',
                    value: roundIfNumber(orientationSampled.value.absolute.degree, 0),
                },
                {
                    key: 'webkitCompassHeading Sampled',
                    value: roundIfNumber(orientationSampled.value.absolute.compassHeading, 0),
                },
            ],
        },
        {
            title: 'Heading',
            parameters: [
                { key: 'Heading degree', value: roundIfNumber(headingDegree.value, 0) },
                { key: 'Heading radian', value: roundIfNumber(heading.value, 6) },
            ],
        },
        {
            title: 'User Agent',
            parameters: [{ value: navigator.userAgent, hasCopyBtn: true }],
        },
        {
            title: 'Vendor',
            parameters: [{ value: navigator.vendor, hasCopyBtn: true }],
        },
    ]
})

// To avoid re-centering the map on the position, we need to listen to movestart event, because
// the center in store is set during the moveend event, so this means that if we disable tracking
// by using the store event, it can lead to race condition when moving the map between the
// moveend event and the geolocation event.
onBeforeMount(() => olMap.on('pointerdrag', disableTrackingAndAutoRotation))
onBeforeUnmount(() => olMap.un('pointerdrag', disableTrackingAndAutoRotation))

const roundIfNumber = (v, d) => (isNumber(v) ? round(v, d) : `${v}`)

function disableTrackingAndAutoRotation(event) {
    if (isTracking.value) {
        // When the map has been dragged we disabled geolocation tracking to avoid to re-center the
        // map when the user want to have something else in the center. Also disabled the auto rotation
        // because auto rotation rotate the map using the position as center and it doesn't make sense
        // to rotate if the location is not centered (this is also the same behavior as on the swisstopo
        // app)
        log.debug(`Map started moving, disabled geolocation tracking and autorotation`, event)
        store.dispatch('setGeolocationTracking', {
            tracking: false,
            ...dispatcher,
        })
        store.dispatch('setAutoRotation', { autoRotation: false, ...dispatcher })
    }
}
</script>

<template>
    <!-- Adding marker and accuracy circle for Geolocation -->
    <OpenLayersAccuracyCircle :z-index="zIndexGeolocation" />
    <OpenLayersVisionCone
        v-if="hasOrientation && geolocationPosition"
        :z-index="zIndexGeolocation + 1"
        :effective-heading="heading"
    />
    <div v-if="hasDevSiteWarning">
        <OpenLayersDeviceOrientationDebugInfo :parameters="orientationParameters" />
    </div>
    <OpenLayersMarker
        :position="geolocationPosition"
        :marker-style="OpenLayersMarkerStyles.POSITION"
        :z-index="zIndexGeolocation + 2"
    />
</template>
