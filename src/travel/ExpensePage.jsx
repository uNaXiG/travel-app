import { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Check,
    CreditCard,
    Lock,
    Pencil,
    Plus,
    Receipt,
    Trash2,
    Undo2,
    UserMinus,
    UserPlus,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { totalExpensesInCurrency, totalExpensesInTwd, totalsByCurrency } from '../expenseUtils.js';
import Modal from './Modal.jsx';

const categories = ['車票', '機票', '住宿', '門票', '飲食', '購物'];
const paymentMethods = ['現金支付', '信用卡', 'Apple Pay', '其他線上支付'];
const emptyForm = {
    title: '',
    description: '',
    amount: '',
    currency: 'JPY',
    category: '飲食',
    paymentMethod: '現金支付',
    paymentStatus: 'paid',
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

function isExpensePaid(expense) {
    const payer = participantEntries(expense).find((participant) => participant.uid === expense.creatorId);
    return expense.paymentStatus ? expense.paymentStatus === 'paid' : Boolean(payer?.settled);
}

function expenseSharesInMinorUnits(expense) {
    const participants = participantEntries(expense).filter((participant) => participant.uid).sort((first, second) => first.uid.localeCompare(second.uid));
    if (!participants.length) return [];
    const multiplier = expense.currency === 'JPY' ? 1 : 100;
    const total = Math.round(Number(expense.amount || 0) * multiplier);
    const baseShare = Math.floor(total / participants.length);
    const remainder = total - baseShare * participants.length;
    return participants.map((participant, index) => ({
        participant,
        amount: baseShare + (index < remainder ? 1 : 0),
    }));
}

function calculateSuggestedTransfers(expenses) {
    const balancesByCurrency = new Map();

    expenses.forEach((expense) => {
        const shares = expenseSharesInMinorUnits(expense);
        if (!shares.length) return;
        const currency = expense.currency || 'JPY';
        const balances = balancesByCurrency.get(currency) || new Map();
        const payer = expense.creatorId;
        const total = Math.round(Number(expense.amount || 0) * (currency === 'JPY' ? 1 : 100));
        balances.set(payer, (balances.get(payer) || 0) + total);

        shares.forEach(({ participant, amount }) => {
            balances.set(participant.uid, (balances.get(participant.uid) || 0) - amount);
            if (participant.uid !== payer && participant.settled) {
                balances.set(participant.uid, (balances.get(participant.uid) || 0) + amount);
                balances.set(payer, (balances.get(payer) || 0) - amount);
            }
        });
        balancesByCurrency.set(currency, balances);
    });

    return [...balancesByCurrency.entries()].flatMap(([currency, balances]) => {
        const creditors = [...balances].filter(([, balance]) => balance > 0).sort(([first], [second]) => first.localeCompare(second));
        const debtors = [...balances].filter(([, balance]) => balance < 0).sort(([first], [second]) => first.localeCompare(second));
        const transfers = [];
        let creditorIndex = 0;
        let debtorIndex = 0;

        while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
            const [to, credit] = creditors[creditorIndex];
            const [from, debt] = debtors[debtorIndex];
            const amount = Math.min(credit, -debt);
            if (amount > 0) transfers.push({ from, to, amount, currency });
            creditors[creditorIndex][1] -= amount;
            debtors[debtorIndex][1] += amount;
            if (creditors[creditorIndex][1] === 0) creditorIndex += 1;
            if (debtors[debtorIndex][1] === 0) debtorIndex += 1;
        }
        return transfers;
    });
}

function ParticipantAvatar({ participant, isPayer, onSelect }) {
    const [imageFailed, setImageFailed] = useState(false);
    const initial = (participant.name || '旅').slice(0, 1).toUpperCase();
    const statusLabel = isPayer ? (participant.settled ? '已先付款' : '尚未付款') : (participant.settled ? '已結清' : '尚未結清');

    useEffect(() => {
        setImageFailed(false);
    }, [participant.photoURL]);

    return (
        <div className="expense-avatar-wrap">
            <button
                className="expense-avatar-button"
                type="button"
                aria-label={`查看／標記結清 ${participant.name || '使用者'}（${statusLabel}）`}
                title={`${participant.name || '旅人'} · ${statusLabel}（點擊標記結清）`}
                onClick={onSelect}
            >
                {participant.photoURL && !imageFailed ? (
                    <img className="expense-avatar" src={participant.photoURL} alt="" onError={() => setImageFailed(true)} />
                ) : (
                    <span className="expense-avatar expense-avatar-initial">{initial}</span>
                )}
                <span className={`expense-avatar-status${participant.settled ? ' is-settled' : ' is-unsettled'}`} aria-label={statusLabel}>
                    {participant.settled ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                </span>
            </button>
        </div>
    );
}

function ExpenseSettleModal({ expense, participant, currentUserId, onClose, onConfirm, working }) {
    const [imageFailed, setImageFailed] = useState(false);
    const isOwner = expense.creatorId === currentUserId;
    const isPayer = participant.uid === expense.creatorId;
    const canToggleStatus = isOwner && (!isPayer || !participant.settled);
    const initial = (participant.name || '旅').slice(0, 1).toUpperCase();

    const shares = expenseSharesInMinorUnits(expense);
    const shareMinor = shares.find((s) => s.participant.uid === participant.uid)?.amount || 0;
    const multiplier = expense.currency === 'JPY' ? 1 : 100;
    const shareAmount = formatAmount(shareMinor / multiplier, expense.currency);
    const statusLabel = isPayer ? (participant.settled ? '已先付款' : '尚未付款') : (participant.settled ? '已結清' : '尚未結清');

    useEffect(() => {
        setImageFailed(false);
    }, [participant.photoURL]);

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            eyebrow="SETTLEMENT STATUS"
            title="標記結清"
            footer={
                canToggleStatus ? (
                    <>
                        <button className="secondary-button" type="button" onClick={onClose} disabled={working}>取消</button>
                        <button className="primary-button" type="button" onClick={() => onConfirm(participant.uid, !participant.settled)} disabled={working}>
                            {working ? '處理中…' : participant.settled ? (isPayer ? '確認取消付款' : '確認取消結清') : (isPayer ? '確認標記已付款' : '確認標記結清')}
                        </button>
                    </>
                ) : (
                    <button className="primary-button" type="button" onClick={onClose}>關閉</button>
                )
            }
        >
            <div className="expense-settle-body">
                <div className="expense-settle-target-info">
                    <div>
                        <span>公帳支出</span>
                        <strong>{expense.title}</strong>
                    </div>
                    <strong className="expense-settle-target-total">{formatAmount(expense.amount, expense.currency)}</strong>
                </div>

                <div className="expense-settle-user-card">
                    <div className="expense-settle-user-avatar">
                        {participant.photoURL && !imageFailed ? (
                            <img src={participant.photoURL} alt="" onError={() => setImageFailed(true)} />
                        ) : (
                            initial
                        )}
                    </div>
                    <div className="expense-settle-user-details">
                        <div className="expense-settle-user-topline">
                            <strong>{participant.name || '旅人'}</strong>
                            <span className={`expense-settle-role-tag${isPayer ? ' is-payer' : ''}`}>
                                {isPayer ? '付款人 (建立者)' : '分帳成員'}
                            </span>
                        </div>
                        <small>加入時間：{formatDate(participant.joinedAt)}</small>
                    </div>
                </div>

                <div className="expense-settle-amounts">
                    <div className="expense-settle-amount-box">
                        <span>應分攤金額</span>
                        <strong>{shareAmount}</strong>
                    </div>
                    <div className="expense-settle-amount-box">
                        <span>目前狀態</span>
                        <strong className={`expense-settle-status-tag${participant.settled ? ' is-settled' : ' is-unsettled'}`}>
                            {participant.settled ? <Check size={15} strokeWidth={2.5} /> : <X size={15} strokeWidth={2.5} />}
                            {statusLabel}
                        </strong>
                    </div>
                </div>

                {canToggleStatus ? (
                    <div className="expense-settle-prompt-box">
                        {participant.settled
                            ? `目前此成員已標記為${statusLabel}。點擊確認後將取消結清狀態。`
                            : `確定要將「${participant.name || '旅人'}」的分帳狀態標記為「${isPayer ? '已先付款' : '已結清'}」嗎？確認後將更新轉帳資料。`}
                    </div>
                ) : (
                    <div className="expense-settle-permission-hint">
                        {!isOwner
                            ? '只有公帳建立者可變更分帳成員的付款與結清狀態。'
                            : '已先付款的公帳付款人不可更改狀態，以確保帳目正確。'}
                    </div>
                )}
            </div>
        </Modal>
    );
}

function ExpenseLockModal({ expense, onClose, onConfirmLock, working }) {
    const participants = participantEntries(expense);
    const multiplier = expense.currency === 'JPY' ? 1 : 100;
    const shares = expenseSharesInMinorUnits(expense);
    const transfers = useMemo(() => calculateSuggestedTransfers([expense]), [expense]);

    const participantMap = useMemo(() => {
        const map = new Map();
        participants.forEach((p) => map.set(p.uid, p.name || '旅人'));
        return map;
    }, [participants]);

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            eyebrow="LOCK EXPENSE"
            title="鎖定分帳"
            footer={
                <button
                    className="expense-lock-confirm-button"
                    type="button"
                    onClick={() => onConfirmLock(expense.id)}
                    disabled={working}
                >
                    <Lock size={15} />
                    {working ? '正在鎖定中…' : '確認鎖定分帳'}
                </button>
            }
        >
            <div className="expense-lock-body">
                <div className="expense-lock-warning-banner">
                    <AlertTriangle size={18} />
                    <div>
                        <strong>注意：鎖定分帳為不可逆操作！</strong>
                        <div>鎖定後將無法再有新成員加入分帳，且現有成員無法退出。請核對以下分帳成員與轉帳結論。</div>
                    </div>
                </div>

                <div className="expense-lock-target-info">
                    <strong>{expense.title}</strong>
                    <span>{formatAmount(expense.amount, expense.currency)}</span>
                </div>

                <div className="expense-lock-section">
                    <h3 className="expense-lock-section-title">
                        <span>參與分帳成員</span>
                        <span>共 {participants.length} 人</span>
                    </h3>
                    <div className="expense-lock-participants-list">
                        {participants.map((participant) => {
                            const isPayer = participant.uid === expense.creatorId;
                            const initial = (participant.name || '旅').slice(0, 1).toUpperCase();
                            const shareItem = shares.find((s) => s.participant.uid === participant.uid);
                            const shareText = shareItem ? formatAmount(shareItem.amount / multiplier, expense.currency) : '';
                            const statusText = isPayer ? (participant.settled ? '已先付款' : '尚未付款') : (participant.settled ? '已結清' : '尚未結清');
                            return (
                                <div className="expense-lock-participant-row" key={participant.uid}>
                                    <div className="expense-lock-participant-main">
                                        <span className="expense-lock-participant-avatar">
                                            {participant.photoURL ? <img src={participant.photoURL} alt="" /> : initial}
                                        </span>
                                        <span className="expense-lock-participant-name">{participant.name || '旅人'}</span>
                                        <span className={`expense-settle-role-tag${isPayer ? ' is-payer' : ''}`}>
                                            {isPayer ? '付款人' : '成員'}
                                        </span>
                                    </div>
                                    <div className="expense-lock-participant-meta">
                                        <span className="expense-lock-participant-share">應分攤 {shareText}</span>
                                        <span className={`expense-settle-status-tag${participant.settled ? ' is-settled' : ' is-unsettled'}`}>
                                            {statusText}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="expense-lock-section">
                    <h3 className="expense-lock-section-title">
                        <span>建議轉帳結論</span>
                    </h3>
                    <div className="expense-lock-transfers-card">
                        {transfers.length > 0 ? (
                            transfers.map((transfer, index) => (
                                <div className="expense-lock-transfer-item" key={index}>
                                    <span className="expense-lock-transfer-from">{participantMap.get(transfer.from) || '旅人'}</span>
                                    <ArrowRight size={14} className="expense-lock-transfer-arrow" />
                                    <span className="expense-lock-transfer-to">{participantMap.get(transfer.to) || '旅人'}</span>
                                    <span className="expense-lock-transfer-text">轉帳</span>
                                    <strong className="expense-lock-transfer-amount">{formatAmount(transfer.amount / multiplier, transfer.currency)}</strong>
                                </div>
                            ))
                        ) : (
                            <p className="expense-lock-transfer-empty">目前沒有待結清款項（款項皆已結清或由建立者全額支付）。</p>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}

function ExpenseParticipantsListModal({ expense, onClose, onSelectParticipant }) {
    const participants = participantEntries(expense);
    const multiplier = expense.currency === 'JPY' ? 1 : 100;
    const shares = expenseSharesInMinorUnits(expense);

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            eyebrow="PARTICIPANTS"
            title="分帳成員列表"
            footer={
                <button className="primary-button" type="button" onClick={onClose}>關閉</button>
            }
        >
            <div className="expense-lock-body">
                <div className="expense-lock-target-info">
                    <strong>{expense.title}</strong>
                    <span>共 {participants.length} 位成員</span>
                </div>
                <div className="expense-lock-participants-list" style={{ maxHeight: '360px' }}>
                    {participants.map((participant) => {
                        const isPayer = participant.uid === expense.creatorId;
                        const initial = (participant.name || '旅').slice(0, 1).toUpperCase();
                        const shareItem = shares.find((s) => s.participant.uid === participant.uid);
                        const shareText = shareItem ? formatAmount(shareItem.amount / multiplier, expense.currency) : '';
                        const statusText = isPayer ? (participant.settled ? '已先付款' : '尚未付款') : (participant.settled ? '已結清' : '尚未結清');
                        return (
                            <button
                                key={participant.uid}
                                type="button"
                                className="expense-lock-participant-row"
                                style={{ width: '100%', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                                onClick={() => {
                                    onClose();
                                    onSelectParticipant(expense, participant);
                                }}
                            >
                                <div className="expense-lock-participant-main">
                                    <span className="expense-lock-participant-avatar">
                                        {participant.photoURL ? <img src={participant.photoURL} alt="" /> : initial}
                                    </span>
                                    <span className="expense-lock-participant-name">{participant.name || '旅人'}</span>
                                    <span className={`expense-settle-role-tag${isPayer ? ' is-payer' : ''}`}>
                                        {isPayer ? '付款人' : '成員'}
                                    </span>
                                </div>
                                <div className="expense-lock-participant-meta">
                                    <span className="expense-lock-participant-share">{shareText}</span>
                                    <span className={`expense-settle-status-tag${participant.settled ? ' is-settled' : ' is-unsettled'}`}>
                                        {statusText}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
}

function ExpenseForm({ kind, initialValue, isEditing, onSubmit, onCancel, working }) {
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
                <div><p className="section-eyebrow">{isShared ? 'SHARED EXPENSE' : 'PERSONAL EXPENSE'}</p><h2>{isEditing ? '編輯帳目' : '新增帳目'}</h2></div>
                <button className="icon-button" type="button" aria-label="關閉表單" onClick={onCancel}><X size={17} /></button>
            </div>
            <div className="expense-form-grid">
                <label><span>{isShared ? '公帳標題' : '私人帳目標題'}</span><input required maxLength={60} value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="例如：名古屋站到機場車票" /></label>
                <label><span>帳目分類</span><select value={form.category} onChange={(event) => updateField('category', event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="expense-form-wide"><span>描述</span><textarea maxLength={160} value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="補充這筆支出的內容" /></label>
                <label><span>金額</span><input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} placeholder="0" /></label>
                <label><span>幣別</span><select value={form.currency} onChange={(event) => updateField('currency', event.target.value)}><option value="JPY">日圓 JPY</option><option value="TWD">台幣 TWD</option></select></label>
                <label><span>付款方式</span><select value={form.paymentMethod} onChange={(event) => updateField('paymentMethod', event.target.value)}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
                {isShared && <label className="expense-payment-status"><span className="expense-checkbox-label"><input type="checkbox" checked={form.paymentStatus === 'paid'} disabled={Boolean(isEditing && form.paymentStatus === 'paid')} title={isEditing && form.paymentStatus === 'paid' ? '已先付款的公帳不可更改' : undefined} onChange={(event) => updateField('paymentStatus', event.target.checked ? 'paid' : 'unpaid')} /><strong>已先付款</strong></span></label>}
            </div>
            <div className="expense-form-actions"><button className="secondary-button" type="button" onClick={onCancel}>取消</button><button className="primary-button" type="submit" disabled={working}>{working ? '儲存中…' : '儲存帳目'}</button></div>
        </form>
    );
}

function SharedExpenseCard({ expense, user, onJoin, onLeave, onEdit, onRemove, onSelectParticipant, onOpenLock, working }) {
    const participants = participantEntries(expense);
    const currentParticipant = participants.find((participant) => participant.uid === user.uid);
    const isOwner = expense.creatorId === user.uid;
    const personalAmount = expenseSharesInMinorUnits(expense).find(({ participant }) => participant.uid === user.uid)?.amount;
    const paid = isExpensePaid(expense);
    const myShareSettled = currentParticipant ? (currentParticipant.uid === expense.creatorId ? paid : currentParticipant.settled) : false;
    const visibleParticipants = participants.slice(0, 5);
    const hiddenParticipants = participants.slice(5);

    function canToggleParticipant(participant) {
        return isOwner && (participant.uid !== expense.creatorId || !participant.settled);
    }

    const firstUnsettled = participants.find((p) => canToggleParticipant(p) && !p.settled) || participants[0];

    return (
        <article className={`expense-card${expense.locked ? ' is-locked' : ''}`}>
            <div className="expense-card-topline">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="expense-category">{expense.category}</span>
                    {expense.locked && (
                        <span className="expense-locked-badge">
                            <Lock size={12} /> 分帳已鎖定
                        </span>
                    )}
                </div>
                {isOwner && (
                    <div className="expense-card-owner-actions">
                        <button className="expense-icon-action" type="button" aria-label="編輯公帳" title="編輯公帳" onClick={onEdit}><Pencil size={15} /></button>
                        <button className="expense-icon-action expense-icon-action-danger" type="button" aria-label="刪除公帳" title="刪除公帳" onClick={onRemove} disabled={working}><Trash2 size={15} /></button>
                    </div>
                )}
            </div>
            <div className="expense-card-title-row">
                <div><h3>{expense.title}</h3>{expense.description && <p>{expense.description}</p>}</div>
            </div>
            <div className="expense-meta-grid">
                <span><Users size={14} />{participants.length} 人均分</span>
                <span><Wallet size={14} />{expense.paymentMethod}</span>
                <span><Receipt size={14} />{paid ? `付款人：${expense.creatorName}` : '尚未付款'}</span>
                <div className="expense-meta-participants" aria-label="分帳成員">
                    <div className="expense-avatar-row">
                        {visibleParticipants.map((participant) => (
                            <ParticipantAvatar
                                key={participant.uid}
                                participant={participant}
                                isPayer={participant.uid === expense.creatorId}
                                onSelect={() => onSelectParticipant(expense, participant)}
                            />
                        ))}
                        {hiddenParticipants.length > 0 && (
                            <div className="expense-avatar-wrap">
                                <button
                                    className="expense-avatar-button expense-avatar-overflow"
                                    type="button"
                                    aria-label={`查看另外 ${hiddenParticipants.length} 位使用者`}
                                    onClick={() => onSelectParticipant(expense, '__overflow__')}
                                >
                                    +{hiddenParticipants.length}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="expense-finance-row">
                <div className="expense-split-summary">
                    <div><span>原始金額</span><strong>{formatAmount(expense.amount, expense.currency)}</strong></div>
                    <div>
                        <span>我的分攤</span>
                        {currentParticipant ? <div className="expense-share-value"><strong>{formatAmount(personalAmount / (expense.currency === 'JPY' ? 1 : 100), expense.currency)}</strong><span className={`expense-share-status${myShareSettled ? ' is-settled' : ' is-unsettled'}`} aria-label={myShareSettled ? '已結清' : '尚未結清'}>{myShareSettled ? <Check size={15} /> : <X size={15} />}</span></div> : <strong className="expense-not-joined">加入後計算</strong>}
                    </div>
                </div>
            </div>
            <div className="expense-card-footer">
                <div className="expense-card-actions">
                    {/* 建立者快捷標記結清按鈕 */}
                    {isOwner && firstUnsettled && (
                        <button
                            className="secondary-button"
                            type="button"
                            aria-label="標記結清"
                            onClick={() => onSelectParticipant(expense, firstUnsettled)}
                            disabled={working}
                        >
                            <Check size={14} />標記結清
                        </button>
                    )}
                    {/* 建立者鎖定分帳按鈕（不可逆） */}
                    {isOwner && !expense.locked && (
                        <button
                            className="secondary-button expense-lock-button"
                            type="button"
                            aria-label="鎖定分帳"
                            onClick={() => onOpenLock(expense)}
                            disabled={working}
                        >
                            <Lock size={14} />鎖定分帳
                        </button>
                    )}

                    {/* 非參與者：若已鎖定則禁止加入，否則可加入分帳 */}
                    {!currentParticipant && (
                        expense.locked ? (
                            <span className="expense-locked-hint">
                                <Lock size={13} />此公帳已鎖定，無法加入分帳
                            </span>
                        ) : (
                            <button className="secondary-button" type="button" onClick={onJoin} disabled={working}>
                                <UserPlus size={15} />加入分帳
                            </button>
                        )
                    )}

                    {/* 參與者（非建立者）：若未鎖定可退出，已鎖定則不可退出 */}
                    {currentParticipant && !isOwner && (
                        expense.locked ? (
                            <span className="expense-locked-status-tag">
                                <Lock size={13} />分帳已鎖定
                            </span>
                        ) : (
                            <button className="secondary-button" type="button" onClick={onLeave} disabled={working}>
                                <UserMinus size={15} />退出分帳
                            </button>
                        )
                    )}
                </div>
                <span className="expense-date">{formatDate(expense.createdAt)}</span>
            </div>
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

function formatSummaryAmount(expenses, jpyToTwd) {
    const totalTwd = totalExpensesInTwd(expenses, jpyToTwd);
    if (totalTwd !== null) return formatAmount(totalTwd, 'TWD');
    const totals = totalsByCurrency(expenses);
    const amounts = [];
    if (totals.TWD) amounts.push(formatAmount(totals.TWD, 'TWD'));
    if (totals.JPY) amounts.push(formatAmount(totals.JPY, 'JPY'));
    return amounts.length ? amounts.join(' · ') : formatAmount(0, 'TWD');
}

function ExpenseTripSummary({ trip, data, jpyToTwd, onOpen }) {
    const sharedExpenses = data?.shared || [];
    const personalExpenses = data?.personal || [];
    const sharedAmount = data?.sharedError ? '無法讀取' : data?.sharedReady ? formatSummaryAmount(sharedExpenses, jpyToTwd) : '讀取中…';
    const personalAmount = data?.personalError ? '無法讀取' : data?.personalReady ? formatSummaryAmount(personalExpenses, jpyToTwd) : '讀取中…';

    return (
        <button className="expense-trip-summary" type="button" onClick={onOpen} aria-label={`開啟${trip.title}記帳，公帳總計 ${sharedAmount}，私人花費 ${personalAmount}`}>
            <span className="expense-trip-summary-name"><strong>{trip.title}</strong><small>旅行 ID · {trip.id}</small></span>
            <span className="expense-trip-summary-total"><small>公帳總計</small><strong>{sharedAmount}</strong></span>
            <span className="expense-trip-summary-total is-personal"><small>私人花費</small><strong>{personalAmount}</strong></span>
            <ArrowRight size={18} aria-hidden="true" />
        </button>
    );
}

function ExpenseTripDialog({ user, expenseStore, trip, expenseData, jpyToTwd, rateUpdatedAt, rateError, onClose }) {
    const [view, setView] = useState('shared');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [formKind, setFormKind] = useState(null);
    const [editingExpense, setEditingExpense] = useState(null);
    const [working, setWorking] = useState(false);
    const [displayCurrency, setDisplayCurrency] = useState('TWD');
    const [settlingTarget, setSettlingTarget] = useState(null);
    const [lockingExpense, setLockingExpense] = useState(null);
    const [participantsListExpense, setParticipantsListExpense] = useState(null);
    const sharedExpenses = expenseData?.shared || [];
    const personalExpenses = expenseData?.personal || [];
    const loadState = expenseData?.sharedReady && expenseData?.personalReady ? 'ready' : 'loading';

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        if (!notice) return undefined;
        const timer = window.setTimeout(() => setNotice(''), 3000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const suggestedTransfers = useMemo(() => calculateSuggestedTransfers(sharedExpenses), [sharedExpenses]);
    const participantNames = useMemo(() => {
        const names = new Map();
        sharedExpenses.forEach((expense) => participantEntries(expense).forEach((participant) => names.set(participant.uid, participant.name || '旅人')));
        return names;
    }, [sharedExpenses]);
    const sharedTotalTwd = useMemo(() => totalExpensesInTwd(sharedExpenses, jpyToTwd), [sharedExpenses, jpyToTwd]);
    const personalTotalTwd = useMemo(() => totalExpensesInTwd(personalExpenses, jpyToTwd), [personalExpenses, jpyToTwd]);

    function resetForm() {
        setFormKind(null);
        setEditingExpense(null);
    }

    async function saveExpense(form) {
        setWorking(true);
        setError('');
        try {
            if (formKind === 'shared') {
                if (editingExpense) await expenseStore.updateShared(trip.id, editingExpense.id, user.uid, form);
                else await expenseStore.createShared(trip.id, user.uid, { name: user.displayName || user.email?.split('@')[0], photoURL: user.photoURL || '' }, form);
            } else if (editingExpense) await expenseStore.updatePersonal(user.uid, trip.id, editingExpense.id, form);
            else await expenseStore.createPersonal(user.uid, trip.id, form);
            setNotice('帳目已儲存');
            resetForm();
        } catch (err) {
            console.error('saveExpense failed:', err);
            setError(err?.message || '帳目儲存失敗，請確認 Firebase 設定後再試。');
        } finally {
            setWorking(false);
        }
    }

    async function removeExpense(kind, expense) {
        if (!window.confirm(`確定要刪除「${expense.title}」嗎？`)) return;
        setWorking(true);
        try {
            if (kind === 'shared') await expenseStore.removeShared(trip.id, expense.id);
            else await expenseStore.removePersonal(user.uid, trip.id, expense.id);
            setNotice('帳目已刪除');
        } catch {
            setError('帳目刪除失敗，請稍後再試。');
        } finally {
            setWorking(false);
        }
    }

    async function joinExpense(expense) {
        if (expense.locked) {
            setError('此公帳分帳已鎖定，無法加入。');
            return;
        }
        setWorking(true);
        try {
            await expenseStore.joinShared(trip.id, expense.id, user.uid, { name: user.displayName || user.email?.split('@')[0], photoURL: user.photoURL || '' });
            setNotice('已加入分帳');
        } catch {
            setError('加入分帳失敗，請稍後再試。');
        } finally {
            setWorking(false);
        }
    }

    async function leaveExpense(expense) {
        if (expense.locked) {
            setError('此公帳分帳已鎖定，無法退出。');
            return;
        }
        if (!window.confirm(`確定要退出「${expense.title}」的分帳嗎？`)) return;
        setWorking(true);
        try {
            await expenseStore.leaveShared(trip.id, expense.id, user.uid);
            setNotice('已退出分帳');
        } catch {
            setError('退出分帳失敗，請稍後再試。');
        } finally {
            setWorking(false);
        }
    }

    async function settleParticipant(expense, participantUid, settled) {
        setWorking(true);
        try {
            await expenseStore.setParticipantSettled(trip.id, expense.id, participantUid, settled, expense.creatorId);
            setNotice(settled ? '已標記為結清' : '已取消結清標記');
            setSettlingTarget(null);
        } catch {
            setError('更新結清狀態失敗，請稍後再試。');
        } finally {
            setWorking(false);
        }
    }

    async function lockExpense(expenseId) {
        setWorking(true);
        try {
            await expenseStore.lockShared(trip.id, expenseId);
            setNotice('公帳分帳已鎖定');
            setLockingExpense(null);
        } catch {
            setError('鎖定分帳失敗，請稍後再試。');
        } finally {
            setWorking(false);
        }
    }

    function handleSelectParticipant(expense, participant) {
        if (participant === '__overflow__') {
            setParticipantsListExpense(expense);
        } else {
            setSettlingTarget({ expense, participant });
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
        paymentStatus: editingExpense.paymentStatus || (participantEntries(editingExpense).find((participant) => participant.uid === editingExpense.creatorId)?.settled ? 'paid' : 'unpaid'),
    } : emptyForm;

    const activeExpenses = view === 'shared' ? sharedExpenses : personalExpenses;
    const displayTotal = totalExpensesInCurrency(activeExpenses, displayCurrency, jpyToTwd);

    const activeSettlingExpense = settlingTarget ? sharedExpenses.find((e) => e.id === settlingTarget.expense.id) || settlingTarget.expense : null;
    const activeSettlingParticipant = activeSettlingExpense && settlingTarget ? participantEntries(activeSettlingExpense).find((p) => p.uid === settlingTarget.participant.uid) || settlingTarget.participant : null;
    const activeLockingExpense = lockingExpense ? sharedExpenses.find((e) => e.id === lockingExpense.id) || lockingExpense : null;
    const activeOverflowExpense = participantsListExpense ? sharedExpenses.find((e) => e.id === participantsListExpense.id) || participantsListExpense : null;

    return (
        <div className="expense-modal-backdrop">
            <section className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
                <header className="expense-modal-header">
                    <div><p>{trip.country || 'TRIP EXPENSES'} · 記帳明細</p><h2 id="expense-modal-title">{trip.title}</h2><small>旅行 ID · {trip.id}</small></div>
                    <button className="expense-modal-close" type="button" aria-label="關閉記帳明細" onClick={onClose}><X size={19} /></button>
                </header>
                <div className="expense-modal-content">
                    <section className="detail-page expense-page">
                        <div className="page-heading expense-page-heading"><div><p className="section-eyebrow">TRIP EXPENSES</p><h1>記帳幫手</h1><p>公帳與私人花費分開統計。</p></div><Receipt className="expense-heading-icon" size={38} /></div>
                        <div className="expense-toolbar"><div className="expense-tabs"><button className={view === 'shared' ? 'active' : ''} type="button" onClick={() => setView('shared')}>公帳清單<span>{sharedExpenses.length}</span></button><button className={view === 'personal' ? 'active' : ''} type="button" onClick={() => setView('personal')}>我的帳目<span>{personalExpenses.length}</span></button></div><button className="primary-button" type="button" onClick={() => openCreate(view)}><Plus size={16} />新增{view === 'shared' ? '公帳' : '個人帳'}</button></div>
                        {expenseData?.sharedError && <div className="expense-notice expense-notice-error">{expenseData.sharedError}</div>}
                        {expenseData?.personalError && <div className="expense-notice expense-notice-error">{expenseData.personalError}</div>}
                        {rateError && <div className="expense-notice expense-notice-error">即時匯率暫時無法取得，金額暫以原幣別顯示。</div>}
                        {error && <div className="expense-notice expense-notice-error">{error}</div>}
                        {notice && <div className="expense-notice expense-notice-success">{notice}</div>}
                        {view === 'shared' && <section className="expense-settlement-panel" aria-label="建議轉帳"><div className="expense-settlement-heading"><div><p className="section-eyebrow">SETTLEMENT</p><h2>建議轉帳</h2></div><span>此旅行公帳・同幣別淨額結算</span></div>{suggestedTransfers.length ? <div className="expense-transfer-list">{suggestedTransfers.map((transfer, index) => <div className="expense-transfer-row" key={`${transfer.currency}-${transfer.from}-${transfer.to}-${index}`}><strong>{participantNames.get(transfer.from) || '旅人'}</strong><ArrowRight size={15} /><strong>{participantNames.get(transfer.to) || '旅人'}</strong><span>轉帳</span><b>{formatAmount(transfer.amount / (transfer.currency === 'JPY' ? 1 : 100), transfer.currency)}</b></div>)}</div> : <p className="expense-settlement-empty">目前沒有待結清款項</p>}<p className="expense-settlement-note">只計算此旅行公帳的未結清分攤；同一成員間的金額會先合併抵銷。</p></section>}
                        {formKind && <ExpenseForm kind={formKind} initialValue={formInitialValue} isEditing={Boolean(editingExpense)} onSubmit={saveExpense} onCancel={resetForm} working={working} />}
                        {loadState === 'loading' ? <div className="expense-empty">正在讀取此旅行的帳目…</div> : view === 'shared' ? (
                            <div className="expense-list">{sharedExpenses.length ? sharedExpenses.map((expense) => <SharedExpenseCard key={expense.id} expense={expense} user={user} onJoin={() => joinExpense(expense)} onLeave={() => leaveExpense(expense)} onEdit={() => openEdit('shared', expense)} onRemove={() => removeExpense('shared', expense)} onSelectParticipant={handleSelectParticipant} onOpenLock={(targetExpense) => setLockingExpense(targetExpense)} working={working} />) : <div className="expense-empty"><Receipt size={26} /><strong>還沒有公帳</strong><span>先建立這趟旅行的第一筆公帳。</span></div>}</div>
                        ) : <div className="expense-list">{personalExpenses.length ? personalExpenses.map((expense) => <PersonalExpenseCard key={expense.id} expense={expense} onEdit={() => openEdit('personal', expense)} onRemove={() => removeExpense('personal', expense)} working={working} />) : <div className="expense-empty"><Wallet size={26} /><strong>還沒有個人帳目</strong><span>記下這趟旅行中只屬於自己的支出。</span></div>}</div>}
                        <div className="expense-total-bar"><div><span>{view === 'shared' ? '公帳總計' : '私人花費'}</span><strong>{displayTotal === null ? '匯率讀取中…' : formatAmount(displayTotal, displayCurrency)}</strong><small>{rateUpdatedAt ? `匯率更新於 ${formatDate(rateUpdatedAt.getTime())}` : '正在取得即時匯率'}</small></div><div className="currency-toggle" aria-label="總額顯示幣別"><button className={displayCurrency === 'TWD' ? 'active' : ''} type="button" onClick={() => setDisplayCurrency('TWD')}>台幣</button><button className={displayCurrency === 'JPY' ? 'active' : ''} type="button" onClick={() => setDisplayCurrency('JPY')}>日圓</button></div></div>
                    </section>
                </div>
            </section>

            {/* 置中的浮動視窗 (Modal) */}
            {activeSettlingExpense && activeSettlingParticipant && (
                <ExpenseSettleModal
                    expense={activeSettlingExpense}
                    participant={activeSettlingParticipant}
                    currentUserId={user.uid}
                    onClose={() => setSettlingTarget(null)}
                    onConfirm={(participantUid, settled) => settleParticipant(activeSettlingExpense, participantUid, settled)}
                    working={working}
                />
            )}
            {activeLockingExpense && (
                <ExpenseLockModal
                    expense={activeLockingExpense}
                    onClose={() => setLockingExpense(null)}
                    onConfirmLock={(expenseId) => lockExpense(expenseId)}
                    working={working}
                />
            )}
            {activeOverflowExpense && (
                <ExpenseParticipantsListModal
                    expense={activeOverflowExpense}
                    onClose={() => setParticipantsListExpense(null)}
                    onSelectParticipant={(expense, participant) => setSettlingTarget({ expense, participant })}
                />
            )}
        </div>
    );
}

export default function ExpensePage({ user, expenseStore, trips }) {
    const [selectedTripId, setSelectedTripId] = useState(null);
    const [tripExpenseData, setTripExpenseData] = useState({});
    const [jpyToTwd, setJpyToTwd] = useState(null);
    const [rateUpdatedAt, setRateUpdatedAt] = useState(null);
    const [rateError, setRateError] = useState(false);
    const tripIdsKey = trips.map(({ id }) => id).join('|');
    const selectedTrip = trips.find(({ id }) => id === selectedTripId);

    useEffect(() => {
        const tripIds = tripIdsKey ? tripIdsKey.split('|') : [];
        let active = true;
        const unsubscribers = [];
        setTripExpenseData(Object.fromEntries(tripIds.map((tripId) => [tripId, {
            shared: [], personal: [], sharedReady: false, personalReady: false, sharedError: '', personalError: '',
        }])));

        function updateTripData(tripId, changes) {
            if (!active) return;
            setTripExpenseData((current) => ({
                ...current,
                [tripId]: { ...current[tripId], ...changes },
            }));
        }

        tripIds.forEach((tripId) => {
            try {
                unsubscribers.push(expenseStore.subscribeShared(tripId, (shared) => updateTripData(tripId, { shared, sharedReady: true, sharedError: '' }), () => updateTripData(tripId, { sharedReady: true, sharedError: '無法讀取此旅行的公帳，請檢查 Firebase Realtime Database 設定。' })));
            } catch {
                updateTripData(tripId, { sharedReady: true, sharedError: '無法讀取此旅行的公帳，請檢查 Firebase Realtime Database 設定。' });
            }
            try {
                unsubscribers.push(expenseStore.subscribePersonal(user.uid, tripId, (personal) => updateTripData(tripId, { personal, personalReady: true, personalError: '' }), () => updateTripData(tripId, { personalReady: true, personalError: '無法讀取私人帳目，請確認已發布最新 database.rules.json。' })));
            } catch {
                updateTripData(tripId, { personalReady: true, personalError: '無法讀取私人帳目，請確認已發布最新 database.rules.json。' });
            }
        });

        return () => {
            active = false;
            unsubscribers.forEach((unsubscribe) => unsubscribe());
        };
    }, [expenseStore, user.uid, tripIdsKey]);

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
                setRateError(false);
            } catch {
                if (active) setRateError(true);
            }
        }
        loadRate();
        const interval = window.setInterval(loadRate, 30 * 60 * 1000);
        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, []);

    return (
        <>
            <section className="detail-page expense-page expense-overview-page">
                <div className="page-heading expense-page-heading"><div><p className="section-eyebrow">TRIP EXPENSES</p><h1>記帳幫手</h1><p>選擇旅程查看公帳與私人花費。</p></div><Receipt className="expense-heading-icon" size={38} /></div>
                {trips.length ? <div className="expense-trip-list">{trips.map((trip) => <ExpenseTripSummary key={trip.id} trip={trip} data={tripExpenseData[trip.id]} jpyToTwd={jpyToTwd} onOpen={() => setSelectedTripId(trip.id)} />)}</div> : <div className="expense-empty"><Receipt size={26} /><strong>目前沒有可記帳的旅程</strong><span>建立或加入一趟旅行後，即可開始記錄支出。</span></div>}
            </section>
            {selectedTrip && <ExpenseTripDialog key={selectedTrip.id} user={user} expenseStore={expenseStore} trip={selectedTrip} expenseData={tripExpenseData[selectedTrip.id]} jpyToTwd={jpyToTwd} rateUpdatedAt={rateUpdatedAt} rateError={rateError} onClose={() => setSelectedTripId(null)} />}
        </>
    );
}
