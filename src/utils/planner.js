// Next-day meal planner (client side). The plan is built by the `planTomorrow`
// Cloud Function, which also saves it to Firestore `plans`.
import { db, planTomorrowFn } from '../firebase.js'
import { collection, query, where, getDocs } from 'firebase/firestore'

// Same date format the food log already uses (keeps queries consistent)
export const todayStr = () => new Date().toISOString().split('T')[0]

// Local calendar dates for plans (what the person thinks of as "today"/"tomorrow")
export function localDateStr(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dayName(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toLocaleDateString('en-IN', { weekday: 'long' })
}

export async function getPlan(personId, forDate) {
  try {
    const q = query(collection(db, 'plans'), where('personId', '==', personId), where('forDate', '==', forDate))
    const snap = await getDocs(q)
    if (snap.empty) return null
    // newest plan wins if it was regenerated
    const plans = snap.docs.map(d => d.data()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    return plans[0].plan
  } catch {
    return null
  }
}

export async function planTomorrow(person) {
  const res = await planTomorrowFn({
    personId: person.id,
    foodDateStr: todayStr(),
    forDate: localDateStr(1),
    todayName: dayName(0),
    tomorrowName: dayName(1),
  })
  return res.data?.plan || null
}
