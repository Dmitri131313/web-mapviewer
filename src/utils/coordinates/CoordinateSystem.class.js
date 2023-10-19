import CoordinateSystemBounds from '@/utils/coordinates/CoordinateSystemBounds.class'
import proj4 from 'proj4'

export default class CoordinateSystem {
    /**
     * @param {String} id Identification of this coordinate system with a human-readable ID (i.e.
     *   LV95/WGS84/LV03/etc...)
     * @param {String} epsg EPSG:xxxx representation of this coordinate system
     * @param {Number} epsgNumber Same as EPSG but only the numerical part (without the "EPSG:")
     * @param {String} label Label to show users when they are dealing with this coordinate system
     * @param {String} proj4transformationMatrix A string describing how proj4 should handle
     *   projection/reprojection of this coordinate system, in regard to WGS84. These matrices can
     *   be found on the EPSG website for each projection in the Export section, inside the PROJ.4
     *   export type (can be directly accessed by adding .proj4 to the URL of one projection's page
     *   on the EPSG website, i.e. https://epsg.io/3857.proj4 for WebMercator)
     * @param {CoordinateSystemBounds} bounds Bounds of this projection system, expressed as in its
     *   own coordinate system. These boundaries can also be found on the EPSG website, in the
     *   section "Projected bounds" of a projection's page
     * @param {Number} defaultZoom Zoom level to be used if none are already set
     * @param {Number} acceptableDecimalPoints How many decimal points is acceptable (precision
     *   wise) with this projection system. It will be used to round values after calculations and
     *   re-projections.
     * @param {[Number, Number]} defaultCenter Coordinate to be used as the default center, will use
     *   the center of the bounds if none are given (and bounds are defined)
     * @param {Boolean} isSwissProjection If this projection is made specifically to cover
     *   Switzerland (if it uses our national LV95 or LV03 bounds, zoom level, etc...)
     */
    constructor(
        id,
        epsg,
        epsgNumber,
        label,
        proj4transformationMatrix,
        isSwissProjection = false,
        bounds = null,
        defaultZoom = 0,
        defaultCenter = null,
        acceptableDecimalPoints = 2
    ) {
        this.id = id
        this.epsg = epsg
        this.epsgNumber = epsgNumber
        this.label = label
        this.proj4transformationMatrix = proj4transformationMatrix
        this.isSwissProjection = isSwissProjection
        this.bounds = bounds
        this.defaultCenter = defaultCenter || this.bounds?.center
        this.defaultZoom = defaultZoom
        this.acceptableDecimalPoints = acceptableDecimalPoints
    }

    /**
     * Transforms the bounds of this coordinates system to be expressed in the given coordinate
     * system
     *
     * If the one of the coordinate system is invalid, or if bounds are not defined, it will return
     * null
     *
     * @param {CoordinateSystem} coordinateSystem
     * @returns {CoordinateSystemBounds | null}
     */
    getBoundsAs(coordinateSystem) {
        if (coordinateSystem instanceof CoordinateSystem && this.bounds) {
            if (coordinateSystem.epsg === this.epsg) {
                return this.bounds
            }
            const newBottomLeft = proj4(this.epsg, coordinateSystem.epsg, this.bounds.bottomLeft)
            const newTopRight = proj4(this.epsg, coordinateSystem.epsg, this.bounds.topRight)
            return new CoordinateSystemBounds(
                newBottomLeft[0],
                newTopRight[0],
                newBottomLeft[1],
                newTopRight[1]
            )
        }
        return null
    }

    /**
     * Tells if a coordinate (described by X and Y) is in bound of this coordinate system.
     *
     * @param {Number} x
     * @param {Number} y
     * @returns {boolean}
     */
    isInBounds(x, y) {
        return !!this.bounds?.isInBounds(x, y)
    }
}
