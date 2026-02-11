'use client'

import { SchülerApp } from '@/lib/baserow'
import { useState } from 'react'
import { useOfflineSync } from '@/lib/offlineSync'
import BookDropdown from './BookDropdown'

interface SchülerCardProps {
  student: SchülerApp
  isActive?: boolean
}

export default function SchülerCard({ student, isActive = false }: SchülerCardProps) {
  const { updateField } = useOfflineSync()
  
  // Local State für Inline-Editing
  const [editingField, setEditingField] = useState<string | null>(null)
  const [localValues, setLocalValues] = useState({
    buch: student.buch,
    seite: student.seite,
    übung: student.übung,
    wichtigerFokus: student.wichtigerFokus,
    aktuelleLieder: student.aktuelleLieder
  })

  // Geburtstag-Status ermitteln
  const getBirthdayStatus = () => {
    if (!student.geburtsdatum) return null
    
    const today = new Date()
    const birthday = new Date(student.geburtsdatum)
    
    // Gleicher Tag und Monat
    if (birthday.getDate() === today.getDate() && 
        birthday.getMonth() === today.getMonth()) {
      return { text: 'Heute Geburtstag! 🎂', color: 'bg-red-500' }
    }
    
    // Diese Woche
    const weekFromNow = new Date()
    weekFromNow.setDate(today.getDate() + 7)
    
    const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate())
    if (thisYearBirthday >= today && thisYearBirthday <= weekFromNow) {
      return { text: `🎂 in ${Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} Tagen`, color: 'bg-orange-500' }
    }
    
    return null
  }

  const birthdayStatus = getBirthdayStatus()

  // Feld-Update Handler
  const handleFieldUpdate = async (field: keyof typeof localValues, value: string) => {
    setLocalValues(prev => ({ ...prev, [field]: value }))
    
    try {
      await updateField(student.id, field, value)
    } catch (error) {
      console.error(`Fehler beim Update von ${field}:`, error)
      // TODO: Error Toast anzeigen
    }
  }

  // Nummer-Update Handler (nur für Seite)
  const handleNumberUpdate = async (field: 'seite', change: number) => {
    const currentValue = parseInt(localValues[field] || '1')
    const newValue = Math.max(1, currentValue + change).toString()
    
    setLocalValues(prev => ({ ...prev, [field]: newValue }))
    
    try {
      await updateField(student.id, field, newValue)
    } catch (error) {
      console.error(`Fehler beim Update von ${field}:`, error)
    }
  }

  // Zahlungsstatus Update
  const handleZahlungUpdate = async (status: 'ja' | 'nein' | 'offen') => {
    try {
      await updateField(student.id, 'zahlungStatus', status)
    } catch (error) {
      console.error('Fehler beim Update des Zahlungsstatus:', error)
    }
  }

  // WhatsApp Link generieren
  const getWhatsAppLink = () => {
    if (!student.handynummer) return '#'
    const cleanNumber = student.handynummer.replace(/[^\d+]/g, '')
    return `whatsapp://send?phone=${cleanNumber}&text=Hallo%20${student.ansprechpartner},%20`
  }

  // E-Mail Link generieren  
  const getEmailLink = () => {
    if (!student.email) return '#'
    return `mailto:${student.email}?subject=Schlagzeugunterricht%20${student.vorname}`
  }

  return (
    <div className={`
      bg-white rounded-xl shadow-lg border p-6 mb-6
      ${isActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}
      ${birthdayStatus ? 'ring-2 ring-red-400' : ''}
      transition-all duration-200 hover:shadow-xl hover:-translate-y-1
    `}>
      
      {/* Header mit Name und Geburtstag */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold text-on-light mb-1">
            {student.vorname} {student.nachname}
          </h2>
          <p className="text-base font-semibold text-on-light">
            {student.unterrichtstag} {student.unterrichtszeit} • {student.anfrageStatus || 'Aktiv'}
          </p>
          {student.monatlicherbetrag && (
            <p className="text-sm text-muted">
              Monatsbeitrag: {student.monatlicherbetrag}€
            </p>
          )}
        </div>
        
        {birthdayStatus && (
          <span className={`px-3 py-2 rounded-lg text-white text-sm font-bold ${birthdayStatus.color}`}>
            {birthdayStatus.text}
          </span>
        )}
      </div>

      {/* Buch und Stand */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        
        {/* Buch - Dropdown Auswahl */}
        <div className="bg-gray-50 rounded-lg p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            📚 Aktuelles Buch
          </h3>
          
          <BookDropdown
            currentBook={localValues.buch}
            onBookChange={(book) => {
              setLocalValues(prev => ({ ...prev, buch: book }))
              handleFieldUpdate('buch', book)
            }}
            isEditing={editingField === 'buch'}
            onToggleEdit={() => setEditingField(editingField === 'buch' ? null : 'buch')}
          />
        </div>

        {/* Seite und Übung - Nummer-Controls */}
        <div className="bg-gray-50 rounded-lg p-5">
          <h3 className="font-semibold text-gray-800 mb-4">🎯 Aktueller Stand</h3>
          
          <div className="grid grid-cols-2 gap-4">
            
            {/* Seite */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Seite</label>
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={() => handleNumberUpdate('seite', -1)}
                  className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-blue-100 hover:text-blue-600 font-semibold text-lg rounded-lg transition-colors border"
                >
                  -
                </button>
                
                <div 
                  className="flex items-center justify-center w-16 h-10 font-semibold text-lg cursor-pointer rounded-lg transition-colors hover:bg-gray-50"
                  onClick={() => setEditingField('seite')}
                >
                  {editingField === 'seite' ? (
                    <input
                      type="number"
                      value={localValues.seite}
                      onChange={(e) => setLocalValues(prev => ({ ...prev, seite: e.target.value }))}
                      onBlur={() => {
                        handleFieldUpdate('seite', localValues.seite)
                        setEditingField(null)
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      className="w-16 text-center font-bold text-lg border-none outline-none bg-transparent"
                      autoFocus
                    />
                  ) : (
                    localValues.seite || '1'
                  )}
                </div>
                
                <button
                  onClick={() => handleNumberUpdate('seite', 1)}
                  className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-blue-100 hover:text-blue-600 font-semibold text-lg rounded-lg transition-colors border"
                >
                  +
                </button>
              </div>
            </div>

            {/* Übungen - Flexibles Text-Feld */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Übungen</label>
              
              {editingField === 'übung' ? (
                <input
                  type="text"
                  value={localValues.übung}
                  onChange={(e) => setLocalValues(prev => ({ ...prev, übung: e.target.value }))}
                  onBlur={() => {
                    handleFieldUpdate('übung', localValues.übung)
                    setEditingField(null)
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg font-medium text-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="z.B. 1, 2, 3 oder 1-6 oder 12, 15"
                  autoFocus
                />
              ) : (
                <div 
                  className="cursor-pointer hover:bg-gray-100 p-3 rounded-lg border-2 border-dashed border-gray-300 font-medium text-lg bg-white transition-colors min-h-[3rem] flex items-center"
                  onClick={() => setEditingField('übung')}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={localValues.übung ? 'text-gray-900' : 'text-gray-500'}>
                      {localValues.übung || 'Übungen eingeben...'}
                    </span>
                    <svg 
                      className="w-5 h-5 text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-1">
                💡 Beispiele: "1, 2, 3" • "1-6" • "12, 15, 18" • "Einführung"
              </div>
            </div>
          </div>
        </div>

        {/* Wichtiger Fokus */}
        <div className="bg-yellow-50 rounded-lg p-5 border-l-4 border-l-yellow-500">
          <h3 className="font-semibold text-gray-800 mb-3">🎯 Wichtiger Fokus</h3>
          {editingField === 'wichtigerFokus' ? (
            <input
              type="text"
              value={localValues.wichtigerFokus}
              onChange={(e) => setLocalValues(prev => ({ ...prev, wichtigerFokus: e.target.value }))}
              onBlur={() => {
                handleFieldUpdate('wichtigerFokus', localValues.wichtigerFokus)
                setEditingField(null)
              }}
              onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="w-full p-3 border-2 border-gray-300 rounded-lg font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Z.B. Handhaltung verbessern, Timing bei Fills"
              autoFocus
            />
          ) : (
            <div 
              className="cursor-pointer hover:bg-yellow-100 p-3 rounded-lg border-2 border-dashed border-yellow-300 transition-colors"
              onClick={() => setEditingField('wichtigerFokus')}
            >
              {localValues.wichtigerFokus || 'Technik-Fokus hinzufügen...'}
            </div>
          )}
        </div>

        {/* Aktuelle Lieder */}
        <div className="bg-blue-50 rounded-lg p-5 border-l-4 border-l-blue-500">
          <h3 className="font-semibold text-gray-800 mb-3">🎵 Heute gelernt</h3>
          {editingField === 'aktuelleLieder' ? (
            <input
              type="text"
              value={localValues.aktuelleLieder}
              onChange={(e) => setLocalValues(prev => ({ ...prev, aktuelleLieder: e.target.value }))}
              onBlur={() => {
                handleFieldUpdate('aktuelleLieder', localValues.aktuelleLieder)
                setEditingField(null)
              }}
              onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="w-full p-3 border-2 border-gray-300 rounded-lg font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Z.B. We will rock you, Back in black"
              autoFocus
            />
          ) : (
            <div 
              className="cursor-pointer hover:bg-blue-100 p-3 rounded-lg border-2 border-dashed border-blue-300 transition-colors"
              onClick={() => setEditingField('aktuelleLieder')}
            >
              {localValues.aktuelleLieder || 'Neue Lieder hinzufügen...'}
            </div>
          )}
        </div>
      </div>

      {/* Zahlungsstatus */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">💰 Zahlung</h3>
        <div className="flex gap-3">
          <button
            onClick={() => handleZahlungUpdate('ja')}
            className={student.zahlungStatus === 'ja' 
              ? 'bg-emerald-600 text-white font-medium py-3 px-5 rounded-lg shadow-md'
              : 'bg-gray-100 hover:bg-green-100 text-gray-800 font-medium py-3 px-5 rounded-lg transition-colors'}
          >
            ✅ JA
          </button>
          <button
            onClick={() => handleZahlungUpdate('nein')}
            className={student.zahlungStatus === 'nein' 
              ? 'bg-red-600 text-white font-medium py-3 px-5 rounded-lg shadow-md'
              : 'bg-gray-100 hover:bg-red-100 text-gray-800 font-medium py-3 px-5 rounded-lg transition-colors'}
          >
            ❌ NEIN
          </button>
          <button
            onClick={() => handleZahlungUpdate('offen')}
            className={student.zahlungStatus === 'offen' || student.zahlungStatus === 'unbekannt' 
              ? 'bg-amber-500 text-white font-medium py-3 px-5 rounded-lg shadow-md hover:bg-amber-600' 
              : 'bg-gray-100 hover:bg-amber-100 text-gray-800 font-medium py-3 px-5 rounded-lg transition-colors'}
          >
            ⏳ OFFEN
          </button>
        </div>
      </div>

      {/* Kontakt & Aktionen */}
      <div className="flex flex-wrap gap-3">
        {student.handynummer && (
          <a
            href={getWhatsAppLink()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-md"
          >
            📱 WhatsApp {student.ansprechpartner}
          </a>
        )}
        
        {student.email && (
          <a
            href={getEmailLink()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-md"
          >
            ✉️ E-Mail
          </a>
        )}
        
        {student.vertragslink && (
          <a
            href={student.vertragslink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-5 rounded-lg transition-colors flex items-center gap-2 border"
          >
            📄 Vertrag
          </a>
        )}
      </div>
    </div>
  )
}