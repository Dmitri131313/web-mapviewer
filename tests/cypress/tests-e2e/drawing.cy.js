/// <reference types="cypress" />

import { recurse } from 'cypress-recurse'
import proj4 from 'proj4'

import { EditableFeatureTypes } from '@/api/features.api'
import LayerTypes from '@/api/layers/LayerTypes.enum'
import { API_SERVICE_KML_BASE_URL } from '@/config'
import { DEFAULT_PROJECTION } from '@/config'
import { WGS84 } from '@/utils/coordinates/coordinateSystems'
import {
    allStylingColors,
    allStylingSizes,
    BLACK,
    GREEN,
    LARGE,
    MEDIUM,
    RED,
    VERY_SMALL,
} from '@/utils/featureStyleUtils'
import { randomIntBetween } from '@/utils/numberUtils'

const isNonEmptyArray = (value) => {
    return Array.isArray(value) && value.length > 0
}

describe('Drawing module tests', () => {
    context('Drawing mode/tools', () => {
        function testTitleEdit() {
            const title = `This is a random title ${randomIntBetween(1000, 9999)}`
            cy.get('[data-cy="drawing-style-feature-title"]').clear()
            cy.get('[data-cy="drawing-style-feature-title"]').type(title)
            cy.wait('@update-kml').then((interception) =>
                cy.checkKMLRequest(interception, [new RegExp(`"title":"${title}"`)])
            )
        }

        beforeEach(() => {
            cy.goToDrawing()
        })

        it('can create marker/icons and edit them', () => {
            // it should load all icon sets as soon as we enter the drawing module
            cy.wait('@icon-sets')
            cy.wait('@icon-set-default')

            cy.clickDrawingTool(EditableFeatureTypes.MARKER)
            cy.get('[data-cy="ol-map"]').click()

            cy.wait('@post-kml')

            // it should show the default icon set by default with the red color in the icon style popup
            cy.wait('@icon-default')
                .its('request.url')
                .should('include', '/api/icons/sets/default/icons/')
                .should('include', `${RED.rgbString}.png`)

            // clicking on the "Edit icon" button
            cy.get('[data-cy="drawing-style-marker-button"]').click()
            // opening up the icon set selector
            cy.get(
                '[data-cy="drawing-style-icon-set-button"] [data-cy="dropdown-main-button"]'
            ).click()
            // the list of icon sets should contain all backend's possibilities
            cy.get(`[data-cy="dropdown-item-default"]`).should('be.visible')
            cy.get(`[data-cy="dropdown-item-babs"]`).should('be.visible')

            // selecting babs icon set
            cy.get('[data-cy="dropdown-item-babs"]').click()
            // all icons in the selector must swap to the newly selected icon set
            cy.wait('@icon-set-babs')
            cy.wait('@icon-babs')
            // as babs icon set is not colorable, the color box should have disappeared
            cy.get(
                '[data-cy="drawing-style-marker-popup"] [data-cy="drawing-style-color-select-box"]'
            ).should('not.exist')
            // going back to the default icon set
            cy.get(
                '[data-cy="drawing-style-icon-set-button"] [data-cy="dropdown-main-button"]'
            ).click()
            cy.get('[data-cy="dropdown-item-default"]').click()
            // color selector should be back
            cy.get(
                '[data-cy="drawing-style-marker-popup"] [data-cy="drawing-style-color-select-box"]'
            ).should('be.visible')
            // closing the icon set selector (we've not selected another icon, so no update of the KML should have occurred)
            cy.get(
                '[data-cy="drawing-style-icon-set-button"] [data-cy="dropdown-main-button"]'
            ).click()

            // creating intercepts for all icon requests
            cy.intercept(`**/api/icons/sets/default/icons/**${GREEN.rgbString}.png`, {
                fixture: 'service-icons/placeholder.png',
            }).as('icon-default-green')

            // changing icon list's color to green
            cy.get(
                `[data-cy="drawing-style-marker-popup"] [data-cy="drawing-style-color-select-box"] [data-cy="color-selector-${GREEN.name}"]`
            ).click()
            // it should load all icons with the green color
            cy.wait('@icon-default-green')
            // the color of the marker already placed on the map must switch to green
            cy.wait('@update-kml').then((interception) => {
                cy.checkKMLRequest(interception, [
                    new RegExp(`"fillColor":{[^}]*"name":"${GREEN.name}"`),
                ])
            })

            // preparing intercept for large icons
            cy.intercept(`**/icons/**@${LARGE.iconScale}x-${GREEN.rgbString}.png`, {
                fixture: 'service-icons/placeholder.png',
            }).as('large-green-icon')

            // opening up the icon size selector
            cy.get(
                '[data-cy="drawing-style-marker-popup"] [data-cy="drawing-style-size-selector"] [data-cy="dropdown-main-button"]'
            ).click()
            // all sizes should be represented
            allStylingSizes.forEach((size) => {
                cy.get(
                    `[data-cy="drawing-style-marker-popup"] [data-cy="drawing-style-size-selector"] [data-cy="dropdown-item-${size.label}"]`
                ).should('be.visible')
            })
            // selecting large size
            cy.get(
                `[data-cy="drawing-style-marker-popup"] [data-cy="drawing-style-size-selector"] [data-cy="dropdown-item-${LARGE.label}"]`
            ).click()
            // icons should be reloaded as large green
            cy.wait('@large-green-icon')
            // the existing icon on the map must be updated to large and green
            cy.wait('@update-kml').then((interception) => {
                cy.checkKMLRequest(interception, [
                    new RegExp(`"iconSize":{[^}]*"label":"${LARGE.label}"`),
                    new RegExp(`"fillColor":{[^}]*"name":"${GREEN.name}"`),
                ])
            })

            // opening up ll icons of the current sets so that we may choose a new one
            cy.get(
                '[data-cy="drawing-style-marker-popup"] [data-cy="drawing-style-toggle-all-icons-button"]'
            ).click()
            // picking up the 4th icon of the set
            cy.fixture('service-icons/set-default.fixture.json').then((defaultIconSet) => {
                const fourthIcon = defaultIconSet.items[3]
                cy.get(
                    `[data-cy="drawing-style-marker-popup"] [data-cy="drawing-style-icon-selector-${fourthIcon.name}"]`
                ).click({ force: true })
                // the KML must be updated with the newly selected icon
                cy.wait('@update-kml').then((interception) =>
                    cy.checkKMLRequest(interception, [
                        new RegExp(`"icon":{[^}]*"name":"${fourthIcon.name}"`),
                    ])
                )
            })
            // closing the icons
            cy.get(
                '[data-cy="drawing-style-marker-popup"] [data-cy="drawing-style-toggle-all-icons-button"]'
            ).click({ force: true })
            // closing the icon style popup
            cy.get('[data-cy="drawing-style-popover"] [data-cy="close-popover-button"]').click({
                force: true,
            })

            // changing/editing the title of this marker
            testTitleEdit()

            // changing/editing the description of this marker
            const description = 'A description for this marker'
            cy.get('[data-cy="drawing-style-feature-description"]').type(description)
            cy.wait('@update-kml').then((interception) =>
                cy.checkKMLRequest(interception, [new RegExp(`"description":"${description}"`)])
            )

            //  moving the marker by drag&drop on the map
            const moveInPixel = {
                x: 40,
                y: -50,
            }
            cy.window().then((window) => {
                const endingPixel = [
                    window.innerWidth / 2.0 + moveInPixel.x,
                    window.innerHeight / 2.0 + moveInPixel.y,
                ]

                // Move it, the geojson geometry should move
                cy.readWindowValue('map').then((map) => {
                    cy.log('ending pixel is', endingPixel)
                    const expectedCoordinates = map.getCoordinateFromPixel(endingPixel)

                    cy.simulateEvent(map, 'pointerdown', 0, 0)
                    cy.simulateEvent(map, 'pointerdrag', moveInPixel.x, moveInPixel.y)
                    cy.simulateEvent(map, 'pointerup')

                    cy.wait('@update-kml')
                    cy.readWindowValue('drawingLayer').then((drawingLayer) => {
                        const features = drawingLayer.getSource().getFeatures()
                        expect(features).to.have.lengthOf(1)
                        const foundType = features[0].getGeometry().getType()
                        expect(foundType).to.equal('Point')
                        expect(features).to.be.an('Array').lengthOf(1)
                        expect(features[0].getGeometry().getCoordinates()).to.be.eql(
                            expectedCoordinates,
                            `wrong coordinates after drag&drop, expected ${JSON.stringify(
                                expectedCoordinates
                            )}, received: ${JSON.stringify(
                                features[0].getGeometry().getCoordinates()
                            )}`
                        )
                    })
                })
            })
        })
        it('can create annotation/text and edit them', () => {
            cy.clickDrawingTool(EditableFeatureTypes.ANNOTATION)
            cy.get('[data-cy="ol-map"]').click()
            cy.wait('@post-kml').then((interception) => {
                cy.checkKMLRequest(interception, [
                    // by default: text color should be red and size be medium
                    new RegExp(`"textColor":{[^}]*"name":"${RED.name}"`),
                    new RegExp(`"textSize":{[^}]*"label":"${MEDIUM.label}"`),
                    // there should be a default title
                    new RegExp('"title":"New text"'),
                ])
            })

            testTitleEdit()

            // Opening text style edit popup
            cy.get('[data-cy="drawing-style-text-button"]').click()
            cy.get('[data-cy="drawing-style-text-popup"]').should('be.visible')

            // all available colors must have a dedicated element/button
            allStylingColors.forEach((color) => {
                cy.get(`[data-cy="drawing-style-text-color-${color.name}"]`).should('be.visible')
            })
            // when clicking on another color, the text color in the KML must change
            cy.get(`[data-cy="drawing-style-text-color-${BLACK.name}"]`)
                .should('be.visible')
                .click()
            cy.wait('@update-kml').then((interception) => {
                cy.checkKMLRequest(interception, [
                    new RegExp(`"textColor":{[^}]*"name":"${BLACK.name}"`),
                ])
            })

            cy.get(
                '[data-cy="drawing-style-text-popup"] [data-cy="drawing-style-size-selector"] [data-cy="dropdown-main-button"]'
            ).click({ force: true })
            // checking that all (text) sizes are represented in the size selector
            allStylingSizes.forEach((size) => {
                cy.get(
                    `[data-cy="drawing-style-text-popup"] [data-cy="drawing-style-size-selector"] [data-cy="dropdown-item-${size.label}"]`
                ).should('exist')
            })
            // selecting "very small" size
            cy.get(
                `[data-cy="drawing-style-text-popup"] [data-cy="drawing-style-size-selector"] [data-cy="dropdown-item-${VERY_SMALL.label}"]`
            ).click({ force: true })
            cy.wait('@update-kml').then((interception) => {
                cy.checkKMLRequest(interception, [
                    new RegExp(`"textSize":{[^}]*"label":"${VERY_SMALL.label}"`),
                ])
            })
        })
        it('can create line/polygons and edit them', () => {
            cy.clickDrawingTool(EditableFeatureTypes.LINEPOLYGON)
            cy.get('[data-cy="ol-map"]').click(100, 200)
            cy.get('[data-cy="ol-map"]').click(150, 200)
            cy.get('[data-cy="ol-map"]').click(150, 230)

            // checking that we can delete the last point by either clicking the button or using right-click
            cy.get('[data-cy="drawing-delete-last-point-button"]').click()
            cy.get('[data-cy="ol-map"]').click(150, 230)

            cy.get('[data-cy="ol-map"]').rightclick()
            cy.get('[data-cy="ol-map"]').click(150, 230)

            // should create a polygon by re-clicking the first point
            cy.get('[data-cy="ol-map"]').click(100, 200)

            let kmlId = null
            cy.wait('@post-kml').then((interception) => {
                cy.checkKMLRequest(interception, [
                    EditableFeatureTypes.LINEPOLYGON,
                    new RegExp(`"fillColor":{[^}]*"fill":"${RED.fill}"`),
                ])
                kmlId = interception.response.body.id
            })
            cy.readWindowValue('drawingLayer')
                .then((drawingLayer) => drawingLayer.getSource().getFeatures())
                .then((features) => {
                    expect(features).to.have.length(1)
                    const [polygon] = features
                    expect(polygon.getGeometry().getCoordinates().length).to.eq(1)
                    // OpenLayers wraps a polygon's coordinate in an array (so that it may have multiple "facets")
                    const [polygonCoordinates] = polygon.getGeometry().getCoordinates()
                    expect(polygonCoordinates).to.be.an('Array').lengthOf(4)
                })

            // Changing the color of the polygon and checking that the KMl was updated accordingly
            cy.get('[data-cy="drawing-style-line-button"]').click()
            cy.get(
                `[data-cy="drawing-style-line-popup"] [data-cy="color-selector-${BLACK.name}"]`
            ).click({
                // clicking in this popup is flaky (Cypress considers there's something else on top), so we force the click
                force: true,
            })
            cy.wait('@update-kml').then((interception) =>
                cy.checkKMLRequest(
                    interception,
                    [new RegExp(`"fillColor":{[^}]*"fill":"${BLACK.fill}"`)],
                    kmlId
                )
            )

            // Now creating a line, and finishing it by double-clicking the same spot
            cy.get('[data-cy="infobox-close"]').click()
            cy.clickDrawingTool(EditableFeatureTypes.LINEPOLYGON)
            cy.get('[data-cy="ol-map"]').click(120, 220)
            cy.get('[data-cy="ol-map"]').dblclick(120, 240)
            cy.wait('@update-kml')
            cy.readWindowValue('drawingLayer')
                .then((drawingLayer) => drawingLayer.getSource().getFeatures())
                .then((features) => {
                    expect(features).to.have.length(2)
                    const line = features[1]
                    expect(line.getGeometry().getCoordinates().length).to.eq(2)
                })
        })
    })
    context('KML management', () => {
        it('deletes the drawing when confirming the delete modal', () => {
            cy.goToDrawing()
            cy.clickDrawingTool(EditableFeatureTypes.ANNOTATION)
            cy.get('[data-cy="ol-map"]').click()
            cy.wait('@post-kml')

            cy.get('[data-cy="drawing-toolbox-delete-button"]').click()
            cy.get('[data-cy="modal-confirm-button"]').click()
            cy.readWindowValue('drawingLayer')
                .then((drawingLayer) => drawingLayer.getSource().getFeatures())
                .then((features) => {
                    expect(features).to.have.length(0)
                })
            cy.get('[data-cy="drawing-toolbox-delete-button"]').should('have.attr', 'disabled')
            cy.get(
                '[data-cy="drawing-toolbox-export-button"] [data-cy="dropdown-toggle-button"]'
            ).should('have.attr', 'disabled')
            cy.get(
                '[data-cy="drawing-toolbox-export-button"] [data-cy="dropdown-main-button"]'
            ).should('have.attr', 'disabled')
            cy.get('[data-cy="drawing-toolbox-share-button"]').should('have.attr', 'disabled')
        })
        it('manages the KML layer in the layer list / URL params correctly', () => {
            cy.goToDrawing()
            cy.clickDrawingTool(EditableFeatureTypes.MARKER)
            cy.get('[data-cy="ol-map"]').click()
            cy.wait('@post-kml')

            // checks that it adds the kml file ID in the URL while in drawing mode
            cy.url().should('match', /layers=[^;&]*KML|[^|Drawing,f1]+/)
            // checks that it doesn't add adminId to the url
            cy.url().should('not.contain', 'adminId')

            cy.get('[data-cy="drawing-toolbox-close-button"]').click()
            cy.readStoreValue('state.layers.activeLayers').then((layers) => {
                expect(layers).to.be.an('Array').lengthOf(1)
                const [drawingLayer] = layers
                expect(drawingLayer.getID()).to.include('KML|')
                expect(drawingLayer.visible).to.be.true
            })
            // checks that it clears the drawing when the drawing layer is removed
            cy.get(`[data-cy^="button-remove-layer-"]`).click()
            cy.readStoreValue('state.layers.activeLayers').then((layers) => {
                expect(layers).to.be.an('Array').lengthOf(0)
            })
            cy.readWindowValue('drawingLayer').should('not.exist')
        })
        it('keeps the KML after a page reload, and creates a copy if it is then edited', () => {
            cy.goToDrawing()
            cy.clickDrawingTool(EditableFeatureTypes.MARKER)
            cy.get('[data-cy="ol-map"]').click()

            let kmlId
            cy.wait('@post-kml').then((interception) => {
                kmlId = interception.response.body.id
            })
            cy.waitUntilState((state) => {
                return state.layers.activeLayers.find(
                    (layer) => layer.type === LayerTypes.KML && layer.fileId === kmlId
                )
            })

            cy.reload()
            cy.wait('@get-kml')
            cy.waitUntilState((state) => {
                return state.layers.activeLayers.find(
                    (layer) => layer.type === LayerTypes.KML && layer.fileId === kmlId
                )
            })
            // checking that the KML is correctly loaded in the drawing module, even though it doesn't carry an adminId
            cy.openDrawingMode()
            cy.wait('@get-kml')

            // if closing the drawing module without changing anything, no copy must be made
            cy.get('[data-cy="drawing-toolbox-close-button"]').click()
            cy.readStoreValue('getters.activeKmlLayer').then((activeKmlLayer) => {
                expect(activeKmlLayer).to.haveOwnProperty('fileId')
                expect(activeKmlLayer.fileId).to.eq(kmlId)
            })

            // re-opening the drawing module
            cy.get('[data-cy="menu-tray-drawing-section"]').should('be.visible').click()
            cy.wait('@get-kml')

            // deleting all features (clearing/emptying the KML)
            cy.get('[data-cy="drawing-toolbox-delete-button"]').click()
            cy.get('[data-cy="modal-confirm-button"]').click()
            // checking that it creates a copy of the KML, and doesn't edit/clear the existing one (no adminId)
            let newKmlId
            cy.wait('@post-kml').then((interception) => {
                newKmlId = interception.response.body.id
                expect(newKmlId).to.not.eq(kmlId)
            })
            // there should be only one KML layer left in the layers, and it's the one just saved
            cy.readStoreValue('state.layers.activeLayers').then((activeLayers) => {
                expect(activeLayers.filter((layer) => layer.type === LayerTypes.KML).length).to.eq(
                    1,
                    'There should only be one KMl layer left in the layers'
                )
                const kmlLayer = activeLayers.find((layer) => layer.type === LayerTypes.KML)
                expect(kmlLayer.fileId).to.eq(newKmlId)
            })

            // Add another feature and checking that we do not create subsequent copies (we now have the adminId for this KML)
            cy.clickDrawingTool(EditableFeatureTypes.ANNOTATION)
            cy.get('[data-cy="ol-map"]').click('center')
            cy.wait('@update-kml').then((interception) => {
                expect(interception.response.body.id).to.eq(newKmlId)
            })
        })
        it('manages the KML layer correctly if it comes attached with an adminId at startup', () => {
            // Position of the marker defined in service-kml/lonelyMarker.kml
            const markerLatitude = 46.883715999352546
            const markerLongitude = 7.656108679791837
            const center = proj4(WGS84.epsg, DEFAULT_PROJECTION.epsg, [
                markerLongitude,
                markerLatitude,
            ])

            // load map with an injected kml layer containing a text
            const kmlFileId = 'test-fileID12345678900'
            const kmlFileAdminId = 'test-fileAdminID12345678900'
            const kmlFileUrl = `${API_SERVICE_KML_BASE_URL}api/kml/files/${kmlFileId}`
            const kmlUrlParam = `KML|${kmlFileUrl}|Dessin@adminId=${kmlFileAdminId}`

            // opening up the app and centering it directly on the single marker feature from the fixture
            cy.goToDrawing({ layers: kmlUrlParam, center: center.join(',') }, true)

            // the app must open the drawing module at startup whenever an adminId is found in the URL
            cy.readStoreValue('state.ui.showDrawingOverlay').should('be.true')

            // checking that the KML was correctly loaded
            cy.readStoreValue('state.features.selectedFeatures').should('have.length', 0)
            cy.readWindowValue('drawingLayer')
                .then((layer) => layer.getSource().getFeatures())
                .should('have.length', 1)
            // clicking on the single feature of the fixture
            cy.get('[data-cy="ol-map"]').click('center')
            cy.readStoreValue('state.features.selectedFeatures').should('have.length', 1)
            cy.readWindowValue('drawingLayer')
                .then((layer) => layer.getSource().getFeatures())
                .should('have.length', 1)

            // creating another feature
            cy.clickDrawingTool(EditableFeatureTypes.MARKER)
            cy.get('[data-cy="ol-map"]').click(200, 200)

            // checking that it updates the existing KML, and not creating a new copy of it
            cy.wait('@update-kml').then((interception) => {
                expect(interception.response.body.id).to.eq(kmlFileId)
            })
        })
    })
    context('others', () => {
        it("doesn't save an empty drawing (if not modified)", () => {
            cy.intercept('**/api/kml/admin**', (req) => {
                expect(`Unexpected call to ${req.method} ${req.url}`).to.be.false
            }).as('post-put-kml-not-allowed')
            cy.goToDrawing()
            cy.clickDrawingTool(EditableFeatureTypes.MARKER)
            cy.get('[data-cy="drawing-toolbox-close-button"]').click()
        })
        it('can export the drawing/profile in multiple formats', () => {
            const downloadsFolder = Cypress.config('downloadsFolder')
            const checkFiles = (extension, callback) => {
                recurse(
                    () => cy.task('findFiles', { folderName: downloadsFolder, extension }),
                    isNonEmptyArray,
                    { delay: 100 }
                ).then((files) => {
                    const fileName = `${downloadsFolder}/${files[files.length - 1]}`
                    expect(fileName).to.contains(`map.geo.admin.ch_${extension.toUpperCase()}_`)
                    cy.readFile(fileName).should('have.length.gt', 50).then(callback)
                })
            }

            cy.goToDrawing()

            // preparing profile intercept
            cy.intercept('**/rest/services/profile.json**', {
                fixture: 'service-alti/profile.fixture.json',
            }).as('profile')
            cy.intercept('**/rest/services/profile.csv**', {
                fixture: 'service-alti/profile.fixture.csv',
            }).as('profileAsCsv')

            cy.clickDrawingTool(EditableFeatureTypes.LINEPOLYGON)
            cy.get('[data-cy="ol-map"]').click(100, 200)
            cy.get('[data-cy="ol-map"]').click(150, 200)
            cy.get('[data-cy="ol-map"]').click(150, 230)
            // clicking on the same spot as the first, it should close the polygon
            cy.get('[data-cy="ol-map"]').click(100, 200)

            cy.wait('@post-kml')

            // Checking that it can export the profile as CSV
            cy.wait('@profile')
            // triggering a CSV download
            cy.get('[data-cy="profile-popup-csv-download-button"]').click()
            // check CSV content
            cy.fixture('service-alti/profile.fixture.csv').then((mockCsv) => {
                checkFiles('csv', (content) => {
                    // just in case we are testing from windows we replace all \r\n by \n
                    const agnosticContent = content.replaceAll('\r', '')
                    const agnosticMockCsv = mockCsv.replaceAll('\r', '')
                    expect(agnosticContent).to.be.equal(agnosticMockCsv)
                })
            })

            // it exports KML when clicking on the export button (without choosing format)
            cy.get(
                '[data-cy="drawing-toolbox-export-button"] [data-cy="dropdown-main-button"]'
            ).click()
            checkFiles('kml', (content) => {
                expect(content).to.contains(
                    `"featureType":"${EditableFeatureTypes.LINEPOLYGON}"`,
                    `Feature type LINEPOLYGON not found in KML, there might be a missing feature`
                )
            })
            cy.task('clearFolder', downloadsFolder)

            // same if we choose exports KML file through the "choose format" export menu
            cy.get(
                '[data-cy="drawing-toolbox-export-button"] [data-cy="dropdown-toggle-button"]'
            ).click()
            cy.get(
                '[data-cy="drawing-toolbox-export-button"] [data-cy="dropdown-item-kml"]'
            ).click()
            checkFiles('kml', (content) => {
                expect(content).to.contains(
                    `"featureType":"${EditableFeatureTypes.LINEPOLYGON}"`,
                    `Feature type LINEPOLYGON not found in KML, there might be a missing feature`
                )
            })
            cy.task('clearFolder', downloadsFolder)

            // it exports a GPX if chosen in the dropdown
            cy.get(
                '[data-cy="drawing-toolbox-export-button"] [data-cy="dropdown-toggle-button"]'
            ).click()
            cy.get(
                '[data-cy="drawing-toolbox-export-button"] [data-cy="dropdown-item-gpx"]'
            ).click()
            checkFiles('gpx', (content) => {
                // 1 <rte> (routes), for the single LINEPOLYGON
                expect(content).to.match(/<gpx.*<rte>.*<\/rte>.*<\/gpx>/)
            })

            cy.task('clearFolder', downloadsFolder)
        })
        it('generates short links when sharing a drawing', () => {
            const publicShortlink = 'https://s.geo.admin.ch/public-shortlink'
            const adminshortlink = 'https://s.geo.admin.ch/admin-shortlink'

            let adminId = null
            let kmlId = null

            cy.goToDrawing()

            cy.clickDrawingTool(EditableFeatureTypes.MARKER)
            cy.get('[data-cy="ol-map"]').click()
            cy.wait('@post-kml').then((intercept) => {
                adminId = intercept.response.body.admin_id
                kmlId = intercept.response.body.id
            })

            const regexInterceptServiceShortLink =
                /^https?:\/\/(sys-s\.\w+\.bgdi\.ch|s\.geo\.admin\.ch)\//
            // creating the necessary intercepts for service-shortlink
            cy.intercept('POST', regexInterceptServiceShortLink, (req) => {
                expect(req.body).to.haveOwnProperty('url')
                expect(req.body.url).to.contain(`/${kmlId}`)
                if (req.body.url.includes(`@adminId=`)) {
                    req.reply({ statusCode: 201, body: { shorturl: adminshortlink } })
                } else {
                    req.reply({ statusCode: 201, body: { shorturl: publicShortlink } })
                }
            }).as('shortLink')

            // opening the share prompt/modal
            cy.get('[data-cy="drawing-toolbox-share-button"]').click()
            // we expect 2 links to be generated (one with and one without adminId)
            cy.wait('@shortLink')
            cy.wait('@shortLink')

            // Check that the copied URL is the shortened one
            cy.get('[data-cy="drawing-share-normal-link"]').focus()
            cy.get('[data-cy="drawing-share-normal-link"]').realClick()
            cy.readClipboardValue().then((clipboardText) => {
                expect(clipboardText).to.be.equal(
                    publicShortlink,
                    `Share link is not a public shortlink`
                )
            })

            // Same check, but with the other input (that should contain the adminId)
            cy.get('[data-cy="drawing-share-admin-link"]').focus()
            cy.get('[data-cy="drawing-share-admin-link"]').realClick()
            cy.readClipboardValue().then((clipboardText) => {
                expect(clipboardText).to.be.equal(
                    adminshortlink,
                    `Share link is not an admin shortlink`
                )
            })
            // closing the share modal/popup
            cy.get('[data-cy="modal-close-button"]').click()

            // testing the same thing, but by responding HTTP500 with service-shortlink
            // it should fall back to give users normal links (un-shortened)
            cy.intercept('POST', regexInterceptServiceShortLink, { statusCode: 500 })

            // opening the share prompt/modal once again
            cy.get('[data-cy="drawing-toolbox-share-button"]').click()

            cy.get('[data-cy="drawing-share-normal-link"]').focus()
            cy.get('[data-cy="drawing-share-normal-link"]').realClick()
            // checking that the ID present in the "normal" link matches the public file ID (and not the admin ID)
            cy.readClipboardValue().then((clipboardText) => {
                expect(clipboardText).to.contain(`/${kmlId}`)
                expect(clipboardText).to.not.contain(`@adminId`)
            })
            // checking that the "Edit later" link contains the adminId
            cy.get('[data-cy="drawing-share-admin-link"]').focus()
            cy.get('[data-cy="drawing-share-admin-link"]').realClick()
            cy.readClipboardValue().then((clipboardText) => {
                expect(clipboardText).to.contain(`/${kmlId}`)
                expect(clipboardText).to.contain(`@adminId=${adminId}`)
            })
        })
        it('shows a profile of a line/measure coming from service-alti data', () => {
            const profileIntercept = '**/rest/services/profile.json**'

            cy.goToDrawing()

            // returning an empty profile as a start
            cy.intercept(profileIntercept, []).as('empty-profile')

            cy.clickDrawingTool(EditableFeatureTypes.MEASURE)
            cy.get('[data-cy="ol-map"]').click(100, 200)
            cy.get('[data-cy="ol-map"]').click(150, 200)
            cy.get('[data-cy="ol-map"]').dblclick(120, 240)
            cy.wait('@empty-profile')

            // the profile info container shouldn't show up if there's no data for this profile
            cy.get('[data-cy="profile-popup-info-container"]').should('not.exist')

            // deleting feature
            cy.get('[data-cy="profile-popup-delete-button"]').click()
            cy.get('[data-cy="profile-popup-content"]').should('not.exist')
            cy.get('[data-cy="drawing-style-popup"]').should('not.exist')

            // returning an empty profile as a start
            cy.intercept(profileIntercept, {
                fixture: 'service-alti/profile.fixture.json',
            }).as('profile')

            cy.clickDrawingTool(EditableFeatureTypes.LINEPOLYGON)
            cy.get('[data-cy="ol-map"]').click(100, 200)
            cy.get('[data-cy="ol-map"]').click(150, 200)
            cy.get('[data-cy="ol-map"]').dblclick(120, 240)
            cy.wait('@profile')

            // checking all the information found in the info container
            Object.entries({
                profile_elevation_difference: '0.00m',
                profile_elevation_down: '0.10m',
                profile_elevation_up: '0.10m',
                profile_poi_down: "1'342m",
                profile_poi_up: "1'342m",
                profile_distance: '4.50m',
                profile_slope_distance: '4.51m',
            }).forEach(([key, value]) => {
                cy.get(`[data-cy="profile-popup-info-${key}"]`).should('contain.text', value)
            })
            cy.get('[data-cy="profile-graph"]').trigger('mouseenter')
            cy.get('[data-cy="profile-graph"]').trigger('mousemove', 'center')
            cy.get('[data-cy="profile-popup-tooltip"] .distance').should('contain.text', '2.5 m')
            cy.get('[data-cy="profile-popup-tooltip"] .elevation').should(
                'contain.text',
                '1341.8 m'
            )
            cy.get('[data-cy="profile-graph"]').trigger('mouseleave')

            // clicking on the header of the profile container
            cy.get('[data-cy="infobox-header"]').click()
            cy.get('[data-cy="infobox-header"]').should('be.visible')
            // it should hide the content (only the header stays visible)
            cy.get('[data-cy="infobox-content"]').should('not.be.visible')

            // click once again on the header
            cy.get('[data-cy="infobox-header"]').click()
            cy.get('[data-cy="infobox-header"]').should('be.visible')
            // the content should now be visible again
            cy.get('[data-cy="infobox-content"]').should('be.visible')

            // clicking the X button of the popup
            cy.get('[data-cy="infobox-close"]').click()
            // it is now closed
            cy.get('[data-cy="infobox"]').should('not.be.visible')

            // re-opening
            cy.get('[data-cy="ol-map"]').click(150, 200)
            cy.get('[data-cy="infobox"]').should('be.visible')

            // clicking on the X button again, but this time with the content being hidden (clicking first on the header)
            cy.get('[data-cy="infobox-header"]').click()
            cy.get('[data-cy="infobox-close"]').click()
            cy.get('[data-cy="infobox"]').should('not.be.visible')
        })
    })
})