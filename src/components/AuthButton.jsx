import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/useAuth'
import AuthModal from './AuthModal'

const circle = {
  width: 44, height: 44, borderRadius: 999, border: 'none', padding: 0,
  background: 'var(--white)', color: 'var(--tomato)', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  fontSize: 18, fontWeight: 800,
}

export default function AuthButton() {
  const { user, loading, signOut } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  if (loading) return <div style={{ width: 44, height: 44 }} />

  if (!user) {
    return (
      <>
        <button onClick={() => setModalOpen(true)} aria-label="Sign in" style={circle}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
        </button>
        {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
      </>
    )
  }

  const avatarUrl = user.user_metadata?.avatar_url
  const initial = (user.email || '?')[0].toUpperCase()

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button onClick={() => setDropdownOpen(o => !o)} aria-label="Account" aria-expanded={dropdownOpen} title={user.email} style={circle}>
        {avatarUrl
          ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initial}
      </button>

      {dropdownOpen && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--white)', color: 'var(--ink)', border: '2px solid var(--line)', borderRadius: 16, padding: '6px 0', boxShadow: '0 10px 28px rgba(26,15,12,0.14)', minWidth: 200, zIndex: 100 }}>
          <p style={{ padding: '10px 16px 8px', fontSize: 13, color: 'var(--muted)', borderBottom: '2px solid var(--line)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.email}
          </p>
          <button onClick={() => { setDropdownOpen(false); signOut() }} style={{ width: '100%', minHeight: 44, padding: '0 16px', background: 'none', border: 'none', fontSize: 15, textAlign: 'left', display: 'block' }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
