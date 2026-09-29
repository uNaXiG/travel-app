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

function itemsReference(uid) {
  if (!db) throw new Error('請在根目錄 .env 設定 VITE_FIREBASE_DATABASE_URL。');
  return ref(db, `users/${uid}/packingItems`);
}

export const packingStore = {
  subscribe(uid, onItems, onError) {
    return onValue(itemsReference(uid), (snapshot) => {
      const value = snapshot.val() || {};
      const items = Object.entries(value)
        .map(([id, item]) => ({ ...item, id }))
        .sort((first, second) => (first.sortOrder ?? first.createdAt ?? 0) - (second.sortOrder ?? second.createdAt ?? 0));
      onItems(items);
    }, onError);
  },

  add(uid, name) {
    const itemReference = push(itemsReference(uid));
    return set(itemReference, {
      name: name.trim(),
      packed: false,
      sortOrder: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  updateName(uid, itemId, name) {
    return update(ref(db, `users/${uid}/packingItems/${itemId}`), {
      name: name.trim(),
      updatedAt: serverTimestamp(),
    });
  },

  setPacked(uid, itemId, packed) {
    return update(ref(db, `users/${uid}/packingItems/${itemId}`), {
      packed,
      updatedAt: serverTimestamp(),
    });
  },

  remove(uid, itemId) {
    return remove(ref(db, `users/${uid}/packingItems/${itemId}`));
  },

  reorder(uid, itemIds) {
    const updates = Object.fromEntries(itemIds.map((itemId, index) => [`${itemId}/sortOrder`, index]));
    return update(itemsReference(uid), updates);
  },
};