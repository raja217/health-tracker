import { useState } from 'react'
import PersonSelect from './screens/PersonSelect.jsx'
import ChatBot from './screens/ChatBot.jsx'
import Dashboard from './screens/Dashboard.jsx'

// ── Customize the 3 names here ──────────────────────────────
export const PEOPLE = [
  { id: 'person1', name: 'Person 1', color: '#E74C3C', light: '#FDEDEC', emoji: '🔴' },
  { id: 'person2', name: 'Person 2', color: '#2980B9', light: '#EBF5FB', emoji: '🔵' },
  { id: 'person3', name: 'Person 3', color: '#27AE60', light: '#EAFAF1', emoji: '🟢' },
]

// ── Paste your Anthropic API key here ───────────────────────
// Get one free at: https://console.anthropic.com
export const ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY'

export default function App() {
  const [screen, setScreen] = useState('select')   // 'select' | 'chat' | 'dashboard'
  const [activePerson, setActivePerson] = useState(null)

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
