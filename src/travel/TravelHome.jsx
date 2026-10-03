import { useEffect, useRef, useState } from 'react';
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ExpensePage from './ExpensePage.jsx';
import Modal from './Modal.jsx';
import TravelPlanner, { AirportField, emptyFlight, emptyLodging, Field, ImageUploadField, loadSelectedImage, ParticipantAvatarStack, TravelIdCopyButton } from './TravelPlanner.jsx';
import { getAirportLabel } from './airports.js';
import { getDailyLocationOptions } from './locationMapping.js';
import { travelStore } from '../travelStore.js';
import { fetchDailyWeather } from './weatherService.js';
import { formatTripDateRange, getTripsWithLodging, groupFlightsByTrip, itineraryTypeOptions, toOverviewDays } from './travelUtils.js';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Compass,
  ExternalLink,
  GripVertical,
  Info,
  LoaderCircle,
  LogOut,
  Map as MapIcon,
  MapPin,
  Pencil,
  Plane,
  Receipt,
  Plus,
  Settings,
  Sparkles,
  ShoppingBag,
  Sun,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Snowflake,
  Trash2,
  Train,
  Utensils,
  X,
} from 'lucide-react';
import './travel.css';

const dailyLocationOptions = getDailyLocationOptions();

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

function TripSummaryRow({ trip, icon: Icon, countLabel, variant, onOpen }) {
  return (
    <button className={`trip-summary-row trip-summary-row-${variant}`} type="button" onClick={onOpen} aria-haspopup="dialog">
      <span className="trip-summary-icon"><Icon size={18} /></span>
      <span className="trip-summary-main"><strong>{trip.title}</strong></span>
      <span className="trip-summary-dates">{tripSummaryDateRange(trip)}</span>
      <span className="trip-summary-count">{countLabel}</span>
      <ChevronRight className="trip-summary-chevron" size={18} />
    </button>
  );
}

function TripInfoModal({ trip, topic, onClose, children }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      eyebrow={`${topic} · ${trip.country || '旅程資訊'}`}
      title={trip.title}
      maxWidth="900px"
      className="trip-info-modal"
    >
      {children}
    </Modal>
  );
}

function isRealtimeDatabasePermissionError(error) {
  return error.code === 'PERMISSION_DENIED'
    || error.code === 'permission-denied'
    || /PERMISSION_DENIED/i.test(error.message || '');
}

function WeatherBadge({ weather }) {
  function WeatherCondition({ text }) {
    if (!text) return null;
    const [mainText, sourceText] = String(text).split('·').map((part) => part.trim()).filter(Boolean);
    return (
      <span className="weather-condition">
        <span className="weather-main">{mainText || text}</span>
        {sourceText && <span className="weather-source">{sourceText}</span>}
      </span>
    );
  }

  function WeatherIcon() {
    if (weather.state !== 'ready') return <Cloud className="weather-icon" size={40} strokeWidth={1.75} />;
    const code = weather.weatherCode;
    if (code === 0) return <Sun className="weather-icon" size={40} strokeWidth={1.75} />;
    if ([1, 2, 3].includes(code)) return <Cloud className="weather-icon" size={40} strokeWidth={1.75} />;
    if ([45, 48].includes(code)) return <CloudFog className="weather-icon" size={40} strokeWidth={1.75} />;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return <Snowflake className="weather-icon" size={40} strokeWidth={1.75} />;
    if ([95, 96, 99].includes(code)) return <CloudLightning className="weather-icon" size={40} strokeWidth={1.75} />;
    return <CloudRain className="weather-icon" size={40} strokeWidth={1.75} />;
  }

  if (!weather) return null;

  const conditionText = weather.state === 'loading'
    ? '讀取中'
    : weather.state === 'error'
      ? '請稍後再試'
      : weather.state === 'out_of_range'
        ? weather.message || '尚未開放預報'
        : weather.condition;
  const temperatureText = weather.state === 'ready' ? weather.temperatureText : '--';

  return (
    <div className={`day-weather${weather.state === 'error' ? ' weather-error' : ''}`} aria-label={`${conditionText}天氣`}>
      <div className="weather-icon-wrap"><WeatherIcon /></div>
      <div className="weather-info">
        <strong className="weather-temp">{temperatureText}</strong>
        <WeatherCondition text={conditionText} />
      </div>
    </div>
  );
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
    setEditing(false);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 200));
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

  function openEdit() {
    if (!onUpdate || !onDelete || working) return;
    setDraft({
      title: event.title || '',
      description: event.description || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      address: event.location || '',
      type: eventType,
    });
    setError('');
    setEditing(true);
  }

  const canEdit = Boolean(onUpdate && onDelete);
  const formId = `event-edit-form-${event.id}`;

  return (
    <>
      <article className={`schedule-event event-${eventType}`}>
        <div className="event-time">{event.time}</div>
        <div className="event-marker"><EventIcon className="event-marker-icon" size={16} aria-hidden="true" /></div>
        <div
          className={`event-card-content${canEdit ? ' is-editable' : ''}`}
          role={canEdit ? 'button' : undefined}
          tabIndex={canEdit ? 0 : undefined}
          aria-label={canEdit ? `編輯行程：${event.title}` : undefined}
          onClick={(clickEvent) => {
            if (!clickEvent.target.closest('a')) openEdit();
          }}
          onKeyDown={(keyEvent) => {
            if (canEdit && keyEvent.target === keyEvent.currentTarget && ['Enter', ' '].includes(keyEvent.key)) {
              keyEvent.preventDefault();
              openEdit();
            }
          }}
        >
          <div className="event-card-heading">
            <h3>{event.title}</h3>
          </div>
          <p>{event.description}</p>
          {event.tip && <div className="guide-tip"><Sparkles size={14} /><span>{event.tip}</span></div>}
          {event.location && <a className="map-link" href={mapsUrl(event.location)} target="_blank" rel="noreferrer" onClick={(clickEvent) => clickEvent.stopPropagation()}><MapPin size={14} />查看地圖<ArrowRight size={12} /></a>}
          {error && <p className="planner-error" role="alert">{error}</p>}
        </div>
      </article>
      <Modal
          isOpen={editing}
          onClose={cancelEdit}
          eyebrow="DAILY ITINERARY"
          title="編輯行程"
          maxWidth="560px"
          className="event-edit-modal"
          footer={(
            <div className="event-edit-modal-actions">
              <button className="planner-primary" type="submit" form={formId} disabled={working || !draft.title.trim()}>{working ? '儲存中…' : <><Check size={15} />儲存修改</>}</button>
              <button className="planner-secondary event-delete-button" type="button" onClick={deleteEvent} disabled={working}><Trash2 size={15} />刪除行程</button>
            </div>
          )}
        >
          <form id={formId} className="event-edit-form" onSubmit={saveEvent}>
            <div className="planner-fields-grid">
              <label className="planner-field"><span>行程標題</span><input value={draft.title} onChange={(inputEvent) => setDraft((current) => ({ ...current, title: inputEvent.target.value }))} maxLength={100} required /></label>
              <label className="planner-field"><span>行程類型</span><select value={draft.type} onChange={(inputEvent) => setDraft((current) => ({ ...current, type: inputEvent.target.value }))}>{itineraryTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="planner-field planner-field-wide"><span>地址</span><input value={draft.address} onChange={(inputEvent) => setDraft((current) => ({ ...current, address: inputEvent.target.value }))} /></label>
              <label className="planner-field planner-field-wide"><span>行程描述</span><textarea rows={2} value={draft.description} onChange={(inputEvent) => setDraft((current) => ({ ...current, description: inputEvent.target.value }))} /></label>
              <label className="planner-field"><span>開始時間</span><input type="time" value={draft.startTime} onChange={(inputEvent) => setDraft((current) => ({ ...current, startTime: inputEvent.target.value }))} /></label>
              <label className="planner-field"><span>結束時間</span><input type="time" value={draft.endTime} onChange={(inputEvent) => setDraft((current) => ({ ...current, endTime: inputEvent.target.value }))} /></label>
            </div>
            {error && <p className="planner-error" role="alert">{error}</p>}
          </form>
      </Modal>
    </>
  );
}

function DayCard({ day, weather, isOpen, onToggle, onAddEvent, onUpdateEvent, onDeleteEvent, onUpdateDetails, onEditDetails }) {
  const [addOpen, setAddOpen] = useState(false);
  const [eventDraft, setEventDraft] = useState({ title: '', description: '', startTime: '', endTime: '', address: '', type: 'sight' });
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventError, setEventError] = useState('');
  const [summaryEditing, setSummaryEditing] = useState(false);
  const [locationKeyDraft, setLocationKeyDraft] = useState(day.location?.key || '');
  const [summaryDraft, setSummaryDraft] = useState(day.summary || '');
  const [summarySaving, setSummarySaving] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const guideSearch = searchUrl(`${day.area} 景點故事 旅遊攻略 交通 建議`);

  useEffect(() => {
    if (!summaryEditing) setSummaryDraft(day.summary || '');
  }, [day.summary, summaryEditing]);

  useEffect(() => {
    if (summaryEditing) return;
    setLocationKeyDraft(day.location?.key || '');
    setSummaryDraft(day.summary || '');
  }, [day.location?.key, day.summary, summaryEditing]);

  async function saveDayDetails(event) {
    event.preventDefault();
    setSummarySaving(true);
    setSummaryError('');
    try {
      await onUpdateDetails(day.date, { locationKey: locationKeyDraft, summary: summaryDraft });
      setSummaryEditing(false);
    } catch (error) {
      setSummaryError(error.message || '儲存每日資訊失敗，請稍後再試。');
    } finally {
      setSummarySaving(false);
    }
  }

  function startSummaryEdit() {
    setSummaryError('');
    setLocationKeyDraft(day.location?.key || '');
    setSummaryDraft(day.summary || '');
    onEditDetails?.(day.id);
    setSummaryEditing(true);
  }

  function cancelSummaryEdit() {
    setLocationKeyDraft(day.location?.key || '');
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
    <>
      <article className={`day-card${isOpen ? ' day-open' : ''}`}>
        <div id={`day-card-heading-${day.id}`} className="day-card-heading">
          <button className="day-card-toggle" type="button" onClick={onToggle} aria-label={`${isOpen ? '收合' : '展開'}第 ${day.id} 天行程`} aria-expanded={isOpen} aria-controls={`day-card-body-${day.id}`} />
          <span className="day-index">{String(day.id).padStart(2, '0')}</span>
          <div className="day-title-group">
            <div className="day-title-line"><span className="day-date"><span>{day.weekday}</span><span>{day.date}</span></span></div>
            <div className="day-area">
              <MapPin size={12} />
              <span className="day-area-name">{day.area}</span>
              {onUpdateDetails && <button className="day-area-edit-button" type="button" aria-label={`編輯第 ${day.id} 天地點與摘要`} title="編輯每日地點與摘要" onClick={startSummaryEdit}><Pencil size={14} /></button>}
            </div>
          </div>
          <WeatherBadge weather={weather} />
          <ChevronDown className="day-chevron" size={18} />
        </div>
        {isOpen && (
          <div id={`day-card-body-${day.id}`} className="day-card-body">
            <div className="day-summary-row"><p className={`day-summary${day.summary ? '' : ' is-empty'}`}>{day.summary || '尚未新增每日摘要。'}</p></div>
            <div className="schedule-list">
              {day.events.map((event, index) => <EventCard event={event} key={event.id || `${day.id}-${index}`} onUpdate={onUpdateEvent ? (eventId, draft) => onUpdateEvent(eventId, draft) : undefined} onDelete={onDeleteEvent ? (eventId) => onDeleteEvent(eventId) : undefined} />)}
            </div>
            {onAddEvent && <button className="planner-add-event overview-add-event" type="button" onClick={() => { setEventError(''); setAddOpen(true); }}><Plus size={17} />加入行程</button>}
            {day.guide && <aside className="guide-panel">
              <div className="guide-heading"><Sparkles size={16} /><strong>小導遊筆記</strong><span>依行程整理</span></div>
              <p>{day.guide}</p>
              <a href={guideSearch} target="_blank" rel="noreferrer">搜尋景點故事與攻略 <ExternalLink size={14} /></a>
            </aside>}
          </div>
        )}
      </article>
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} eyebrow={`DAY ${day.id} · ${day.date}`} title="加入行程" maxWidth="760px" className="overview-event-modal">
          <form className="overview-event-form overview-event-modal-form" onSubmit={submitEvent}>
            <div className="planner-fields-grid">
              <label className="planner-field"><span>行程標題</span><input value={eventDraft.title} onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))} required maxLength={100} /></label>
              <label className="planner-field"><span>行程類型</span><select value={eventDraft.type} onChange={(event) => setEventDraft((current) => ({ ...current, type: event.target.value }))}>{itineraryTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="planner-field"><span>地址</span><input value={eventDraft.address} onChange={(event) => setEventDraft((current) => ({ ...current, address: event.target.value }))} /></label>
              <label className="planner-field planner-field-wide"><span>行程描述</span><textarea rows={2} value={eventDraft.description} onChange={(event) => setEventDraft((current) => ({ ...current, description: event.target.value }))} /></label>
              <label className="planner-field"><span>開始時間</span><input type="time" value={eventDraft.startTime} onChange={(event) => setEventDraft((current) => ({ ...current, startTime: event.target.value }))} /></label>
              <label className="planner-field"><span>結束時間</span><input type="time" value={eventDraft.endTime} onChange={(event) => setEventDraft((current) => ({ ...current, endTime: event.target.value }))} /></label>
            </div>
            {eventError && <p className="planner-error" role="alert">{eventError}</p>}
            <div className="planner-inline-actions"><button className="planner-primary" type="submit" disabled={savingEvent || !eventDraft.title.trim()}>{savingEvent ? '儲存中…' : <><Plus size={15} />加入行程</>}</button></div>
          </form>
      </Modal>
      <Modal isOpen={summaryEditing} onClose={cancelSummaryEdit} eyebrow={`DAILY ITINERARY · ${day.weekday} · ${day.date}`} title="編輯每日資訊" maxWidth="560px" className="day-summary-edit-modal">
          <form className="day-summary-edit-form" onSubmit={saveDayDetails}>
            <label className="planner-field"><span>第 {day.id} 天主要地點</span><select autoFocus value={locationKeyDraft} onChange={(event) => setLocationKeyDraft(event.target.value)}><option value="">請選擇主要地點</option>{dailyLocationOptions.map((location) => <option key={location.key} value={location.key}>{location.displayName}</option>)}</select></label>
            <label className="planner-field"><span>第 {day.id} 天摘要</span><textarea rows={3} maxLength={50} value={summaryDraft} onChange={(event) => setSummaryDraft(event.target.value)} placeholder="單獨記下這一天的重點或安排。" /></label>
            {summaryError && <p className="planner-error" role="alert">{summaryError}</p>}
            <div className="day-summary-actions"><button className="planner-primary" type="submit" disabled={summarySaving}>{summarySaving ? '儲存中…' : <><Check size={15} />儲存每日資訊</>}</button></div>
          </form>
      </Modal>
    </>
  );
}

function buildCalendarCells(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingOffset = new Date(year, month, 1).getDay();
  const cells = Array.from({ length: leadingOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day, 12));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function TripCalendar({ trip }) {
  const startDate = new Date(`${trip.startDate}T00:00:00`);
  const endDate = new Date(`${trip.endDate}T00:00:00`);
  const [viewYear, setViewYear] = useState(startDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(startDate.getMonth());
  const calendarCells = buildCalendarCells(viewYear, viewMonth);

  useEffect(() => {
    setViewYear(startDate.getFullYear());
    setViewMonth(startDate.getMonth());
  }, [trip.id]);

  function goPrevMonth() {
    setViewYear((year) => (viewMonth === 0 ? year - 1 : year));
    setViewMonth((month) => (month === 0 ? 11 : month - 1));
  }

  function goNextMonth() {
    setViewYear((year) => (viewMonth === 11 ? year + 1 : year));
    setViewMonth((month) => (month === 11 ? 0 : month + 1));
  }

  return (
    <div className="trip-calendar">
      <div className="trip-calendar-nav">
        <button className="trip-calendar-nav-button" type="button" aria-label="上一個月" onClick={goPrevMonth}><ChevronLeft size={16} /></button>
        <div className="trip-calendar-month">{viewYear} 年 {viewMonth + 1} 月</div>
        <button className="trip-calendar-nav-button" type="button" aria-label="下一個月" onClick={goNextMonth}><ChevronRight size={16} /></button>
      </div>
      <div className="trip-calendar-weekdays">{['日', '一', '二', '三', '四', '五', '六'].map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
      <div className="trip-calendar-grid">
        {calendarCells.map((cellDate, index) => {
          if (!cellDate) return <span className="trip-calendar-empty" key={`empty-${index}`} />;
          const dayTime = cellDate.getTime();
          const tripStart = startDate.getTime();
          const tripEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59).getTime();
          const isTripDay = dayTime >= tripStart && dayTime <= tripEnd;
          const weekdayIndex = index % 7;
          const isTripStart = cellDate.getFullYear() === startDate.getFullYear() && cellDate.getMonth() === startDate.getMonth() && cellDate.getDate() === startDate.getDate();
          const isTripEnd = cellDate.getFullYear() === endDate.getFullYear() && cellDate.getMonth() === endDate.getMonth() && cellDate.getDate() === endDate.getDate();
          const isFirstDayOfMonth = cellDate.getDate() === 1;
          const isLastDayOfMonth = cellDate.getDate() === new Date(cellDate.getFullYear(), cellDate.getMonth() + 1, 0).getDate();
          const roundLeft = isTripDay && (weekdayIndex === 0 || isTripStart || isFirstDayOfMonth);
          const roundRight = isTripDay && (weekdayIndex === 6 || isTripEnd || isLastDayOfMonth);
          return (
            <span
              className={`trip-calendar-day${isTripDay ? ' is-trip-day' : ''}${roundLeft ? ' is-trip-start' : ''}${roundRight ? ' is-trip-end' : ''}`}
              key={cellDate.toISOString()}
            >
              {cellDate.getDate()}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TripStatusCard({ trip, showCalendar = true }) {
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

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="trip-status-stack" aria-label="旅程日期與倒數">
      {showCalendar && <section className="trip-status-card trip-calendar-card"><TripCalendar trip={trip} /></section>}
      <section className="trip-status-card trip-countdown-card">
        <div className="trip-countdown">{!isFinished && !isOngoing && <div className="trip-countdown-values"><strong>{String(days).padStart(2, '0')}<small>日</small></strong><i>:</i><strong>{String(hours).padStart(2, '0')}<small>時</small></strong><i>:</i><strong>{String(minutes).padStart(2, '0')}<small>分</small></strong><i>:</i><strong>{String(seconds).padStart(2, '0')}<small>秒</small></strong></div>}</div>
      </section>
    </div>
  );
}


function TripOverview({ trip, onAddEvent, onUpdateEvent, onDeleteEvent, onUpdateDetails, onBack }) {
  const days = toOverviewDays(trip);
  const [openDay, setOpenDay] = useState(1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pendingScrollDay, setPendingScrollDay] = useState(null);
  const [weatherByDate, setWeatherByDate] = useState({});
  const weatherLoadKey = days.map((day) => `${day.date}:${day.location?.key || ''}`).join('|');

  useEffect(() => {
    const controller = new AbortController();
    const seededState = Object.fromEntries(days.map((day) => [day.date, day.location?.key ? { state: 'loading' } : null]));
    setWeatherByDate(seededState);

    async function loadWeather() {
      await Promise.all(days.map(async (day) => {
        if (!day.location?.key) return;
        try {
          const weather = await fetchDailyWeather(day, controller.signal);
          if (controller.signal.aborted) return;
          const weatherState = weather?.state
            ? weather
            : weather
              ? { state: 'ready', ...weather }
              : null;
          setWeatherByDate((current) => ({ ...current, [day.date]: weatherState }));
        } catch {
          if (controller.signal.aborted) return;
          setWeatherByDate((current) => ({ ...current, [day.date]: { state: 'error' } }));
        }
      }));
    }

    void loadWeather();
    return () => controller.abort();
  }, [trip.id, weatherLoadKey]);

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

  function openDayForEditing(dayId) {
    setOpenDay(dayId);
    setPendingScrollDay(dayId);
  }

  return (
    <div className="trip-overview">
      <div className="overview-back-bar">
        <button className="overview-back-button" type="button" onClick={onBack}>
          <span className="overview-back-icon-box">
            <ArrowLeft size={15} />
          </span>
          <span className="overview-back-text">返回旅程總覽</span>
        </button>
      </div>
      <div className="overview-countdown"><TripStatusCard trip={trip} showCalendar={false} /></div>
      <section className={`trip-hero${trip.coverImage ? ' has-cover' : ''}`}>
        {trip.coverImage && <img className="trip-hero-cover" src={trip.coverImage} alt="" />}
        <div className="trip-hero-copy">
          <div className="trip-hero-heading">
            <h1>{trip.title}</h1>
          </div>
          <p>{trip.description}</p>
        </div>
        <div className="trip-meta"><button className="trip-date-trigger" type="button" aria-haspopup="dialog" onClick={() => setCalendarOpen(true)}><CalendarDays size={15} />{formatTripDateRange(trip.startDate, trip.endDate)}</button><span><MapPin size={15} />{trip.country}</span></div>
        <div className="trip-hero-participants"><ParticipantAvatarStack participants={Object.values(trip.participants || {})} limit={6} className="participant-stack--hero" /></div>
      </section>

      <Modal isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} title="旅程日期" maxWidth="440px" className="trip-calendar-modal">
        <TripCalendar trip={trip} />
      </Modal>

      <section className="itinerary-section">
        {/* <div className="section-heading">
          <div><p className="section-eyebrow">YOUR DAILY ROUTE</p><h2>每日行程</h2></div>
          <span className="section-count">{days.length} DAYS</span>
        </div> */}
        <p className="weather-disclaimer"><Info size={14} />天氣依每日地點自動查詢，可能受資料來源與查詢時間影響。</p>
        <div className="day-list">
          {days.map((day) => (
            <DayCard key={day.id} day={day} weather={weatherByDate[day.date]} isOpen={openDay === day.id} onToggle={() => toggleDay(day.id)} onAddEvent={onAddEvent} onUpdateDetails={onUpdateDetails} onEditDetails={openDayForEditing} onUpdateEvent={(eventId, draft) => onUpdateEvent(day.date, eventId, draft)} onDeleteEvent={(eventId) => onDeleteEvent(day.date, eventId)} />
          ))}
        </div>
      </section>
    </div>
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

function packingProgress(items) {
  const packedCount = items.filter((item) => item.packed).length;
  return items.length ? Math.round((packedCount / items.length) * 100) : 0;
}

function packingProgressMessage(items, percentage) {
  return !items.length
    ? { tone: 'low', text: '清單還沒開始，先加上一項要帶的物品吧。' }
    : percentage === 0
      ? { tone: 'low', text: '行李還沒開始準備呢，先從一項開始吧。' }
      : percentage < 25
        ? { tone: 'low', text: '清單還有點空，慢慢開始準備吧。' }
        : percentage < 50
          ? { tone: 'low', text: '目前只完成一小段，再勾幾項就更有進度了。' }
          : percentage < 75
            ? { tone: 'mid', text: '已經一半囉！繼續保持。' }
            : percentage < 100
              ? { tone: 'high', text: '快準備完成了，再確認幾項就能安心出發。' }
              : { tone: 'complete', text: '全部準備好了，安心出發！' };
}

function PackingTripModal({ trip, user, packingStore, data, onClose }) {
  const [addOpen, setAddOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState('');
  const items = data?.items || [];
  const loadState = data?.loadState || 'loading';
  const loadError = data?.error || '';
  const packingPercentage = packingProgress(items);
  const packingMessage = packingProgressMessage(items, packingPercentage);

  function closeFromFooter() {
    setModalOpen(false);
    window.setTimeout(onClose, 200);
  }

  async function runPackingAction(action) {
    setActionError('');
    setWorking(true);
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(isRealtimeDatabasePermissionError(error)
        ? 'Realtime Database 規則尚未允許此帳號修改清單，請發布 database.rules.json。'
        : '儲存失敗，請檢查網路後再試。');
      return false;
    } finally {
      setWorking(false);
    }
  }

  function addItem(name) {
    const trimmedName = name.trim();
    if (!trimmedName) return Promise.resolve(false);
    return runPackingAction(() => packingStore.add(user.uid, trimmedName, trip.id));
  }

  function updateItem(itemId, name) {
    const trimmedName = name.trim();
    if (!trimmedName) return Promise.resolve(false);
    return runPackingAction(() => packingStore.updateName(user.uid, itemId, trimmedName, trip.id));
  }

  function toggleItem(itemId, packed) {
    return runPackingAction(() => packingStore.setPacked(user.uid, itemId, packed, trip.id));
  }

  function removeItem(itemId) {
    return runPackingAction(() => packingStore.remove(user.uid, itemId, trip.id));
  }

  function reorderItems(itemIds) {
    return runPackingAction(() => packingStore.reorder(user.uid, itemIds, trip.id));
  }

  async function submitNewItem(event) {
    event.preventDefault();
    const saved = await addItem(newItem);
    if (saved) {
      setNewItem('');
      setAddOpen(false);
      setActionError('');
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
    reorderItems(arrayMove(items, oldIndex, newIndex).map((item) => item.id));
  }

  return (
    <Modal
      isOpen={modalOpen}
      onClose={onClose}
      title={trip.title}
      ariaLabelledBy="packing-modal-title"
      maxWidth="640px"
      footer={<button className="primary-button" type="button" onClick={closeFromFooter}>完成</button>}
    >
      <div className="packing-board packing-board-modal" aria-label="個人攜帶清單">
        <header className="packing-board-header">
          <div><p>MY PACKING LIST</p><h2>出發準備</h2></div>
          <div className="packing-count"><strong>{packingPercentage}%</strong><p className={`packing-message packing-message-${packingMessage.tone}`}>{packingMessage.text}</p></div>
        </header>
        <div className="packing-progress" role="progressbar" aria-label="攜帶清單完成度" aria-valuemin="0" aria-valuemax="100" aria-valuenow={packingPercentage}>
          <span style={{ width: `${packingPercentage}%` }} />
        </div>

        {loadError && <div className="packing-error" role="alert"><AlertTriangle size={16} /><span>{loadError}</span></div>}
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
                    onToggle={toggleItem}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                    clearActionError={() => setActionError('')}
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
          <button className="packing-add-button" type="button" onClick={() => { setAddOpen(true); setActionError(''); }}><Plus size={17} />新增項目</button>
        )}
      </div>
    </Modal>
  );
}

function PackingListPage({ user, packingStore, trips }) {
  const [tripPackingData, setTripPackingData] = useState({});
  const [selectedTripId, setSelectedTripId] = useState(null);
  const tripIdsKey = trips.map(({ id }) => id).join('|');

  useEffect(() => {
    const tripIds = tripIdsKey ? tripIdsKey.split('|') : [];
    let active = true;
    const unsubscribers = [];
    setTripPackingData(Object.fromEntries(tripIds.map((tripId) => [tripId, { items: [], loadState: 'loading', error: '' }])));

    function updateTripData(tripId, changes) {
      if (!active) return;
      setTripPackingData((current) => ({
        ...current,
        [tripId]: { ...current[tripId], ...changes },
      }));
    }

    tripIds.forEach((tripId) => {
      try {
        unsubscribers.push(packingStore.subscribe(user.uid, (items) => updateTripData(tripId, { items, loadState: 'ready', error: '' }), (error) => updateTripData(tripId, {
          loadState: 'error',
          error: isRealtimeDatabasePermissionError(error)
            ? 'Realtime Database 規則尚未允許讀取此旅行的攜帶清單，請發布 database.rules.json。'
            : '無法讀取攜帶清單，請檢查網路連線或 Realtime Database 設定。',
        }), tripId));
      } catch (error) {
        updateTripData(tripId, { loadState: 'error', error: error.message || 'Firebase Realtime Database 尚未設定，無法載入攜帶清單。' });
      }
    });

    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [packingStore, user.uid, tripIdsKey]);

  const selectedTrip = trips.find(({ id }) => id === selectedTripId) || null;

  return (
    <section className="detail-page packing-page">
      <div className="page-heading">
        <p className="section-eyebrow">READY FOR THE JOURNEY</p>
        <h1>攜帶清單</h1>
      </div>

      {trips.length === 0 ? (
        <div className="packing-empty"><span className="packing-empty-icon"><MapPin size={20} /></span><strong>還沒有旅行</strong><p>先建立或加入一趟旅行，才能開始準備攜帶清單。</p></div>
      ) : (
        <div className="packing-trip-list">
          {trips.map((trip) => {
            const data = tripPackingData[trip.id];
            const items = data?.items || [];
            const isLoading = !data || data.loadState === 'loading';
            const hasError = data?.loadState === 'error';
            const percentage = packingProgress(items);
            const tone = percentage === 100 ? 'complete' : percentage >= 50 ? 'high' : percentage > 0 ? 'mid' : 'low';
            return (
              <button
                key={trip.id}
                className="trip-summary-row packing-summary-row"
                type="button"
                onClick={() => setSelectedTripId(trip.id)}
                aria-label={`開啟${trip.title}的攜帶清單${isLoading ? '' : `，完成進度 ${percentage}%`}`}
              >
                <span className="trip-summary-icon"><ClipboardList size={18} /></span>
                <span className="trip-summary-main"><strong>{trip.title}</strong></span>
                <span className="packing-summary-progress">
                  {isLoading ? (
                    <small className="packing-summary-progress-loading">讀取中…</small>
                  ) : hasError ? (
                    <small className="packing-summary-progress-error"><AlertTriangle size={12} />無法讀取</small>
                  ) : (
                    <>
                      <strong className={`packing-summary-progress-value is-${tone}`}>{percentage}%</strong>
                      <span className="packing-summary-progress-track"><span className={`is-${tone}`} style={{ width: `${percentage}%` }} /></span>
                      {/* <small>完成進度</small> */}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedTrip && (
        <PackingTripModal
          trip={selectedTrip}
          user={user}
          packingStore={packingStore}
          data={tripPackingData[selectedTrip.id]}
          onClose={() => setSelectedTripId(null)}
        />
      )}
    </section>
  );
}

function AddFlightModal({ trip, onClose, onSubmit }) {
  const [draft, setDraft] = useState(emptyFlight);
  const [modalOpen, setModalOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function closeAfterTransition() {
    setModalOpen(false);
    window.setTimeout(onClose, 200);
  }

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveFlight(event) {
    event.preventDefault();
    setError('');
    if (!draft.airline.trim() || !draft.date || !draft.departureAirport || !draft.arrivalAirport || draft.fare === '') {
      setError('請填寫航空公司、航班日期、出發機場、目的地機場與每人票價。');
      return;
    }
    if (!Number.isFinite(Number(draft.fare)) || Number(draft.fare) <= 0) {
      setError('每人票價必須是大於 0 的數字。');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(trip.id, draft);
      closeAfterTransition();
    } catch (saveError) {
      setError(saveError.message || '新增機票失敗，請稍後再試。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={modalOpen} onClose={onClose} eyebrow={`${trip.country} · FLIGHT DETAILS`} title="新增機票" maxWidth="760px" className="trip-record-form-modal">
      <form className="trip-record-form trip-record-form-flight" onSubmit={saveFlight}>
        <div className="planner-fields-grid flight-editor-grid">
          <Field label="航空公司" value={draft.airline} onChange={(event) => updateField('airline', event.target.value)} placeholder="航空公司" required />
          <Field label="航班日期" type="date" value={draft.date} min={trip.startDate} max={trip.endDate} onChange={(event) => updateField('date', event.target.value)} required />
          <AirportField label="出發機場" value={draft.departureAirport} onChange={(event) => updateField('departureAirport', event.target.value)} placeholder="選擇出發機場" />
          <AirportField label="目的地機場" value={draft.arrivalAirport} onChange={(event) => updateField('arrivalAirport', event.target.value)} placeholder="選擇目的地機場" />
          <Field label="出發時間" type="time" value={draft.departureTime} onChange={(event) => updateField('departureTime', event.target.value)} />
          <Field label="抵達時間" type="time" value={draft.arrivalTime} onChange={(event) => updateField('arrivalTime', event.target.value)} />
        </div>
        {error && <p className="planner-error" role="alert">{error}</p>}
        <div className="trip-record-form-flight-footer">
          <Field className="flight-fare-field" label="每人票價（TWD）" type="number" min="1" step="1" value={draft.fare} onChange={(event) => updateField('fare', event.target.value)} required />
          <div className="planner-inline-actions"><button className="planner-primary" type="submit" disabled={saving}>{saving ? '儲存中…' : <><Check size={15} />儲存機票</>}</button></div>
        </div>
      </form>
    </Modal>
  );
}

function AddLodgingModal({ trip, onClose, onSubmit }) {
  const [draft, setDraft] = useState(emptyLodging);
  const [modalOpen, setModalOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');

  function closeAfterTransition() {
    setModalOpen(false);
    window.setTimeout(onClose, 200);
  }

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveLodging(event) {
    event.preventDefault();
    setError('');
    if (!draft.name.trim() || !draft.checkIn || !draft.checkOut || draft.price === '') {
      setError('請填寫住宿名稱、入住日期、退房日期與住宿金額。');
      return;
    }
    if (draft.checkOut <= draft.checkIn) {
      setError('退房日期必須晚於入住日期。');
      return;
    }
    if (!Number.isFinite(Number(draft.price)) || Number(draft.price) <= 0) {
      setError('住宿金額必須是大於 0 的數字。');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(trip.id, draft);
      closeAfterTransition();
    } catch (saveError) {
      setError(saveError.message || '新增住宿失敗，請稍後再試。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={modalOpen} onClose={onClose} eyebrow={`${trip.country} · ACCOMMODATION`} title="新增住宿" maxWidth="760px" className="trip-record-form-modal">
      <form className="trip-record-form trip-record-form-lodging" onSubmit={saveLodging}>
        <div className="planner-fields-grid lodging-editor-grid">
          <Field className="lodging-half-field" label="住宿名稱" value={draft.name} onChange={(event) => updateField('name', event.target.value)} placeholder="飯店或住宿名稱" required />
          <Field className="lodging-half-field" label="住宿金額（TWD）" type="number" min="1" step="1" value={draft.price} onChange={(event) => updateField('price', event.target.value)} required />
          <Field className="planner-field-wide" label="住宿地址" value={draft.address} onChange={(event) => updateField('address', event.target.value)} placeholder="完整地址" />
          <Field className="lodging-half-field" label="入住日期" type="date" value={draft.checkIn} min={trip.startDate} max={draft.checkOut || trip.endDate} onChange={(event) => updateField('checkIn', event.target.value)} required />
          <Field className="lodging-half-field" label="退房日期" type="date" value={draft.checkOut} min={draft.checkIn || trip.startDate} max={trip.endDate} onChange={(event) => updateField('checkOut', event.target.value)} required />
          <label className="planner-field planner-field-wide"><span>住宿備註</span><textarea value={draft.note} onChange={(event) => updateField('note', event.target.value)} rows={2} placeholder="入住提醒、訂房資訊等" /></label>
          <ImageUploadField label="住宿封面圖片" image={draft.coverImage} error={imageError} onChange={(event) => { void loadSelectedImage(event, (coverImage) => updateField('coverImage', coverImage), setImageError); }} onRemove={() => { updateField('coverImage', ''); setImageError(''); }} />
        </div>
        {error && <p className="planner-error" role="alert">{error}</p>}
        <div className="planner-inline-actions"><button className="planner-primary" type="submit" disabled={saving}>{saving ? '儲存中…' : <><Check size={15} />儲存住宿</>}</button></div>
      </form>
    </Modal>
  );
}

function TransportationPage({ trips, onAddFlight, onDeleteFlight, working }) {
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [addingTrip, setAddingTrip] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const flightsByTripId = new Map(groupFlightsByTrip(trips).map(({ trip, flights }) => [trip.id, flights]));
  const flightGroups = trips.map((trip) => ({ trip, flights: flightsByTripId.get(trip.id) || [] }));

  async function deleteFlight(tripId, flight) {
    if (!window.confirm(`確定刪除「${flight.airline || '這筆機票'}」嗎？`)) return;
    setDeleteError('');
    try {
      await onDeleteFlight(tripId, flight);
    } catch (error) {
      setDeleteError(error.message || '刪除機票失敗，請稍後再試。');
    }
  }

  return (
    <section className="detail-page">
      <div className="page-heading"><p className="section-eyebrow">GETTING AROUND</p><h1>交通資訊</h1></div>
      {trips.length ? flightGroups.map(({ trip, flights }) => (
        <section className="transport-group trip-disclosure" key={trip.id}>
          <TripSummaryRow trip={trip} icon={Plane} countLabel={`${flights.length} 張機票`} variant="flight" onOpen={() => { setDeleteError(''); setSelectedTripId(trip.id); }} />
          {selectedTripId === trip.id && (
            <TripInfoModal trip={trip} topic="FLIGHT DETAILS" onClose={() => setSelectedTripId(null)}>
              {deleteError && <p className="planner-error trip-record-delete-error" role="alert">{deleteError}</p>}
              {flights.length ? <div className="flight-list">
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
                    <div className="flight-card-footer">
                      <button className="trip-record-delete-button flight-record-delete-button" type="button" aria-label={`刪除機票 ${index + 1}`} title="刪除機票" onClick={() => deleteFlight(trip.id, flight)} disabled={working}><Trash2 size={16} /></button>
                      {flight.fare && <div className="flight-fare"><span>每人票價</span><strong>NT$ {new Intl.NumberFormat('zh-TW').format(Number(String(flight.fare).replace(/,/g, '')))}<small> / 人</small></strong></div>}
                    </div>
                  </article>
                );
                })}
              </div> : <p className="trip-info-empty">尚未新增機票。</p>}
              <button className="trip-info-add-button trip-info-add-button-flight" type="button" aria-label="新增機票" title="新增機票" onClick={() => setAddingTrip(trip)}><Plus size={19} /></button>
            </TripInfoModal>
          )}
        </section>
      )) : <p className="trip-info-empty">{trips.length ? '你的旅程尚未填寫機票資訊。' : '目前沒有可顯示的旅行。'}</p>}
      {addingTrip && <AddFlightModal trip={addingTrip} onClose={() => setAddingTrip(null)} onSubmit={onAddFlight} />}
    </section>
  );
}

function LodgingPage({ trips, onAddLodging, onDeleteLodging, working }) {
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [addingTrip, setAddingTrip] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const lodgingsByTripId = new Map();
  getTripsWithLodging(trips).forEach((record) => {
    const group = lodgingsByTripId.get(record.trip.id) || [];
    group.push(record);
    lodgingsByTripId.set(record.trip.id, group);
  });
  const lodgingGroups = trips.map((trip) => ({ trip, lodgings: lodgingsByTripId.get(trip.id) || [] }));

  async function deleteLodgingRecord(tripId, lodging) {
    if (!window.confirm(`確定刪除「${lodging.name || '這筆住宿'}」嗎？`)) return;
    setDeleteError('');
    try {
      await onDeleteLodging(tripId, lodging);
    } catch (error) {
      setDeleteError(error.message || '刪除住宿失敗，請稍後再試。');
    }
  }

  return (
    <section className="detail-page">
      <div className="page-heading"><p className="section-eyebrow">ACCOMMODATION</p><h1>住宿資訊</h1></div>
      {trips.length ? lodgingGroups.map(({ trip, lodgings }) => (
        <section className="transport-group lodging-trip-group trip-disclosure" key={trip.id}>
          <TripSummaryRow trip={trip} icon={BedDouble} countLabel={`${lodgings.length} 間住宿`} variant="lodging" onOpen={() => { setDeleteError(''); setSelectedTripId(trip.id); }} />
          {selectedTripId === trip.id && (
            <TripInfoModal trip={trip} topic="ACCOMMODATION" onClose={() => setSelectedTripId(null)}>
              {deleteError && <p className="planner-error trip-record-delete-error" role="alert">{deleteError}</p>}
              {lodgings.length ? <div className="lodging-card-list">
                {lodgings.map(({ lodging, index }) => {
                const nights = lodging.checkIn && lodging.checkOut
                  ? `${Math.max(Math.round((new Date(`${lodging.checkOut}T00:00:00`) - new Date(`${lodging.checkIn}T00:00:00`)) / 86400000), 0)} 晚`
                  : '尚未設定';
                return (
                  <article className="lodging-card" key={`${trip.id}-${lodging.formId || index}`}>
                    {lodging.coverImage ? <img className="lodging-visual lodging-custom-cover" src={lodging.coverImage} alt={`${lodging.name || '住宿'}封面`} /> : <div className="lodging-visual" aria-hidden="true" />}
                    <div className="lodging-body">
                      <div className="lodging-card-heading"><div className="lodging-kicker"><BedDouble size={15} /> ACCOMMODATION</div><button className="trip-record-delete-button lodging-record-delete-button" type="button" aria-label={`刪除住宿 ${index + 1}`} title="刪除住宿" onClick={() => deleteLodgingRecord(trip.id, lodging)} disabled={working}><Trash2 size={16} /></button></div>
                      <h2>{lodging.name || '住宿資訊'}</h2>
                      {lodging.address && <a className="lodging-address" href={mapsUrl(lodging.address)} target="_blank" rel="noreferrer"><MapPin size={16} /><span>{lodging.address}</span><ExternalLink size={14} /></a>}
                      {(lodging.note || lodging.checkIn || lodging.checkOut) && <p className="lodging-note">{lodging.note || `${lodging.checkIn || ''}${lodging.checkOut ? ` 至 ${lodging.checkOut}` : ''}`}</p>}
                      <div className="lodging-facts"><div><span>入住日期</span><strong>{lodging.checkIn || '尚未設定'}</strong></div><div><span>退房日期</span><strong>{lodging.checkOut || '尚未設定'}</strong></div><div><span>住宿晚數</span><strong>{nights}</strong></div>{lodging.price && <div className="lodging-price-fact"><span>住宿金額</span><strong>NT$ {new Intl.NumberFormat('zh-TW').format(Number(String(lodging.price).replace(/[^0-9]/g, '')))}</strong></div>}</div>
                    </div>
                  </article>
                );
                })}
              </div> : <p className="trip-info-empty">尚未新增住宿。</p>}
              <button className="trip-info-add-button trip-info-add-button-lodging" type="button" aria-label="新增住宿" title="新增住宿" onClick={() => setAddingTrip(trip)}><Plus size={19} /></button>
            </TripInfoModal>
          )}
        </section>
      )) : <p className="trip-info-empty">目前沒有可顯示的旅行。</p>}
      {addingTrip && <AddLodgingModal trip={addingTrip} onClose={() => setAddingTrip(null)} onSubmit={onAddLodging} />}
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

  async function runTravelAction(action) {
    setTravelError('');
    setTravelWorking(true);
    try {
      return await action();
    } catch (error) {
      if (error.code === 'trip-limit-reached') window.alert(error.message);
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

  function checkTripCapacity(tripId) {
    return runTravelAction(() => travelStore.checkTripCapacity(user.uid, tripId));
  }

  function addTripFlight(tripId, flight) {
    return runTravelAction(() => travelStore.addFlight(tripId, flight));
  }

  function addTripLodging(tripId, lodging) {
    return runTravelAction(() => travelStore.addLodging(tripId, lodging));
  }

  function deleteTripFlight(tripId, flight) {
    return runTravelAction(() => travelStore.removeFlight(tripId, flight));
  }

  function deleteTripLodging(tripId, lodging) {
    return runTravelAction(() => travelStore.removeLodging(tripId, lodging));
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
    return runTravelAction(async () => {
      await travelStore.checkTripCapacity(user.uid, tripId.trim());
      return travelStore.getTripPreview(tripId);
    });
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
    { id: 'itinerary', label: '旅程總覽', icon: MapIcon },
    { id: 'transport', label: '交通資訊', icon: Plane },
    { id: 'lodging', label: '住宿資訊', icon: BedDouble },
    { id: 'expenses', label: '記帳幫手', icon: Receipt },
    { id: 'packing', label: '攜帶清單', icon: ClipboardList },
  ];
  const activeTrip = travelItems.find((trip) => trip.id === activeTravelId) || null;

  return (
    <div className="trip-app">
      <aside className="trip-sidebar">
        <a className="trip-brand" href="#trip" onClick={(event) => { event.preventDefault(); setActiveTravelId(null); setSection('itinerary'); }}>
          <span className="trip-brand-mark" aria-hidden="true"><Compass size={17} strokeWidth={1.7} /></span><span className="trip-brand-name">TRAVEL<small>JOURNAL</small></span>
        </a>
        <div className="sidebar-trip-label"><strong style={{ fontSize: '14px' }}>{activeTrip?.title || '開始規劃旅程'}</strong></div>
        <nav className="trip-nav" aria-label="行程導覽">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button className={`trip-nav-item${section === id ? ' active' : ''}`} key={id} type="button" onClick={() => { if (id === 'itinerary') setActiveTravelId(null); setSection(id); }}>
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
          {section === 'itinerary' && !activeTravelId && <TravelPlanner key={section} uid={user.uid} trips={travelItems} loadState={travelLoadState} error={travelError} working={travelWorking} onCheckCapacity={checkTripCapacity} onCreate={createTrip} onJoin={joinTrip} onPreviewJoin={previewTrip} onDeleteTrip={deleteTrip} onOpenTrip={(tripId) => { setActiveTravelId(tripId); setSection('itinerary'); }} />}
          {section === 'itinerary' && activeTravelId && !activeTrip && <div className="planner-empty-state">正在載入旅程…</div>}
          {section === 'itinerary' && activeTrip && <TripOverview key={activeTrip.id} trip={activeTrip} onAddEvent={(date, event) => addTripEvent(activeTrip.id, date, event)} onUpdateEvent={(date, eventId, event) => updateTripEvent(activeTrip.id, date, eventId, event)} onDeleteEvent={(date, eventId) => deleteTripEvent(activeTrip.id, date, eventId)} onUpdateDetails={(date, details) => updateTripDayDetails(activeTrip.id, date, details)} onBack={() => setActiveTravelId(null)} />}
          {section === 'transport' && <TransportationPage trips={travelItems} onAddFlight={addTripFlight} onDeleteFlight={deleteTripFlight} working={travelWorking} />}
          {section === 'lodging' && <LodgingPage trips={travelItems} onAddLodging={addTripLodging} onDeleteLodging={deleteTripLodging} working={travelWorking} />}
          {section === 'expenses' && <ExpensePage user={user} expenseStore={expenseStore} trips={travelItems} />}
          {section === 'packing' && <PackingListPage user={user} packingStore={packingStore} trips={travelItems} />}
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
