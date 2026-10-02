import { ArrowLeft, FileText } from 'lucide-react';

function TermsOfService() {
  return (
    <main className="auth-shell privacy-shell">
      <div className="visual-image" aria-hidden="true" />
      <article className="privacy-panel">
        <div className="form-topline">
          <span className="secure-label"><FileText size={14} /> 服務條款</span>
          <span className="top-switch">jp-travel-app</span>
        </div>

        <div className="privacy-content">
          <p className="section-kicker">TERMS OF SERVICE</p>
          <h1>服務條款</h1>
          <p className="privacy-intro">本條款說明使用旅程手札（jp-travel-app）時的權利、責任與服務限制。使用前請閱讀本條款及隱私權政策；若不同意，請勿登入或繼續使用。</p>

          <section className="privacy-section">
            <h2>一、服務範圍</h2>
            <p>本服務提供旅程規劃、同行協作、交通與住宿資訊整理、記帳分帳及個人行李清單，並透過雲端同步資料。航班與住宿紀錄不代表訂位或訂房；付款、結清標記與建議轉帳僅供記帳，不會實際扣款或匯款。</p>
          </section>

          <section className="privacy-section">
            <h2>二、帳戶與使用責任</h2>
            <p>目前使用 Google 第三方帳戶登入，本服務不接收你的 Google 密碼。請妥善保管帳戶及裝置，僅使用你有權使用的帳戶；不得冒用身分、干擾服務、繞過存取限制，或進行違法及侵害他人權利的行為。</p>
          </section>

          <section className="privacy-section">
            <h2>三、共同旅程與資料內容</h2>
            <p>請確認你有權上傳所提供的文字、圖片及其他資料，並取得同行者必要的同意。分享旅行 ID 可能讓他人加入並修改共用資料，請謹慎分享。目前資料庫規則允許已登入使用者讀取旅程及公帳，並非僅限同行成員；個人帳目與行李清單僅本人可讀取。請勿上傳密碼、證件或其他高度敏感資料。</p>
          </section>

          <section className="privacy-section">
            <h2>四、刪除與分帳鎖定</h2>
            <p>旅程建立者刪除整趟旅行時，會一併清除共用資料及參與者在該旅程的個人帳目與行李清單，無法復原。公帳建立者鎖定分帳後，不可再編輯、刪除、加入、退出或更改結清狀態。執行前請核對內容，並自行保存重要紀錄；分帳爭議須由同行者協議處理。</p>
          </section>

          <section className="privacy-section">
            <h2>五、外部資訊與服務可用性</h2>
            <p>登入、資料儲存、天氣、匯率及地圖由第三方服務提供，可能延遲、錯誤或中斷。超出天氣預報範圍的日期會改顯示當地即時天氣，匯率也不代表實際交易匯率。請以航空公司、住宿業者、氣象機構及金融機構資訊為準。本服務不保證持續可用或資料絕不遺失。</p>
          </section>

          <section className="privacy-section">
            <h2>六、隱私與資料安全</h2>
            <p>帳戶及使用資料的處理方式請參閱隱私權政策。我們採取合理措施保護資料，但不保證絕對安全；App Check 與網域限制的效果取決於實際部署設定。原始碼公開供檢視，不代表所有雲端管理設定均已公開。</p>
          </section>

          <section className="privacy-section">
            <h2>七、條款變更與停止使用</h2>
            <p>服務功能及條款可能隨維護需求調整，更新內容將公布於本頁。你可以隨時登出並停止使用；如需查詢或刪除已儲存資料，請聯繫網站管理者。本條款不排除適用法律保障的權利，也不免除依法不得免除的責任。</p>
          </section>

          <nav aria-label="服務條款頁面導覽">
            <a className="privacy-back-link" href={`${import.meta.env.BASE_URL}privacy-policy`}>
              <FileText size={15} /> 隱私權政策
            </a>
            <br />
            <a className="privacy-back-link" href={import.meta.env.BASE_URL}>
              <ArrowLeft size={15} /> 返回首頁
            </a>
          </nav>
        </div>

        <footer className="privacy-footer">© 2026 jp-travel-app</footer>
      </article>
    </main>
  );
}

export default TermsOfService;