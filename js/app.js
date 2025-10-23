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
    getDataColor,
    getGDPStatus,
    getIncomeStatus,
    getDataStatus,
    setCurrentDataType,
    getCurrentDataType,
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

const appState = {
    selectedProvince: null,
    streetViewOpen: false,
    mapLoaded: false,
    legendOpen: false,
};

const elements = {
    map: null,
    mapContainer: document.getElementById('map-container'),
    
    dataTypeSelect: document.getElementById('data-type-select'),
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
    legendTitle: document.getElementById('legend-title'),
    legendItems: document.getElementById('legend-items'),
    legendNote: document.getElementById('legend-note'),
    streetViewContainer: document.getElementById('street-view-container'),
    onboardingTooltip: document.getElementById('onboarding-tooltip'),
    loadingIndicator: document.getElementById('loading-indicator'),
    
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    tabTrendBtn: document.getElementById('tab-trend-btn'),
    
    provinceName: document.getElementById('province-name'),
    provincePopulation: document.getElementById('province-population'),
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

async function initApp() {
    try {
        showLoadingIndicator(true);
        
        console.log('📊 Loading province data...');
        await loadProvinceData();
        
        await initMap();
        
        setupEventListeners();
        
        updateLegend();
        updateTabLabels();
        
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
            
            if (getCurrentDataType() === 'income') {
                const provinceData = CANADIAN_PROVINCES_INCOME.find(p => p.id === provinceId);
                dataValue = provinceData?.averageIncome || 0;
                color = provinceData?.averageIncome ? getIncomeColor(dataValue) : '#666666';
            } else {
                const provinceData = CANADIAN_PROVINCES_GDP.find(p => p.id === provinceId);
                dataValue = provinceData?.gdp2023 || 0;
                color = getGDPColor(dataValue);
            }
            
            return {
                ...feature,
                id: idx,
                properties: {
                    ...feature.properties,
                    id: provinceId,
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
                    tooltipContent += `Avg Income: ${formatIncome(dataValue)}<br>`;
                    tooltipContent += `Status: ${getIncomeStatus(dataValue)}`;
                }
            } else {
                tooltipContent += `GDP 2023: $${dataValue.toLocaleString()}B<br>`;
                tooltipContent += `Status: ${getGDPStatus(dataValue)}`;
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
    
    console.log('📊 Updating province info panel...');
    updateProvinceInfoPanel(province);
    
    console.log('📈 Updating data panel...');
    updateDataPanel(provinceId);
    
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

function updateProvinceInfoPanel(province) {
    elements.provinceName.textContent = province.name;
    elements.provincePopulation.textContent = `Population: ${formatNumber(province.population)}`;
    elements.provinceCoordinates.textContent = `Center: ${province.center[1].toFixed(2)}°, ${province.center[0].toFixed(2)}°`;
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
    
    renderCharts(metrics, provinceId);
}

function updateLegend() {
    const dataType = getCurrentDataType();
    
    if (dataType === 'income') {
        elements.legendTitle.textContent = 'Income Color Legend';
        elements.legendNote.textContent = 'Province colors based on average income';
        
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
    } else {
        elements.legendTitle.textContent = 'GDP Color Legend';
        elements.legendNote.textContent = 'Province colors based on GDP';
        
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

function updateMapColors() {
    if (!elements.map) return;
    
    const dataType = getCurrentDataType();
    
    const source = elements.map.getSource('province-polygons');
    if (!source || !source._data) return;
    
    source._data.features = source._data.features.map(feature => {
        const provinceId = feature.properties.id;
        let dataValue = 0;
        let color = '#ff0080';
        
        if (dataType === 'income') {
            const provinceData = CANADIAN_PROVINCES_INCOME.find(p => p.id === provinceId);
            dataValue = provinceData?.averageIncome || 0;
            color = provinceData?.averageIncome ? getIncomeColor(dataValue) : '#666666';
        } else {
            const provinceData = CANADIAN_PROVINCES_GDP.find(p => p.id === provinceId);
            dataValue = provinceData?.gdp2023 || 0;
            color = getGDPColor(dataValue);
        }
        
        return {
            ...feature,
            properties: {
                ...feature.properties,
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
    const margin = { top: 30, right: 30, bottom: 50, left: 70 };
    
    const svg = d3.select(elements.chartTrend)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent');
    
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
    const margin = { top: 30, right: 30, bottom: 50, left: 70 };
    
    const svg = d3.select(elements.chartTrend)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent');
    
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
    
    const width = 380;
    const height = 400;
    const margin = { top: 30, right: 20, bottom: 60, left: 70 };
    
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
    
    const svg = d3.select(elements.chartComparison)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent');
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const barWidth = innerWidth / metrics.comparisonData.length - 4;
    
    const xScale = d3.scaleBand()
        .domain(metrics.comparisonData.map(d => d.province))
        .range([0, innerWidth])
        .padding(0.15);
    
    const yScale = d3.scaleLinear()
        .domain([0, Math.max(...metrics.comparisonData.map(d => d.gdp)) * 1.15])
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
    
    const isSelected = (provinceName) => {
        return provinceName === metrics.name || 
               provinceName === (metrics.name + ' & Labrador').replace('Newfoundland', 'Newfoundland and Labrador');
    };
    
    chart.selectAll('.bar')
        .data(metrics.comparisonData)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.province))
        .attr('y', d => yScale(d.gdp))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.gdp))
        .attr('fill', d => {
            if (isSelected(d.province)) {
                return highlightColor;
            }
            return getGDPColor(d.gdp);
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
        })
        .on('mouseleave', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', isSelected(d.province) ? 1 : 0.7);
        });
    
    chart.selectAll('.value-label')
        .data(metrics.comparisonData.filter(d => d.gdp > 50000 || isSelected(d.province)))
        .join('text')
        .attr('class', 'value-label')
        .attr('x', d => xScale(d.province) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.gdp) - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-weight', '700')
        .attr('fill', d => isSelected(d.province) ? highlightColor : textColor)
        .text(d => {
            if (d.gdp >= 1000) return `$${(d.gdp/1000).toFixed(0)}B`;
            return `$${d.gdp.toFixed(0)}M`;
        });
    
    const xAxis = chart.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(d => abbreviateProvince(d))
            .tickSize(0)
            .tickPadding(8));
    
    xAxis.selectAll('text')
        .attr('font-size', '11px')
        .attr('font-weight', d => isSelected(d) ? '700' : '500')
        .attr('fill', d => isSelected(d) ? highlightColor : textColor);
    
    xAxis.select('.domain')
        .attr('stroke', gridColor);
    
    const yAxis = chart.append('g')
        .call(d3.axisLeft(yScale)
            .ticks(6)
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

function renderIncomeComparisonChart(metrics) {
    if (!metrics.comparisonData) return;
    
    const highlightColor = '#00d9ff';
    const textColor = '#e5e7eb';
    const gridColor = '#374151';
    
    const width = 380;
    const height = 400;
    const margin = { top: 30, right: 20, bottom: 60, left: 70 };
    
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
    
    const svg = d3.select(elements.chartComparison)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'transparent');
    
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const xScale = d3.scaleBand()
        .domain(metrics.comparisonData.map(d => d.province))
        .range([0, innerWidth])
        .padding(0.15);
    
    const yScale = d3.scaleLinear()
        .domain([0, Math.max(...metrics.comparisonData.map(d => d.income || 0)) * 1.15])
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
    
    const isSelected = (provinceName) => {
        return provinceName === metrics.name || 
               provinceName === (metrics.name + ' & Labrador').replace('Newfoundland', 'Newfoundland and Labrador');
    };
    
    chart.selectAll('.bar')
        .data(metrics.comparisonData)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.province))
        .attr('y', d => yScale(d.income))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.income))
        .attr('fill', d => {
            if (isSelected(d.province)) {
                return highlightColor;
            }
            return d.income ? getIncomeColor(d.income) : '#666666';
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
        })
        .on('mouseleave', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', isSelected(d.province) ? 1 : 0.7);
        });
    
    chart.selectAll('.value-label')
        .data(metrics.comparisonData.filter(d => (d.income && d.income > 30000) || isSelected(d.province)))
        .join('text')
        .attr('class', 'value-label')
        .attr('x', d => xScale(d.province) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.income || 0) - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-weight', '700')
        .attr('fill', d => isSelected(d.province) ? highlightColor : textColor)
        .text(d => d.income ? formatIncome(d.income) : 'N/A');
    
    const xAxis = chart.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(d => abbreviateProvince(d))
            .tickSize(0)
            .tickPadding(8));
    
    xAxis.selectAll('text')
        .attr('font-size', '11px')
        .attr('font-weight', d => isSelected(d) ? '700' : '500')
        .attr('fill', d => isSelected(d) ? highlightColor : textColor);
    
    xAxis.select('.domain')
        .attr('stroke', gridColor);
    
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
    elements.dataTypeSelect?.addEventListener('change', (e) => {
        const newDataType = e.target.value;
        switchDataType(newDataType);
    });
    
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