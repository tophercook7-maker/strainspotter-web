'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('logged in')

    // ✅ HARD NAVIGATION (NO NEXT ROUTER)
    setTimeout(() => {
      window.location.href = '/garden'
    }, 300)
  }

  return (
    <main>
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
      <p style={{ color: 'lime' }}>{message}</p>
    </main>
  )
}
