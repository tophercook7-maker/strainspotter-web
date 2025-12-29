'use client';

import { useEffect } from 'react';

export default function ClearAuthPage() {
  useEffect(() => {
    try {
      // Supabase v2 keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });

      sessionStorage.clear();

      // Clear cookies
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/');
      });

      console.log('✅ Supabase auth storage cleared');
    } catch (e) {
      console.error('Auth clear failed', e);
    }

    // Redirect cleanly to login
    window.location.replace('/auth/login');
  }, []);

  return <p>Resetting authentication…</p>;
}

