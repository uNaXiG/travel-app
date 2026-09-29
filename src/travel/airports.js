// OurAirports snapshot: active IATA airports in Japan and the selected Taiwan airports.
const airportRows = `
JP|AGJ|Aguni Airport|Aguni
JP|AXT|Akita Airport|Akita
JP|AXJ|Amakusa Airport|Amakusa
JP|ASJ|Amami Airport|Amami
JP|AOJ|Aomori Airport|Aomori
JP|AKJ|Asahikawa Airport|Higashikagura
JP|NGO|Chubu Centrair International Airport|Tokoname
JP|FUJ|Fukue Airport|Goto
JP|FKJ|Fukui Airport|Fukui
JP|FUK|Fukuoka Airport|Fukuoka
JP|FKS|Fukushima Airport|Sukagawa
JP|QGU|Gifu Airport|Gifu
JP|HAC|Hachijojima Airport|Hachijojima
JP|HKD|Hakodate Airport|Hakodate
JP|HTR|Hateruma Airport|Taketomi
JP|HIJ|Hiroshima Airport|Hiroshima
JP|IBR|Ibaraki Airport|Omitama
JP|IEJ|Iejima Airport|Ie
JP|IKI|Iki Airport|Iki
JP|IWO|Ioto (Iwo Jima) Airbase|Ogasawara
JP|IWK|Iwakuni Kintaikyo Airport|Iwakuni
JP|IWJ|Iwami Airport|Masuda
JP|HNA|Iwate Hanamaki Airport|Hanamaki
JP|IZO|Izumo Enmusubi Airport|Izumo
JP|NJA|JMSDF Atsugi Air Base / Naval Air Facility Atsugi|Ayase / Yamato
JP|HHE|JMSDF Hachinohe Air Base / Hachinohe Airport|Hachinohe
JP|MUS|JMSDF Minami Torishima Air Base|Ogasawara
JP|OMJ|JMSDF Omura Air Base|Nagasaki
JP|DNA|Kadena Air Base|Okinawa
JP|KOJ|Kagoshima Airport|Kagoshima
JP|KIX|Kansai International Airport|Osaka
JP|KJP|Kerama Airport|Zamami
JP|KKX|Kikai Airport|Kikai
JP|KTD|Kitadaito Airport|Kitadaitōjima
JP|KKJ|Kitakyushu Airport|Kitakyushu
JP|UKB|Kobe Airport|Kobe
JP|KCZ|Kochi Ryoma Airport|Nankoku
JP|KMQ|Komatsu Airport / JASDF Komatsu Air Base|Kanazawa
JP|TJH|Konotori Tajima Airport|Toyooka
JP|KMJ|Kumamoto Airport|Kumamoto
JP|UEO|Kumejima Airport|Kumejima
JP|KUH|Kushiro Airport|Kushiro
JP|HSG|Kyushu Saga International Airport|Saga
JP|MYJ|Matsuyama Airport|Matsuyama
JP|MMB|Memanbetsu Airport|Ōzora
JP|MMD|Minamidaito Airport|Minamidaito
JP|MSJ|Misawa Airport / Misawa Air Base|Misawa
JP|MYE|Miyakejima Airport|Miyakejima
JP|MMY|Miyako Airport|Miyakojima
JP|KMI|Miyazaki Airport|Miyazaki
JP|MBE|Monbetsu Airport|Monbetsu
JP|FSZ|Mount Fuji Shizuoka Airport|Makinohara / Shimada
JP|NGS|Nagasaki Airport|Nagasaki
JP|NKM|Nagoya Airport / JASDF Komaki Air Base|Nagoya
JP|OKA|Naha International Airport|Naha
JP|SHB|Nakashibetsu Airport|Nakashibetsu
JP|SHM|Nanki Shirahama Airport|Shirahama
JP|NRT|Narita International Airport|Narita
JP|CTS|New Chitose Airport|Sapporo
JP|ISG|New Ishigaki Airport|Ishigaki
JP|TNE|New Tanegashima Airport|Tanegashima
JP|KIJ|Niigata Airport|Niigata
JP|NTQ|Noto Satoyama Airport|Wajima
JP|ONJ|Odate Noshiro Airport|Kitaakita
JP|OIT|Oita Airport|Oita
JP|OKJ|Okayama Momotaro Airport|Okayama
JP|OKI|Oki Global Geopark Airport|Okinoshima
JP|OKE|Okinoerabu Airport|Wadomari
JP|OIR|Okushiri Airport|Okushiri Island
JP|ITM|Osaka Itami International Airport|Osaka
JP|OIM|Oshima Airport|Izu Oshima
JP|RBJ|Rebun Airport|Rebun
JP|RIS|Rishiri Airport|Rishiri
JP|SDS|Sado Airport|Sado
JP|OKD|Sapporo Okadama Airport|Sapporo
JP|SDJ|Sendai Airport|Natori
JP|SHI|Shimojishima Airport|Miyakojima
JP|MMJ|Shinshu-Matsumoto Airport|Matsumoto
JP|SYO|Shonai Airport|Shonai
JP|TAK|Takamatsu Airport|Takamatsu
JP|TRA|Tarama Airport|Tarama
JP|OBO|Tokachi-Obihiro Airport|Obihiro
JP|TKN|Tokunoshima Airport|Amagi
JP|TKS|Tokushima Awaodori Airport / JMSDF Tokushima Air Base|Tokushima
JP|HND|Tokyo Haneda International Airport|Tokyo
JP|TTJ|Tottori Sand Dunes Conan Airport|Tottori
JP|TOY|Toyama Kitokito Airport|Toyama
JP|TSJ|Tsushima Airport|Tsushima
JP|WKJ|Wakkanai Airport|Wakkanai
JP|KUM|Yakushima Airport|Yakushima
JP|GAJ|Yamagata Airport|Higashine
JP|UBJ|Yamaguchi Ube Airport|Ube
JP|OKO|Yokota Air Base|Fussa
JP|YGJ|Yonago Kitaro Airport / JASDF Miho Air Base|Yonago
JP|OGN|Yonaguni Airport|Yonaguni
JP|RNJ|Yoron Airport|Yoron
TW|TPE|Taiwan Taoyuan International Airport|Taoyuan
TW|TSA|Taipei Songshan International Airport|Taipei (Songshan)
`.trim();

const japanAirportNames = {
  AGJ: '粟國機場', AXT: '秋田機場', AXJ: '天草機場', ASJ: '奄美機場', AOJ: '青森機場', AKJ: '旭川機場',
  NGO: '中部國際機場', FUJ: '福江機場', FKJ: '福井機場', FUK: '福岡機場', FKS: '福島機場', QGU: '岐阜機場',
  HAC: '八丈島機場', HKD: '函館機場', HTR: '波照間機場', HIJ: '廣島機場', IBR: '茨城機場', IEJ: '伊江島機場',
  IKI: '壹岐機場', IWO: '硫黃島航空基地', IWK: '岩國錦帶橋機場', IWJ: '石見機場', HNA: '花卷機場', IZO: '出雲結緣機場',
  NJA: '厚木海軍航空設施', HHE: '八戶航空基地', MUS: '南鳥島航空基地', OMJ: '大村航空基地', DNA: '嘉手納空軍基地',
  KOJ: '鹿兒島機場', KIX: '關西國際機場', KJP: '慶良間機場', KKX: '喜界機場', KTD: '北大東機場', KKJ: '北九州機場',
  UKB: '神戶機場', KCZ: '高知龍馬機場', KMQ: '小松機場', TJH: '但馬機場', KMJ: '熊本機場', UEO: '久米島機場',
  KUH: '釧路機場', HSG: '九州佐賀國際機場', MYJ: '松山機場', MMB: '女滿別機場', MMD: '南大東機場', MSJ: '三澤機場',
  MYE: '三宅島機場', MMY: '宮古機場', KMI: '宮崎機場', MBE: '紋別機場', FSZ: '富士山靜岡機場', NGS: '長崎機場',
  NKM: '名古屋機場（小牧）', OKA: '那霸機場', SHB: '中標津機場', SHM: '南紀白濱機場', NRT: '成田國際機場',
  CTS: '新千歲機場', ISG: '新石垣機場', TNE: '新種子島機場', KIJ: '新潟機場', NTQ: '能登里山機場', ONJ: '大館能代機場',
  OIT: '大分機場', OKJ: '岡山桃太郎機場', OKI: '隱岐世界地質公園機場', OKE: '沖永良部機場', OIR: '奧尻機場',
  ITM: '大阪國際機場（伊丹）', OIM: '大島機場', RBJ: '禮文機場', RIS: '利尻機場', SDS: '佐渡機場', OKD: '札幌丘珠機場',
  SDJ: '仙台機場', SHI: '下地島機場', MMJ: '信州松本機場', SYO: '庄內機場', TAK: '高松機場', TRA: '多良間機場',
  OBO: '帶廣機場', TKN: '德之島機場', TKS: '德島阿波舞機場', HND: '東京國際機場（羽田）', TTJ: '鳥取砂丘柯南機場',
  TOY: '富山機場', TSJ: '對馬機場', WKJ: '稚內機場', KUM: '屋久島機場', GAJ: '山形機場', UBJ: '山口宇部機場',
  OKO: '橫田空軍基地', YGJ: '米子鬼太郎機場', OGN: '與那國機場', RNJ: '與論機場',
};

const taiwanAirportNames = {
  TPE: '桃園國際機場',
  TSA: '台北松山機場',
};

export const airports = airportRows.split('\n').map((row) => {
  const [country, code, name, city] = row.split('|');
  const localName = country === 'TW' ? taiwanAirportNames[code] : japanAirportNames[code];
  return {
    country,
    code,
    name,
    city,
    displayName: localName || name,
    label: `${localName || name}（${code}）`,
  };
});

export function getAirportLabel(code) {
  return airports.find((airport) => airport.code === code)?.label || code || '未設定';
}