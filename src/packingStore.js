import {
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { db } from './firebase.js';

function itemsReference(uid, tripId) {
  if (!db) throw new Error('請在根目錄 .env 設定 VITE_FIREBASE_DATABASE_URL。');
  return tripId ? ref(db, `users/${uid}/tripPackingItems/${tripId}`) : ref(db, `users/${uid}/packingItems`);
}

function itemPath(uid, itemId, tripId) {
  return tripId ? `users/${uid}/tripPackingItems/${tripId}/${itemId}` : `users/${uid}/packingItems/${itemId}`;
}

export const packingStore = {
  subscribe(uid, onItems, onError, tripId) {
    return onValue(itemsReference(uid, tripId), (snapshot) => {
      const value = snapshot.val() || {};
      const items = Object.entries(value)
        .map(([id, item]) => ({ ...item, id }))
        .sort((first, second) => (first.sortOrder ?? first.createdAt ?? 0) - (second.sortOrder ?? second.createdAt ?? 0));
      onItems(items);
    }, onError);
  },

  add(uid, name, tripId) {
    const itemReference = push(itemsReference(uid, tripId));
    return set(itemReference, {
      name: name.trim(),
      packed: false,
      sortOrder: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  updateName(uid, itemId, name, tripId) {
    return update(ref(db, itemPath(uid, itemId, tripId)), {
      name: name.trim(),
      updatedAt: serverTimestamp(),
    });
  },

  setPacked(uid, itemId, packed, tripId) {
    return update(ref(db, itemPath(uid, itemId, tripId)), {
      packed,
      updatedAt: serverTimestamp(),
    });
  },

  remove(uid, itemId, tripId) {
    return remove(ref(db, itemPath(uid, itemId, tripId)));
  },

  reorder(uid, itemIds, tripId) {
    const updates = Object.fromEntries(itemIds.map((itemId, index) => [`${itemId}/sortOrder`, index]));
    return update(itemsReference(uid, tripId), updates);
  },
};