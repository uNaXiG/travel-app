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

function requireDatabase() {
    if (!db) throw new Error('請在根目錄 .env 設定 Firebase Realtime Database。');
    return db;
}

function expenseReference(path) {
    return ref(requireDatabase(), path);
}

function readExpenses(snapshot) {
    const value = snapshot.val() || {};
    return Object.entries(value)
        .map(([id, expense]) => ({ ...expense, id }))
        .sort((first, second) => (second.createdAt || 0) - (first.createdAt || 0));
}

function expenseFields(input) {
    return {
        title: input.title.trim(),
        description: input.description.trim(),
        amount: Number(input.amount),
        currency: input.currency,
        category: input.category,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus || 'unpaid',
        updatedAt: serverTimestamp(),
    };
}

export const expenseStore = {
    subscribeShared(tripId, onExpenses, onError) {
        return onValue(expenseReference(`trips/${tripId}/sharedExpenses`), (snapshot) => onExpenses(readExpenses(snapshot)), onError);
    },

    subscribePersonal(uid, tripId, onExpenses, onError) {
        return onValue(expenseReference(`users/${uid}/tripExpenses/${tripId}`), (snapshot) => onExpenses(readExpenses(snapshot)), onError);
    },

    createShared(tripId, uid, participant, input) {
        const sharedReference = push(expenseReferenceRoot(`trips/${tripId}/sharedExpenses`));
        return set(sharedReference, {
            ...expenseFields(input),
            creatorId: uid,
            creatorName: participant.name || '旅人',
            createdAt: serverTimestamp(),
            participants: {
                [uid]: {
                    uid,
                    name: participant.name || '旅人',
                    photoURL: participant.photoURL || '',
                    joinedAt: serverTimestamp(),
                    settled: input.paymentStatus === 'paid',
                },
            },
        });
    },

    updateShared(tripId, expenseId, creatorId, input) {
        return update(expenseReference(`trips/${tripId}/sharedExpenses/${expenseId}`), {
            ...expenseFields(input),
            [`participants/${creatorId}/settled`]: input.paymentStatus === 'paid',
        });
    },

    removeShared(tripId, expenseId) {
        return remove(expenseReference(`trips/${tripId}/sharedExpenses/${expenseId}`));
    },

    joinShared(tripId, expenseId, uid, participant) {
        return set(expenseReference(`trips/${tripId}/sharedExpenses/${expenseId}/participants/${uid}`), {
            uid,
            name: participant.name || '旅人',
            photoURL: participant.photoURL || '',
            joinedAt: serverTimestamp(),
            settled: false,
        });
    },

    leaveShared(tripId, expenseId, uid) {
        return remove(expenseReference(`trips/${tripId}/sharedExpenses/${expenseId}/participants/${uid}`));
    },

    setParticipantSettled(tripId, expenseId, uid, settled, creatorId) {
        const updates = {
            [`participants/${uid}/settled`]: settled,
        };
        if (uid === creatorId) updates.paymentStatus = settled ? 'paid' : 'unpaid';
        return update(expenseReference(`trips/${tripId}/sharedExpenses/${expenseId}`), updates);
    },

    createPersonal(uid, tripId, input) {
        const personalReference = push(expenseReferenceRoot(`users/${uid}/tripExpenses/${tripId}`));
        return set(personalReference, {
            ...expenseFields(input),
            createdAt: serverTimestamp(),
        });
    },

    updatePersonal(uid, tripId, expenseId, input) {
        return update(expenseReference(`users/${uid}/tripExpenses/${tripId}/${expenseId}`), expenseFields(input));
    },

    removePersonal(uid, tripId, expenseId) {
        return remove(expenseReference(`users/${uid}/tripExpenses/${tripId}/${expenseId}`));
    },
};

function expenseReferenceRoot(path) {
    return ref(requireDatabase(), path);
}
