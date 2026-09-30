# Wanderwell Travel App

React + Vite travel planner using Firebase Authentication and Realtime Database.

## Local setup

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Fill in the Firebase web app values in `.env`. The application does not render private data until Firebase Authentication has restored a signed-in user.

## Database security

`database.rules.json` denies database access by default. The declared paths require Firebase Authentication, personal packing and expense data is restricted to its owner, and shared trip writes use participant or owner checks.

Deploy rules from the project root:

```powershell
npx firebase-tools login
npx firebase-tools use <firebase-project-id>
npx firebase-tools deploy --only database
```

To compile rules locally, install Java and run:

```powershell
npx firebase-tools emulators:exec --only database --project demo-travel-app "npm test"
```

## App Check

Authentication identifies a user but does not prove requests came from this web app. To reduce scripted abuse:

1. In Google Cloud, create a reCAPTCHA Enterprise website key and allow the production and local development domains.
2. In Firebase Console, open **App Check**, register the web app with that key, and set `VITE_FIREBASE_APP_CHECK_SITE_KEY` in `.env` and the production environment.
3. Deploy the web app and observe App Check metrics first.
4. Enable enforcement for **Realtime Database** after valid requests are receiving tokens.

App Check enforcement is a Firebase Console setting and is not enabled merely by deploying this repository. Also configure Google Cloud budget alerts and monitor Realtime Database usage; security rules and App Check reduce abuse but are not billing caps.

For local development, start the app and copy the App Check debug token printed in the browser console:

```powershell
npm run dev
```

Register it under **Firebase Console > App Check > Apps > Manage debug tokens**. The browser reuses the registered token on later runs. To use a fixed token across browser sessions, place it only in `.env.development.local` (never commit it):

```env
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=your-registered-debug-token
```
