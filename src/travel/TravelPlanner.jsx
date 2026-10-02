import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BedDouble, CalendarDays, Check, CirclePlus, Copy, ImagePlus, MapPin, Pencil, Plane, Plus, Trash2, Users, X } from 'lucide-react';
import { airports, getAirportLabel } from './airports.js';
import { tripCountries } from '../config/tripCountries.js';
import { readImageFileAsDataUrl } from './imageUtils.js';
import { getDailyLocationByKey, getDailyLocationOptions } from './locationMapping.js';
import { buildTripDays, formatTripDateRange, isTripOwner, itineraryTypeOptions, sortItineraryEvents } from './travelUtils.js';
import './travelPlanner.css';

function formItemId(kind) {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyFlight() {
  return {
    formId: formItemId('flight'),
    airline: '',
    departureAirport: '',
    arrivalAirport: '',
    departureTime: '',
    arrivalTime: '',
    date: '',
    fare: '',
  };
}

export function emptyLodging() {
  return { formId: formItemId('lodging'), name: '', address: '', checkIn: '', checkOut: '', price: '', note: '', coverImage: '' };
}

function emptyTrip() {
  return {
    title: '',
    description: '',
    country: '',
    startDate: '',
    endDate: '',
    coverImage: '',
    flights: [],
    lodging: [],
  };
}

const emptyEvent = { title: '', description: '', startTime: '', endTime: '', address: '', type: 'sight' };
const airportGroups = [
  { country: 'TW', label: '台灣' },
  { country: 'JP', label: '日本' },
];
const dailyLocationOptions = getDailyLocationOptions();

export function Field({ label, className = '', ...inputProps }) {
  return <label className={`planner-field${className ? ` ${className}` : ''}`}><span>{label}</span><input {...inputProps} /></label>;
}

export async function loadSelectedImage(event, onImage, setError) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  setError('');
  try {
    onImage(await readImageFileAsDataUrl(file));
  } catch (error) {
    setError(error.message);
  }
}

export function ImageUploadField({ label, image, error, onChange, onRemove }) {
  return (
    <div className="planner-image-field planner-field-wide">
      <div className="planner-image-heading"><span>{label}</span><span className="planner-image-format">JPG / PNG <i /> 1 MiB 以內</span></div>
      <label className={`planner-image-uploader${image ? ' has-image' : ''}`}>
        {image ? <><img className="planner-image-preview" src={image} alt={`${label}預覽`} /><span className="planner-image-overlay"><span><ImagePlus size={16} />更換封面</span></span></> : <span className="planner-image-empty"><span className="planner-image-icon"><ImagePlus size={20} /></span><strong>選擇封面照片</strong><small>點擊此處瀏覽圖檔</small></span>}
        <input type="file" aria-label={`選擇${label}`} accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={onChange} />
      </label>
      <div className="planner-image-footer">
        <span className={image ? 'planner-image-ready' : ''}>{image ? '封面已準備好' : '尚未選擇圖片'}</span>
        {image && <button className="planner-image-remove" type="button" onClick={onRemove}><X size={14} />移除封面</button>}
      </div>
      {error && <span className="planner-image-error" role="alert">{error}</span>}
    </div>
  );
}

export function AirportField({ label, value, onChange, placeholder }) {
  return (
    <label className="planner-field">
      <span>{label}</span>
      <select value={value} onChange={onChange} required>
        <option value="">{placeholder}</option>
        {airportGroups.map((group) => (
          <optgroup label={group.label} key={group.country}>
            {airports.filter((airport) => airport.country === group.country).map((airport) => (
              <option value={airport.code} key={airport.code}>{airport.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export function TravelIdCopyButton({ id }) {
  const [copied, setCopied] = useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="travel-id-copy" type="button" aria-label={copied ? '已複製旅行 ID' : '複製旅行 ID'} title={copied ? '已複製' : '複製旅行 ID'} onClick={copyId}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function ParticipantAvatar({ participant }) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = participant.name || '旅人';

  useEffect(() => setImageFailed(false), [participant.photoURL]);

  return participant.photoURL && !imageFailed
    ? <img className="participant-avatar" src={participant.photoURL} alt="" onError={() => setImageFailed(true)} />
    : <span className="participant-avatar participant-avatar-initial" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
}

export function ParticipantAvatarStack({ participants = [], limit = 3, className = '' }) {
  const [open, setOpen] = useState(false);
  const stackRef = useRef(null);
  const overflow = Math.max(participants.length - limit, 0);

  useEffect(() => {
    if (!open) return undefined;
    function dismiss(event) {
      if (!stackRef.current?.contains(event.target)) setOpen(false);
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
  }, [open]);

  if (!participants.length) return null;

  return (
    <div
      className={`participant-stack${className ? ` ${className}` : ''}${open ? ' is-open' : ''}`}
      ref={stackRef}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setOpen(false); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    >
      <button className="participant-stack-trigger" type="button" aria-label={`查看 ${participants.length} 位旅伴`} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className="participant-avatar-row">
          {participants.slice(0, limit).map((participant, index) => <ParticipantAvatar key={participant.uid || `${participant.name}-${index}`} participant={participant} />)}
          {overflow > 0 && <span className="participant-avatar participant-avatar-overflow">+{overflow}</span>}
        </span>
      </button>
      <div className="participant-names" aria-label="旅伴名單">
        {participants.map((participant, index) => <span key={participant.uid || `${participant.name}-${index}`}>{participant.name || '旅人'}</span>)}
      </div>
    </div>
  );
}

function TravelCard({ trip, onOpen, onDelete, canDelete }) {
  const participants = Object.values(trip.participants || {});
  return (
    <article className={`travel-card${trip.coverImage ? ' has-cover' : ''}`}>
      {trip.coverImage && <img className="travel-card-cover" src={trip.coverImage} alt="" />}
      <button className="travel-card-select" type="button" aria-label={`開啟旅程：${trip.title}`} onClick={() => onOpen(trip.id)} />
      <div className="travel-card-content">
        <div className="travel-card-top"><span className="travel-card-country">{trip.country || '未設定國家'}</span><div className="travel-card-tools"><ParticipantAvatarStack participants={participants} limit={3} className="participant-stack--card" />{canDelete && <button className="travel-card-delete" type="button" aria-label={`刪除旅程：${trip.title}`} title="刪除整趟旅行" onClick={() => onDelete(trip)}><Trash2 size={15} /></button>}</div></div>
        <span className="travel-card-title">{trip.title}</span>
        <span className="travel-card-date"><CalendarDays size={15} />{formatTripDateRange(trip.startDate, trip.endDate)}</span>
        <span className="travel-card-description">{trip.description || '還沒有旅程描述。'}</span>
        <div className="travel-card-footer">
          <span className="travel-card-id"><TravelIdCopyButton id={trip.id} /><span className="travel-card-id-value">{trip.id}</span></span>
          <span className="travel-card-open">開啟旅程 <ArrowRight size={15} /></span>
        </div>
      </div>
    </article>
  );
}

export default function TravelPlanner({ uid, trips, loadState, error, working, onCreate, onJoin, onPreviewJoin, onDeleteTrip, onOpenTrip }) {
  const [mode, setMode] = useState('list');
  const [step, setStep] = useState(1);
  const [trip, setTrip] = useState(emptyTrip);
  const [dailySummaries, setDailySummaries] = useState({});
  const [dailyLocations, setDailyLocations] = useState({});
  const [editingFlightId, setEditingFlightId] = useState(null);
  const [flightDraft, setFlightDraft] = useState(null);
  const [newFlightDraft, setNewFlightDraft] = useState(false);
  const [editingLodgingId, setEditingLodgingId] = useState(null);
  const [lodgingDraft, setLodgingDraft] = useState(null);
  const [newLodgingDraft, setNewLodgingDraft] = useState(false);
  const [itinerary, setItinerary] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [eventDraft, setEventDraft] = useState(emptyEvent);
  const [eventOpen, setEventOpen] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [formError, setFormError] = useState('');
  const [coverImageError, setCoverImageError] = useState('');
  const [lodgingImageError, setLodgingImageError] = useState('');
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinPreview, setJoinPreview] = useState(null);
  const [previewWorking, setPreviewWorking] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteText, setDeleteText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteWorking, setDeleteWorking] = useState(false);

  useEffect(() => {
    if (!joinOpen) return undefined;

    function dismissOnEscape(event) {
      if (event.key === 'Escape') closeJoinDialog();
    }

    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [joinOpen]);

  const days = useMemo(() => {
    if (!trip.startDate || !trip.endDate) return [];
    try {
      return buildTripDays(trip.startDate, trip.endDate);
    } catch {
      return [];
    }
  }, [trip.startDate, trip.endDate]);
  const selectedDay = days.find((day) => day.date === selectedDate) || days[0];
  const selectedEvents = selectedDay ? sortItineraryEvents(itinerary[selectedDay.date] || []) : [];

  function updateTripField(field, value) {
    setTrip((current) => ({ ...current, [field]: value }));
  }

  function startFlightDraft(flight, isNew = false) {
    if (editingFlightId || editingLodgingId) return;
    setEditingFlightId(flight.formId);
    setFlightDraft({ ...flight });
    setNewFlightDraft(isNew);
  }

  function startLodgingDraft(lodging, isNew = false) {
    if (editingFlightId || editingLodgingId) return;
    setEditingLodgingId(lodging.formId);
    setLodgingDraft({ ...lodging });
    setNewLodgingDraft(isNew);
    setLodgingImageError('');
  }

  function updateFlightDraft(field, value) {
    setFlightDraft((current) => ({ ...current, [field]: value }));
  }

  function updateLodgingDraft(field, value) {
    setLodgingDraft((current) => ({ ...current, [field]: value }));
  }

  function addFlight() {
    if (editingFlightId || editingLodgingId) return;
    const draft = emptyFlight();
    setTrip((current) => ({
      ...current,
      flights: [...current.flights, draft],
    }));
    startFlightDraft(draft, true);
  }

  function saveFlightDraft() {
    if (!flightDraft.airline.trim() || !flightDraft.date || !flightDraft.departureAirport || !flightDraft.arrivalAirport || flightDraft.fare === '') {
      setFormError('請填寫航空公司、航班日期、出發機場、目的地機場與每人票價。');
      return;
    }
    if (!Number.isFinite(Number(flightDraft.fare)) || Number(flightDraft.fare) <= 0) {
      setFormError('每人票價必須是大於 0 的數字。');
      return;
    }
    setTrip((current) => ({
      ...current,
      flights: current.flights.map((flight) => flight.formId === editingFlightId ? { ...flightDraft, saved: true } : flight),
    }));
    setEditingFlightId(null);
    setFlightDraft(null);
    setNewFlightDraft(false);
    setFormError('');
  }

  function cancelFlightDraft() {
    if (newFlightDraft) removeFlight(editingFlightId);
    setEditingFlightId(null);
    setFlightDraft(null);
    setNewFlightDraft(false);
    setFormError('');
  }

  function removeFlight(formId) {
    setTrip((current) => ({ ...current, flights: current.flights.filter((flight) => flight.formId !== formId) }));
  }

  function addLodging() {
    if (editingFlightId || editingLodgingId) return;
    const draft = emptyLodging();
    setTrip((current) => ({ ...current, lodging: [...current.lodging, draft] }));
    startLodgingDraft(draft, true);
  }

  function saveLodgingDraft() {
    if (!lodgingDraft.name.trim() || !lodgingDraft.checkIn || !lodgingDraft.checkOut || lodgingDraft.price === '') {
      setFormError('請填寫住宿名稱、入住日期、退房日期與住宿金額。');
      return;
    }
    if (lodgingDraft.checkOut <= lodgingDraft.checkIn) {
      setFormError('退房日期必須晚於入住日期。');
      return;
    }
    if (!Number.isFinite(Number(lodgingDraft.price)) || Number(lodgingDraft.price) <= 0) {
      setFormError('住宿金額必須是大於 0 的數字。');
      return;
    }
    setTrip((current) => ({
      ...current,
      lodging: current.lodging.map((lodging) => lodging.formId === editingLodgingId ? { ...lodgingDraft, saved: true } : lodging),
    }));
    setEditingLodgingId(null);
    setLodgingDraft(null);
    setNewLodgingDraft(false);
    setFormError('');
  }

  function cancelLodgingDraft() {
    if (newLodgingDraft) removeLodging(editingLodgingId);
    setEditingLodgingId(null);
    setLodgingDraft(null);
    setNewLodgingDraft(false);
    setFormError('');
  }

  function removeLodging(formId) {
    setTrip((current) => ({ ...current, lodging: current.lodging.filter((lodging) => lodging.formId !== formId) }));
  }

  function startCreate() {
    setTrip(emptyTrip());
    setCoverImageError('');
    setLodgingImageError('');
    setDailySummaries({});
    setDailyLocations({});
    setEditingFlightId(null);
    setFlightDraft(null);
    setEditingLodgingId(null);
    setLodgingDraft(null);
    setItinerary({});
    setSelectedDate('');
    setStep(1);
    setFormError('');
    setMode('create');
    closeJoinDialog();
  }

  function openJoinDialog() {
    setJoinId('');
    setJoinPreview(null);
    setFormError('');
    setJoinOpen(true);
  }

  function closeJoinDialog() {
    setJoinOpen(false);
    setJoinPreview(null);
    setJoinId('');
    setFormError('');
  }

  function openDeleteDialog(trip) {
    setDeleteTarget(trip);
    setDeleteText('');
    setDeleteError('');
  }

  function closeDeleteDialog() {
    if (deleteWorking) return;
    setDeleteTarget(null);
    setDeleteText('');
    setDeleteError('');
  }

  async function confirmDeleteTrip() {
    if (!deleteTarget || deleteText !== deleteTarget.title || !isTripOwner(deleteTarget, uid)) return;
    setDeleteWorking(true);
    setDeleteError('');
    try {
      await onDeleteTrip(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteText('');
    } catch (deleteRequestError) {
      setDeleteError(deleteRequestError.message || '刪除旅行失敗，請稍後再試。');
    } finally {
      setDeleteWorking(false);
    }
  }

  function continueToSchedule(event) {
    event.preventDefault();
    setFormError('');
    if (editingFlightId || editingLodgingId) {
      setFormError('請先確認或取消正在編輯的機票／住宿卡片。');
      return;
    }
    try {
      const nextDays = buildTripDays(trip.startDate, trip.endDate);
      setSelectedDate(nextDays[0].date);
      setStep(2);
    } catch (validationError) {
      setFormError(validationError.message);
    }
  }

  function addEvent(event) {
    event.preventDefault();
    if (!eventDraft.title.trim()) return;
    setItinerary((current) => ({
      ...current,
      [selectedDay.date]: [...(current[selectedDay.date] || []), { ...eventDraft, id: `${Date.now()}` }],
    }));
    setEventDraft(emptyEvent);
    setEventOpen(false);
  }

  async function submitTrip() {
    setFormError('');
    try {
      const itineraryDates = new Set([...Object.keys(itinerary), ...Object.keys(dailySummaries), ...Object.keys(dailyLocations)]);
      const storedItinerary = Object.fromEntries([...itineraryDates].flatMap((date) => {
        const dayData = {};
        const selectedLocation = getDailyLocationByKey(dailyLocations[date]);
        const summary = dailySummaries[date]?.trim();
        const events = itinerary[date] || [];
        if (selectedLocation) {
          dayData.area = selectedLocation.displayName;
          dayData.location = {
            key: selectedLocation.key,
            country: selectedLocation.country,
            city: selectedLocation.city,
            displayName: selectedLocation.displayName,
            weatherMapping: selectedLocation.weatherMapping,
          };
        }
        if (summary) dayData.summary = summary;
        if (events.length) dayData.events = Object.fromEntries(events.map(({ id, ...item }) => [id, item]));
        return Object.keys(dayData).length ? [[date, dayData]] : [];
      }));
      const tripId = await onCreate({
        ...trip,
        flights: trip.flights.filter((flight) => flight.saved).map(({ formId, saved, ...flight }) => flight),
        lodging: trip.lodging.filter((lodging) => lodging.saved).map(({ formId, saved, ...lodging }) => lodging),
        itinerary: storedItinerary,
      });
      setMode('list');
      onOpenTrip(tripId);
    } catch (createError) {
      setFormError(createError.message || '建立旅行失敗，請稍後再試。');
    }
  }

  async function previewJoin(event) {
    event.preventDefault();
    setFormError('');
    setJoinPreview(null);
    setPreviewWorking(true);
    try {
      const preview = await onPreviewJoin(joinId);
      setJoinPreview(preview);
    } catch (previewError) {
      setFormError(previewError.message || '無法讀取旅行資訊，請確認 ID 後再試。');
    } finally {
      setPreviewWorking(false);
    }
  }

  async function submitJoin() {
    if (!joinPreview) return;
    setFormError('');
    try {
      const tripId = await onJoin(joinPreview.id);
      closeJoinDialog();
      onOpenTrip(tripId);
    } catch (joinError) {
      setFormError(joinError.message || '加入旅行失敗，請稍後再試。');
    }
  }

  if (mode === 'create') {
    return (
      <section className="detail-page planner-page">
        <button className="overview-back-button planner-create-back" type="button" onClick={() => setMode('list')}>
          <span className="overview-back-icon-box"><ArrowLeft size={15} /></span>
          <span className="overview-back-text">我的旅行</span>
        </button>
        <header className="planner-heading"><p className="section-eyebrow">A NEW JOURNEY</p><h1>{step === 1 ? '新建旅行' : '安排每日行程'}</h1><p>{step === 1 ? '先定下旅程的方向，再慢慢填入出發細節。' : `${trip.title} · ${formatTripDateRange(trip.startDate, trip.endDate)}`}</p></header>
        <div className="planner-steps" aria-label="建立旅行步驟"><span className={step === 1 ? 'active' : 'complete'}><i>{step > 1 ? <Check size={13} /> : '1'}</i>旅程資訊</span><span className={step === 2 ? 'active' : ''}><i>2</i>每日行程</span></div>

        {step === 1 ? (
          <form className="planner-form" onSubmit={continueToSchedule}>
            <section className="planner-form-section"><div className="planner-section-title"><span>01</span><div><h2>旅程主要資訊</h2><p>日期、目的地與同行人都可以再調整。</p></div></div>
              <div className="planner-fields-grid">
                <Field label="旅行標題" value={trip.title} onChange={(event) => updateTripField('title', event.target.value)} maxLength={80} placeholder="例如：京都紅葉小旅行" required />
                <label className="planner-field"><span>國家／目的地</span><select value={trip.country} onChange={(event) => updateTripField('country', event.target.value)} required><option value="">請選擇國家</option>{tripCountries.map((country) => <option key={country.code} value={country.name}>{country.name}</option>)}</select></label>
                <label className="planner-field planner-field-wide"><span>旅行描述</span><textarea value={trip.description} onChange={(event) => updateTripField('description', event.target.value)} maxLength={500} placeholder="記下這趟旅行的期待或重點。" rows={3} /></label>
                <Field label="出發日期" type="date" value={trip.startDate} onChange={(event) => updateTripField('startDate', event.target.value)} required />
                <Field label="回程日期" type="date" value={trip.endDate} min={trip.startDate || undefined} onChange={(event) => updateTripField('endDate', event.target.value)} required />
                <ImageUploadField label="旅行封面圖片" image={trip.coverImage} error={coverImageError} onChange={(event) => { void loadSelectedImage(event, (coverImage) => updateTripField('coverImage', coverImage), setCoverImageError); }} onRemove={() => { updateTripField('coverImage', ''); setCoverImageError(''); }} />
              </div>
            </section>

            <section className="planner-form-section"><div className="planner-section-title"><span>02</span><div><h2>機票資訊</h2><p>新增需要的班機，每筆票價與機場均須填寫。</p></div></div>
              <div className="planner-repeat-list">{trip.flights.map((flight, index) => editingFlightId === flight.formId ? <article className="planner-repeat-card is-editing" key={flight.formId}>
                <header className="planner-repeat-heading"><h3><Plane size={16} />機票 {index + 1}</h3><div className="planner-item-controls"><button className="planner-confirm-item" type="button" aria-label="確認機票" title="確認機票" onClick={saveFlightDraft}><Check size={17} /></button><button className="planner-cancel-item" type="button" aria-label="取消編輯" title="返回" onClick={cancelFlightDraft}><ArrowLeft size={17} /></button></div></header>
                <div className="planner-fields-grid flight-editor-grid">
                  <Field label="航空公司" value={flightDraft.airline} onChange={(event) => updateFlightDraft('airline', event.target.value)} placeholder="航空公司" required />
                  <Field label="航班日期" type="date" value={flightDraft.date} min={trip.startDate} max={trip.endDate} onChange={(event) => updateFlightDraft('date', event.target.value)} required />
                  <AirportField label="出發機場" value={flightDraft.departureAirport} onChange={(event) => updateFlightDraft('departureAirport', event.target.value)} placeholder="選擇出發機場" />
                  <AirportField label="目的地機場" value={flightDraft.arrivalAirport} onChange={(event) => updateFlightDraft('arrivalAirport', event.target.value)} placeholder="選擇目的地機場" />
                  <Field label="出發時間" type="time" value={flightDraft.departureTime} onChange={(event) => updateFlightDraft('departureTime', event.target.value)} />
                  <Field label="抵達時間" type="time" value={flightDraft.arrivalTime} onChange={(event) => updateFlightDraft('arrivalTime', event.target.value)} />
                  <Field className="flight-fare-field" label="每人票價（TWD）" type="number" min="1" step="1" value={flightDraft.fare} onChange={(event) => updateFlightDraft('fare', event.target.value)} required />
                </div>
              </article> : <article className="planner-repeat-card planner-saved-card" key={flight.formId}>
                <header className="planner-repeat-heading"><h3><Plane size={16} />機票 {index + 1}</h3><div className="planner-item-controls"><button className="planner-edit-item" type="button" aria-label={`編輯機票 ${index + 1}`} title="編輯機票" onClick={() => startFlightDraft(flight)} disabled={Boolean(editingFlightId || editingLodgingId)}><Pencil size={16} /></button><button className="planner-remove-item" type="button" aria-label={`刪除機票 ${index + 1}`} title="刪除機票" onClick={() => removeFlight(flight.formId)}><Trash2 size={15} /></button></div></header>
                <div className="planner-ticket-meta"><strong>{flight.airline}</strong><span>{flight.date}</span></div>
                <div className="planner-ticket-route"><div><span>出發</span><div className="planner-ticket-airport-line"><strong>{getAirportLabel(flight.departureAirport)}</strong><small>{flight.departureTime || '時間未定'}</small></div></div><ArrowRight size={17} /><div><span>目的地</span><div className="planner-ticket-airport-line"><strong>{getAirportLabel(flight.arrivalAirport)}</strong><small>{flight.arrivalTime || '時間未定'}</small></div></div></div>
                <div className="planner-ticket-price"><strong>NT$ {new Intl.NumberFormat('zh-TW').format(Number(flight.fare))} / 人</strong></div>
              </article>)}</div>
              <button className="planner-add-item" type="button" onClick={addFlight} disabled={Boolean(editingFlightId || editingLodgingId)}><Plus size={17} />新增機票</button>
            </section>

            <section className="planner-form-section"><div className="planner-section-title"><span>03</span><div><h2>住宿資訊</h2><p>每間住宿可以設定自己的入住與退房日期。</p></div></div>
              <div className="planner-repeat-list">{trip.lodging.map((lodging, index) => editingLodgingId === lodging.formId ? <article className="planner-repeat-card is-editing" key={lodging.formId}>
                <header className="planner-repeat-heading"><h3><BedDouble size={16} />住宿 {index + 1}</h3><div className="planner-item-controls"><button className="planner-confirm-item" type="button" aria-label="確認住宿" title="確認住宿" onClick={saveLodgingDraft}><Check size={17} /></button><button className="planner-cancel-item" type="button" aria-label="取消編輯" title="返回" onClick={cancelLodgingDraft}><ArrowLeft size={17} /></button></div></header>
                <div className="planner-fields-grid lodging-editor-grid">
                  <Field className="lodging-half-field" label="住宿名稱" value={lodgingDraft.name} onChange={(event) => updateLodgingDraft('name', event.target.value)} placeholder="飯店或住宿名稱" required />
                  <Field className="lodging-half-field" label="住宿金額（TWD）" type="number" min="1" step="1" value={lodgingDraft.price} onChange={(event) => updateLodgingDraft('price', event.target.value)} required />
                  <Field className="planner-field-wide" label="住宿地址" value={lodgingDraft.address} onChange={(event) => updateLodgingDraft('address', event.target.value)} placeholder="完整地址" />
                  <Field className="lodging-half-field" label="入住日期" type="date" value={lodgingDraft.checkIn} min={trip.startDate} max={lodgingDraft.checkOut || trip.endDate} onChange={(event) => updateLodgingDraft('checkIn', event.target.value)} required />
                  <Field className="lodging-half-field" label="退房日期" type="date" value={lodgingDraft.checkOut} min={lodgingDraft.checkIn || trip.startDate} max={trip.endDate} onChange={(event) => updateLodgingDraft('checkOut', event.target.value)} required />
                  <label className="planner-field planner-field-wide"><span>住宿備註</span><textarea value={lodgingDraft.note} onChange={(event) => updateLodgingDraft('note', event.target.value)} rows={2} placeholder="入住提醒、訂房資訊等" /></label>
                  <ImageUploadField label="住宿封面圖片" image={lodgingDraft.coverImage} error={lodgingImageError} onChange={(event) => { void loadSelectedImage(event, (coverImage) => updateLodgingDraft('coverImage', coverImage), setLodgingImageError); }} onRemove={() => { updateLodgingDraft('coverImage', ''); setLodgingImageError(''); }} />
                </div>
              </article> : <article className="planner-repeat-card planner-saved-card" key={lodging.formId}>
                <header className="planner-repeat-heading"><h3><BedDouble size={16} />住宿 {index + 1}</h3><div className="planner-item-controls"><button className="planner-edit-item" type="button" aria-label={`編輯住宿 ${index + 1}`} title="編輯住宿" onClick={() => startLodgingDraft(lodging)} disabled={Boolean(editingFlightId || editingLodgingId)}><Pencil size={16} /></button><button className="planner-remove-item" type="button" aria-label={`刪除住宿 ${index + 1}`} title="刪除住宿" onClick={() => removeLodging(lodging.formId)}><Trash2 size={15} /></button></div></header>
                <div className="planner-lodging-summary"><strong>{lodging.name}</strong><span>{lodging.address || '未填寫地址'}</span><div><span>入住　{lodging.checkIn}</span><span>退房　{lodging.checkOut}</span>{lodging.price && <b>NT$ {new Intl.NumberFormat('zh-TW').format(Number(lodging.price))}</b>}</div>{lodging.note && <p>{lodging.note}</p>}</div>
              </article>)}</div>
              <button className="planner-add-item" type="button" onClick={addLodging} disabled={Boolean(editingFlightId || editingLodgingId)}><Plus size={17} />新增住宿</button>
            </section>
            {formError && <p className="planner-error" role="alert">{formError}</p>}
            <div className="planner-form-actions"><button className="planner-primary" type="submit">下一步：安排日期 <ArrowRight size={16} /></button></div>
          </form>
        ) : (
          <div className="planner-schedule">
            <div className="planner-date-strip" aria-label="選擇行程日期">{days.map((day) => <button className={`planner-date-circle${selectedDay?.date === day.date ? ' active' : ''}`} type="button" key={day.date} onClick={() => { setSelectedDate(day.date); setEventOpen(false); }}><span>DAY {day.day}</span><strong>{day.date.slice(-2)}</strong><small>{day.weekday}</small></button>)}</div>
            {selectedDay && <section className="planner-day-editor"><header><div><p>{selectedDay.date} · {selectedDay.weekday}</p><h2>第 {selectedDay.day} 天</h2></div><MapPin size={19} /></header>
              <label className="planner-field planner-day-summary-field"><span>每日主要地點</span><select value={dailyLocations[selectedDay.date] || ''} onChange={(event) => setDailyLocations((current) => ({ ...current, [selectedDay.date]: event.target.value }))}><option value="">請選擇主要地點</option>{dailyLocationOptions.map((location) => <option key={location.key} value={location.key}>{location.displayName}</option>)}</select></label>
              <label className="planner-field planner-day-summary-field"><span>當日行程摘要</span><textarea rows={3} maxLength={500} value={dailySummaries[selectedDay.date] || ''} onChange={(event) => setDailySummaries((current) => ({ ...current, [selectedDay.date]: event.target.value }))} placeholder="單獨記下這一天的重點或安排。" /></label>
              {selectedEvents.length ? <ol className="planner-event-list">{selectedEvents.map((item) => <li key={item.id}><span>{[item.startTime, item.endTime].filter(Boolean).join('–') || '時間未定'}</span><div><strong>{item.title}</strong><p>{item.description || '沒有描述'}</p>{item.address && <small><MapPin size={12} />{item.address}</small>}</div></li>)}</ol> : <p className="planner-no-events">這天還沒有安排，新增第一個行程吧。</p>}
              {eventOpen ? <form className="planner-event-form" onSubmit={addEvent}><div className="planner-fields-grid"><Field label="行程標題" value={eventDraft.title} onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))} maxLength={100} placeholder="例如：參觀清水寺" required /><label className="planner-field"><span>行程類型</span><select value={eventDraft.type} onChange={(event) => setEventDraft((current) => ({ ...current, type: event.target.value }))}>{itineraryTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><Field label="地址" value={eventDraft.address} onChange={(event) => setEventDraft((current) => ({ ...current, address: event.target.value }))} placeholder="地點或地址" /><label className="planner-field planner-field-wide"><span>行程描述</span><textarea value={eventDraft.description} onChange={(event) => setEventDraft((current) => ({ ...current, description: event.target.value }))} rows={2} placeholder="備註或想做的事" /></label><Field label="開始時間" type="time" value={eventDraft.startTime} onChange={(event) => setEventDraft((current) => ({ ...current, startTime: event.target.value }))} /><Field label="結束時間" type="time" value={eventDraft.endTime} onChange={(event) => setEventDraft((current) => ({ ...current, endTime: event.target.value }))} /></div><div className="planner-inline-actions"><button className="planner-primary" type="submit"><Check size={15} />加入行程</button><button className="planner-secondary" type="button" onClick={() => setEventOpen(false)}>取消</button></div></form> : <button className="planner-add-event" type="button" onClick={() => setEventOpen(true)}><CirclePlus size={18} />加入行程</button>}
            </section>}
            {formError && <p className="planner-error" role="alert">{formError}</p>}
            <div className="planner-form-actions planner-schedule-actions"><button className="planner-secondary" type="button" onClick={() => setStep(1)}><ArrowLeft size={15} />返回旅程資訊</button><button className="planner-primary" type="button" onClick={submitTrip} disabled={working || !trip.title.trim() || !trip.country.trim()}>{working ? '建立中…' : '建立旅行'} <ArrowRight size={16} /></button></div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="detail-page planner-page">
      <header className="planner-list-heading"><div><p className="section-eyebrow">YOUR JOURNEYS</p><h1>我的旅行</h1></div><div className="planner-list-actions"><button className="planner-secondary" type="button" aria-haspopup="dialog" onClick={openJoinDialog}><Users size={16} />加入旅行</button><button className="planner-primary" type="button" onClick={startCreate}><Plus size={17} />新建旅行</button></div></header>
      {error && !joinOpen && <p className="planner-error" role="alert">{error}</p>}
      {loadState === 'loading' ? <div className="planner-empty-state">正在載入你的旅行…</div> : loadState === 'error' ? <div className="planner-empty-state planner-empty-error">{error || '無法載入旅行，請確認 Firebase Realtime Database 設定。'}</div> : trips.length ? <div className="travel-card-grid">{trips.map((item) => <TravelCard key={item.id} trip={item} canDelete={isTripOwner(item, uid)} onDelete={openDeleteDialog} onOpen={onOpenTrip} />)}</div> : <div className="planner-empty-state"><span><CalendarDays size={22} /></span><h2>還沒有旅行</h2><p>建立一趟新旅程，或輸入朋友分享的旅行 ID 加入共編。</p><div><button className="planner-primary" type="button" onClick={startCreate}><Plus size={16} />新建旅行</button></div></div>}
      {joinOpen && <div className="planner-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeJoinDialog(); }}>
        <section className="planner-join-dialog" role="dialog" aria-modal="true" aria-labelledby="join-trip-title">
          <header className="planner-dialog-heading"><div><p>JOIN A JOURNEY</p><h2 id="join-trip-title">加入旅行</h2></div><button className="planner-dialog-close" type="button" aria-label="關閉加入旅行視窗" onClick={closeJoinDialog}><X size={19} /></button></header>
          <form className="planner-join-query" onSubmit={previewJoin}>
            <label className="planner-field"><span>旅行 ID</span><input autoFocus value={joinId} onChange={(event) => { setJoinId(event.target.value); setJoinPreview(null); setFormError(''); }} placeholder="輸入朋友分享的旅行 ID" required /></label>
            <button className="planner-primary planner-lookup-button" type="submit" aria-label="查詢旅行" title="查詢旅行" disabled={previewWorking || !joinId.trim()}>{previewWorking ? <span className="planner-lookup-spinner" /> : <ArrowRight size={19} />}</button>
          </form>
          {formError && <p className="planner-error" role="alert">{formError}</p>}
          {joinPreview && <div className={`planner-trip-preview${joinPreview.coverImage ? ' has-cover' : ''}`}>
            {joinPreview.coverImage && <img className="planner-trip-preview-cover" src={joinPreview.coverImage} alt="" />}
            <p className="planner-trip-preview-country">{joinPreview.country || '未設定國家'}</p>
            <h3>{joinPreview.title}</h3>
            <dl><div><dt>建立者</dt><dd>{joinPreview.participants?.[joinPreview.ownerId]?.name || '旅程建立者'}</dd></div><div><dt>旅行日期</dt><dd>{formatTripDateRange(joinPreview.startDate, joinPreview.endDate) || '尚未設定'}</dd></div><div><dt>參與人數</dt><dd>{Object.keys(joinPreview.participants || {}).length} 人</dd></div></dl>
            {joinPreview.description && <p className="planner-trip-preview-description">{joinPreview.description}</p>}
            <footer><button className="planner-primary" type="button" onClick={submitJoin} disabled={working}>{working ? '加入中…' : <>確認加入 <ArrowRight size={15} /></>}</button></footer>
          </div>}
        </section>
      </div>}
      {deleteTarget && <div className="planner-modal-backdrop planner-delete-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDeleteDialog(); }}>
        <section className="planner-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-trip-title">
          <header className="planner-dialog-heading"><div><p>DELETE JOURNEY</p><h2 id="delete-trip-title">刪除整趟旅行</h2></div><button className="planner-dialog-close" type="button" aria-label="關閉刪除視窗" onClick={closeDeleteDialog} disabled={deleteWorking}><X size={19} /></button></header>
          <p className="planner-delete-warning">這會永久刪除「{deleteTarget.title}」及所有參與者的旅程清單紀錄，無法復原。</p>
          <label className="planner-field planner-delete-field"><span>請輸入旅程標題以確認</span><input autoFocus value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder={deleteTarget.title} autoComplete="off" /></label>
          {deleteError && <p className="planner-error" role="alert">{deleteError}</p>}
          <footer className="planner-delete-actions"><button className="planner-secondary" type="button" onClick={closeDeleteDialog} disabled={deleteWorking}>取消</button><button className="planner-danger" type="button" onClick={confirmDeleteTrip} disabled={deleteWorking || deleteText !== deleteTarget.title}>{deleteWorking ? '刪除中…' : <><Trash2 size={15} />確認刪除</>}</button></footer>
        </section>
      </div>}
    </section>
  );
}