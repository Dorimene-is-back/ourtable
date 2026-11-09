import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/useAuth'
import AuthModal from './AuthModal'

const ACCENT = '#C4956A'
const BORDER = '#EEE8DE'

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

  if (loading) return null

  if (!user) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: 'none', border: `1.5px solid ${BORDER}`,
            borderRadius: 20, padding: '6px 14px',
            fontFamily: 'sans-serif', fontSize: 13, fontWeight: 500,
            color: ACCENT, cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FDF6EC' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
        >
          Sign in
        </button>
        {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
      </>
    )
  }

  const avatarUrl = user.user_metadata?.avatar_url
  const initials = (user.email || '?')[0].toUpperCase()

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setDropdownOpen(o => !o)}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: avatarUrl ? 'transparent' : ACCENT,
          border: `2px solid ${BORDER}`,
          padding: 0, cursor: 'pointer', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
        title={user.email}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontFamily: 'sans-serif', fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1 }}>
            {initials}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'white', border: `1px solid ${BORDER}`,
          borderRadius: 12, padding: '6px 0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          minWidth: 180, zIndex: 100,
        }}>
          <p style={{
            margin: 0, padding: '10px 16px 8px',
            fontFamily: 'sans-serif', fontSize: 12, color: '#AAA',
            borderBottom: `1px solid ${BORDER}`,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {user.email}
          </p>
          <button
            onClick={() => { setDropdownOpen(false); signOut() }}
            style={{
              width: '100%', padding: '10px 16px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'sans-serif', fontSize: 13, color: '#555',
              textAlign: 'left', display: 'block',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FDF6EC' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
