import test from 'node:test';
import assert from 'node:assert/strict';
import { totalExpensesInCurrency, totalExpensesInTwd, totalsByCurrency } from './expenseUtils.js';

test('public and private expense totals remain independent', () => {
  const sharedExpenses = [
    { amount: 1000, currency: 'JPY' },
    { amount: 350, currency: 'TWD' },
  ];
  const personalExpenses = [{ amount: 80, currency: 'TWD' }];

  assert.equal(totalExpensesInTwd(sharedExpenses, 0.2), 550);
  assert.equal(totalExpensesInTwd(personalExpenses, 0.2), 80);
  assert.deepEqual(totalsByCurrency(sharedExpenses), { JPY: 1000, TWD: 350 });
  assert.deepEqual(totalsByCurrency(personalExpenses), { JPY: 0, TWD: 80 });
});

test('JPY totals wait for an exchange rate while TWD totals remain available', () => {
  assert.equal(totalExpensesInTwd([{ amount: 100, currency: 'JPY' }], null), null);
  assert.equal(totalExpensesInTwd([{ amount: 100, currency: 'TWD' }], null), 100);
  assert.equal(totalExpensesInCurrency([{ amount: 100, currency: 'TWD' }], 'JPY', null), null);
  assert.equal(totalExpensesInCurrency([{ amount: 100, currency: 'JPY' }], 'JPY', null), 100);
});