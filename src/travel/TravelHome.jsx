import { useEffect, useRef, useState } from 'react';
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ExpensePage from './ExpensePage.jsx';
import TravelPlanner, { ParticipantAvatarStack, TravelIdCopyButton } from './TravelPlanner.jsx';
import { getAirportLabel } from './airports.js';
import { travelStore } from '../travelStore.js';
import { formatTripDateRange, getTripsWithLodging, groupFlightsByTrip, itineraryTypeOptions, toOverviewDays } from './travelUtils.js';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Compass,
  ExternalLink,
  GripVertical,
  Info,
  LoaderCircle,
  LogOut,
  Map,
  MapPin,
  Pencil,
  Plane,
  Receipt,
  Plus,
  Settings,
  Sparkles,
  ShoppingBag,
  Trash2,
  Train,
  Utensils,
  X,
} from 'lucide-react';
import './travel.css';

const eventTypeIcons = {
  transport: Train,
  stay: BedDouble,
  shopping: ShoppingBag,
  sight: Compass,
  food: Utensils,
};

function mapsUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function searchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function tripSummaryDateRange(trip) {
  const startDate = trip.startDate ? trip.startDate.replaceAll('-', '/') : '日期未設定';
  const endDate = trip.endDate ? trip.endDate.replaceAll('-', '/') : '日期未設定';
  return `${startDate}～${endDate}`;
}

function TripSummaryRow({ trip, icon: Icon, countLabel, isExpanded, onToggle }) {
  return (
    <button className={`trip-summary-row${isExpanded ? ' is-expanded' : ''}`} type="button" onClick={onToggle} aria-expanded={isExpanded} aria-controls={`trip-details-${trip.id}`}>
      <span className="trip-summary-icon"><Icon size={18} /></span>
      <span className="trip-summary-main"><strong>{trip.title}</strong><small>旅行 ID · {trip.id}</small></span>
      <span className="trip-summary-dates">{tripSummaryDateRange(trip)}</span>
      <span className="trip-summary-count">{countLabel}</span>
      <ChevronDown className="trip-summary-chevron" size={18} />
    </button>
  );
}

function isRealtimeDatabasePermissionError(error) {
  return error.code === 'PERMISSION_DENIED'
    || error.code === 'permission-denied'
    || /PERMISSION_DENIED/i.test(error.message || '');
}

function EventCard({ event, onUpdate, onDelete }) {
  const eventType = eventTypeIcons[event.type] ? event.type : 'sight';
  const EventIcon = eventTypeIcons[eventType];
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({
    title: event.title || '',
    description: event.description || '',
    startTime: event.startTime || '',
    endTime: event.endTime || '',
    address: event.location || '',
    type: eventType,
  });

  async function saveEvent(submitEvent) {
    submitEvent.preventDefault();
    setWorking(true);
    setError('');
    try {
      await onUpdate(event.id, draft);
      setEditing(false);
    } catch (saveError) {
      setError(saveError.message || '儲存行程失敗，請稍後再試。');
    } finally {
      setWorking(false);
    }
  }

  async function deleteEvent() {
    if (!window.confirm(`確定刪除「${event.title}」嗎？`)) return;
    setWorking(true);
    setError('');
    try {
      await onDelete(event.id);
    } catch (deleteError) {
      setError(deleteError.message || '刪除行程失敗，請稍後再試。');
    } finally {
      setWorking(false);
    }
  }

  function cancelEdit() {
    setDraft({
      title: event.title || '',
      description: event.description || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      address: event.location || '',
      type: eventType,
    });
    setError('');
    setEditing(false);
  }

  return (
    <article className={`schedule-event event-${eventType}`}>
      <div className="event-time">{event.time}</div>
      <div className="event-marker"><span /></div>
      <div className="event-card-content">
        {editing ? (
          <form className="event-edit-form" onSubmit={saveEvent}>
            <div className="planner-fields-grid">
              <label className="planner-field"><span>行程標題</span><input value={draft.title} onChange={(inputEvent) => setDraft((current) => ({ ...current, title: inputEvent.target.value }))} maxLength={100} required /></label>
              <label className="planner-field"><span>行程類型</span><select value={draft.type} onChange={(inputEvent) => setDraft((current) => ({ ...current, type: inputEvent.target.value }))}>{itineraryTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="planner-field"><span>地址</span><input value={draft.address} onChange={(inputEvent) => setDraft((current) => ({ ...current, address: inputEvent.target.value }))} /></label>
              <label className="planner-field planner-field-wide"><span>行程描述</span><textarea rows={2} value={draft.description} onChange={(inputEvent) => setDraft((current) => ({ ...current, description: inputEvent.target.value }))} /></label>
              <label className="planner-field"><span>開始時間</span><input type="time" value={draft.startTime} onChange={(inputEvent) => setDraft((current) => ({ ...current, startTime: inputEvent.target.value }))} /></label>
              <label className="planner-field"><span>結束時間</span><input type="time" value={draft.endTime} onChange={(inputEvent) => setDraft((current) => ({ ...current, endTime: inputEvent.target.value }))} /></label>
            </div>
            {error && <p className="planner-error" role="alert">{error}</p>}
            <div className="planner-inline-actions"><button className="planner-primary" type="submit" disabled={working || !draft.title.trim()}><Check size={15} />儲存</button><button className="planner-secondary" type="button" onClick={cancelEdit} disabled={working}><X size={15} />取消</button></div>
          </form>
        ) : (
          <>
            <div className="event-card-heading">
              <h3>{event.title}</h3>
              <div className="event-card-tools">
                <div className="event-type"><EventIcon size={15} />{event.category || '景點'}</div>
                {onUpdate && onDelete && <div className="event-card-actions"><button className="event-action-button" type="button" aria-label={`編輯${event.title}`} title="編輯行程" onClick={() => { setError(''); setEditing(true); }} disabled={working}><Pencil size={15} /></button><button className="event-action-button delete" type="button" aria-label={`刪除${event.title}`} title="刪除行程" onClick={deleteEvent} disabled={working}><Trash2 size={15} /></button></div>}
              </div>
            </div>
            <p>{event.description}</p>
            {event.tip && <div className="guide-tip"><Sparkles size={14} /><span>{event.tip}</span></div>}
            {event.location && <a className="map-link" href={mapsUrl(event.location)} target="_blank" rel="noreferrer"><MapPin size={14} />地點預覽 <ArrowRight size={14} /></a>}
            {error && <p className="planner-error" role="alert">{error}</p>}
          </>
        )}
      </div>
    </article>
  );
}

function DayCard({ day, isOpen, onToggle, onAddEvent, onUpdateEvent, onDeleteEvent, onUpdateDetails }) {
  const [addOpen, setAddOpen] = useState(false);
  const [eventDraft, setEventDraft] = useState({ title: '', description: '', startTime: '', endTime: '', address: '', type: 'sight' });
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventError, setEventError] = useState('');
  const [summaryEditing, setSummaryEditing] = useState(false);
  const [areaDraft, setAreaDraft] = useState(day.area || '');
  const [summaryDraft, setSummaryDraft] = useState(day.summary || '');
  const [summarySaving, setSummarySaving] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const guideSearch = searchUrl(`${day.area} 景點故事 旅遊攻略 交通 建議`);

  useEffect(() => {
    if (!summaryEditing) setSummaryDraft(day.summary || '');
  }, [day.summary, summaryEditing]);

  useEffect(() => {
    if (summaryEditing) return;
    setAreaDraft(day.area || '');
    setSummaryDraft(day.summary || '');
  }, [day.area, day.summary, summaryEditing]);

  async function saveDayDetails(event) {
    event.preventDefault();
    setSummarySaving(true);
    setSummaryError('');
    try {
      await onUpdateDetails(day.date, { area: areaDraft, summary: summaryDraft });
      setSummaryEditing(false);
    } catch (error) {
      setSummaryError(error.message || '儲存每日資訊失敗，請稍後再試。');
    } finally {
      setSummarySaving(false);
    }
  }

  function cancelSummaryEdit() {
    setAreaDraft(day.area || '');
    setSummaryDraft(day.summary || '');
    setSummaryError('');
    setSummaryEditing(false);
  }

  async function submitEvent(event) {
    event.preventDefault();
    setSavingEvent(true);
    setEventError('');
    try {
      await onAddEvent(day.date, eventDraft);
      setEventDraft({ title: '', description: '', startTime: '', endTime: '', address: '', type: 'sight' });
      setAddOpen(false);
    } catch (error) {
      setEventError(error.message || '新增行程失敗，請稍後再試。');
    } finally {
      setSavingEvent(false);
    }
  }

  return (
    <article className={`day-card${isOpen ? ' day-open' : ''}`}>
      <div id={`day-card-heading-${day.id}`} className="day-card-heading">
        <button className="day-card-toggle" type="button" onClick={onToggle} aria-label={`${isOpen ? '收合' : '展開'}第 ${day.id} 天行程`} aria-expanded={isOpen} aria-controls={`day-card-body-${day.id}`} />
        <span className="day-index">{String(day.id).padStart(2, '0')}</span>
        <span className="day-title-group">
          <span className="day-date">{day.weekday}　·　{day.date}</span>
          <span className="day-title-line"><span className="day-title">{day.title}</span>{onUpdateDetails && <button className="day-title-edit-button" type="button" aria-label={`編輯第 ${day.id} 天地點與摘要`} title="編輯每日地點與摘要" onClick={() => { setSummaryError(''); setAreaDraft(day.area || ''); setSummaryDraft(day.summary || ''); setSummaryEditing(true); }}><Pencil size={15} /></button>}</span>
          <span className="day-area"><MapPin size={12} />{day.area}</span>
        </span>
        <ChevronDown className="day-chevron" size={18} />
      </div>
      {isOpen && (
        <div id={`day-card-body-${day.id}`} className="day-card-body">
          {summaryEditing ? <form className="day-summary-edit-form" onSubmit={saveDayDetails}>
            <label className="planner-field"><span>第 {day.id} 天主要地點</span><input autoFocus maxLength={100} value={areaDraft} onChange={(event) => setAreaDraft(event.target.value)} placeholder="輸入今天的主要地點" /></label>
            <label className="planner-field"><span>第 {day.id} 天摘要</span><textarea rows={3} maxLength={500} value={summaryDraft} onChange={(event) => setSummaryDraft(event.target.value)} placeholder="單獨記下這一天的重點或安排。" /></label>
            {summaryError && <p className="planner-error" role="alert">{summaryError}</p>}
            <div className="day-summary-actions"><button className="planner-primary" type="submit" disabled={summarySaving}>{summarySaving ? '儲存中…' : <><Check size={15} />儲存每日資訊</>}</button><button className="planner-secondary" type="button" onClick={cancelSummaryEdit} disabled={summarySaving}><ArrowLeft size={15} />取消</button></div>
          </form> : <div className="day-summary-row"><p className={`day-summary${day.summary ? '' : ' is-empty'}`}>{day.summary || '尚未新增每日摘要。'}</p></div>}
          <div className="schedule-list">
            {day.events.map((event, index) => <EventCard event={event} key={event.id || `${day.id}-${index}`} onUpdate={onUpdateEvent ? (eventId, draft) => onUpdateEvent(eventId, draft) : undefined} onDelete={onDeleteEvent ? (eventId) => onDeleteEvent(eventId) : undefined} />)}
          </div>
          {onAddEvent && (addOpen ? <form className="overview-event-form" onSubmit={submitEvent}>
            <div className="planner-fields-grid">
              <label className="planner-field"><span>行程標題</span><input value={eventDraft.title} onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))} required maxLength={100} /></label>
              <label className="planner-field"><span>行程類型</span><select value={eventDraft.type} onChange={(event) => setEventDraft((current) => ({ ...current, type: event.target.value }))}>{itineraryTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="planner-field"><span>地址</span><input value={eventDraft.address} onChange={(event) => setEventDraft((current) => ({ ...current, address: event.target.value }))} /></label>
              <label className="planner-field planner-field-wide"><span>行程描述</span><textarea rows={2} value={eventDraft.description} onChange={(event) => setEventDraft((current) => ({ ...current, description: event.target.value }))} /></label>
              <label className="planner-field"><span>開始時間</span><input type="time" value={eventDraft.startTime} onChange={(event) => setEventDraft((current) => ({ ...current, startTime: event.target.value }))} /></label>
              <label className="planner-field"><span>結束時間</span><input type="time" value={eventDraft.endTime} onChange={(event) => setEventDraft((current) => ({ ...current, endTime: event.target.value }))} /></label>
            </div>
            {eventError && <p className="planner-error" role="alert">{eventError}</p>}
            <div className="planner-inline-actions"><button className="planner-primary" type="submit" disabled={savingEvent || !eventDraft.title.trim()}>{savingEvent ? '儲存中…' : <><Plus size={15} />加入行程</>}</button><button className="planner-secondary" type="button" onClick={() => setAddOpen(false)}>取消</button></div>
          </form> : <button className="planner-add-event overview-add-event" type="button" onClick={() => setAddOpen(true)}><Plus size={17} />加入行程</button>)}
          {day.guide && <aside className="guide-panel">
            <div className="guide-heading"><Sparkles size={16} /><strong>小導遊筆記</strong><span>依行程整理</span></div>
            <p>{day.guide}</p>
            <a href={guideSearch} target="_blank" rel="noreferrer">
              搜尋景點故事與攻略 <ExternalLink size={14} />
            </a>
          </aside>}
        </div>
      )}
    </article>
  );
}

function TripStatusCard({ trip }) {
  const [now, setNow] = useState(Date.now());
  const startDate = new Date(`${trip.startDate}T00:00:00`);
  const endDate = new Date(`${trip.endDate}T00:00:00`);
  const tripStart = startDate.getTime();
  const tripEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59).getTime();
  const countdown = Math.max(tripStart - now, 0);
  const days = Math.floor(countdown / 86400000);
  const hours = Math.floor((countdown % 86400000) / 3600000);
  const minutes = Math.floor((countdown % 3600000) / 60000);
  const seconds = Math.floor((countdown % 60000) / 1000);
  const isOngoing = now >= tripStart && now <= tripEnd;
  const isFinished = now > tripEnd;
  const firstDayOffset = new Date(startDate.getFullYear(), startDate.getMonth(), 1).getDay();
  const calendarDays = Array.from({ length: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate() }, (_, index) => index + 1);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="trip-status-stack" aria-label="旅程日期與倒數">
      <section className="trip-status-card trip-calendar-card">
        <div className="trip-calendar"><div className="trip-calendar-month">{startDate.getFullYear()} 年 {startDate.getMonth() + 1} 月</div><div className="trip-calendar-weekdays">{['日', '一', '二', '三', '四', '五', '六'].map((weekday) => <span key={weekday}>{weekday}</span>)}</div><div className="trip-calendar-grid">{Array.from({ length: firstDayOffset }, (_, index) => <span className="trip-calendar-empty" key={`empty-${index}`} />)}{calendarDays.map((day) => { const dayTime = new Date(startDate.getFullYear(), startDate.getMonth(), day, 12).getTime(); const isTripDay = dayTime >= tripStart && dayTime <= tripEnd; return <span className={`trip-calendar-day${isTripDay ? ' is-trip-day' : ''}${day === startDate.getDate() ? ' is-trip-start' : ''}${day === endDate.getDate() && startDate.getMonth() === endDate.getMonth() ? ' is-trip-end' : ''}`} key={day}>{day}</span>; })}</div></div>
      </section>
      <section className="trip-status-card trip-countdown-card">
        <div className="trip-countdown">{!isFinished && !isOngoing && <div className="trip-countdown-values"><strong>{String(days).padStart(2, '0')}<small>日</small></strong><i>:</i><strong>{String(hours).padStart(2, '0')}<small>時</small></strong><i>:</i><strong>{String(minutes).padStart(2, '0')}<small>分</small></strong><i>:</i><strong>{String(seconds).padStart(2, '0')}<small>秒</small></strong></div>}</div>
      </section>
    </div>
  );
}

function TripOverview({ trip, onAddEvent, onUpdateEvent, onDeleteEvent, onUpdateDetails, onBack }) {
  const days = toOverviewDays(trip);
  const [openDay, setOpenDay] = useState(1);
  const [pendingScrollDay, setPendingScrollDay] = useState(null);

  useEffect(() => {
    if (pendingScrollDay === null || openDay !== pendingScrollDay) return undefined;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`day-card-body-${pendingScrollDay}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingScrollDay(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openDay, pendingScrollDay]);

  function toggleDay(dayId) {
    const willOpen = openDay !== dayId;
    setOpenDay(willOpen ? dayId : null);
    setPendingScrollDay(willOpen ? dayId : null);
  }

  return (
    <>
      <button className="planner-back" type="button" onClick={onBack}><ArrowLeft size={16} />返回旅程總覽</button>
      <section className={`trip-hero${trip.coverImage ? ' has-cover' : ''}`}>
        {trip.coverImage && <img className="trip-hero-cover" src={trip.coverImage} alt="" />}
        <div className="trip-hero-copy">
          <span className="trip-eyebrow"><span /> TRAVEL JOURNAL</span>
          <div className="trip-hero-heading">
            <h1>{trip.title}</h1>
            <div className="trip-hero-id"><span>{trip.id}</span><TravelIdCopyButton id={trip.id} /></div>
          </div>
          <p>{trip.description}</p>
          <div className="trip-meta"><span><CalendarDays size={15} />{formatTripDateRange(trip.startDate, trip.endDate)}</span><span><MapPin size={15} />{trip.country}</span></div>
        </div>
        <div className="trip-hero-participants"><ParticipantAvatarStack participants={Object.values(trip.participants || {})} limit={6} className="participant-stack--hero" /></div>
      </section>

      <section className="itinerary-section">
        <div className="section-heading">
          <div><p className="section-eyebrow">YOUR DAILY ROUTE</p><h2>每日行程</h2></div>
          <span className="section-count">{days.length} DAYS</span>
        </div>
        <div className="day-list">
          {days.map((day) => (
            <DayCard key={day.id} day={day} isOpen={openDay === day.id} onToggle={() => toggleDay(day.id)} onAddEvent={onAddEvent} onUpdateDetails={onUpdateDetails} onUpdateEvent={(eventId, draft) => onUpdateEvent(day.date, eventId, draft)} onDeleteEvent={(eventId) => onDeleteEvent(day.date, eventId)} />
          ))}
        </div>
      </section>
    </>
  );
}

function SortablePackingItem({ item, editing, editValue, setEditValue, setEditingId, working, onToggle, onUpdate, onRemove, clearActionError }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: working || editing,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  async function submitEdit(event) {
    event.preventDefault();
    const saved = await onUpdate(item.id, editValue);
    if (saved) {
      setEditingId(null);
      clearActionError();
    }
  }

  async function removeItem() {
    const removed = await onRemove(item.id);
    if (removed) clearActionError();
  }

  return (
    <li ref={setNodeRef} style={style} className={`packing-item${item.packed ? ' packed' : ''}${isDragging ? ' is-dragging' : ''}`}>
      {editing ? (
        <form className="packing-edit-form" onSubmit={submitEdit}>
          <input aria-label="修改項目名稱" autoFocus maxLength={80} value={editValue} onChange={(event) => setEditValue(event.target.value)} />
          <button className="packing-icon-button confirm" type="submit" aria-label="儲存修改" disabled={working || !editValue.trim()}><Check size={17} /></button>
          <button className="packing-icon-button" type="button" aria-label="取消修改" onClick={() => setEditingId(null)}><X size={17} /></button>
        </form>
      ) : (
        <>
          <label className="packing-check-row">
            <input type="checkbox" checked={Boolean(item.packed)} disabled={working} onChange={(event) => onToggle(item.id, event.target.checked)} />
            <span className="packing-checkmark"><Check size={14} /></span>
            <span className="packing-item-name">{item.name}</span>
            <span className="packing-status">{item.packed ? '帶了' : '沒帶'}</span>
          </label>
          <div className="packing-item-actions">
            <button className="packing-icon-button packing-drag-handle" type="button" aria-label={`拖曳調整${item.name}順序`} disabled={working} {...attributes} {...listeners}><GripVertical size={16} /></button>
            <button className="packing-icon-button" type="button" aria-label={`修改${item.name}`} onClick={() => { setEditingId(item.id); setEditValue(item.name); }}><Pencil size={15} /></button>
            <button className="packing-icon-button delete" type="button" aria-label={`刪除${item.name}`} onClick={removeItem} disabled={working}><Trash2 size={15} /></button>
          </div>
        </>
      )}
    </li>
  );
}

function PackingListPage({ items, loadState, error, actionError, working, onAdd, onToggle, onUpdate, onRemove, onReorder, clearActionError }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const packedCount = items.filter((item) => item.packed).length;
  const packingPercentage = items.length ? Math.round((packedCount / items.length) * 100) : 0;
  const packingMessage = !items.length
    ? { tone: 'low', text: '清單還沒開始，先加上一項要帶的物品吧。' }
    : packingPercentage === 0
      ? { tone: 'low', text: '行李還沒開始準備呢，先從一項開始吧。' }
      : packingPercentage < 25
        ? { tone: 'low', text: '清單還有點空，慢慢開始準備吧。' }
        : packingPercentage < 50
          ? { tone: 'low', text: '目前只完成一小段，再勾幾項就更有進度了。' }
          : packingPercentage < 75
            ? { tone: 'mid', text: '已經一半囉！繼續保持。' }
            : packingPercentage < 100
              ? { tone: 'high', text: '快準備完成了，再確認幾項就能安心出發。' }
              : { tone: 'complete', text: '全部準備好了，安心出發！' };

  async function submitNewItem(event) {
    event.preventDefault();
    const saved = await onAdd(newItem);
    if (saved) {
      setNewItem('');
      setAddOpen(false);
      clearActionError();
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex).map((item) => item.id));
  }

  return (
    <section className="detail-page packing-page">
      <div className="page-heading">
        <p className="section-eyebrow">READY FOR THE JOURNEY</p>
        <h1>攜帶清單</h1>
        <p>把出發前要準備的物品收在一起，完成一項就勾選帶了。</p>
      </div>

      <section className="packing-board" aria-label="個人攜帶清單">
        <header className="packing-board-header">
          <div><p>MY PACKING LIST</p><h2>出發準備</h2></div>
          <div className="packing-count"><strong>{packingPercentage}%</strong><p className={`packing-message packing-message-${packingMessage.tone}`}>{packingMessage.text}</p></div>
        </header>
        <div className="packing-progress" role="progressbar" aria-label="攜帶清單完成度" aria-valuemin="0" aria-valuemax="100" aria-valuenow={packingPercentage}>
          <span style={{ width: `${packingPercentage}%` }} />
        </div>

        {error && <div className="packing-error" role="alert"><AlertTriangle size={16} /><span>{error}</span></div>}
        {actionError && <div className="packing-error" role="alert"><AlertTriangle size={16} /><span>{actionError}</span></div>}

        {loadState === 'loading' ? (
          <div className="packing-state"><LoaderCircle className="packing-spinner" size={22} /><span>正在載入你的清單…</span></div>
        ) : loadState === 'error' ? (
          <div className="packing-state"><AlertTriangle size={21} /><span>暫時無法讀取清單，請確認網路或 Firebase Realtime Database 規則。</span></div>
        ) : items.length === 0 ? (
          <div className="packing-empty"><span className="packing-empty-icon"><MapPin size={20} /></span><strong>清單還是空的</strong><p>新增第一項出發前要準備的物品。</p></div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <ul className="packing-items">
                {items.map((item) => (
                  <SortablePackingItem
                    key={item.id}
                    item={item}
                    editing={editingId === item.id}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    setEditingId={setEditingId}
                    working={working}
                    onToggle={onToggle}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                    clearActionError={clearActionError}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {addOpen ? (
          <form className="packing-add-form" onSubmit={submitNewItem}>
            <label htmlFor="new-packing-item">新增物品</label>
            <div><input id="new-packing-item" autoFocus maxLength={80} placeholder="例如：護照、行動電源" value={newItem} onChange={(event) => setNewItem(event.target.value)} /><button type="submit" disabled={working || !newItem.trim()}><Plus size={16} />加入</button></div>
            <button className="packing-cancel-add" type="button" onClick={() => { setAddOpen(false); setNewItem(''); }}>取消</button>
          </form>
        ) : (
          <button className="packing-add-button" type="button" onClick={() => { setAddOpen(true); clearActionError(); }}><Plus size={17} />新增項目</button>
        )}
      </section>

      <aside className="packing-privacy-note"><Info size={15} /><span>清單只會存取目前登入帳號的資料，其他使用者無法讀取。</span></aside>
    </section>
  );
}

function TransportationPage({ trips }) {
  const [expandedTripId, setExpandedTripId] = useState(null);
  const flightGroups = groupFlightsByTrip(trips);
  return (
    <section className="detail-page">
      <div className="page-heading"><p className="section-eyebrow">GETTING AROUND</p><h1>交通資訊</h1></div>
      {flightGroups.length ? flightGroups.map(({ trip, flights }) => (
        <section className="transport-group trip-disclosure" key={trip.id}>
          <TripSummaryRow trip={trip} icon={Plane} countLabel={`${flights.length} 張機票`} isExpanded={expandedTripId === trip.id} onToggle={() => setExpandedTripId((current) => current === trip.id ? null : trip.id)} />
          {expandedTripId === trip.id && <div className="trip-disclosure-details" id={`trip-details-${trip.id}`}>
            <header className="transport-section-heading">
              <span className="transport-section-icon"><Plane size={18} /></span>
              <div><p>FLIGHT DETAILS · {trip.country}</p><h2>{trip.title}</h2></div>
              <span className="transport-section-side">{trip.id}</span>
            </header>
            <div className="flight-list">
              {flights.map((flight, index) => {
                const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(flight.date || '');
                return (
                  <article className="flight-card" key={`${trip.id}-${flight.formId || flight.direction || index}`}>
                    <div className="flight-card-top">
                      <span className="flight-direction">{flight.direction || `航班 ${index + 1}`}</span>
                      <time className="flight-date" dateTime={dateParts ? flight.date : undefined}><span>{dateParts?.[1] || '日期'}</span><strong>{dateParts ? `${dateParts[2]}.${dateParts[3]}` : '未設定'}</strong></time>
                    </div>
                    <div className="flight-airline"><span className="flight-icon"><Plane size={18} /></span><strong>{flight.airline || '未填寫航空公司'}</strong></div>
                    <div className="flight-route">
                      <div><span>出發機場</span><strong className="flight-airport-name">{flight.departureAirport ? getAirportLabel(flight.departureAirport) : flight.route?.split(/→|->/)[0]?.trim() || '未設定'}</strong>{(flight.departureTime || (!flight.departureAirport && flight.departure)) && <time className="flight-time">{flight.departureTime || flight.departure}</time>}</div>
                      <div className="flight-route-line"><i><Plane size={15} /></i></div>
                      <div><span>目的地機場</span><strong className="flight-airport-name">{flight.arrivalAirport ? getAirportLabel(flight.arrivalAirport) : flight.route?.split(/→|->/)[1]?.trim() || '未設定'}</strong>{(flight.arrivalTime || (!flight.arrivalAirport && flight.arrival)) && <time className="flight-time">{flight.arrivalTime || flight.arrival}</time>}</div>
                    </div>
                    {flight.fare && <div className="flight-fare"><span>每人票價</span><strong>NT$ {new Intl.NumberFormat('zh-TW').format(Number(String(flight.fare).replace(/,/g, '')))}<small> / 人</small></strong></div>}
                  </article>
                );
              })}
            </div>
          </div>}
        </section>
      )) : <p className="trip-info-empty">{trips.length ? '你的旅程尚未填寫機票資訊。' : '目前沒有可顯示的旅行。'}</p>}
    </section>
  );
}

function LodgingPage({ trips }) {
  const [expandedTripId, setExpandedTripId] = useState(null);
  const lodgingGroups = new Map();
  getTripsWithLodging(trips).forEach((record) => {
    const group = lodgingGroups.get(record.trip.id) || { trip: record.trip, lodgings: [] };
    group.lodgings.push(record);
    lodgingGroups.set(record.trip.id, group);
  });
  return (
    <section className="detail-page">
      <div className="page-heading"><p className="section-eyebrow">ACCOMMODATION</p><h1>住宿資訊</h1></div>
      {lodgingGroups.size ? [...lodgingGroups.values()].map(({ trip, lodgings }) => (
        <section className="transport-group lodging-trip-group trip-disclosure" key={trip.id}>
          <TripSummaryRow trip={trip} icon={BedDouble} countLabel={`${lodgings.length} 間住宿`} isExpanded={expandedTripId === trip.id} onToggle={() => setExpandedTripId((current) => current === trip.id ? null : trip.id)} />
          {expandedTripId === trip.id && <div className="trip-disclosure-details" id={`trip-details-${trip.id}`}>
            <header className="transport-section-heading">
              <span className="transport-section-icon"><BedDouble size={18} /></span>
              <div><p>ACCOMMODATION · {trip.country}</p><h2>{trip.title}</h2></div>
              <span className="transport-section-side">{trip.id}</span>
            </header>
            <div className="lodging-card-list">
              {lodgings.map(({ lodging, index }) => {
                const nights = lodging.checkIn && lodging.checkOut
                  ? `${Math.max(Math.round((new Date(`${lodging.checkOut}T00:00:00`) - new Date(`${lodging.checkIn}T00:00:00`)) / 86400000), 0)} 晚`
                  : '尚未設定';
                return (
                  <article className="lodging-card" key={`${trip.id}-${lodging.formId || index}`}>
                    {lodging.coverImage ? <img className="lodging-visual lodging-custom-cover" src={lodging.coverImage} alt={`${lodging.name || '住宿'}封面`} /> : <div className="lodging-visual" aria-hidden="true" />}
                    <div className="lodging-body">
                      <div className="lodging-kicker"><BedDouble size={15} /> ACCOMMODATION</div>
                      <h2>{lodging.name || '住宿資訊'}</h2>
                      {lodging.address && <a className="lodging-address" href={mapsUrl(lodging.address)} target="_blank" rel="noreferrer"><MapPin size={16} /><span>{lodging.address}</span><ExternalLink size={14} /></a>}
                      {(lodging.note || lodging.checkIn || lodging.checkOut) && <p className="lodging-note">{lodging.note || `${lodging.checkIn || ''}${lodging.checkOut ? ` 至 ${lodging.checkOut}` : ''}`}</p>}
                      <div className="lodging-facts"><div><span>入住日期</span><strong>{lodging.checkIn || '尚未設定'}</strong></div><div><span>退房日期</span><strong>{lodging.checkOut || '尚未設定'}</strong></div><div><span>住宿晚數</span><strong>{nights}</strong></div>{lodging.price && <div className="lodging-price-fact"><span>住宿金額</span><strong>NT$ {new Intl.NumberFormat('zh-TW').format(Number(String(lodging.price).replace(/[^0-9]/g, '')))}</strong></div>}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>}
        </section>
      )) : <p className="trip-info-empty">{trips.length ? '你的旅程尚未填寫住宿資訊。' : '目前沒有可顯示的旅行。'}</p>}
    </section>
  );
}

function UserBadge({ user }) {
  const initial = (user?.displayName || user?.email || '旅').slice(0, 1).toUpperCase();
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [user?.photoURL]);

  return user?.photoURL && !imageFailed
    ? <img className="user-avatar" src={user.photoURL} alt="" onError={() => setImageFailed(true)} />
    : <span className="user-avatar user-initial">{initial}</span>;
}

export default function TravelHome({ user, onSignOut, packingStore, expenseStore }) {
  const [section, setSection] = useState('itinerary');
  const [travelItems, setTravelItems] = useState([]);
  const [travelLoadState, setTravelLoadState] = useState('loading');
  const [travelError, setTravelError] = useState('');
  const [travelWorking, setTravelWorking] = useState(false);
  const [activeTravelId, setActiveTravelId] = useState(null);
  const [packingItems, setPackingItems] = useState([]);
  const [packingLoadState, setPackingLoadState] = useState('loading');
  const [packingError, setPackingError] = useState('');
  const [packingActionError, setPackingActionError] = useState('');
  const [packingWorking, setPackingWorking] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const userName = user?.displayName || user?.email?.split('@')[0] || '旅人';

  useEffect(() => {
    if (!profileMenuOpen) return undefined;

    function handleMenuDismiss(event) {
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    }

    function handleMenuKeyDown(event) {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    }

    document.addEventListener('pointerdown', handleMenuDismiss);
    document.addEventListener('keydown', handleMenuKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleMenuDismiss);
      document.removeEventListener('keydown', handleMenuKeyDown);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => { };
    setTravelLoadState('loading');
    setTravelError('');
    try {
      unsubscribe = travelStore.subscribeForUser(user.uid, (trips) => {
        if (!active) return;
        setTravelItems(trips);
        setTravelLoadState('ready');
      }, (error) => {
        if (!active) return;
        setTravelLoadState('error');
        setTravelError(isRealtimeDatabasePermissionError(error)
          ? 'Realtime Database 規則尚未允許讀取旅行，請發布 database.rules.json。'
          : '無法載入旅行，請檢查網路連線或 Realtime Database 設定。');
      });
    } catch (error) {
      setTravelLoadState('error');
      setTravelError(error.message || 'Firebase Realtime Database 尚未設定。');
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user.uid]);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => { };
    setPackingLoadState('loading');
    setPackingError('');
    try {
      unsubscribe = packingStore.subscribe(user.uid, (items) => {
        if (!active) return;
        setPackingItems(items);
        setPackingLoadState('ready');
      }, (error) => {
        if (!active) return;
        setPackingLoadState('error');
        setPackingError(isRealtimeDatabasePermissionError(error)
          ? 'Realtime Database 規則尚未允許此帳號讀取清單，請發布 database.rules.json。'
          : '無法載入清單，請檢查網路連線或 Realtime Database 設定。');
      });
    } catch (error) {
      setPackingLoadState('error');
      setPackingError(error.message || 'Firebase Realtime Database 尚未設定，無法載入攜帶清單。');
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user.uid]);

  async function runPackingAction(action) {
    setPackingActionError('');
    setPackingWorking(true);
    try {
      await action();
      return true;
    } catch (error) {
      setPackingActionError(isRealtimeDatabasePermissionError(error)
        ? 'Realtime Database 規則尚未允許此帳號修改清單，請發布 database.rules.json。'
        : '儲存失敗，請檢查網路後再試。');
      return false;
    } finally {
      setPackingWorking(false);
    }
  }

  function addPackingItem(name) {
    const trimmedName = name.trim();
    if (!trimmedName) return Promise.resolve(false);
    return runPackingAction(() => packingStore.add(user.uid, trimmedName));
  }

  function updatePackingItem(itemId, name) {
    const trimmedName = name.trim();
    if (!trimmedName) return Promise.resolve(false);
    return runPackingAction(() => packingStore.updateName(user.uid, itemId, trimmedName));
  }

  function togglePackingItem(itemId, packed) {
    return runPackingAction(() => packingStore.setPacked(user.uid, itemId, packed));
  }

  function removePackingItem(itemId) {
    return runPackingAction(() => packingStore.remove(user.uid, itemId));
  }

  function reorderPackingItems(itemIds) {
    return runPackingAction(() => packingStore.reorder(user.uid, itemIds));
  }

  async function runTravelAction(action) {
    setTravelError('');
    setTravelWorking(true);
    try {
      return await action();
    } catch (error) {
      setTravelError(isRealtimeDatabasePermissionError(error)
        ? 'Realtime Database 規則尚未允許此帳號修改旅行，請發布 database.rules.json。'
        : error.message || '旅行資料儲存失敗，請檢查網路後再試。');
      throw error;
    } finally {
      setTravelWorking(false);
    }
  }

  function createTrip(input) {
    return runTravelAction(() => travelStore.createTrip(user.uid, {
      name: user.displayName || user.email?.split('@')[0] || '旅人',
      photoURL: user.photoURL || '',
    }, input));
  }

  function joinTrip(tripId) {
    return runTravelAction(() => travelStore.joinTrip(user.uid, {
      name: user.displayName || user.email?.split('@')[0] || '旅人',
      photoURL: user.photoURL || '',
    }, tripId));
  }

  function deleteTrip(tripId) {
    return runTravelAction(() => travelStore.deleteTrip(user.uid, tripId));
  }

  function previewTrip(tripId) {
    return travelStore.getTripPreview(tripId);
  }

  function addTripEvent(tripId, date, event) {
    return runTravelAction(() => travelStore.addEvent(tripId, date, event, user.uid));
  }

  function updateTripEvent(tripId, date, eventId, event) {
    return runTravelAction(() => travelStore.updateEvent(tripId, date, eventId, event));
  }

  function deleteTripEvent(tripId, date, eventId) {
    return runTravelAction(() => travelStore.removeEvent(tripId, date, eventId));
  }

  function updateTripDayDetails(tripId, date, details) {
    return runTravelAction(() => travelStore.updateDayDetails(tripId, date, details));
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  }

  const navItems = [
    { id: 'itinerary', label: '旅程總覽', icon: Map },
    { id: 'transport', label: '交通資訊', icon: Plane },
    { id: 'lodging', label: '住宿資訊', icon: BedDouble },
    { id: 'expenses', label: '記帳幫手', icon: Receipt },
    { id: 'packing', label: '攜帶清單', icon: ClipboardList },
  ];
  const activeTrip = travelItems.find((trip) => trip.id === activeTravelId) || null;

  return (
    <div className="trip-app">
      <aside className="trip-sidebar">
        <a className="trip-brand" href="#trip" onClick={(event) => { event.preventDefault(); setSection('itinerary'); }}>
          <span className="trip-brand-mark" aria-hidden="true"><Compass size={17} strokeWidth={1.7} /></span><span className="trip-brand-name">TRAVEL<small>JOURNAL</small></span>
        </a>
        <div className="sidebar-trip-label"><span>YOUR TRIP</span><strong>{activeTrip?.title || '開始規劃旅程'}</strong></div>
        <nav className="trip-nav" aria-label="行程導覽">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button className={`trip-nav-item${section === id ? ' active' : ''}`} key={id} type="button" onClick={() => setSection(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{section === id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {activeTrip && <TripStatusCard trip={activeTrip} />}
        </div>
      </aside>

      <div className="trip-workspace">
        <header className="trip-topbar">
          <div className="mobile-brand"><span className="trip-brand-mark" aria-hidden="true"><Compass size={16} strokeWidth={1.7} /></span><strong>TRAVEL<small>JOURNAL</small></strong></div>
          <div className="breadcrumb"><span>我的旅程</span><span>/</span><strong>{navItems.find((item) => item.id === section)?.label}</strong></div>
          <div className="topbar-user">
            <span>你好，{userName}</span>
            <div className="user-menu" ref={profileMenuRef}>
              <button
                className="user-menu-trigger"
                type="button"
                aria-label="開啟使用者選單"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}
              >
                <UserBadge user={user} />
              </button>
              {profileMenuOpen && (
                <div className="user-menu-dropdown" role="menu">
                  <button className="user-menu-item" type="button" role="menuitem" disabled>
                    <Settings size={15} />設置
                  </button>
                  <button className="user-menu-item user-menu-signout" type="button" role="menuitem" onClick={handleSignOut} disabled={signingOut}>
                    <LogOut size={15} />{signingOut ? '登出中…' : '登出'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="trip-content">
          {section === 'itinerary' && !activeTravelId && <TravelPlanner key={section} uid={user.uid} trips={travelItems} loadState={travelLoadState} error={travelError} working={travelWorking} onCreate={createTrip} onJoin={joinTrip} onPreviewJoin={previewTrip} onDeleteTrip={deleteTrip} onOpenTrip={(tripId) => { setActiveTravelId(tripId); setSection('itinerary'); }} />}
          {section === 'itinerary' && activeTravelId && !activeTrip && <div className="planner-empty-state">正在載入旅程…</div>}
          {section === 'itinerary' && activeTrip && <TripOverview key={activeTrip.id} trip={activeTrip} onAddEvent={(date, event) => addTripEvent(activeTrip.id, date, event)} onUpdateEvent={(date, eventId, event) => updateTripEvent(activeTrip.id, date, eventId, event)} onDeleteEvent={(date, eventId) => deleteTripEvent(activeTrip.id, date, eventId)} onUpdateDetails={(date, details) => updateTripDayDetails(activeTrip.id, date, details)} onBack={() => setActiveTravelId(null)} />}
          {section === 'transport' && <TransportationPage trips={travelItems} />}
          {section === 'lodging' && <LodgingPage trips={travelItems} />}
          {section === 'expenses' && <ExpensePage user={user} expenseStore={expenseStore} trips={travelItems} />}
          {section === 'packing' && <PackingListPage items={packingItems} loadState={packingLoadState} error={packingError} actionError={packingActionError} working={packingWorking} onAdd={addPackingItem} onToggle={togglePackingItem} onUpdate={updatePackingItem} onRemove={removePackingItem} onReorder={reorderPackingItems} clearActionError={() => setPackingActionError('')} />}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="手機行程導覽">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button className={section === id ? 'active' : ''} key={id} type="button" onClick={() => setSection(id)}>
            <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
