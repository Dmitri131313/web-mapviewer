<template>
    <div>
        <button
            ref="popoverButton"
            class="btn btn-sm btn-light d-flex align-items-center"
            :class="[buttonClassOptions ? buttonClassOptions : '']"
        >
            <FontAwesomeIcon :icon="icon" />
        </button>
        <div ref="popoverContent" class="card border-0" data-cy="drawing-style-popover">
            <div
                class="card-header d-flex align-items-center"
                :class="{
                    'justify-content-between': popoverTitle,
                    'justify-content-end': !popoverTitle,
                }"
            >
                <span v-if="popoverTitle">
                    {{ popoverTitle }}
                </span>
                <button
                    class="btn btn-sm btn-light d-flex align-items-center"
                    data-cy="close-popover-button"
                    @click="hidePopover"
                >
                    <FontAwesomeIcon icon="times" />
                </button>
            </div>
            <div class="popover-content card-body rounded-bottom">
                <slot />
            </div>
        </div>
    </div>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import tippy from 'tippy.js'

export default {
    components: { FontAwesomeIcon },
    props: {
        /** The button should have either a title or icons (or both) */
        icon: {
            type: String,
            default: 'pen',
        },
        popoverTitle: {
            type: String,
            default: null,
        },
        buttonClassOptions: {
            type: String,
            default: null,
        },
        placement: {
            type: String,
            default: 'auto',
        },
    },
    watch: {
        placement(newValue) {
            this.popover.setProps({ placement: newValue })
        },
    },
    mounted() {
        this.popover = tippy(this.$refs.popoverButton, {
            theme: 'popover-button light-border',
            content: this.$refs.popoverContent,
            allowHTML: true,
            placement: this.placement,
            interactive: true,
            arrow: true,
            trigger: 'click',
            // We need a large popover to display the BABS icon set label which is quite big, see
            // modify_icon_category_babs_label
            maxWidth: 450,
        })
    },
    beforeUnmount() {
        this.popover.destroy()
    },
    methods: {
        /** Hides the popover container, can be called outside (by this component's parent) */
        hidePopover() {
            this.popover.hide()
        },
    },
}
</script>
