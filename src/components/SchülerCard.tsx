'use client'

import { SchülerApp } from '@/lib/baserow'
import { useState } from 'react'
import { useOfflineSync } from '@/lib/offlineSync'

interface SchülerCardProps {
  student: SchülerApp
  isActive?: boolean
}

export default function SchülerCard({ student, isActive = false }: SchülerCardProps) {
  const { updateField } = useOfflineSync()
  
  // Local State für Inline-Editing
  const [editingField, setEditingField] = useState<string | null>(null)
  const [localValues, setLocalValues] = useState({
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
      bg-white rounded-xl shadow-lg p-6 mb-4 border-l-4
      ${isActive ? 'border-l-blue-500 bg-blue-50' : 'border-l-gray-300'}
      ${birthdayStatus ? 'ring-2 ring-red-300' : ''}
    `}>
      
      {/* Header mit Name und Geburtstag */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {student.vorname} {student.nachname}
          </h2>
          <p className="text-sm text-gray-600">
            {student.unterrichtstag} {student.unterrichtszeit} • {student.anfrageStatus || 'Aktiv'}
          </p>
        </div>
        
        {birthdayStatus && (
          <span className={`px-2 py-1 rounded text-white text-xs font-bold ${birthdayStatus.color}`}>
            {birthdayStatus.text}
          </span>
        )}
      </div>

      {/* Aktueller Stand */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        
        {/* Buch und Seite */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-2">📚 Aktueller Stand</h3>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">Buch:</span>
            <span className="font-medium">{student.buch || 'Nicht gesetzt'}</span>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">Seite:</span>
            
            {editingField === 'seite' ? (
              <input
                type="text"
                value={localValues.seite}
                onChange={(e) => setLocalValues(prev => ({ ...prev, seite: e.target.value }))}
                onBlur={() => {
                  handleFieldUpdate('seite', localValues.seite)
                  setEditingField(null)
                }}
                onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFieldUpdate('seite', String(Math.max(1, parseInt(localValues.seite || '1') - 1)))}
                  className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold"
                >
                  -
                </button>
                
                <span 
                  className="font-bold text-lg cursor-pointer hover:bg-gray-200 px-2 py-1 rounded min-w-[3rem] text-center"
                  onClick={() => setEditingField('seite')}
                >
                  {localValues.seite || '1'}
                </span>
                
                <button
                  onClick={() => handleFieldUpdate('seite', String(parseInt(localValues.seite || '1') + 1))}
                  className="bg-gray-200 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Übung */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-2">🔧 Aktuelle Übung</h3>
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
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Z.B. Fill-Ins zwischen Strophen"
              autoFocus
            />
          ) : (
            <div 
              className="cursor-pointer hover:bg-gray-200 p-2 rounded border-2 border-dashed border-gray-300"
              onClick={() => setEditingField('übung')}
            >
              {localValues.übung || 'Klicken zum Bearbeiten...'}
            </div>
          )}
        </div>

        {/* Wichtiger Fokus - NEU */}
        <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-l-yellow-500">
          <h3 className="font-semibold text-gray-700 mb-2">🎯 Wichtiger Fokus</h3>
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
              className="w-full border border-yellow-300 rounded px-3 py-2"
              placeholder="Z.B. Handhaltung verbessern, Timing bei Fills"
              autoFocus
            />
          ) : (
            <div 
              className="cursor-pointer hover:bg-yellow-100 p-2 rounded border-2 border-dashed border-yellow-300"
              onClick={() => setEditingField('wichtigerFokus')}
            >
              {localValues.wichtigerFokus || 'Technik-Fokus hinzufügen...'}
            </div>
          )}
        </div>

        {/* Aktuelle Lieder */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-2">🎵 Heute gelernt</h3>
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
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Z.B. We will rock you, Back in black"
              autoFocus
            />
          ) : (
            <div 
              className="cursor-pointer hover:bg-gray-200 p-2 rounded border-2 border-dashed border-gray-300"
              onClick={() => setEditingField('aktuelleLieder')}
            >
              {localValues.aktuelleLieder || 'Neue Lieder hinzufügen...'}
            </div>
          )}
        </div>
      </div>

      {/* Zahlungsstatus */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">💰 Zahlung {student.monatlicherbetrag && `(${student.monatlicherbetrag}€)`}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleZahlungUpdate('ja')}
            className={`px-4 py-2 rounded font-medium ${
              student.zahlungStatus === 'ja' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-green-200'
            }`}
          >
            ✅ JA
          </button>
          <button
            onClick={() => handleZahlungUpdate('nein')}
            className={`px-4 py-2 rounded font-medium ${
              student.zahlungStatus === 'nein'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-red-200'
            }`}
          >
            ❌ NEIN
          </button>
          <button
            onClick={() => handleZahlungUpdate('offen')}
            className={`px-4 py-2 rounded font-medium ${
              student.zahlungStatus === 'offen' || student.zahlungStatus === 'unbekannt'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-orange-200'
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
            className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 flex items-center gap-2"
          >
            📱 WhatsApp {student.ansprechpartner}
          </a>
        )}
        
        {student.email && (
          <a
            href={getEmailLink()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 flex items-center gap-2"
          >
            ✉️ E-Mail
          </a>
        )}
        
        {student.vertragslink && (
          <a
            href={student.vertragslink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 flex items-center gap-2"
          >
            📄 Vertrag
          </a>
        )}
      </div>
    </div>
  )
}