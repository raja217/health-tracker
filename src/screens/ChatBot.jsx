import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase.js'
import { collection, addDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'
import { nutritionFn } from '../firebase.js'
import PlanCard from '../components/PlanCard.jsx'
import { planTomorrow, getPlan, localDateStr } from '../utils/planner.js'

const PLAN_REGEX = /\b(plan|suggest|menu|eat)\b.*\b(tomorrow|next day|naalai)\b|\b(tomorrow|next day|naalai)\b.*\b(plan|menu|eat)\b/i

const today = () => new Date().toISOString().split('T')[0]
const todayDay = () => new Date().getDay() // 0=Sun,1=Mon...

// ── Chat states ──────────────────────────────────────────────
const STATE = {
  GREETING: 'greeting',
  ASK_WEIGHT: 'ask_weight',
  ASK_NECK: 'ask_neck',
  ASK_CHEST: 'ask_chest',
  ASK_WAIST: 'ask_waist',
  ASK_HIPS: 'ask_hips',
  ASK_THIGHS: 'ask_thighs',
  ASK_ARMS: 'ask_arms',
  FOOD_MODE: 'food_mode',
  DONE: 'done',
}

const MEAS_FLOW = [STATE.ASK_NECK, STATE.ASK_CHEST, STATE.ASK_WAIST, STATE.ASK_HIPS, STATE.ASK_THIGHS, STATE.ASK_ARMS]
const MEAS_LABELS = { ask_neck:'Neck', ask_chest:'Chest', ask_waist:'Waist', ask_hips:'Hips', ask_thighs:'Thighs', ask_arms:'Arms' }
const MEAS_FIELDS = { ask_neck:'neck', ask_chest:'chest', ask_waist:'waist', ask_hips:'hips', ask_thighs:'thighs', ask_arms:'arms' }

async function callAI(userText) {
  try {
    const res = await nutritionFn({ text: userText })
    return res.data?.reply || null
  } catch {
    return null
  }
}

function parseNutrition(text) {
  const m = text?.match(/<nutrition>([\s\S]*?)<\/nutrition>/)
  if (!m) return null
  try { return JSON.parse(m[1].trim()) } catch { return null }
}

function cleanText(text) {
  return text?.replace(/<nutrition>[\s\S]*?<\/nutrition>/g, '').trim()
}

function NutritionPill({ data }) {
  if (!data?.total) return null
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0d4f3c, #1a7a5e)',
      borderRadius: 10, padding: '10px 14px', marginTop: 8,
      display: 'flex', gap: 16, flexWrap: 'wrap',
    }}>
      {[
        ['🔥', data.total.cal, 'cal'],
        ['💪', data.total.protein + 'g', 'protein'],
        ['🍞', data.total.carbs + 'g', 'carbs'],
        ['🧈', data.total.fat + 'g', 'fat'],
      ].map(([icon, val, lbl]) => (
        <div key={lbl} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#7fffd4' }}>{icon} {val}</div>
          <div style={{ fontSize: 10, color: '#aaa' }}>{lbl}</div>
        </div>
      ))}
    </div>
  )
}

function Msg({ m, personColor }) {
  const isUser = m.role === 'user'
  const nutrition = !isUser ? parseNutrition(m.content) : null
  const text = !isUser ? cleanText(m.content) : m.content
  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: 8, marginBottom: 14, alignItems: 'flex-end' }}>
      {!isUser && (
        <div style={{ width:32,height:32,borderRadius:'50%',background:'#1a1a3e',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>🤖</div>
      )}
      <div style={{ maxWidth: '78%' }}>
        <div style={{
          background: isUser ? personColor : 'rgba(255,255,255,0.08)',
          color: '#fff', borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          padding: '11px 15px', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap',
        }}>
          {text}
        </div>
        {nutrition && <NutritionPill data={nutrition} />}
        {m.plan && <PlanCard plan={m.plan} color={personColor} title={m.planTitle} />}
      </div>
    </div>
  )
}

export default function ChatBot({ person, onBack, onDashboard }) {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [chatState, setChatState] = useState(STATE.GREETING)
  const [measData, setMeasData] = useState({})
  const [foodLog, setFoodLog] = useState([])
  const [loading, setLoading] = useState(false)
  const [needsMeas, setNeedsMeas] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, loading])

  // ── Init: check what needs to be logged ────────────────────
  useEffect(() => { initChat() }, [])

  async function initChat() {
    const weightToday = await checkWeightToday()
    const measThisWeek = await checkMeasThisWeek()
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    let firstMsg = `${greeting}, **${person.name}**! 👋\n\n`

    if (!weightToday) {
      firstMsg += `Let's start your daily check-in.\n\n⚖️ **What's your weight today?** (in lbs)`
      addBot(firstMsg)
      setChatState(STATE.ASK_WEIGHT)
    } else if (!measThisWeek) {
      setNeedsMeas(true)
      firstMsg += `Weight already logged ✅\n\nTime for your **weekly measurements!** 📏\n\n📐 **Neck measurement?** (inches)`
      addBot(firstMsg)
      setChatState(STATE.ASK_NECK)
    } else {
      firstMsg += `Weight ✅  Measurements ✅\n\nAll caught up! 🎉\n\n🍽️ Tell me what you've eaten and I'll track it for you!`
      addBot(firstMsg)
      setChatState(STATE.FOOD_MODE)
    }

    // Show today's plan if one was made yesterday
    const todaysPlan = await getPlan(person.id, localDateStr(0))
    if (todaysPlan) {
      setMsgs(prev => [...prev, { role: 'bot', content: "📋 Here's the plan you made for today:", plan: todaysPlan, planTitle: "Today's plan" }])
    }
  }

  // ── Next-day plan ─────────────────────────────────────────
  async function runPlan() {
    if (loading) return
    setLoading(true)
    try {
      const plan = await planTomorrow(person)
      if (plan) {
        setMsgs(prev => [...prev, { role: 'bot', content: "🗓️ Here's tomorrow's plan, built around what you ate today. It'll be waiting here tomorrow morning.", plan }])
      } else {
        addBot("Couldn't build a plan right now. Try again in a minute.")
      }
    } catch {
      addBot("Couldn't reach the AI to build the plan. Try again in a minute.")
    }
    setLoading(false)
  }

  async function checkWeightToday() {
    try {
      const start = new Date(); start.setHours(0,0,0,0)
      const q = query(collection(db,'weights'), where('personId','==',person.id), where('date','>=',Timestamp.fromDate(start)))
      const snap = await getDocs(q)
      return !snap.empty
    } catch { return false }
  }

  async function checkMeasThisWeek() {
    try {
      const d = new Date(); d.setDate(d.getDate()-7)
      const q = query(collection(db,'measurements'), where('personId','==',person.id), where('date','>=',Timestamp.fromDate(d)))
      const snap = await getDocs(q)
      return !snap.empty
    } catch { return false }
  }

  function addBot(text, nutrition = null) {
    setMsgs(prev => [...prev, { role: 'bot', content: text, nutrition }])
  }
  function addUser(text) {
    setMsgs(prev => [...prev, { role: 'user', content: text }])
  }

  // ── Handle user input ──────────────────────────────────────
  async function handleSend() {
    const val = input.trim()
    if (!val || loading) return
    setInput('')
    addUser(val)

    // "plan tomorrow" works from any step of the chat
    if (PLAN_REGEX.test(val)) {
      await runPlan()
      return
    }

    // Weight logging
    if (chatState === STATE.ASK_WEIGHT) {
      const w = parseFloat(val)
      if (isNaN(w) || w < 50 || w > 500) {
        addBot("Hmm, that doesn't look right. Please enter your weight in lbs (e.g. 165.5)")
        return
      }
      await addDoc(collection(db,'weights'), { personId: person.id, weight: w, date: Timestamp.now(), dateStr: today() })
      const measDue = !(await checkMeasThisWeek())
      if (measDue) {
        addBot(`✅ **${w} lbs** logged!\n\nTime for your weekly measurements too 📏\n\n📐 **Neck?** (inches)`)
        setChatState(STATE.ASK_NECK)
      } else {
        addBot(`✅ **${w} lbs** logged! Keep it up 💪\n\n🍽️ Now, what have you eaten today?`)
        setChatState(STATE.FOOD_MODE)
      }
      return
    }

    // Measurement logging
    if (MEAS_FLOW.includes(chatState)) {
      const v = parseFloat(val)
      if (isNaN(v) || v < 5 || v > 80) {
        addBot(`Please enter a valid measurement in inches (e.g. 32.5) for ${MEAS_LABELS[chatState]}`)
        return
      }
      const field = MEAS_FIELDS[chatState]
      const newMeas = { ...measData, [field]: v }
      setMeasData(newMeas)

      const idx = MEAS_FLOW.indexOf(chatState)
      if (idx < MEAS_FLOW.length - 1) {
        const next = MEAS_FLOW[idx + 1]
        const nextLabel = MEAS_LABELS[next]
        addBot(`Got it! **${MEAS_LABELS[chatState]}: ${v}"** ✅\n\n📐 **${nextLabel}?** (inches)`)
        setChatState(next)
      } else {
        // Last measurement - save all
        await addDoc(collection(db,'measurements'), {
          personId: person.id, date: Timestamp.now(), dateStr: today(),
          ...newMeas, arms: v
        })
        addBot(`🎉 All measurements saved!\n\n${Object.entries({...newMeas, arms:v}).map(([k,val]) => `  • ${k.charAt(0).toUpperCase()+k.slice(1)}: ${val}"`).join('\n')}\n\n🍽️ Now tell me what you've eaten!`)
        setChatState(STATE.FOOD_MODE)
      }
      return
    }

    // Food logging via AI
    if (chatState === STATE.FOOD_MODE) {
      setLoading(true)
      const aiReply = await callAI(val)
      setLoading(false)

      if (!aiReply) {
        addBot("Sorry, couldn't reach the AI. Your food is saved manually. Try: '1 cup rice, 150g chicken'")
        return
      }

      const nutrition = parseNutrition(aiReply)
      const display = cleanText(aiReply)

      setMsgs(prev => [...prev, { role: 'bot', content: display, nutrition }])

      if (nutrition) {
        const entry = {
          personId: person.id, date: Timestamp.now(), dateStr: today(),
          rawText: val, items: nutrition.items || [], total: nutrition.total
        }
        await addDoc(collection(db,'food'), entry)
        setFoodLog(prev => [...prev, entry])
      }
    }
  }

  // ── Daily calories summary ────────────────────────────────
  const totalCal = foodLog.reduce((s,e) => s + (e.total?.cal || 0), 0)
  const totalPro = foodLog.reduce((s,e) => s + (e.total?.protein || 0), 0)

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #0a0a14 0%, #111126 100%)',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '14px 18px',
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)',
        gap: 12, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#666', fontSize: 22, cursor: 'pointer' }}>‹</button>
        <div style={{ width:38,height:38,borderRadius:'50%',background:person.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>
          {person.emoji}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ color:'#fff', fontWeight:700, fontSize:15 }}>{person.name}</div>
          <div style={{ color:'#555', fontSize:11 }}>HealthBot · {today()}</div>
        </div>
        {foodLog.length > 0 && (
          <div style={{ textAlign:'right' }}>
            <div style={{ color: person.color, fontWeight:700, fontSize:14 }}>🔥 {totalCal} cal</div>
            <div style={{ color:'#555', fontSize:11 }}>💪 {totalPro}g protein</div>
          </div>
        )}
        <button onClick={onDashboard} style={{
          background: 'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
          color:'#aaa', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12
        }}>📊</button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'18px 16px' }}>
        {msgs.map((m, i) => <Msg key={i} m={m} personColor={person.color} />)}
        {loading && (
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:14 }}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'#1a1a3e',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🤖</div>
            <div style={{background:'rgba(255,255,255,0.08)',borderRadius:'4px 18px 18px 18px',padding:'12px 16px',display:'flex',gap:5,alignItems:'center'}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{width:7,height:7,borderRadius:'50%',background:person.color,animation:`pulse 1.2s ease ${i*0.2}s infinite`,opacity:0.8}}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 14px', background:'rgba(255,255,255,0.03)',
        borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0,
      }}>
        {chatState === STATE.FOOD_MODE && (
          <div style={{ display:'flex', gap:8, marginBottom:10, overflowX:'auto', paddingBottom:2 }}>
            <button onClick={runPlan} disabled={loading}
              style={{background:person.color,border:'none',color:'#fff',fontWeight:700,
              borderRadius:20,padding:'5px 12px',cursor:'pointer',fontSize:12,whiteSpace:'nowrap',flexShrink:0}}>
              📋 Plan tomorrow
            </button>
            {['🥚 2 eggs + 1 dosa + sambar','🍛 100g rice + kootu + sambar','🐟 Fish curry 150g','🥛 Buttermilk + 20 almonds'].map(q=>(
              <button key={q} onClick={()=>setInput(q)}
                style={{background:'rgba(255,255,255,0.05)',border:`1px solid ${person.color}44`,color:'#bbb',
                borderRadius:20,padding:'5px 12px',cursor:'pointer',fontSize:12,whiteSpace:'nowrap',flexShrink:0}}>
                {q}
              </button>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:10 }}>
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleSend()}
            placeholder={
              chatState===STATE.ASK_WEIGHT ? 'Enter weight in lbs (e.g. 165.5)' :
              MEAS_FLOW.includes(chatState) ? `Enter ${MEAS_LABELS[chatState]} in inches...` :
              'What did you eat? Describe your meal...'
            }
            style={{
              flex:1, background:'rgba(255,255,255,0.07)', border:`1.5px solid ${person.color}55`,
              borderRadius:12, padding:'13px 16px', color:'#fff', fontSize:14, outline:'none',
              fontFamily:"'DM Sans', sans-serif",
            }}
          />
          <button onClick={handleSend} disabled={loading||!input.trim()} style={{
            background: loading||!input.trim() ? 'rgba(255,255,255,0.05)' : person.color,
            border:'none', borderRadius:12, padding:'13px 20px', color:'#fff',
            fontWeight:700, fontSize:14, cursor: loading||!input.trim() ? 'not-allowed' : 'pointer',
            transition:'all 0.2s',
          }}>
            {loading ? '...' : '→'}
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  )
}
