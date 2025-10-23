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

export let CANADIAN_PROVINCES_GDP = [];
export let CANADIAN_PROVINCES_INCOME = [];
export let PROVINCE_GDP_METRICS = {};
export let PROVINCE_INCOME_METRICS = {};

export let CURRENT_DATA_TYPE = 'gdp';

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
            averageIncome: parseFloat(averageIncome.toFixed(2)),
            medianIncome: parseFloat(medianIncome.toFixed(2)),
            sampleSize: incomeRecords.length
        });
        
        metrics[provinceId] = {
            name: info.name,
            averageIncome: parseFloat(averageIncome.toFixed(2)),
            medianIncome: parseFloat(medianIncome.toFixed(2)),
            sampleSize: incomeRecords.length,
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
            averageIncome: null,
            medianIncome: null,
            sampleSize: 0
        });
        
        metrics[provinceId] = {
            name: info.name,
            averageIncome: null,
            medianIncome: null,
            sampleSize: 0,
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
    
    return { provinces, metrics };
}

export async function loadGDPData() {
    try {
        const response = await fetch('../data/province-level-gdp.csv');
        const csvText = await response.text();
        
        const gdpData = parseGDPCSV(csvText);
        const { provinces, metrics } = buildGDPProvinceData(gdpData);
        
        CANADIAN_PROVINCES_GDP = provinces;
        PROVINCE_GDP_METRICS = metrics;
        
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
        const { provinces, metrics } = buildIncomeProvinceData(incomeData);
        
        CANADIAN_PROVINCES_INCOME = provinces;
        PROVINCE_INCOME_METRICS = metrics;
        
        console.log('✅ Loaded Income data for', provinces.length, 'provinces');
        return true;
    } catch (error) {
        console.error('❌ Failed to load Income data:', error);
        return false;
    }
}

export async function loadProvinceData() {
    const gdpSuccess = await loadGDPData();
    const incomeSuccess = await loadIncomeData();
    
    return gdpSuccess && incomeSuccess;
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

export function getIncomeColor(income) {
    if (income >= 60000) return '#00d9ff';
    if (income >= 50000) return '#0070f3';
    if (income >= 40000) return '#7928ca';
    if (income >= 30000) return '#f81ce5';
    return '#ff0080';
}

export function getDataColor(value) {
    if (CURRENT_DATA_TYPE === 'income') {
        return getIncomeColor(value);
    }
    return getGDPColor(value);
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