import AbstractParamConfig from '@/router/storeSync/abstractParamConfig.class'

/**
 * Definition of an Url parameter which needs to be synced with the store,
 * but which doesn't change the url when the store itself change
 *
 * To achieve this, the extract Value from Store parameter is set to a function
 * that always return 'null'
 */

export default class QueryToStoreOnlyParamConfig extends AbstractParamConfig {
    /**
     * @param {String} urlParamName The name of the param found in the URL (e.g. 'lat' will then be
     *   https://.../?lat=value in the URL
     * @param {String} mutationsToWatch The names of the Vuex's store mutations to watch for value
     *   synchronization (separated by a coma)
     * @param {String} dispatchChangeTo The name of the Vuex's store action where to publish changes
     *   made in the URL
     * @param {Boolean} keepInUrlWhenDefault Tells the URL manager if this param should still be
     *   added to the URL even though its value is set to the default value of the param.
     * @param {NumberConstructor | StringConstructor | BooleanConstructor} valueType
     */
    constructor(
        urlParamName,
        mutationsToWatch,
        dispatchChangeTo,
        keepInUrlWhenDefault = false,
        valueType = String,
        defaultValue = null
    ) {
        super(
            urlParamName,
            mutationsToWatch,
            (store, urlParamValue) => store.dispatch(dispatchChangeTo, urlParamValue),
            () => null,
            keepInUrlWhenDefault,
            valueType,
            defaultValue
        )
    }
    populateQueryWithStoreValue(query, store) {}
}