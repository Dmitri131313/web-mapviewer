import { API_BASE_URL, WMTS_BASE_URL, WMS_BASE_URL } from '@/config'
import axios from 'axios'
import log from '@/utils/logging'

// API file that covers the backend endpoint http://api3.geo.admin.ch/rest/services/all/MapServer/layersConfig
// TODO : implement loading of a cached CloudFront version for MVP

/**
 * @readonly
 * @enum {String}
 */
export const LayerTypes = {
    WMTS: 'wmts',
    WMS: 'wms',
    GEOJSON: 'geojson',
    AGGREGATE: 'aggregate',
}

/**
 * @class
 * @name layers:TimeConfig Time configuration for a {@link WMTSLayer} or {@link WMSLayer}. It will
 *   determine which "timestamp" to add to the URL used to request tiles/image.
 */
export class TimeConfig {
    /**
     * @param {String} behaviour How the default time series is chosen
     * @param {String[]} series List of series identifier (that can be placed in the WMTS URL)
     */
    constructor(behaviour = null, series = []) {
        this.behaviour = behaviour
        this.series = [...series]
        // first let's tackle layers that have "last" as a timestamp (can be both WMS and WMTS layers)
        // we will return, well, the last timestamp of the series (if there are some)
        if (this.behaviour === 'last' && this.series.length > 0) {
            this.currentTimestamp = this.series[0]
        } else if (this.behaviour) {
            // otherwise if it is a layer that has a specific behaviour (could be "all" for WMS, or a specific timestamp for either type)
            this.currentTimestamp = this.behaviour
        } else if (this.series.length > 0) {
            // if nothing has been defined in the behaviour, but there are some timestamps defined, we take the first
            this.currentTimestamp = this.series[0]
        } else {
            // if no behaviour and no timestamp are defined, we go for "current". This should not happen with WMS layer,
            // as the "current" timestamp in not supported for them but they should always define a behaviour in
            // the BOD configuration, so this is for WMTS layer without time configuration
            this.currentTimestamp = 'current'
        }
    }
}

/**
 * @abstract
 * @class
 * @name layers:Layer Base class for Layer config description, must be extended to a more specific
 *   flavor of Layer (e.g. {@link WMTSLayer}, {@link WMSLayer}, {@link GeoJsonLayer} or {@link
 *   AggregateLayer})
 */
export class Layer {
    /**
     * @param {String} name Name of this layer in the current lang
     * @param {LayerTypes} type See {@link LayerTypes}
     * @param {String} id The BOD ID of this layer that will be used to request the backend
     * @param {Number} opacity Value from 0.0 to 1.0 telling with which opacity this layer should be
     *   shown on the map
     * @param {Boolean} isBackground If this layer is to be used as a background layer or not
     *   (background layer are stored in the background wheel on the side of the UI)
     * @param {String} baseURL What's the backend base URL to use when requesting tiles/image for
     *   this layer, will be used to construct the URL of this layer later on (if null, the default
     *   WMS/WMTS backend URL will be used)
     * @param {Boolean} isHighlightable Tells if this layer possess features that should be
     *   highlighted on the map after a click (and if the backend will provide valuable information
     *   on the {@link http://api3.geo.admin.ch/services/sdiservices.html#identify-features} endpoint)
     * @param {Boolean} hasTooltip Define if this layer shows tooltip when clicked on
     * @param {String[]} topics All the topics in which belongs this layer
     */
    constructor(
        name = '',
        type = null,
        id = '',
        opacity = 1.0,
        isBackground = false,
        baseURL = null,
        isHighlightable = false,
        hasTooltip = false,
        topics = []
    ) {
        this.name = name
        this.type = type
        this.id = id
        this.opacity = opacity
        this.isBackground = isBackground
        this.baseURL = baseURL
        if (this.baseURL && !this.baseURL.endsWith('/')) {
            this.baseURL = this.baseURL + '/'
        }
        this.isHighlightable = isHighlightable
        this.hasTooltip = hasTooltip
        this.topics = topics
        this.isSpecificFor3D = id.toLowerCase().endsWith('_3d')
        this.visible = false
        this.projection = 'EPSG:3857'
    }

    /**
     * @abstract
     * @returns {String} The URL to use to request tile/image/data for this layer
     */
    getURL() {
        throw new Error('You have to implement the method getURL!')
    }

    /**
     * Returns which topic should be used in URL that needs one topic to be defined (identify or
     * htmlPopup for instance). By default and whenever possible, the viewer should use `ech`. If
     * `ech` is not present in the topics, the first of them should be used to request the backend.
     *
     * @returns {String} The topic to use in request to the backend for this layer
     */
    getTopicForIdentifyAndTooltipRequests() {
        // by default, the frontend should always request `ech`, so if there's no topic that's what we do
        // if there are some topics, we look if `ech` is one of them, if so we return it
        if (this.topics.length === 0 || this.topics.indexOf('ech') !== -1) {
            return 'ech'
        }
        // otherwise we return the first topic to make our backend requests for identify and htmlPopup
        return this.topics[0]
    }
}

/** Metadata for a tiled image layers (WMTS stands for Web Map Tile Service) */
export class WMTSLayer extends Layer {
    /**
     * @param {String} name Layer name (internationalized)
     * @param {String} id Layer ID in the BOD
     * @param {Number} opacity Opacity value between 0.0 (transparent) and 1.0 (visible)
     * @param {String} format Image format for this WMTS layer (jpeg or png)
     * @param {TimeConfig} timeConfig Settings telling which timestamp has to be used when request
     *   tiles to the backend
     * @param {Boolean} isBackground If this layer should be treated as a background layer
     * @param {String} baseURL The base URL to be used to request tiles (can use the {0-9} notation
     *   to describe many available backends)
     * @param {Boolean} isHighlightable Tells if this layer possess features that should be
     *   highlighted on the map after a click (and if the backend will provide valuable information
     *   on the {@link http://api3.geo.admin.ch/services/sdiservices.html#identify-features} endpoint)
     * @param {Boolean} hasTooltip Define if this layer shows tooltip when clicked on
     * @param {String[]} topics All the topics in which belongs this layer
     */
    constructor(
        name = '',
        id = '',
        opacity = 1.0,
        format = 'png',
        timeConfig = null,
        isBackground = false,
        baseURL = null,
        isHighlightable = false,
        hasTooltip = false,
        topics = []
    ) {
        super(
            name,
            LayerTypes.WMTS,
            id,
            opacity,
            isBackground,
            baseURL,
            isHighlightable,
            hasTooltip,
            topics
        )
        this.format = format
        this.timeConfig = timeConfig
    }

    /** @returns {String} A XYZ type URL to request this WMTS layer's tiles */
    getURL() {
        return `${this.baseURL}1.0.0/${this.id}/default/${this.timeConfig.currentTimestamp}/3857/{z}/{x}/{y}.${this.format}`
    }

    /**
     * Resolve the {x-y} notation used in WMTS URLs and outputs all possible URLs
     *
     * Example : `"https://wmts{1-3}.geo.admin.ch"` will outputs `[ "https://wmts1.geo.admin.ch",
     * "https://wmts3.geo.admin.ch", "https://wmts3.geo.admin.ch" ]`
     *
     * @returns {String[]} All possible backend URLs for this layer
     */
    getURLs() {
        const mainURL = this.getURL()
        const urls = []
        const bracketNotationMatches = /.*{([0-9-]+)}.*/.exec(mainURL)
        if (bracketNotationMatches && bracketNotationMatches.length >= 2) {
            const bracketNotation = {
                start: Number(bracketNotationMatches[1].split('-')[0]),
                end: Number(bracketNotationMatches[1].split('-')[1]),
            }
            for (let i = bracketNotation.start; i < bracketNotation.end; i += 1) {
                urls.push(mainURL.replace(`{${bracketNotation.start}-${bracketNotation.end}}`, i))
            }
            if (urls.length === 0) {
                urls.push(mainURL)
            }
        } else {
            urls.push(mainURL)
        }
        return urls
    }
}

/**
 * Metadata for WMS layer (WMS stands for Web Map Service). It can either be tiled (requested in
 * chunks, usually 4), or single image (only one request fired for the whole map).
 */
export class WMSLayer extends Layer {
    /**
     * @param {String} name The name of this layer (lang specific)
     * @param {String} id The ID of this layer in the BOD
     * @param {Number} opacity The opacity to apply to this layer (between 0.0 and 1.0)
     * @param {String} baseURL The backend to call for tiles
     * @param {String} format In which image format the backend must be requested
     * @param {TimeConfig} timeConfig Settings telling which year has to be used when request tiles
     *   to the backend
     * @param {String} lang The lang ISO code to use when requesting the backend (WMS images can
     *   have text that are language dependent)
     * @param {Number} gutter How much of a gutter (extra pixels around the image) we want. This is
     *   specific for tiled WMS, if unset this layer will be a considered a single tile WMS.
     * @param {Boolean} isHighlightable Tells if this layer possess features that should be
     *   highlighted on the map after a click (and if the backend will provide valuable information
     *   on the {@link http://api3.geo.admin.ch/services/sdiservices.html#identify-features} endpoint)
     * @param {Boolean} hasTooltip Define if this layer shows tooltip when clicked on
     * @param {String[]} topics All the topics in which belongs this layer
     */
    constructor(
        name,
        id,
        opacity,
        baseURL,
        format,
        timeConfig,
        lang = 'en',
        gutter = -1,
        isHighlightable = false,
        hasTooltip = false,
        topics = []
    ) {
        super(
            name,
            LayerTypes.WMS,
            id,
            opacity,
            false,
            baseURL,
            isHighlightable,
            hasTooltip,
            topics
        )
        this.format = format
        this.timeConfig = timeConfig
        this.lang = lang
        this.gutter = gutter
    }

    getURL() {
        const urlWithoutTime = `${
            this.baseURL ? this.baseURL : WMS_BASE_URL
        }?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2F${
            this.format
        }&TRANSPARENT=true&LAYERS=${this.id}&LANG=${this.lang}`
        if (this.timeConfig && this.timeConfig.currentTimestamp !== 'all') {
            return urlWithoutTime + '&TIME=' + this.timeConfig.currentTimestamp
        }
        return urlWithoutTime
    }
}

/** Metadata for a GeoJSON layer */
export class GeoJsonLayer extends Layer {
    /**
     * @param name The name of this layer in the current lang
     * @param id The BOD ID of this layer (used to request data and style to the backend)
     * @param opacity The opacity of this layer, between 0.0 (transparent) and 1.0 (opaque)
     * @param geoJsonUrl The URL to use when requesting the GeoJSON data (the true GeoJSON per say...)
     * @param styleUrl The URL to use to request the styling to apply to the data
     */
    constructor(name, id, opacity, geoJsonUrl, styleUrl) {
        super(name, LayerTypes.GEOJSON, id, opacity)
        this.geoJsonUrl = geoJsonUrl
        this.styleUrl = styleUrl
    }

    getURL() {
        return this.geoJsonUrl
    }
}

/**
 * A sub-layer of an aggregate layer. Will define at which resolution this sub-layer should be shown
 * (shouldn't overlap other sub-layers from the aggregate)
 */
export class AggregateSubLayer {
    /**
     * @param {String} subLayerId The ID used in the BOD to describe this sub-layer
     * @param {Layer} layer The sub-layer config (can be a {@link GeoJsonLayer}, a {@link WMTSLayer}
     *   or a {@link WMTSLayer})
     * @param {Number} minResolution In meter/px, at which resolution this sub-layer should start to
     *   be visible
     * @param {Number} maxResolution In meter/px, from which resolution the layer should be hidden
     */
    constructor(
        subLayerId,
        layer,
        minResolution = Number.MIN_SAFE_INTEGER,
        maxResolution = Number.MAX_SAFE_INTEGER
    ) {
        this.subLayerId = subLayerId
        this.layer = layer
        this.minResolution = minResolution
        this.maxResolution = maxResolution
    }
}

/**
 * An aggregate layer is a combination of 2 or more layers where only one of them will be shown at a
 * time. Which one is shown is decided by the map resolution, and by the min/max resolution of all
 * sub-layer's config
 */
export class AggregateLayer extends Layer {
    /**
     * @param {String} name The name of this layer in the given lang
     * @param {String} id The layer ID in the BOD
     * @param {Number} opacity The opacity to be applied to this layer
     * @param {TimeConfig} timeConfig Time series config (if available)
     * @param {Boolean} isHighlightable Tells if this layer possess features that should be
     *   highlighted on the map after a click (and if the backend will provide valuable information
     *   on the {@link http://api3.geo.admin.ch/services/sdiservices.html#identify-features} endpoint)
     * @param {Boolean} hasTooltip Define if this layer shows tooltip when clicked on
     * @param {String[]} topics All the topics in which belongs this layer
     */
    constructor(
        name,
        id,
        opacity,
        timeConfig,
        isHighlightable = false,
        hasTooltip = false,
        topics = []
    ) {
        super(
            name,
            LayerTypes.AGGREGATE,
            id,
            opacity,
            false,
            null,
            isHighlightable,
            hasTooltip,
            topics
        )
        this.timeConfig = timeConfig
        this.subLayers = []
    }

    /** @param {AggregateSubLayer} subLayer */
    addSubLayer(subLayer) {
        this.subLayers.push(subLayer)
    }

    getURL() {
        throw new Error(
            "Aggregate layers shouldn't be asked directly for URL, but sub-layers should"
        )
    }
}

const generateClassForLayerConfig = (layerConfig, id, allOtherLayers, lang) => {
    let layer = undefined
    if (layerConfig) {
        const {
            label: name,
            type,
            opacity,
            format,
            background,
            highlightable: isHighlightable,
            tooltip: hasTooltip,
        } = layerConfig
        const timeConfig = new TimeConfig(layerConfig.timeBehaviour, layerConfig.timestamps)
        const topics = layerConfig.topics ? layerConfig.topics.split(',') : []
        switch (type.toLowerCase()) {
            case 'wmts':
                layer = new WMTSLayer(
                    name,
                    id,
                    opacity,
                    format,
                    timeConfig,
                    !!background,
                    WMTS_BASE_URL,
                    isHighlightable,
                    hasTooltip,
                    topics
                )
                break
            case 'wms':
                layer = new WMSLayer(
                    name,
                    id,
                    opacity,
                    layerConfig.wmsUrl,
                    format,
                    timeConfig,
                    lang,
                    layerConfig.gutter,
                    isHighlightable,
                    hasTooltip,
                    topics
                )
                break
            case 'geojson':
                layer = new GeoJsonLayer(
                    name,
                    id,
                    opacity,
                    layerConfig.geojsonUrl,
                    layerConfig.styleUrl
                )
                break
            case 'aggregate':
                // here it's a bit tricky, the aggregate layer has a main entry in the BOD (with everything as usual)
                // but things get complicated with sub-layers. Each sub-layer has an entry in the BOD but it's ID (or
                // key in the BOD) is not the one we should ask the server with, that would be the serverLayerName prop,
                // but the parent layer will describe it's child layers with another identifier, which is the key to the
                // raw config in the big BOD config object.
                // here's an example:
                // {
                //   "parent.layer": {
                //      "serverLayerName": "i.am.a.big.aggregate.layer",
                //      "subLayersIds": [
                //          "i.am.a.sub.layer_1", <-- that will be the key to another object
                //          "i.am.a.sub.layer_2",
                //      ]
                //   },
                //   "i.am.a.sub.layer_1": { <-- that's one of the "subLayersIds"
                //       "serverLayerName": "hey.i.am.not.the.same.as.the.sublayer.id", <-- that's the ID that should be used to ask the server for tiles
                //   },
                // }

                // here id would be "parent.layer" in the example above
                layer = new AggregateLayer(
                    name,
                    id,
                    opacity,
                    timeConfig,
                    isHighlightable,
                    hasTooltip,
                    topics
                )
                layerConfig.subLayersIds.forEach((subLayerId) => {
                    // each subLayerId is one of the "subLayersIds", so "i.am.a.sub.layer_1" or "i.am.a.sub.layer_2" from the example above
                    const subLayerRawConfig = allOtherLayers[subLayerId]
                    // the "real" layer ID (the one that will be used to request the backend) is the serverLayerName of this config
                    // (see example above, that would be "hey.i.am.not.the.same.as.the.sublayer.id")
                    const subLayer = generateClassForLayerConfig(
                        subLayerRawConfig,
                        subLayerRawConfig.serverLayerName,
                        allOtherLayers,
                        lang
                    )
                    if (subLayer) {
                        layer.addSubLayer(
                            new AggregateSubLayer(
                                subLayerId,
                                subLayer,
                                subLayerRawConfig.minResolution,
                                subLayerRawConfig.maxResolution
                            )
                        )
                    }
                })

                break
            default:
                log('error', 'Unknown layer type', type)
        }
    }
    return layer
}

/**
 * Loads the legend (HTML content) for this layer ID
 *
 * @param {String} lang The language in which the legend should be rendered
 * @param {String} layerId The layer ID in the BOD (unique)
 * @returns {Promise<String>} HTML content of the layer's legend
 */
export const getLayerLegend = (lang, layerId) => {
    return new Promise((resolve, reject) => {
        axios
            .get(`${API_BASE_URL}rest/services/all/MapServer/${layerId}/legend?lang=${lang}`)
            .then((response) => resolve(response.data))
            .catch((error) => {
                log('error', 'Error while retrieving the legend for the layer', layerId, error)
                reject(error)
            })
    })
}

/**
 * Loads the layers config from the backend and transforms it in classes defined in this API file
 *
 * @param {String} lang The ISO code for the lang in which the config should be loaded (required)
 * @returns {Promise<Layer[]>}
 */
const loadLayersConfigFromBackend = (lang) => {
    return new Promise((resolve, reject) => {
        if (!API_BASE_URL) {
            // this could happen if we are testing the app in unit tests, we simply reject and do nothing
            reject('API base URL is undefined')
        } else {
            const layersConfig = []
            axios
                .get(`${API_BASE_URL}rest/services/all/MapServer/layersConfig?lang=${lang}`)
                .then(({ data: rawLayersConfig }) => {
                    if (Object.keys(rawLayersConfig).length > 0) {
                        Object.keys(rawLayersConfig).forEach((rawLayerId) => {
                            const rawLayer = rawLayersConfig[rawLayerId]
                            const layer = generateClassForLayerConfig(
                                rawLayer,
                                rawLayerId,
                                rawLayersConfig,
                                lang
                            )
                            if (layer) {
                                layersConfig.push(layer)
                            }
                        })
                        resolve(layersConfig)
                    } else {
                        reject('LayersConfig loaded from backend is not an defined or is empty')
                    }
                })
                .catch((error) => {
                    const message = 'Error while loading layers config from backend'
                    log('error', message, error)
                    reject(message)
                })
        }
    })
}

export default loadLayersConfigFromBackend