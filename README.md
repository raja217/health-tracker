# 💪 HealthBot — 3 Person Tracker
## Complete Setup & Deployment Guide

---

## ⏱️ Total time: ~20 minutes

---

## STEP 1 — Install tools (once only)

Install Node.js from https://nodejs.org (choose LTS version)

Then open Terminal / Command Prompt and run:
```bash
npm install -g firebase-tools
```

---

## STEP 2 — Create Firebase project (FREE)

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Name it: `health-tracker` (or anything)
4. Disable Google Analytics (not needed) → **Create project**

### Enable Firestore Database:
1. In Firebase console → **Firestore Database** → **Create database**
2. Choose **"Start in test mode"** → Next → Select any location → Done

### Get your Firebase config:
1. Firebase console → ⚙️ Project Settings → **Your apps** section
2. Click **"</> Web"** icon → Register app (name it anything)
3. Copy the `firebaseConfig` object — you'll need it in Step 4

---

## STEP 3 — Get Anthropic API key (for AI food tracking)

1. Go to https://console.anthropic.com
2. Sign up (free) → **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-...`)

> 💡 Cost: ~$0.01 per food log. $5 credit lasts months for 3 people.

---

## STEP 4 — Configure the app

### Set your Firebase config:
Open `src/firebase.js` and replace the placeholder values:
```js
const firebaseConfig = {
  apiKey: "AIza...",           // ← paste from Firebase console
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
}
```

### Set your Anthropic key:
Open `src/App.jsx` and replace:
```js
export const ANTHROPIC_API_KEY = 'sk-ant-YOUR_KEY_HERE'
```

### Customize the 3 names:
In `src/App.jsx`, change the names:
```js
export const PEOPLE = [
  { id: 'person1', name: 'Sarah',  color: '#E74C3C', light: '#FDEDEC', emoji: '🔴' },
  { id: 'person2', name: 'Mike',   color: '#2980B9', light: '#EBF5FB', emoji: '🔵' },
  { id: 'person3', name: 'Priya',  color: '#27AE60', light: '#EAFAF1', emoji: '🟢' },
]
```

---

## STEP 5 — Install & build

Open Terminal in the `health-tracker` folder:
```bash
npm install
npm run build
```

---

## STEP 6 — Deploy to Firebase

```bash
firebase login          # Opens browser to sign in with Google
firebase init           # Select: Hosting → Use existing project → your project
                        # Public dir: dist   |   SPA: Yes   |   Overwrite: No
firebase deploy
```

Done! Firebase gives you a URL like:
**https://health-tracker-abc12.web.app** 🎉

Share this link with all 3 people — works on any phone browser!

---

## 📱 How to use the app

1. **Open the URL** on your phone
2. **Tap your name**
3. **Bot asks your weight** (daily) → type it in lbs
4. **If it's been 7+ days** → bot asks all 6 measurements (neck, chest, waist, hips, thighs, arms)
5. **Food logging** → tell the bot what you ate in plain English
   - "I had 2 scrambled eggs and toast for breakfast"
   - "Grilled chicken salad for lunch"
6. **📊 Dashboard** → See all 3 people's charts + leaderboard
7. **📥 Export Excel** → Downloads a full spreadsheet with all data

---

## 📊 Data stored in Firebase Firestore

| Collection | What's stored |
|------------|--------------|
| `weights` | Daily weight per person |
| `measurements` | Weekly body measurements per person |
| `food` | Food entries with AI nutrition estimates |

---

## 🔁 Updates

To update the app after changes:
```bash
npm run build
firebase deploy
```

---

## ❓ Troubleshooting

**"Permission denied" on Firestore?**
→ Make sure Firestore is in test mode (Firebase console → Firestore → Rules)

**AI not working?**
→ Check your Anthropic API key in `src/App.jsx`

**Charts empty?**
→ Log at least 2+ entries first, then check dashboard

---

## 💰 Cost Summary

| Service | Cost |
|---------|------|
| Firebase Hosting | FREE (10GB/month) |
| Firestore Database | FREE (1GB, 50K reads/day) |
| Anthropic AI (food) | ~$0.01 per food entry |
| **Total for 3 people** | **~$1–3/month** |
