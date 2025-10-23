import {
    CANADIAN_PROVINCES_GDP,
    getProvinceMetrics,
    getProvinceById,
    getAllProvinces,
    formatCurrency,
    formatPercentage,
    formatNumber,
    getGDPColor,
    getGDPStatus,
} from './data.js';

const MAPILLARY_ACCESS_TOKEN = 'MLY|25924883943764997|4ac03280f19bbd17e1e57bbef97fb5f2';

const appState = {
    selectedProvince: null,
    streetViewOpen: false,
    mapLoaded: false,
    legendOpen: false,
};

const elements = {
    map: null,
    mapContainer: document.getElementById('map-container'),
    
    btnResetView: document.getElementById('btn-reset-view'),
    btnCanadaView: document.getElementById('btn-canada-view'),
    btnToggleLegend: document.getElementById('btn-toggle-legend'),
    btnCloseDataPanel: document.getElementById('btn-close-data-panel'),
    btnCloseProvincePanel: document.getElementById('btn-close-province-panel'),
    btnStreetView: document.getElementById('btn-street-view-right-panel'),
    btnStreetViewProvincePanel: document.getElementById('btn-street-view-province-panel'),
    btnStreetViewFloating: document.getElementById('btn-street-view-floating'),
    btnExitStreetView: document.getElementById('btn-exit-street-view'),
    btnDismissTooltip: document.getElementById('dismiss-tooltip'),
    
    dataPanel: document.getElementById('data-panel'),
    provinceInfoPanel: document.getElementById('province-info-panel'),
    legendPanel: document.getElementById('legend-panel'),
    streetViewContainer: document.getElementById('street-view-container'),
    onboardingTooltip: document.getElementById('onboarding-tooltip'),
    loadingIndicator: document.getElementById('loading-indicator'),
    
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    
    provinceName: document.getElementById('province-name'),
    provincePopulation: document.getElementById('province-population'),
    provinceCoordinates: document.getElementById('province-coordinates'),
    panelProvinceTitle: document.getElementById('panel-province-title'),
    streetViewLocation: document.getElementById('street-view-location'),
    
    statCurrentRate: document.getElementById('stat-current-rate'),
    statAvgRate: document.getElementById('stat-avg-rate'),
    statPeakRate: document.getElementById('stat-peak-rate'),
    statPeakYear: document.getElementById('stat-peak-year'),
    
    chartOverview: document.getElementById('chart-overview'),
    chartTrend: document.getElementById('chart-trend'),
    chartComparison: document.getElementById('chart-comparison'),
    chartHistorical: document.getElementById('chart-historical'),
};

async function initApp() {
    try {
        showLoadingIndicator(true);
        
        await initMap();
        
        setupEventListeners();
        
        setTimeout(() => {
            if (elements.onboardingTooltip) {
                elements.onboardingTooltip.style.animation = 'slideUp 0.3s ease-out';
            }
        }, 1000);
        
        showLoadingIndicator(false);
        
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
                addProvinceMarkers(map);
                
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

function addProvinceMarkers(map) {
    // Create province markers with GDP-based sizing and coloring
    const provinceFeatures = CANADIAN_PROVINCES_GDP.map((province, idx) => ({
        type: 'Feature',
        id: idx,
        properties: {
            id: province.id,
            name: province.name,
            gdp2023: province.gdp2023,
            population: province.population,
            growth2022_2023: province.growth2022_2023,
        },
        geometry: {
            type: 'Point',
            coordinates: province.center,
        },
    }));
    
    const geoJSON = {
        type: 'FeatureCollection',
        features: provinceFeatures,
    };
    
    map.addSource('provinces', {
        type: 'geojson',
        data: geoJSON,
    });
    
    // Calculate GDP range for sizing
    const gdpValues = CANADIAN_PROVINCES_GDP.map(p => p.gdp2023);
    const minGDP = Math.min(...gdpValues);
    const maxGDP = Math.max(...gdpValues);
    
    // Add province markers with size based on GDP
    map.addLayer({
        id: 'province-markers',
        type: 'circle',
        source: 'provinces',
        paint: {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['get', 'gdp2023'],
                minGDP, 8,    // Smallest circles
                maxGDP, 25   // Largest circles
            ],
            'circle-color': [
                'interpolate',
                ['linear'],
                ['get', 'gdp2023'],
                minGDP, '#1e3a8a',      // Dark blue for lowest GDP
                1000, '#3b82f6',       // Blue
                5000, '#06b6d4',       // Cyan
                10000, '#10b981',      // Green
                20000, '#84cc16',      // Light green
                30000, '#eab308',      // Yellow
                50000, '#f97316',      // Orange
                maxGDP, '#dc2626'      // Red for highest GDP
            ],
            'circle-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                0.95,
                0.85
            ],
            'circle-stroke-width': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                4,
                2
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                0.9
            ],
        },
    });
    
    // Add province labels
    map.addLayer({
        id: 'province-labels',
        type: 'symbol',
        source: 'provinces',
        layout: {
            'text-field': ['get', 'name'],
            'text-size': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                14,
                11
            ],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 2.5],
            'text-anchor': 'top',
            'text-allow-overlap': false,
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 2,
            'text-halo-blur': 1,
            'text-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                0.9,
            ],
        },
    });
    
    // Add hover effects
    let hoveredId = null;
    map.on('mousemove', 'province-markers', (e) => {
        if (e.features.length > 0) {
            if (hoveredId !== null) {
                map.setFeatureState({ source: 'provinces', id: hoveredId }, { hover: false });
            }
            hoveredId = e.features[0].id;
            map.setFeatureState({ source: 'provinces', id: hoveredId }, { hover: true });
            map.getCanvas().style.cursor = 'pointer';
            
            // Show tooltip with GDP info
            const feature = e.features[0];
            const gdp = feature.properties.gdp2023;
            const name = feature.properties.name;
            
            // Create or update tooltip
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
                <strong>${name}</strong><br>
                GDP 2023: $${gdp.toLocaleString()}B<br>
                Growth: ${feature.properties.growth2022_2023}%
            `;
            tooltip.style.left = e.point.x + 15 + 'px';
            tooltip.style.top = e.point.y - 10 + 'px';
            tooltip.style.display = 'block';
        }
    });
    
    map.on('mouseleave', 'province-markers', () => {
        if (hoveredId !== null) {
            map.setFeatureState({ source: 'provinces', id: hoveredId }, { hover: false });
        }
        hoveredId = null;
        map.getCanvas().style.cursor = '';
        
        // Hide tooltip
        const tooltip = document.getElementById('map-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    });
    
    map.on('click', 'province-markers', (e) => {
        if (e.features.length > 0) {
            const provinceId = e.features[0].properties.id;
            selectProvince(provinceId);
        }
    });
}

async function addProvincePolygons(map) {
    // Define colors for each province
    const provinceColors = {
        'Alberta': '#3b82f6',      // Blue
        'British Columbia': '#10b981',      // Green
        'Manitoba': '#f59e0b',      // Orange
        'New Brunswick': '#8b5cf6',      // Purple
        'Newfoundland and Labrador': '#ec4899',      // Pink
        'Northwest Territories': '#14b8a6',      // Teal
        'Nova Scotia': '#f97316',      // Orange-red
        'Nunavut': '#06b6d4',      // Cyan
        'Ontario': '#ef4444',      // Red
        'Prince Edward Island': '#84cc16',      // Lime
        'Quebec': '#6366f1',      // Indigo
        'Saskatchewan': '#eab308',      // Yellow
        'Yukon': '#a855f7',      // Purple
    };
    
    // Mapping from GeoJSON names to our province IDs
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
        'Yukon': 'yt'
    };
    
    try {
        // Load Canadian province boundaries from a GeoJSON source
        const response = await fetch('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/canada.geojson');
        const canadaGeoJSON = await response.json();
        
        console.log('✅ Loaded Canada GeoJSON data');
        
        // Enhance the GeoJSON features with our data
        canadaGeoJSON.features = canadaGeoJSON.features.map((feature, idx) => {
            const provinceName = feature.properties.name;
            const provinceId = provinceNameToId[provinceName];
            const provinceData = CANADIAN_PROVINCES_GDP.find(p => p.id === provinceId);
            
            return {
                ...feature,
                id: idx,
                properties: {
                    ...feature.properties,
                    id: provinceId,
                    color: provinceColors[provinceName] || '#6b7280',
                    gdp2023: provinceData?.gdp2023 || 0,
                    population: provinceData?.population || 0,
                }
            };
        });
        
        // Add source for province polygons
        map.addSource('province-polygons', {
            type: 'geojson',
            data: canadaGeoJSON,
        });
        
        // Add fill layer for provinces
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
        
        // Add outline layer for provinces
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
        
        // Add hover effects for polygons
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
        });
        
        // Add click handler for province polygons
        map.on('click', 'province-fills', (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                const provinceId = feature.properties.id;
                const provinceName = feature.properties.name;
                
                // Show alert for now (will be replaced with actual functionality later)
                alert(`You clicked on ${provinceName}!\n\nProvince ID: ${provinceId}\nGDP 2023: $${feature.properties.gdp2023.toLocaleString()}B\nPopulation: ${feature.properties.population.toLocaleString()}`);
                
                // Also select the province to show data panel
                selectProvince(provinceId);
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to load Canada GeoJSON:', error);
        console.log('Province polygons will not be displayed');
    }
}

function selectProvince(provinceId) {
    const province = getProvinceById(provinceId);
    if (!province) return;
    
    console.log('🎯 Province selected:', provinceId, province.name);
    
    appState.selectedProvince = provinceId;
    
    updateProvinceInfoPanel(province);
    
    updateDataPanel(provinceId);
    
    elements.provinceInfoPanel.classList.remove('hidden');
    elements.dataPanel.classList.remove('hidden');
    
    if (elements.map) {
        elements.map.easeTo({
            center: province.center,
            zoom: 5,
            pitch: 20,
            bearing: 0,
            duration: 1000,
            essential: true,
        });
    }
}

function updateProvinceInfoPanel(province) {
    elements.provinceName.textContent = province.name;
    elements.provincePopulation.textContent = `Population: ${formatNumber(province.population)}`;
    elements.provinceCoordinates.textContent = `Center: ${province.center[1].toFixed(2)}°, ${province.center[0].toFixed(2)}°`;
}

function updateDataPanel(provinceId) {
    const metrics = getProvinceMetrics(provinceId);
    const province = getProvinceById(provinceId);
    
    if (!metrics || !province) return;
    
    elements.panelProvinceTitle.textContent = `${province.name} GDP Data`;
    
    elements.statCurrentRate.textContent = formatCurrency(metrics.gdp2023);
    elements.statAvgRate.textContent = formatCurrency(metrics.gdp2022);
    elements.statPeakRate.textContent = formatCurrency(metrics.gdp2021);
    elements.statPeakYear.textContent = formatPercentage(metrics.growth2022_2023);
    
    renderCharts(metrics, provinceId);
}

function renderCharts(metrics, provinceId) {
    d3.select(elements.chartTrend).selectAll('*').remove();
    d3.select(elements.chartComparison).selectAll('*').remove();
    
    renderTrendChart(metrics);
    renderComparisonChart(metrics);
}

function renderTrendChart(metrics) {
    if (!metrics.recentTrend) return;
    
    const width = 350;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    
    const svg = d3.select(elements.chartTrend)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const xScale = d3.scaleLinear()
        .domain(d3.extent(metrics.recentTrend, d => d.year))
        .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
        .domain([0, Math.max(...metrics.recentTrend.map(d => d.gdp)) * 1.1])
        .range([innerHeight, 0]);
    
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.gdp))
        .curve(d3.curveMonotoneX);
    
    chart.append('path')
        .datum(metrics.recentTrend)
        .attr('fill', 'none')
        .attr('stroke', '#2563eb')
        .attr('stroke-width', 3)
        .attr('d', line);
    
    chart.selectAll('.dot')
        .data(metrics.recentTrend)
        .join('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.gdp))
        .attr('r', 4)
        .attr('fill', '#2563eb');
    
    chart.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
        .selectAll('text')
        .attr('font-size', '11px');
    
    chart.append('g')
        .call(d3.axisLeft(yScale).tickFormat(d => formatCurrency(d)))
        .selectAll('text')
        .attr('font-size', '11px');
}

function renderComparisonChart(metrics) {
    if (!metrics.comparisonData) return;
    
    const width = 350;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    
    const svg = d3.select(elements.chartComparison)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const xScale = d3.scaleBand()
        .domain(metrics.comparisonData.map(d => d.province))
        .range([0, innerWidth])
        .padding(0.1);
    
    const yScale = d3.scaleLinear()
        .domain([0, Math.max(...metrics.comparisonData.map(d => d.gdp)) * 1.1])
        .range([innerHeight, 0]);
    
    chart.selectAll('.bar')
        .data(metrics.comparisonData)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.province))
        .attr('y', d => yScale(d.gdp))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.gdp))
        .attr('fill', d => getGDPColor(d.gdp))
        .attr('opacity', 0.8);
    
    chart.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .attr('text-anchor', 'end')
        .attr('font-size', '10px');
    
    chart.append('g')
        .call(d3.axisLeft(yScale).tickFormat(d => formatCurrency(d)))
        .selectAll('text')
        .attr('font-size', '11px');
    
    chart.selectAll('.label')
        .data(metrics.comparisonData)
        .join('text')
        .attr('class', 'label')
        .attr('x', d => xScale(d.province) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.gdp) - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', '#1e40af')
        .text(d => formatCurrency(d.gdp));
}


function enterStreetView() {
    const province = getProvinceById(appState.selectedProvince);
    console.log('🎬 enterStreetView called, province:', province);
    
    if (!province) {
        console.log('❌ Province not found');
        return;
    }
    
    appState.streetViewOpen = true;
    console.log('📸 Opening street view for:', province.name);
    
    elements.streetViewContainer.classList.remove('hidden');
    console.log('✅ Container shown');
    
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
    appState.streetViewOpen = false;
    elements.streetViewContainer.classList.add('hidden');
}

function showLoadingIndicator(show) {
    if (show) {
        elements.loadingIndicator.classList.remove('hidden');
    } else {
        elements.loadingIndicator.classList.add('hidden');
    }
}

function closeDataPanel() {
    elements.dataPanel.classList.add('hidden');
    appState.selectedProvince = null;
    
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

function closeProvincePanel() {
    elements.provinceInfoPanel.classList.add('hidden');
}

function updateMapMarkersForYear(year) {
    if (!elements.map) return;
    
    // Update province markers with unemployment data for the selected year
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
    } else {
        elements.legendPanel.classList.add('hidden');
    }
}

function setupEventListeners() {
    elements.btnResetView?.addEventListener('click', () => {
        if (elements.map) {
            elements.map.easeTo({
                center: [-95.7129, 56.1304],
                zoom: 1,
                pitch: 45,
                bearing: 0,
                duration: 1500,
            });
        }
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
    
    elements.btnStreetView?.addEventListener('click', enterStreetView);
    elements.btnStreetViewProvincePanel?.addEventListener('click', enterStreetView);
    elements.btnExitStreetView?.addEventListener('click', exitStreetView);
    
    elements.btnStreetViewFloating?.addEventListener('click', enterStreetView);
    
    elements.btnDismissTooltip?.addEventListener('click', () => {
        elements.onboardingTooltip.style.opacity = '0';
        setTimeout(() => elements.onboardingTooltip.classList.add('hidden'), 300);
    });
    
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
        if (e.key === 'Escape' && appState.streetViewOpen) {
            exitStreetView();
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
