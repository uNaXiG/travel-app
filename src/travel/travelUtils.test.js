import test from 'node:test';
import assert from 'node:assert/strict';
import { airports } from './airports.js';
import { MAX_IMAGE_FILE_SIZE, validateImageFile } from './imageUtils.js';
import { buildTripDays, buildTripDeletionUpdates, formatTripDateRange, getTripsWithLodging, groupFlightsByTrip, isTripOwner, toOverviewDays } from './travelUtils.js';

test('image uploads accept JPEG and PNG files up to 1 MiB', () => {
  assert.equal(validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_FILE_SIZE }), undefined);
  assert.equal(validateImageFile({ type: 'image/png', size: 1 }), undefined);
});

test('image uploads reject unsupported, empty, and oversized files', () => {
  assert.throws(() => validateImageFile({ type: 'image/gif', size: 1 }), /JPG 或 PNG/);
  assert.throws(() => validateImageFile({ type: 'image/png', size: 0 }), /JPG 或 PNG/);
  assert.throws(() => validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_FILE_SIZE + 1 }), /1 MiB/);
});

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
    itinerary: {
      '2026-10-22': {
        area: '大阪',
        events: {
          event1: { title: '抵達', type: 'transport', startTime: '09:00', endTime: '10:00', address: '機場' },
          event2: { title: '入住', type: 'stay' },
          event3: { title: '採買', type: 'shopping' },
          event4: { title: '用餐', type: 'food' },
          event5: { title: '景點', type: 'sight' },
          event6: { title: '舊資料' },
        }
      }
    },
  });

  assert.equal(day.events[0].time, '09:00–10:00');
  assert.equal(day.events[0].id, 'event1');
  assert.equal(day.events[0].location, '機場');
  assert.equal(day.area, '大阪');
  assert.equal(day.events[0].category, '交通');
  assert.deepEqual(day.events.map(({ category }) => category), ['交通', '住宿', '購物', '餐廳', '景點', '景點']);
  assert.equal(day.summary, '');
  const [fallbackDay] = toOverviewDays({ startDate: '2026-10-22', endDate: '2026-10-22', country: '日本', description: '整趟描述', itinerary: { '2026-10-22': { summary: '第一天摘要' } } });
  assert.equal(fallbackDay.summary, '第一天摘要');
  assert.equal(fallbackDay.area, '日本');
});

test('itinerary events sort by start time with stable untimed ordering per day', () => {
  const days = toOverviewDays({
    startDate: '2026-10-22',
    endDate: '2026-10-23',
    country: '日本',
    itinerary: {
      '2026-10-22': {
        events: {
          late: { title: '晚餐', startTime: '18:00' },
          sameTimeFirst: { title: '同時段 A', startTime: '14:00' },
          untimedFirst: { title: '未定 A' },
          early: { title: '景點 B', startTime: '10:00' },
          sameTimeSecond: { title: '同時段 B', startTime: '14:00' },
          untimedSecond: { title: '未定 B' },
        },
      },
      '2026-10-23': {
        events: {
          nextDayLate: { title: '隔日晚上', startTime: '20:00' },
          nextDayEarly: { title: '隔日早上', startTime: '08:00' },
        },
      },
    },
  });

  assert.deepEqual(days[0].events.map(({ id }) => id), [
    'early', 'sameTimeFirst', 'sameTimeSecond', 'late', 'untimedFirst', 'untimedSecond',
  ]);
  assert.deepEqual(days[1].events.map(({ id }) => id), ['nextDayEarly', 'nextDayLate']);
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
    'users/owner/tripExpenses/trip-123': null,
    'users/friend/trips/trip-123': null,
    'users/friend/tripExpenses/trip-123': null,
  });
});

test('only the trip owner passes the owner check', () => {
  const trip = { ownerId: 'owner-1' };

  assert.equal(isTripOwner(trip, 'owner-1'), true);
  assert.equal(isTripOwner(trip, 'member-2'), false);
  assert.equal(isTripOwner(trip, ''), false);
});