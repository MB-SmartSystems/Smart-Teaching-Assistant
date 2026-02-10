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

  // Nummer-Update Handler (für Seite und Übung)
  const handleNumberUpdate = async (field: 'seite' | 'übung', change: number) => {
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
      bg-white rounded-xl card-shadow-lg p-6 mb-4 border-l-4
      ${isActive ? 'border-l-blue-600 bg-blue-50' : 'border-l-gray-300'}
      ${birthdayStatus ? 'ring-2 ring-red-300' : ''}
      transition-all duration-200
    `}>
      
      {/* Header mit Name und Geburtstag */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">
            {student.vorname} {student.nachname}
          </h2>
          <p className="text-base font-semibold text-gray-700">
            {student.unterrichtstag} {student.unterrichtszeit} • {student.anfrageStatus || 'Aktiv'}
          </p>
          {student.monatlicherbetrag && (
            <p className="text-sm text-gray-600">
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
                  className="number-control"
                >
                  -
                </button>
                
                <div 
                  className="number-display"
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
                  className="number-control"
                >
                  +
                </button>
              </div>
            </div>

            {/* Übung - NEU als Nummer */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Übung</label>
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={() => handleNumberUpdate('übung', -1)}
                  className="number-control"
                >
                  -
                </button>
                
                <div 
                  className="number-display"
                  onClick={() => setEditingField('übung')}
                >
                  {editingField === 'übung' ? (
                    <input
                      type="number"
                      value={localValues.übung}
                      onChange={(e) => setLocalValues(prev => ({ ...prev, übung: e.target.value }))}
                      onBlur={() => {
                        handleFieldUpdate('übung', localValues.übung)
                        setEditingField(null)
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      className="w-16 text-center font-bold text-lg border-none outline-none bg-transparent"
                      autoFocus
                    />
                  ) : (
                    localValues.übung || '1'
                  )}
                </div>
                
                <button
                  onClick={() => handleNumberUpdate('übung', 1)}
                  className="number-control"
                >
                  +
                </button>
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
              className="input-field w-full"
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
              className="input-field w-full"
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
            className={`px-5 py-3 rounded-lg font-medium transition-colors ${
              student.zahlungStatus === 'ja' 
                ? 'bg-green-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-green-200'
            }`}
          >
            ✅ JA
          </button>
          <button
            onClick={() => handleZahlungUpdate('nein')}
            className={`px-5 py-3 rounded-lg font-medium transition-colors ${
              student.zahlungStatus === 'nein'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-red-200'
            }`}
          >
            ❌ NEIN
          </button>
          <button
            onClick={() => handleZahlungUpdate('offen')}
            className={`px-5 py-3 rounded-lg font-medium transition-colors ${
              student.zahlungStatus === 'offen' || student.zahlungStatus === 'unbekannt'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-orange-200'
            }`}
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
            className="btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            📱 WhatsApp {student.ansprechpartner}
          </a>
        )}
        
        {student.email && (
          <a
            href={getEmailLink()}
            className="btn-primary flex items-center gap-2"
          >
            ✉️ E-Mail
          </a>
        )}
        
        {student.vertragslink && (
          <a
            href={student.vertragslink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2"
          >
            📄 Vertrag
          </a>
        )}
      </div>
    </div>
  )
}