import { View } from 'ol'
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useStore } from 'vuex'

import { IS_TESTING_WITH_CYPRESS, VIEW_MIN_RESOLUTION } from '@/config'
import { LV95, WEBMERCATOR } from '@/utils/coordinates/coordinateSystems'
import { LV95_RESOLUTIONS } from '@/utils/coordinates/SwissCoordinateSystem.class'
import log from '@/utils/logging'
import { round } from '@/utils/numberUtils'

let animationDuration = 200
if (IS_TESTING_WITH_CYPRESS) {
    animationDuration = 0
}

export default function useViewBasedOnProjection(map) {
    const store = useStore()
    const center = computed(() => store.state.position.center)
    const projection = computed(() => store.state.position.projection)
    const zoom = computed(() => store.state.position.zoom)
    const rotation = computed(() => store.state.position.rotation)

    const viewsForProjection = {}
    viewsForProjection[LV95.epsg] = new View({
        zoom: zoom.value,
        minResolution: VIEW_MIN_RESOLUTION,
        rotation: rotation.value,
        resolutions: LV95_RESOLUTIONS,
        projection: LV95.epsg,
        extent: LV95.bounds.flatten,
        constrainOnlyCenter: true,
    })
    viewsForProjection[WEBMERCATOR.epsg] = new View({
        zoom: zoom.value,
        minResolution: VIEW_MIN_RESOLUTION,
        rotation: rotation.value,
        projection: WEBMERCATOR.epsg,
    })

    watch(projection, setViewAccordingToProjection)
    watch(center, (newCenter) =>
        viewsForProjection[projection.value.epsg].animate({
            center: newCenter,
            duration: animationDuration,
        })
    )
    watch(zoom, (newZoom) =>
        viewsForProjection[projection.value.epsg].animate({
            zoom: newZoom,
            duration: animationDuration,
        })
    )
    watch(rotation, (newRotation) =>
        viewsForProjection[projection.value.epsg].animate({
            rotation: newRotation,
            duration: animationDuration,
        })
    )

    onMounted(() => {
        setViewAccordingToProjection()
        map.on('moveend', updateCenterInStore)
    })
    onBeforeUnmount(() => {
        map.un('moveend', updateCenterInStore)
    })

    function setViewAccordingToProjection() {
        const viewForProjection = viewsForProjection[projection.value.epsg]
        if (viewForProjection) {
            viewForProjection.setCenter(center.value)
            map.setView(viewForProjection)
        } else {
            log.error('View for projection was not found', projection.value)
        }
    }
    function updateCenterInStore() {
        const currentView = viewsForProjection[projection.value.epsg]
        if (currentView) {
            const [x, y] = currentView.getCenter()
            if (x !== center.value[0] || y !== center.value[1]) {
                store.dispatch('setCenter', { x, y })
            }
            const currentZoom = round(currentView.getZoom(), 3)
            if (currentZoom && currentZoom !== zoom.value) {
                store.dispatch('setZoom', currentZoom)
            }
            const currentRotation = currentView.getRotation()
            if (currentRotation !== rotation.value) {
                store.dispatch('setRotation', currentRotation)
            }
        }
    }
}
