/**
 * A description of one URL param that needs synchronization with the app {@link Vuex.Store} with
 * some helper functions.
 *
 * For simple use cases, please use {@link SimpleUrlParamConfig}, otherwise you can extend this
 * class and do some advanced processing with store syncing. (see {@link LayerParamConfig} as an example)
 *
 * @abstract
 */
export default class AbstractParamConfig {
    /**
     * @param {String} urlParamName The name of the param found in the URL (e.g. 'lat' will then be
     *   https://.../?lat=value in the URL
     * @param {String} mutationsToWatch The names of the Vuex's store mutations to watch for value
     *   synchronization (separated by a coma)
     * @param {Function} setValuesInStore A function taking the store and the current URL value as
     *   params. It needs to dispatch the value of this param to the store. It must return a promise
     *   that will be resolve when the store has finished processing the dispatch.
     * @param {Function} extractValueFromStore A function taking the store in param that needs to
     *   return the value of this param found in the store
     * @param {Boolean} keepValueInUrlWhenEmpty Tells the URL manager if this param should still be
     *   added to the URL even though its value is empty. Empty means `null` or `false` for Boolean.
     * @param {NumberConstructor | StringConstructor | BooleanConstructor, ObjectConstructor} valueType
     */
    constructor(
        urlParamName,
        mutationsToWatch,
        setValuesInStore,
        extractValueFromStore,
        keepValueInUrlWhenEmpty = true,
        valueType = String
    ) {
        this.urlParamName = urlParamName
        this.mutationsToWatch = mutationsToWatch
        this.setValuesInStore = setValuesInStore
        this.extractValueFromStore = extractValueFromStore
        this.keepValueInUrlWhenEmpty = keepValueInUrlWhenEmpty
        this.valueType = valueType
    }

    /**
     * Reads the value from the given Vue router query (part of {@link RouterLink})
     *
     * @param {Object} query An object describing the route URL param
     * @returns {undefined | number | string | boolean} The value casted in the type given to the
     *   config (see constructor)
     */
    readValueFromQuery(query) {
        if (query && (this.urlParamName in query || !this.keepValueInUrlWhenEmpty)) {
            const queryValue = query[this.urlParamName]
            // Edge case here in Javascript with Boolean constructor, Boolean('false') returns true as the "object" we passed
            // to the constructor is valid and non-null. So we manage that "the old way" for booleans
            if (this.valueType === Boolean) {
                if (!this.keepValueInUrlWhenEmpty && typeof queryValue === 'undefined') {
                    return false
                } else {
                    return (
                        (typeof queryValue === 'string' && queryValue === 'true') ||
                        (typeof queryValue === 'boolean' && !!queryValue)
                    )
                }
            } else if (!(this.urlParamName in query) && !this.keepValueInUrlWhenEmpty) {
                if (this.valueType === Number) {
                    return 0
                } else if (this.valueType === String) {
                    return ''
                }
            } else {
                // if not a boolean, we can trust the other constructor (Number, String) to return a valid value whenever it is possible with the String input
                return this.valueType(queryValue)
            }
        }
        return undefined
    }

    /**
     * Reads the value from the given Vue store, and cast it in the type given in the constructor
     *
     * @param store A {@link Vuex.Store}
     * @returns {undefined | number | string | boolean} The value casted in the type given in the
     *   config (see constructor)
     */
    readValueFromStore(store) {
        if (store && this.extractValueFromStore) {
            return this.valueType(this.extractValueFromStore(store))
        }
        return undefined
    }

    valuesAreDifferentBetweenQueryAndStore(query, store) {
        return this.readValueFromQuery(query) !== this.readValueFromStore(store)
    }

    /**
     * Adds the value of the store to the query object
     *
     * @param {Object} query Simple Object that holds all URL parameters (key is the name of param
     *   in the URL, value is its value)
     * @param {Vuex.Store} store
     */
    populateQueryWithStoreValue(query, store) {
        if (query && this.urlParamName && this.urlParamName.length > 0) {
            const valueFromStore = this.readValueFromStore(store)
            // checking first if when the value is empty it should stay in the query or not
            if (!this.keepValueInUrlWhenEmpty) {
                // with boolean, if the value of the flag is false we simply don't add it to the URL's param (or remove it if present)
                // with String, if the value is an empty string, we also don't add it to the URL (or remove it if present)
                if (
                    this.urlParamName in query &&
                    ((this.valueType === Boolean && !valueFromStore) ||
                        (this.valueType === String && valueFromStore === ''))
                ) {
                    delete query[this.urlParamName]
                }
            } else {
                // if the value is staying in the query anyway, we add it regardless of the actual value
                query[this.urlParamName] = valueFromStore
            }
        }
    }

    /**
     * Sets the store values according to the URL. Returns a promise that will resolve when the
     * store is up to date.
     *
     * @param {Vuex.Store} store
     * @param {Object | String | Number | Boolean | null} query The value found in the query
     * @returns {Promise<any>}
     */
    populateStoreWithQueryValue(store, query) {
        return new Promise((resolve, reject) => {
            if (query && store && this.setValuesInStore) {
                const promiseSetValuesInStore = this.setValuesInStore(store, query)
                if (promiseSetValuesInStore) {
                    promiseSetValuesInStore.then(() => {
                        resolve()
                    })
                } else {
                    resolve()
                }
            } else {
                reject('Query, store or setter functions is not set')
            }
        })
    }
}
