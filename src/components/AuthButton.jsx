import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const circle = {
  width: 44, height: 44, borderRadius: 999, border: 'none', padding: 0,
  background: 'var(--white)', color: 'var(--tomato)', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  fontSize: 18, fontWeight: 800,
}

// Signed out: opens the sign-in sheet. Signed in: goes to the kitchen page (people, invites, sign out).
export default function AuthButton() {
  const { user, profile, loading, openSignIn } = useAuth()

  if (loading) return <div style={{ width: 44, height: 44 }} />

  if (!user) {
    return (
      <button onClick={() => openSignIn()} aria-label="Sign in" style={circle}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
      </button>
    )
  }

  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url
  const initial = (profile?.display_name || user.email || '?')[0].toUpperCase()

  return (
    <Link to="/kitchen" aria-label="My kitchen" style={circle}>
      {avatarUrl
        ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initial}
    </Link>
  )
}
