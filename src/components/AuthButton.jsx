import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { AccountSheet } from './Tables'

const circle = {
  width: 44, height: 44, borderRadius: 999, border: 'none', padding: 0,
  background: 'var(--white)', color: 'var(--tomato)', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  fontSize: 18, fontWeight: 800,
}

// The account button, in the header of every tab. Signed out: opens sign-in. Signed in: opens the
// sheet to switch table and reach settings. With several tables it also names the current one.
export default function AuthButton() {
  const { user, profile, loading, tables, table, openSignIn } = useAuth()
  const [open, setOpen] = useState(false)

  if (loading) return <div style={{ width: 44, height: 44, flexShrink: 0 }} />

  if (!user) {
    return (
      <button onClick={() => openSignIn()} aria-label="Sign in" style={circle}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
      </button>
    )
  }

  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url
  const initial = (profile?.display_name || user.email || '?')[0].toUpperCase()
  const named = tables.length > 1 && table

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={table ? `${table.name}. Tables and account` : 'Tables and account'} style={named
        ? { ...circle, width: 'auto', maxWidth: 150, minWidth: 84, flexShrink: 1, padding: '0 4px 0 12px', gap: 8, color: 'var(--ink)', fontSize: 15 }
        : circle}>
        {named && <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{table.name}</span>}
        <span style={{ ...circle, width: named ? 36 : 44, height: named ? 36 : 44, background: named ? 'var(--tomato)' : 'var(--white)', color: named ? 'var(--white)' : 'var(--tomato)', fontSize: named ? 15 : 18 }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initial}
        </span>
      </button>
      {open && <AccountSheet onClose={() => setOpen(false)} />}
    </>
  )
}
