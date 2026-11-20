"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const router = useRouter()

  // Modus abfragen: Im Demo-Modus ist der Admin-Bereich deaktiviert
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/auth', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data) return
        if (data.authenticated) router.replace('/admin/appointments')
        else if (data.mode === 'demo' || !data.configured) setIsDemo(true)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        // Die Sitzung liegt als HttpOnly-Cookie vor – im Browser wird nichts gespeichert
        router.push('/admin/appointments')
      } else {
        const data = await response.json().catch(() => null)
        setError(data?.error || 'Anmeldung fehlgeschlagen')
      }
    } catch {
      setError('Fehler beim Anmelden')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center pt-28">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-amber-400 mb-2">ROYAL BARBERSHOP</h1>
            <p className="text-gray-300">Admin Dashboard</p>
          </div>

          {isDemo && (
            <div className="mb-6 rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              Konzept-Demo: Der Admin-Bereich ist in dieser Demo deaktiviert. Im echten Betrieb verwaltet der Salon
              hier alle Termine in Listen- und Kalenderansicht.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-300 mb-2">
                Passwort
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none disabled:opacity-50"
                placeholder="Passwort eingeben"
                disabled={isDemo}
                required
              />
            </div>

            {error && (
              <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isDemo}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">Nur für autorisierte Personen</p>
          </div>
        </div>
      </div>
    </main>
  )
}
