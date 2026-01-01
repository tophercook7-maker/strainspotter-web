'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()

  const emailRef = useRef('')
  const passwordRef = useRef('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    if (loading) return

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: emailRef.current,
      password: passwordRef.current,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.replace('/garden')
  }

  return (
    <main>
      <h2>Sign In</h2>

      <input
        type="email"
        autoComplete="email"
        placeholder="Email"
        onChange={e => (emailRef.current = e.target.value)}
      />

      <input
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        onChange={e => (passwordRef.current = e.target.value)}
      />

      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      {error && <p>{error}</p>}
    </main>
  )
}
