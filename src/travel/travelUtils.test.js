import test from 'node:test';
import assert from 'node:assert/strict';
import { airports } from './airports.js';
import { buildTripDays, buildTripDeletionUpdates, formatTripDateRange, getTripsWithLodging, groupFlightsByTrip, isTripOwner, toOverviewDays } from './travelUtils.js';

test('buildTripDays returns every date inclusively across a leap day', () => {
  const days = buildTripDays('2028-02-28', '2028-03-01');

  assert.deepEqual(days.map(({ date }) => date), ['2028-02-28', '2028-02-29', '2028-03-01']);
  assert.deepEqual(days.map(({ weekday }) => weekday), ['週一', '週二', '週三']);
});

test('buildTripDays rejects invalid and reversed date ranges', () => {
  assert.throws(() => buildTripDays('2026-02-30', '2026-03-01'), /有效的旅行日期/);
  assert.throws(() => buildTripDays('2026-10-23', '2026-10-22'), /結束日期/);
});

test('buildTripDays caps trip length at sixty days', () => {
  assert.throws(() => buildTripDays('2026-01-01', '2026-03-02'), /最多可建立 60 天/);
});

test('trip display helpers format date ranges and stored itinerary events', () => {
  assert.equal(formatTripDateRange('2026-10-22', '2026-10-26'), '2026.10.22 — 2026.10.26');
  const [day] = toOverviewDays({
    startDate: '2026-10-22',
    endDate: '2026-10-22',
    country: '日本',
    description: '這是整趟旅行的描述，不應成為每日摘要。',
    itinerary: { '2026-10-22': { events: {
      event1: { title: '抵達', type: 'transport', startTime: '09:00', endTime: '10:00', address: '機場' },
      event2: { title: '入住', type: 'stay' },
      event3: { title: '採買', type: 'shopping' },
      event4: { title: '用餐', type: 'food' },
      event5: { title: '景點', type: 'sight' },
      event6: { title: '舊資料' },
    } } },
  });

  assert.equal(day.events[0].time, '09:00–10:00');
  assert.equal(day.events[0].id, 'event1');
  assert.equal(day.events[0].location, '機場');
  assert.equal(day.events[0].category, '交通');
  assert.deepEqual(day.events.map(({ category }) => category), ['交通', '住宿', '購物', '餐廳', '景點', '景點']);
  assert.equal(day.summary, '');
  assert.equal(toOverviewDays({ startDate: '2026-10-22', endDate: '2026-10-22', description: '整趟描述', itinerary: { '2026-10-22': { summary: '第一天摘要' } } })[0].summary, '第一天摘要');
});

test('transport and lodging records stay grouped under their own trips', () => {
  const trips = [
    { id: 'trip-a', title: '大阪', flights: [{ airline: 'A航空', departureAirport: 'TPE', arrivalAirport: 'KIX' }], lodging: [{ name: '大阪飯店' }, { name: '京都旅館' }] },
    { id: 'trip-b', title: '東京', flights: { flight1: { airline: 'B航空', departureAirport: 'HND', arrivalAirport: 'TSA' } }, lodging: { address: '東京車站附近' } },
    { id: 'trip-c', title: '空白旅程', flights: [{ airline: '', fare: '' }], lodging: [{ name: '' }] },
  ];

  assert.deepEqual(groupFlightsByTrip(trips).map(({ trip, flights }) => [trip.id, flights.length]), [['trip-a', 1], ['trip-b', 1]]);
  assert.deepEqual(getTripsWithLodging(trips).map(({ trip, lodging }) => [trip.id, lodging.name || lodging.address]), [['trip-a', '大阪飯店'], ['trip-a', '京都旅館'], ['trip-b', '東京車站附近']]);
});

test('airport list includes Taiwan and Japan airports with unique IATA codes', () => {
  assert.equal(airports.filter(({ country }) => country === 'TW').length, 2);
  assert.equal(airports.filter(({ country }) => country === 'JP').length, 96);
  assert.equal(new Set(airports.map(({ code }) => code)).size, airports.length);
  assert.equal(airports.filter(({ country, displayName, name }) => country === 'JP' && displayName === name).length, 0);
  assert.equal(airports.filter(({ country }) => country === 'JP' && /[A-Za-z]/.test(airports.find(({ code }) => code).displayName)).length, 0);
  assert.ok(airports.some(({ code }) => code === 'TSA'));
  assert.equal(airports.some(({ code }) => code === 'KHH'), false);
  assert.ok(airports.some(({ code }) => code === 'TPE'));
  assert.equal(airports.find(({ code }) => code === 'HND').displayName, '東京國際機場（羽田）');
  assert.ok(airports.some(({ code }) => code === 'TSA'));
  assert.equal(airports.some(({ code }) => code === 'KHH'), false);
  assert.ok(airports.some(({ code }) => code === 'HND'));
});

test('trip deletion includes the trip and every participant membership index', () => {
  assert.deepEqual(buildTripDeletionUpdates('trip-123', {
    participants: { owner: { uid: 'owner' }, friend: { uid: 'friend' } },
  }), {
    'trips/trip-123': null,
    'users/owner/trips/trip-123': null,
    'users/friend/trips/trip-123': null,
  });
});

test('only the trip owner passes the owner check', () => {
  const trip = { ownerId: 'owner-1' };

  assert.equal(isTripOwner(trip, 'owner-1'), true);
  assert.equal(isTripOwner(trip, 'member-2'), false);
  assert.equal(isTripOwner(trip, ''), false);
});