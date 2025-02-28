<template>
    <div :class="{ 'btn-group': withToggleButton }">
        <button
            :id="withToggleButton ? null : uniqueHtmlId"
            ref="dropdownMainButton"
            :disabled="disabled"
            class="btn btn-light"
            :class="{ 'dropdown-toggle': !withToggleButton }"
            type="button"
            data-cy="dropdown-main-button"
            :data-bs-toggle="withToggleButton ? null : 'dropdown'"
            :aria-expanded="false"
            @click="onMainButtonClick"
        >
            {{ title }}
        </button>
        <button
            v-if="withToggleButton"
            :id="uniqueHtmlId"
            ref="dropdownToggleButton"
            :disabled="disabled"
            type="button"
            class="btn btn-light dropdown-toggle dropdown-toggle-split dropdown-button-carret"
            data-cy="dropdown-toggle-button"
            data-bs-toggle="dropdown"
            data-bs-reference="parent"
            :aria-expanded="false"
        >
            <span class="visually-hidden">Toggle Dropdown</span>
        </button>
        <ul ref="dropdownMenu" class="dropdown-menu" :aria-labelledby="uniqueHtmlId">
            <li v-for="item in items" :key="item.id">
                <a
                    class="dropdown-item"
                    :class="{ active: currentValue === item.value }"
                    :data-tippy-content="item.description"
                    :data-cy="`dropdown-item-${item.id}`"
                    @click="selectItem(item)"
                >
                    {{ item.title }}
                </a>
            </li>
        </ul>
    </div>
</template>

<script>
import { Dropdown } from 'bootstrap'

import { useTippyTooltip } from '@/utils/composables/useTippyTooltip'
import { randomIntBetween } from '@/utils/numberUtils'

/**
 * Represents an option in the select made for a dropdown. If no value is given, the title of the
 * item will be considered the value.
 */
export class DropdownItem {
    constructor(id, title, value = null, description = null) {
        this._id = id
        this._title = title
        this._value = value || title
        this._description = description
    }

    get id() {
        return this._id
    }

    get title() {
        return this._title
    }
    get value() {
        return this._value
    }
    get description() {
        return this._description
    }
}

/**
 * Manages a Bootstrap dropdown.
 *
 * All items must be passed as instances of DropdownItem (imported from the same file as the
 * component). The active item (the one with the .active CSS class) will be defined by comparing the
 * props `currentValue` with each item's value.
 *
 * It is possible to have the dropdown attached to an extra button with a caret, instead of all
 * inline. For that you have to add the with-toggle-button HTML attribute to the component use
 */
export default {
    props: {
        title: {
            type: String,
            required: true,
        },
        currentValue: {
            type: [Object, String, Number, Boolean, null],
            required: true,
        },
        items: {
            type: Array,
            required: true,
            validator: (items) => {
                // checking that we received an array of only DropdownItem instances with at least one item
                if (Array.isArray(items) && items.length > 1) {
                    return (
                        items.filter((item) => item instanceof DropdownItem).length === items.length
                    )
                }
                return false
            },
        },
        withToggleButton: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['click', 'select:item'],
    setup() {
        useTippyTooltip('.dropdown-item[data-tippy-content]', { placement: 'left' })
    },
    data() {
        return {
            // generating a unique HTML ID for this dropdown
            uniqueHtmlId: `dropdown-${randomIntBetween(0, 10000)}`,
        }
    },
    watch: {
        disabled(isDisabled) {
            if (isDisabled) {
                // hiding the dropdown body if component becomes disabled
                this.$refs.dropdownMenu.classList.remove('show')
            }
        },
    },
    mounted() {
        if (this.withToggleButton) {
            this.dropdown = new Dropdown(this.$refs.dropdownToggleButton)
        } else {
            this.dropdown = new Dropdown(this.$refs.dropdownMainButton)
        }
    },
    beforeUnmount() {
        this.dropdown.dispose()
        delete this.dropdown
    },
    methods: {
        onMainButtonClick() {
            if (this.withToggleButton) {
                // letting the parent component handle what to do by sending an event
                this.$emit('click')
            }
        },
        selectItem(item) {
            this.$emit('select:item', item)
        },
    },
}
</script>

<style lang="scss" scoped>
.dropdown-item {
    cursor: pointer;
}
.dropdown-button-carret {
    max-width: fit-content;
}
</style>
