// Server side of HealthBot. The Anthropic API key lives here as a Firebase secret,
// never in the browser. Only signed-in users listed in Firestore `allowlist` can call these.
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const PROFILES = require('./profiles')

initializeApp()
const db = getFirestore()

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')
const AI_MODEL = 'claude-haiku-4-5-20251001'
const OPTS = { region: 'asia-south1', secrets: [ANTHROPIC_API_KEY], maxInstances: 3 }

async function requireAllowed(request) {
  const email = request.auth?.token?.email
  if (!email || !request.auth.token.email_verified) {
    throw new HttpsError('unauthenticated', 'Sign in first.')
  }
  const doc = await db.collection('allowlist').doc(email).get()
  if (!doc.exists) throw new HttpsError('permission-denied', 'This account is not allowed.')
}

async function askClaude({ system, user, maxTokens }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY.value(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  })
  if (!res.ok) throw new HttpsError('unavailable', `AI request failed (${res.status})`)
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// ── Food logging: estimate nutrition for what the user ate ─────────
const NUTRITION_SYSTEM = `You are NutriBot, a friendly nutrition assistant. The user tells you what they ate (often South Indian / Tamil home food).
Respond with a brief friendly message + this exact JSON block:
<nutrition>{"items":[{"food":"name","qty":"amount","cal":number,"protein":number,"carbs":number,"fat":number}],"total":{"cal":number,"protein":number,"carbs":number,"fat":number}}</nutrition>
Keep response short and encouraging. Use 1-2 emojis max.`

exports.nutrition = onCall(OPTS, async (request) => {
  await requireAllowed(request)
  const text = String(request.data?.text || '').slice(0, 1000)
  if (!text) throw new HttpsError('invalid-argument', 'Nothing to log.')
  return { reply: await askClaude({ system: NUTRITION_SYSTEM, user: text, maxTokens: 400 }) }
})

// ── Next-day plan ──────────────────────────────────────────────────
function planSystem(p) {
  return `You are NutriBot's meal planner. Plan tomorrow's meals for one person.

PERSON'S DIET RULES
- Goal: ${p.goal}
- Eating window: ${p.eatingWindow}
- Meal slots: ${p.meals.join('; ')}
- Daily targets: ${Object.entries(p.targets).map(([k, v]) => `${k} ${v}`).join('; ')}
- Rules: ${p.rules.join('; ')}
- Cuisine: ${p.cuisine}

HOW TO PLAN
- Use everyday dishes from that cuisine with realistic home portions (grams, cups, pieces).
- Hit the protein target; keep carbs inside the limit; respect every rule for that weekday.
- Fix today's gaps (e.g. if protein was low today, front-load protein tomorrow).
- Don't repeat today's main dishes.
- Estimate nutrition per item honestly.

Reply with ONE short friendly line, then this exact block and nothing after it:
<plan>{"todayReview":"1-2 sentences on today vs targets","meals":[{"slot":"Breakfast","time":"9:00 AM","items":[{"food":"name","qty":"amount","protein":0,"carbs":0,"cal":0}]}],"totals":{"cal":0,"protein":0,"carbs":0,"fat":0},"tips":["short tip"]}</plan>`
}

function summariseLog(entries) {
  if (!entries.length) return 'Nothing logged today.'
  const lines = entries.flatMap(e => (e.items || []).map(i =>
    `- ${i.food} (${i.qty}): ${i.protein}g protein, ${i.carbs}g carbs, ${i.cal} kcal`))
  const t = entries.reduce((s, e) => ({
    cal: s.cal + (e.total?.cal || 0), protein: s.protein + (e.total?.protein || 0),
    carbs: s.carbs + (e.total?.carbs || 0), fat: s.fat + (e.total?.fat || 0),
  }), { cal: 0, protein: 0, carbs: 0, fat: 0 })
  return `${lines.join('\n')}\nTOTAL: ${t.cal} kcal, ${t.protein}g protein, ${t.carbs}g carbs, ${t.fat}g fat`
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

exports.planTomorrow = onCall(OPTS, async (request) => {
  await requireAllowed(request)
  const { personId, foodDateStr, forDate, todayName, tomorrowName } = request.data || {}
  if (!personId || !DATE_RE.test(foodDateStr || '') || !DATE_RE.test(forDate || '')) {
    throw new HttpsError('invalid-argument', 'Missing person or dates.')
  }

  const snap = await db.collection('food').where('personId', '==', personId).where('dateStr', '==', foodDateStr).get()
  const entries = snap.docs.map(d => d.data())
  const profile = PROFILES[personId] || PROFILES.default

  const text = await askClaude({
    system: planSystem(profile),
    user: `Tomorrow is ${tomorrowName}, ${forDate}.\n\nWhat I ate today (${todayName}):\n${summariseLog(entries)}\n\nPlan tomorrow's meals.`,
    maxTokens: 1500,
  })

  const m = text.match(/<plan>([\s\S]*?)<\/plan>/)
  let plan
  try { plan = JSON.parse(m[1].trim()) } catch { throw new HttpsError('internal', 'Could not read the plan. Try again.') }
  plan.forDate = forDate
  plan.day = tomorrowName

  await db.collection('plans').add({ personId, forDate, createdAt: Timestamp.now(), plan })
  return { plan }
})
