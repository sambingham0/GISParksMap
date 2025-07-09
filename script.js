class ParksMapApp {
    constructor() {
        this.map = null;
        this.view = null;
        this.parksLayer = null;
        this.searchWidget = null;
        this.locateWidget = null;
        this.isLoading = true;
        this.resizeObserver = null;
        
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            this.setupAccessibility();
            await this.initializeMap();
            await this.setupLayers();
            this.setupWidgets();
            this.setupPopupTemplate();
            this.setupEventListeners();
            this.setupPerformanceOptimizations();
            this.hideLoading();
        } catch (error) {
            console.error('Error initializing map:', error);
            this.showError('Failed to initialize map. Please refresh the page.');
        }
    }

    setupAccessibility() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.view?.popup?.close();
            }
        });
        
        this.announceToScreenReader('Loading Idaho Parks Explorer...');
    }

    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    setupPerformanceOptimizations() {
        if (window.devicePixelRatio > 1) {
            this.view?.when(() => {
                this.view.resolution = this.view.resolution * window.devicePixelRatio;
            });
        }
    }

    showLoading() {
        const loader = document.getElementById('loadingSpinner');
        if (loader) {
            loader.style.display = 'block';
        }
    }

    hideLoading() {
        const loader = document.getElementById('loadingSpinner');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-notification">
                <strong>Error:</strong> ${message}
            </div>
        `;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    async initializeMap() {
        return new Promise((resolve, reject) => {
            require([
                "esri/Map",
                "esri/views/MapView",
                "esri/layers/FeatureLayer",
                "esri/widgets/Search",
                "esri/widgets/Locate",
                "esri/widgets/BasemapToggle",
                "esri/widgets/Legend",
                "esri/widgets/Expand"
            ], (Map, MapView, FeatureLayer, Search, Locate, BasemapToggle, Legend, Expand) => {
                try {
                    this.Map = Map;
                    this.MapView = MapView;
                    this.FeatureLayer = FeatureLayer;
                    this.Search = Search;
                    this.Locate = Locate;
                    this.BasemapToggle = BasemapToggle;
                    this.Legend = Legend;
                    this.Expand = Expand;

                    // Create map with modern basemap
                    this.map = new Map({
                        basemap: "hybrid" // Changed to hybrid for better visual appeal
                    });

                    // Create map view
                    this.view = new MapView({
                        container: "viewDiv",
                        map: this.map,
                        center: [-114.7420, 44.0682], // Idaho center
                        zoom: 6,
                        constraints: {
                            minZoom: 3,
                            maxZoom: 18
                        }
                    });

                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async setupLayers() {
        try {
            this.parksLayer = new this.FeatureLayer({
                url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Detailed_Parks/FeatureServer",
                outFields: ["*"],
                renderer: {
                    type: "simple",
                    symbol: {
                        type: "simple-marker",
                        color: [46, 204, 113, 0.8],
                        outline: {
                            color: [255, 255, 255, 0.8],
                            width: 2
                        },
                        size: 12
                    }
                },
                labelingInfo: [{
                    labelPlacement: "above-center",
                    labelExpressionInfo: {
                        expression: "$feature.Name"
                    },
                    symbol: {
                        type: "text",
                        color: [255, 255, 255, 0.9],
                        haloColor: [0, 0, 0, 0.8],
                        haloSize: 1.5,
                        font: {
                            size: 11,
                            weight: "bold"
                        }
                    },
                    minScale: 500000
                }]
            });

            this.map.add(this.parksLayer);
            await this.parksLayer.load();
        } catch (error) {
            console.error('Error loading parks layer:', error);
            throw error;
        }
    }

    setupWidgets() {
        this.searchWidget = new this.Search({
            view: this.view,
            allPlaceholder: "Search for parks, cities, or addresses...",
            sources: [
                {
                    layer: this.parksLayer,
                    searchFields: ["Name", "State", "Type"],
                    displayField: "Name",
                    exactMatch: false,
                    outFields: ["*"],
                    name: "National & State Parks",
                    placeholder: "Search parks by name...",
                    maxResults: 6,
                    maxSuggestions: 6,
                    suggestionsEnabled: true,
                    minSuggestCharacters: 2
                },
                {
                    locator: {
                        url: "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"
                    },
                    singleLineFieldName: "SingleLine",
                    name: "ArcGIS World Geocoding Service",
                    placeholder: "Find address or place",
                    maxResults: 3,
                    maxSuggestions: 6,
                    suggestionsEnabled: true,
                    minSuggestCharacters: 2
                }
            ]
        });

        this.locateWidget = new this.Locate({
            view: this.view,
            useHeadingEnabled: false,
            goToOverride: function(view, options) {
                options.target.scale = 50000;
                return view.goTo(options.target);
            }
        });

        this.basemapToggle = new this.BasemapToggle({
            view: this.view,
            nextBasemap: "topo-vector"
        });

        this.legend = new this.Legend({
            view: this.view,
            layerInfos: [{
                layer: this.parksLayer,
                title: "Parks & Recreation Areas"
            }]
        });

        this.legendExpand = new this.Expand({
            view: this.view,
            content: this.legend,
            expanded: false,
            expandTooltip: "Show Legend"
        });

        this.view.ui.add(this.searchWidget, "top-right");
        this.view.ui.add(this.locateWidget, "top-left");
        this.view.ui.add(this.basemapToggle, "bottom-right");
        this.view.ui.add(this.legendExpand, "bottom-left");
    }

    setupPopupTemplate() {
        this.parksLayer.popupTemplate = {
            title: "{Name}",
            content: [{
                type: "fields",
                fieldInfos: [
                    {
                        fieldName: "State",
                        label: "State",
                        visible: true
                    },
                    {
                        fieldName: "Type",
                        label: "Park Type",
                        visible: true
                    },
                    {
                        fieldName: "Area_SqMi",
                        label: "Area (sq mi)",
                        visible: true,
                        format: {
                            places: 2,
                            digitSeparator: true
                        }
                    }
                ]
            }],
            actions: [
                {
                    title: "Get Directions",
                    id: "directions",
                    className: "esri-icon-directions"
                },
                {
                    title: "More Information",
                    id: "more-info",
                    className: "esri-icon-information"
                }
            ]
        };
    }

    setupEventListeners() {
        this.searchWidget.on("search-complete", (event) => {
            // Search completed - info panel removed
        });

        this.view.popup.on("trigger-action", (event) => {
            if (event.action.id === "directions") {
                this.getDirections(event.target.graphic);
            } else if (event.action.id === "more-info") {
                this.showMoreInfo(event.target.graphic);
            }
        });

        this.view.on("click", (event) => {
            this.view.hitTest(event).then((response) => {
                if (response.results.length > 0) {
                    const graphic = response.results[0].graphic;
                    if (graphic.layer === this.parksLayer) {
                        this.highlightFeature(graphic);
                    }
                }
            });
        });

        this.setupBasemapControl();
    }

    setupBasemapControl() {
        const basemapSelect = document.getElementById('basemapSelect');
        if (basemapSelect) {
            basemapSelect.addEventListener('change', (event) => {
                this.map.basemap = event.target.value;
            });
        }
    }

    highlightFeature(graphic) {
        this.view.graphics.removeAll();
        
        const highlightGraphic = graphic.clone();
        highlightGraphic.symbol = {
            type: "simple-marker",
            color: [255, 255, 0, 0.8],
            outline: {
                color: [255, 255, 255, 1],
                width: 3
            },
            size: 16
        };
        
        this.view.graphics.add(highlightGraphic);
        
        setTimeout(() => {
            this.view.graphics.remove(highlightGraphic);
        }, 3000);
    }

    getDirections(graphic) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const parkLat = graphic.geometry.latitude;
                const parkLng = graphic.geometry.longitude;
                
                const url = `https://www.google.com/maps/dir/${userLat},${userLng}/${parkLat},${parkLng}`;
                window.open(url, '_blank');
            });
        } else {
            this.showError('Geolocation is not supported by this browser.');
        }
    }

    showMoreInfo(graphic) {
        const attributes = graphic.attributes;
        const infoWindow = window.open('', '_blank', 'width=600,height=400');
        infoWindow.document.write(`
            <html>
                <head>
                    <title>${attributes.Name} - Park Information</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #2c3e50; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                        .info-item { padding: 10px; background: #f8f9fa; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <h1>${attributes.Name}</h1>
                    <div class="info-grid">
                        <div class="info-item"><strong>State:</strong> ${attributes.State || 'N/A'}</div>
                        <div class="info-item"><strong>Type:</strong> ${attributes.Type || 'N/A'}</div>
                        <div class="info-item"><strong>Area:</strong> ${attributes.Area_SqMi ? attributes.Area_SqMi.toFixed(2) + ' sq mi' : 'N/A'}</div>
                    </div>
                    <p><em>For more detailed information, please visit the official park website.</em></p>
                </body>
            </html>
        `);
    }

    focusOnState(stateName) {
        this.searchWidget.search(stateName);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.parksApp = new ParksMapApp();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        console.log('Service worker support detected');
    });
}

if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
        }, 0);
    });
}
