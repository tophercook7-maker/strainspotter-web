'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    setStatus('success')
    setMessage('logged in')
  }

  // ✅ ONLY NAVIGATE AFTER SUCCESS IS VISIBLE
  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => {
        window.location.pathname = '/garden'
      }, 500)
      return () => clearTimeout(t)
    }
  }, [status])

  return (
    <main>
      <h2>Login</h2>

      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="email"
      />

      <input
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="password"
        type="password"
      />

      <button onClick={login}>Sign In</button>

      {status === 'success' && (
        <p style={{ color: 'lime' }}>{message}</p>
      )}

      {status === 'error' && (
        <p style={{ color: 'red' }}>{message}</p>
      )}
    </main>
  )
}
