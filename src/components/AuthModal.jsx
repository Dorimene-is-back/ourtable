import { useState } from 'react'
import { useAuth } from '../lib/auth'

const ACCENT = 'var(--tomato)'
const BORDER = 'var(--line)'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 12.075 17.64 9.767 17.64 9.2z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
)

export default function AuthModal({ onClose, reason }) {
  const { signInWithGoogle, signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleMagicLink(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError(null)
    const { error } = await signInWithMagicLink(email.trim())
    setSending(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26,15,12,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '0 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--white)', color: 'var(--ink)', borderRadius: 20,
          padding: '36px 28px 32px',
          width: '100%', maxWidth: 360,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 8, right: 8, width: 44, height: 44,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--muted)', lineHeight: 1, padding: 4,
          }}
        >
          ×
        </button>

        <p style={{ margin: '0 0 4px', fontSize: 15, color: ACCENT, fontWeight: 800 }}>
          tambouille
        </p>
        <h2 style={{ margin: reason ? '0 0 8px' : '0 0 24px', fontSize: 30, fontWeight: 800, color: 'var(--ink)', letterSpacing: -1 }}>
          Sign in
        </h2>
        {reason && <p style={{ margin: '0 0 20px', fontSize: 16, lineHeight: 1.4, color: 'var(--muted)' }}>{reason}</p>}

        {sent ? (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                        <p style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>
              Check your inbox
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              We sent a magic link to<br /><strong style={{ color: 'var(--ink)' }}>{email}</strong>
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={signInWithGoogle}
              style={{
                width: '100%', minHeight: 48, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: 'white', border: `2px solid ${BORDER}`,
                borderRadius: 16, cursor: 'pointer',
                fontSize: 16, fontWeight: 600, color: 'var(--ink)',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
              <span style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: 0.5 }}>or</span>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
            </div>

            <form onSubmit={handleMagicLink}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6, letterSpacing: 0.3 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%', padding: '11px 14px',
                  border: `2px solid ${BORDER}`, borderRadius: 16,
                  fontSize: 16, color: 'var(--ink)',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = ACCENT }}
                onBlur={e => { e.currentTarget.style.borderColor = BORDER }}
              />

              {error && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: ACCENT }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                style={{
                  width: '100%', minHeight: 48, marginTop: 12, padding: '12px 16px',
                  background: sending ? '#DDD' : ACCENT, border: 'none',
                  borderRadius: 16, cursor: sending ? 'default' : 'pointer',
                  fontSize: 16, fontWeight: 800,
                  color: 'white', transition: 'background 0.15s',
                }}
              >
                {sending ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
