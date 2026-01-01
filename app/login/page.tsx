'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
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
    } else {
      setStatus('success')
      setMessage('logged in')
    }
  }

  // ✅ redirect ONLY after success render
  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => {
        router.replace('/garden')
      }, 500) // small delay avoids hydration issues
      return () => clearTimeout(t)
    }
  }, [status, router])

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
      <p style={{ color: status === 'success' ? 'lime' : 'red' }}>
        {message}
      </p>
    </main>
  )
}
