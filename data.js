export const CANADIAN_CITIES = [
    {
        id: 'toronto',
        name: 'Toronto',
        province: 'Ontario',
        lat: 43.6629,
        lng: -79.3957,
        cma: 'Toronto CMA',
        hasStreetView: true,
        mapillaryId: null,
    },
    {
        id: 'vancouver',
        name: 'Vancouver',
        province: 'British Columbia',
        lat: 49.2827,
        lng: -123.1207,
        cma: 'Vancouver CMA',
        hasStreetView: true,
    },
    {
        id: 'montreal',
        name: 'Montréal',
        province: 'Quebec',
        lat: 45.5017,
        lng: -73.5673,
        cma: 'Montréal CMA',
        hasStreetView: true,
    },
    {
        id: 'calgary',
        name: 'Calgary',
        province: 'Alberta',
        lat: 51.0504,
        lng: -114.0853,
        cma: 'Calgary CMA',
        hasStreetView: true,
    },
    {
        id: 'edmonton',
        name: 'Edmonton',
        province: 'Alberta',
        lat: 53.5461,
        lng: -113.4938,
        cma: 'Edmonton CMA',
        hasStreetView: true,
    },
    {
        id: 'ottawa',
        name: 'Ottawa–Gatineau',
        province: 'Ontario',
        lat: 45.4215,
        lng: -75.6972,
        cma: 'Ottawa–Gatineau CMA',
        hasStreetView: true,
    },
    {
        id: 'winnipeg',
        name: 'Winnipeg',
        province: 'Manitoba',
        lat: 49.8951,
        lng: -97.1384,
        cma: 'Winnipeg CMA',
        hasStreetView: true,
    },
    {
        id: 'quebec',
        name: 'Québec',
        province: 'Quebec',
        lat: 46.8139,
        lng: -71.2080,
        cma: 'Québec CMA',
        hasStreetView: false,
    },
    {
        id: 'hamilton',
        name: 'Hamilton',
        province: 'Ontario',
        lat: 43.2557,
        lng: -79.8711,
        cma: 'Toronto CMA',
        hasStreetView: false,
    },
    {
        id: 'kitchener',
        name: 'Kitchener–Waterloo',
        province: 'Ontario',
        lat: 43.4516,
        lng: -80.4925,
        cma: 'Kitchener–Waterloo CMA',
        hasStreetView: false,
    },
];

export const CANADIAN_PROVINCES = [
    { id: 'ab', name: 'Alberta', center: [-115.2723, 53.9333], bounds: [[-120.0, 49.0], [-110.0, 60.0]] },
    { id: 'bc', name: 'British Columbia', center: [-122.3045, 53.7267], bounds: [[-139.0, 49.0], [-114.0, 60.0]] },
    { id: 'mb', name: 'Manitoba', center: [-98.8139, 56.1304], bounds: [[-102.0, 49.0], [-95.0, 60.0]] },
    { id: 'nb', name: 'New Brunswick', center: [-66.4619, 46.5653], bounds: [[-69.0, 44.8], [-64.0, 48.0]] },
    { id: 'nl', name: 'Newfoundland & Labrador', center: [-56.1304, 53.1355], bounds: [[-67.0, 47.0], [-52.0, 61.0]] },
    { id: 'ns', name: 'Nova Scotia', center: [-62.6181, 45.3631], bounds: [[-66.0, 43.4], [-59.7, 47.0]] },
    { id: 'nt', name: 'Northwest Territories', center: [-117.3560, 64.8255], bounds: [[-141.0, 60.0], [-102.0, 84.0]] },
    { id: 'nu', name: 'Nunavut', center: [-94.8369, 70.2998], bounds: [[-141.0, 60.0], [-59.75, 83.1]] },
    { id: 'on', name: 'Ontario', center: [-85.3232, 51.3826], bounds: [[-95.0, 41.7], [-74.3, 56.9]] },
    { id: 'pe', name: 'Prince Edward Island', center: [-63.0, 46.5], bounds: [[-64.5, 45.9], [-61.8, 47.1]] },
    { id: 'qc', name: 'Quebec', center: [-73.5673, 52.9399], bounds: [[-79.0, 45.0], [-57.0, 62.5]] },
    { id: 'sk', name: 'Saskatchewan', center: [-106.3468, 56.1304], bounds: [[-110.45, 49.0], [-102.0, 60.0]] },
    { id: 'yt', name: 'Yukon', center: [-135.0, 64.2008], bounds: [[-141.0, 60.0], [-124.5, 69.65]] },
];

export const CITY_METRICS = {
    'toronto': {
        name: 'Toronto',
        cma: 'Toronto CMA',
        population: 6_429_000,
        medianIncome: 68_500,
        unemploymentRate: 5.2,
        avgAge: 38.9,
        laborForceParticipation: 63.8,
        incomeDistribution: [
            { range: 'Under $30k', percentage: 12 },
            { range: '$30k–$50k', percentage: 18 },
            { range: '$50k–$75k', percentage: 22 },
            { range: '$75k–$100k', percentage: 20 },
            { range: '$100k+', percentage: 28 },
        ],
        ageDistribution: [
            { range: '0–14', percentage: 15 },
            { range: '15–24', percentage: 13 },
            { range: '25–44', percentage: 28 },
            { range: '45–64', percentage: 28 },
            { range: '65+', percentage: 16 },
        ],
        employmentBySector: [
            { sector: 'Services', percentage: 80 },
            { sector: 'Manufacturing', percentage: 10 },
            { sector: 'Construction', percentage: 7 },
            { sector: 'Other', percentage: 3 },
        ],
    },
    'vancouver': {
        name: 'Vancouver',
        cma: 'Vancouver CMA',
        population: 2_642_000,
        medianIncome: 72_800,
        unemploymentRate: 4.8,
        avgAge: 38.2,
        laborForceParticipation: 65.1,
        incomeDistribution: [
            { range: 'Under $30k', percentage: 10 },
            { range: '$30k–$50k', percentage: 16 },
            { range: '$50k–$75k', percentage: 20 },
            { range: '$75k–$100k', percentage: 22 },
            { range: '$100k+', percentage: 32 },
        ],
        ageDistribution: [
            { range: '0–14', percentage: 14 },
            { range: '15–24', percentage: 12 },
            { range: '25–44', percentage: 30 },
            { range: '45–64', percentage: 27 },
            { range: '65+', percentage: 17 },
        ],
        employmentBySector: [
            { sector: 'Services', percentage: 82 },
            { sector: 'Manufacturing', percentage: 8 },
            { sector: 'Construction', percentage: 7 },
            { sector: 'Other', percentage: 3 },
        ],
    },
    'montreal': {
        name: 'Montréal',
        cma: 'Montréal CMA',
        population: 4_291_000,
        medianIncome: 62_200,
        unemploymentRate: 5.9,
        avgAge: 39.1,
        laborForceParticipation: 61.2,
        incomeDistribution: [
            { range: 'Under $30k', percentage: 15 },
            { range: '$30k–$50k', percentage: 21 },
            { range: '$50k–$75k', percentage: 23 },
            { range: '$75k–$100k', percentage: 19 },
            { range: '$100k+', percentage: 22 },
        ],
        ageDistribution: [
            { range: '0–14', percentage: 15 },
            { range: '15–24', percentage: 14 },
            { range: '25–44', percentage: 27 },
            { range: '45–64', percentage: 27 },
            { range: '65+', percentage: 17 },
        ],
        employmentBySector: [
            { sector: 'Services', percentage: 81 },
            { sector: 'Manufacturing', percentage: 10 },
            { sector: 'Construction', percentage: 6 },
            { sector: 'Other', percentage: 3 },
        ],
    },
    'calgary': {
        name: 'Calgary',
        cma: 'Calgary CMA',
        population: 1_616_000,
        medianIncome: 75_300,
        unemploymentRate: 4.2,
        avgAge: 37.1,
        laborForceParticipation: 67.3,
        incomeDistribution: [
            { range: 'Under $30k', percentage: 9 },
            { range: '$30k–$50k', percentage: 15 },
            { range: '$50k–$75k', percentage: 19 },
            { range: '$75k–$100k', percentage: 23 },
            { range: '$100k+', percentage: 34 },
        ],
        ageDistribution: [
            { range: '0–14', percentage: 17 },
            { range: '15–24', percentage: 12 },
            { range: '25–44', percentage: 31 },
            { range: '45–64', percentage: 26 },
            { range: '65+', percentage: 14 },
        ],
        employmentBySector: [
            { sector: 'Services', percentage: 75 },
            { sector: 'Manufacturing', percentage: 7 },
            { sector: 'Construction', percentage: 12 },
            { sector: 'Energy & Mining', percentage: 6 },
        ],
    },
    'edmonton': {
        name: 'Edmonton',
        cma: 'Edmonton CMA',
        population: 1_495_000,
        medianIncome: 71_500,
        unemploymentRate: 4.6,
        avgAge: 36.8,
        laborForceParticipation: 66.8,
        incomeDistribution: [
            { range: 'Under $30k', percentage: 10 },
            { range: '$30k–$50k', percentage: 16 },
            { range: '$50k–$75k', percentage: 20 },
            { range: '$75k–$100k', percentage: 22 },
            { range: '$100k+', percentage: 32 },
        ],
        ageDistribution: [
            { range: '0–14', percentage: 18 },
            { range: '15–24', percentage: 13 },
            { range: '25–44', percentage: 30 },
            { range: '45–64', percentage: 25 },
            { range: '65+', percentage: 14 },
        ],
        employmentBySector: [
            { sector: 'Services', percentage: 76 },
            { sector: 'Manufacturing', percentage: 8 },
            { sector: 'Construction', percentage: 11 },
            { sector: 'Energy & Mining', percentage: 5 },
        ],
    },
    'ottawa': {
        name: 'Ottawa–Gatineau',
        cma: 'Ottawa–Gatineau CMA',
        population: 1_402_000,
        medianIncome: 79_200,
        unemploymentRate: 3.9,
        avgAge: 38.5,
        laborForceParticipation: 68.2,
        incomeDistribution: [
            { range: 'Under $30k', percentage: 8 },
            { range: '$30k–$50k', percentage: 14 },
            { range: '$50k–$75k', percentage: 18 },
            { range: '$75k–$100k', percentage: 21 },
            { range: '$100k+', percentage: 39 },
        ],
        ageDistribution: [
            { range: '0–14', percentage: 16 },
            { range: '15–24', percentage: 11 },
            { range: '25–44', percentage: 29 },
            { range: '45–64', percentage: 28 },
            { range: '65+', percentage: 16 },
        ],
        employmentBySector: [
            { sector: 'Government & Services', percentage: 85 },
            { sector: 'Manufacturing', percentage: 6 },
            { sector: 'Construction', percentage: 6 },
            { sector: 'Other', percentage: 3 },
        ],
    },
    'winnipeg': {
        name: 'Winnipeg',
        cma: 'Winnipeg CMA',
        population: 898_000,
        medianIncome: 65_300,
        unemploymentRate: 5.1,
        avgAge: 38.2,
        laborForceParticipation: 64.5,
        incomeDistribution: [
            { range: 'Under $30k', percentage: 13 },
            { range: '$30k–$50k', percentage: 20 },
            { range: '$50k–$75k', percentage: 21 },
            { range: '$75k–$100k', percentage: 20 },
            { range: '$100k+', percentage: 26 },
        ],
        ageDistribution: [
            { range: '0–14', percentage: 16 },
            { range: '15–24', percentage: 13 },
            { range: '25–44', percentage: 27 },
            { range: '45–64', percentage: 27 },
            { range: '65+', percentage: 17 },
        ],
        employmentBySector: [
            { sector: 'Services', percentage: 78 },
            { sector: 'Manufacturing', percentage: 12 },
            { sector: 'Construction', percentage: 7 },
            { sector: 'Other', percentage: 3 },
        ],
    },
};

export function getCityMetrics(cityId) {
    const city = CANADIAN_CITIES.find(c => c.id === cityId);
    if (!city) return {};
    
    return CITY_METRICS[cityId] || {};
}

export function getCityById(cityId) {
    return CANADIAN_CITIES.find(c => c.id === cityId) || null;
}

export function getProvinceById(provinceId) {
    return CANADIAN_PROVINCES.find(p => p.id === provinceId) || null;
}

export function getCitiesByProvince(provinceName) {
    return CANADIAN_CITIES.filter(city => city.province === provinceName);
}

export function formatCurrency(value) {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 0,
    }).format(value);
}

export function formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value) {
    return new Intl.NumberFormat('en-CA').format(value);
}
