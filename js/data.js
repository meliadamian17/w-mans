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

// Helper: map provinceId ('on') -> numeric province code string ('35')
const PROVINCE_ID_TO_CODE = Object.entries(PROVINCE_CODE_MAP).reduce((acc, [code, id]) => {
    acc[id] = String(code);
    return acc;
}, {});

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

// Sub-provincial GDP structures (from regional-gdp-data.csv, CMA + non-CMA)
export let SUBPROVINCIAL_GDP_BY_PROVINCE = {};
// Census Division GDP and geometry (for sub-provincial heatmap)
export let CD_GDP_BY_UID = {};
export let CD_FEATURES = [];

export let CURRENT_DATA_TYPE = 'gdp';
export let CURRENT_DATA_SCOPE = 'province';

// ---------- Helpers for parsing ----------

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

function normalizeProvinceName(rawName) {
    if (!rawName) return null;
    // Remove quotes, footnote digits, and trim whitespace
    return rawName
        .replace(/"/g, '')
        .replace(/\d+$/g, '')
        .trim();
}

function getProvinceNameFromGeography(geoRaw) {
    if (!geoRaw) return null;
    const geo = geoRaw.replace(/"/g, '').trim();

    // Exact match to a province row
    if (PROVINCE_NAME_MAP[geo]) {
        return geo;
    }

    // Non-CMA rows: "Non-census metropolitan areas, Ontario"
    if (geo.startsWith('Non-census metropolitan areas,')) {
        const parts = geo.split(',');
        if (parts.length >= 2) {
            return normalizeProvinceName(parts[1]);
        }
    }

    // Shared CMA parts: "Ottawa – Gatineau, Ontario part, Ontario/Quebec"
    if (geo.includes('Ontario part')) {
        return 'Ontario';
    }
    if (geo.includes('Quebec part')) {
        return 'Quebec';
    }

    // Generic CMA rows: "Saguenay, Quebec"
    const parts = geo.split(',');
    if (parts.length >= 2) {
        const provincePart = normalizeProvinceName(parts[parts.length - 1]);
        if (PROVINCE_NAME_MAP[provincePart]) {
            return provincePart;
        }
    }

    return null;
}

function buildRegionId(baseName, provinceId) {
    const safeBase = (baseName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${provinceId}-${safeBase}`;
}

function buildRegionName(geoRaw, provinceName) {
    const geo = geoRaw.replace(/"/g, '').trim();

    if (geo.startsWith('Non-census metropolitan areas,')) {
        return `${provinceName} (Non-CMA)`;
    }

    if (geo.includes('Ontario part')) {
        const cityPart = geo.split(',')[0].trim();
        return `${cityPart} (ON part)`;
    }
    if (geo.includes('Quebec part')) {
        const cityPart = geo.split(',')[0].trim();
        return `${cityPart} (QC part)`;
    }

    // CMA: keep the city part
    const cityPart = geo.split(',')[0].trim();
    return cityPart || geo;
}

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

function parseRegionalGDPCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    // Find the header row that starts the data section
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('"Geography"')) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) {
        console.warn('⚠️ Could not find Geography header in regional GDP CSV');
        return {};
    }

    const subprovincialByProvince = {};

    // Skip header row and units row
    for (let i = headerIndex + 2; i < lines.length; i++) {
        const rawLine = lines[i];
        if (!rawLine || !rawLine.trim()) continue;
        if (rawLine.startsWith('Symbol legend:')) break;

        const cols = parseCSVLine(rawLine);
        if (!cols.length) continue;

        const geographyRaw = cols[0];
        const provinceName = getProvinceNameFromGeography(geographyRaw);
        if (!provinceName) {
            continue;
        }

        const provinceId = PROVINCE_NAME_MAP[provinceName];
        if (!provinceId) continue;

        const geoClean = geographyRaw.replace(/"/g, '').trim();

        // Skip pure provincial total rows – we only want CMA / non-CMA records
        if (geoClean === provinceName) continue;

        const isNonCMA = geoClean.startsWith('Non-census metropolitan areas,');
        const isSharedPart = geoClean.includes('Ontario part') || geoClean.includes('Quebec part');

        const regionType = isNonCMA
            ? 'non_cma'
            : (isSharedPart ? 'cma_shared_part' : 'cma');

        // Columns 1-5 correspond to 2017-2021
        const years = ['2017', '2018', '2019', '2020', '2021'];
        const gdpByYear = {};

        for (let j = 0; j < years.length; j++) {
            const colIdx = j + 1;
            const rawValue = cols[colIdx] !== undefined ? cols[colIdx].replace(/"/g, '').trim() : '';
            if (!rawValue || rawValue === '..') {
                gdpByYear[years[j]] = null;
                continue;
            }
            const numeric = parseFloat(rawValue.replace(/,/g, ''));
            gdpByYear[years[j]] = isNaN(numeric) ? null : numeric;
        }

        const regionName = buildRegionName(geographyRaw, provinceName);
        const regionId = buildRegionId(regionName, provinceId);

        if (!subprovincialByProvince[provinceId]) {
            subprovincialByProvince[provinceId] = [];
        }

        subprovincialByProvince[provinceId].push({
            id: regionId,
            name: regionName,
            provinceId,
            provinceName,
            type: regionType,
            gdpByYear,
        });
    }

    return subprovincialByProvince;
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

// Parse CD-level GDP CSV generated by test.py
// Expected columns: cd_uid, gdp_2021_millions
function parseCDGDPCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (!lines.length) return {};

    // Parse header line using proper CSV parsing
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.replace(/"/g, '').trim());
    const uidIdx = headers.indexOf('cd_uid');
    const gdpIdx = headers.indexOf('gdp_2021_millions');

    if (uidIdx === -1 || gdpIdx === -1) {
        console.warn('⚠️ CD GDP CSV missing expected headers cd_uid / gdp_2021_millions');
        console.warn('   Available headers:', headers);
        return {};
    }

    const map = {};

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || !line.trim()) continue;
        
        // Use proper CSV parsing to handle quoted fields
        const cols = parseCSVLine(line);
        if (cols.length <= Math.max(uidIdx, gdpIdx)) {
            continue;
        }
        
        const uidRaw = cols[uidIdx] !== undefined ? cols[uidIdx].replace(/"/g, '').trim() : '';
        const gdpRaw = cols[gdpIdx] !== undefined ? cols[gdpIdx].replace(/"/g, '').trim() : '';
        if (!uidRaw || !gdpRaw) continue;

        const gdp = parseFloat(gdpRaw);
        if (isNaN(gdp)) continue;

        map[uidRaw] = gdp;
    }

    console.log(`✅ Parsed ${Object.keys(map).length} CD GDP entries`);
    return map;
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
        const response = await fetch('./data/province-level-gdp.csv');
        const csvText = await response.text();
        
        const gdpData = parseGDPCSV(csvText);
        const { provinces, metrics, regionMetrics } = buildGDPProvinceData(gdpData);

        // Load sub-provincial GDP data (CMA + non-CMA by province)
        try {
            const regionalResponse = await fetch('./data/regional-gdp-data.csv');
            const regionalCsvText = await regionalResponse.text();
            SUBPROVINCIAL_GDP_BY_PROVINCE = parseRegionalGDPCSV(regionalCsvText);
            console.log('✅ Loaded sub-provincial GDP data for provinces');
        } catch (subError) {
            console.warn('⚠️ Failed to load sub-provincial GDP data:', subError);
            SUBPROVINCIAL_GDP_BY_PROVINCE = {};
        }
        
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
        const response = await fetch('./data/province-level-income.csv');
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
        const response = await fetch('./data/city-gdp-data.json');
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

    // Load census-division-level GDP allocation for sub-provincial heatmap
    try {
        const resp = await fetch('./data/census_division_gdp_2021.csv');
        const csvText = await resp.text();
        CD_GDP_BY_UID = parseCDGDPCSV(csvText);
        console.log('✅ Loaded CD GDP rows:', Object.keys(CD_GDP_BY_UID).length);
    } catch (e) {
        console.warn('⚠️ Failed to load CD GDP CSV:', e);
        CD_GDP_BY_UID = {};
    }

    // Load census division geometries (canada_census_divisions.geojson)
    try {
        const geoResp = await fetch('./canada_census_divisions.geojson');
        if (!geoResp.ok) {
            throw new Error(`HTTP ${geoResp.status}: ${geoResp.statusText}`);
        }
        const geo = await geoResp.json();
        CD_FEATURES = Array.isArray(geo.features) ? geo.features : [];
        console.log('✅ Loaded CD boundary features:', CD_FEATURES.length);
        if (CD_FEATURES.length > 0) {
            const sample = CD_FEATURES[0];
            console.log('   Sample CD feature properties:', Object.keys(sample.properties || {}));
            console.log('   Sample cd_code:', sample.properties?.cd_code);
            console.log('   Sample prov_code:', sample.properties?.prov_code);
        }
    } catch (e) {
        console.error('❌ Failed to load CD boundary features:', e);
        CD_FEATURES = [];
    }
    
    return gdpSuccess && incomeSuccess && citySuccess;
}

export function getCitiesForProvince(provinceId) {
    return CITY_DATA[provinceId] || [];
}

// Helper function to calculate approximate area of a GeoJSON geometry
function calculateGeometryArea(geometry) {
    if (!geometry || !geometry.coordinates) return 0;
    
    // Simple bounding box area calculation (approximation)
    // For more accuracy, could use proper polygon area calculation
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    function processCoordinates(coords) {
        if (Array.isArray(coords[0])) {
            coords.forEach(c => processCoordinates(c));
        } else if (coords.length >= 2) {
            const [lng, lat] = coords;
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
        }
    }
    
    if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach(ring => processCoordinates(ring));
    } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(polygon => {
            polygon.forEach(ring => processCoordinates(ring));
        });
    }
    
    // Approximate area using bounding box (in square degrees, roughly)
    const width = maxLng - minLng;
    const height = maxLat - minLat;
    // Weight by latitude (cosine correction for better approximation)
    const latCenter = (minLat + maxLat) / 2;
    const area = width * height * Math.cos(latCenter * Math.PI / 180);
    return Math.max(area, 0.0001); // Minimum area to avoid division by zero
}

export function getSubprovincialGDPPatchesForProvince(provinceId) {
    const provCode = PROVINCE_ID_TO_CODE[provinceId];
    if (!provCode) {
        console.warn(`⚠️ No province code found for ${provinceId}`);
        return [];
    }

    if (!CD_FEATURES || CD_FEATURES.length === 0) {
        console.warn('⚠️ CD_FEATURES not loaded yet');
        return [];
    }

    // Get province GDP for recalculation
    const province = CANADIAN_PROVINCES_GDP.find(p => p.id === provinceId);
    const provinceGDP2021 = province?.gdp2021 || 0; // Use 2021 GDP in billions
    const provinceGDP2021Millions = provinceGDP2021 * 1000; // Convert to millions

    // canada_census_divisions.geojson properties (from OpenDataSoft):
    //  - cd_code: census division ID (string/number, e.g. '5919')
    //  - prov_code: province/territory code (string/number, e.g. '59' for BC)
    const CD_UID_PROP = 'cd_code';
    const CD_PROV_CODE_PROP = 'prov_code';

    console.log(`🔍 Looking for CDs in province ${provinceId} (code: ${provCode})`);
    console.log(`   Province GDP 2021: $${provinceGDP2021}B (${provinceGDP2021Millions}M)`);
    console.log(`   Total CD features: ${CD_FEATURES.length}`);

    // Filter by province code
    const provinceCDs = CD_FEATURES.filter(f => {
        if (!f.properties) return false;
        const featureProvCode = String(f.properties[CD_PROV_CODE_PROP] || '').trim();
        return featureProvCode === provCode;
    });
    console.log(`   CDs matching province code ${provCode}: ${provinceCDs.length}`);
    
    // Extended GDP heatmap color palette with more granular breaks for better visual distinction
    // Uses 8 colors for more variation within provinces
    const heatmapColors = [
        '#00d9ff', // Very High (top 12.5%)
        '#00a8ff', // High-High (12.5-25%)
        '#0070f3', // High (25-37.5%)
        '#0060d9', // Medium-High (37.5-50%)
        '#7928ca', // Medium (50-62.5%)
        '#a020d0', // Medium-Low (62.5-75%)
        '#f81ce5', // Low (75-87.5%)
        '#ff0080'  // Very Low (87.5-100%)
    ];

    function getCDGDPColorByPercentile(percentile) {
        if (percentile < 12.5) return heatmapColors[0];   // Top 12.5%
        if (percentile < 25) return heatmapColors[1];     // 12.5-25%
        if (percentile < 37.5) return heatmapColors[2];   // 25-37.5%
        if (percentile < 50) return heatmapColors[3];     // 37.5-50%
        if (percentile < 62.5) return heatmapColors[4];   // 50-62.5%
        if (percentile < 75) return heatmapColors[5];     // 62.5-75%
        if (percentile < 87.5) return heatmapColors[6];   // 75-87.5%
        return heatmapColors[7];                          // Bottom 12.5%
    }
    
    // Helper function to get GDP color based on relative rank within province
    // This ensures visual distinction even when all divisions have similar values
    function getCDGDPColorByRank(rank, total) {
        const percentile = total > 0 ? (rank / total) * 100 : 100;
        return getCDGDPColorByPercentile(percentile);
    }
    
    // Helper to convert cumulative GDP share (0-1) into legend colors
    function getCDGDPColorByContributionFraction(fraction) {
        const clampedFraction = Math.min(Math.max(fraction, 0), 0.999999);
        return getCDGDPColorByPercentile(clampedFraction * 100);
    }

    // Helper function to get GDP color based on absolute value (in millions)
    // Used as fallback or for divisions with distinct values
    function getCDGDPColorByValue(gdpMillions) {
        if (gdpMillions >= 5000) return heatmapColors[0];   // >= $5B (Very High)
        if (gdpMillions >= 2000) return heatmapColors[2];   // >= $2B (High)
        if (gdpMillions >= 500) return heatmapColors[4];    // >= $500M (Medium)
        if (gdpMillions >= 100) return heatmapColors[6];    // >= $100M (Low)
        return heatmapColors[7];                            // < $100M (Very Low)
    }

    // Build metadata for each CD, including any pre-computed GDP allocation
    const cdEntries = provinceCDs.map((feature, index) => {
        const uidRaw = feature.properties[CD_UID_PROP];
        const uid = uidRaw !== null && uidRaw !== undefined ? String(uidRaw).trim() : '';
        const area = calculateGeometryArea(feature.geometry);
        const csvGDP = uid && CD_GDP_BY_UID ? CD_GDP_BY_UID[uid] : null;
        const numericGDP = typeof csvGDP === 'number' && isFinite(csvGDP) ? csvGDP : null;
        
        return {
            uid,
            area,
            feature,
            index,
            csvGDP: numericGDP,
        };
    });
    
    const csvGDPRecords = cdEntries.filter(entry => entry.csvGDP !== null && entry.csvGDP !== undefined);
    const totalCSVGDP = csvGDPRecords.reduce((sum, entry) => sum + (entry.csvGDP || 0), 0);
    
    if (csvGDPRecords.length > 0 && totalCSVGDP > 0) {
        console.log(`   Using ${csvGDPRecords.length}/${cdEntries.length} CD GDP rows from CSV (total ${totalCSVGDP.toFixed(2)}M)`);
        
        const sortedByGDP = [...csvGDPRecords].sort((a, b) => b.csvGDP - a.csvGDP);
        const contributionAssignments = new Map();
        let cumulativeShare = 0;
        
        sortedByGDP.forEach(record => {
            const share = record.csvGDP / totalCSVGDP;
            const color = getCDGDPColorByContributionFraction(cumulativeShare);
            contributionAssignments.set(record.uid, {
                gdp: record.csvGDP,
                sharePercent: share * 100,
                color,
            });
            cumulativeShare += share;
        });
        
        const patches = cdEntries.map(entry => {
            const assignment = contributionAssignments.get(entry.uid);
            if (assignment) {
                console.log(`   ✓ CD ${entry.uid}: ${assignment.gdp.toFixed(2)}M (${assignment.sharePercent.toFixed(2)}% share), color ${assignment.color}`);
            } else {
                console.log(`   ✗ CD ${entry.uid}: No CSV GDP data, defaulting to lowest tier color`);
            }
            
            return {
                ...entry.feature,
                properties: {
                    ...entry.feature.properties,
                    gdp: assignment ? assignment.gdp : 0,
                    gdpSharePercent: assignment ? assignment.sharePercent : null,
                    hasGDPData: Boolean(assignment),
                    color: assignment ? assignment.color : heatmapColors[heatmapColors.length - 1],
                },
            };
        });
        
        const withGDP = contributionAssignments.size;
        const withoutGDP = patches.length - withGDP;
        console.log(`📍 Applied GDP contribution colors for ${withGDP} CDs (${withoutGDP} without data)`);
        return patches;
    }
    
    // Fallback: allocate GDP based on area when CSV data is unavailable
    const totalArea = cdEntries.reduce((sum, cd) => sum + cd.area, 0);
    const cdGDPAllocated = new Map();
    
    cdEntries.forEach(({ uid, area }) => {
        const areaShare = totalArea > 0 ? area / totalArea : 1 / cdEntries.length;
        let allocatedGDP = provinceGDP2021Millions * areaShare;
        
        let hash = 0;
        if (uid) {
            for (let i = 0; i < uid.length; i++) {
                hash = ((hash << 5) - hash) + uid.charCodeAt(i);
                hash = hash & hash;
            }
        }
        const variation = 0.85 + (Math.abs(hash) % 30) / 100; // 0.85 to 1.15
        allocatedGDP *= variation;
        cdGDPAllocated.set(uid, allocatedGDP);
    });
    
    console.log(`   CSV GDP missing. Falling back to area allocation across ${cdEntries.length} divisions`);

    const patchesData = cdEntries.map(({ uid, area, feature, index }) => {
        const gdp = cdGDPAllocated.get(uid) || 0;
        return {
            gdp,
            hasGDPData: true,
            uid,
            feature,
            index,
            area,
        };
    });
    
    const gdpData = patchesData.map(p => ({
        index: p.index,
        gdp: p.gdp,
        hasGDPData: p.hasGDPData,
        uid: p.uid,
        feature: p.feature,
    }));

    const divisionsWithGDP = gdpData.filter(d => d.hasGDPData && d.gdp !== null);
    const sortedDivisions = [...divisionsWithGDP].sort((a, b) => {
        if (Math.abs(b.gdp - a.gdp) > 0.001) return b.gdp - a.gdp;
        return (a.uid || '').localeCompare(b.uid || '');
    });
    
    const gdpToRank = new Map();
    sortedDivisions.forEach((div, rank) => {
        gdpToRank.set(div.uid, rank);
    });

    const totalWithGDP = divisionsWithGDP.length;
    const isIncome = getCurrentDataType() === 'income';

    const patches = patchesData.map((data) => {
        let color;
        
        if (!isIncome && data.hasGDPData && data.gdp !== null && gdpToRank.has(data.uid)) {
            const rank = gdpToRank.get(data.uid);
            color = getCDGDPColorByRank(rank, totalWithGDP);
            console.log(`   ✓ CD ${data.uid}: GDP ${data.gdp}M, rank ${rank + 1}/${totalWithGDP}, color: ${color}`);
        } else {
            if (data.uid) {
                let hash = 0;
                for (let i = 0; i < data.uid.length; i++) {
                    hash = ((hash << 5) - hash) + data.uid.charCodeAt(i);
                    hash = hash & hash;
                }
                const colorIndex = Math.abs(hash) % heatmapColors.length;
                color = heatmapColors[colorIndex];
            } else {
                color = heatmapColors[data.index % heatmapColors.length];
            }
            if (data.uid) {
                console.log(`   ✗ CD ${data.uid}: No GDP data found, using hash-based color ${color}`);
            }
        }

        return {
            ...data.feature,
            properties: {
                ...data.feature.properties,
                gdp: data.gdp !== null ? data.gdp : 0,
                hasGDPData: data.hasGDPData,
                color: color,
            },
        };
    });

    console.log(`📍 Found ${patches.length} CD patches for province ${provinceId} (code ${provCode})`);
    const withGDP = patches.filter(p => p.properties.gdp > 0).length;
    const withoutGDP = patches.length - withGDP;
    console.log(`   ${withGDP} with GDP data, ${withoutGDP} without GDP data (using random colors)`);
    
    return patches;
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