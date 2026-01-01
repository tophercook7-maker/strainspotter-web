'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loggedin' | 'error'>('idle')
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

    setStatus('loggedin')
    setMessage('LOGGED IN — NO NAVIGATION')
  }

  if (status === 'loggedin') {
    return (
      <main>
        <h2>Success</h2>
        <p style={{ color: 'lime' }}>{message}</p>
        <p>This page will NOT redirect.</p>
      </main>
    )
  }

  return (
    <main>
      <h2>Sign In</h2>

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

      {status === 'error' && <p style={{ color: 'red' }}>{message}</p>}
    </main>
  )
}
