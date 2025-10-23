import {
    CANADIAN_CITIES,
    getCityMetrics,
    getCityById,
    formatCurrency,
    formatPercentage,
    formatNumber,
} from './data.js';

const MAPILLARY_ACCESS_TOKEN = 'MLY|25924883943764997|4ac03280f19bbd17e1e57bbef97fb5f2';

const appState = {
    selectedCity: null,
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
    btnCloseCityPanel: document.getElementById('btn-close-city-panel'),
    btnStreetView: document.getElementById('btn-street-view-right-panel'),
    btnStreetViewCityPanel: document.getElementById('btn-street-view-city-panel'),
    btnStreetViewFloating: document.getElementById('btn-street-view-floating'),
    btnExitStreetView: document.getElementById('btn-exit-street-view'),
    btnDismissTooltip: document.getElementById('dismiss-tooltip'),
    
    dataPanel: document.getElementById('data-panel'),
    cityInfoPanel: document.getElementById('city-info-panel'),
    legendPanel: document.getElementById('legend-panel'),
    streetViewContainer: document.getElementById('street-view-container'),
    onboardingTooltip: document.getElementById('onboarding-tooltip'),
    loadingIndicator: document.getElementById('loading-indicator'),
    
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    
    cityName: document.getElementById('city-name'),
    cityProvince: document.getElementById('city-province'),
    cityCoordinates: document.getElementById('city-coordinates'),
    panelCityTitle: document.getElementById('panel-city-title'),
    streetViewLocation: document.getElementById('street-view-location'),
    
    statPopulation: document.getElementById('stat-population'),
    statMedianIncome: document.getElementById('stat-median-income'),
    statUnemployment: document.getElementById('stat-unemployment'),
    statAge: document.getElementById('stat-age'),
    
    chartOverview: document.getElementById('chart-overview'),
    chartIncome: document.getElementById('chart-income'),
    chartEmployment: document.getElementById('chart-employment'),
    chartDemographics: document.getElementById('chart-demographics'),
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
            
            map.on('load', () => {
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

function addCityMarkers(map) {
    const cityFeatures = CANADIAN_CITIES.map((city, idx) => ({
        type: 'Feature',
        id: idx,
        properties: {
            id: city.id,
            name: city.name,
            hasStreetView: city.hasStreetView,
        },
        geometry: {
            type: 'Point',
            coordinates: [city.lng, city.lat],
        },
    }));
    
    const geoJSON = {
        type: 'FeatureCollection',
        features: cityFeatures,
    };
    
    map.addSource('cities', {
        type: 'geojson',
        data: geoJSON,
    });
    
    map.addLayer({
        id: 'city-markers',
        type: 'circle',
        source: 'cities',
        paint: {
            'circle-radius': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                12,
                10,
            ],
            'circle-color': [
                'case',
                ['get', 'hasStreetView'],
                '#38bdf8',
                '#fbbf24',
            ],
            'circle-opacity': 0.9,
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 1,
        },
    });
    
    map.addLayer({
        id: 'city-labels',
        type: 'symbol',
        source: 'cities',
        layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'text-allow-overlap': false,
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1,
            'text-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                0.6,
            ],
        },
    });
    
    let hoveredId = null;
    map.on('mousemove', 'city-markers', (e) => {
        if (e.features.length > 0) {
            if (hoveredId !== null) {
                map.setFeatureState({ source: 'cities', id: hoveredId }, { hover: false });
            }
            hoveredId = e.features[0].id;
            map.setFeatureState({ source: 'cities', id: hoveredId }, { hover: true });
            map.getCanvas().style.cursor = 'pointer';
        }
    });
    
    map.on('mouseleave', 'city-markers', () => {
        if (hoveredId !== null) {
            map.setFeatureState({ source: 'cities', id: hoveredId }, { hover: false });
        }
        hoveredId = null;
        map.getCanvas().style.cursor = '';
    });
    
    map.on('click', 'city-markers', (e) => {
        if (e.features.length > 0) {
            const cityId = e.features[0].properties.id;
            selectCity(cityId);
        }
    });
}

function selectCity(cityId) {
    const city = getCityById(cityId);
    if (!city) return;
    
    console.log('🎯 City selected:', cityId, city.name);
    
    appState.selectedCity = cityId;
    
    updateCityInfoPanel(city);
    
    updateDataPanel(cityId);
    
    elements.cityInfoPanel.classList.remove('hidden');
    elements.dataPanel.classList.remove('hidden');
    
    if (elements.map) {
        elements.map.easeTo({
            center: [city.lng, city.lat],
            zoom: 13,
            pitch: 30,
            bearing: 0,
            duration: 1000,
            essential: true,
        });
    }
    
    if (city.hasStreetView) {
        elements.btnStreetView.classList.remove('hidden');
        elements.btnStreetViewCityPanel.classList.remove('hidden');
        elements.btnStreetViewFloating.classList.remove('hidden');
    } else {
        elements.btnStreetView.classList.add('hidden');
        elements.btnStreetViewCityPanel.classList.add('hidden');
        elements.btnStreetViewFloating.classList.add('hidden');
    }
}

function updateCityInfoPanel(city) {
    elements.cityName.textContent = city.name;
    elements.cityProvince.textContent = `📍 ${city.province}`;
    elements.cityCoordinates.textContent = `Coordinates: ${city.lat.toFixed(4)}°, ${city.lng.toFixed(4)}°`;
}

function updateDataPanel(cityId) {
    const metrics = getCityMetrics(cityId);
    const city = getCityById(cityId);
    
    if (!metrics || !city) return;
    
    elements.panelCityTitle.textContent = `${city.name} Data`;
    
    elements.statPopulation.textContent = formatNumber(metrics.population);
    elements.statMedianIncome.textContent = formatCurrency(metrics.medianIncome);
    elements.statUnemployment.textContent = formatPercentage(metrics.unemploymentRate);
    elements.statAge.textContent = `${metrics.avgAge.toFixed(1)} yrs`;
    
    renderCharts(metrics);
}

function renderCharts(metrics) {
    d3.select(elements.chartIncome).selectAll('*').remove();
    d3.select(elements.chartEmployment).selectAll('*').remove();
    d3.select(elements.chartDemographics).selectAll('*').remove();
    
    renderIncomeChart(metrics);
    
    renderEmploymentChart(metrics);
    
    renderDemographicsChart(metrics);
}

function renderIncomeChart(metrics) {
    if (!metrics.incomeDistribution) return;
    
    const width = 350;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    
    const svg = d3.select(elements.chartIncome)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const xScale = d3.scaleBand()
        .domain(metrics.incomeDistribution.map(d => d.range))
        .range([0, innerWidth])
        .padding(0.1);
    
    const yScale = d3.scaleLinear()
        .domain([0, Math.max(...metrics.incomeDistribution.map(d => d.percentage))])
        .range([innerHeight, 0]);
    
    chart.selectAll('.bar')
        .data(metrics.incomeDistribution)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.range))
        .attr('y', d => yScale(d.percentage))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.percentage))
        .attr('fill', '#2563eb')
        .attr('opacity', 0.8);
    
    chart.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .attr('text-anchor', 'end')
        .attr('font-size', '11px');
    
    chart.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .attr('font-size', '11px');
    
    chart.selectAll('.label')
        .data(metrics.incomeDistribution)
        .join('text')
        .attr('class', 'label')
        .attr('x', d => xScale(d.range) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.percentage) - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('fill', '#1e40af')
        .text(d => `${d.percentage}%`);
}

function renderEmploymentChart(metrics) {
    if (!metrics.employmentBySector) return;
    
    const width = 350;
    const height = 250;
    const radius = Math.min(width, height) / 2 - 40;
    
    const svg = d3.select(elements.chartEmployment)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const g = svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);
    
    const pie = d3.pie().value(d => d.percentage);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    
    const colors = d3.schemeSet2;
    const color = d3.scaleOrdinal()
        .domain(metrics.employmentBySector.map(d => d.sector))
        .range(colors);
    
    const arcs = g.selectAll('.arc')
        .data(pie(metrics.employmentBySector))
        .join('g')
        .attr('class', 'arc');
    
    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.sector))
        .attr('opacity', 0.8);
    
    arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('fill', 'white')
        .text(d => `${d.data.percentage}%`);
    
    const legend = svg.append('g')
        .attr('transform', `translate(${-radius - 20}, ${-radius + 20})`);
    
    legend.selectAll('.legend-item')
        .data(metrics.employmentBySector)
        .join('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`)
        .call(g => {
            g.append('rect')
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', d => color(d.sector));
            
            g.append('text')
                .attr('x', 16)
                .attr('y', 10)
                .attr('font-size', '11px')
                .text(d => d.sector);
        });
}

function renderDemographicsChart(metrics) {
    if (!metrics.ageDistribution) return;
    
    const width = 350;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    
    const svg = d3.select(elements.chartDemographics)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const xScale = d3.scaleBand()
        .domain(metrics.ageDistribution.map(d => d.range))
        .range([0, innerWidth])
        .padding(0.1);
    
    const yScale = d3.scaleLinear()
        .domain([0, Math.max(...metrics.ageDistribution.map(d => d.percentage))])
        .range([innerHeight, 0]);
    
    const colorScale = d3.scaleLinear()
        .domain([0, metrics.ageDistribution.length - 1])
        .range(['#06b6d4', '#2563eb']);
    
    chart.selectAll('.bar')
        .data(metrics.ageDistribution)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.range))
        .attr('y', d => yScale(d.percentage))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.percentage))
        .attr('fill', (d, i) => colorScale(i))
        .attr('opacity', 0.85);
    
    chart.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('font-size', '11px');
    
    chart.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .attr('font-size', '11px');
}

function enterStreetView() {
    const city = getCityById(appState.selectedCity);
    console.log('🎬 enterStreetView called, city:', city);
    
    if (!city || !city.hasStreetView) {
        console.log('❌ City not found or no street view');
        return;
    }
    
    appState.streetViewOpen = true;
    console.log('📸 Opening street view for:', city.name);
    
    elements.streetViewContainer.classList.remove('hidden');
    console.log('✅ Container shown');
    
    const canvas = document.getElementById('street-view-canvas');
    canvas.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;"><p>Loading street view...</p></div>';
    
    if (MAPILLARY_ACCESS_TOKEN === 'YOUR_TOKEN_HERE') {
        console.log('⚠️ Token not set');
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
                <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Mapillary Token Required</h2>
                <p>Token is not set. Please check app.js</p>
            </div>
        `;
        return;
    }
    
    console.log('🔍 Fetching Mapillary image...');
    
    fetchMapillaryImage(city.lat, city.lng)
        .then(imageId => {
            console.log('📍 Image ID found:', imageId);
            
            if (!imageId) {
                console.log('❌ No image found for location');
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
                    ">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">📍</div>
                        <p style="font-size: 1.1rem;">No Mapillary coverage for ${city.name}</p>
                        <p style="font-size: 0.9rem; color: #ccc;">This area may not have street-level imagery available.</p>
                    </div>
                `;
                return;
            }
            
            console.log('🎥 Creating Mapillary viewer...');
            
            canvas.innerHTML = '';
            
            const viewer = new mapillary.Viewer({
                accessToken: MAPILLARY_ACCESS_TOKEN,
                container: 'street-view-canvas',
                imageId: imageId,
            });
            
            console.log('✅ Viewer created');
            
            elements.streetViewLocation.textContent = `Viewing: ${city.name}, ${city.province}`;
            
            console.log(`✅ Mapillary loaded for ${city.name}`);
        })
        .catch(error => {
            console.error('❌ Error loading Mapillary:', error);
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
                ">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">❌</div>
                    <p style="font-size: 1.1rem;">Error loading street view</p>
                    <p style="font-size: 0.9rem; color: #ccc;">${error.message}</p>
                </div>
            `;
        });
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
    appState.selectedCity = null;
    
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

function closeCityPanel() {
    elements.cityInfoPanel.classList.add('hidden');
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
    elements.btnCloseCityPanel?.addEventListener('click', closeCityPanel);
    
    elements.btnStreetView?.addEventListener('click', enterStreetView);
    elements.btnStreetViewCityPanel?.addEventListener('click', enterStreetView);
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
