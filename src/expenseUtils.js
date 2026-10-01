export function totalExpensesInTwd(expenses, jpyToTwd) {
    return expenses.reduce((total, expense) => {
        const amount = Number(expense.amount) || 0;
        if (expense.currency === 'JPY') return jpyToTwd ? total + amount * jpyToTwd : null;
        return total === null ? null : total + amount;
    }, 0);
}

export function totalExpensesInCurrency(expenses, currency, jpyToTwd) {
    const totals = totalsByCurrency(expenses);
    if (currency === 'JPY') {
        if (totals.TWD && !jpyToTwd) return null;
        return totals.JPY + (jpyToTwd ? totals.TWD / jpyToTwd : 0);
    }
    if (totals.JPY && !jpyToTwd) return null;
    return totals.TWD + (jpyToTwd ? totals.JPY * jpyToTwd : 0);
}

export function totalsByCurrency(expenses) {
    return expenses.reduce((totals, expense) => {
        const currency = expense.currency === 'JPY' ? 'JPY' : 'TWD';
        totals[currency] += Number(expense.amount) || 0;
        return totals;
    }, { JPY: 0, TWD: 0 });
}