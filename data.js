// Province-level GDP data (2021-2023)
export const CANADIAN_PROVINCES_GDP = [
    {
        id: 'ab',
        name: 'Alberta',
        center: [-115.2723, 53.9333],
        bounds: [
            [-120.0, 49.0], [-110.0, 49.0], [-110.0, 60.0], [-120.0, 60.0], [-120.0, 49.0]
        ],
        population: 4_262_635,
        gdp2021: 64910.0,
        gdp2022: 71555.5,
        gdp2023: 74431.5,
        growth2022_2023: 4.0,
        gdpPerCapita2023: 17468.0,
    },
    {
        id: 'yt',
        name: 'Yukon',
        center: [-135.0, 64.2008],
        bounds: [
            [-141.0, 60.0], [-124.5, 60.0], [-124.5, 69.65], [-141.0, 69.65], [-141.0, 60.0]
        ],
        population: 40_232,
        gdp2021: 30233.8,
        gdp2022: 32984.3,
        gdp2023: 34291.6,
        growth2022_2023: 4.0,
        gdpPerCapita2023: 852.4,
    },
    {
        id: 'pe',
        name: 'Prince Edward Island',
        center: [-63.0, 46.5],
        bounds: [
            [-64.5, 45.9], [-61.8, 45.9], [-61.8, 47.1], [-64.5, 47.1], [-64.5, 45.9]
        ],
        population: 154_331,
        gdp2021: 22503.0,
        gdp2022: 24605.5,
        gdp2023: 25911.8,
        growth2022_2023: 5.3,
        gdpPerCapita2023: 167.9,
    },
    {
        id: 'nl',
        name: 'Newfoundland & Labrador',
        center: [-56.1304, 53.1355],
        bounds: [
            [-67.0, 47.0], [-52.0, 47.0], [-52.0, 61.0], [-67.0, 61.0], [-67.0, 47.0]
        ],
        population: 510_550,
        gdp2021: 16986.1,
        gdp2022: 18226.3,
        gdp2023: 19099.8,
        growth2022_2023: 4.8,
        gdpPerCapita2023: 37.4,
    },
    {
        id: 'ns',
        name: 'Nova Scotia',
        center: [-62.6181, 45.3631],
        bounds: [
            [-66.0, 43.4], [-59.7, 43.4], [-59.7, 47.0], [-66.0, 47.0], [-66.0, 43.4]
        ],
        population: 969_383,
        gdp2021: 2310.5,
        gdp2022: 2474.4,
        gdp2023: 2567.5,
        growth2022_2023: 3.8,
        gdpPerCapita2023: 2.6,
    },
    {
        id: 'on',
        name: 'Ontario',
        center: [-85.3232, 51.3826],
        bounds: [
            [-95.0, 41.7], [-74.3, 41.7], [-74.3, 56.9], [-95.0, 56.9], [-95.0, 41.7]
        ],
        population: 14_223_942,
        gdp2021: 2034.9,
        gdp2022: 2276.1,
        gdp2023: 2352.2,
        growth2022_2023: 3.3,
        gdpPerCapita2023: 0.2,
    },
    {
        id: 'nt',
        name: 'Northwest Territories',
        center: [-117.3560, 64.8255],
        bounds: [
            [-141.0, 60.0], [-102.0, 60.0], [-102.0, 84.0], [-141.0, 84.0], [-141.0, 60.0]
        ],
        population: 41_070,
        gdp2021: 2015.0,
        gdp2022: 2083.6,
        gdp2023: 2147.3,
        growth2022_2023: 3.1,
        gdpPerCapita2023: 52.3,
    },
    {
        id: 'nb',
        name: 'New Brunswick',
        center: [-66.4619, 46.5653],
        bounds: [
            [-69.0, 44.8], [-64.0, 44.8], [-64.0, 48.0], [-69.0, 48.0], [-69.0, 44.8]
        ],
        population: 775_610,
        gdp2021: 1266.4,
        gdp2022: 1365.9,
        gdp2023: 1405.1,
        growth2022_2023: 2.9,
        gdpPerCapita2023: 1.8,
    },
    {
        id: 'qc',
        name: 'Quebec',
        center: [-73.5673, 52.9399],
        bounds: [
            [-79.0, 45.0], [-57.0, 45.0], [-57.0, 62.5], [-79.0, 62.5], [-79.0, 45.0]
        ],
        population: 8_501_833,
        gdp2021: 1114.7,
        gdp2022: 1122.1,
        gdp2023: 1134.6,
        growth2022_2023: 1.1,
        gdpPerCapita2023: 0.1,
    },
    {
        id: 'bc',
        name: 'British Columbia',
        center: [-122.3045, 53.7267],
        bounds: [
            [-139.0, 49.0], [-114.0, 49.0], [-114.0, 60.0], [-139.0, 60.0], [-139.0, 49.0]
        ],
        population: 5_000_879,
        gdp2021: 242.7,
        gdp2022: 263.7,
        gdp2023: 275.6,
        growth2022_2023: 4.5,
        gdpPerCapita2023: 0.1,
    },
    {
        id: 'nu',
        name: 'Nunavut',
        center: [-94.8369, 70.2998],
        bounds: [
            [-141.0, 60.0], [-59.75, 60.0], [-59.75, 83.1], [-141.0, 83.1], [-141.0, 60.0]
        ],
        population: 36_858,
        gdp2021: 93.2,
        gdp2022: 100.7,
        gdp2023: 103.7,
        growth2022_2023: 3.0,
        gdpPerCapita2023: 2.8,
    },
    {
        id: 'mb',
        name: 'Manitoba',
        center: [-98.8139, 56.1304],
        bounds: [
            [-102.0, 49.0], [-95.0, 49.0], [-95.0, 60.0], [-102.0, 60.0], [-102.0, 49.0]
        ],
        population: 1_342_153,
        gdp2021: 105.8,
        gdp2022: 87.5,
        gdp2023: 92.1,
        growth2022_2023: 5.3,
        gdpPerCapita2023: 0.1,
    },
    {
        id: 'sk',
        name: 'Saskatchewan',
        center: [-106.3468, 56.1304],
        bounds: [
            [-110.45, 49.0], [-102.0, 49.0], [-102.0, 60.0], [-110.45, 60.0], [-110.45, 49.0]
        ],
        population: 1_132_505,
        gdp2021: 40.3,
        gdp2022: 38.7,
        gdp2023: 41.5,
        growth2022_2023: 7.2, // Calculated from the data
        gdpPerCapita2023: 0.0,
    },
];

// GDP metrics for charts
export const PROVINCE_GDP_METRICS = {
    'ab': {
        name: 'Alberta',
        gdp2023: 74431.5,
        gdp2022: 71555.5,
        gdp2021: 64910.0,
        growth2022_2023: 4.0,
        gdpPerCapita2023: 17468.0,
        trend: 'growing',
        recentTrend: [
            { year: 2021, gdp: 64910.0 },
            { year: 2022, gdp: 71555.5 },
            { year: 2023, gdp: 74431.5 }
        ],
        comparisonData: [
            { province: 'Alberta', gdp: 74431.5 },
            { province: 'Yukon', gdp: 34291.6 },
            { province: 'Prince Edward Island', gdp: 25911.8 },
            { province: 'Newfoundland & Labrador', gdp: 19099.8 },
            { province: 'Nova Scotia', gdp: 2567.5 },
            { province: 'Ontario', gdp: 2352.2 }
        ]
    },
    'yt': {
        name: 'Yukon',
        gdp2023: 34291.6,
        gdp2022: 32984.3,
        gdp2021: 30233.8,
        growth2022_2023: 4.0,
        gdpPerCapita2023: 852.4,
        trend: 'growing',
        recentTrend: [
            { year: 2021, gdp: 30233.8 },
            { year: 2022, gdp: 32984.3 },
            { year: 2023, gdp: 34291.6 }
        ],
        comparisonData: [
            { province: 'Alberta', gdp: 74431.5 },
            { province: 'Yukon', gdp: 34291.6 },
            { province: 'Prince Edward Island', gdp: 25911.8 },
            { province: 'Newfoundland & Labrador', gdp: 19099.8 },
            { province: 'Nova Scotia', gdp: 2567.5 },
            { province: 'Ontario', gdp: 2352.2 }
        ]
    },
    'pe': {
        name: 'Prince Edward Island',
        gdp2023: 25911.8,
        gdp2022: 24605.5,
        gdp2021: 22503.0,
        growth2022_2023: 5.3,
        gdpPerCapita2023: 167.9,
        trend: 'growing',
        recentTrend: [
            { year: 2021, gdp: 22503.0 },
            { year: 2022, gdp: 24605.5 },
            { year: 2023, gdp: 25911.8 }
        ],
        comparisonData: [
            { province: 'Alberta', gdp: 74431.5 },
            { province: 'Yukon', gdp: 34291.6 },
            { province: 'Prince Edward Island', gdp: 25911.8 },
            { province: 'Newfoundland & Labrador', gdp: 19099.8 },
            { province: 'Nova Scotia', gdp: 2567.5 },
            { province: 'Ontario', gdp: 2352.2 }
        ]
    },
    'nl': {
        name: 'Newfoundland & Labrador',
        gdp2023: 19099.8,
        gdp2022: 18226.3,
        gdp2021: 16986.1,
        growth2022_2023: 4.8,
        gdpPerCapita2023: 37.4,
        trend: 'growing',
        recentTrend: [
            { year: 2021, gdp: 16986.1 },
            { year: 2022, gdp: 18226.3 },
            { year: 2023, gdp: 19099.8 }
        ],
        comparisonData: [
            { province: 'Alberta', gdp: 74431.5 },
            { province: 'Yukon', gdp: 34291.6 },
            { province: 'Prince Edward Island', gdp: 25911.8 },
            { province: 'Newfoundland & Labrador', gdp: 19099.8 },
            { province: 'Nova Scotia', gdp: 2567.5 },
            { province: 'Ontario', gdp: 2352.2 }
        ]
    }
};

export function getProvinceMetrics(provinceId) {
    const province = CANADIAN_PROVINCES_GDP.find(p => p.id === provinceId);
    if (!province) return {};
    
    return PROVINCE_GDP_METRICS[provinceId] || {};
}

export function getProvinceById(provinceId) {
    return CANADIAN_PROVINCES_GDP.find(p => p.id === provinceId) || null;
}

export function getAllProvinces() {
    return CANADIAN_PROVINCES_GDP;
}

export function formatCurrency(value) {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value) {
    return new Intl.NumberFormat('en-CA').format(value);
}

export function getGDPColor(gdp) {
    // Color scale based on GDP contribution
    if (gdp >= 50000) return '#22c55e';      // Green - Very High GDP
    if (gdp >= 20000) return '#84cc16';      // Light Green - High GDP  
    if (gdp >= 10000) return '#eab308';      // Yellow - Moderate GDP
    if (gdp >= 1000) return '#f97316';      // Orange - Low GDP
    return '#ef4444';                        // Red - Very Low GDP
}

export function getGDPStatus(gdp) {
    if (gdp >= 50000) return 'Very High';
    if (gdp >= 20000) return 'High';
    if (gdp >= 10000) return 'Moderate';
    if (gdp >= 1000) return 'Low';
    return 'Very Low';
}
