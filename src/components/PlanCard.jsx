// Renders a meal plan produced by utils/planner.js
export default function PlanCard({ plan, color = '#1a7a5e', title }) {
  if (!plan?.meals) return null
  const t = plan.totals || {}
  return (
    <div style={{
      marginTop: 8, borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${color}55`, background: 'rgba(255,255,255,0.04)',
    }}>
      <div style={{ background: color, padding: '8px 14px', color: '#fff', fontWeight: 700, fontSize: 13 }}>
        📋 {title || `Plan for ${plan.day || ''} ${plan.forDate || ''}`}
      </div>

      {plan.todayReview && (
        <div style={{ padding: '10px 14px', color: '#ccc', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {plan.todayReview}
        </div>
      )}

      {plan.meals.map((meal, i) => (
        <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: 13, fontWeight: 700 }}>
            <span>{meal.slot}</span><span style={{ color: '#888', fontWeight: 400 }}>{meal.time}</span>
          </div>
          {(meal.items || []).map((it, j) => (
            <div key={j} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: '#bbb', fontSize: 12, marginTop: 4 }}>
              <span>• {it.food} <span style={{ color: '#777' }}>({it.qty})</span></span>
              <span style={{ color: '#7fffd4', whiteSpace: 'nowrap' }}>{it.protein}g P · {it.carbs}g C</span>
            </div>
          ))}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 16, padding: '10px 14px', flexWrap: 'wrap', fontSize: 12, color: '#7fffd4' }}>
        <span>🔥 {t.cal} kcal</span><span>💪 {t.protein}g protein</span><span>🍞 {t.carbs}g carbs</span><span>🧈 {t.fat}g fat</span>
      </div>

      {plan.tips?.length > 0 && (
        <div style={{ padding: '0 14px 12px', color: '#aaa', fontSize: 12 }}>
          {plan.tips.map((tip, i) => <div key={i}>💡 {tip}</div>)}
        </div>
      )}
    </div>
  )
}
