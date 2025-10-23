// Province mapping between CSV names and our IDs
const PROVINCE_NAME_MAP = {
    'Newfoundland and Labrador': 'nl',
    'Prince Edward Island': 'pe',
    'Nova Scotia': 'ns',
    'New Brunswick': 'nb',
    'Quebec': 'qc',
    'Ontario': 'on',
    'Manitoba': 'mb',
    'Saskatchewan': 'sk',
    'Alberta': 'ab',
    'British Columbia': 'bc',
    'Yukon': 'yt',
    'Northwest Territories': 'nt',
    'Nunavut': 'nu'
};

// Population data for provinces (2023 estimates)
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

// Province center coordinates and names
const PROVINCE_INFO = {
    'ab': { name: 'Alberta', center: [-115.2723, 53.9333] },
    'bc': { name: 'British Columbia', center: [-122.3045, 53.7267] },
    'mb': { name: 'Manitoba', center: [-98.8139, 56.1304] },
    'nb': { name: 'New Brunswick', center: [-66.4619, 46.5653] },
    'nl': { name: 'Newfoundland & Labrador', center: [-56.1304, 53.1355] },
    'nt': { name: 'Northwest Territories', center: [-117.3560, 64.8255] },
    'ns': { name: 'Nova Scotia', center: [-62.6181, 45.3631] },
    'nu': { name: 'Nunavut', center: [-94.8369, 70.2998] },
    'on': { name: 'Ontario', center: [-85.3232, 51.3826] },
    'pe': { name: 'Prince Edward Island', center: [-63.0, 46.5] },
    'qc': { name: 'Quebec', center: [-73.5673, 52.9399] },
    'sk': { name: 'Saskatchewan', center: [-106.3468, 56.1304] },
    'yt': { name: 'Yukon', center: [-135.0, 64.2008] }
};

// This will store the loaded GDP data
export let CANADIAN_PROVINCES_GDP = [];
export let PROVINCE_GDP_METRICS = {};

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    
    const data = {};
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
        const year = values[0];
        const province = values[1];
        const gdpValue = parseFloat(values[11]); // VALUE column
        
        if (!province || !year || isNaN(gdpValue)) continue;
        
        const provinceId = PROVINCE_NAME_MAP[province];
        if (!provinceId) continue;
        
        if (!data[provinceId]) {
            data[provinceId] = {};
        }
        
        data[provinceId][year] = gdpValue;
    }
    
    return data;
}

// Build province data from parsed CSV
function buildProvinceData(gdpData) {
    const provinces = [];
    const metrics = {};
    
    for (const [provinceId, yearData] of Object.entries(gdpData)) {
        const info = PROVINCE_INFO[provinceId];
        if (!info) continue;
        
        const gdp2021 = yearData['2021'] || 0;
        const gdp2022 = yearData['2022'] || 0;
        const gdp2023 = yearData['2023'] || 0;
        const gdp2024 = yearData['2024'] || 0;
        
        // Calculate growth rate
        const growth2022_2023 = gdp2022 > 0 ? ((gdp2023 - gdp2022) / gdp2022) * 100 : 0;
        const growth2023_2024 = gdp2023 > 0 ? ((gdp2024 - gdp2023) / gdp2023) * 100 : 0;
        
        // Calculate GDP per capita (GDP in millions / population * 1,000,000)
        const population = PROVINCE_POPULATIONS[provinceId];
        const gdpPerCapita2023 = (gdp2023 * 1_000_000) / population;
        
        provinces.push({
            id: provinceId,
            name: info.name,
            center: info.center,
            population: population,
            gdp2021: gdp2021,
            gdp2022: gdp2022,
            gdp2023: gdp2023,
            gdp2024: gdp2024,
            growth2022_2023: parseFloat(growth2022_2023.toFixed(1)),
            growth2023_2024: parseFloat(growth2023_2024.toFixed(1)),
            gdpPerCapita2023: parseFloat(gdpPerCapita2023.toFixed(2)),
        });
        
        // Get all provinces for comparison (all 13 provinces)
        const allProvinces = Object.keys(gdpData).map(id => ({
            province: PROVINCE_INFO[id]?.name || id,
            gdp: gdpData[id]['2023'] || 0
        })).sort((a, b) => b.gdp - a.gdp);
        
        metrics[provinceId] = {
            name: info.name,
            gdp2023: gdp2023,
            gdp2022: gdp2022,
            gdp2021: gdp2021,
            gdp2024: gdp2024,
            growth2022_2023: parseFloat(growth2022_2023.toFixed(1)),
            growth2023_2024: parseFloat(growth2023_2024.toFixed(1)),
            gdpPerCapita2023: parseFloat(gdpPerCapita2023.toFixed(2)),
            trend: growth2022_2023 > 0 ? 'growing' : 'declining',
        recentTrend: [
                { year: 2021, gdp: gdp2021 },
                { year: 2022, gdp: gdp2022 },
                { year: 2023, gdp: gdp2023 },
                { year: 2024, gdp: gdp2024 }
            ],
            comparisonData: allProvinces
        };
    }
    
    return { provinces, metrics };
}

// Load data from CSV
export async function loadProvinceData() {
    try {
        const response = await fetch('../data/province-level-gdp.csv');
        const csvText = await response.text();
        
        const gdpData = parseCSV(csvText);
        const { provinces, metrics } = buildProvinceData(gdpData);
        
        CANADIAN_PROVINCES_GDP = provinces;
        PROVINCE_GDP_METRICS = metrics;
        
        console.log('✅ Loaded GDP data for', provinces.length, 'provinces');
        return true;
    } catch (error) {
        console.error('❌ Failed to load province data:', error);
        return false;
    }
}

// Utility functions
export function getProvinceMetrics(provinceId) {
    return PROVINCE_GDP_METRICS[provinceId] || {};
}

export function getProvinceById(provinceId) {
    return CANADIAN_PROVINCES_GDP.find(p => p.id === provinceId) || null;
}

export function getAllProvinces() {
    return CANADIAN_PROVINCES_GDP;
}

export function formatCurrency(value) {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value) + 'M';
}

export function formatPercentage(value, decimals = 1) {
    if (value === undefined || value === null) return '0.0%';
    return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value) {
    if (!value) return '0';
    return new Intl.NumberFormat('en-CA').format(value);
}

export function getGDPColor(gdp) {
    // Vercel-inspired color scale based on GDP contribution (in millions)
    if (gdp >= 300000) return '#00d9ff';      // Vercel Cyan - Very High GDP (300B+)
    if (gdp >= 100000) return '#0070f3';      // Vercel Blue - High GDP (100B+)
    if (gdp >= 50000) return '#7928ca';       // Vercel Purple - Moderate GDP (50B+)
    if (gdp >= 10000) return '#f81ce5';       // Vercel Magenta - Low GDP (10B+)
    return '#ff0080';                         // Vercel Pink - Very Low GDP (<10B)
}

export function getGDPStatus(gdp) {
    if (gdp >= 300000) return 'Very High';
    if (gdp >= 100000) return 'High';
    if (gdp >= 50000) return 'Moderate';
    if (gdp >= 10000) return 'Low';
    return 'Very Low';
}
