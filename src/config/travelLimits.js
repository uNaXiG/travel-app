const configuredMaxTrips = Number(import.meta.env?.VITE_MAX_TRIPS_PER_USER);

export const travelLimits = Object.freeze({
  maxTripsPerUser: Number.isSafeInteger(configuredMaxTrips) && configuredMaxTrips > 0 ? configuredMaxTrips : 3,
});