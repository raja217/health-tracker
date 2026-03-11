import * as XLSX from 'xlsx'

export async function exportToExcel(people, data) {
  const wb = XLSX.utils.book_new()

  // ── DASHBOARD summary sheet ───────────────────────────────
  const summaryRows = [
    ['HealthBot — 3 Person Progress Report', '', '', '', '', ''],
    ['Generated:', new Date().toLocaleString(), '', '', '', ''],
    [],
    ['Name', 'Days Logged', 'Start Weight', 'Current Weight', 'Weight Lost', 'Waist Lost'],
  ]

  for (const p of people) {
    const ws = data[p.id]?.weights || []
    const ms = data[p.id]?.measurements || []
    const startW = ws.length ? ws[0].weight : ''
    const curW   = ws.length ? ws[ws.length-1].weight : ''
    const lostW  = ws.length >= 2 ? +(ws[0].weight - ws[ws.length-1].weight).toFixed(1) : 0
    const startWaist = ms.length ? ms[0].waist : ''
    const curWaist   = ms.length ? ms[ms.length-1].waist : ''
    const lostWaist  = ms.length >= 2 ? +(ms[0].waist - ms[ms.length-1].waist).toFixed(2) : 0
    summaryRows.push([p.name, ws.length, startW, curW, lostW, lostWaist])
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
  wsSummary['!cols'] = [18,20,16,16,14,12].map(w=>({wch:w}))
  XLSX.utils.book_append_sheet(wb, wsSummary, '📊 Summary')

  // ── Per-person weight + measurement sheets ─────────────────
  for (const p of people) {
    const pData = data[p.id] || {}
    const rows = [
      [`${p.name} — Weight & Measurements Log`],
      [],
      ['── DAILY WEIGHT ──'],
      ['Date', 'Weight (lbs)', 'Change'],
    ]

    const weights = pData.weights || []
    weights.forEach((w, i) => {
      const change = i === 0 ? '—' : +(w.weight - weights[i-1].weight).toFixed(1)
      rows.push([w.dateStr, w.weight, change])
    })

    rows.push([], ['── WEEKLY MEASUREMENTS (inches) ──'])
    rows.push(['Date', 'Neck', 'Chest', 'Waist', 'Hips', 'Thighs', 'Arms'])

    const meas = pData.measurements || []
    meas.forEach(m => {
      rows.push([m.dateStr, m.neck, m.chest, m.waist, m.hips, m.thighs, m.arms])
    })

    const wsP = XLSX.utils.aoa_to_sheet(rows)
    wsP['!cols'] = [14,14,10,10,10,10,10,10].map(w=>({wch:w}))
    XLSX.utils.book_append_sheet(wb, wsP, `${p.emoji} ${p.name}`)
  }

  // ── Food Log sheet ─────────────────────────────────────────
  const foodRows = [
    ['🍽️ Food Log — All Members'],
    [],
    ['Date', 'Person', 'Food / Meal', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'],
  ]

  for (const p of people) {
    const food = data[p.id]?.food || []
    food.forEach(entry => {
      if (entry.items?.length) {
        entry.items.forEach(item => {
          foodRows.push([
            entry.dateStr, p.name,
            `${item.food} (${item.qty})`,
            item.cal, item.protein, item.carbs, item.fat
          ])
        })
      } else {
        foodRows.push([entry.dateStr, p.name, entry.rawText, entry.total?.cal||'', entry.total?.protein||'', entry.total?.carbs||'', entry.total?.fat||''])
      }
    })
  }

  const wsFood = XLSX.utils.aoa_to_sheet(foodRows)
  wsFood['!cols'] = [12,12,28,10,12,10,10].map(w=>({wch:w}))
  XLSX.utils.book_append_sheet(wb, wsFood, '🍽️ Food Log')

  // ── Download ───────────────────────────────────────────────
  const dateStr = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `HealthTracker-${dateStr}.xlsx`)
}
