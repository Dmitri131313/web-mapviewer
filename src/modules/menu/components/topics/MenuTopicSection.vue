<script setup>
import { computed, ref, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStore } from 'vuex'

import LayerCatalogue from '@/modules/menu/components/LayerCatalogue.vue'
import MenuSection from '@/modules/menu/components/menu/MenuSection.vue'
import MenuTopicSelectionPopup from '@/modules/menu/components/topics/MenuTopicSelectionPopup.vue'

const dispatcher = { dispatcher: 'MenuTopicSection.vue' }

const props = defineProps({
    compact: {
        type: Boolean,
        default: false,
    },
})
const { compact } = toRefs(props)

const emit = defineEmits(['openMenuSection', 'closeMenuSection'])
const store = useStore()
const i18n = useI18n()

const menuTopicSection = ref(null)
const showTopicSelectionPopup = ref(false)

// The id needs to be exposed and is used by the MenuTray to close sections.
const sectionId = 'topicsSection'
const currentTopic = computed(() => store.state.topics.current)
const currentTopicTree = computed(() => store.state.topics.tree)
const allTopics = computed(() => store.state.topics.config)
const showTopicTree = computed(() => {
    // // We only want the topic tree open whenever the user has chosen a different topic
    // // than the default one (it can be opened by the user by a click on it, but by default it's closed)
    // // If we have defined catalog themes to be opened in the URL, it makes sense to open the catalog
    // return !isDefaultTopic.value
    return store.state.topics.openedTreeThemesIds.includes(currentTopic.value)
})
const mapModuleReady = computed(() => store.state.app.isMapReady)

function setShowTopicSelectionPopup() {
    showTopicSelectionPopup.value = true
}

function selectTopic(topic) {
    store.dispatch('changeTopic', { topicId: topic.id, ...dispatcher })
    showTopicSelectionPopup.value = false
}

function close() {
    menuTopicSection.value.close()
}

function onOpenMenuTopics(sectionId) {
    emit('openMenuSection', sectionId)
    store.dispatch('addTopicTreeOpenedThemeId', { themeId: currentTopic.value, ...dispatcher })
}

function onCloseMenuTopics(sectionId) {
    emit('closeMenuSection', sectionId)
    store.dispatch('removeTopicTreeOpenedThemeId', { themeId: currentTopic.value, ...dispatcher })
}

defineExpose({ close, id: sectionId })
</script>

<template>
    <MenuSection
        ref="menuTopicSection"
        :section-id="sectionId"
        :title="i18n.t(currentTopic)"
        :show-content="showTopicTree"
        light
        data-cy="menu-topic-section"
        @open-menu-section="onOpenMenuTopics"
        @close-menu-section="onCloseMenuTopics"
    >
        <template #extra-button>
            <button
                class="menu-topic-switch"
                data-cy="change-topic-button"
                @click.stop="setShowTopicSelectionPopup"
            >
                {{ i18n.t('choose_theme') }}
            </button>
            <MenuTopicSelectionPopup
                v-if="showTopicSelectionPopup"
                :topics="allTopics"
                :current-id="currentTopic"
                @select-topic="selectTopic"
                @close="showTopicSelectionPopup = false"
            />
        </template>
        <!-- The topic menu is very performance costly and should only be rendered once the
             map has been rendered, otherwise it would slow down the application startup -->
        <LayerCatalogue
            v-if="mapModuleReady"
            data-cy="menu-topic-tree"
            :layer-catalogue="currentTopicTree"
            :compact="compact"
            :is-topic="true"
        />
    </MenuSection>
</template>

<style lang="scss" scoped>
@import '@/modules/menu/scss/menu-items';

.menu-topic-switch {
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    color: inherit;
    outline: inherit;
    &:hover,
    &:focus {
        text-decoration: underline;
    }
}
</style>
