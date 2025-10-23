import {
    CANADIAN_PROVINCES_GDP,
    loadProvinceData,
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
        
        // Load GDP data from CSV first
        console.log('📊 Loading province GDP data...');
        await loadProvinceData();
        
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
    // Province colors will be determined by GDP dynamically
    
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
        'Yukon Territory': 'yt',
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
            const gdp = provinceData?.gdp2023 || 0;
            
            return {
                ...feature,
                id: idx,
                properties: {
                    ...feature.properties,
                    id: provinceId,
                    color: getGDPColor(gdp), // Dynamic color based on GDP
                    gdp2023: gdp,
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
            
            // Show tooltip with GDP info
            const feature = e.features[0];
            const gdp = feature.properties.gdp2023;
            const name = feature.properties.name;
            const provinceId = feature.properties.id;
            const provinceData = CANADIAN_PROVINCES_GDP.find(p => p.id === provinceId);
            
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
                Growth: ${provinceData?.growth2022_2023 || 0}%
            `;
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
        
        // Hide tooltip
        const tooltip = document.getElementById('map-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    });
        
        // Add click handler for province polygons
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
                
                // Calculate bounds for the clicked province
                const coordinates = feature.geometry.coordinates;
                let bounds;
                
                try {
                    // Handle both Polygon and MultiPolygon geometries
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
                    
                    // Select the province and zoom to its bounds
                    selectProvince(provinceId, bounds);
                } catch (error) {
                    console.error('❌ Error calculating bounds:', error);
                    // Fallback to selecting without bounds
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
    
    // Update panels
    console.log('📊 Updating province info panel...');
    updateProvinceInfoPanel(province);
    
    console.log('📈 Updating data panel...');
    updateDataPanel(provinceId);
    
    // Show panels
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
    
    // Zoom to province
    if (elements.map) {
        // If bounds are provided (from polygon click), fit to bounds
        if (bounds) {
            console.log('🗺️ Fitting to bounds...');
            try {
                elements.map.fitBounds(bounds, {
                    padding: { top: 100, bottom: 100, left: 100, right: 450 }, // Extra padding on right for data panel
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
            // Fallback to center-based zoom
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
    
    // Colors - using emerald/green for growth trend
    const lineColor = '#10b981';      // Emerald
    const dotColor = '#34d399';       // Light emerald
    const areaColor = '#10b981';      // Emerald
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
    
    // Use band scale for better spacing of years
    const xScale = d3.scaleBand()
        .domain(metrics.recentTrend.map(d => d.year))
        .range([0, innerWidth])
        .padding(0.3);
    
    const yScale = d3.scaleLinear()
        .domain([0, Math.max(...metrics.recentTrend.map(d => d.gdp)) * 1.15])
        .range([innerHeight, 0]);
    
    // Add horizontal grid lines first (behind everything)
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
    
    // Add area under the line
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
    
    // Draw line
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
    
    // Add dots with glow effect
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
    
    // Add value labels above dots
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
    
    // X axis
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
    
    // Y axis
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
    
    // Color scheme
    const highlightColor = '#00d9ff'; // Cyan for selected province
    const textColor = '#e5e7eb';
    const gridColor = '#374151';
    
    const width = 380;
    const height = 400; // Increased height for all provinces
    const margin = { top: 30, right: 20, bottom: 60, left: 70 };
    
    // Function to abbreviate province names
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
    
    // Calculate bar width to fit all 13 provinces
    const barWidth = innerWidth / metrics.comparisonData.length - 4;
    
    const xScale = d3.scaleBand()
        .domain(metrics.comparisonData.map(d => d.province))
        .range([0, innerWidth])
        .padding(0.15);
    
    const yScale = d3.scaleLinear()
        .domain([0, Math.max(...metrics.comparisonData.map(d => d.gdp)) * 1.15])
        .range([innerHeight, 0]);
    
    // Add horizontal grid lines
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
    
    // Determine if province is the selected one
    const isSelected = (provinceName) => {
        return provinceName === metrics.name || 
               provinceName === (metrics.name + ' & Labrador').replace('Newfoundland', 'Newfoundland and Labrador');
    };
    
    // Draw bars with different colors
    chart.selectAll('.bar')
        .data(metrics.comparisonData)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.province))
        .attr('y', d => yScale(d.gdp))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.gdp))
        .attr('fill', d => {
            // Selected province gets highlight color, others get GDP-based color
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
    
    // Add value labels on top of bars (only for larger bars to avoid clutter)
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
    
    // X axis with abbreviated names
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
    
    // Y axis
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
