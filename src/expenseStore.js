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
        updatedAt: serverTimestamp(),
    };
}

export const expenseStore = {
    subscribeShared(onExpenses, onError) {
        return onValue(expenseReference('sharedExpenses'), (snapshot) => onExpenses(readExpenses(snapshot)), onError);
    },

    subscribePersonal(uid, onExpenses, onError) {
        return onValue(expenseReference(`users/${uid}/expenses`), (snapshot) => onExpenses(readExpenses(snapshot)), onError);
    },

    createShared(uid, displayName, input) {
        const expenseReference = push(expenseReferenceRoot('sharedExpenses'));
        return set(expenseReference, {
            ...expenseFields(input),
            creatorId: uid,
            creatorName: displayName || '旅人',
            createdAt: serverTimestamp(),
            participants: {
                [uid]: {
                    uid,
                    name: displayName || '旅人',
                    joinedAt: serverTimestamp(),
                    settled: false,
                },
            },
        });
    },

    updateShared(expenseId, input) {
        return update(expenseReference(`sharedExpenses/${expenseId}`), expenseFields(input));
    },

    removeShared(expenseId) {
        return remove(expenseReference(`sharedExpenses/${expenseId}`));
    },

    joinShared(expenseId, uid, displayName) {
        return set(expenseReference(`sharedExpenses/${expenseId}/participants/${uid}`), {
            uid,
            name: displayName || '旅人',
            joinedAt: serverTimestamp(),
            settled: false,
        });
    },

    leaveShared(expenseId, uid) {
        return remove(expenseReference(`sharedExpenses/${expenseId}/participants/${uid}`));
    },

    setParticipantSettled(expenseId, uid, settled) {
        return update(expenseReference(`sharedExpenses/${expenseId}/participants/${uid}`), { settled });
    },

    createPersonal(uid, input) {
        const personalReference = push(expenseReferenceRoot(`users/${uid}/expenses`));
        return set(personalReference, {
            ...expenseFields(input),
            createdAt: serverTimestamp(),
        });
    },

    updatePersonal(uid, expenseId, input) {
        return update(expenseReference(`users/${uid}/expenses/${expenseId}`), expenseFields(input));
    },

    removePersonal(uid, expenseId) {
        return remove(expenseReference(`users/${uid}/expenses/${expenseId}`));
    },
};

function expenseReferenceRoot(path) {
    return ref(requireDatabase(), path);
}
