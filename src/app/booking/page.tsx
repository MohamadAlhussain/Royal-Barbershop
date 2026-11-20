"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'
import { SERVICES } from '@/lib/services'
import { validateEmail, validateName, validateNotes } from '@/lib/validation'
import Footer from '../components/Footer'

export default function Booking() {
  const router = useRouter()

  const timeSlots = useMemo(() => [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30"
  ], [])

  // Modus und belegte Slots vom Server laden. Im Demo-Modus (Standard) liefert die
  // API keine Termine und nimmt keine Buchungen an.
  const [bookingMode, setBookingMode] = useState<'demo' | 'live' | null>(null)
  const [appointments, setAppointments] = useState<Array<{ date: string; time: string; status?: string }>>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/appointments', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data) return
        setBookingMode(data.mode === 'live' ? 'live' : 'demo')
        setAppointments(Array.isArray(data.taken) ? data.taken : [])
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])
  const isDemo = bookingMode === 'demo'

  // No need for month selection - using rolling 30-day window

  // Helper function to check if a date has available slots (defined early since weekdays depends on it)
  const hasAvailableSlotsForDate = useMemo(() => {
    return (dateStr: string) => {
      const now = new Date()
      const berlinTime = new Date(now.toLocaleString("sv-SE", {timeZone: "Europe/Berlin"}))
      const today = berlinTime.toISOString().split('T')[0]
      
      // Get taken appointments for this date
      const takenForDate = new Set<string>()
      for (const a of appointments) {
        if (a.date === dateStr && a.status !== 'cancelled') {
          takenForDate.add(a.time)
        }
      }
      
      if (dateStr === today) {
        // For today, check if there are slots after current time
        const currentHour = berlinTime.getHours()
        const currentMinute = berlinTime.getMinutes()
        const currentTime = currentHour * 60 + currentMinute
        const nextAvailableSlot = Math.ceil(currentTime / 30) * 30
        
        return timeSlots.some(time => {
          const [hour, minute] = time.split(':').map(Number)
          const slotTime = hour * 60 + minute
          return slotTime >= nextAvailableSlot && !takenForDate.has(time)
        })
      } else if (dateStr > today) {
        // For future dates, check if there are any free slots
        return timeSlots.some(time => !takenForDate.has(time))
      } else {
        // Past dates have no available slots
        return false
      }
    }
  }, [appointments, timeSlots])

  // Generate rolling 30-day window starting from today
  const weekdays = useMemo(() => {
    const days: { day: string; date: string; available: boolean }[] = []
    
    // Get current time in Berlin timezone
    const now = new Date()
    const berlinTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Berlin"}))
    const currentHour = berlinTime.getHours()
    const currentMinute = berlinTime.getMinutes()
    const currentTime = currentHour * 60 + currentMinute // Convert to minutes for easier comparison
    
    // Barbershop closes at 19:00 (19 * 60 = 1140 minutes)
    const closingTime = 19 * 60 // 19:00 in minutes
    
    // Get today's date string in Berlin timezone (YYYY-MM-DD format)
    const todayStr = `${berlinTime.getFullYear()}-${String(berlinTime.getMonth() + 1).padStart(2, '0')}-${String(berlinTime.getDate()).padStart(2, '0')}`
    
    // Generate next 30 days starting from today
    for (let i = 0; i < 30; i++) {
      const date = new Date(berlinTime)
      date.setDate(berlinTime.getDate() + i)
      
      const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
      const dayName = dayNames[date.getDay()]
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      
      // Check if date is today
      const isToday = dateStr === todayStr
      
      // Check if date is in the past (before today)
      const isPastDate = dateStr < todayStr
      
      // If it's today, check if we're past closing time
      const isPastClosingTime = isToday && currentTime >= closingTime
      
      // Check if this date has any available time slots
      const hasAvailableSlots = hasAvailableSlotsForDate(dateStr)
      
      // Sunday is not available, past dates are not available, today after closing time is not available, and days without available slots are not available
      const available = date.getDay() !== 0 && !isPastDate && !isPastClosingTime && hasAvailableSlots
      
      days.push({
        day: dayName,
        date: dateStr,
        available
      })
    }
    
    return days
  }, [hasAvailableSlotsForDate])

  // Local UI state for a simple frontend-only booking flow
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null)
  // Ohne eigene Auswahl gelten der erste freie Tag und die erste freie Uhrzeit
  const [pickedDate, setSelectedDate] = useState<string>('')
  const [pickedTime, setSelectedTime] = useState<string>('')
  const firstAvailableDate = useMemo(() => weekdays.find(day => day.available)?.date ?? '', [weekdays])
  const selectedDate = pickedDate || firstAvailableDate
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLoader, setShowLoader] = useState(false)

  const selectedService = SERVICES.find(s => s.id === selectedServiceId) || null

  const takenTimesForSelection = useMemo(() => {
    if (!selectedDate) return new Set<string>()
    const set = new Set<string>()
    
    // Add taken appointments
    for (const a of appointments) {
      if (a.date === selectedDate && a.status !== 'cancelled') {
        set.add(a.time)
      }
    }
    
    // If selected date is today, also disable past time slots
    const now = new Date()
    const berlinTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Berlin"}))
    const today = `${berlinTime.getFullYear()}-${String(berlinTime.getMonth() + 1).padStart(2, '0')}-${String(berlinTime.getDate()).padStart(2, '0')}`

    if (selectedDate === today) {
      const currentHour = berlinTime.getHours()
      const currentMinute = berlinTime.getMinutes()
      const currentTime = currentHour * 60 + currentMinute
      
      // Find the next available time slot (round up to next 30-minute slot)
      const nextAvailableSlot = Math.ceil(currentTime / 30) * 30
      
      // Disable time slots that are in the past or current slot
      timeSlots.forEach(time => {
        const [hour, minute] = time.split(':').map(Number)
        const slotTime = hour * 60 + minute
        
        // If time slot is in the past or current slot, add it to disabled set
        if (slotTime < nextAvailableSlot) {
          set.add(time)
        }
      })
    }
    
    return set
  }, [appointments, selectedDate, timeSlots])

  const firstFreeTime = useMemo(() => timeSlots.find(time => !takenTimesForSelection.has(time)) ?? "", [timeSlots, takenTimesForSelection])
  const selectedTime = pickedTime || firstFreeTime

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus(null)
    setIsSubmitting(true)

    // Enhanced validation
    const nameValidation = validateName(name)
    if (!nameValidation.isValid) {
      setStatus({ type: 'error', message: nameValidation.error! })
      setIsSubmitting(false)
      return
    }

    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      setStatus({ type: 'error', message: emailValidation.error! })
      setIsSubmitting(false)
      return
    }

    const notesValidation = validateNotes(notes)
    if (!notesValidation.isValid) {
      setStatus({ type: 'error', message: notesValidation.error! })
      setIsSubmitting(false)
      return
    }

    if (!selectedService) {
      setStatus({ type: 'error', message: 'Bitte wählen Sie einen Service aus.' })
      setIsSubmitting(false)
      return
    }
    if (!selectedDate || !selectedTime) {
      setStatus({ type: 'error', message: 'Bitte wählen Sie Datum und Uhrzeit aus.' })
      setIsSubmitting(false)
      return
    }

    if (bookingMode === null) {
      // Modus noch unbekannt (Server nicht erreichbar) – lieber nichts vortäuschen
      setStatus({ type: 'error', message: 'Die Terminbuchung ist gerade nicht erreichbar. Bitte versuchen Sie es gleich erneut.' })
      setIsSubmitting(false)
      return
    }

    setShowLoader(true)
    const params = new URLSearchParams({
      service: selectedService.name,
      date: selectedDate,
      time: selectedTime,
      duration: String(selectedService.duration),
      price: selectedService.price
    })

    if (isDemo) {
      // Konzept-Demo: Es wird nichts gespeichert oder versendet. Die Eingaben
      // verlassen den Browser nicht; nur die Auswahl wird an die Bestätigungsseite übergeben.
      setIsSubmitting(false)
      router.push(`/booking/thank-you?${params.toString()}`)
      return
    }

    // Echter Betrieb: Termin über die API speichern (Name/E-Mail gehen nur an den Server, nie in die URL)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameValidation.sanitizedValue,
          email: emailValidation.sanitizedValue,
          service: { id: selectedService.id, name: selectedService.name },
          date: selectedDate,
          time: selectedTime,
          notes: notesValidation.sanitizedValue,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const details = Array.isArray(data?.details) ? ` ${data.details.join(' ')}` : ''
        setStatus({ type: 'error', message: (data?.error || 'Die Buchung ist fehlgeschlagen.') + details })
        if (res.status === 409) {
          setAppointments(prev => [...prev, { date: selectedDate, time: selectedTime }])
          setSelectedTime('')
        }
        setShowLoader(false)
        setIsSubmitting(false)
        return
      }
      const booked = data?.appointment
      if (booked?.service?.price) params.set('price', booked.service.price)
      if (booked?.service?.duration) params.set('duration', String(booked.service.duration))
      params.set('confirmed', '1')
      setIsSubmitting(false)
      router.push(`/booking/thank-you?${params.toString()}`)
    } catch {
      setStatus({ type: 'error', message: 'Verbindungsfehler. Bitte versuchen Sie es erneut.' })
      setShowLoader(false)
      setIsSubmitting(false)
    }
  }

  // Loader component
  if (showLoader) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner size="lg" color="amber" />
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Termin wird gebucht...</h2>
              <p className="text-sm sm:text-base text-gray-400">Bitte warten Sie einen Moment</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <section className="pt-32 pb-8 px-4 bg-gradient-to-b from-gray-900 to-black">
        <div className="container-max text-center">
          <h1 className="heading-primary mb-4 fade-in">
            Termin Buchen
          </h1>
          <p className="text-body text-gray-300 max-w-2xl mx-auto fade-in-delay-1">
            Einfach, schnell und bequem - Ihr Termin in wenigen Klicks
          </p>
          {isDemo && (
            <p className="mt-4 max-w-2xl mx-auto rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Konzept-Demo: Probieren Sie den Ablauf gern aus. Es wird kein Termin gebucht, und Ihre Eingaben werden
              weder gespeichert noch versendet.
            </p>
          )}
        </div>
      </section>

      {/* Booking Form */}
      <section className="section-padding bg-black">
        <div className="max-w-4xl mx-auto fade-in">
          <div className="card p-4 md:p-8 fade-in-delay-1">
            
            <form className="space-y-6 md:space-y-8" onSubmit={handleSubmit}>
              {/* Personal Information */}
              <div>
                <h2 className="heading-secondary mb-6">Persönliche Daten</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
                      placeholder="Ihr vollständiger Name"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      E-Mail *
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
                      placeholder="ihre@email.de"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Service Selection */}
              <div>
                <h2 className="heading-secondary mb-6">Service auswählen</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SERVICES.map((service) => (
                    <button
                      type="button"
                      key={service.id}
                      aria-pressed={selectedServiceId === service.id}
                      className={`w-full text-left bg-gray-700 p-6 rounded-lg border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${selectedServiceId === service.id ? 'border-amber-500 bg-amber-500/10' : 'border-gray-600'}`}
                      onClick={() => {
                        setSelectedServiceId(service.id)
                      }}
                    >
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded-full border-2 mr-4 flex-shrink-0 ${selectedServiceId === service.id ? 'border-amber-500 bg-amber-500' : 'border-gray-400'}`}>
                          {selectedServiceId === service.id && (
                            <div className="w-full h-full rounded-full bg-amber-500 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            </div>
                          )}
                        </div>
                        <span className="flex-1 font-bold text-white text-lg">
                          {service.name}
                        </span>
                        <span className="ml-3 text-sm text-amber-400 whitespace-nowrap">
                          {service.price} · {service.duration} Min
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Month selection removed - using rolling 30-day window */}

              {/* Date Selection */}
              <div>
                <h2 className="heading-secondary mb-6">Datum auswählen (nächste 30 Tage)</h2>
                <div className="overflow-x-auto touch-scroll">
                  <div className="flex gap-3 min-w-max pb-2 swipe-container">
                    {weekdays.map((weekday, index) => (
                      <div
                        key={index}
                        className={`p-4 text-center rounded-lg border flex-shrink-0 w-24 touch-target swipe-item ${
                          weekday.available
                            ? `${selectedDate === weekday.date ? 'border-amber-500 bg-gray-600' : 'border-gray-600 bg-gray-700'} cursor-pointer touch-manipulation`
                            : 'border-gray-800 bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (weekday.available) { setSelectedDate(weekday.date); setSelectedTime('') }
                        }}
                      >
                        <div className="text-sm font-medium">{weekday.day.slice(0, 2)}</div>
                        <div className="text-xs text-gray-400">{weekday.date.slice(-2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <h2 className="heading-secondary mb-6">Uhrzeit auswählen</h2>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-3">
                  {timeSlots.map((time, index) => (
                    <button
                      key={index}
                      type="button"
                      disabled={takenTimesForSelection.has(time)}
                      className={`p-3 text-center rounded-lg border touch-target ${
                        takenTimesForSelection.has(time)
                          ? 'border-gray-800 bg-gray-800 text-gray-500 cursor-not-allowed'
                          : selectedTime === time
                            ? 'border-amber-500 bg-gray-600'
                            : 'border-gray-600 bg-gray-700'
                      }`}
                      onClick={() => {
                        if (!takenTimesForSelection.has(time)) {
                          setSelectedTime(time)
                        }
                      }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <h2 className="heading-secondary mb-6">Besondere Wünsche</h2>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none resize-none"
                  placeholder="Haben Sie besondere Wünsche oder Anmerkungen? (Optional)"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>

              {/* Booking Summary */}
              <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-6 rounded-xl border border-amber-400/30">
                <h3 className="text-lg font-bold text-amber-400 mb-4">Buchungsübersicht</h3>
                <div className="space-y-2 text-gray-300">
                  <div className="flex justify-between">
                    <span>Gewählter Service:</span>
                    <span className="text-white">{selectedService ? selectedService.name : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Preis:</span>
                    <span className="text-white">{selectedService ? selectedService.price : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Datum:</span>
                    <span className="text-white">{selectedDate || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uhrzeit:</span>
                    <span className="text-white">{selectedTime || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dauer:</span>
                    <span className="text-white">30 Min</span>
                  </div>
                </div>
              </div>

              {status && (
                <div
                  className={`p-4 rounded-lg border ${
                    status.type === 'success'
                      ? 'bg-green-900/30 border-green-700 text-green-300'
                      : 'bg-red-900/30 border-red-700 text-red-300'
                  }`}
                >
                  {status.message}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary text-lg py-4 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Wird gesendet…' : 'Termin bestätigen'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Booking Tips */}
      <section className="section-padding bg-gray-900">
        <div className="container-max fade-in">
          <h2 className="heading-secondary mb-12 text-center fade-in">
            Wichtige Hinweise
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in-delay-1">
            {[
              {
                title: "Pünktlichkeit",
                desc: "Bitte kommen Sie 5 Minuten vor Ihrem Termin"
              },
              {
                title: "Zahlung",
                desc: "Wir akzeptieren alle gängigen Zahlungsmethoden"
              },
              {
                title: "Stornierung",
                desc: "Termine können bis 24h vorher kostenlos storniert werden"
              },
              {
                title: "Getränke",
                desc: "Kostenlose Getränke während Ihres Besuchs"
              }
            ].map((tip, index) => (
              <div key={index} className="card">
                <h3 className="text-lg font-bold text-amber-400 mb-2">{tip.title}</h3>
                <p className="text-small">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-amber-600 to-orange-600">
        <div className="max-w-4xl mx-auto text-center fade-in">
          <h2 className="heading-secondary mb-6 text-white">
            Fragen zur Buchung?
          </h2>
          <p className="text-body text-white/90 mb-8">
            Kontaktieren Sie uns gerne telefonisch oder per E-Mail
          </p>
          <div className="flex flex-row gap-3 justify-center">
            <Link href="/contact" className="btn-primary">
              Kontakt aufnehmen
            </Link>
            <Link href="/services" className="btn-secondary">
              Services ansehen
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

