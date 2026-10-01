import { toWeatherApiParams } from './locationMapping.js';

const geocodeCache = new Map();
const FORECAST_DAY_LIMIT = 16;

const weatherCodeLabels = {
    0: '晴朗',
    1: '大多晴',
    2: '局部多雲',
    3: '陰天',
    45: '霧',
    48: '霧凇',
    51: '毛毛雨',
    53: '小雨',
    55: '中雨',
    56: '凍雨',
    57: '凍雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    66: '凍雨',
    67: '凍雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '雪粒',
    80: '陣雨',
    81: '陣雨',
    82: '強陣雨',
    85: '陣雪',
    86: '強陣雪',
    95: '雷雨',
    96: '雷雨冰雹',
    99: '強雷雨冰雹',
};

function dayDateInTaipei() {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(new Date());
}

function dateDiffInDays(fromDate, toDate) {
    const from = new Date(`${fromDate}T00:00:00Z`);
    const to = new Date(`${toDate}T00:00:00Z`);
    return Math.round((to - from) / 86400000);
}

function normalizeWeatherCode(value) {
    return Number.isFinite(Number(value)) ? Number(value) : null;
}

function weatherLabel(code) {
    return weatherCodeLabels[code] || '天氣未分類';
}

function weatherTempText(maxTemp, minTemp) {
    const max = Number(maxTemp);
    const min = Number(minTemp);
    if (Number.isFinite(max) && Number.isFinite(min)) return `${Math.round(max)}° / ${Math.round(min)}°`;
    if (Number.isFinite(max)) return `${Math.round(max)}°`;
    if (Number.isFinite(min)) return `${Math.round(min)}°`;
    return '--';
}

async function fetchJson(url, signal) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

async function resolveCoordinates(weatherQuery, signal) {
    if (geocodeCache.has(weatherQuery)) return geocodeCache.get(weatherQuery);

    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', weatherQuery);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'zh');
    url.searchParams.set('format', 'json');

    const data = await fetchJson(url, signal);
    const first = data?.results?.[0];
    if (!first || !Number.isFinite(first.latitude) || !Number.isFinite(first.longitude)) {
        throw new Error('找不到地點座標');
    }

    const coordinates = { latitude: first.latitude, longitude: first.longitude };
    geocodeCache.set(weatherQuery, coordinates);
    return coordinates;
}

function weatherEndpointForDate(targetDate) {
    return targetDate < dayDateInTaipei()
        ? 'https://archive-api.open-meteo.com/v1/archive'
        : 'https://api.open-meteo.com/v1/forecast';
}

async function fetchCurrentWeather({ latitude, longitude }, signal) {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('current', 'temperature_2m,weather_code');
    url.searchParams.set('timezone', 'Asia/Taipei');
    const data = await fetchJson(url, signal);
    const weatherCode = normalizeWeatherCode(data?.current?.weather_code);
    if (weatherCode === null) throw new Error('無法解析即時天氣資料');
    const temp = Number(data?.current?.temperature_2m);
    return {
        weatherCode,
        condition: `${weatherLabel(weatherCode)} · 即時`,
        temperatureText: Number.isFinite(temp) ? `${Math.round(temp)}°` : '--',
    };
}

export async function fetchDailyWeather(day, signal) {
    const weatherParams = toWeatherApiParams(day?.location);
    if (!weatherParams || !day?.date) {
        return null;
    }

    const todayInTaipei = dayDateInTaipei();
    const offsetFromToday = dateDiffInDays(todayInTaipei, day.date);
    const coordinates = await resolveCoordinates(weatherParams.weatherQuery, signal);

    if (offsetFromToday >= FORECAST_DAY_LIMIT) {
        const current = await fetchCurrentWeather(coordinates, signal);
        return {
            displayName: weatherParams.displayName,
            city: weatherParams.city,
            weatherCode: current.weatherCode,
            condition: current.condition,
            temperatureText: current.temperatureText,
        };
    }

    const weatherUrl = new URL(weatherEndpointForDate(day.date));
    weatherUrl.searchParams.set('latitude', String(coordinates.latitude));
    weatherUrl.searchParams.set('longitude', String(coordinates.longitude));
    weatherUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
    weatherUrl.searchParams.set('timezone', 'Asia/Taipei');
    weatherUrl.searchParams.set('start_date', day.date);
    weatherUrl.searchParams.set('end_date', day.date);

    const weatherData = await fetchJson(weatherUrl, signal);
    const daily = weatherData?.daily;
    const weatherCodeRaw = daily?.weather_code?.[0] ?? daily?.weathercode?.[0];
    const weatherCode = normalizeWeatherCode(weatherCodeRaw);

    if (weatherCode === null) throw new Error('無法解析天氣資料');

    const maxTemp = daily?.temperature_2m_max?.[0];
    const minTemp = daily?.temperature_2m_min?.[0];

    return {
        displayName: weatherParams.displayName,
        city: weatherParams.city,
        weatherCode,
        condition: weatherLabel(weatherCode),
        temperatureText: weatherTempText(maxTemp, minTemp),
    };
}
