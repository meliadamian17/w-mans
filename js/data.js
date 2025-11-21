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

const PROVINCE_CODE_MAP = {
    10: 'nl',
    11: 'pe',
    12: 'ns',
    13: 'nb',
    24: 'qc',
    35: 'on',
    46: 'mb',
    47: 'sk',
    48: 'ab',
    59: 'bc',
    60: 'yt',
    61: 'nt',
    62: 'nu'
};

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

const PROVINCE_INFO = {
    'ab': { name: 'Alberta', center: [-115.2723, 53.9333], regionId: 'prairies' },
    'bc': { name: 'British Columbia', center: [-122.3045, 53.7267], regionId: 'pacific' },
    'mb': { name: 'Manitoba', center: [-98.8139, 56.1304], regionId: 'prairies' },
    'nb': { name: 'New Brunswick', center: [-66.4619, 46.5653], regionId: 'atlantic' },
    'nl': { name: 'Newfoundland & Labrador', center: [-56.1304, 53.1355], regionId: 'atlantic' },
    'nt': { name: 'Northwest Territories', center: [-117.3560, 64.8255], regionId: 'north' },
    'ns': { name: 'Nova Scotia', center: [-62.6181, 45.3631], regionId: 'atlantic' },
    'nu': { name: 'Nunavut', center: [-94.8369, 70.2998], regionId: 'north' },
    'on': { name: 'Ontario', center: [-85.3232, 51.3826], regionId: 'central' },
    'pe': { name: 'Prince Edward Island', center: [-63.0, 46.5], regionId: 'atlantic' },
    'qc': { name: 'Quebec', center: [-73.5673, 52.9399], regionId: 'central' },
    'sk': { name: 'Saskatchewan', center: [-106.3468, 56.1304], regionId: 'prairies' },
    'yt': { name: 'Yukon', center: [-135.0, 64.2008], regionId: 'north' }
};

const REGION_DEFINITIONS = [
    {
        id: 'atlantic',
        name: 'Atlantic Canada',
        description: 'Coastal economies from Newfoundland & Labrador through New Brunswick.',
        provinces: ['nl', 'pe', 'ns', 'nb']
    },
    {
        id: 'central',
        name: 'Central Canada',
        description: 'Manufacturing and innovation corridor anchored by Ontario and Quebec.',
        provinces: ['qc', 'on']
    },
    {
        id: 'prairies',
        name: 'Prairie Provinces',
        description: 'Energy and agriculture powerhouses across Manitoba, Saskatchewan, and Alberta.',
        provinces: ['mb', 'sk', 'ab']
    },
    {
        id: 'pacific',
        name: 'Pacific Canada',
        description: 'Gateway economies along the Pacific coast.',
        provinces: ['bc']
    },
    {
        id: 'north',
        name: 'Northern Territories',
        description: 'Resource-rich territories within Canada’s Arctic.',
        provinces: ['yt', 'nt', 'nu']
    }
];

const PROVINCE_REGION_MAP = REGION_DEFINITIONS.reduce((acc, region) => {
    region.provinces.forEach(provinceId => {
        acc[provinceId] = region.id;
    });
    return acc;
}, {});

export const REGIONS = REGION_DEFINITIONS.map(region => ({
    id: region.id,
    name: region.name,
    provinces: region.provinces,
    description: region.description
}));

export let CANADIAN_PROVINCES_GDP = [];
export let CANADIAN_PROVINCES_INCOME = [];
export let PROVINCE_GDP_METRICS = {};
export let PROVINCE_INCOME_METRICS = {};
export let REGION_GDP_METRICS = {};
export let REGION_INCOME_METRICS = {};
export let CITY_DATA = {};

export let CURRENT_DATA_TYPE = 'gdp';
export let CURRENT_DATA_SCOPE = 'province';

function parseGDPCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    
    const data = {};
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
        const year = values[0];
        const province = values[1];
        const gdpValue = parseFloat(values[11]);
        
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

function parseIncomeCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    
    const data = {};
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
        const provinceCode = parseInt(values[2]);
        const incomeValue = parseFloat(values[17]);
        const weight = parseFloat(values[1]);
        
        if (!provinceCode || isNaN(incomeValue) || isNaN(weight)) continue;
        
        const provinceId = PROVINCE_CODE_MAP[provinceCode];
        if (!provinceId) continue;
        
        if (incomeValue >= 99999996) continue;
        
        if (!data[provinceId]) {
            data[provinceId] = [];
        }
        
        data[provinceId].push({
            income: incomeValue,
            weight: weight
        });
    }
    
    return data;
}

function buildGDPProvinceData(gdpData) {
    const provinces = [];
    const metrics = {};
    const gdpRanking = Object.keys(gdpData).map(id => ({
        province: PROVINCE_INFO[id]?.name || id,
        gdp: gdpData[id]?.['2023'] || 0
    })).sort((a, b) => b.gdp - a.gdp);
    
    for (const [provinceId, yearData] of Object.entries(gdpData)) {
        const info = PROVINCE_INFO[provinceId];
        if (!info) continue;
        
        const gdp2021 = yearData['2021'] || 0;
        const gdp2022 = yearData['2022'] || 0;
        const gdp2023 = yearData['2023'] || 0;
        const gdp2024 = yearData['2024'] || 0;
        
        const growth2022_2023 = gdp2022 > 0 ? ((gdp2023 - gdp2022) / gdp2022) * 100 : 0;
        const growth2023_2024 = gdp2023 > 0 ? ((gdp2024 - gdp2023) / gdp2023) * 100 : 0;
        
        const population = PROVINCE_POPULATIONS[provinceId];
        const gdpPerCapita2023 = population ? (gdp2023 * 1_000_000) / population : 0;
        
        provinces.push({
            id: provinceId,
            name: info.name,
            center: info.center,
            population: population,
            regionId: info.regionId,
            gdp2021: gdp2021,
            gdp2022: gdp2022,
            gdp2023: gdp2023,
            gdp2024: gdp2024,
            growth2022_2023: parseFloat(growth2022_2023.toFixed(1)),
            growth2023_2024: parseFloat(growth2023_2024.toFixed(1)),
            gdpPerCapita2023: parseFloat(gdpPerCapita2023.toFixed(2)),
        });
        
        metrics[provinceId] = {
            name: info.name,
            gdp2023: gdp2023,
            gdp2022: gdp2022,
            gdp2021: gdp2021,
            gdp2024: gdp2024,
            growth2022_2023: parseFloat(growth2022_2023.toFixed(1)),
            growth2023_2024: parseFloat(growth2023_2024.toFixed(1)),
            gdpPerCapita2023: parseFloat(gdpPerCapita2023.toFixed(2)),
            population,
            regionId: info.regionId,
            trend: growth2022_2023 > 0 ? 'growing' : 'declining',
            recentTrend: [
                { year: 2021, gdp: gdp2021 },
                { year: 2022, gdp: gdp2022 },
                { year: 2023, gdp: gdp2023 },
                { year: 2024, gdp: gdp2024 }
            ],
            comparisonData: gdpRanking
        };
    }
    
    const regionMetrics = buildRegionGDPMetrics(gdpData);
    
    return { provinces, metrics, regionMetrics };
}

function buildRegionGDPMetrics(gdpData) {
    const metrics = {};
    
    REGION_DEFINITIONS.forEach(region => {
        const totals = {
            gdp2021: 0,
            gdp2022: 0,
            gdp2023: 0,
            gdp2024: 0,
            population: 0
        };
        
        region.provinces.forEach(provinceId => {
            const provinceData = gdpData[provinceId] || {};
            totals.gdp2021 += provinceData['2021'] || 0;
            totals.gdp2022 += provinceData['2022'] || 0;
            totals.gdp2023 += provinceData['2023'] || 0;
            totals.gdp2024 += provinceData['2024'] || 0;
            totals.population += PROVINCE_POPULATIONS[provinceId] || 0;
        });
        
        if (totals.population === 0) {
            metrics[region.id] = {
                name: region.name,
                gdp2021: 0,
                gdp2022: 0,
                gdp2023: 0,
                gdp2024: 0,
                gdpPerCapita2023: 0,
                population: 0,
                growth2022_2023: 0,
                growth2023_2024: 0,
                trend: 'neutral',
                recentTrend: [],
            };
            return;
        }
        
        const growth2022_2023 = totals.gdp2022 > 0 ? ((totals.gdp2023 - totals.gdp2022) / totals.gdp2022) * 100 : 0;
        const growth2023_2024 = totals.gdp2023 > 0 ? ((totals.gdp2024 - totals.gdp2023) / totals.gdp2023) * 100 : 0;
        const gdpPerCapita2023 = totals.population ? (totals.gdp2023 * 1_000_000) / totals.population : 0;
        
        metrics[region.id] = {
            name: region.name,
            gdp2021: totals.gdp2021,
            gdp2022: totals.gdp2022,
            gdp2023: totals.gdp2023,
            gdp2024: totals.gdp2024,
            gdpPerCapita2023: parseFloat(gdpPerCapita2023.toFixed(2)),
            population: totals.population,
            growth2022_2023: parseFloat(growth2022_2023.toFixed(1)),
            growth2023_2024: parseFloat(growth2023_2024.toFixed(1)),
            trend: growth2022_2023 > 0 ? 'growing' : 'declining',
            recentTrend: [
                { year: 2021, gdp: totals.gdp2021 },
                { year: 2022, gdp: totals.gdp2022 },
                { year: 2023, gdp: totals.gdp2023 },
                { year: 2024, gdp: totals.gdp2024 }
            ]
        };
    });
    
    const comparisonData = Object.values(metrics)
        .map(metric => ({
            region: metric.name,
            gdp: metric.gdp2023
        }))
        .sort((a, b) => b.gdp - a.gdp);
    
    Object.values(metrics).forEach(metric => {
        metric.comparisonData = comparisonData;
    });
    
    return metrics;
}

function buildIncomeProvinceData(incomeData) {
    const provinces = [];
    const metrics = {};
    
    for (const [provinceId, incomeRecords] of Object.entries(incomeData)) {
        const info = PROVINCE_INFO[provinceId];
        if (!info) continue;
        
        let totalWeight = 0;
        let weightedIncomeSum = 0;
        
        incomeRecords.forEach(record => {
            totalWeight += record.weight;
            weightedIncomeSum += record.income * record.weight;
        });
        
        const averageIncome = totalWeight > 0 ? weightedIncomeSum / totalWeight : 0;
        
        const sortedIncomes = incomeRecords.map(r => r.income).sort((a, b) => a - b);
        const medianIncome = sortedIncomes.length > 0 ? 
            sortedIncomes[Math.floor(sortedIncomes.length / 2)] : 0;
        
        provinces.push({
            id: provinceId,
            name: info.name,
            center: info.center,
            population: PROVINCE_POPULATIONS[provinceId],
            regionId: info.regionId,
            averageIncome: parseFloat(averageIncome.toFixed(2)),
            medianIncome: parseFloat(medianIncome.toFixed(2)),
            sampleSize: incomeRecords.length
        });
        
        metrics[provinceId] = {
            name: info.name,
            averageIncome: parseFloat(averageIncome.toFixed(2)),
            medianIncome: parseFloat(medianIncome.toFixed(2)),
            sampleSize: incomeRecords.length,
            regionId: info.regionId,
            rawIncomeData: incomeRecords.map(r => r.income)
        };
    }
    
    const missingTerritories = ['yt', 'nt', 'nu'];
    missingTerritories.forEach(provinceId => {
        const info = PROVINCE_INFO[provinceId];
        if (!info) return;
        
        provinces.push({
            id: provinceId,
            name: info.name,
            center: info.center,
            population: PROVINCE_POPULATIONS[provinceId],
            regionId: info.regionId,
            averageIncome: null,
            medianIncome: null,
            sampleSize: 0
        });
        
        metrics[provinceId] = {
            name: info.name,
            averageIncome: null,
            medianIncome: null,
            sampleSize: 0,
            regionId: info.regionId,
            rawIncomeData: []
        };
    });
    
    const allProvinces = Object.keys(PROVINCE_INFO).map(id => {
        const provinceData = metrics[id];
        if (!provinceData) return null;
        
        return {
            province: provinceData.name,
            income: provinceData.averageIncome || 0
        };
    }).filter(p => p !== null).sort((a, b) => b.income - a.income);
    
    Object.keys(metrics).forEach(provinceId => {
        metrics[provinceId].comparisonData = allProvinces;
    });
    
    const regionMetrics = buildRegionIncomeMetrics(incomeData);
    
    return { provinces, metrics, regionMetrics };
}

function buildRegionIncomeMetrics(incomeData) {
    const metrics = {};
    
    REGION_DEFINITIONS.forEach(region => {
        const regionRecords = region.provinces.flatMap(provinceId => incomeData[provinceId] || []);
        
        if (!regionRecords.length) {
            metrics[region.id] = {
                name: region.name,
                averageIncome: null,
                medianIncome: null,
                sampleSize: 0,
                rawIncomeData: []
            };
            return;
        }
        
        let totalWeight = 0;
        let weightedIncomeSum = 0;
        regionRecords.forEach(record => {
            totalWeight += record.weight;
            weightedIncomeSum += record.income * record.weight;
        });
        
        const averageIncome = totalWeight > 0 ? weightedIncomeSum / totalWeight : 0;
        const sortedIncomes = regionRecords.map(r => r.income).sort((a, b) => a - b);
        const medianIncome = sortedIncomes[Math.floor(sortedIncomes.length / 2)] || 0;
        
        metrics[region.id] = {
            name: region.name,
            averageIncome: parseFloat(averageIncome.toFixed(2)),
            medianIncome: parseFloat(medianIncome.toFixed(2)),
            sampleSize: regionRecords.length,
            rawIncomeData: regionRecords.map(r => r.income)
        };
    });
    
    const comparisonData = Object.values(metrics)
        .map(metric => ({
            region: metric.name,
            income: metric.averageIncome || 0
        }))
        .sort((a, b) => (b.income || 0) - (a.income || 0));
    
    Object.values(metrics).forEach(metric => {
        metric.comparisonData = comparisonData;
    });
    
    return metrics;
}

export async function loadGDPData() {
    try {
        const response = await fetch('../data/province-level-gdp.csv');
        const csvText = await response.text();
        
        const gdpData = parseGDPCSV(csvText);
        const { provinces, metrics, regionMetrics } = buildGDPProvinceData(gdpData);
        
        CANADIAN_PROVINCES_GDP = provinces;
        PROVINCE_GDP_METRICS = metrics;
        REGION_GDP_METRICS = regionMetrics;
        
        console.log('✅ Loaded GDP data for', provinces.length, 'provinces');
        return true;
    } catch (error) {
        console.error('❌ Failed to load GDP data:', error);
        return false;
    }
}

export async function loadIncomeData() {
    try {
        const response = await fetch('../data/province-level-income.csv');
        const csvText = await response.text();
        
        const incomeData = parseIncomeCSV(csvText);
        const { provinces, metrics, regionMetrics } = buildIncomeProvinceData(incomeData);
        
        CANADIAN_PROVINCES_INCOME = provinces;
        PROVINCE_INCOME_METRICS = metrics;
        REGION_INCOME_METRICS = regionMetrics;
        
        console.log('✅ Loaded Income data for', provinces.length, 'provinces');
        return true;
    } catch (error) {
        console.error('❌ Failed to load Income data:', error);
        return false;
    }
}

export async function loadCityData() {
    try {
        const response = await fetch('../data/city-gdp-data.json');
        const data = await response.json();
        
        CITY_DATA = data.cities;
        
        console.log('✅ Loaded city data for all provinces');
        return true;
    } catch (error) {
        console.error('❌ Failed to load city data:', error);
        return false;
    }
}

export async function loadProvinceData() {
    const gdpSuccess = await loadGDPData();
    const incomeSuccess = await loadIncomeData();
    const citySuccess = await loadCityData();
    
    return gdpSuccess && incomeSuccess && citySuccess;
}

export function getCitiesForProvince(provinceId) {
    return CITY_DATA[provinceId] || [];
}

export function getCityById(provinceId, cityId) {
    const cities = getCitiesForProvince(provinceId);
    return cities.find(c => c.id === cityId) || null;
}

export function setCurrentDataType(type) {
    if (type === 'gdp' || type === 'income') {
        CURRENT_DATA_TYPE = type;
        return true;
    }
    return false;
}

export function getCurrentDataType() {
    return CURRENT_DATA_TYPE;
}

export function getProvinceMetrics(provinceId) {
    if (CURRENT_DATA_TYPE === 'income') {
        return PROVINCE_INCOME_METRICS[provinceId] || {};
    }
    return PROVINCE_GDP_METRICS[provinceId] || {};
}

export function getProvinceById(provinceId) {
    if (CURRENT_DATA_TYPE === 'income') {
        return CANADIAN_PROVINCES_INCOME.find(p => p.id === provinceId) || null;
    }
    return CANADIAN_PROVINCES_GDP.find(p => p.id === provinceId) || null;
}

export function setCurrentDataScope(scope) {
    if (scope === 'province' || scope === 'region') {
        CURRENT_DATA_SCOPE = scope;
        return true;
    }
    return false;
}

export function getCurrentDataScope() {
    return CURRENT_DATA_SCOPE;
}

export function getRegionIdForProvince(provinceId) {
    return PROVINCE_REGION_MAP[provinceId] || null;
}

export function getRegionNameForProvince(provinceId) {
    const regionId = getRegionIdForProvince(provinceId);
    if (!regionId) return null;
    const region = REGION_DEFINITIONS.find(r => r.id === regionId);
    return region ? region.name : null;
}

export function getRegionMetricsById(regionId, dataType = CURRENT_DATA_TYPE) {
    if (!regionId) return null;
    if (dataType === 'income') {
        return REGION_INCOME_METRICS[regionId] || null;
    }
    return REGION_GDP_METRICS[regionId] || null;
}

export function getRegionMetricsForProvince(provinceId, dataType = CURRENT_DATA_TYPE) {
    const regionId = getRegionIdForProvince(provinceId);
    return getRegionMetricsById(regionId, dataType);
}

export function getScopedValueForProvince(provinceId, dataType = CURRENT_DATA_TYPE) {
    if (!provinceId) return 0;
    
    if (CURRENT_DATA_SCOPE === 'region') {
        const regionMetrics = getRegionMetricsForProvince(provinceId, dataType);
        if (!regionMetrics) return 0;
        return dataType === 'income' ? (regionMetrics.averageIncome || 0) : (regionMetrics.gdp2023 || 0);
    }
    
    const provinceCollection = dataType === 'income' ? CANADIAN_PROVINCES_INCOME : CANADIAN_PROVINCES_GDP;
    const province = provinceCollection.find(p => p.id === provinceId);
    if (!province) return 0;
    
    return dataType === 'income' ? (province.averageIncome || 0) : (province.gdp2023 || 0);
}

export function getAllProvinces() {
    if (CURRENT_DATA_TYPE === 'income') {
        return CANADIAN_PROVINCES_INCOME;
    }
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

export function formatIncome(value) {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
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
    if (gdp >= 300000) return '#00d9ff';
    if (gdp >= 100000) return '#0070f3';
    if (gdp >= 50000) return '#7928ca';
    if (gdp >= 10000) return '#f81ce5';
    return '#ff0080';
}

export function getRegionalGDPColor(gdp) {
    // Regional GDP totals are much larger (sum of multiple provinces)
    if (gdp >= 1000000) return '#00d9ff';  // 1T+ (Central Canada)
    if (gdp >= 400000) return '#0070f3';   // 400B-1T (Prairies, Pacific)
    if (gdp >= 200000) return '#7928ca';   // 200B-400B (Pacific lower)
    if (gdp >= 50000) return '#f81ce5';    // 50B-200B (Atlantic)
    return '#ff0080';                       // <50B (North)
}

export function getIncomeColor(income) {
    if (income >= 60000) return '#00d9ff';
    if (income >= 50000) return '#0070f3';
    if (income >= 40000) return '#7928ca';
    if (income >= 30000) return '#f81ce5';
    return '#ff0080';
}

export function getRegionalIncomeColor(income) {
    // Regional income averages are similar to provincial but with slight differences
    if (income >= 58000) return '#00d9ff';  // Very High
    if (income >= 52000) return '#0070f3';  // High
    if (income >= 46000) return '#7928ca';  // Moderate
    if (income >= 40000) return '#f81ce5';  // Low
    return '#ff0080';                        // Very Low
}

export function getDataColor(value, scope = CURRENT_DATA_SCOPE) {
    if (CURRENT_DATA_TYPE === 'income') {
        return scope === 'region' ? getRegionalIncomeColor(value) : getIncomeColor(value);
    }
    return scope === 'region' ? getRegionalGDPColor(value) : getGDPColor(value);
}

export function getGDPStatus(gdp) {
    if (gdp >= 300000) return 'Very High';
    if (gdp >= 100000) return 'High';
    if (gdp >= 50000) return 'Moderate';
    if (gdp >= 10000) return 'Low';
    return 'Very Low';
}

export function getIncomeStatus(income) {
    if (income >= 60000) return 'Very High';
    if (income >= 50000) return 'High';
    if (income >= 40000) return 'Moderate';
    if (income >= 30000) return 'Low';
    return 'Very Low';
}

export function getDataStatus(value) {
    if (CURRENT_DATA_TYPE === 'income') {
        return getIncomeStatus(value);
    }
    return getGDPStatus(value);
}