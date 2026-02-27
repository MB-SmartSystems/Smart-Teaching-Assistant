'use client'

import { SchülerApp } from '@/lib/baserow'
import { useState } from 'react'

interface AllStudentsModalProps {
  students: SchülerApp[]
  onClose: () => void
  onStudentClick?: (studentId: number) => void
}

export default function AllStudentsModal({ students, onClose, onStudentClick }: AllStudentsModalProps) {
  const [sortBy, setSortBy] = useState<'name' | 'day' | 'payment' | 'drums'>('name')
  const [filterBy, setFilterBy] = useState<'all' | 'drums-yes' | 'drums-no' | 'drums-unknown'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Sortierung
  const sortedStudents = [...students].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.vorname} ${a.nachname}`.localeCompare(`${b.vorname} ${b.nachname}`)
      case 'day':
        return (a.unterrichtstag || '').localeCompare(b.unterrichtstag || '')
      case 'payment':
        return (a.zahlungStatus || '').localeCompare(b.zahlungStatus || '')
      case 'drums':
        return (a.hatSchlagzeug || 'Unbekannt').localeCompare(b.hatSchlagzeug || 'Unbekannt')
      default:
        return 0
    }
  })

  // Filter
  const filteredStudents = sortedStudents.filter(student => {
    // Suchfilter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const fullName = `${student.vorname} ${student.nachname}`.toLowerCase()
      if (!fullName.includes(searchLower)) return false
    }

    // Status-Filter
    if (statusFilter !== 'all') {
      if (!student.anfrageStatus || student.anfrageStatus !== statusFilter) return false
    }

    // Unterrichtstag-Filter
    if (tagFilter !== 'all') {
      if (tagFilter === 'kein') {
        if (student.unterrichtstag) return false
      } else {
        if (student.unterrichtstag !== tagFilter) return false
      }
    }

    // Schlagzeug-Filter
    switch (filterBy) {
      case 'drums-yes':
        return student.hatSchlagzeug === 'Ja'
      case 'drums-no':
        return student.hatSchlagzeug === 'Nein'
      case 'drums-unknown':
        return !student.hatSchlagzeug || student.hatSchlagzeug === 'Unbekannt'
      default:
        return true
    }
  })

  // Schlagzeug-Status Farbe + Text
  const getDrumsBadge = (status: string | undefined) => {
    switch (status) {
      case 'Ja':
        return { bg: '#10b981', text: 'Ja' }
      case 'Nein':
        return { bg: '#ef4444', text: 'Nein' }
      default:
        return { bg: '#6b7280', text: 'Unbekannt' }
    }
  }

  // Zahlung-Status
  const getZahlungBadge = (status: string | undefined) => {
    switch (status) {
      case 'ja':
        return { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', text: 'Zahlung OK' }
      case 'nein':
        return { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', text: 'Keine Zahlung' }
      case 'Paypal':
        return { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', text: 'PayPal' }
      default:
        return { bg: 'rgba(107, 114, 128, 0.2)', color: '#6b7280', text: 'Unbekannt' }
    }
  }

  // WhatsApp Link
  const getWhatsAppLink = (nummer: string) => {
    if (!nummer) return '#'
    let cleanNumber = nummer.replace(/[^0-9+]/g, '')
    if (cleanNumber.match(/^01[567]/)) {
      cleanNumber = '49' + cleanNumber.slice(1)
    } else if (cleanNumber.startsWith('+')) {
      cleanNumber = cleanNumber.slice(1)
    }
    return `https://wa.me/${cleanNumber}`
  }

  // Klick auf Schüler-Karte
  const handleStudentClick = (studentId: number) => {
    if (onStudentClick) {
      onStudentClick(studentId)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--card-background, var(--bg-secondary))' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color, var(--border-light))', backgroundColor: 'var(--background, var(--bg-primary))' }}>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Alle Sch&uuml;ler ({filteredStudents.length})
          </h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
          >
            &#x2715;
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b flex flex-wrap gap-3 items-center" style={{ borderColor: 'var(--border-color, var(--border-light))', backgroundColor: 'var(--accent-light, var(--bg-secondary))' }}>
          {/* Suche */}
          <input
            type="text"
            placeholder="Nach Namen suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 rounded border flex-1 min-w-[200px]"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-medium)',
              color: 'var(--text-primary)'
            }}
          />

          {/* Sortierung */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'day' | 'payment' | 'drums')}
            className="px-3 py-2 rounded border"
            style={{
              backgroundColor: 'rgb(31, 41, 55)',
              borderColor: 'rgb(55, 65, 81)',
              color: 'white'
            }}
          >
            <option value="name">Sortieren: Name</option>
            <option value="day">Sortieren: Tag</option>
            <option value="payment">Sortieren: Zahlung</option>
            <option value="drums">Sortieren: Schlagzeug</option>
          </select>

          {/* Status-Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded border"
            style={{
              backgroundColor: 'rgb(31, 41, 55)',
              borderColor: 'rgb(55, 65, 81)',
              color: 'white'
            }}
          >
            <option value="all">Alle Status</option>
            <option value="Erstkontakt">Erstkontakt</option>
            <option value="Probetermin vorschlagen">Probetermin vorschlagen</option>
            <option value="Probeunterricht Termin steht">Probeunterricht Termin steht</option>
            <option value="Probeunterricht abgeschlossen">Probeunterricht abgeschlossen</option>
            <option value="aktiver Schüler">Aktiver Sch&uuml;ler</option>
            <option value="Follow-Up">Follow-Up</option>
            <option value="Vertrag gesendet, warten auf Antwort">Vertrag gesendet</option>
            <option value="Anfrage über Website">Anfrage &uuml;ber Website</option>
          </select>

          {/* Unterrichtstag-Filter */}
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-3 py-2 rounded border"
            style={{
              backgroundColor: 'rgb(31, 41, 55)',
              borderColor: 'rgb(55, 65, 81)',
              color: 'white'
            }}
          >
            <option value="all">Alle Tage</option>
            <option value="Montag">Montag</option>
            <option value="Dienstag">Dienstag</option>
            <option value="Mittwoch">Mittwoch</option>
            <option value="Donnerstag">Donnerstag</option>
            <option value="kein">Kein Tag</option>
          </select>

          {/* Schlagzeug-Filter */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as 'all' | 'drums-yes' | 'drums-no' | 'drums-unknown')}
            className="px-3 py-2 rounded border"
            style={{
              backgroundColor: 'rgb(31, 41, 55)',
              borderColor: 'rgb(55, 65, 81)',
              color: 'white'
            }}
          >
            <option value="all">Schlagzeug: Alle</option>
            <option value="drums-yes">Hat Schlagzeug</option>
            <option value="drums-no">Kein Schlagzeug</option>
            <option value="drums-unknown">Unbekannt</option>
          </select>
        </div>

        {/* Card Grid */}
        <div className="overflow-auto p-4" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              Keine Sch&uuml;ler gefunden
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStudents.map((student) => {
                const drums = getDrumsBadge(student.hatSchlagzeug)
                const zahlung = getZahlungBadge(student.zahlungStatus)

                return (
                  <div
                    key={student.id}
                    onClick={() => handleStudentClick(student.id)}
                    className="rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border"
                    style={{
                      backgroundColor: 'var(--bg-secondary, rgb(31, 41, 55))',
                      borderColor: 'var(--border-light, rgb(55, 65, 81))',
                    }}
                  >
                    {/* Name + Status Badge */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-base" style={{ color: 'var(--text-primary, white)' }}>
                          {student.vorname} {student.nachname}
                        </div>
                        {student.anfrageStatus && (
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted, #9ca3af)' }}>
                            {student.anfrageStatus}
                          </div>
                        )}
                      </div>
                      {/* Schlagzeug Badge */}
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold text-white shrink-0 ml-2"
                        style={{ backgroundColor: drums.bg }}
                      >
                        {drums.text}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--text-secondary, #d1d5db)' }}>
                      {student.unterrichtstag && (
                        <span>{student.unterrichtstag} {student.unterrichtszeit || ''}</span>
                      )}
                      {!student.unterrichtstag && (
                        <span style={{ color: 'var(--text-muted, #6b7280)' }}>Kein fester Tag</span>
                      )}
                    </div>

                    {/* Zahlung + Betrag + Kontakt */}
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ backgroundColor: zahlung.bg, color: zahlung.color }}
                        >
                          {zahlung.text}
                        </span>
                        {student.monatlicherbetrag && (
                          <span className="text-xs" style={{ color: 'var(--text-muted, #9ca3af)' }}>
                            {student.monatlicherbetrag}&euro;/Mo
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {student.handynummer && (
                          <a
                            href={getWhatsAppLink(student.handynummer)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500 hover:text-green-400 text-sm"
                            title={`WhatsApp: ${student.handynummer}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            WA
                          </a>
                        )}
                        {student.email && (
                          <a
                            href={`mailto:${student.email}`}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                            title={`Email: ${student.email}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Mail
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
