import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import PersonSelect from './screens/PersonSelect.jsx'
import ChatBot from './screens/ChatBot.jsx'
import Dashboard from './screens/Dashboard.jsx'
import SignIn from './screens/SignIn.jsx'

// ── Customize the 3 names here ──────────────────────────────
// Diet rules for the next-day planner live in functions/profiles.js (server side), keyed by these ids.
export const PEOPLE = [
  { id: 'person1', name: 'Person 1', color: '#E74C3C', light: '#FDEDEC', emoji: '🔴' },
  { id: 'person2', name: 'Person 2', color: '#2980B9', light: '#EBF5FB', emoji: '🔵' },
  { id: 'person3', name: 'Person 3', color: '#27AE60', light: '#EAFAF1', emoji: '🟢' },
]

export default function App() {
  const [authState, setAuthState] = useState({ status: 'checking', email: null })
  const [screen, setScreen] = useState('select')   // 'select' | 'chat' | 'dashboard'
  const [activePerson, setActivePerson] = useState(null)

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) return setAuthState({ status: 'signedOut', email: null })
    setAuthState({ status: 'checking', email: user.email })
    try {
      const ok = (await getDoc(doc(db, 'allowlist', user.email))).exists()
      setAuthState({ status: ok ? 'allowed' : 'notAllowed', email: user.email })
    } catch {
      setAuthState({ status: 'notAllowed', email: user.email })
    }
  }), [])

  if (authState.status !== 'allowed') {
    return <SignIn status={authState.status} email={authState.email} />
  }

  function selectPerson(person) {
    setActivePerson(person)
    setScreen('chat')
  }

  if (screen === 'select') {
    return <PersonSelect people={PEOPLE} onSelect={selectPerson} onDashboard={() => setScreen('dashboard')} />
  }
  if (screen === 'chat') {
    return <ChatBot person={activePerson} onBack={() => setScreen('select')} onDashboard={() => setScreen('dashboard')} />
  }
  if (screen === 'dashboard') {
    return <Dashboard people={PEOPLE} onBack={() => setScreen('select')} />
  }
}
