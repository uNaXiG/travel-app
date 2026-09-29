import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, MapPin } from 'lucide-react';
import { auth, hasFirebaseConfig } from './firebase.js';
import { expenseStore } from './expenseStore.js';
import { packingStore } from './packingStore.js';
import TravelHome from './travel/TravelHome.jsx';

const firebaseErrors = {
  'auth/email-already-in-use': '這個電子郵件已經註冊過了。',
  'auth/invalid-email': '請輸入有效的電子郵件地址。',
  'auth/invalid-credential': '電子郵件或密碼不正確，請再試一次。',
  'auth/user-not-found': '找不到這個帳號，請確認電子郵件或先建立帳號。',
  'auth/wrong-password': '密碼不正確，請再試一次。',
  'auth/weak-password': '密碼至少需要 6 個字元。',
  'auth/too-many-requests': '嘗試次數過多，請稍後再試。',
  'auth/network-request-failed': '網路連線似乎有問題，請確認連線後重試。',
  'auth/user-disabled': '這個帳號目前無法使用，請聯絡管理員。',
  'auth/operation-not-allowed': 'Firebase 尚未啟用 Google 登入，請到 Firebase Console 開啟 Google provider。',
  'auth/popup-closed-by-user': 'Google 登入視窗已關閉，尚未完成登入。',
  'auth/popup-blocked': '瀏覽器封鎖了 Google 登入視窗，請允許彈出式視窗後再試。',
  'auth/cancelled-popup-request': 'Google 登入程序已取消，請再試一次。',
  'auth/account-exists-with-different-credential': '這個電子郵件已使用其他方式註冊，請先使用原本的登入方式。',
};

function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authReady, setAuthReady] = useState(!auth);
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const isRegister = mode === 'register';
  const isReset = mode === 'reset';

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (nextUser) => {
      setFirebaseUser(nextUser);
      setAuthReady(true);
      const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
      const destination = nextUser ? `${basePath}/main` : `${basePath}/`;
      if (window.location.pathname !== destination) {
        window.history.replaceState(null, '', destination);
      }
    });
  }, []);

  function changeMode(nextMode) {
    setMode(nextMode);
    setNotice(null);
    setPassword('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice(null);

    if (!hasFirebaseConfig || !auth) {
      setNotice({
        type: 'error',
        text: '尚未設定 Firebase。請在 auth 專案根目錄建立 .env 並填入 Firebase 專案資訊。',
      });
      return;
    }

    setBusy(true);
    try {
      if (isReset) {
        await sendPasswordResetEmail(auth, email.trim());
        setNotice({ type: 'success', text: '重設密碼連結已寄出，請查看你的電子郵件。' });
      } else if (isRegister) {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(credential.user, { displayName: name.trim() });
        setNotice({ type: 'success', text: '帳號建立成功，歡迎加入這趟旅程。' });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setNotice({ type: 'success', text: '登入成功，準備出發。' });
      }
    } catch (error) {
      setNotice({
        type: 'error',
        text: firebaseErrors[error.code] || '目前無法完成操作，請稍後再試。',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setNotice(null);

    if (!hasFirebaseConfig || !auth) {
      setNotice({ type: 'error', text: '尚未設定 Firebase。請先填入 Firebase 專案資訊。' });
      return;
    }

    setBusy(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      setNotice({ type: 'success', text: '登入成功' });
    } catch (error) {
      setNotice({
        type: 'error',
        text: firebaseErrors[error.code] || '目前無法登入，請稍後再試。',
      });
    } finally {
      setBusy(false);
    }
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
      <section className="form-panel">
        <div className="form-topline">
          <span className="secure-label"><LockKeyhole size={14} /> 安全登入</span>
          {!isReset && (
            <span className="top-switch">
              {isRegister ? '已經有帳號？' : '還沒有帳號？'}{' '}
              <button type="button" onClick={() => changeMode(isRegister ? 'login' : 'register')}>
                {isRegister ? '登入' : '註冊'}
              </button>
            </span>
          )}
        </div>

        <div className="form-content" key={mode}>
          {isReset ? (
            <>
              <button className="back-link" type="button" onClick={() => changeMode('login')}>
                <ArrowLeft size={16} /> 返回登入
              </button>
              <p className="section-kicker">ACCOUNT RECOVERY</p>
              <h2>忘記密碼？</h2>
              <p className="form-intro">別擔心，留下註冊時使用的電子郵件，我們會寄送重設連結給你。</p>
            </>
          ) : (
            <>
              {isRegister}
              <h2 className="form-intro">
                {isRegister ? '建立帳號' : '登入開始旅行'}
              </h2>
            </>
          )}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <label className="field">
                <span>怎麼稱呼你</span>
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="輸入你的名字"
                  required
                />
              </label>
            )}
            <label className="field">
              <span>電子郵件</span>
              <span className="input-wrap">
                <Mail className="field-icon" size={17} />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </span>
            </label>
            {!isReset && (
              <label className="field">
                <span className="password-label">
                  <span>密碼</span>
                  {!isRegister && (
                    <button className="text-button" type="button" onClick={() => changeMode('reset')}>
                      忘記密碼？
                    </button>
                  )}
                </span>
                <span className="input-wrap">
                  <LockKeyhole className="field-icon" size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="至少 6 個字元"
                    minLength={6}
                    required
                  />
                  <button
                    className="visibility-button"
                    type="button"
                    aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
            )}

            {notice && <p className={`notice ${notice.type}`} role="status">{notice.text}</p>}

            <button className="submit-button" type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="spinner" size={18} /> : <>{isReset ? '寄送重設連結' : isRegister ? '建立帳號' : '登入'} <ArrowRight size={17} /></>}
            </button>
          </form>

          {!isReset && (
            <>
              <div className="auth-divider"><span>或</span></div>
              <button className="google-button" type="button" onClick={handleGoogleSignIn} disabled={busy}>
                <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18">
                  <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.7 6.1-14.9Z" />
                  <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z" />
                  <path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4v-5.2H5.8a20 20 0 0 0 0 17.8l6.8-5.2Z" />
                  <path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15.1l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z" />
                </svg>
                使用 Google 帳戶繼續
              </button>
            </>
          )}

          <p className="terms">
            {isReset ? '還記得密碼了？' : '繼續即表示你同意我們的'}{' '}
            {isReset ? <button type="button" onClick={() => changeMode('login')}>返回登入</button> : <><a href="#terms">服務條款</a> 與 <a href="#privacy">隱私權政策</a></>}
          </p>
        </div>
        <footer className="form-footer"><span>© 2026 jp-travel-app</span><span>每一段旅程，都從這裡開始。</span></footer>
      </section>
    </main>
  );
}

export default App;