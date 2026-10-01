import { ArrowLeft, LockKeyhole } from 'lucide-react';

function PrivacyPolicy() {
  return (
    <main className="auth-shell privacy-shell">
      <div className="visual-image" aria-hidden="true" />
      <article className="privacy-panel">
        <div className="form-topline">
          <span className="secure-label"><LockKeyhole size={14} /> 隱私權政策</span>
          <span className="top-switch">jp-travel-app</span>
        </div>

        <div className="privacy-content">
          <p className="section-kicker">YOUR PRIVACY</p>
          <h1>隱私權政策</h1>
          <p className="privacy-intro">本政策說明 jp-travel-app 如何處理你在使用服務時提供的資料。</p>

          <section className="privacy-section">
            <h2>我們蒐集的資料</h2>
            <p>使用第三方帳戶登入時，我們會取得必要的基本帳戶資訊；你新增的旅程、行程、花費與行李清單也會儲存於服務中。</p>
          </section>

          <section className="privacy-section">
            <h2>資料用途與儲存</h2>
            <p>資料僅用於登入、提供旅程規劃功能及跨裝置同步，不會出售你的個人資料。登入與資料儲存由 Firebase 提供。</p>
          </section>

          <section className="privacy-section">
            <h2>你的選擇與資料安全</h2>
            <p>你可以停止使用並登出；如需查詢或刪除已儲存的資料，請聯繫網站管理者。我們採取合理措施保護資料，但網路傳輸無法保證絕對安全。</p>
          </section>

          <a className="privacy-back-link" href={import.meta.env.BASE_URL}>
            <ArrowLeft size={15} /> 返回首頁
          </a>
        </div>

        <footer className="privacy-footer">© 2026 jp-travel-app</footer>
      </article>
    </main>
  );
}

export default PrivacyPolicy;