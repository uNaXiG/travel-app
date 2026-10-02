# Travel Journal｜旅程手札

以 React、Vite 與 Firebase 建置的旅行規劃與協作工具，適合個人出遊及親友同行。從出發前的行程安排、航班與住宿整理，到旅途中的天氣查詢、記帳分攤與行李管理，都能集中在同一個服務中；資料透過 Firebase Realtime Database 即時同步，方便跨裝置使用。

## 正式網站
- [我的旅行](https://unaxig.github.io/travel-app/)
- [GitHub 完整原始碼](https://github.com/uNaXiG/travel-app)
- [隱私權政策](https://unaxig.github.io/travel-app/privacy-policy)
- [服務條款](https://unaxig.github.io/travel-app/terms-of-service)

iOS 使用者可透過 Safari 開啟網站，再加入主畫面，方便像 App 一樣啟動。此服務仍需網路連線，不代表支援離線使用。

## 功能

- **Google 第三方登入**：透過 Firebase Authentication 使用 Google 帳戶登入與登出，不需另外建立服務密碼。支援彈出視窗登入，特定瀏覽器環境會改用重新導向流程；Facebook 登入程式已保留，但目前介面停用，不提供電子郵件／密碼註冊或密碼重設。
- **旅程建立與共同規劃**：設定標題、目的地、起迄日期與描述，目前目的地選項為台灣、日本。可複製旅行 ID 分享給同行者，對方輸入 ID 後預覽並加入；參與者共用行程、交通、住宿與旅程公帳。
- **旅程刪除**：僅旅程建立者可刪除整趟旅行，需輸入旅程名稱確認。刪除會一併清除旅程資料、所有參與者的旅程索引，以及該旅程的個人帳目與行李清單，無法復原。
- **旅行與住宿封面**：建立旅程時可選擇 JPG/PNG 作為旅程封面，也可為每間住宿設定封面；圖片以 Base64 data URL 儲存在 Realtime Database，原始檔上限為 1 MiB。
- **每日行程與地圖**：建立最長 60 天的旅程，逐日設定主要地點與摘要。活動可記錄分類、時間、地點與描述，支援新增、編輯、刪除及 Google Maps 地點搜尋；每日地點目前提供台灣、日本的預設城市選項。
- **每日天氣**：依每日主要地點查詢 Open-Meteo，顯示天氣狀況與溫度。過去日期使用歷史資料，預報範圍內顯示每日預報；距今日 16 天以上則改顯示該地即時天氣，並非該旅行日期的預報。資料可能受來源與查詢時間影響。
- **交通資訊**：新增多筆航班，記錄航空公司、日期、台灣或日本機場、出發與抵達時間，以及每人台幣票價。建立旅程時可編輯航班草稿；建立後可從交通頁按旅程查看、新增或刪除航班。
- **住宿資訊**：記錄多間住宿的名稱、地址、入住／退房日期、台幣金額、備註與封面。建立旅程時可編輯住宿草稿；建立後可從住宿頁查看、新增或刪除，並顯示住宿晚數及地圖連結。
- **按旅程記帳**：每趟旅行分開管理公帳與個人帳目，支援新增、編輯、刪除、日圓／台幣、支出分類，以及現金、信用卡、Apple Pay 等付款方式紀錄。這些是記帳標記，不會實際扣款或發起支付。
- **共同分帳與結算**：成員可加入或退出未鎖定的公帳，查看個人分攤；公帳建立者可標記付款與成員結清狀態。系統依同幣別未結清分攤合併抵銷，提供建議轉帳，不會自動匯款。
- **不可逆分帳鎖定**：公帳建立者確認成員與轉帳結論後可鎖定分帳；鎖定後不可編輯、刪除、加入、退出或變更結清狀態。
- **支出總額換算**：可將總額切換為台幣或日圓顯示；匯率由 open.er-api.com 提供，每 30 分鐘更新。匯率取得失敗時顯示提示，不代表銀行實際成交匯率。
- **個人攜帶清單**：依旅程管理自己的物品，支援新增、修改、刪除、已打包勾選、拖曳排序與完成比例；不與同行者共用個人清單。
- **跨裝置與使用規範**：提供桌面側邊導覽、手機底部導覽、獨立隱私權政策與服務條款頁；登入頁可開啟兩份文件，登入後可使用雲端同步資料。

## 三大安全保障與適用範圍

1. **Google 第三方嚴格驗證機制**：帳戶身分由 Google 登入及 Firebase Authentication 驗證，本服務不接收 Google 帳戶密碼。另支援以 reCAPTCHA Enterprise 為基礎的 Firebase App Check 驗證應用程式請求，與使用者登入驗證分工保護。
2. **使用者資料庫嚴格保護與服務網域限制**：資料讀寫由 Realtime Database 安全規則控管，個人帳目及行李清單僅本人可讀取。正式部署以「一般使用者僅能透過本服務網域 `unaxig.github.io` 存取」為保護目標，需搭配 reCAPTCHA Enterprise 網域限制及 Realtime Database App Check enforcement；僅設定 Authentication 授權網域並不足以限制資料庫請求。目前儲存庫無法證實雲端設定已完成，因此不宣稱已達成絕對的網域隔離。
3. **完整程式碼於 GitHub 公開**：使用者可檢視登入、資料讀寫、外部 API 請求及資料庫規則，完整了解公開程式碼中的存取行為。Firebase／Google Cloud 的實際部署設定並不包含在原始碼中，仍需由管理者確認。

**現有權限限制**：目前 `trips/{tripId}`（含旅程公帳）與舊版 `sharedExpenses` 允許任何已登入的 Firebase 使用者讀取，並非僅限該旅程成員。旅行 ID 與介面的旅程篩選不是資料庫讀取權限控制；請勿將此服務視為可存放高度敏感資料的私密保管庫。App Check 驗證應用程式請求，不會取代使用者資料授權，也不保證所有非瀏覽器或管理端存取都被排除。

## 資料與外部服務

- **Firebase**：處理第三方登入、必要的基本帳戶資訊，以及旅程、行程、圖片、帳目與行李資料的儲存及同步。
- **Open-Meteo**：依選定的每日地點查詢座標、天氣與日期資料，不使用裝置 GPS 定位。
- **ExchangeRate-API（open.er-api.com）**：查詢日圓匯率，供支出總額換算使用。
- **Google Maps／Google 搜尋**：點選相關連結時，以指定的地點或搜尋文字開啟外部網站。

資料用途、停止使用及資料查詢／刪除方式，請參閱網站的[隱私權政策](https://unaxig.github.io/travel-app/privacy-policy)。

## 技術

- React 18、Vite 6
- Firebase Authentication、Realtime Database、App Check（設定 site key 後啟用）
- dnd-kit（攜帶清單排序）、Lucide React（圖示）
- Node.js 內建測試執行器

## 本機啟動

需求：Node.js 與 npm，以及一個已設定 Authentication 和 Realtime Database 的 Firebase 專案。

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

在專案根目錄的 `.env` 填入 Firebase Web App 設定值。`.env` 含有專案設定，不要提交到版本控制；請勿將 App Check debug token 放入已提交的檔案。

| 變數 | 說明 |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase Web App API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication 網域 |
| `VITE_FIREBASE_PROJECT_ID` | Firebase 專案 ID |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket 設定值 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID |
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | 可選；reCAPTCHA Enterprise 網站金鑰。設定後，應用程式會初始化 App Check |
| `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` | 可選；本機開發用的已註冊 App Check debug token，只放在未提交的本機環境檔 |

Firebase Authentication 需啟用 **Google** provider，並確認授權網域包含本機及正式環境的 `unaxig.github.io`。目前介面不使用電子郵件／密碼登入；Facebook provider 僅在日後重新開放該登入介面時才需要設定。

## Firebase 資料庫設定

本專案使用根目錄的 `database.rules.json`。登入 Firebase CLI 後，從專案根目錄發布規則：

```powershell
npx firebase-tools login
npx firebase-tools deploy --only database --project <firebase-project-id>
```

目前規則的資料存取範圍如下，正式使用前請依產品的隱私需求檢視及調整：

- 個人帳目 `users/{uid}/tripExpenses/{tripId}`、個人清單 `users/{uid}/tripPackingItems/{tripId}` 與旅程索引僅本人可讀取；旅程建立者在刪除整趟旅行時，可刪除參與者的對應資料。
- 舊版個人清單 `users/{uid}/packingItems` 與個人帳目 `users/{uid}/expenses` 僅允許該 UID 讀寫。
- `trips/{tripId}`（含 `sharedExpenses` 子節點）與舊版根節點 `sharedExpenses` 的讀取規則是「任何已登入的 Firebase 使用者可讀」。介面會依使用者的旅程索引顯示旅程，但這不會收窄資料庫的讀取權限。
- 旅程修改依參與者及建立者規則授權；旅程公帳需具備旅程參與權限，主要資料修改與刪除由公帳建立者控制，參與者可依規則管理自己的參與狀態。鎖定後規則禁止公帳修改、刪除與分帳狀態變更。

### App Check（建議用於正式環境）

App Check 與 Authentication 的用途不同：Authentication 識別使用者，App Check 用於驗證請求來源。若要啟用：

1. 在 Google Cloud 建立 reCAPTCHA Enterprise 網站金鑰，正式環境允許網域設為 `unaxig.github.io` 並啟用網域驗證；本機開發使用已登記的 debug token，避免為正式金鑰額外放寬網域。
2. 在 Firebase Console 的 **App Check** 為 Web App 註冊該金鑰，設定 `VITE_FIREBASE_APP_CHECK_SITE_KEY`。
3. 部署並觀察 App Check 指標，確認請求已取得有效 token 後，再於 Firebase Console 對 Realtime Database 啟用 enforcement。

本機開發時，啟動應用程式並從瀏覽器主控台取得 debug token，於 Firebase Console 登記。需要跨瀏覽器工作階段沿用時，可將已登記的 token 放入未提交的 `.env.development.local`：

```env
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=your-registered-debug-token
```

App Check enforcement 必須在 Firebase Console 手動啟用；設定金鑰或部署本專案不會自動開啟 enforcement。正式環境應確認不接受未授權的 debug token，並透過 App Check 指標及未附有效 token 的測試請求驗證 enforcement。這些部署設定無法僅靠本儲存庫確認。

另請在 Google Cloud 設定預算警示並監控 Realtime Database 用量；安全規則與 App Check 都不是費用上限。

## 指令

```powershell
npm run dev      # 啟動本機開發伺服器
npm test         # 執行旅程工具與支出金額換算測試
npm run build    # 建置正式版至 dist/
npm run preview  # 預覽正式版建置結果
```

`npm run build` 會接著執行 `postbuild`，將 `index.html` 複製為 `404.html`，供 GitHub Pages 等支援此模式的靜態主機處理前端路由。Vite 在 GitHub Actions 環境會依 `GITHUB_REPOSITORY` 推導部署子路徑；手動建置至本網站路徑可使用：

```powershell
$env:VITE_BASE_PATH = '/travel-app/'
npm run build
```

Firebase Hosting 尚未在本專案設定部署目標；目前測試也不涵蓋 Firebase 雲端規則或 App Check 的實際 enforcement。

## 專案結構

```text
src/
  App.jsx                 Google 登入、登出與政策／條款路由
  PrivacyPolicy.jsx       隱私權政策
  TermsOfService.jsx      服務條款
  firebase.js             Firebase 與 App Check 初始化
  travelStore.js          旅程及每日行程的資料存取
  expenseStore.js         公帳與個人帳目的資料存取
  packingStore.js         個人攜帶清單的資料存取
  expenseUtils.js         支出總額與幣別換算
  expenseUtils.test.js    支出換算測試
  config/
    tripCountries.js      目的地國家選項
    dailyItineraryLocations.js  每日地點與天氣查詢對照
  travel/
    TravelHome.jsx        主介面、旅程總覽、交通、住宿與攜帶清單
    TravelPlanner.jsx     建立、加入及安排旅程
    ExpensePage.jsx       公帳、個人帳目與分帳結算
    weatherService.js     每日預報、歷史與即時天氣查詢
    locationMapping.js    每日地點資料轉換
    imageUtils.js         圖片驗證與 Base64 轉換
    travelUtils.js        旅程日期與顯示資料處理
    travelUtils.test.js   旅程工具函式測試
database.rules.json       Realtime Database 安全規則
firebase.json             Firebase CLI 資料庫規則設定
```
