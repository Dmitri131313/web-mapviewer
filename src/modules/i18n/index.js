import { createI18n } from 'vue-i18n'

import de from './locales/de.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import it from './locales/it.json'
import rm from './locales/rm.json'

export const languages = { de, fr, it, en, rm }

const locales = Object.entries(languages).reduce((obj, entry) => {
    const key = langToLocal(entry[0])
    obj[key] = entry[1]
    return obj
}, {})

export function langToLocal(lang) {
    return ['de', 'fr', 'it', 'rm'].includes(lang) ? `${lang}-CH` : lang
}

export function localToLang(local) {
    return local.split('-')[0]
}

// detecting navigator's locale as the default language
// (if it is a language served by this app)
export const defaultLocal =
    navigator.languages?.find((local) => Object.keys(locales).includes(local)) ?? 'en'

const datetimeFormats = Object.keys(locales).reduce((obj, key) => {
    obj[key] = {
        date: { year: 'numeric', month: 'numeric', day: 'numeric' },
        datetime: {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        },
    }
    return obj
}, {})

const i18n = createI18n({
    locale: defaultLocal,
    messages: languages,
    legacy: false,
    datetimeFormats,
})

export default i18n
