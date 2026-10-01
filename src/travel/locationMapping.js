import { dailyItineraryLocations } from '../config/dailyItineraryLocations.js';

const locationByKey = new Map(dailyItineraryLocations.map((location) => [location.key, location]));
const locationByDisplayName = new Map(dailyItineraryLocations.map((location) => [location.displayName, location]));
const locationByCountryCity = new Map(dailyItineraryLocations.map((location) => [`${location.country}::${location.city}`, location]));
const locationByCity = new Map(dailyItineraryLocations.map((location) => [location.city, location]));

function cloneLocation(location) {
    return location ? { ...location } : null;
}

export function getDailyLocationOptions() {
    return dailyItineraryLocations.map((location) => ({ ...location }));
}

export function getDailyLocationByKey(key) {
    return cloneLocation(locationByKey.get(String(key || '').trim()));
}

export function resolveStoredDayLocation(storedDay) {
    const location = storedDay?.location;
    if (location?.key && locationByKey.has(location.key)) return getDailyLocationByKey(location.key);

    if (location?.country && location?.city) {
        const mapped = locationByCountryCity.get(`${location.country}::${location.city}`);
        if (mapped) return cloneLocation(mapped);
    }

    if (location?.displayName && locationByDisplayName.has(location.displayName)) {
        return cloneLocation(locationByDisplayName.get(location.displayName));
    }

    const area = String(storedDay?.area || '').trim();
    if (locationByDisplayName.has(area)) return cloneLocation(locationByDisplayName.get(area));
    if (locationByCity.has(area)) return cloneLocation(locationByCity.get(area));

    return null;
}

export function toStoredDayLocation(key) {
    const location = getDailyLocationByKey(key);
    if (!location) return null;
    return {
        key: location.key,
        country: location.country,
        city: location.city,
        displayName: location.displayName,
        weatherMapping: location.weatherMapping,
    };
}

export function toWeatherApiParams(locationOrKey) {
    const location = typeof locationOrKey === 'string'
        ? getDailyLocationByKey(locationOrKey)
        : locationOrKey;
    if (!location) return null;
    return {
        weatherQuery: location.weatherMapping,
        country: location.country,
        city: location.city,
        displayName: location.displayName,
    };
}
