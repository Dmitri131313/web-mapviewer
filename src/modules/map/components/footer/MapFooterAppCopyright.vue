<template>
    <a
        v-for="(link, index) in links"
        :key="index"
        :href="link.url"
        target="_blank"
        :data-cy="`app-copyright-${index}`"
    >
        {{ $t(link.label) }}
    </a>
</template>

<script>
export default {
    computed: {
        links() {
            return [
                {
                    label: 'ech_service_link_label',
                    url: this.$t('ech_service_link_href'),
                },
                {
                    label: 'copyright_label',
                    url: this.$t('copyright_url'),
                },
                {
                    label: 'legal_notice',
                    url: this.$t('legal_notice_url'),
                },
            ]
        },
    },
}
</script>

<style lang="scss" scoped>
@import '@/scss/variables-admin.module';
a {
    color: $black;
    text-decoration: initial;
}
a:hover,
a:focus {
    text-decoration: underline;
}
</style>
