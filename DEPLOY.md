# Deploying the secure version + next-day planner

What changed:
- **Anthropic key is server-side.** AI calls go through two Cloud Functions (`nutrition`, `planTomorrow`) in `asia-south1`. The key is a Firebase secret, never in the browser bundle.
- **Sign-in required.** Google sign-in, and only emails in the Firestore `allowlist` collection get in.
- **Firestore locked down.** Only allow-listed users can read/add entries; nobody can edit or delete from the app; plans are written only by the function.
- **Next-day planner.** "📋 Plan tomorrow" in the chat (or type "plan tomorrow"). Diet rules per person are in `functions/profiles.js`. The plan shows up the next morning.

## One-time setup (Firebase console)

1. **Blaze plan**: Project settings → Usage and billing → upgrade. Cloud Functions and secrets need it. At this usage it stays in the free tier.
2. **Google sign-in**: Authentication → Sign-in method → Google → Enable.
3. **Allowlist**: Firestore → Start collection `allowlist` → add one document per person, **document ID = their Google email** (any field, e.g. `name: "Rajasekar"`).
4. **Revoke the old Anthropic key** if it was ever pasted into `App.jsx` and deployed (console.anthropic.com → API keys), then create a new one.

## Deploy (from the project folder)

```bash
npm install
cd functions && npm install && cd ..
firebase login
firebase functions:secrets:set ANTHROPIC_API_KEY   # paste the new key when asked
firebase deploy
```

`firebase deploy` builds the app, then deploys hosting, functions, Firestore rules and indexes.
If it asks to delete indexes that aren't in `firestore.indexes.json`, answer **No**.

## Updating later

Edit, then `firebase deploy` (or `firebase deploy --only hosting` for UI-only changes).
