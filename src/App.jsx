import { useEffect, useState } from 'react';
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import { auth, hasFirebaseConfig } from './firebase.js';
import { expenseStore } from './expenseStore.js';
import { packingStore } from './packingStore.js';
import TravelHome from './travel/TravelHome.jsx';
import PrivacyPolicy from './PrivacyPolicy.jsx';

const firebaseErrors = {
  'auth/too-many-requests': '嘗試次數過多，請稍後再試。',
  'auth/network-request-failed': '網路連線似乎有問題，請確認連線後重試。',
  'auth/user-disabled': '這個帳號目前無法使用，請聯絡管理員。',
  'auth/operation-not-allowed': 'Firebase 尚未啟用此社群登入，請到 Firebase Console 開啟對應 provider。',
  'auth/popup-closed-by-user': '登入視窗已關閉，尚未完成登入。',
  'auth/popup-blocked': '瀏覽器封鎖了登入視窗，請允許彈出式視窗後再試。',
  'auth/cancelled-popup-request': '登入程序已取消，請再試一次。',
  'auth/account-exists-with-different-credential': '這個電子郵件已使用其他方式註冊，請先使用原本的登入方式。',
  'auth/unauthorized-domain': '目前網域尚未被 Firebase 授權，請將此網站加入 Firebase Authentication 的授權網域。',
  'auth/operation-not-supported-in-this-environment': '目前瀏覽器環境不支援彈出式登入，請改用外部瀏覽器再試。',
  'auth/app-not-authorized': '此 Facebook 應用程式尚未開放給目前帳號，請確認 Facebook App 已上線或已將此帳號加入測試角色。',
};

function shouldUseRedirectFlow() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isInAppBrowser = /FBAN|FBAV|Instagram|Line|MicroMessenger/i.test(ua);
  return isInAppBrowser;
}

function App() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const privacyPath = `${basePath}/privacy-policy`;
  const isPrivacyPage = window.location.pathname.replace(/\/$/, '') === privacyPath;
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authReady, setAuthReady] = useState(!auth);
  const [busyProvider, setBusyProvider] = useState('');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!auth) return undefined;

    getRedirectResult(auth).catch((error) => {
      setNotice({
        type: 'error',
        text: firebaseErrors[error.code] || '目前無法完成登入，請稍後再試。',
      });
    });

    return onAuthStateChanged(auth, (nextUser) => {
      setFirebaseUser(nextUser);
      setAuthReady(true);
      if (window.location.pathname.replace(/\/$/, '') === privacyPath) return;
      const destination = nextUser ? `${basePath}/main` : `${basePath}/`;
      if (window.location.pathname !== destination) {
        window.history.replaceState(null, '', destination);
      }
    });
  }, []);

  async function handleSocialSignIn(providerType) {
    setNotice(null);

    if (!hasFirebaseConfig || !auth) {
      setNotice({ type: 'error', text: '尚未設定 Firebase。請先填入 Firebase 專案資訊。' });
      return;
    }

    setBusyProvider(providerType);
    try {
      const provider = providerType === 'facebook' ? new FacebookAuthProvider() : new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setNotice({ type: 'success', text: '登入成功，準備出發。' });
    } catch (error) {
      const fallbackToRedirectCodes = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'];
      if (shouldUseRedirectFlow() || fallbackToRedirectCodes.includes(error.code)) {
        try {
          const provider = providerType === 'facebook' ? new FacebookAuthProvider() : new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          setNotice({
            type: 'error',
            text: firebaseErrors[redirectError.code] || '目前無法登入，請稍後再試。',
          });
          return;
        }
      }

      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setNotice({ type: 'info', text: firebaseErrors[error.code] });
        return;
      }
      setNotice({
        type: 'error',
        text: firebaseErrors[error.code] || '目前無法登入，請稍後再試。',
      });
    } finally {
      setBusyProvider('');
    }
  }

  if (isPrivacyPage) {
    return <PrivacyPolicy />;
  }

  if (!authReady) {
    return <main className="auth-bootstrap">正在確認登入狀態…</main>;
  }

  if (firebaseUser) {
    return <TravelHome user={firebaseUser} onSignOut={() => signOut(auth)} packingStore={packingStore} expenseStore={expenseStore} />;
  }

  return (
    <main className="auth-shell">
      <div className="visual-image" aria-hidden="true" />
      <section className="form-panel social-auth-panel">
        <div className="form-topline">
          <span className="secure-label"><LockKeyhole size={14} /> 安全登入</span>
          <span className="top-switch">僅提供第三方登入</span>
        </div>

        <div className="form-content">
          <p className="section-kicker">SOCIAL SIGN IN ONLY</p>
          <h2>登入開始旅行</h2>
          <p className="form-intro">使用你熟悉的社群帳號快速登入，開始規劃下一趟旅程。</p>

          {notice && <p className={`notice ${notice.type}`} role="status">{notice.text}</p>}

          <div className="social-login-grid" role="group" aria-label="第三方登入方式">
            <button className="social-login-button social-login-google" type="button" onClick={() => handleSocialSignIn('google')} disabled={Boolean(busyProvider)}>
              <span className="social-login-icon" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="18" height="18">
                  <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.7 6.1-14.9Z" />
                  <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z" />
                  <path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4v-5.2H5.8a20 20 0 0 0 0 17.8l6.8-5.2Z" />
                  <path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15.1l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z" />
                </svg>
              </span>
              <span>{busyProvider === 'google' ? <><LoaderCircle className="spinner" size={17} />Google 登入中…</> : '使用 Google 帳戶登入'}</span>
            </button>

            <button className="social-login-button social-login-facebook" type="button" onClick={() => handleSocialSignIn('facebook')} disabled={Boolean(busyProvider)}>
              <span className="social-login-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="17" height="17">
                  <path fill="#ffffff" d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.23.2 2.23.2v2.46H15.2c-1.24 0-1.62.77-1.62 1.55V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
                </svg>
              </span>
              <span>{busyProvider === 'facebook' ? <><LoaderCircle className="spinner" size={17} />Facebook 登入中…</> : '使用 Facebook 帳戶登入'}</span>
            </button>
          </div>

          <p className="terms">
            繼續即表示你同意我們的 <a href="#terms">服務條款</a> 與 <a href={`${import.meta.env.BASE_URL}privacy-policy`}>隱私權政策</a>
          </p>
        </div>
        <footer className="form-footer"><span>© 2026 jp-travel-app</span><span>每一段旅程，都從這裡開始。</span></footer>
      </section>
    </main>
  );
}

export default App;