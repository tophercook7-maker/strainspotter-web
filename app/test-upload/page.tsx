'use client'

import { useState } from 'react'

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/scan/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      console.log('Upload response:', data)
      setResult(data)
    } catch (error) {
      console.error('Upload error:', error)
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 600, margin: '0 auto' }}>
      <h1>Test Upload</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button type="submit" disabled={!file || loading}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {result && (
        <pre style={{ marginTop: 24, padding: 16, background: '#1a1a1a', borderRadius: 8 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  )
}

