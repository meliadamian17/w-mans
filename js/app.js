import {
    CANADIAN_PROVINCES_GDP,
    CANADIAN_PROVINCES_INCOME,
    loadProvinceData,
    getProvinceMetrics,
    getProvinceById,
    getAllProvinces,
    formatCurrency,
    formatIncome,
    formatPercentage,
    formatNumber,
    getGDPColor,
    getIncomeColor,
    getRegionalGDPColor,
    getRegionalIncomeColor,
    getDataColor,
    getGDPStatus,
    getIncomeStatus,
    getDataStatus,
    setCurrentDataType,
    getCurrentDataType,
    getCitiesForProvince,
    getCityById,
    setCurrentDataScope,
    getCurrentDataScope,
    getRegionNameForProvince,
    getRegionMetricsForProvince,
    getScopedValueForProvince,
} from './data.js';

const PROVINCE_POPULATIONS = {
    'nl': 510_550,
    'pe': 154_331,
    'ns': 969_383,
    'nb': 775_610,
    'qc': 8_501_833,
    'on': 14_223_942,
    'mb': 1_342_153,
    'sk': 1_132_505,
    'ab': 4_262_635,
    'bc': 5_000_879,
    'yt': 40_232,
    'nt': 41_070,
    'nu': 36_858
};

const MAPILLARY_ACCESS_TOKEN = 'MLY|25924883943764997|4ac03280f19bbd17e1e57bbef97fb5f2';
const CANADA_BOUNDS = [
    [-141.0, 40.0], // Southwest
    [-50.0, 84.0],  // Northeast
];

const appState = {
    selectedProvince: null,
    selectedCity: null,
    streetViewOpen: false,
    mapLoaded: false,
    legendOpen: true, // Legend is visible by default
    mapillaryViewer: null,
    sidebarVisible: true,
    realEstateData: null,
    nightSkyCanvas: null,
    nightSkyContext: null,
    nightSkyResizeHandler: null,
    nightSkyStars: [],
    nightSkyMouseMoveHandler: null,
    nightSkyMouseLeaveHandler: null,
    legendPanelWasHidden: false,
};

const elements = {
    map: null,
    mapContainer: document.getElementById('map-container'),
    
    dataTypeSelect: document.getElementById('data-type-select'),
    mapScopeSelect: document.getElementById('map-scope-select'),
    btnCanadaView: document.getElementById('btn-canada-view'),
    btnToggleLegend: document.getElementById('btn-toggle-legend'),
    btnCloseDataPanel: document.getElementById('btn-close-data-panel'),
    btnCloseProvincePanel: document.getElementById('btn-close-province-panel'),
    btnStreetView: document.getElementById('btn-street-view-right-panel'),
    btnStreetViewProvincePanel: document.getElementById('btn-street-view-province-panel'),
    btnStreetViewFloating: document.getElementById('btn-street-view-floating'),
    btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
    btnDismissTooltip: document.getElementById('dismiss-tooltip'),
    
    dataPanel: document.getElementById('data-panel'),
    provinceInfoPanel: document.getElementById('province-info-panel'),
    legendPanel: document.getElementById('legend-panel'),
    legendTitle: document.getElementById('legend-title'),
    legendItems: document.getElementById('legend-items'),
    legendNote: document.getElementById('legend-note'),
    scopeIndicator: document.getElementById('scope-indicator'),
    streetViewContainer: document.getElementById('street-view-container'),
    nightSkyLegend: document.getElementById('night-sky-legend'),
    nightSkyTooltip: document.getElementById('night-sky-tooltip'),
    onboardingTooltip: document.getElementById('onboarding-tooltip'),
    loadingIndicator: document.getElementById('loading-indicator'),
    
    introOverlay: document.getElementById('intro-overlay'),
    introTitle: document.getElementById('intro-title'),
    introDescription: document.getElementById('intro-description'),
    btnSkipIntro: document.getElementById('btn-skip-intro'),
    
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    tabTrendBtn: document.getElementById('tab-trend-btn'),
    
    provinceName: document.getElementById('province-name'),
    provincePopulation: document.getElementById('province-population'),
    provinceRegion: document.getElementById('province-region'),
    provinceCoordinates: document.getElementById('province-coordinates'),
    panelProvinceTitle: document.getElementById('panel-province-title'),
    streetViewLocation: document.getElementById('street-view-location'),
    
    statCurrentRate: document.getElementById('stat-current-rate'),
    statAvgRate: document.getElementById('stat-avg-rate'),
    statPeakRate: document.getElementById('stat-peak-rate'),
    statPeakYear: document.getElementById('stat-peak-year'),
    statLabel1: document.getElementById('stat-label-1'),
    statLabel2: document.getElementById('stat-label-2'),
    statLabel3: document.getElementById('stat-label-3'),
    statLabel4: document.getElementById('stat-label-4'),
    
    chartOverview: document.getElementById('chart-overview'),
    chartTrend: document.getElementById('chart-trend'),
    chartComparison: document.getElementById('chart-comparison'),
    chartHistorical: document.getElementById('chart-historical'),
    
    trendTitle: document.getElementById('trend-title'),
    trendNote: document.getElementById('trend-note'),
    comparisonTitle: document.getElementById('comparison-title'),
    comparisonNote: document.getElementById('comparison-note'),
};

// Intro sequence data
const introSequence = [
    {
        title: "Welcome to Canada 🍁",
        description: "Let's take you on a journey through Canada's economic landscape. From coast to coast, each province tells a unique story.",
        camera: { center: [-95.7129, 56.1304], zoom: 3, pitch: 0, bearing: 0 },
        duration: 5500
    },
    {
        title: "The Economic Powerhouses",
        description: "Ontario and Quebec dominate with their massive economies, contributing over 60% of Canada's GDP. Check out how Toronto and Montreal light up the map.",
        camera: { center: [-79.3832, 45.5019], zoom: 5.5, pitch: 35, bearing: -20 },
        duration: 8000
    },
    {
        title: "The West's Rising Stars",
        description: "Alberta's energy sector and BC's tech hub in Vancouver are punching way above their weight. Oil, gas, and innovation drive the western economy.",
        camera: { center: [-119.4960, 53.5461], zoom: 4.8, pitch: 30, bearing: 15 },
        duration: 8000
    },
    {
        title: "The Atlantic Perspective",
        description: "The Maritime provinces may be smaller in GDP, but they're rich in culture, fishing, and tight-knit communities that keep Canada connected.",
        camera: { center: [-63.5859, 46.2382], zoom: 5.2, pitch: 25, bearing: -30 },
        duration: 8000
    },
    {
        title: "Your Turn to Explore",
        description: "Toggle between GDP and income data. Switch provincial and regional heatmaps. Dive into cities to see the real estate 'night sky'. The story's yours to uncover.",
        camera: { center: [-95.7129, 56.1304], zoom: 3.5, pitch: 20, bearing: 0 },
        duration: 8000 
    }
];

let introAnimationRunning = false;
let introSkipped = false;

async function playIntroSequence() {
    if (!elements.map || !elements.introOverlay) return;
    
    introAnimationRunning = true;
    introSkipped = false;
    
    // Hide all HUD elements
    elements.mapContainer.classList.add('hide-hud');
    
    // Show intro overlay
    elements.introOverlay.style.display = 'flex';
    elements.introOverlay.classList.remove('fade-out');
    
    // Play through each scene
    for (let i = 0; i < introSequence.length; i++) {
        if (introSkipped) break;
        
        const scene = introSequence[i];
        
        // Update text with fade animation
        await updateIntroText(scene.title, scene.description);
        
        // Animate camera
        elements.map.easeTo({
            ...scene.camera,
            duration: 2000,
            easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        });
        
        // Wait for scene duration (unless skipped)
        await sleep(scene.duration);
        
        if (introSkipped) break;
    }
    
    // End intro
    endIntro();
}

function updateIntroText(title, description) {
    return new Promise((resolve) => {
        // Fade out current text
        if (elements.introTitle && elements.introDescription) {
            elements.introTitle.style.animation = 'none';
            elements.introDescription.style.animation = 'none';
            elements.introTitle.style.opacity = '0';
            elements.introDescription.style.opacity = '0';
            
            setTimeout(() => {
                // Update text
                elements.introTitle.textContent = title;
                elements.introDescription.textContent = description;
                
                // Fade in new text
                elements.introTitle.style.animation = 'fadeInUp 0.8s ease-out forwards';
                elements.introDescription.style.animation = 'fadeInUp 0.8s ease-out 0.3s forwards';
                
                resolve();
            }, 500);
        } else {
            resolve();
        }
    });
}

function endIntro() {
    introAnimationRunning = false;
    
    // Fade out intro overlay
    if (elements.introOverlay) {
        elements.introOverlay.classList.add('fade-out');
        
        setTimeout(() => {
            elements.introOverlay.style.display = 'none';
        }, 1000);
    }
    
    // Show HUD elements
    if (elements.mapContainer) {
        elements.mapContainer.classList.remove('hide-hud');
    }
    
    // Animate back to Canada view
    if (elements.map) {
        elements.map.easeTo({
            center: [-95.7129, 56.1304],
            zoom: 3.5,
            pitch: 20,
            bearing: 0,
            duration: 1500
        });
    }
}

function skipIntro() {
    introSkipped = true;
    endIntro();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function initApp() {
    try {
        showLoadingIndicator(true);
        
        console.log('📊 Loading province data...');
        await loadProvinceData();
        
        await initMap();
        
        setupEventListeners();
        
        if (elements.mapScopeSelect) {
            elements.mapScopeSelect.value = getCurrentDataScope();
        }
        
        updateLegend();
        updateTabLabels();
        
        // Initialize legend as visible by default
        if (elements.legendPanel) {
            elements.legendPanel.classList.remove('hidden');
            appState.legendOpen = true;
        }
        
        setTimeout(() => {
            if (elements.onboardingTooltip) {
                elements.onboardingTooltip.style.animation = 'slideUp 0.3s ease-out';
            }
        }, 1000);
        
        showLoadingIndicator(false);
        
        // Play intro sequence after everything is loaded
        setTimeout(() => {
            playIntroSequence();
        }, 500);
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showLoadingIndicator(false);
    }
}

async function initMap() {
    return new Promise((resolve, reject) => {
        try {
            const map = new maplibregl.Map({
                container: 'map',
                style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
                center: [-95.7129, 56.1304],
                zoom: 3,
                pitch: 0,
                bearing: 0,
                projection: 'globe',
                maxBounds: CANADA_BOUNDS,
                renderWorldCopies: false,
            });
            
            elements.map = map;
            
            const loadTimeout = setTimeout(() => {
                console.warn('⚠️ Map loading took too long. Continuing anyway...');
                resolve();
            }, 10000);
            
            map.on('load', async () => {
                clearTimeout(loadTimeout);
                
                try {
                    map.setFog({
                        'color': 'rgb(17, 24, 39)',
                        'high-color': 'rgb(31, 41, 55)',
                        'horizon-blend': 0.08,
                        'space-color': [0.1, 0.1, 0.2],
                        'star-intensity': 0.2,
                    });
                } catch (e) {
                    console.warn('Fog effect not supported:', e.message);
                }
                
                await addProvincePolygons(map);
                addCityMarkers(map);
                
                appState.mapLoaded = true;
                resolve();
            });
            
            map.on('error', (error) => {
                clearTimeout(loadTimeout);
                console.error('Map error:', error);
                resolve();
            });
            
        } catch (error) {
            console.error('Map initialization error:', error);
            reject(error);
        }
    });
}

async function addProvincePolygons(map) {
    const provinceNameToId = {
        'Alberta': 'ab',
        'British Columbia': 'bc',
        'Manitoba': 'mb',
        'New Brunswick': 'nb',
        'Newfoundland and Labrador': 'nl',
        'Northwest Territories': 'nt',
        'Nova Scotia': 'ns',
        'Nunavut': 'nu',
        'Ontario': 'on',
        'Prince Edward Island': 'pe',
        'Quebec': 'qc',
        'Saskatchewan': 'sk',
        'Yukon Territory': 'yt',
        'Yukon': 'yt'
    };
    
    try {
        const response = await fetch('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/canada.geojson');
        const canadaGeoJSON = await response.json();
        
        console.log('✅ Loaded Canada GeoJSON data');
        
        canadaGeoJSON.features = canadaGeoJSON.features.map((feature, idx) => {
            const provinceName = feature.properties.name;
            const provinceId = provinceNameToId[provinceName];
            
            let dataValue = 0;
            let color = '#ff0080';
            
            const scopeValue = getScopedValueForProvince(provinceId);
            dataValue = scopeValue;
            
            const currentScope = getCurrentDataScope();
            const dataType = getCurrentDataType();
            
            if (dataType === 'income') {
                color = dataValue ? getDataColor(dataValue, currentScope) : '#666666';
            } else {
                color = dataValue ? getDataColor(dataValue, currentScope) : '#ff0080';
            }
            
            const regionName = getRegionNameForProvince(provinceId);
            
            return {
                ...feature,
                id: idx,
                properties: {
                    ...feature.properties,
                    id: provinceId,
                    region: regionName,
                    color: color,
                    dataValue: dataValue,
                    population: PROVINCE_POPULATIONS[provinceId] || 0,
                }
            };
        });
        
        map.addSource('province-polygons', {
            type: 'geojson',
            data: canadaGeoJSON,
        });
        
        map.addLayer({
            id: 'province-fills',
            type: 'fill',
            source: 'province-polygons',
            paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    0.5,
                    0.3
                ],
            },
        });
        
        map.addLayer({
            id: 'province-outlines',
            type: 'line',
            source: 'province-polygons',
            paint: {
                'line-color': ['get', 'color'],
                'line-width': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    4,
                    2
                ],
                'line-opacity': 0.9,
            },
        });
        
        let hoveredPolygonId = null;
        
    map.on('mousemove', 'province-fills', (e) => {
        if (e.features.length > 0) {
            if (hoveredPolygonId !== null) {
                map.setFeatureState(
                    { source: 'province-polygons', id: hoveredPolygonId },
                    { hover: false }
                );
            }
            hoveredPolygonId = e.features[0].id;
            map.setFeatureState(
                { source: 'province-polygons', id: hoveredPolygonId },
                { hover: true }
            );
            map.getCanvas().style.cursor = 'pointer';
            
            const feature = e.features[0];
            const dataValue = feature.properties.dataValue;
            const name = feature.properties.name;
            const provinceId = feature.properties.id;
            const scope = getCurrentDataScope();
            const regionName = getRegionNameForProvince(provinceId);
            
            let provinceData = null;
            if (getCurrentDataType() === 'income') {
                provinceData = CANADIAN_PROVINCES_INCOME.find(p => p.id === provinceId);
            } else {
                provinceData = CANADIAN_PROVINCES_GDP.find(p => p.id === provinceId);
            }
            
            let tooltip = document.getElementById('map-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'map-tooltip';
                tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 10px 14px;
                    border-radius: 6px;
                    font-size: 13px;
                    pointer-events: none;
                    z-index: 1000;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                `;
                document.body.appendChild(tooltip);
            }
            
            const dataType = getCurrentDataType();
            let tooltipContent = `<strong>${name}</strong><br>`;
            
            if (dataType === 'income') {
                if (provinceData?.averageIncome === null) {
                    tooltipContent += `Avg Income: N/A<br>`;
                    tooltipContent += `Status: No Data`;
                } else {
                    if (scope === 'region') {
                        tooltipContent += `Regional Avg (${regionName || 'Regional'}): ${formatIncome(dataValue)}<br>`;
                        tooltipContent += `Provincial Avg: ${formatIncome(provinceData?.averageIncome || 0)}<br>`;
                    } else {
                        tooltipContent += `Avg Income: ${formatIncome(dataValue)}<br>`;
                    }
                    tooltipContent += `Status: ${getIncomeStatus(provinceData?.averageIncome || dataValue)}`;
                }
            } else {
                if (scope === 'region') {
                    tooltipContent += `Regional GDP 2023 (${regionName || 'Regional'}): $${dataValue.toLocaleString()}B<br>`;
                    tooltipContent += `Provincial GDP 2023: $${(provinceData?.gdp2023 || 0).toLocaleString()}B<br>`;
                } else {
                    tooltipContent += `GDP 2023: $${dataValue.toLocaleString()}B<br>`;
                }
                tooltipContent += `Status: ${getGDPStatus(provinceData?.gdp2023 || dataValue)}`;
            }
            
            tooltip.innerHTML = tooltipContent;
            tooltip.style.left = e.point.x + 15 + 'px';
            tooltip.style.top = e.point.y - 10 + 'px';
            tooltip.style.display = 'block';
        }
    });
        
    map.on('mouseleave', 'province-fills', () => {
        if (hoveredPolygonId !== null) {
            map.setFeatureState(
                { source: 'province-polygons', id: hoveredPolygonId },
                { hover: false }
            );
        }
        hoveredPolygonId = null;
        map.getCanvas().style.cursor = '';
        
        const tooltip = document.getElementById('map-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    });
        
        map.on('click', 'province-fills', (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                const provinceId = feature.properties.id;
                const provinceName = feature.properties.name;
                
                console.log(`📍 Clicked on ${provinceName}, ID: ${provinceId}`);
                
                if (!provinceId) {
                    console.error('❌ No province ID found for:', provinceName);
                    return;
                }
                
                const coordinates = feature.geometry.coordinates;
                let bounds;
                
                try {
                    if (feature.geometry.type === 'Polygon') {
                        bounds = coordinates[0].reduce((bounds, coord) => {
                            return bounds.extend(coord);
                        }, new maplibregl.LngLatBounds(coordinates[0][0], coordinates[0][0]));
                    } else if (feature.geometry.type === 'MultiPolygon') {
                        const allCoords = coordinates.flat(2);
                        bounds = allCoords.reduce((bounds, coord) => {
                            return bounds.extend(coord);
                        }, new maplibregl.LngLatBounds(allCoords[0], allCoords[0]));
                    }
                    
                    console.log('✅ Calculated bounds:', bounds);
                    
                    selectProvince(provinceId, bounds);
                } catch (error) {
                    console.error('❌ Error calculating bounds:', error);
                    selectProvince(provinceId);
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to load Canada GeoJSON:', error);
        console.log('Province polygons will not be displayed');
    }
}

function addCityMarkers(map) {
    map.addSource('city-markers', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });
    
    map.addLayer({
        id: 'city-circles',
        type: 'circle',
        source: 'city-markers',
        paint: {
            'circle-radius': 6,
            'circle-color': '#00d9ff',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9
        }
    });
    
    let hoveredCityId = null;
    
    map.on('mouseenter', 'city-circles', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', 'city-circles', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredCityId !== null) {
            map.setFeatureState(
                { source: 'city-markers', id: hoveredCityId },
                { hover: false }
            );
        }
        hoveredCityId = null;
        
        const tooltip = document.getElementById('map-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    });
    
    map.on('mousemove', 'city-circles', (e) => {
        if (e.features.length > 0) {
            if (hoveredCityId !== null) {
                map.setFeatureState(
                    { source: 'city-markers', id: hoveredCityId },
                    { hover: false }
                );
            }
            hoveredCityId = e.features[0].id;
            map.setFeatureState(
                { source: 'city-markers', id: hoveredCityId },
                { hover: true }
            );
            
            const feature = e.features[0];
            const cityName = feature.properties.name;
            const gdp = feature.properties.gdp;
            const population = feature.properties.population;
            
            let tooltip = document.getElementById('map-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'map-tooltip';
                tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 10px 14px;
                    border-radius: 6px;
                    font-size: 13px;
                    pointer-events: none;
                    z-index: 1000;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                `;
                document.body.appendChild(tooltip);
            }
            
            tooltip.innerHTML = `
                <strong>${cityName}</strong><br>
                GDP: $${(gdp / 1000).toFixed(1)}B<br>
                Population: ${population.toLocaleString()}
            `;
            tooltip.style.left = e.point.x + 15 + 'px';
            tooltip.style.top = e.point.y - 10 + 'px';
            tooltip.style.display = 'block';
        }
    });
    
    map.on('click', 'city-circles', (e) => {
        if (e.features.length > 0) {
            const feature = e.features[0];
            const cityId = feature.properties.id;
            const provinceId = feature.properties.provinceId;
            
            console.log(`🏙️ Clicked on city: ${cityId} in province: ${provinceId}`);
            selectCity(provinceId, cityId);
        }
    });
}

function showCitiesForProvince(provinceId) {
    const cities = getCitiesForProvince(provinceId);
    
    const features = cities.map((city, idx) => ({
        type: 'Feature',
        id: idx,
        geometry: {
            type: 'Point',
            coordinates: [city.lng, city.lat]
        },
        properties: {
            id: city.id,
            name: city.name,
            provinceId: provinceId,
            gdp: city.gdp,
            population: city.population,
            hasStreetView: city.hasStreetView
        }
    }));
    
    const source = elements.map.getSource('city-markers');
    if (source) {
        source.setData({
            type: 'FeatureCollection',
            features: features
        });
    }
    
    console.log(`✅ Showing ${cities.length} cities for ${provinceId}`);
}

function hideCities() {
    const source = elements.map.getSource('city-markers');
    if (source) {
        source.setData({
            type: 'FeatureCollection',
            features: []
        });
    }
}

function selectProvince(provinceId, bounds = null) {
    console.log('🎯 selectProvince called with ID:', provinceId);
    
    const province = getProvinceById(provinceId);
    if (!province) {
        console.error('❌ Province not found for ID:', provinceId);
        console.log('Available provinces:', getAllProvinces().map(p => ({ id: p.id, name: p.name })));
        return;
    }
    
    console.log('✅ Province found:', province.name);
    
    appState.selectedProvince = provinceId;
    appState.selectedCity = null;
    
    console.log('📊 Updating province info panel...');
    updateProvinceInfoPanel(province);
    
    console.log('📈 Updating data panel...');
    updateDataPanel(provinceId);
    
    console.log('🏙️ Showing cities for province...');
    showCitiesForProvince(provinceId);
    
    console.log('👁️ Showing panels...');
    if (elements.provinceInfoPanel) {
        elements.provinceInfoPanel.classList.remove('hidden');
        console.log('✅ Province info panel shown');
    } else {
        console.error('❌ Province info panel element not found');
    }
    
    if (elements.dataPanel) {
        elements.dataPanel.classList.remove('hidden');
        console.log('✅ Data panel shown');
    } else {
        console.error('❌ Data panel element not found');
    }
    
    updateStreetViewButton();
    
    if (elements.map) {
        if (bounds) {
            console.log('🗺️ Fitting to bounds...');
            try {
                elements.map.fitBounds(bounds, {
                    padding: { top: 100, bottom: 100, left: 100, right: 450 },
                    pitch: 20,
                    bearing: 0,
                    duration: 1500,
                    essential: true,
                });
                console.log('✅ Zoom animation started');
            } catch (error) {
                console.error('❌ Error fitting bounds:', error);
            }
        } else {
            console.log('🗺️ Zooming to center...');
            elements.map.easeTo({
                center: province.center,
                zoom: 5,
                pitch: 20,
                bearing: 0,
                duration: 1000,
                essential: true,
            });
        }
    } else {
        console.error('❌ Map element not found');
    }
}

function selectCity(provinceId, cityId) {
    console.log('🏙️ selectCity called:', cityId, 'in province:', provinceId);
    
    const city = getCityById(provinceId, cityId);
    if (!city) {
        console.error('❌ City not found:', cityId);
        return;
    }
    
    console.log('✅ City found:', city.name);
    
    appState.selectedCity = city;
    appState.selectedProvince = provinceId;
    
    updateCityInfoPanel(city);
    updateCityDataPanel(city, provinceId);
    
    if (elements.provinceInfoPanel) {
        elements.provinceInfoPanel.classList.remove('hidden');
    }
    
    if (elements.dataPanel) {
        elements.dataPanel.classList.remove('hidden');
    }
    
    updateStreetViewButton();
    
    if (elements.map) {
        elements.map.easeTo({
            center: [city.lng, city.lat],
            zoom: 11,
            pitch: 45,
            bearing: 0,
            duration: 1000,
            essential: true,
        });
    }
}

function updateCityInfoPanel(city) {
    elements.provinceName.textContent = city.name;
    elements.provincePopulation.textContent = `Population: ${formatNumber(city.population)}`;
    elements.provinceCoordinates.textContent = `Coordinates: ${city.lat.toFixed(4)}°, ${city.lng.toFixed(4)}°`;
}

function updateCityDataPanel(city, provinceId) {
    const dataType = getCurrentDataType();
    
    // Update panel title
    elements.panelProvinceTitle.textContent = `${city.name} Economic Data`;
    
    // Switch to overview tab
    elements.tabButtons.forEach(btn => btn.classList.remove('active'));
    elements.tabPanes.forEach(pane => pane.classList.remove('active'));
    
    const overviewTabBtn = document.querySelector('[data-tab="overview"]');
    const overviewPane = document.getElementById('tab-overview');
    if (overviewTabBtn) overviewTabBtn.classList.add('active');
    if (overviewPane) overviewPane.classList.add('active');
    
    // Update stat labels for city data
    elements.statLabel1.textContent = 'City GDP';
    elements.statLabel2.textContent = 'Population';
    elements.statLabel3.textContent = 'GDP per Capita';
    elements.statLabel4.textContent = 'Province';
    
    const gdpInBillions = city.gdp / 1000;
    const gdpPerCapita = (city.gdp * 1_000_000) / city.population;
    const province = getProvinceById(provinceId);
    
    elements.statCurrentRate.textContent = `$${gdpInBillions.toFixed(2)}B`;
    elements.statAvgRate.textContent = formatNumber(city.population);
    elements.statPeakRate.textContent = `$${(gdpPerCapita / 1000).toFixed(1)}k`;
    elements.statPeakYear.textContent = province ? province.name : provinceId.toUpperCase();
    
    // Clear existing charts
    d3.select(elements.chartTrend).selectAll('*').remove();
    d3.select(elements.chartComparison).selectAll('*').remove();
    d3.select(elements.chartOverview).selectAll('*').remove();
    
    // Render city overview chart
    renderCityOverviewChart(city, provinceId);
    
    // Render city trend/details chart
    renderCityDetailsChart(city, provinceId);
    
    // Render city comparison chart
    renderCityComparisonChart(city, provinceId);
    
    // Update tab labels for city view
    const trendTabBtn = document.getElementById('tab-trend-btn');
    if (trendTabBtn) {
        trendTabBtn.textContent = '📊 City Details';
    }
    
    elements.trendTitle.textContent = 'City Economic Overview';
    elements.comparisonTitle.textContent = 'Cities in ' + (province ? province.name : provinceId.toUpperCase());
    elements.comparisonNote.textContent = 'GDP comparison of major cities';
}

function renderCityDetailsChart(city, provinceId) {
    const province = getProvinceById(provinceId);
    if (!province) return;
    
    const textColor = '#e5e7eb';
    const primaryColor = '#00d9ff';
    const secondaryColor = '#7928ca';
    const gridColor = '#374151';
    
    const width = 380;
    const height = 280;
    const margin = { top: 40, right: 30, bottom: 30, left: 30 };
    
    const svg = d3.select(elements.chartTrend)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent')
        .style('overflow', 'visible');
    
    const chart = svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);
    
    // Calculate metrics
    const cityShare = (city.gdp / province.gdp2023) * 100;
    const gdpPerCapita = (city.gdp * 1_000_000) / city.population;
    const provinceGDPPerCapita = (province.gdp2023 * 1_000_000) / province.population;
    const perCapitaRatio = (gdpPerCapita / provinceGDPPerCapita) * 100;
    
    // Draw circular progress for city's contribution to province
    const radius = 80;
    const thickness = 20;
    
    // Background circle
    chart.append('circle')
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', gridColor)
        .attr('stroke-width', thickness);
    
    // Progress arc
    const arc = d3.arc()
        .innerRadius(radius - thickness / 2)
        .outerRadius(radius + thickness / 2)
        .startAngle(0)
        .endAngle((cityShare / 100) * 2 * Math.PI);
    
    chart.append('path')
        .attr('d', arc)
        .attr('fill', primaryColor)
        .style('filter', 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.6))');
    
    // Center text
    chart.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', -10)
        .attr('font-size', '32px')
        .attr('font-weight', '700')
        .attr('fill', primaryColor)
        .text(`${cityShare.toFixed(1)}%`);
    
    chart.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', 15)
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .attr('fill', textColor)
        .text('of Province GDP');
    
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .attr('fill', textColor)
        .text(`${city.name}'s Economic Contribution`);
    
    // Additional metrics at bottom
    const bottomY = height - 20;
    
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', bottomY)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('fill', textColor)
        .text(`GDP per Capita: $${(gdpPerCapita / 1000).toFixed(0)}k (${perCapitaRatio.toFixed(0)}% of province avg)`);
}

function renderCityOverviewChart(city, provinceId) {
    const province = getProvinceById(provinceId);
    if (!province) return;
    
    const textColor = '#e5e7eb';
    const primaryColor = '#00d9ff';
    const secondaryColor = '#7928ca';
    
    const width = 380;
    const height = 280;
    const margin = { top: 35, right: 30, bottom: 35, left: 30 };
    
    const svg = d3.select(elements.chartOverview)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent')
        .style('overflow', 'visible');
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Calculate metrics
    const cityGDP = city.gdp / 1000; // in billions
    const provinceGDP = province.gdp2023 / 1000; // in billions
    const cityShare = (city.gdp / province.gdp2023) * 100;
    const gdpPerCapita = (city.gdp * 1_000_000) / city.population;
    
    // Create sections for the overview
    const sections = [
        { label: 'City GDP', value: `$${cityGDP.toFixed(1)}B`, y: 40 },
        { label: 'Province Share', value: `${cityShare.toFixed(1)}%`, y: 90 },
        { label: 'GDP per Capita', value: `$${(gdpPerCapita / 1000).toFixed(0)}k`, y: 140 },
        { label: 'Population', value: formatNumber(city.population), y: 190 }
    ];
    
    // Title
    chart.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', '700')
        .attr('fill', primaryColor)
        .text(`${city.name} Economic Overview`);
    
    // Draw metrics
    sections.forEach(section => {
        const group = chart.append('g')
            .attr('transform', `translate(0, ${section.y})`);
        
        // Background bar
        group.append('rect')
            .attr('x', 0)
            .attr('y', -20)
            .attr('width', innerWidth)
            .attr('height', 40)
            .attr('fill', 'rgba(100, 100, 100, 0.1)')
            .attr('rx', 6);
        
        // Label
        group.append('text')
            .attr('x', 15)
            .attr('y', 0)
            .attr('text-anchor', 'start')
            .attr('font-size', '13px')
            .attr('font-weight', '500')
            .attr('fill', textColor)
            .attr('alignment-baseline', 'middle')
            .text(section.label);
        
        // Value
        group.append('text')
            .attr('x', innerWidth - 15)
            .attr('y', 0)
            .attr('text-anchor', 'end')
            .attr('font-size', '15px')
            .attr('font-weight', '700')
            .attr('fill', primaryColor)
            .attr('alignment-baseline', 'middle')
            .text(section.value);
    });
}

function renderCityComparisonChart(selectedCity, provinceId) {
    const cities = getCitiesForProvince(provinceId);
    
    if (!cities || cities.length === 0) return;
    
    const highlightColor = '#00d9ff';
    const textColor = '#e5e7eb';
    const gridColor = '#374151';
    
    const width = 380;
    const height = 400;
    const margin = { top: 40, right: 25, bottom: 85, left: 75 };
    
    const svg = d3.select(elements.chartComparison)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent')
        .style('overflow', 'visible');
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const sortedCities = [...cities].sort((a, b) => b.gdp - a.gdp);
    
    const xScale = d3.scaleBand()
        .domain(sortedCities.map(c => c.name))
        .range([0, innerWidth])
        .padding(0.2);
    
    const yScale = d3.scaleLinear()
        .domain([0, Math.max(...sortedCities.map(c => c.gdp)) * 1.15])
        .range([innerHeight, 0]);
    
    chart.selectAll('.grid-line')
        .data(yScale.ticks(6))
        .join('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', gridColor)
        .attr('stroke-width', 1)
        .attr('opacity', 0.3);
    
    const isSelected = (cityName) => cityName === selectedCity.name;
    
    chart.selectAll('.bar')
        .data(sortedCities)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.name))
        .attr('y', d => yScale(d.gdp))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.gdp))
        .attr('fill', d => isSelected(d.name) ? highlightColor : '#7928ca')
        .attr('rx', 3)
        .attr('ry', 3)
        .style('filter', d => isSelected(d.name) ? 
            'drop-shadow(0 0 8px rgba(0, 217, 255, 0.6))' : 'none')
        .attr('opacity', d => isSelected(d.name) ? 1 : 0.7);
    
    chart.selectAll('.value-label')
        .data(sortedCities)
        .join('text')
        .attr('class', 'value-label')
        .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.gdp) - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-weight', '700')
        .attr('fill', d => isSelected(d.name) ? highlightColor : textColor)
        .text(d => `$${(d.gdp / 1000).toFixed(1)}B`);
    
    const xAxis = chart.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale)
            .tickSize(0)
            .tickPadding(8));
    
    xAxis.selectAll('text')
        .attr('font-size', '10px')
        .attr('font-weight', d => isSelected(d) ? '700' : '500')
        .attr('fill', d => isSelected(d) ? highlightColor : textColor)
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');
    
    xAxis.select('.domain')
        .attr('stroke', gridColor);
    
    const yAxis = chart.append('g')
        .call(d3.axisLeft(yScale)
            .ticks(6)
            .tickSize(0)
            .tickPadding(10)
            .tickFormat(d => `$${(d / 1000).toFixed(0)}B`));
    
    yAxis.selectAll('text')
        .attr('font-size', '11px')
        .attr('fill', textColor);
    
    yAxis.select('.domain')
        .attr('stroke', gridColor);
    
    chart.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .attr('fill', textColor)
        .text('City GDP Comparison');
}

function updateStreetViewButton() {
    console.log('🔄 updateStreetViewButton called, streetViewOpen:', appState.streetViewOpen);
    
    // Always hide floating button - we never want it to show
    if (elements.btnStreetViewFloating) {
        elements.btnStreetViewFloating.classList.add('hidden');
    }
    
    // Always hide province panel button - night sky is only for cities
    if (elements.btnStreetViewProvincePanel) {
        elements.btnStreetViewProvincePanel.classList.add('hidden');
    }
    
    // Only manage the right panel button
    const btn = elements.btnStreetView;
    
    if (appState.streetViewOpen) {
        // In night sky view mode - show exit button
        console.log('Setting button to Exit Night Sky mode (RED)');
        if (btn) {
            btn.textContent = '✕ Exit Night Sky';
            btn.style.setProperty('background', '#ef4444', 'important');
            btn.style.setProperty('background-image', 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 'important');
            btn.classList.remove('hidden');
        }
    } else if (appState.selectedCity) {
        // City selected but not in night sky view - show night sky button
        console.log('Setting button to Enter Night Sky mode (BLUE) - City selected');
        if (btn) {
            btn.textContent = '🌌 View Night Sky';
            btn.style.removeProperty('background');
            btn.style.removeProperty('background-image');
            btn.classList.remove('hidden');
        }
    } else {
        // Province selected or nothing selected - hide the button
        console.log('Hiding night sky button - no city selected');
        if (btn) {
            btn.classList.add('hidden');
        }
    }
}

function updateProvinceInfoPanel(province) {
    elements.provinceName.textContent = province.name;
    elements.provincePopulation.textContent = `Population: ${formatNumber(province.population)}`;
    elements.provinceCoordinates.textContent = `Center: ${province.center[1].toFixed(2)}°, ${province.center[0].toFixed(2)}°`;
    if (elements.provinceRegion) {
        const regionName = getRegionNameForProvince(province.id);
        if (regionName) {
            elements.provinceRegion.textContent = `Region: ${regionName}`;
            elements.provinceRegion.classList.remove('hidden');
        } else {
            elements.provinceRegion.textContent = '';
            elements.provinceRegion.classList.add('hidden');
        }
    }
}

function updateDataPanel(provinceId) {
    const metrics = getProvinceMetrics(provinceId);
    const province = getProvinceById(provinceId);
    
    if (!metrics || !province) return;
    
    const dataType = getCurrentDataType();
    
    elements.panelProvinceTitle.textContent = `${province.name} ${dataType.toUpperCase()} Data`;
    
    if (dataType === 'income') {
        elements.statLabel1.textContent = 'Average Income';
        elements.statLabel2.textContent = 'Median Income';
        elements.statLabel3.textContent = 'Sample Size';
        elements.statLabel4.textContent = 'Status';
        
        if (metrics.averageIncome === null) {
            elements.statCurrentRate.textContent = 'N/A';
            elements.statAvgRate.textContent = 'N/A';
            elements.statPeakRate.textContent = '0';
            elements.statPeakYear.textContent = 'No Data';
        } else {
            elements.statCurrentRate.textContent = formatIncome(metrics.averageIncome);
            elements.statAvgRate.textContent = formatIncome(metrics.medianIncome);
            elements.statPeakRate.textContent = formatNumber(metrics.sampleSize);
            elements.statPeakYear.textContent = getIncomeStatus(metrics.averageIncome);
        }
    } else {
        elements.statLabel1.textContent = 'GDP 2023';
        elements.statLabel2.textContent = 'GDP 2022';
        elements.statLabel3.textContent = 'GDP 2021';
        elements.statLabel4.textContent = 'Growth 2022-23';
        
        elements.statCurrentRate.textContent = formatCurrency(metrics.gdp2023);
        elements.statAvgRate.textContent = formatCurrency(metrics.gdp2022);
        elements.statPeakRate.textContent = formatCurrency(metrics.gdp2021);
        elements.statPeakYear.textContent = formatPercentage(metrics.growth2022_2023);
    }
    
    renderProvinceOverview(provinceId, metrics);
    renderCharts(metrics, provinceId);
}

function updateLegend() {
    const dataType = getCurrentDataType();
    const scope = getCurrentDataScope();
    const scopeLabel = scope === 'region'
        ? 'regional averages'
        : (dataType === 'income' ? 'provincial averages' : 'provincial totals');
    
    // Update scope indicator
    if (elements.scopeIndicator) {
        elements.scopeIndicator.textContent = scope === 'region' ? 'Regional' : 'Provincial';
        if (scope === 'region') {
            elements.scopeIndicator.classList.add('regional');
        } else {
            elements.scopeIndicator.classList.remove('regional');
        }
    }
    
    if (dataType === 'income') {
        elements.legendTitle.textContent = 'Income Color Legend';
        elements.legendNote.textContent = `Map colors reflect ${scopeLabel} for household income`;
        
        if (scope === 'region') {
            // Regional income ranges
            elements.legendItems.innerHTML = `
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #00d9ff;"></span>
                    <span>Very High ($58k+)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #0070f3;"></span>
                    <span>High ($52k-$58k)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #7928ca;"></span>
                    <span>Moderate ($46k-$52k)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #f81ce5;"></span>
                    <span>Low ($40k-$46k)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #ff0080;"></span>
                    <span>Very Low (<$40k)</span>
                </div>
            `;
        } else {
            // Provincial income ranges
            elements.legendItems.innerHTML = `
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #00d9ff;"></span>
                    <span>Very High ($60k+)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #0070f3;"></span>
                    <span>High ($50k-$60k)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #7928ca;"></span>
                    <span>Moderate ($40k-$50k)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #f81ce5;"></span>
                    <span>Low ($30k-$40k)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #ff0080;"></span>
                    <span>Very Low (<$30k)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #666666;"></span>
                    <span>No Data (N/A)</span>
                </div>
            `;
        }
    } else {
        elements.legendTitle.textContent = 'GDP Color Legend';
        elements.legendNote.textContent = `Map colors reflect ${scopeLabel} for GDP`;
        
        if (scope === 'region') {
            // Regional GDP ranges (much larger totals)
            elements.legendItems.innerHTML = `
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #00d9ff;"></span>
                    <span>Very High ($1T+)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #0070f3;"></span>
                    <span>High ($400B-$1T)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #7928ca;"></span>
                    <span>Moderate ($200B-$400B)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #f81ce5;"></span>
                    <span>Low ($50B-$200B)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #ff0080;"></span>
                    <span>Very Low (<$50B)</span>
                </div>
            `;
        } else {
            // Provincial GDP ranges
            elements.legendItems.innerHTML = `
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #00d9ff;"></span>
                    <span>Very High ($300B+)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #0070f3;"></span>
                    <span>High ($100B-$300B)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #7928ca;"></span>
                    <span>Moderate ($50B-$100B)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #f81ce5;"></span>
                    <span>Low ($10B-$50B)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background-color: #ff0080;"></span>
                    <span>Very Low (<$10B)</span>
                </div>
            `;
        }
    }
}

function updateTabLabels() {
    const dataType = getCurrentDataType();
    
    if (dataType === 'income') {
        elements.tabTrendBtn.textContent = '📊 Income Distribution';
        elements.trendTitle.textContent = 'Income Distribution';
        elements.trendNote.textContent = 'Box plot showing income quartiles and outliers';
        elements.comparisonTitle.textContent = 'Provincial Income Comparison';
        elements.comparisonNote.textContent = 'Average income by province';
    } else {
        elements.tabTrendBtn.textContent = '📊 GDP Trend';
        elements.trendTitle.textContent = 'GDP Trend (2021-2023)';
        elements.trendNote.textContent = '3-year GDP trend';
        elements.comparisonTitle.textContent = 'Provincial GDP Comparison';
        elements.comparisonNote.textContent = 'GDP by province (2023)';
    }
}

function switchDataType(newDataType) {
    console.log(`🔄 Switching data type to: ${newDataType}`);
    
    setCurrentDataType(newDataType);
    
    updateLegend();
    
    updateTabLabels();
    
    updateMapColors();
    
    if (appState.selectedProvince) {
        updateDataPanel(appState.selectedProvince);
    }
}

function switchDataScope(newScope) {
    console.log(`🗺️ Switching heatmap scope to: ${newScope}`);
    const updated = setCurrentDataScope(newScope);
    if (!updated) return;
    
    updateLegend();
    updateMapColors();
    
    if (appState.selectedProvince) {
        updateDataPanel(appState.selectedProvince);
    }
}

function updateMapColors() {
    if (!elements.map) return;
    
    const dataType = getCurrentDataType();
    const currentScope = getCurrentDataScope();
    
    const source = elements.map.getSource('province-polygons');
    if (!source || !source._data) return;
    
    source._data.features = source._data.features.map(feature => {
        const provinceId = feature.properties.id;
        const dataValue = getScopedValueForProvince(provinceId);
        let color = '#ff0080';
        
        if (dataType === 'income') {
            color = dataValue ? getDataColor(dataValue, currentScope) : '#666666';
        } else {
            color = dataValue ? getDataColor(dataValue, currentScope) : '#ff0080';
        }
        
        return {
            ...feature,
            properties: {
                ...feature.properties,
                region: getRegionNameForProvince(provinceId),
                color: color,
                dataValue: dataValue
            }
        };
    });
    
    elements.map.getSource('province-polygons').setData(source._data);
}

function renderCharts(metrics, provinceId) {
    d3.select(elements.chartTrend).selectAll('*').remove();
    d3.select(elements.chartComparison).selectAll('*').remove();
    
    const dataType = getCurrentDataType();
    
    if (dataType === 'income') {
        renderIncomeBoxPlot(metrics, provinceId);
        renderIncomeComparisonChart(metrics);
    } else {
        renderTrendChart(metrics);
        renderComparisonChart(metrics);
    }
}

function renderProvinceOverview(provinceId, metrics) {
    if (!elements.chartOverview) return;
    const province = getProvinceById(provinceId);
    if (!province) return;
    
    elements.chartOverview.innerHTML = '';
    
    const dataType = getCurrentDataType();
    const regionName = getRegionNameForProvince(provinceId);
    const regionMetrics = getRegionMetricsForProvince(provinceId, dataType);
    const cards = [];
    
    if (dataType === 'income') {
        const averageIncome = metrics.averageIncome ?? province.averageIncome ?? null;
        const medianIncome = metrics.medianIncome ?? province.medianIncome ?? null;
        const regionAverage = regionMetrics?.averageIncome ?? null;
        const regionGap = regionAverage !== null && averageIncome !== null
            ? averageIncome - regionAverage
            : null;
        
        cards.push({
            label: 'Avg Income',
            value: averageIncome !== null ? formatIncome(averageIncome) : 'N/A',
            caption: 'Weighted average respondent income'
        });
        cards.push({
            label: 'Median Income',
            value: medianIncome ? formatIncome(medianIncome) : 'N/A',
            caption: 'Middle of distribution'
        });
        cards.push({
            label: 'Region Avg',
            value: regionAverage ? formatIncome(regionAverage) : 'N/A',
            caption: regionName ? `${regionName} households` : 'Regional benchmark'
        });
        cards.push({
            label: 'Gap vs Region',
            value: regionGap !== null ? `${regionGap >= 0 ? '+' : '-'}${formatIncome(Math.abs(regionGap))}` : 'N/A',
            caption: regionGap !== null
                ? (regionGap >= 0 ? 'Above regional average' : 'Below regional average')
                : 'No comparison data'
        });
    } else {
        const gdp2023 = metrics.gdp2023 || 0;
        const gdpPerCapita = metrics.gdpPerCapita2023 || 0;
        const canadaTotal = CANADIAN_PROVINCES_GDP.reduce((sum, item) => sum + (item.gdp2023 || 0), 0);
        const canadaShare = canadaTotal ? ((gdp2023 / canadaTotal) * 100) : 0;
        const regionTotal = regionMetrics?.gdp2023 || 0;
        const regionShare = regionTotal ? ((gdp2023 / regionTotal) * 100) : null;
        
        cards.push({
            label: 'GDP 2023',
            value: formatCurrency(gdp2023),
            caption: 'Current dollars (millions)'
        });
        cards.push({
            label: 'GDP per Capita',
            value: formatIncome(gdpPerCapita),
            caption: 'Economic output per resident'
        });
        cards.push({
            label: 'Share of Canada',
            value: `${canadaShare.toFixed(1)}%`,
            caption: 'Portion of national GDP'
        });
        cards.push({
            label: regionName ? `${regionName} Share` : 'Regional Share',
            value: regionShare !== null ? `${regionShare.toFixed(1)}%` : 'N/A',
            caption: regionShare !== null ? 'Of regional GDP' : 'No regional total'
        });
    }
    
    const cities = getCitiesForProvince(provinceId)
        .filter(city => city.gdp)
        .sort((a, b) => b.gdp - a.gdp)
        .slice(0, 3);
    
    const cardsHtml = cards.map(card => `
        <div class="overview-card">
            <span class="overview-label">${card.label}</span>
            <span class="overview-value">${card.value}</span>
            <span class="overview-caption">${card.caption}</span>
        </div>
    `).join('');
    
    let citiesHtml = '';
    if (cities.length) {
        const cityItems = cities.map(city => `
            <li>
                <span>${city.name}</span>
                <strong>$${(city.gdp / 1000).toFixed(1)}B</strong>
            </li>
        `).join('');
        
        citiesHtml = `
            <div class="overview-cities">
                <div class="overview-cities-header">
                    <h4>Major City GDP Snapshot</h4>
                    <span>Top ${cities.length} cities by GDP</span>
                </div>
                <ul>
                    ${cityItems}
                </ul>
            </div>
        `;
    }
    
    elements.chartOverview.innerHTML = `
        <div class="overview-grid">
            ${cardsHtml}
        </div>
        ${citiesHtml}
    `;
}

function renderIncomeBoxPlot(metrics, provinceId) {
    if (!metrics.rawIncomeData || metrics.rawIncomeData.length === 0) {
        d3.select(elements.chartTrend)
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('height', '280px')
            .style('color', '#94a3b8')
            .style('font-size', '16px')
            .style('font-weight', '500')
            .text('No income data available for this territory');
        return;
    }
    
    const data = metrics.rawIncomeData.sort((a, b) => a - b);
    const q1 = d3.quantile(data, 0.25);
    const median = d3.quantile(data, 0.5);
    const q3 = d3.quantile(data, 0.75);
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    
    const outliers = data.filter(d => d < lowerFence || d > upperFence);
    const whiskerMin = Math.max(lowerFence, d3.min(data));
    const whiskerMax = Math.min(upperFence, d3.max(data));
    
    const boxColor = '#00d9ff';
    const whiskerColor = '#e5e7eb';
    const outlierColor = '#f81ce5';
    const textColor = '#e5e7eb';
    const gridColor = '#374151';
    
    const width = 380;
    const height = 280;
    const margin = { top: 35, right: 30, bottom: 55, left: 75 };
    
    const svg = d3.select(elements.chartTrend)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent')
        .style('overflow', 'visible');
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const yScale = d3.scaleLinear()
        .domain([Math.min(whiskerMin, d3.min(outliers) || whiskerMin), 
                 Math.max(whiskerMax, d3.max(outliers) || whiskerMax)])
        .range([innerHeight, 0]);
    
    chart.selectAll('.grid-line')
        .data(yScale.ticks(6))
        .join('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', gridColor)
        .attr('stroke-width', 1)
        .attr('opacity', 0.3);
    
    const boxWidth = innerWidth * 0.3;
    const boxX = (innerWidth - boxWidth) / 2;
    
    chart.append('line')
        .attr('x1', boxX + boxWidth / 2)
        .attr('x2', boxX + boxWidth / 2)
        .attr('y1', yScale(whiskerMin))
        .attr('y2', yScale(whiskerMax))
        .attr('stroke', whiskerColor)
        .attr('stroke-width', 2);
    
    chart.append('line')
        .attr('x1', boxX + boxWidth / 2 - 10)
        .attr('x2', boxX + boxWidth / 2 + 10)
        .attr('y1', yScale(whiskerMin))
        .attr('y2', yScale(whiskerMin))
        .attr('stroke', whiskerColor)
        .attr('stroke-width', 2);
    
    chart.append('line')
        .attr('x1', boxX + boxWidth / 2 - 10)
        .attr('x2', boxX + boxWidth / 2 + 10)
        .attr('y1', yScale(whiskerMax))
        .attr('y2', yScale(whiskerMax))
        .attr('stroke', whiskerColor)
        .attr('stroke-width', 2);
    
    chart.append('rect')
        .attr('x', boxX)
        .attr('y', yScale(q3))
        .attr('width', boxWidth)
        .attr('height', yScale(q1) - yScale(q3))
        .attr('fill', boxColor)
        .attr('fill-opacity', 0.3)
        .attr('stroke', boxColor)
        .attr('stroke-width', 2);
    
    chart.append('line')
        .attr('x1', boxX)
        .attr('x2', boxX + boxWidth)
        .attr('y1', yScale(median))
        .attr('y2', yScale(median))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 3);
    
    if (outliers.length > 0) {
        chart.selectAll('.outlier')
            .data(outliers)
            .join('circle')
            .attr('class', 'outlier')
            .attr('cx', boxX + boxWidth / 2)
            .attr('cy', d => yScale(d))
            .attr('r', 3)
            .attr('fill', outlierColor)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1);
    }
    
    const labels = [
        { value: whiskerMin, label: 'Min', offset: -15 },
        { value: q1, label: 'Q1', offset: -15 },
        { value: median, label: 'Median', offset: -15 },
        { value: q3, label: 'Q3', offset: -15 },
        { value: whiskerMax, label: 'Max', offset: -15 }
    ];
    
    chart.selectAll('.value-label')
        .data(labels)
        .join('text')
        .attr('class', 'value-label')
        .attr('x', boxX + boxWidth + 10)
        .attr('y', d => yScale(d.value))
        .attr('text-anchor', 'start')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', textColor)
        .text(d => `${d.label}: ${formatIncome(d.value)}`);
    
    chart.append('text')
        .attr('x', boxX + boxWidth / 2)
        .attr('y', innerHeight + 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .attr('fill', textColor)
        .text(`Sample Size: ${metrics.sampleSize.toLocaleString()}`);
    
    const yAxis = chart.append('g')
        .call(d3.axisLeft(yScale)
            .ticks(6)
            .tickSize(0)
            .tickPadding(10)
            .tickFormat(d => formatIncome(d)));
    
    yAxis.selectAll('text')
        .attr('font-size', '11px')
        .attr('fill', textColor);
    
    yAxis.select('.domain')
        .attr('stroke', gridColor);
    
    chart.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .attr('fill', textColor)
        .text(`${metrics.name} Income Distribution`);
}

function renderTrendChart(metrics) {
    if (!metrics.recentTrend) return;
    
    const lineColor = '#10b981';
    const dotColor = '#34d399';
    const areaColor = '#10b981';
    const textColor = '#e5e7eb';
    const gridColor = '#374151';
    
    const width = 380;
    const height = 280;
    const margin = { top: 35, right: 30, bottom: 55, left: 75 };
    
    const svg = d3.select(elements.chartTrend)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent')
        .style('overflow', 'visible');
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const xScale = d3.scaleBand()
        .domain(metrics.recentTrend.map(d => d.year))
        .range([0, innerWidth])
        .padding(0.3);
    
    const yScale = d3.scaleLinear()
        .domain([0, Math.max(...metrics.recentTrend.map(d => d.gdp)) * 1.15])
        .range([innerHeight, 0]);
    
    chart.selectAll('.grid-line')
        .data(yScale.ticks(5))
        .join('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', gridColor)
        .attr('stroke-width', 1)
        .attr('opacity', 0.3);
    
    const area = d3.area()
        .x(d => xScale(d.year) + xScale.bandwidth() / 2)
        .y0(innerHeight)
        .y1(d => yScale(d.gdp))
        .curve(d3.curveMonotoneX);
    
    chart.append('path')
        .datum(metrics.recentTrend)
        .attr('fill', areaColor)
        .attr('opacity', 0.1)
        .attr('d', area);
    
    const line = d3.line()
        .x(d => xScale(d.year) + xScale.bandwidth() / 2)
        .y(d => yScale(d.gdp))
        .curve(d3.curveMonotoneX);
    
    chart.append('path')
        .datum(metrics.recentTrend)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', 3)
        .attr('d', line);
    
    chart.selectAll('.dot')
        .data(metrics.recentTrend)
        .join('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.year) + xScale.bandwidth() / 2)
        .attr('cy', d => yScale(d.gdp))
        .attr('r', 5)
        .attr('fill', dotColor)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))');
    
    chart.selectAll('.value-label')
        .data(metrics.recentTrend)
        .join('text')
        .attr('class', 'value-label')
        .attr('x', d => xScale(d.year) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.gdp) - 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', textColor)
        .text(d => {
            if (d.gdp >= 1000) return `$${(d.gdp/1000).toFixed(0)}B`;
            return `$${d.gdp.toFixed(0)}M`;
        });
    
    const xAxis = chart.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale)
            .tickSize(0)
            .tickPadding(10));
    
    xAxis.selectAll('text')
        .attr('font-size', '13px')
        .attr('font-weight', '500')
        .attr('fill', textColor);
    
    xAxis.select('.domain')
        .attr('stroke', gridColor);
    
    const yAxis = chart.append('g')
        .call(d3.axisLeft(yScale)
            .ticks(5)
            .tickSize(0)
            .tickPadding(10)
            .tickFormat(d => {
                if (d >= 1000) return `$${(d/1000).toFixed(0)}B`;
                if (d === 0) return '$0';
                return `$${d}M`;
            }));
    
    yAxis.selectAll('text')
        .attr('font-size', '11px')
        .attr('fill', textColor);
    
    yAxis.select('.domain')
        .attr('stroke', gridColor);
}

function renderComparisonChart(metrics) {
    if (!metrics.comparisonData) return;
    
    const highlightColor = '#00d9ff';
    const textColor = '#e5e7eb';
    const gridColor = '#374151';
    const positiveColor = '#10b981';
    const negativeColor = '#ef4444';
    
    const width = 380;
    const height = 400;
    const margin = { top: 40, right: 25, bottom: 60, left: 75 };
    
    const abbreviateProvince = (name) => {
        const abbrevMap = {
            'Alberta': 'AB',
            'British Columbia': 'BC',
            'Manitoba': 'MB',
            'New Brunswick': 'NB',
            'Newfoundland & Labrador': 'NL',
            'Newfoundland and Labrador': 'NL',
            'Northwest Territories': 'NT',
            'Nova Scotia': 'NS',
            'Nunavut': 'NU',
            'Ontario': 'ON',
            'Prince Edward Island': 'PE',
            'Quebec': 'QC',
            'Saskatchewan': 'SK',
            'Yukon': 'YT',
            'Yukon Territory': 'YT'
        };
        return abbrevMap[name] || name.substring(0, 2).toUpperCase();
    };
    
    const isSelected = (provinceName) => {
        return provinceName === metrics.name || 
               provinceName === (metrics.name + ' & Labrador').replace('Newfoundland', 'Newfoundland and Labrador');
    };
    
    // Find the selected province's GDP as baseline
    const selectedProvince = metrics.comparisonData.find(d => isSelected(d.province));
    const baseline = selectedProvince ? selectedProvince.gdp : 0;
    
    // Calculate differences from baseline
    const dataWithDifferences = metrics.comparisonData.map(d => ({
        ...d,
        difference: d.gdp - baseline,
        originalValue: d.gdp
    }));
    
    const svg = d3.select(elements.chartComparison)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent')
        .style('overflow', 'visible');
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const xScale = d3.scaleBand()
        .domain(dataWithDifferences.map(d => d.province))
        .range([0, innerWidth])
        .padding(0.15);
    
    // Y scale for differences (can be positive or negative)
    const maxDiff = Math.max(...dataWithDifferences.map(d => Math.abs(d.difference)));
    const yScale = d3.scaleLinear()
        .domain([-maxDiff * 1.15, maxDiff * 1.15])
        .range([innerHeight, 0]);
    
    // Baseline at y=0
    const baselineY = yScale(0);
    
    // Draw grid lines
    const yTicks = yScale.ticks(8);
    chart.selectAll('.grid-line')
        .data(yTicks)
        .join('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', gridColor)
        .attr('stroke-width', 1)
        .attr('opacity', d => d === 0 ? 0.6 : 0.3)
        .attr('stroke-dasharray', d => d === 0 ? '0' : '2,2');
    
    // Draw baseline reference line
    chart.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', baselineY)
        .attr('y2', baselineY)
        .attr('stroke', highlightColor)
        .attr('stroke-width', 2)
        .attr('opacity', 0.8)
        .attr('stroke-dasharray', '4,4');
    
    // Create tooltip element
    let chartTooltip = d3.select('#chart-tooltip-comparison');
    if (chartTooltip.empty()) {
        chartTooltip = d3.select('body')
            .append('div')
            .attr('id', 'chart-tooltip-comparison')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.95)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '6px')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', 10000)
            .style('backdrop-filter', 'blur(10px)')
            .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.5)')
            .style('border', '1px solid rgba(255, 255, 255, 0.2)')
            .style('transition', 'opacity 0.2s ease');
    }
    
    // Draw bars
    chart.selectAll('.bar')
        .data(dataWithDifferences)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.province))
        .attr('width', xScale.bandwidth())
        .attr('y', d => {
            if (d.difference >= 0) {
                return yScale(d.difference);
            } else {
                return baselineY;
            }
        })
        .attr('height', d => {
            if (d.difference === 0) {
                return 2; // Small line for baseline province
            }
            return Math.abs(yScale(d.difference) - baselineY);
        })
        .attr('fill', d => {
            if (isSelected(d.province)) {
                return highlightColor;
            }
            return d.difference >= 0 ? positiveColor : negativeColor;
        })
        .attr('rx', 3)
        .attr('ry', 3)
        .style('filter', d => {
            if (isSelected(d.province)) {
                return 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.6))';
            }
            return 'none';
        })
        .attr('opacity', d => isSelected(d.province) ? 1 : 0.7)
        .on('mouseenter', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1);
            
            // Show tooltip
            const tooltipText = d.difference === 0 
                ? 'Baseline' 
                : (() => {
                    const diff = Math.abs(d.difference);
                    const sign = d.difference >= 0 ? '+' : '-';
                    if (diff >= 1000) return `${sign}$${(diff/1000).toFixed(1)}B`;
                    return `${sign}$${diff.toFixed(0)}M`;
                })();
            
            const chartRect = elements.chartComparison.getBoundingClientRect();
            const barX = xScale(d.province) + xScale.bandwidth() / 2 + margin.left;
            const barY = d.difference >= 0 ? yScale(d.difference) : baselineY;
            
            chartTooltip
                .html(tooltipText)
                .style('left', (chartRect.left + barX) + 'px')
                .style('top', (chartRect.top + barY + margin.top - 35) + 'px')
                .style('transform', 'translateX(-50%)')
                .style('opacity', 1);
        })
        .on('mouseleave', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', isSelected(d.province) ? 1 : 0.7);
            
            // Hide tooltip
            chartTooltip.style('opacity', 0);
        });
    
    const xAxis = chart.append('g')
        .attr('transform', `translate(0,${baselineY})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(d => abbreviateProvince(d))
            .tickSize(0)
            .tickPadding(8));
    
    xAxis.selectAll('text')
        .attr('font-size', '11px')
        .attr('font-weight', d => isSelected(d) ? '700' : '500')
        .attr('fill', d => isSelected(d) ? highlightColor : textColor)
        .attr('transform', 'translate(0, 5)');
    
    xAxis.select('.domain')
        .attr('stroke', 'none');
    
    // Y axis on the left
    const yAxis = chart.append('g')
        .call(d3.axisLeft(yScale)
            .ticks(8)
            .tickSize(0)
            .tickPadding(10)
            .tickFormat(d => {
                if (d === 0) return 'Baseline';
                const absValue = Math.abs(d);
                const sign = d >= 0 ? '+' : '-';
                if (absValue >= 1000) return `${sign}$${(absValue/1000).toFixed(1)}B`;
                return `${sign}$${absValue.toFixed(0)}M`;
            }));
    
    yAxis.selectAll('text')
        .attr('font-size', '11px')
        .attr('fill', textColor);
    
    yAxis.select('.domain')
        .attr('stroke', gridColor);
    
    // Title
    chart.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .attr('fill', textColor)
        .text(`GDP Difference from ${selectedProvince ? abbreviateProvince(selectedProvince.province) : 'Baseline'}`);
}

function renderIncomeComparisonChart(metrics) {
    if (!metrics.comparisonData) return;
    
    const highlightColor = '#00d9ff';
    const textColor = '#e5e7eb';
    const gridColor = '#374151';
    const positiveColor = '#10b981';
    const negativeColor = '#ef4444';
    
    const width = 380;
    const height = 400;
    const margin = { top: 40, right: 25, bottom: 60, left: 75 };
    
    const abbreviateProvince = (name) => {
        const abbrevMap = {
            'Alberta': 'AB',
            'British Columbia': 'BC',
            'Manitoba': 'MB',
            'New Brunswick': 'NB',
            'Newfoundland & Labrador': 'NL',
            'Newfoundland and Labrador': 'NL',
            'Northwest Territories': 'NT',
            'Nova Scotia': 'NS',
            'Nunavut': 'NU',
            'Ontario': 'ON',
            'Prince Edward Island': 'PE',
            'Quebec': 'QC',
            'Saskatchewan': 'SK',
            'Yukon': 'YT',
            'Yukon Territory': 'YT'
        };
        return abbrevMap[name] || name.substring(0, 2).toUpperCase();
    };
    
    const isSelected = (provinceName) => {
        return provinceName === metrics.name || 
               provinceName === (metrics.name + ' & Labrador').replace('Newfoundland', 'Newfoundland and Labrador');
    };
    
    // Find the selected province's income as baseline
    const selectedProvince = metrics.comparisonData.find(d => isSelected(d.province));
    const baseline = selectedProvince && selectedProvince.income ? selectedProvince.income : 0;
    
    // Calculate differences from baseline (only for provinces with income data)
    const dataWithDifferences = metrics.comparisonData.map(d => {
        if (!d.income) {
            return {
                ...d,
                difference: null,
                originalValue: null
            };
        }
        return {
            ...d,
            difference: d.income - baseline,
            originalValue: d.income
        };
    }).filter(d => d.income !== null && d.income !== undefined); // Only show provinces with data
    
    if (dataWithDifferences.length === 0) return;
    
    const svg = d3.select(elements.chartComparison)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent')
        .style('overflow', 'visible');
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const xScale = d3.scaleBand()
        .domain(dataWithDifferences.map(d => d.province))
        .range([0, innerWidth])
        .padding(0.15);
    
    // Y scale for differences (can be positive or negative)
    const maxDiff = Math.max(...dataWithDifferences.map(d => Math.abs(d.difference)));
    const yScale = d3.scaleLinear()
        .domain([-maxDiff * 1.15, maxDiff * 1.15])
        .range([innerHeight, 0]);
    
    // Baseline at y=0
    const baselineY = yScale(0);
    
    // Draw grid lines
    const yTicks = yScale.ticks(8);
    chart.selectAll('.grid-line')
        .data(yTicks)
        .join('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', gridColor)
        .attr('stroke-width', 1)
        .attr('opacity', d => d === 0 ? 0.6 : 0.3)
        .attr('stroke-dasharray', d => d === 0 ? '0' : '2,2');
    
    // Draw baseline reference line
    chart.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', baselineY)
        .attr('y2', baselineY)
        .attr('stroke', highlightColor)
        .attr('stroke-width', 2)
        .attr('opacity', 0.8)
        .attr('stroke-dasharray', '4,4');
    
    // Create tooltip element for income chart
    let chartTooltipIncome = d3.select('#chart-tooltip-comparison-income');
    if (chartTooltipIncome.empty()) {
        chartTooltipIncome = d3.select('body')
            .append('div')
            .attr('id', 'chart-tooltip-comparison-income')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.95)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '6px')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', 10000)
            .style('backdrop-filter', 'blur(10px)')
            .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.5)')
            .style('border', '1px solid rgba(255, 255, 255, 0.2)')
            .style('transition', 'opacity 0.2s ease');
    }
    
    // Draw bars
    chart.selectAll('.bar')
        .data(dataWithDifferences)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.province))
        .attr('width', xScale.bandwidth())
        .attr('y', d => {
            if (d.difference >= 0) {
                return yScale(d.difference);
            } else {
                return baselineY;
            }
        })
        .attr('height', d => {
            if (d.difference === 0) {
                return 2; // Small line for baseline province
            }
            return Math.abs(yScale(d.difference) - baselineY);
        })
        .attr('fill', d => {
            if (isSelected(d.province)) {
                return highlightColor;
            }
            return d.difference >= 0 ? positiveColor : negativeColor;
        })
        .attr('rx', 3)
        .attr('ry', 3)
        .style('filter', d => {
            if (isSelected(d.province)) {
                return 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.6))';
            }
            return 'none';
        })
        .attr('opacity', d => isSelected(d.province) ? 1 : 0.7)
        .on('mouseenter', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1);
            
            // Show tooltip
            const tooltipText = d.difference === 0 
                ? 'Baseline' 
                : (() => {
                    const diff = Math.abs(d.difference);
                    const sign = d.difference >= 0 ? '+' : '-';
                    return `${sign}${formatIncome(diff)}`;
                })();
            
            const chartRect = elements.chartComparison.getBoundingClientRect();
            const barX = xScale(d.province) + xScale.bandwidth() / 2 + margin.left;
            const barY = d.difference >= 0 ? yScale(d.difference) : baselineY;
            
            chartTooltipIncome
                .html(tooltipText)
                .style('left', (chartRect.left + barX) + 'px')
                .style('top', (chartRect.top + barY + margin.top - 35) + 'px')
                .style('transform', 'translateX(-50%)')
                .style('opacity', 1);
        })
        .on('mouseleave', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', isSelected(d.province) ? 1 : 0.7);
            
            // Hide tooltip
            chartTooltipIncome.style('opacity', 0);
        });
    
    const xAxis = chart.append('g')
        .attr('transform', `translate(0,${baselineY})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(d => abbreviateProvince(d))
            .tickSize(0)
            .tickPadding(8));
    
    xAxis.selectAll('text')
        .attr('font-size', '11px')
        .attr('font-weight', d => isSelected(d) ? '700' : '500')
        .attr('fill', d => isSelected(d) ? highlightColor : textColor)
        .attr('transform', 'translate(0, 5)');
    
    xAxis.select('.domain')
        .attr('stroke', 'none');
    
    // Y axis on the left
    const yAxis = chart.append('g')
        .call(d3.axisLeft(yScale)
            .ticks(8)
            .tickSize(0)
            .tickPadding(10)
            .tickFormat(d => {
                if (d === 0) return 'Baseline';
                const absValue = Math.abs(d);
                const sign = d >= 0 ? '+' : '-';
                return `${sign}${formatIncome(absValue)}`;
            }));
    
    yAxis.selectAll('text')
        .attr('font-size', '11px')
        .attr('fill', textColor);
    
    yAxis.select('.domain')
        .attr('stroke', gridColor);
    
    // Title
    chart.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .attr('fill', textColor)
        .text(`Income Difference from ${selectedProvince ? abbreviateProvince(selectedProvince.province) : 'Baseline'}`);
}


async function enterStreetView() {
    console.log('🎬 enterStreetView called - showing night sky');
    
    // If already in street view, exit it
    if (appState.streetViewOpen) {
        exitStreetView();
        return;
    }
    
    if (appState.selectedCity) {
        const city = appState.selectedCity;
        console.log('🌌 Opening night sky view for city:', city.name);
        
        // Hide GDP/Income legend while night sky is open
        if (elements.legendPanel) {
            appState.legendPanelWasHidden = elements.legendPanel.classList.contains('hidden');
            elements.legendPanel.classList.add('hidden');
        } else {
            appState.legendPanelWasHidden = false;
        }
        
        // Hide top-left and top-right overlays for immersive view
        const topLeftOverlay = document.querySelector('.map-overlay.top-left');
        const topRightOverlay = document.querySelector('.map-overlay.top-right');
        if (topLeftOverlay) {
            topLeftOverlay.classList.add('hidden');
        }
        if (topRightOverlay) {
            topRightOverlay.classList.add('hidden');
        }
        
        if (elements.nightSkyLegend) {
            elements.nightSkyLegend.classList.remove('hidden');
        }
        
        appState.streetViewOpen = true;
        elements.streetViewContainer.classList.remove('hidden');
        
        // Update button immediately
        updateStreetViewButton();
        
        const canvasContainer = document.getElementById('street-view-canvas');
        canvasContainer.innerHTML = `
            <div style="
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                background: #1a1a2e;
                color: white;
            ">
                <div class="spinner"></div>
                <p style="margin-top: 1rem;">Loading constellation data for ${city.name}...</p>
            </div>
        `;
        
        try {
            // Load real estate data
            const allData = await loadRealEstateData();
            
            // Filter properties for this city
            const cityProperties = allData.filter(property => {
                const propertyCity = (property.City || '').trim();
                const propertyProvince = (property.Province || '').trim();
                return propertyCity.toLowerCase() === city.name.toLowerCase() && 
                       propertyProvince.toLowerCase() === appState.selectedProvince.toLowerCase();
            });
            
            console.log(`Found ${cityProperties.length} properties for ${city.name}`);
            
            // Create canvas element
            canvasContainer.innerHTML = '<canvas id="night-sky-canvas" style="width: 100%; height: 100%; display: block;"></canvas>';
            const canvas = document.getElementById('night-sky-canvas');
            
            // Store canvas reference and reset interactions
            cleanupNightSkyInteractions();
            appState.nightSkyCanvas = canvas;
            appState.nightSkyContext = canvas.getContext('2d');
            hideNightSkyTooltip();
            
            // Render the night sky
            const starData = renderNightSky(canvas, city, cityProperties);
            appState.nightSkyStars = starData;
            setupNightSkyInteractions(canvas);
            
            // Handle window resize
            const resizeHandler = () => {
                const updatedStars = renderNightSky(canvas, city, cityProperties);
                appState.nightSkyStars = updatedStars;
            };
            window.removeEventListener('resize', appState.nightSkyResizeHandler);
            appState.nightSkyResizeHandler = resizeHandler;
            window.addEventListener('resize', resizeHandler);
            
            elements.streetViewLocation.textContent = `Viewing: ${city.name}, ${appState.selectedProvince.toUpperCase()} - ${cityProperties.length} properties`;
            
            // Update button to show exit option
            updateStreetViewButton();
            
            console.log('✅ Night sky view loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading night sky view:', error);
            canvasContainer.innerHTML = `
                <div style="
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    background: #1a1a2e;
                    color: white;
                    text-align: center;
                    padding: 2rem;
                ">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                    <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Error Loading Night Sky</h2>
                    <p>${error.message}</p>
                </div>
            `;
        }
    } else {
        const province = getProvinceById(appState.selectedProvince);
        if (!province) {
            console.log('❌ Province not found');
            return;
        }
        
        showProvinceViewPlaceholder(province);
    }
}

function showCityViewPlaceholder(city) {
    appState.streetViewOpen = true;
    elements.streetViewContainer.classList.remove('hidden');
    
    const canvas = document.getElementById('street-view-canvas');
    canvas.innerHTML = `
        <div style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            background: #1a1a2e;
            color: white;
            text-align: center;
            padding: 2rem;
        ">
            <div style="font-size: 2rem; margin-bottom: 1rem;">🏙️</div>
            <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">City View</h2>
            <p>Street view not available for ${city.name}</p>
            <p style="font-size: 0.9rem; color: #ccc;">City economic data displayed on the sidebar</p>
        </div>
    `;
    
    elements.streetViewLocation.textContent = `Viewing: ${city.name}`;
    
    // Update button to show exit option
    updateStreetViewButton();
}

function showProvinceViewPlaceholder(province) {
    appState.streetViewOpen = true;
    elements.streetViewContainer.classList.remove('hidden');
    
    const canvas = document.getElementById('street-view-canvas');
    canvas.innerHTML = `
        <div style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            background: #1a1a2e;
            color: white;
            text-align: center;
            padding: 2rem;
        ">
            <div style="font-size: 2rem; margin-bottom: 1rem;">🏛️</div>
            <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Provincial View</h2>
            <p>Street view not available for ${province.name}</p>
            <p style="font-size: 0.9rem; color: #ccc;">Provincial-level data visualization</p>
        </div>
    `;
    
    elements.streetViewLocation.textContent = `Viewing: ${province.name}`;
    
    // Update button to show exit option
    updateStreetViewButton();
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

async function loadRealEstateData() {
    if (appState.realEstateData) {
        return appState.realEstateData;
    }
    
    try {
        const response = await fetch('./data/cleaned-real-estate-data.csv');
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        const headers = parseCSVLine(lines[0]);
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < headers.length) continue;
            
            const record = {};
            headers.forEach((header, index) => {
                let value = values[index] || '';
                // Remove quotes if present
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                
                // Parse numeric values
                if (['Price', 'Bedrooms', 'Bathrooms', 'Latitude', 'Longitude', 'Acreage', 'Square Footage'].includes(header)) {
                    value = value === '' ? null : parseFloat(value);
                }
                
                record[header] = value;
            });
            
            // Only add records with valid location and price data
            if (record.Latitude && record.Longitude && record.Price && !isNaN(record.Price)) {
                data.push(record);
            }
        }
        
        appState.realEstateData = data;
        console.log('✅ Loaded real estate data:', data.length, 'properties');
        return data;
    } catch (error) {
        console.error('❌ Failed to load real estate data:', error);
        return [];
    }
}

function getPropertyTypeShape(propertyType) {
    const shapes = {
        'Single Family': 'star',
        'Condo': 'circle',
        'Duplex': 'square',
        'Townhouse': 'triangle',
        'Apartment': 'diamond',
    };
    return shapes[propertyType] || 'star';
}

function drawStar(ctx, x, y, points, outerRadius, innerRadius, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2 + rotation;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
}

function drawShape(ctx, x, y, shape, size) {
    ctx.beginPath();
    switch (shape) {
        case 'star':
            drawStar(ctx, x, y, 5, size, size * 0.4);
            break;
        case 'circle':
            ctx.arc(x, y, size, 0, Math.PI * 2);
            break;
        case 'square':
            ctx.rect(x - size, y - size, size * 2, size * 2);
            break;
        case 'triangle':
            ctx.moveTo(x, y - size);
            ctx.lineTo(x - size, y + size);
            ctx.lineTo(x + size, y + size);
            ctx.closePath();
            break;
        case 'diamond':
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x - size, y);
            ctx.closePath();
            break;
        default:
            drawStar(ctx, x, y, 5, size, size * 0.4);
    }
}

function renderNightSky(canvas, city, properties) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    const starData = [];
    
    // Clear canvas with dark night sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#0f0f1e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    if (!properties || properties.length === 0) {
        // Draw a message if no data
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No property data available', width / 2, height / 2);
        return starData;
    }
    
    // Calculate bounds for normalization
    const prices = properties.map(p => p.Price).filter(p => p && !isNaN(p));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    const lats = properties.map(p => p.Latitude).filter(l => l && !isNaN(l));
    const lngs = properties.map(p => p.Longitude).filter(l => l && !isNaN(l));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;
    
    // Add some padding
    const padding = 50;
    
    // Draw stars (properties)
    properties.forEach(property => {
        if (!property.Latitude || !property.Longitude || !property.Price) return;
        
        // Map lat/lng to canvas coordinates
        const normalizedLat = (property.Latitude - minLat) / latRange;
        const normalizedLng = (property.Longitude - minLng) / lngRange;
        const x = padding + normalizedLng * (width - padding * 2);
        const y = padding + normalizedLat * (height - padding * 2);
        
        // Map price to brightness (0.3 to 1.0)
        const normalizedPrice = (property.Price - minPrice) / priceRange;
        const brightness = 0.3 + normalizedPrice * 0.7;
        const opacity = brightness;
        
        // Get property type shape (handle both possible field names)
        const propertyType = property['Property Type'] || property.Property_Type || property.property_type || '';
        const shape = getPropertyTypeShape(propertyType);
        
        // Calculate star size based on price (relative)
        const baseSize = 3;
        const size = baseSize + normalizedPrice * 4;
        
        // Draw glow effect
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
        glowGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.8})`);
        glowGradient.addColorStop(0.5, `rgba(200, 220, 255, ${opacity * 0.4})`);
        glowGradient.addColorStop(1, `rgba(200, 220, 255, 0)`);
        ctx.fillStyle = glowGradient;
        ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 6);
        
        // Draw star shape
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.strokeStyle = `rgba(200, 220, 255, ${opacity * 0.8})`;
        ctx.lineWidth = 1;
        drawShape(ctx, x, y, shape, size);
        ctx.fill();
        ctx.stroke();
        
        // Draw rays based on bedrooms and bathrooms
        const bedrooms = property.Bedrooms || 0;
        const bathrooms = property.Bathrooms || 0;
        const totalRooms = bedrooms + bathrooms;
        const numRays = Math.min(Math.max(totalRooms, 0), 8); // Cap at 8 rays
        const rayLength = size * (1 + totalRooms * 0.3);
        
        if (numRays > 0) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.6})`;
            ctx.lineWidth = 1;
            for (let i = 0; i < numRays; i++) {
                const angle = (i * Math.PI * 2) / numRays;
                const endX = x + Math.cos(angle) * rayLength;
                const endY = y + Math.sin(angle) * rayLength;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
        
        const hitRadius = Math.max(size * 1.5, rayLength * 0.4 + size);
        starData.push({
            x,
            y,
            size,
            hitRadius,
            property,
        });
    });
    
    // Draw constellation lines (connect nearby stars)
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.2)';
    ctx.lineWidth = 0.5;
    const maxConnectionDistance = 100;
    
    for (let i = 0; i < properties.length; i++) {
        const p1 = properties[i];
        if (!p1.Latitude || !p1.Longitude) continue;
        
        const x1 = padding + ((p1.Longitude - minLng) / lngRange) * (width - padding * 2);
        const y1 = padding + ((p1.Latitude - minLat) / latRange) * (height - padding * 2);
        
        for (let j = i + 1; j < properties.length; j++) {
            const p2 = properties[j];
            if (!p2.Latitude || !p2.Longitude) continue;
            
            const x2 = padding + ((p2.Longitude - minLng) / lngRange) * (width - padding * 2);
            const y2 = padding + ((p2.Latitude - minLat) / latRange) * (height - padding * 2);
            
            const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            if (distance < maxConnectionDistance) {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
    }
    
    return starData;
}

function setupNightSkyInteractions(canvas) {
    if (!canvas || !elements.nightSkyTooltip) return;
    
    cleanupNightSkyInteractions();
    
    const mouseMoveHandler = (event) => {
        const hoveredStar = getHoveredNightSkyStar(event, canvas);
        if (hoveredStar) {
            showNightSkyTooltip(event, hoveredStar);
        } else {
            hideNightSkyTooltip();
        }
    };
    
    const mouseLeaveHandler = () => {
        hideNightSkyTooltip();
    };
    
    canvas.addEventListener('mousemove', mouseMoveHandler);
    canvas.addEventListener('mouseleave', mouseLeaveHandler);
    
    appState.nightSkyMouseMoveHandler = mouseMoveHandler;
    appState.nightSkyMouseLeaveHandler = mouseLeaveHandler;
}

function cleanupNightSkyInteractions() {
    if (appState.nightSkyCanvas) {
        if (appState.nightSkyMouseMoveHandler) {
            appState.nightSkyCanvas.removeEventListener('mousemove', appState.nightSkyMouseMoveHandler);
        }
        if (appState.nightSkyMouseLeaveHandler) {
            appState.nightSkyCanvas.removeEventListener('mouseleave', appState.nightSkyMouseLeaveHandler);
        }
    }
    appState.nightSkyMouseMoveHandler = null;
    appState.nightSkyMouseLeaveHandler = null;
}

function getHoveredNightSkyStar(event, canvas) {
    if (!canvas || !appState.nightSkyStars || appState.nightSkyStars.length === 0) {
        return null;
    }
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    
    let closestStar = null;
    let closestDistance = Infinity;
    
    for (const star of appState.nightSkyStars) {
        const dx = x - star.x;
        const dy = y - star.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= star.hitRadius && distance < closestDistance) {
            closestStar = star;
            closestDistance = distance;
        }
    }
    
    return closestStar;
}

function showNightSkyTooltip(event, star) {
    if (!elements.nightSkyTooltip || !elements.streetViewContainer || !star) return;
    
    const tooltip = elements.nightSkyTooltip;
    const property = star.property || {};
    
    const price = typeof property.Price === 'number' && !isNaN(property.Price)
        ? formatCurrency(property.Price)
        : 'N/A';
    
    const bedrooms = typeof property.Bedrooms === 'number' && !isNaN(property.Bedrooms)
        ? Number(property.Bedrooms)
        : null;
    const bathrooms = typeof property.Bathrooms === 'number' && !isNaN(property.Bathrooms)
        ? Number(property.Bathrooms)
        : null;
    
    const propertyType = property['Property Type'] || property.Property_Type || property.property_type || 'Unknown';
    const squareFootage = typeof property['Square Footage'] === 'number' && !isNaN(property['Square Footage'])
        ? `${Math.round(property['Square Footage'])} sq ft`
        : '—';
    
    tooltip.innerHTML = `
        <div class="tooltip-title">${property.City || 'Unknown'}, ${property.Province || ''}</div>
        <div class="tooltip-line"><span>Price</span><strong>${price}</strong></div>
        <div class="tooltip-line"><span>Bedrooms</span><strong>${bedrooms ?? '—'}</strong></div>
        <div class="tooltip-line"><span>Bathrooms</span><strong>${bathrooms ?? '—'}</strong></div>
        <div class="tooltip-line"><span>Property</span><strong>${propertyType}</strong></div>
        <div class="tooltip-line"><span>Size</span><strong>${squareFootage}</strong></div>
    `;
    
    const containerRect = elements.streetViewContainer.getBoundingClientRect();
    const left = event.clientX - containerRect.left + 12;
    const top = event.clientY - containerRect.top - 12;
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.remove('hidden');
}

function hideNightSkyTooltip() {
    if (!elements.nightSkyTooltip) return;
    elements.nightSkyTooltip.classList.add('hidden');
}

async function fetchMapillaryImage(lat, lng) {
    try {
        const radius = 100;
        const url = `https://graph.mapillary.com/images?fields=id&bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&access_token=${MAPILLARY_ACCESS_TOKEN}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            return data.data[0].id;
        }
        
        return null;
    } catch (error) {
        console.error('Mapillary API error:', error);
        return null;
    }
}

function exitStreetView() {
    console.log('🚪 Exiting night sky view...');
    
    appState.streetViewOpen = false;
    
    elements.streetViewContainer.style.animation = 'fadeOut 200ms ease-in-out';
    
    setTimeout(() => {
        elements.streetViewContainer.classList.add('hidden');
        elements.streetViewContainer.style.animation = '';
        
        if (appState.mapillaryViewer) {
            try {
                appState.mapillaryViewer.remove();
                appState.mapillaryViewer = null;
            } catch (e) {
                console.warn('Error removing viewer:', e);
            }
        }
        
        if (appState.nightSkyResizeHandler) {
            window.removeEventListener('resize', appState.nightSkyResizeHandler);
            appState.nightSkyResizeHandler = null;
        }
        
        cleanupNightSkyInteractions();
        hideNightSkyTooltip();
        
        const canvas = document.getElementById('street-view-canvas');
        canvas.innerHTML = '';
        appState.nightSkyCanvas = null;
        appState.nightSkyContext = null;
        appState.nightSkyStars = [];
    }, 200);
    
    if (elements.nightSkyLegend) {
        elements.nightSkyLegend.classList.add('hidden');
    }
    
    const topLeftOverlay = document.querySelector('.map-overlay.top-left');
    const topRightOverlay = document.querySelector('.map-overlay.top-right');
    if (topLeftOverlay) {
        topLeftOverlay.classList.remove('hidden');
    }
    if (topRightOverlay) {
        topRightOverlay.classList.remove('hidden');
    }
    
    if (elements.legendPanel) {
        if (appState.legendPanelWasHidden) {
            elements.legendPanel.classList.add('hidden');
        } else {
            elements.legendPanel.classList.remove('hidden');
        }
    }
    appState.legendPanelWasHidden = false;
    
    if (!appState.sidebarVisible) {
        appState.sidebarVisible = true;
        elements.dataPanel.classList.remove('sidebar-hidden');
    }
    
    updateStreetViewButton();
    
    if (appState.selectedCity && elements.map) {
        elements.map.easeTo({
            center: [appState.selectedCity.lng, appState.selectedCity.lat],
            zoom: 11,
            pitch: 45,
            bearing: 0,
            duration: 800,
            essential: true,
        });
    } else if (appState.selectedProvince && elements.map) {
        const province = getProvinceById(appState.selectedProvince);
        if (province) {
            elements.map.easeTo({
                center: province.center,
                zoom: 5,
                pitch: 20,
                bearing: 0,
                duration: 800,
                essential: true,
            });
        }
    }
}

function showLoadingIndicator(show) {
    if (show) {
        elements.loadingIndicator.classList.remove('hidden');
    } else {
        elements.loadingIndicator.classList.add('hidden');
    }
}

function closeDataPanel() {
    if (appState.streetViewOpen) {
        toggleSidebar();
        return;
    }
    
    elements.dataPanel.classList.add('hidden');
    appState.selectedProvince = null;
    appState.selectedCity = null;
    
    hideCities();
    
    if (elements.map) {
        elements.map.easeTo({
            center: [-95.7129, 56.1304],
            zoom: 3,
            pitch: 0,
            bearing: 0,
            duration: 1000,
        });
    }
}

function toggleSidebar() {
    appState.sidebarVisible = !appState.sidebarVisible;
    
    if (appState.sidebarVisible) {
        elements.dataPanel.classList.remove('sidebar-hidden');
        if (elements.btnToggleSidebar) {
            elements.btnToggleSidebar.innerHTML = '▶';
            elements.btnToggleSidebar.title = 'Hide sidebar';
            elements.btnToggleSidebar.style.right = '440px';
        }
    } else {
        elements.dataPanel.classList.add('sidebar-hidden');
        if (elements.btnToggleSidebar) {
            elements.btnToggleSidebar.innerHTML = '◀';
            elements.btnToggleSidebar.title = 'Show sidebar';
            elements.btnToggleSidebar.style.right = '20px';
        }
    }
}

function closeProvincePanel() {
    elements.provinceInfoPanel.classList.add('hidden');
}

function updateMapMarkersForYear(year) {
    if (!elements.map) return;
    
    const provinceFeatures = CANADIAN_PROVINCES_UNEMPLOYMENT.map((province, idx) => {
        const historicalData = getHistoricalData(province.id);
        const yearData = historicalData.find(d => d.year === year);
        const unemploymentRate = yearData ? yearData.rate : province.currentUnemploymentRate;
        
        return {
            type: 'Feature',
            id: idx,
            properties: {
                id: province.id,
                name: province.name,
                unemploymentRate: unemploymentRate,
                population: province.population,
                year: year,
            },
            geometry: {
                type: 'Point',
                coordinates: province.center,
            },
        };
    });
    
    const geoJSON = {
        type: 'FeatureCollection',
        features: provinceFeatures,
    };
    
    elements.map.getSource('provinces').setData(geoJSON);
}

function toggleLegend() {
    appState.legendOpen = !appState.legendOpen;
    if (appState.legendOpen) {
        elements.legendPanel.classList.remove('hidden');
        if (elements.btnToggleLegend) {
            elements.btnToggleLegend.classList.add('active');
            elements.btnToggleLegend.innerHTML = '📊 Legend <span class="toggle-indicator">●</span>';
        }
    } else {
        elements.legendPanel.classList.add('hidden');
        if (elements.btnToggleLegend) {
            elements.btnToggleLegend.classList.remove('active');
            elements.btnToggleLegend.innerHTML = '📊 Legend <span class="toggle-indicator">○</span>';
        }
    }
}

function setupEventListeners() {
    elements.dataTypeSelect?.addEventListener('change', (e) => {
        const newDataType = e.target.value;
        switchDataType(newDataType);
    });
    
    elements.mapScopeSelect?.addEventListener('change', (e) => {
        switchDataScope(e.target.value);
    });
    
    elements.btnCanadaView?.addEventListener('click', () => {
        if (elements.map) {
            elements.map.easeTo({
                center: [-95.7129, 56.1304],
                zoom: 3.5,
                pitch: 20,
                bearing: 0,
                duration: 1200,
            });
        }
    });
    
    elements.btnToggleLegend?.addEventListener('click', toggleLegend);
    
    elements.btnCloseDataPanel?.addEventListener('click', closeDataPanel);
    elements.btnCloseProvincePanel?.addEventListener('click', closeProvincePanel);
    elements.btnToggleSidebar?.addEventListener('click', toggleSidebar);
    
    elements.btnStreetView?.addEventListener('click', enterStreetView);
    elements.btnStreetViewProvincePanel?.addEventListener('click', enterStreetView);
    
    elements.btnStreetViewFloating?.addEventListener('click', enterStreetView);
    
    elements.btnDismissTooltip?.addEventListener('click', () => {
        elements.onboardingTooltip.style.opacity = '0';
        setTimeout(() => elements.onboardingTooltip.classList.add('hidden'), 300);
    });
    
    elements.btnSkipIntro?.addEventListener('click', skipIntro);
    
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            elements.tabPanes.forEach(pane => pane.classList.remove('active'));
            const activePane = document.getElementById(`tab-${tabName}`);
            if (activePane) {
                activePane.classList.add('active');
            }
        });
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (introAnimationRunning) {
                skipIntro();
            } else if (appState.streetViewOpen) {
                exitStreetView();
            }
        }
        if (e.key === 'h' || e.key === 'H') {
            elements.onboardingTooltip.classList.remove('hidden');
            elements.onboardingTooltip.style.opacity = '1';
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}