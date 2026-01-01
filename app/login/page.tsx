'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMsg(error.message)
      return
    }

    setMsg('logged in')

    // HARD NAV AFTER AUTH (SAFE)
    setTimeout(() => {
      location.assign('/garden')
    }, 200)
  }

  return (
    <main>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <input value={password} onChange={e => setPassword(e.target.value)} type="password" />
      <button onClick={login}>Sign In</button>
      <p style={{ color: 'lime' }}>{msg}</p>
    </main>
  )
}
