'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function GardenPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login')
      }
    })
  }, [router])

  return (
    <main>
      <h2>Garden</h2>
      <p>You are signed in.</p>
    </main>
  )
}
