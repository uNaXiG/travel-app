export const tripInfo = {
  title: '名古屋 5 天 4 夜',
  destination: '日本・愛知縣',
  dateRange: '2026.10.22 — 10.26',
  summary: '秋日美食、購物、吉卜力、海洋與上高地，把城市和山林一次收進旅程。',
};

export function getInitialOpenDay(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(2026, 9, 22);
  const end = new Date(2026, 9, 26);

  if (today < start) return 1;
  if (today > end) return null;
  return Math.floor((today - start) / 86400000) + 1;
}

export const flightInfo = [
  { direction: '去程', airline: '中華航空', route: '台灣 → 名古屋', departure: '07:30', arrival: '11:30', departureTimezone: '台灣時間', arrivalTimezone: '日本時間', date: '10 月 22 日', fare: '9,809' },
  { direction: '回程', airline: '樂桃航空', route: '名古屋 → 台灣', departure: '22:55', arrival: '01:30', departureTimezone: '日本時間', arrivalTimezone: '台灣時間・隔日', date: '10 月 26 日', fare: '8,665' },
];

export const muSkySchedule = [
  { departure: '12:07', arrival: '12:31', duration: '24 分鐘', train: 'μ-SKY' },
  { departure: '12:37', arrival: '13:01', duration: '24 分鐘', train: 'μ-SKY' },
  { departure: '13:07', arrival: '13:31', duration: '24 分鐘', train: 'μ-SKY' },
  { departure: '13:37', arrival: '14:01', duration: '24 分鐘', train: 'μ-SKY' },
];

export const lodgingInfo = {
  name: 'Sanco Inn Grande Nagoya',
  address: '愛知縣名古屋市 Nakamura-ku Meieki 3-21-7, Japan',
  nights: '4 晚',
  price: 'NT$17,044',
  note: '名古屋站附近的旅程基地，可先向住宿確認行李寄放服務與時間。',
};

export const itineraryDays = [
  {
    id: 1, date: '10/22', weekday: '週四', area: '中部機場・名古屋・榮', weatherKey: 'nagoya',
    title: '繁華榮町、飛驒牛與浪漫夜色',
    summary: '抵達名古屋後先放下行李，從拉麵、榮商圈一路走到電視塔夜景。',
    guide: '名古屋第一天建議把轉乘和寄放行李留出緩衝。榮商圈步行可串起購物、晚餐與夜景；遇到下雨時可先延長百貨行程。',
    events: [
      { time: '12:20', type: 'transport', category: '交通', title: '抵達中部國際機場', description: '完成入境、領取行李後前往名鐵車站。以 Suica 進站，另購 μ-SKY 特別車券（μ-Ticket），座位票約 450 円。', location: '中部國際機場', tip: '以實際完成入境和領取行李時間為準，預留轉乘緩衝並選擇合適班次。' },
      { time: '13:30–14:30', type: 'food', category: '餐廳', title: '榮商圈午餐・名古屋拉麵', description: '抵達後用一碗熱騰騰的拉麵補充體力，店家由當天狀況彈性選擇。', location: '榮商圈，名古屋市中區', tip: '午餐店名尚未指定；出發前可搜尋榮站附近營業中的拉麵店，避開午休時段。' },
      { time: '14:30–18:30', type: 'shopping', category: '購物', title: 'HAERA 百貨 × 榮商圈', description: '安排約四小時自由購物，服飾、鞋款、美妝與雜貨都可慢慢逛。', location: 'HAERA 百貨，名古屋榮', tip: '百貨營業時間與退稅櫃檯時間可能不同，購物前先確認官方營業資訊。' },
      { time: '19:00–20:30', type: 'food', category: '餐廳', title: '飛騨牛一頭家 馬喰一代 名古屋 栄', description: '在 BINO 栄 5F 享用飛驒牛晚餐，地址：Nishiki 3-24-17, Naka Ward。', location: '飛騨牛一頭家 馬喰一代 名古屋 栄', tip: '這是行程中已指定的晚餐店。建議確認訂位時間、同行人數和套餐內容。' },
      { time: '21:00–22:00', type: 'sight', category: '景點', title: '中部電力 MIRAI TOWER × Oasis 21', description: '晚餐後沿榮商圈散步，看城市夜色；可依天氣和體力彈性調整。', location: '中部電力 MIRAI TOWER, Nagoya', tip: 'Oasis 21 的水之宇宙船是夜間散步的好停留點；若想登塔，先確認當日營業與最後入場時間。' },
    ],
  },
  {
    id: 2, date: '10/23', weekday: '週五', area: '長久手・吉卜力公園', weatherKey: 'nagoya',
    title: '走進吉卜力的奇幻世界',
    summary: '從名古屋站搭東山線到藤之丘，再轉 Linimo 前往愛・地球博記念公園。',
    guide: '吉卜力公園範圍大，建議先確認門票區域和入場時段，依預約順序安排動線。熱門展館通常需要預留排隊時間；園區內請留意攝影規範。',
    events: [
      { time: '06:00', type: 'stay', category: '出發準備', title: '起床、早餐與行李確認', description: '早起梳洗，確認門票、交通卡、行動電源與相機。', location: 'Sanco Inn Grande Nagoya', tip: '前一晚先把門票和交通路線截圖保存，清晨出發時較安心。' },
      { time: '08:00', type: 'transport', category: '交通', title: '東山線前往藤之丘', description: '從名古屋站搭地下鐵東山線，往栄、東山公園、藤が丘方向。', location: '名古屋站至藤が丘站', tip: '尖峰時段車廂較忙，預留轉乘時間；搭乘方向請以車站當日標示為準。' },
      { time: '09:45–10:30', type: 'transport', category: '交通', title: '轉乘 Linimo 磁浮列車', description: '由藤が丘站轉乘 Linimo，約 20 分鐘抵達愛・地球博記念公園站。', location: '藤が丘站・愛・地球博記念公園站', tip: 'Linimo 車站和公園入口之間仍需步行，將交通卡與入園 QR code 放在方便取用的位置。' },
      { time: '10:30–17:00', type: 'sight', category: '景點', title: '吉卜力公園', description: '把一整天留給森林、建築、經典場景和園區散步，依門票區域慢慢探索。', location: '吉卜力公園, Aichi', tip: '園區不等於單一室內展館；先看官方地圖和入場時段，安排區域間移動與休息。' },
      { time: '18:00–20:30', type: 'food', category: '餐廳', title: '晚餐・名古屋在地料理', description: '壽喜燒、鰻魚飯、手羽先或日式料理，依當天體力和胃口選擇。', location: '名古屋市區', tip: '名古屋代表性菜色可從鰻魚飯三吃、手羽先或味噌系料理挑選；熱門店建議先查候位。' },
    ],
  },
  {
    id: 3, date: '10/24', weekday: '週六', area: '名古屋港', weatherKey: 'nagoya',
    title: '與海洋巨星相遇',
    summary: '上午悠閒吃早午餐，午後走進名古屋港水族館，晚上回市區休息。',
    guide: '週末的水族館和表演可能較熱門，入場前先查看官方演出時間表。港區戶外步道受天氣影響較大，可準備薄外套和備用室內行程。',
    events: [
      { time: '07:30–08:00', type: 'stay', category: '出發準備', title: '慢慢醒來的早晨', description: '起床梳洗，不必趕早班車，保留悠閒節奏。', location: 'Sanco Inn Grande Nagoya', tip: '先確認飯店早餐供應時間；若外出用餐，可挑名古屋站附近店家。' },
      { time: '10:00–11:30', type: 'food', category: '餐廳', title: '名古屋早午餐', description: '咖啡、麵包、早餐料理和甜點，店家依當天喜好選擇。', location: '名古屋市區早午餐', tip: '名古屋咖啡店常見飲品搭配早餐的 Morning Set；週末建議先查候位與供餐時段。' },
      { time: '12:00–17:00', type: 'sight', category: '景點', title: '名古屋港水族館', description: '探索海豚、大型海洋生物和巨型水族展示；門票資訊原行程標註 Klook。', location: '名古屋港水族館', tip: '先確認海豚表演和餵食活動時間，入場後再按場次反推參觀順序，避免錯過想看的節目。' },
      { time: '17:00–20:00', type: 'transport', category: '交通・晚餐', title: '離開港區，回市區用餐', description: '搭地鐵返回市區，晚餐可選壽喜燒、鰻魚飯或手羽先。', location: '名古屋港站至名古屋市區', tip: '隔天需要清晨出發，晚餐後建議直接回飯店整理上高地用品。' },
      { time: '20:00', type: 'stay', category: '住宿', title: '整理上高地裝備，提早休息', description: '準備隔天早餐、外套、飲水和步行用品，預計 05:30 起床。', location: 'Sanco Inn Grande Nagoya', tip: '山區氣溫與市區差異大，確認天氣後分層穿著，並準備雨具。' },
    ],
  },
  {
    id: 4, date: '10/25', weekday: '週日', area: '上高地・北阿爾卑斯', weatherKey: 'kamikochi',
    title: '走進北阿爾卑斯山岳秘境',
    summary: '清晨集合搭巴士，沿河谷步行約 6 公里，傍晚返回名古屋。',
    guide: '上高地屬山區行程，路面、氣溫和巴士狀況都可能變化。以旅行團通知為準，穿好走的鞋並帶保暖層；自然保護區內請遵守步道與垃圾規範。',
    events: [
      { time: '05:30', type: 'stay', category: '出發準備', title: '起床並前往集合地點', description: '從飯店出發前往名古屋車站集合；集合位置需事先與業者確認。', location: 'Sanco Inn Grande Nagoya 至名古屋站', tip: '前一晚向一日遊業者確認集合出口、導遊辨識方式和遲到聯絡電話。' },
      { time: '08:00–11:30', type: 'transport', category: '交通', title: '巴士前往上高地', description: '名古屋車站集合，搭乘巴士北上，車程約 3.5 小時。', location: '名古屋站至上高地巴士集合點', tip: '自備早餐、飲水和暈車用品；長途車上先補眠，抵達後把握健行時間。' },
      { time: '11:30–15:00', type: 'sight', category: '景點・健行', title: '河童橋、穗高神社奧宮、明神橋與明神池', description: '依一日遊路線欣賞群山、森林與溪流，預計步行約 6 公里。', location: 'Kamikochi, Matsumoto, Nagano', tip: '步道時間依團體集合和當天路況調整；先確認回程集合時間，不要為拍照錯過巴士。' },
      { time: '15:00–18:00', type: 'transport', category: '交通', title: '巴士返回名古屋', description: '結束健行後搭車回程，車上可休息補眠。', location: '上高地巴士站至名古屋站', tip: '山區巴士可能受路況影響，晚餐訂位避免排太緊。' },
      { time: '19:00–20:00', type: 'food', category: '餐廳', title: '名古屋站周邊晚餐', description: '以壽喜燒、鰻魚飯或手羽先犒賞健行後的自己。', location: '名古屋站周邊', tip: '長途健行後優先選離車站近、候位較短的店，吃完直接回飯店休息。' },
    ],
  },
  {
    id: 5, date: '10/26', weekday: '週一', area: '名古屋站・中部機場', weatherKey: 'nagoya',
    title: '最後巡禮，帶著戰利品回家',
    summary: '退房寄放行李，享用最後一餐並採買伴手禮，晚間前往機場。',
    guide: '回程航班時間為 22:55，行程安排先到機場再用餐購物較穩妥。退稅商品、托運行李和報到截止時間請依航空公司規定確認。',
    events: [
      { time: '11:00', type: 'stay', category: '住宿', title: '退房並寄放行李', description: '整理行李並向住宿確認寄放服務，輕裝開始最後一天。', location: 'Sanco Inn Grande Nagoya', tip: '先確認行李寄放截止時間，並把護照、登機資料和貴重物品隨身帶好。' },
      { time: '12:00–13:30', type: 'food', category: '餐廳', title: '最後一頓名古屋美食', description: '拉麵、日式料理、飛驒牛、鰻魚飯或手羽先，挑一樣最想再吃的。', location: '名古屋市區', tip: '鰻魚飯三吃、味噌豬排、手羽先都是可搜尋的名古屋代表性料理。' },
      { time: '13:30–17:30', type: 'shopping', category: '購物・伴手禮', title: '榮商圈與名古屋站最後採買', description: '藥妝、名古屋零食、雜貨和紀念品；整理購物清單避免遺漏。', location: '名古屋榮商圈・名古屋站', tip: '可優先找蝦餅、外郎等名古屋伴手禮；易碎品與液體商品先確認托運規定。' },
      { time: '18:00–19:00', type: 'transport', category: '交通', title: '前往中部國際機場', description: '從名古屋站搭車前往中部國際機場，預留報到與安檢時間。', location: '名古屋站至中部國際機場', tip: '先確認列車班次、行李件數和航空公司報到櫃檯位置。' },
      { time: '19:00–22:55', type: 'transport', category: '機場・返程', title: '機場用餐、免稅店與登機', description: '樂桃航空預計 22:55 起飛；班機號碼和報到資訊請以機票為準。', location: '中部國際機場 Centrair', tip: '確認免稅品領取方式及登機門步行時間，勿將登機時間和起飛時間混淆。' },
    ],
  },
];
