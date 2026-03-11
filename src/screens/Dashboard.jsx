import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase.js'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { exportToExcel } from '../utils/exportExcel.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

function useAllData(people) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = {}
      for (const p of people) {
        const [wSnap, mSnap, fSnap] = await Promise.all([
          getDocs(query(collection(db,'weights'), where('personId','==',p.id), orderBy('date','asc'))),
          getDocs(query(collection(db,'measurements'), where('personId','==',p.id), orderBy('date','asc'))),
          getDocs(query(collection(db,'food'), where('personId','==',p.id), orderBy('date','asc'))),
        ])
        result[p.id] = {
          weights: wSnap.docs.map(d => d.data()),
          measurements: mSnap.docs.map(d => d.data()),
          food: fSnap.docs.map(d => d.data()),
        }
      }
      setData(result)
      setLoading(false)
    }
    load()
  }, [])

  return { data, loading }
}

const chartOpts = (title, unit='') => ({
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { color: '#aaa', font: { size: 11 } } },
    title: { display: false },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    x: { ticks: { color: '#666', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#666', callback: v => v + unit }, grid: { color: 'rgba(255,255,255,0.05)' } }
  }
})

function ChartCard({ title, children, height = 200 }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '16px 18px', marginBottom: 16,
    }}>
      <div style={{ color:'#fff', fontWeight:700, fontSize:14, marginBottom:14 }}>{title}</div>
      <div style={{ height }}>{children}</div>
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}33`,
      borderRadius: 12, padding: '14px 16px', minWidth: 90,
    }}>
      <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: 20, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color:'#555', fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard({ people, onBack }) {
  const { data, loading } = useAllData(people)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    await exportToExcel(people, data)
    setExporting(false)
  }

  // Build chart datasets
  function weightDataset() {
    if (!Object.keys(data).length) return { labels: [], datasets: [] }
    const labels = (data[people[0].id]?.weights || []).map(w => w.dateStr?.slice(5) || '')
    return {
      labels,
      datasets: people.map(p => ({
        label: p.name,
        data: (data[p.id]?.weights || []).map(w => w.weight),
        borderColor: p.color, backgroundColor: p.color + '22',
        tension: 0.35, fill: false, pointRadius: 2, pointHoverRadius: 5,
      }))
    }
  }

  function measDataset(field) {
    if (!Object.keys(data).length) return { labels: [], datasets: [] }
    const labels = (data[people[0].id]?.measurements || []).map(m => m.dateStr?.slice(5) || '')
    return {
      labels,
      datasets: people.map(p => ({
        label: p.name,
        data: (data[p.id]?.measurements || []).map(m => m[field]),
        borderColor: p.color, backgroundColor: p.color + '22',
        tension: 0.35, fill: false, pointRadius: 3, pointHoverRadius: 6,
      }))
    }
  }

  function lostDataset() {
    return {
      labels: people.map(p => p.name),
      datasets: [{
        label: 'Weight Lost (lbs)',
        data: people.map(p => {
          const ws = data[p.id]?.weights || []
          if (ws.length < 2) return 0
          return Math.max(0, +(ws[0].weight - ws[ws.length-1].weight).toFixed(1))
        }),
        backgroundColor: people.map(p => p.color + 'cc'),
        borderColor: people.map(p => p.color),
        borderWidth: 2, borderRadius: 8,
      }]
    }
  }

  function calDataset() {
    // Daily calories last 7 days per person
    const last7 = Array.from({length:7},(_,i)=>{
      const d = new Date(); d.setDate(d.getDate()-6+i)
      return d.toISOString().split('T')[0]
    })
    return {
      labels: last7.map(d=>d.slice(5)),
      datasets: people.map(p => ({
        label: p.name,
        data: last7.map(dateStr => {
          const entries = (data[p.id]?.food||[]).filter(f=>f.dateStr===dateStr)
          return entries.reduce((s,e)=>s+(e.total?.cal||0),0)
        }),
        borderColor: p.color, backgroundColor: p.color+'22',
        tension: 0.3, fill: true, pointRadius: 3,
      }))
    }
  }

  // Leaderboard
  function leaderboard() {
    return people.map(p => {
      const ws = data[p.id]?.weights || []
      const ms = data[p.id]?.measurements || []
      const wLost = ws.length >= 2 ? +(ws[0].weight - ws[ws.length-1].weight).toFixed(1) : 0
      const waistLost = ms.length >= 2 ? +(ms[0].waist - ms[ms.length-1].waist).toFixed(2) : 0
      const curW = ws.length ? ws[ws.length-1].weight : '—'
      const totalDays = ws.length
      return { ...p, wLost, waistLost, curW, totalDays }
    }).sort((a,b) => b.wLost - a.wLost)
  }

  const lb = leaderboard()
  const medals = ['🥇','🥈','🥉']

  return (
    <div style={{
      minHeight:'100vh', background:'linear-gradient(180deg,#0a0a14,#111126)',
      fontFamily:"'DM Sans',sans-serif", paddingBottom:40,
    }}>
      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', padding:'14px 18px',
        background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.07)',
        position:'sticky', top:0, zIndex:10, gap:12,
      }}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#666',fontSize:22,cursor:'pointer'}}>‹</button>
        <div style={{flex:1}}>
          <div style={{color:'#fff',fontWeight:700,fontSize:16}}>📊 Group Dashboard</div>
          <div style={{color:'#555',fontSize:11}}>All 3 members · Live data</div>
        </div>
        <button onClick={handleExport} disabled={exporting||loading} style={{
          background: exporting ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#27ae60,#1e8449)',
          border:'none', borderRadius:10, padding:'9px 16px', color:'#fff',
          fontWeight:700, fontSize:13, cursor: exporting ? 'not-allowed':'pointer',
        }}>
          {exporting ? '⏳' : '📥 Export Excel'}
        </button>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60,color:'#666'}}>Loading data...</div>
      ) : (
        <div style={{padding:'18px 16px', maxWidth:640, margin:'0 auto'}}>

          {/* Leaderboard */}
          <div style={{marginBottom:20}}>
            <div style={{color:'#fff',fontWeight:700,fontSize:15,marginBottom:12}}>🏆 Leaderboard</div>
            {lb.map((p,i)=>(
              <div key={p.id} style={{
                display:'flex', alignItems:'center', gap:12,
                background: i===0 ? 'rgba(240,180,41,0.1)' : 'rgba(255,255,255,0.04)',
                border: i===0 ? '1px solid rgba(240,180,41,0.3)' : '1px solid rgba(255,255,255,0.07)',
                borderRadius:12, padding:'12px 16px', marginBottom:10,
              }}>
                <span style={{fontSize:24}}>{medals[i]}</span>
                <span style={{fontSize:22}}>{p.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{color:p.color,fontWeight:700,fontSize:14}}>{p.name}</div>
                  <div style={{color:'#666',fontSize:12}}>{p.totalDays} days logged</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{color:'#fff',fontWeight:700}}>-{p.wLost} lbs</div>
                  <div style={{color:'#555',fontSize:12}}>-{p.waistLost}" waist</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick stats per person */}
          {people.map(p => {
            const ws = data[p.id]?.weights||[]
            const ms = data[p.id]?.measurements||[]
            const curW = ws.length ? ws[ws.length-1].weight : '—'
            const wLost = ws.length>=2 ? (ws[0].weight-ws[ws.length-1].weight).toFixed(1) : 0
            const curWaist = ms.length ? ms[ms.length-1].waist : '—'
            const todayCal = (data[p.id]?.food||[])
              .filter(f=>f.dateStr===new Date().toISOString().split('T')[0])
              .reduce((s,e)=>s+(e.total?.cal||0),0)
            return (
              <div key={p.id} style={{marginBottom:14}}>
                <div style={{color:p.color,fontWeight:700,fontSize:13,marginBottom:8}}>{p.emoji} {p.name}</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <StatCard label="Current" value={curW} sub="lbs" color={p.color}/>
                  <StatCard label="Lost" value={`-${wLost}`} sub="lbs" color={p.color}/>
                  <StatCard label="Waist" value={curWaist} sub="inches" color={p.color}/>
                  <StatCard label="Today" value={todayCal||'—'} sub="calories" color={p.color}/>
                </div>
              </div>
            )
          })}

          {/* Charts */}
          <ChartCard title="📉 Weight Trend (all members)" height={220}>
            <Line data={weightDataset()} options={chartOpts('Weight','lbs')} />
          </ChartCard>

          <ChartCard title="🏆 Total Weight Lost" height={180}>
            <Bar data={lostDataset()} options={{
              ...chartOpts('Lost','lbs'),
              plugins:{...chartOpts().plugins, legend:{display:false}}
            }} />
          </ChartCard>

          <ChartCard title="📏 Waist Progress" height={200}>
            <Line data={measDataset('waist')} options={chartOpts('Waist','in')} />
          </ChartCard>

          <ChartCard title="🍑 Hips Progress" height={200}>
            <Line data={measDataset('hips')} options={chartOpts('Hips','in')} />
          </ChartCard>

          <ChartCard title="🔥 Daily Calories (last 7 days)" height={200}>
            <Line data={calDataset()} options={chartOpts('Calories','cal')} />
          </ChartCard>

        </div>
      )}
    </div>
  )
}
