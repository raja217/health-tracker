import { signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase.js'

const wrap = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 16, padding: 24, background: 'linear-gradient(135deg, #0a0a14 0%, #111126 60%, #0a1628 100%)',
  fontFamily: "'DM Sans', sans-serif", color: '#fff', textAlign: 'center',
}
const btn = {
  background: '#fff', color: '#111', border: 'none', borderRadius: 12, padding: '12px 24px',
  fontSize: 15, fontWeight: 700, cursor: 'pointer',
}

// status: 'signedOut' | 'notAllowed' | 'checking'
export default function SignIn({ status, email }) {
  if (status === 'checking') {
    return <div style={wrap}><div style={{ color: '#888' }}>Loading…</div></div>
  }
  if (status === 'notAllowed') {
    return (
      <div style={wrap}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{email} isn't on the allowed list</div>
        <div style={{ color: '#888', fontSize: 13, maxWidth: 320 }}>
          Ask the app owner to add this email to the Firestore <code>allowlist</code> collection.
        </div>
        <button style={btn} onClick={() => signOut(auth)}>Use another account</button>
      </div>
    )
  }
  return (
    <div style={wrap}>
      <div style={{ fontSize: 48 }}>🥗</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>HealthBot</div>
      <div style={{ color: '#888', fontSize: 14 }}>Sign in to log food and see your plan</div>
      <button style={btn} onClick={() => signInWithPopup(auth, googleProvider).catch(() => {})}>
        Sign in with Google
      </button>
    </div>
  )
}
