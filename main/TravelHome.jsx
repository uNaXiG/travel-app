import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
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
  ShoppingBag,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Train,
  Trash2,
  Utensils,
  Wind,
  X,
} from 'lucide-react';
import { flightInfo, getInitialOpenDay, itineraryDays, lodgingInfo, muSkySchedule, tripInfo } from './itinerary.js';
import './travel.css';

const weatherLocations = {
  nagoya: { name: '名古屋', latitude: 35.1815, longitude: 136.9066 },
  kamikochi: { name: '上高地', latitude: 36.2484, longitude: 137.6373 },
};

const weatherConditions = {
  0: ['晴朗', Sun],
  1: ['大致晴朗', CloudSun],
  2: ['局部多雲', CloudSun],
  3: ['陰天', Cloud],
  45: ['有霧', CloudFog],
  48: ['霧凇', CloudFog],
  51: ['毛毛雨', CloudDrizzle],
  53: ['毛毛雨', CloudDrizzle],
  55: ['較強毛毛雨', CloudDrizzle],
  61: ['小雨', CloudRain],
  63: ['中雨', CloudRain],
  65: ['大雨', CloudRain],
  71: ['小雪', CloudSnow],
  73: ['中雪', CloudSnow],
  75: ['大雪', CloudSnow],
  80: ['短暫陣雨', CloudRain],
  81: ['陣雨', CloudRain],
  82: ['強陣雨', CloudRain],
  95: ['雷雨', CloudLightning],
  96: ['雷雨伴冰雹', CloudLightning],
  99: ['強雷雨伴冰雹', CloudLightning],
};

const highlightRules = [
  { label: '必吃美食', tone: 'eat', keywords: ['飛驒牛', '名古屋拉麵', '拉麵', '鰻魚飯', '手羽先', '壽喜燒', '早午餐'] },
  { label: '必點菜單', tone: 'menu', keywords: ['飛驒牛', '鰻魚飯', '手羽先', '拉麵'] },
  { label: '必買伴手禮', tone: 'souvenir', keywords: ['蝦餅', '外郎', '名古屋零食', '伴手禮'] },
];

const eventTypes = {
  transport: { icon: Train, color: 'transport' },
  food: { icon: Utensils, color: 'food' },
  sight: { icon: Compass, color: 'sight' },
  shopping: { icon: ShoppingBag, color: 'shopping' },
  stay: { icon: BedDouble, color: 'stay' },
};

function getWeatherDetails(code) {
  return weatherConditions[code] || ['多雲', CloudSun];
}

function analyzeHighlights(day) {
  const itineraryText = [day.summary, day.guide, ...day.events.map((event) => `${event.title} ${event.description} ${event.tip || ''}`)].join(' ');
  return highlightRules.flatMap((rule) => {
    const matches = rule.keywords.filter((keyword) => itineraryText.includes(keyword));
    if (!matches.length) return [];
    const suggestions = matches.map((keyword) => {
      if (rule.tone === 'menu') {
        return keyword === '飛驒牛' ? '飛驒牛推薦部位' : keyword === '鰻魚飯' ? '鰻魚飯三吃' : keyword === '手羽先' ? '名古屋手羽先' : '店家招牌拉麵';
      }
      if (rule.tone === 'souvenir') {
        return keyword === '伴手禮' || keyword === '名古屋零食' ? null : keyword;
      }
      return keyword;
    }).filter(Boolean);
    return [{ ...rule, values: [...new Set(suggestions)].slice(0, 3) }];
  });
}

function mapsUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function searchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function isRealtimeDatabasePermissionError(error) {
  return error.code === 'PERMISSION_DENIED'
    || error.code === 'permission-denied'
    || /PERMISSION_DENIED/i.test(error.message || '');
}

function WeatherPanel({ weatherKey, weather }) {
  const location = weatherLocations[weatherKey];
  const report = weather[weatherKey];
  const [condition, WeatherIcon] = report?.current
    ? getWeatherDetails(report.current.weather_code)
    : ['讀取即時天氣', Cloud];

  return (
    <div className="day-weather" aria-label={`${location.name}目前天氣`}>
      <span className="weather-place">{location.name}<span>即時觀測</span></span>
      {report?.current ? (
        <>
          <WeatherIcon className="weather-icon" size={22} strokeWidth={1.7} />
          <span className="weather-temp">{Math.round(report.current.temperature_2m)}°</span>
          <span className="weather-condition">{condition}</span>
        </>
      ) : (
        <span className={`weather-condition${report?.error ? ' weather-error' : ''}`}>
          {report?.error ? '暫時無法取得' : <><span className="weather-dot" />查詢中</>}
        </span>
      )}
    </div>
  );
}

function HighlightTags({ day }) {
  const highlights = useMemo(() => analyzeHighlights(day), [day]);
  return (
    <div className="highlight-list" aria-label="行程重點分析">
      {highlights.map((highlight) => (
        <div className={`highlight-tag tag-${highlight.tone}`} key={highlight.tone}>
          <span className="highlight-label">{highlight.label}</span>
          <span>{highlight.values.join('・')}</span>
        </div>
      ))}
    </div>
  );
}

function EventCard({ event }) {
  const typeInfo = eventTypes[event.type] || eventTypes.sight;
  const EventIcon = typeInfo.icon;
  return (
    <article className={`schedule-event event-${typeInfo.color}`}>
      <div className="event-time">{event.time}</div>
      <div className="event-marker"><span /></div>
      <div className="event-card-content">
        <div className="event-card-heading">
          <h3>{event.title}</h3>
          <div className="event-type"><EventIcon size={15} />{event.category}</div>
        </div>
        <p>{event.description}</p>
        {event.tip && (
          <div className="guide-tip"><Sparkles size={14} /><span>{event.tip}</span></div>
        )}
        <a className="map-link" href={mapsUrl(event.location)} target="_blank" rel="noreferrer">
          <MapPin size={14} /> 地點預覽 <ArrowRight size={14} />
        </a>
      </div>
    </article>
  );
}

function DayCard({ day, weather, isOpen, onToggle }) {
  const guideSearch = searchUrl(`${day.area} 景點故事 旅遊攻略 交通 建議`);
  return (
    <article className={`day-card${isOpen ? ' day-open' : ''}`}>
      <button className="day-card-heading" type="button" onClick={onToggle} aria-expanded={isOpen}>
        <span className="day-index">{String(day.id).padStart(2, '0')}</span>
        <span className="day-title-group">
          <span className="day-date">{day.weekday}　·　{day.date}</span>
          <span className="day-title">{day.title}</span>
          <span className="day-area"><MapPin size={12} />{day.area}</span>
        </span>
        <WeatherPanel weatherKey={day.weatherKey} weather={weather} />
        <ChevronDown className="day-chevron" size={18} />
      </button>
      {isOpen && (
        <div className="day-card-body">
          <p className="day-summary">{day.summary}</p>
          <HighlightTags day={day} />
          <div className="schedule-list">
            {day.events.map((event, index) => <EventCard event={event} key={`${day.id}-${index}`} />)}
          </div>
          <aside className="guide-panel">
            <div className="guide-heading"><Sparkles size={16} /><strong>小導遊筆記</strong><span>依行程整理</span></div>
            <p>{day.guide}</p>
            <a href={guideSearch} target="_blank" rel="noreferrer">
              搜尋景點故事與攻略 <ExternalLink size={14} />
            </a>
          </aside>
        </div>
      )}
    </article>
  );
}

function TripOverview({ weather }) {
  const [openDay, setOpenDay] = useState(getInitialOpenDay);
  return (
    <>
      <section className="trip-hero">
        <div className="trip-hero-image" />
        <div className="trip-hero-copy">
          <span className="trip-eyebrow"><span /> AUTUMN JOURNAL · 2026</span>
          <h1>{tripInfo.title}</h1>
          <p>{tripInfo.summary}</p>
          <div className="trip-meta"><span><CalendarDays size={15} />{tripInfo.dateRange}</span><span><MapPin size={15} />{tripInfo.destination}</span></div>
        </div>
        <div className="trip-hero-stamp"><span>JAPAN</span><strong>愛知</strong><small>秋旅 2026</small></div>
      </section>

      <section className="itinerary-section">
        <div className="section-heading">
          <div><p className="section-eyebrow">YOUR DAILY ROUTE</p><h2>每日行程</h2></div>
          <span className="section-count">5 DAYS <i /> 4 NIGHTS</span>
        </div>
        <div className="weather-disclaimer"><Info size={14} />顯示各地目前觀測天氣，每 30 分鐘更新；不是 10 月行程日預報。</div>
        <div className="day-list">
          {itineraryDays.map((day) => (
            <DayCard key={day.id} day={day} weather={weather} isOpen={openDay === day.id} onToggle={() => setOpenDay(openDay === day.id ? null : day.id)} />
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

function TransportationPage() {
  return (
    <section className="detail-page">
      <div className="page-heading"><p className="section-eyebrow">GETTING AROUND</p><h1>交通資訊</h1></div>
      <section className="transport-group">
        <header className="transport-section-heading">
          <span className="transport-section-icon"><Plane size={18} /></span>
          <div><p>FLIGHT DETAILS</p><h2>航班資訊</h2></div>
          <span className="transport-section-line" />
        </header>
        <div className="flight-list">
          {flightInfo.map((flight, index) => (
            <article className="flight-card" key={flight.direction}>
              <div className="flight-card-top"><span className="flight-direction">{flight.direction}</span><span>{flight.date}</span></div>
              <div className="flight-airline"><span className="flight-icon"><Plane size={18} /></span><strong>{flight.airline}</strong></div>
              <div className="flight-route"><div><span>{flight.departureTimezone}</span><strong>{flight.departure}</strong><small>{index === 0 ? '台灣' : '名古屋'}</small></div><div className="flight-route-line"><span>{flight.route}</span><i><Plane size={15} /></i></div><div><span>{flight.arrivalTimezone}</span><strong>{flight.arrival}</strong><small>{index === 0 ? '名古屋' : '台灣'}</small></div></div>
              <div className="flight-fare"><span>每人票價</span><strong>{flight.fare}<small> / 人</small></strong></div>
            </article>
          ))}
        </div>
      </section>
      <section className="transport-timetable">
        <header className="transport-section-heading">
          <span className="transport-section-icon"><Train size={18} /></span>
          <div><p>RAIL TIMETABLE</p><h2>μ-SKY 資訊</h2></div>
          <span className="transport-section-side">中部國際機場 → 名古屋</span>
        </header>
        <p className="timetable-intro">μ-SKY 列車時刻表</p>
        <div className="timetable-scroll">
          <table className="timetable-table">
            <thead><tr><th>出發時間</th><th>到達時間</th><th>行車時間</th><th>車種</th></tr></thead>
            <tbody>{muSkySchedule.map((train) => <tr key={train.departure}><td>{train.departure}</td><td>{train.arrival}</td><td>{train.duration}</td><td>{train.train}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="timetable-note">搭乘 μ-SKY 需另外購買 μ-Ticket 指定席特別車券，約 450 円；班次可能調整，出發前請確認最新時刻。</p>
      </section>
    </section>
  );
}

function LodgingPage() {
  return (
    <section className="detail-page">
      <div className="page-heading"><p className="section-eyebrow">YOUR HOME IN NAGOYA</p><h1>住宿資訊</h1><p>四個晚上的名古屋旅行基地。</p></div>
      <article className="lodging-card">
        <div className="lodging-visual" aria-hidden="true" />
        <div className="lodging-body">
          <div className="lodging-kicker"><BedDouble size={15} /> ACCOMMODATION</div>
          <h2>{lodgingInfo.name}</h2>
          <a className="lodging-address" href={mapsUrl(lodgingInfo.address)} target="_blank" rel="noreferrer"><MapPin size={16} /><span>{lodgingInfo.address}</span><ExternalLink size={14} /></a>
          <p className="lodging-note">{lodgingInfo.note}</p>
          <div className="lodging-facts"><div><span>住宿晚數</span><strong>{lodgingInfo.nights}</strong></div><div><span>住宿金額</span><strong>{lodgingInfo.price}</strong></div></div>
        </div>
      </article>
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

export default function TravelHome({ user, onSignOut, packingStore }) {
  const [section, setSection] = useState('itinerary');
  const [weather, setWeather] = useState({});
  const [weatherUpdated, setWeatherUpdated] = useState(null);
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
    let active = true;
    const controller = new AbortController();
    const loadWeather = async () => {
      const entries = await Promise.all(Object.entries(weatherLocations).map(async ([key, place]) => {
        const query = new URLSearchParams({
          latitude: place.latitude,
          longitude: place.longitude,
          current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
          timezone: 'Asia/Tokyo',
        });
        try {
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: controller.signal });
          if (!response.ok) throw new Error('Weather request failed');
          const result = await response.json();
          return [key, result];
        } catch {
          return [key, { error: true }];
        }
      }));
      if (!active) return;
      setWeather(Object.fromEntries(entries));
      setWeatherUpdated(new Date());
    };
    loadWeather();
    const interval = window.setInterval(loadWeather, 30 * 60 * 1000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

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
          ? 'Realtime Database 規則尚未允許此帳號讀取清單，請發布 auth/database.rules.json。'
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
        ? 'Realtime Database 規則尚未允許此帳號修改清單，請發布 auth/database.rules.json。'
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
    { id: 'packing', label: '攜帶清單', icon: ClipboardList },
  ];

  return (
    <div className="trip-app">
      <aside className="trip-sidebar">
        <a className="trip-brand" href="#trip" onClick={(event) => { event.preventDefault(); setSection('itinerary'); }}>
          <span className="trip-brand-mark" aria-hidden="true"><Compass size={17} strokeWidth={1.7} /></span><span className="trip-brand-name">NAGOYA<small>TRAVEL NOTES</small></span>
        </a>
        <div className="sidebar-trip-label"><span>YOUR TRIP</span><strong>NAGOYA · AUTUMN</strong></div>
        <nav className="trip-nav" aria-label="行程導覽">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button className={`trip-nav-item${section === id ? ' active' : ''}`} key={id} type="button" onClick={() => setSection(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{section === id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-date"><CalendarDays size={15} /><span>2026.10.22 — 10.26</span></div>
        </div>
      </aside>

      <div className="trip-workspace">
        <header className="trip-topbar">
          <div className="mobile-brand"><span className="trip-brand-mark" aria-hidden="true"><Compass size={16} strokeWidth={1.7} /></span><strong>NAGOYA<small>TRAVEL NOTES</small></strong></div>
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
          {section === 'itinerary' && <TripOverview weather={weather} />}
          {section === 'transport' && <TransportationPage />}
          {section === 'lodging' && <LodgingPage />}
          {section === 'packing' && <PackingListPage items={packingItems} loadState={packingLoadState} error={packingError} actionError={packingActionError} working={packingWorking} onAdd={addPackingItem} onToggle={togglePackingItem} onUpdate={updatePackingItem} onRemove={removePackingItem} onReorder={reorderPackingItems} clearActionError={() => setPackingActionError('')} />}
          {section === 'itinerary' && weatherUpdated && <p className="weather-updated"><Wind size={13} />天氣資料更新於 {weatherUpdated.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}（日本時間）</p>}
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
