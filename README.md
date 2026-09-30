# Travel Journal｜旅程手札

以 React、Vite 與 Firebase 建置的旅行規劃工具。登入後可建立或加入旅程，集中管理每日安排、交通、住宿、旅費與個人行李清單；資料儲存在 Firebase Realtime Database，支援即時同步。

## 功能

- **帳號與登入**：以電子郵件和密碼註冊、登入，支援 Google 登入與重設密碼。
- **旅程管理**：建立旅程並設定標題、目的地、日期與描述；輸入旅行 ID 預覽並加入朋友的旅程。建立者可刪除旅程，參與者共用旅程資料。
- **每日行程**：依旅程日期安排活動，記錄分類、時間、地點與描述；可編輯或刪除活動、編輯每日摘要，並開啟地圖搜尋地點。建立旅程時可安排最長 60 天的日期範圍。
- **交通資訊**：新增多筆航班，記錄航空公司、日期、台灣或日本機場、出發與抵達時間，以及每人台幣票價；交通頁會依旅程彙整航班。
- **住宿資訊**：新增多筆住宿，記錄地址、入住與退房日期、金額和備註；住宿頁會顯示住宿晚數，地址可連到地圖搜尋。
- **記帳幫手**：分為公帳與個人帳目，可新增、編輯及刪除；支援日圓與台幣、支出分類、付款方式。公帳可加入或退出分帳、查看個人分攤、標記付款/結清，並依同幣別未結清金額計算建議轉帳。
- **支出總額換算**：以即時匯率將支出總額切換顯示為台幣或日圓；匯率由 open.er-api.com 提供，每 30 分鐘更新。
- **攜帶清單**：新增、修改、刪除物品，標記是否已打包、拖曳排序，並顯示完成比例。
- **響應式介面**：提供桌面側邊導覽與手機底部導覽。

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

Firebase Authentication 至少要啟用 **電子郵件/密碼**；要使用 Google 登入，還要啟用 **Google** provider，並確認 Firebase Authentication 的授權網域包含本機及正式環境網域。

## Firebase 資料庫設定

本專案使用根目錄的 `database.rules.json`。登入 Firebase CLI 後，從專案根目錄發布規則：

```powershell
npx firebase-tools login
npx firebase-tools deploy --only database --project <firebase-project-id>
```

目前規則的資料存取範圍如下，正式使用前請依產品的隱私需求檢視及調整：

- `users/{uid}/packingItems` 與 `users/{uid}/expenses` 僅允許該 UID 讀寫。
- `trips/{tripId}` 與 `sharedExpenses` 的讀取規則是「任何已登入的 Firebase 使用者可讀」。介面會依使用者的旅程索引顯示旅程，但這不會收窄資料庫的讀取權限。
- 旅程修改依參與者及建立者規則授權；公帳的建立、主要資料修改與刪除由建立者控制，參與者可依規則管理自己的參與狀態。

### App Check（建議用於正式環境）

App Check 與 Authentication 的用途不同：Authentication 識別使用者，App Check 用於驗證請求來源。若要啟用：

1. 在 Google Cloud 建立 reCAPTCHA Enterprise 網站金鑰，並允許本機及正式環境網域。
2. 在 Firebase Console 的 **App Check** 為 Web App 註冊該金鑰，設定 `VITE_FIREBASE_APP_CHECK_SITE_KEY`。
3. 部署並觀察 App Check 指標，確認請求已取得有效 token 後，再於 Firebase Console 對 Realtime Database 啟用 enforcement。

本機開發時，啟動應用程式並從瀏覽器主控台取得 debug token，於 Firebase Console 登記。需要跨瀏覽器工作階段沿用時，可將已登記的 token 放入未提交的 `.env.development.local`：

```env
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=your-registered-debug-token
```

App Check enforcement 必須在 Firebase Console 手動啟用；設定金鑰或部署本專案不會自動開啟 enforcement。另請在 Google Cloud 設定預算警示並監控 Realtime Database 用量；安全規則與 App Check 都不是費用上限。

## 指令

```powershell
npm run dev      # 啟動本機開發伺服器
npm test         # 執行旅程日期、資料整理與權限輔助函式測試
npm run build    # 建置正式版至 dist/
npm run preview  # 預覽正式版建置結果
```

`npm run build` 會接著執行 `postbuild`，將 `index.html` 複製為 `404.html`，供支援此模式的靜態主機處理前端路由。Firebase Hosting 尚未在本專案設定部署目標。

## 專案結構

```text
src/
  App.jsx                 登入、註冊、Google 登入與密碼重設
  firebase.js             Firebase 與 App Check 初始化
  travelStore.js          旅程及每日行程的資料存取
  expenseStore.js         公帳與個人帳目的資料存取
  packingStore.js         個人攜帶清單的資料存取
  travel/
    TravelHome.jsx        主介面、旅程總覽、交通、住宿與攜帶清單
    TravelPlanner.jsx     建立、加入及安排旅程
    ExpensePage.jsx       公帳、個人帳目與分帳結算
    travelUtils.js        旅程日期與顯示資料處理
    travelUtils.test.js   旅程工具函式測試
database.rules.json       Realtime Database 安全規則
firebase.json             Firebase CLI 資料庫規則設定
```