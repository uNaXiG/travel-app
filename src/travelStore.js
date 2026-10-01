import {
  get,
  onValue,
  push,
  ref,
  runTransaction,
  serverTimestamp,
  update,
} from 'firebase/database';
import { db } from './firebase.js';
import { toStoredDayLocation } from './travel/locationMapping.js';
import { buildTripDeletionUpdates, isTripOwner } from './travel/travelUtils.js';

function requireDatabase() {
  if (!db) throw new Error('請在根目錄 .env 設定 Firebase Realtime Database。');
  return db;
}

function tripRecordsFrom(value, legacyFields) {
  if (Array.isArray(value)) return value.filter((record) => record && typeof record === 'object');
  if (!value || typeof value !== 'object') return [];
  if (legacyFields.some((field) => value[field] !== undefined && value[field] !== null && value[field] !== '')) return [value];
  return Object.values(value).filter((record) => record && typeof record === 'object');
}

async function appendTripRecord(tripId, section, record, legacyFields) {
  const database = requireDatabase();
  const recordsRef = ref(database, `trips/${tripId}/${section}`);
  const formId = push(recordsRef).key;
  const result = await runTransaction(recordsRef, (current) => [
    ...tripRecordsFrom(current, legacyFields),
    { ...record, formId, saved: true },
  ]);
  if (!result.committed) throw new Error('資料未能儲存，請稍後再試。');
  await update(ref(database), { [`trips/${tripId}/updatedAt`]: serverTimestamp() });
  return formId;
}

async function removeTripRecord(tripId, section, record, legacyFields, identityFields) {
  const database = requireDatabase();
  const recordsRef = ref(database, `trips/${tripId}/${section}`);
  let removed = false;
  const result = await runTransaction(recordsRef, (current) => {
    const records = tripRecordsFrom(current, legacyFields);
    const recordIndex = records.findIndex((candidate) => (
      (record.formId && candidate.formId === record.formId)
      || identityFields.every((field) => (candidate[field] ?? '') === (record[field] ?? ''))
    ));
    if (recordIndex < 0) {
      removed = false;
      return;
    }
    removed = true;
    return records.filter((_, index) => index !== recordIndex);
  });
  if (!result.committed || !removed) throw new Error('找不到要刪除的資料，請重新整理後再試。');
  await update(ref(database), { [`trips/${tripId}/updatedAt`]: serverTimestamp() });
}

export const travelStore = {
  async getTripPreview(tripId) {
    const database = requireDatabase();
    const cleanedId = tripId.trim();
    if (!cleanedId) throw new Error('請輸入旅行 ID。');
    const tripSnapshot = await get(ref(database, `trips/${cleanedId}`));
    if (!tripSnapshot.exists()) throw new Error('找不到這個旅行 ID，請確認後再試。');
    return { ...tripSnapshot.val(), id: cleanedId };
  },

  subscribeForUser(uid, onTrips, onError) {
    const database = requireDatabase();
    const tripSubscriptions = new Map();
    const membershipRef = ref(database, `users/${uid}/trips`);
    const unsubscribeMembership = onValue(membershipRef, (snapshot) => {
      const tripIds = Object.keys(snapshot.val() || {});
      onTrips((currentTrips) => currentTrips.filter((trip) => tripIds.includes(trip.id)));
      for (const [tripId, unsubscribe] of tripSubscriptions) {
        if (!tripIds.includes(tripId)) {
          unsubscribe();
          tripSubscriptions.delete(tripId);
        }
      }
      if (!tripIds.length) onTrips([]);
      tripIds.forEach((tripId) => {
        if (tripSubscriptions.has(tripId)) return;
        const unsubscribe = onValue(ref(database, `trips/${tripId}`), (tripSnapshot) => {
          const trip = tripSnapshot.val();
          if (!trip) {
            onTrips((currentTrips) => currentTrips.filter((item) => item.id !== tripId));
            return;
          }
          onTrips((currentTrips) => {
            const nextTrip = { ...trip, id: tripId };
            return [...currentTrips.filter((item) => item.id !== tripId), nextTrip]
              .sort((first, second) => (first.startDate || '').localeCompare(second.startDate || ''));
          });
        }, onError);
        tripSubscriptions.set(tripId, unsubscribe);
      });
    }, onError);

    return () => {
      unsubscribeMembership();
      tripSubscriptions.forEach((unsubscribe) => unsubscribe());
      tripSubscriptions.clear();
    };
  },

  async createTrip(uid, participant, input) {
    const database = requireDatabase();
    const tripRef = push(ref(database, 'trips'));
    const tripId = tripRef.key;
    const member = {
      uid,
      name: participant.name || '旅人',
      photoURL: participant.photoURL || '',
      joinedAt: serverTimestamp(),
    };
    const trip = {
      ownerId: uid,
      title: input.title.trim(),
      description: input.description.trim(),
      country: input.country.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      coverImage: input.coverImage || '',
      flights: input.flights,
      lodging: input.lodging,
      itinerary: input.itinerary || {},
      participants: { [uid]: member },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await update(ref(database), {
      [`trips/${tripId}`]: trip,
      [`users/${uid}/trips/${tripId}`]: { joinedAt: serverTimestamp() },
    });
    return tripId;
  },

  addFlight(tripId, flight) {
    return appendTripRecord(tripId, 'flights', flight, ['airline', 'departureAirport', 'arrivalAirport', 'date', 'fare', 'route']);
  },

  addLodging(tripId, lodging) {
    return appendTripRecord(tripId, 'lodging', lodging, ['name', 'address', 'checkIn', 'checkOut', 'price', 'note', 'coverImage']);
  },

  removeFlight(tripId, flight) {
    return removeTripRecord(tripId, 'flights', flight, ['airline', 'date', 'departureAirport', 'arrivalAirport', 'fare'], ['airline', 'date', 'departureAirport', 'arrivalAirport', 'fare']);
  },

  removeLodging(tripId, lodging) {
    return removeTripRecord(tripId, 'lodging', lodging, ['name', 'address', 'checkIn', 'checkOut', 'price', 'note', 'coverImage'], ['name', 'address', 'checkIn', 'checkOut', 'price', 'note', 'coverImage']);
  },

  async deleteTrip(uid, tripId) {
    const database = requireDatabase();
    const tripSnapshot = await get(ref(database, `trips/${tripId}`));
    if (!tripSnapshot.exists()) throw new Error('這趟旅行已不存在或已被刪除。');
    const trip = tripSnapshot.val();
    if (!isTripOwner(trip, uid)) throw new Error('只有旅行建立者可以刪除整趟旅行。');
    await update(ref(database), buildTripDeletionUpdates(tripId, trip));
  },

  async joinTrip(uid, participant, tripId) {
    const database = requireDatabase();
    const cleanedId = tripId.trim();
    if (!cleanedId) throw new Error('請輸入旅行 ID。');
    const tripSnapshot = await get(ref(database, `trips/${cleanedId}`));
    if (!tripSnapshot.exists()) throw new Error('找不到這個旅行 ID，請確認後再試。');
    const updates = { [`users/${uid}/trips/${cleanedId}`]: { joinedAt: serverTimestamp() } };
    if (!tripSnapshot.val()?.participants?.[uid]) {
      updates[`trips/${cleanedId}/participants/${uid}`] = {
        uid,
        name: participant.name || '旅人',
        photoURL: participant.photoURL || '',
        joinedAt: serverTimestamp(),
      };
    }
    await update(ref(database), updates);
    return cleanedId;
  },

  addEvent(tripId, date, event, uid) {
    const database = requireDatabase();
    const eventRef = push(ref(database, `trips/${tripId}/itinerary/${date}/events`));
    return update(ref(database), {
      [`trips/${tripId}/itinerary/${date}/events/${eventRef.key}`]: {
        title: event.title.trim(),
        description: event.description.trim(),
        startTime: event.startTime,
        endTime: event.endTime,
        address: event.address.trim(),
        type: event.type || 'sight',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      [`trips/${tripId}/updatedAt`]: serverTimestamp(),
    });
  },

  updateEvent(tripId, date, eventId, event) {
    const database = requireDatabase();
    const eventPath = `trips/${tripId}/itinerary/${date}/events/${eventId}`;
    return update(ref(database), {
      [`${eventPath}/title`]: event.title.trim(),
      [`${eventPath}/description`]: event.description.trim(),
      [`${eventPath}/startTime`]: event.startTime,
      [`${eventPath}/endTime`]: event.endTime,
      [`${eventPath}/address`]: event.address.trim(),
      [`${eventPath}/type`]: event.type || 'sight',
      [`${eventPath}/updatedAt`]: serverTimestamp(),
      [`trips/${tripId}/updatedAt`]: serverTimestamp(),
    });
  },

  updateDayDetails(tripId, date, details) {
    const database = requireDatabase();
    const location = toStoredDayLocation(details.locationKey);
    return update(ref(database), {
      [`trips/${tripId}/itinerary/${date}/area`]: location?.displayName || null,
      [`trips/${tripId}/itinerary/${date}/location`]: location,
      [`trips/${tripId}/itinerary/${date}/summary`]: details.summary.trim() || null,
      [`trips/${tripId}/updatedAt`]: serverTimestamp(),
    });
  },

  removeEvent(tripId, date, eventId) {
    const database = requireDatabase();
    return update(ref(database), {
      [`trips/${tripId}/itinerary/${date}/events/${eventId}`]: null,
      [`trips/${tripId}/updatedAt`]: serverTimestamp(),
    });
  },
};
