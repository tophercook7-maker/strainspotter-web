'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()

  // 🔒 useRef so values survive remounts
  const emailRef = useRef('')
  const passwordRef = useRef('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
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

      <form onSubmit={handleLogin}>
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Email"
          defaultValue=""
          onChange={e => (emailRef.current = e.target.value)}
          required
        />

        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          defaultValue=""
          onChange={e => (passwordRef.current = e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        {error && <p>{error}</p>}
      </form>
    </main>
  )
}
