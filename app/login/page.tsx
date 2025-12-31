'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return

      if (data.session) {
        router.replace('/garden') // logged in → skip login
      } else {
        setChecking(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [router])

  if (checking) return null // ← THIS STOPS THE FLASH

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.replace('/garden') // replace prevents back/flash
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
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        {error && <p>{error}</p>}
      </form>
    </main>
  )
}
