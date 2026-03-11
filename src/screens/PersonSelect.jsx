import { useState, useEffect } from 'react'
import { db } from '../firebase.js'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'

const S = {
  page: {
    minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a14 0%, #111126 60%, #0a1628 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '24px', fontFamily: "'DM Sans', sans-serif",
  },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 },
  sub: { color: '#666', fontSize: 14, marginBottom: 40, textAlign: 'center' },
  grid: { display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 360 },
  card: (color) => ({
    background: 'rgba(255,255,255,0.04)', border: `1.5px solid ${color}44`,
    borderRadius: 16, padding: '20px 24px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 16,
    transition: 'all 0.2s', backdropFilter: 'blur(10px)',
  }),
  cardEmoji: { fontSize: 32 },
  cardInfo: { flex: 1 },
  cardName: (color) => ({ color, fontSize: 18, fontWeight: 700, marginBottom: 2 }),
  cardStat: { color: '#666', fontSize: 12 },
  dashBtn: {
    marginTop: 32, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#aaa', borderRadius: 12, padding: '12px 28px', cursor: 'pointer',
    fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
  }
}

export default function PersonSelect({ people, onSelect, onDashboard }) {
  const [stats, setStats] = useState({})
  const [hover, setHover] = useState(null)

  useEffect(() => {
    people.forEach(async (p) => {
      try {
        const q = query(collection(db, 'weights'), where('personId', '==', p.id), orderBy('date', 'desc'), limit(1))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const latest = snap.docs[0].data()
          setStats(prev => ({ ...prev, [p.id]: `${latest.weight} lbs` }))
        }
      } catch {}
    })
  }, [])

  return (
    <div style={S.page}>
      <div style={S.logo}>💪</div>
      <h1 style={S.title}>HealthBot</h1>
      <p style={S.sub}>3-Person Transformation Tracker<br />Who are you?</p>

      <div style={S.grid}>
        {people.map(p => (
          <div
            key={p.id}
            style={{
              ...S.card(p.color),
              transform: hover === p.id ? 'scale(1.02)' : 'scale(1)',
              borderColor: hover === p.id ? p.color : `${p.color}44`,
              background: hover === p.id ? `${p.color}18` : 'rgba(255,255,255,0.04)',
            }}
            onClick={() => onSelect(p)}
            onMouseEnter={() => setHover(p.id)}
            onMouseLeave={() => setHover(null)}
          >
            <span style={S.cardEmoji}>{p.emoji}</span>
            <div style={S.cardInfo}>
              <div style={S.cardName(p.color)}>{p.name}</div>
              <div style={S.cardStat}>
                {stats[p.id] ? `Last logged: ${stats[p.id]}` : 'Tap to start logging'}
              </div>
            </div>
            <span style={{ color: p.color, fontSize: 20 }}>›</span>
          </div>
        ))}
      </div>

      <button style={S.dashBtn} onClick={onDashboard}>
        📊 View Group Dashboard
      </button>
    </div>
  )
}
