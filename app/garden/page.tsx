'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function GardenPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return

      if (!data.session) {
        router.replace('/login') // replace = no flash
      } else {
        setChecking(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [router])

  if (checking) return null // ← THIS STOPS THE FLASH

  return (
    <main>
      <h2>Garden</h2>
      <p>You are signed in.</p>
    </main>
  )
}
