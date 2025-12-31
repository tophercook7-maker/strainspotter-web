'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function RootGate() {
  const router = useRouter()

  useEffect(() => {
    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return

      if (data.session) {
        router.replace('/garden')
      } else {
        router.replace('/login')
      }
    })

    return () => {
      alive = false
    }
  }, [router])

  return null
}
