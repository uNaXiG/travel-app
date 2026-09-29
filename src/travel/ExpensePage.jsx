import { useEffect, useMemo, useState } from 'react';
import {
    Check,
    CheckCircle2,
    CreditCard,
    Pencil,
    Plus,
    Receipt,
    Trash2,
    UserMinus,
    UserPlus,
    Users,
    Wallet,
    X,
} from 'lucide-react';

const categories = ['車票', '機票', '住宿', '門票', '飲食', '購物'];
const paymentMethods = ['現金支付', '信用卡', 'Apple Pay', '其他線上支付'];
const emptyForm = {
    title: '',
    description: '',
    amount: '',
    currency: 'JPY',
    category: '飲食',
    paymentMethod: '現金支付',
};

function formatAmount(amount, currency) {
    return new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: currency === 'JPY' ? 'JPY' : 'TWD',
        maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(Number(amount) || 0);
}

function formatDate(value) {
    if (!value) return '建立時間同步中';
    const timestamp = value < 100000000000 ? value * 1000 : value;
    return new Intl.DateTimeFormat('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(timestamp));
}

function participantEntries(expense) {
    return Object.values(expense.participants || {});
}

function ExpenseForm({ kind, initialValue, onSubmit, onCancel, working }) {
    const [form, setForm] = useState(initialValue || emptyForm);
    const isShared = kind === 'shared';

    useEffect(() => {
        setForm(initialValue || emptyForm);
    }, [initialValue]);

    function updateField(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    function submit(event) {
        event.preventDefault();
        onSubmit(form);
    }

    return (
        <form className="expense-form" onSubmit={submit}>
            <div className="expense-form-heading">
                <div><p className="section-eyebrow">{isShared ? 'SHARED EXPENSE' : 'PERSONAL EXPENSE'}</p><h2>{initialValue ? '編輯帳目' : '新增帳目'}</h2></div>
                <button className="icon-button" type="button" aria-label="關閉表單" onClick={onCancel}><X size={17} /></button>
            </div>
            <div className="expense-form-grid">
                <label><span>公帳標題</span><input required maxLength={60} value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="例如：名古屋站到機場車票" /></label>
                <label><span>帳目分類</span><select value={form.category} onChange={(event) => updateField('category', event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="expense-form-wide"><span>描述</span><textarea maxLength={160} value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="補充這筆支出的內容" /></label>
                <label><span>金額</span><input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} placeholder="0" /></label>
                <label><span>幣別</span><select value={form.currency} onChange={(event) => updateField('currency', event.target.value)}><option value="JPY">日圓 JPY</option><option value="TWD">台幣 TWD</option></select></label>
                <label><span>付款方式</span><select value={form.paymentMethod} onChange={(event) => updateField('paymentMethod', event.target.value)}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
            </div>
            <div className="expense-form-actions"><button className="secondary-button" type="button" onClick={onCancel}>取消</button><button className="primary-button" type="submit" disabled={working}>{working ? '儲存中…' : '儲存帳目'}</button></div>
        </form>
    );
}

function SharedExpenseCard({ expense, user, onJoin, onLeave, onEdit, onRemove, onSettle, working }) {
    const participants = participantEntries(expense);
    const currentParticipant = participants.find((participant) => participant.uid === user.uid);
    const isOwner = expense.creatorId === user.uid;
    const personalAmount = Number(expense.amount || 0) / Math.max(participants.length, 1);

    return (
        <article className="expense-card">
            <div className="expense-card-topline"><span className="expense-category">{expense.category}</span><span className="expense-date">{formatDate(expense.createdAt)}</span></div>
            <div className="expense-card-title-row"><div><h3>{expense.title}</h3><p>{expense.description || '沒有補充描述'}</p></div><strong className="expense-original-amount">{formatAmount(expense.amount, expense.currency)}</strong></div>
            <div className="expense-meta-grid"><span><Users size={14} />{participants.length} 人分帳</span><span><Wallet size={14} />{expense.paymentMethod}</span><span><Receipt size={14} />建立者：{expense.creatorName}</span></div>
            <div className="expense-split-summary"><div><span>原始金額</span><strong>{formatAmount(expense.amount, expense.currency)}</strong></div><div className={currentParticipant?.settled ? 'is-settled' : ''}><span>我的應付</span>{currentParticipant ? <><strong>{formatAmount(personalAmount, expense.currency)}</strong>{currentParticipant.settled && <small><CheckCircle2 size={13} />已結清</small>}</> : <strong className="expense-not-joined">加入後計算</strong>}</div></div>
            <div className="expense-participant-list"><div className="expense-participant-heading"><span>分帳成員</span><span>{participants.length} 人</span></div>{participants.map((participant) => <div className={`expense-participant${participant.settled ? ' is-settled' : ''}`} key={participant.uid}><span>{participant.name || '旅人'}{participant.uid === expense.creatorId && <small>建立者</small>}</span><span>{participant.settled ? <><CheckCircle2 size={13} />已結清</> : isOwner && participant.uid !== user.uid ? <button className="settle-button" type="button" onClick={() => onSettle(participant.uid)} disabled={working}><Check size={13} />標記結清</button> : '尚未結清'}</span></div>)}</div>
            <div className="expense-card-actions">{!currentParticipant && <button className="secondary-button" type="button" onClick={onJoin} disabled={working}><UserPlus size={15} />加入分帳</button>}{currentParticipant && !isOwner && <button className="secondary-button" type="button" onClick={onLeave} disabled={working}><UserMinus size={15} />退出分帳</button>}{isOwner && <><button className="text-button" type="button" onClick={onEdit}><Pencil size={14} />編輯</button><button className="danger-button" type="button" onClick={onRemove} disabled={working}><Trash2 size={14} />刪除</button></>}</div>
        </article>
    );
}

function PersonalExpenseCard({ expense, onEdit, onRemove, working }) {
    return (
        <article className="expense-card personal-expense-card">
            <div className="expense-card-topline"><span className="expense-category">{expense.category}</span><span className="expense-date">{formatDate(expense.createdAt)}</span></div>
            <div className="expense-card-title-row"><div><h3>{expense.title}</h3><p>{expense.description || '沒有補充描述'}</p></div><strong className="expense-original-amount">{formatAmount(expense.amount, expense.currency)}</strong></div>
            <div className="expense-meta-grid"><span><CreditCard size={14} />{expense.paymentMethod}</span><span><Receipt size={14} />個人帳目</span></div>
            <div className="expense-card-actions"><button className="text-button" type="button" onClick={onEdit}><Pencil size={14} />編輯</button><button className="danger-button" type="button" onClick={onRemove} disabled={working}><Trash2 size={14} />刪除</button></div>
        </article>
    );
}

export default function ExpensePage({ user, expenseStore }) {
    const [view, setView] = useState('shared');
    const [sharedExpenses, setSharedExpenses] = useState([]);
    const [personalExpenses, setPersonalExpenses] = useState([]);
    const [loadState, setLoadState] = useState('loading');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [formKind, setFormKind] = useState(null);
    const [editingExpense, setEditingExpense] = useState(null);
    const [working, setWorking] = useState(false);
    const [displayCurrency, setDisplayCurrency] = useState('TWD');
    const [jpyToTwd, setJpyToTwd] = useState(null);
    const [rateUpdatedAt, setRateUpdatedAt] = useState(null);

    useEffect(() => {
        const unsubscribeShared = expenseStore.subscribeShared(setSharedExpenses, () => {
            setLoadState('error');
            setError('無法讀取公帳，請檢查 Firebase Realtime Database 設定。');
        });
        const unsubscribePersonal = expenseStore.subscribePersonal(user.uid, setPersonalExpenses, () => {
            setLoadState('error');
            setError('無法讀取個人帳目，請檢查 Firebase Realtime Database 設定。');
        });
        setLoadState('ready');
        return () => {
            unsubscribeShared();
            unsubscribePersonal();
        };
    }, [expenseStore, user.uid]);

    useEffect(() => {
        let active = true;
        async function loadRate() {
            try {
                const response = await fetch('https://open.er-api.com/v6/latest/JPY');
                if (!response.ok) throw new Error('Exchange rate request failed');
                const result = await response.json();
                const rate = Number(result.rates?.TWD);
                if (!active || !rate) throw new Error('Exchange rate unavailable');
                setJpyToTwd(rate);
                setRateUpdatedAt(new Date());
            } catch {
                if (active) setError('即時匯率暫時無法取得，請稍後重試。');
            }
        }
        loadRate();
        const interval = window.setInterval(loadRate, 30 * 60 * 1000);
        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, []);

    const participatingSharedExpenses = useMemo(() => sharedExpenses.filter((expense) => participantEntries(expense).some((participant) => participant.uid === user.uid)), [sharedExpenses, user.uid]);
    const totalTwd = useMemo(() => {
        if (!jpyToTwd) return null;
        const personalTotal = personalExpenses.reduce((total, expense) => total + (expense.currency === 'JPY' ? Number(expense.amount) * jpyToTwd : Number(expense.amount)), 0);
        const sharedTotal = participatingSharedExpenses.reduce((total, expense) => {
            const participant = participantEntries(expense).find((item) => item.uid === user.uid);
            if (participant?.settled) return total;
            const personalAmount = Number(expense.amount) / Math.max(participantEntries(expense).length, 1);
            return total + (expense.currency === 'JPY' ? personalAmount * jpyToTwd : personalAmount);
        }, 0);
        return personalTotal + sharedTotal;
    }, [jpyToTwd, personalExpenses, participatingSharedExpenses, user.uid]);

    function resetForm() {
        setFormKind(null);
        setEditingExpense(null);
    }

    async function saveExpense(form) {
        setWorking(true);
        setError('');
        try {
            if (formKind === 'shared') {
                if (editingExpense) await expenseStore.updateShared(editingExpense.id, form);
                else await expenseStore.createShared(user.uid, user.displayName || user.email?.split('@')[0], form);
            } else if (editingExpense) await expenseStore.updatePersonal(user.uid, editingExpense.id, form);
            else await expenseStore.createPersonal(user.uid, form);
            setNotice('帳目已儲存');
            resetForm();
        } catch {
            setError('帳目儲存失敗，請確認 Firebase 設定後再試。');
        } finally {
            setWorking(false);
        }
    }

    async function removeExpense(kind, expense) {
        if (!window.confirm(`確定要刪除「${expense.title}」嗎？`)) return;
        setWorking(true);
        try {
            if (kind === 'shared') await expenseStore.removeShared(expense.id);
            else await expenseStore.removePersonal(user.uid, expense.id);
            setNotice('帳目已刪除');
        } catch {
            setError('帳目刪除失敗，請稍後再試。');
        } finally {
            setWorking(false);
        }
    }

    async function joinExpense(expense) {
        setWorking(true);
        try {
            await expenseStore.joinShared(expense.id, user.uid, user.displayName || user.email?.split('@')[0]);
            setNotice('已加入分帳');
        } catch {
            setError('加入分帳失敗，請稍後再試。');
        } finally {
            setWorking(false);
        }
    }

    async function leaveExpense(expense) {
        if (!window.confirm(`確定要退出「${expense.title}」的分帳嗎？`)) return;
        setWorking(true);
        try {
            await expenseStore.leaveShared(expense.id, user.uid);
            setNotice('已退出分帳');
        } catch {
            setError('退出分帳失敗，請稍後再試。');
        } finally {
            setWorking(false);
        }
    }

    async function settleParticipant(expense, participantUid) {
        setWorking(true);
        try {
            await expenseStore.setParticipantSettled(expense.id, participantUid, true);
            setNotice('已標記為結清');
        } catch {
            setError('更新結清狀態失敗，請稍後再試。');
        } finally {
            setWorking(false);
        }
    }

    function openCreate(kind) {
        setEditingExpense(null);
        setFormKind(kind);
        setNotice('');
    }

    function openEdit(kind, expense) {
        setEditingExpense(expense);
        setFormKind(kind);
        setNotice('');
    }

    const formInitialValue = editingExpense ? {
        title: editingExpense.title || '',
        description: editingExpense.description || '',
        amount: editingExpense.amount || '',
        currency: editingExpense.currency || 'JPY',
        category: editingExpense.category || '飲食',
        paymentMethod: editingExpense.paymentMethod || '現金支付',
    } : emptyForm;

    const displayTotal = totalTwd === null ? null : displayCurrency === 'TWD' ? totalTwd : totalTwd / jpyToTwd;

    return (
        <section className="detail-page expense-page">
            <div className="page-heading expense-page-heading"><div><p className="section-eyebrow">TRIP EXPENSES</p><h1>記帳幫手</h1><p>一起記錄旅程支出，清楚知道每個人的應付金額。</p></div><Receipt className="expense-heading-icon" size={38} /></div>
            <div className="expense-toolbar"><div className="expense-tabs"><button className={view === 'shared' ? 'active' : ''} type="button" onClick={() => setView('shared')}>公帳清單<span>{sharedExpenses.length}</span></button><button className={view === 'personal' ? 'active' : ''} type="button" onClick={() => setView('personal')}>我的帳目<span>{personalExpenses.length}</span></button></div><button className="primary-button" type="button" onClick={() => openCreate(view)}><Plus size={16} />新增{view === 'shared' ? '公帳' : '個人帳'}</button></div>
            {error && <div className="expense-notice expense-notice-error">{error}</div>}
            {notice && <div className="expense-notice expense-notice-success">{notice}</div>}
            {formKind && <ExpenseForm kind={formKind} initialValue={formInitialValue} onSubmit={saveExpense} onCancel={resetForm} working={working} />}
            {loadState === 'loading' ? <div className="expense-empty">正在讀取帳目…</div> : view === 'shared' ? (
                <div className="expense-list">{sharedExpenses.length ? sharedExpenses.map((expense) => <SharedExpenseCard key={expense.id} expense={expense} user={user} onJoin={() => joinExpense(expense)} onLeave={() => leaveExpense(expense)} onEdit={() => openEdit('shared', expense)} onRemove={() => removeExpense('shared', expense)} onSettle={(participantUid) => settleParticipant(expense, participantUid)} working={working} />) : <div className="expense-empty"><Receipt size={26} /><strong>還沒有公帳</strong><span>先建立第一筆旅程公帳吧。</span></div>}</div>
            ) : <div className="expense-list">{personalExpenses.length ? personalExpenses.map((expense) => <PersonalExpenseCard key={expense.id} expense={expense} onEdit={() => openEdit('personal', expense)} onRemove={() => removeExpense('personal', expense)} working={working} />) : <div className="expense-empty"><Wallet size={26} /><strong>還沒有個人帳目</strong><span>記下只屬於自己的旅程支出。</span></div>}</div>}
            <div className="expense-total-bar"><div><span>目前個人應付總額</span><strong>{displayTotal === null ? '匯率讀取中…' : formatAmount(displayTotal, displayCurrency)}</strong><small>{rateUpdatedAt ? `即時匯率更新於 ${formatDate(rateUpdatedAt.getTime())}` : '正在取得即時匯率'}</small></div><div className="currency-toggle" aria-label="總額顯示幣別"><button className={displayCurrency === 'TWD' ? 'active' : ''} type="button" onClick={() => setDisplayCurrency('TWD')}>台幣</button><button className={displayCurrency === 'JPY' ? 'active' : ''} type="button" onClick={() => setDisplayCurrency('JPY')}>日圓</button></div></div>
        </section>
    );
}
