const weekdayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
export const itineraryTypeOptions = [
  { value: 'transport', label: '交通' },
  { value: 'stay', label: '住宿' },
  { value: 'shopping', label: '購物' },
  { value: 'sight', label: '景點' },
  { value: 'food', label: '餐廳' },
];

export function buildTripDays(startDate, endDate) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(startDate || '') || !datePattern.test(endDate || '')) {
    throw new Error('請選擇有效的旅行日期。');
  }

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (start.toISOString().slice(0, 10) !== startDate || end.toISOString().slice(0, 10) !== endDate) {
    throw new Error('請選擇有效的旅行日期。');
  }
  if (end < start) {
    throw new Error('結束日期必須在開始日期當天或之後。');
  }

  const dayCount = Math.round((end - start) / 86400000) + 1;
  if (dayCount > 60) throw new Error('單趟旅行最多可建立 60 天。');

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start.getTime() + index * 86400000);
    const isoDate = date.toISOString().slice(0, 10);
    return {
      date: isoDate,
      day: index + 1,
      weekday: weekdayNames[date.getUTCDay()],
      events: [],
    };
  });
}

export function formatTripDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '';
  return `${startDate.replaceAll('-', '.')} — ${endDate.replaceAll('-', '.')}`;
}

function recordsFrom(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function hasText(value) {
  return value !== null && value !== undefined && String(value).trim().length > 0;
}

function itineraryStartTime(event) {
  const startTime = typeof event.startTime === 'string' ? event.startTime : '';
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ? startTime : '';
}

export function sortItineraryEvents(events) {
  return events.map((event, index) => ({ event, index }))
    .sort((first, second) => {
      const firstTime = itineraryStartTime(first.event);
      const secondTime = itineraryStartTime(second.event);
      if (firstTime && secondTime) return firstTime.localeCompare(secondTime) || first.index - second.index;
      if (firstTime) return -1;
      if (secondTime) return 1;
      return first.index - second.index;
    })
    .map(({ event }) => event);
}

export function groupFlightsByTrip(trips) {
  const flightFields = ['airline', 'departureAirport', 'arrivalAirport', 'date', 'fare', 'route', 'departure', 'arrival'];
  return trips.map((trip) => ({
    trip,
    flights: recordsFrom(trip.flights).filter((flight) => flight && flightFields.some((field) => hasText(flight[field]))),
  })).filter(({ flights }) => flights.length > 0);
}

export function getTripsWithLodging(trips) {
  const lodgingFields = ['name', 'address', 'checkIn', 'checkOut', 'price', 'note'];
  return trips.flatMap((trip) => {
    const lodgingData = trip.lodging;
    const lodgingRecords = !Array.isArray(lodgingData)
      && lodgingData
      && typeof lodgingData === 'object'
      && lodgingFields.some((field) => hasText(lodgingData[field]))
      ? [lodgingData]
      : recordsFrom(lodgingData);
    return lodgingRecords.flatMap((lodging, index) => (
      lodging && lodgingFields.some((field) => hasText(lodging[field])) ? [{ trip, lodging, index }] : []
    ));
  });
}

export function buildTripDeletionUpdates(tripId, trip) {
  const updates = { [`trips/${tripId}`]: null };
  Object.keys(trip.participants || {}).forEach((uid) => {
    updates[`users/${uid}/trips/${tripId}`] = null;
    updates[`users/${uid}/tripExpenses/${tripId}`] = null;
  });
  return updates;
}

export function isTripOwner(trip, uid) {
  return Boolean(uid && trip?.ownerId === uid);
}

export function toOverviewDays(trip) {
  return buildTripDays(trip.startDate, trip.endDate).map((day) => {
    const storedDay = trip.itinerary?.[day.date];
    return {
      ...day,
      id: day.day,
      area: storedDay?.area || trip.country,
      title: `第 ${day.day} 天`,
      summary: storedDay?.summary || '',
      guide: storedDay?.guide || '',
      events: sortItineraryEvents(Object.entries(storedDay?.events || {}).map(([id, event]) => {
        const type = itineraryTypeOptions.some((option) => option.value === event.type) ? event.type : 'sight';
        const category = itineraryTypeOptions.find((option) => option.value === type).label;
        return {
          ...event,
          id,
          type,
          category,
          time: [event.startTime, event.endTime].filter(Boolean).join('–') || '時間未定',
          location: event.address || '',
        };
      })),
    };
  });
}