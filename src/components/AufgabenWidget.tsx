'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from './Toast'
import { SchülerApp } from '@/lib/baserow'

interface Aufgabe {
  id: number
  Aufgabe_ID: number
  Titel: string
  Beschreibung: string
  Typ: { id: number; value: string; color: string } | null
  Priorität: { id: number; value: string; color: string } | null
  Status: { id: number; value: string; color: string } | null
  Erstellt_am: string
  Erledigt_am: string
  Fällig_am: string
  Verknüpfung_Schueler: { id: number; value: string }[]
  Notizen: string
}

interface SelectOption {
  id: number
  value: string
  color: string
}

interface SelectField {
  id: number
  name: string
  options: SelectOption[]
}

// Typ-Icons
const TYP_ICONS: Record<string, string> = {
  'Probeunterricht Termin': '📅',
  'Follow-Up Probeunterricht': '🔄',
  'Mit Eltern absprechen': '👨‍👩‍👦',
  'Schlagzeugwahl klären': '🥁',
  'Flex-Karte buchen': '🎫',
  'Unterricht eintragen': '📝',
  'Manuell': '✏️',
}

// Priorität-Farben
const PRIO_COLORS: Record<string, string> = {
  'Hoch': '#ef4444',
  'Mittel': '#f59e0b',
  'Niedrig': '#6b7280',
}

// Baserow-Farben für neue Optionen
const BASEROW_COLORS = [
  { value: 'blue', label: 'Blau' },
  { value: 'green', label: 'Grün' },
  { value: 'red', label: 'Rot' },
  { value: 'light-orange', label: 'Gelb' },
  { value: 'light-gray', label: 'Grau' },
  { value: 'dark-purple', label: 'Lila' },
  { value: 'dark-orange', label: 'Orange' },
  { value: 'dark-brown', label: 'Braun' },
]

interface AufgabenWidgetProps {
  students?: SchülerApp[]
}

export default function AufgabenWidget({ students = [] }: AufgabenWidgetProps) {
  const toast = useToast()
  const [aufgaben, setAufgaben] = useState<Aufgabe[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showErledigt, setShowErledigt] = useState(false)
  const [terminForm, setTerminForm] = useState<{ aufgabeId: number; datum: string; uhrzeit: string } | null>(null)

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    titel: '',
    beschreibung: '',
    typ: '' as string | number,
    prioritaet: '' as string | number,
    schueler_id: '' as string | number,
    faellig_am: '',
  })

  // Dropdown field options (dynamisch geladen)
  const [fieldOptions, setFieldOptions] = useState<SelectField[]>([])

  // Neue Option erstellen
  const [newOptionForm, setNewOptionForm] = useState<{
    fieldId: number
    fieldName: string
    name: string
    color: string
  } | null>(null)

  const loadAufgaben = useCallback(async () => {
    try {
      const res = await fetch('/api/aufgaben')
      if (!res.ok) return
      const data = await res.json()
      setAufgaben(data)
    } catch (err) {
      console.error('Fehler beim Laden der Aufgaben:', err)
    }
  }, [])

  // Feld-Optionen für Tabelle 879 laden
  const loadFieldOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/baserow-fields?table_id=879')
      if (!res.ok) return
      const data = await res.json()
      setFieldOptions(data)
    } catch (err) {
      console.error('Fehler beim Laden der Feld-Optionen:', err)
    }
  }, [])

  useEffect(() => {
    loadAufgaben()
  }, [loadAufgaben])

  // Reload when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAufgaben()
      loadFieldOptions()
    }
  }, [isOpen, loadAufgaben, loadFieldOptions])

  const offeneAufgaben = aufgaben.filter(a =>
    a.Status?.value === 'Offen' || a.Status?.value === 'In Arbeit'
  ).sort((a, b) => {
    const prioOrder: Record<string, number> = { 'Hoch': 0, 'Mittel': 1, 'Niedrig': 2 }
    const prioA = prioOrder[a.Priorität?.value || 'Niedrig'] ?? 2
    const prioB = prioOrder[b.Priorität?.value || 'Niedrig'] ?? 2
    return prioA - prioB
  })

  const erledigteAufgaben = aufgaben.filter(a => a.Status?.value === 'Erledigt')

  // Aufgabe als Erledigt markieren
  const handleErledigt = async (aufgabe: Aufgabe) => {
    setLoading(true)
    try {
      const res = await fetch('/api/aufgaben', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aufgabeId: aufgabe.id,
          updates: {
            Status: 3861,
            Erledigt_am: new Date().toISOString().split('T')[0],
          }
        })
      })
      if (res.ok) {
        toast.success(`Aufgabe "${aufgabe.Titel}" erledigt!`)
        await loadAufgaben()
      }
    } catch (err) {
      toast.error('Fehler beim Aktualisieren')
    } finally {
      setLoading(false)
    }
  }

  // Probeunterricht-Termin eintragen
  const handleTerminEintragen = async () => {
    if (!terminForm) return
    const { aufgabeId, datum, uhrzeit } = terminForm
    if (!datum) {
      toast.error('Bitte Datum eingeben')
      return
    }

    setLoading(true)
    try {
      const aufgabe = aufgaben.find(a => a.id === aufgabeId)
      const schuelerId = aufgabe?.Verknüpfung_Schueler?.[0]?.id

      if (schuelerId) {
        await fetch('/api/students', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: schuelerId,
            fieldName: 'field_7846',
            value: datum,
          })
        })
        if (uhrzeit) {
          await fetch('/api/students', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: schuelerId,
              fieldName: 'field_7847',
              value: uhrzeit,
            })
          })
        }
      }

      await fetch('/api/aufgaben', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aufgabeId,
          updates: {
            Status: 3861,
            Erledigt_am: new Date().toISOString().split('T')[0],
          }
        })
      })

      toast.success('Termin eingetragen und Aufgabe erledigt!')
      setTerminForm(null)
      await loadAufgaben()
    } catch (err) {
      toast.error('Fehler beim Eintragen des Termins')
    } finally {
      setLoading(false)
    }
  }

  // Neue Aufgabe erstellen
  const handleCreateAufgabe = async () => {
    if (!createForm.titel.trim()) {
      toast.error('Titel ist Pflicht!')
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        titel: createForm.titel.trim(),
      }
      if (createForm.beschreibung.trim()) payload.beschreibung = createForm.beschreibung.trim()
      if (createForm.typ) payload.typ = Number(createForm.typ)
      if (createForm.prioritaet) payload.prioritaet = Number(createForm.prioritaet)
      if (createForm.schueler_id) payload.schueler_id = Number(createForm.schueler_id)
      if (createForm.faellig_am) payload.faellig_am = createForm.faellig_am

      const res = await fetch('/api/aufgaben', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        toast.success('Aufgabe erstellt!')
        setCreateForm({ titel: '', beschreibung: '', typ: '', prioritaet: '', schueler_id: '', faellig_am: '' })
        setShowCreateForm(false)
        await loadAufgaben()
      } else {
        const err = await res.json()
        toast.error(err.details || err.error || 'Fehler beim Erstellen')
      }
    } catch (err) {
      toast.error('Fehler beim Erstellen der Aufgabe')
    } finally {
      setLoading(false)
    }
  }

  // Neue Dropdown-Option erstellen
  const handleCreateOption = async () => {
    if (!newOptionForm || !newOptionForm.name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/baserow-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldId: newOptionForm.fieldId,
          optionName: newOptionForm.name.trim(),
          color: newOptionForm.color,
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`"${newOptionForm.name}" hinzugefuegt!`)

        // Optionen neu laden
        await loadFieldOptions()

        // Automatisch die neue Option im Formular setzen
        if (data.option?.id) {
          if (newOptionForm.fieldName === 'Typ') {
            setCreateForm(prev => ({ ...prev, typ: data.option.id }))
          } else if (newOptionForm.fieldName === 'Priorität') {
            setCreateForm(prev => ({ ...prev, prioritaet: data.option.id }))
          }
        }

        setNewOptionForm(null)
      } else {
        toast.error('Fehler beim Erstellen der Option')
      }
    } catch (err) {
      toast.error('Fehler beim Erstellen der Option')
    } finally {
      setLoading(false)
    }
  }

  // Felder finden
  const typField = fieldOptions.find(f => f.name === 'Typ')
  const prioField = fieldOptions.find(f => f.name === 'Priorität')

  const badgeCount = offeneAufgaben.length

  return (
    <>
      {/* Badge Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative btn-primary text-sm"
        title="Aufgaben anzeigen"
      >
        Aufgaben
        {badgeCount > 0 && (
          <span
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
            style={{ backgroundColor: '#ef4444' }}
          >
            {badgeCount}
          </span>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false) }}
        >
          <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-light)' }}>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Aufgaben ({offeneAufgaben.length} offen)
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: showCreateForm ? '#6b7280' : '#3b82f6' }}
                >
                  {showCreateForm ? 'Abbrechen' : '+ Neu'}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-2xl leading-none px-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto custom-scrollbar p-5 space-y-3" style={{ maxHeight: 'calc(85vh - 80px)' }}>

              {/* Create Form */}
              {showCreateForm && (
                <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--primary)' }}>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Neue Aufgabe erstellen</h3>

                  {/* Titel */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Titel *</label>
                    <input
                      type="text"
                      value={createForm.titel}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, titel: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                      placeholder="Aufgabe beschreiben..."
                      autoFocus
                    />
                  </div>

                  {/* Beschreibung */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Beschreibung</label>
                    <textarea
                      value={createForm.beschreibung}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, beschreibung: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                      rows={2}
                      placeholder="Details (optional)..."
                    />
                  </div>

                  {/* Typ + Priorität Row */}
                  <div className="flex gap-3 mb-3">
                    {/* Typ Dropdown */}
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Typ</label>
                      <div className="flex gap-1">
                        <select
                          value={createForm.typ}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, typ: e.target.value }))}
                          className="flex-1 px-2 py-1.5 rounded-lg border text-sm"
                          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                        >
                          <option value="">-- Kein Typ --</option>
                          {typField?.options.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.value}</option>
                          ))}
                        </select>
                        {typField && (
                          <button
                            onClick={() => setNewOptionForm({ fieldId: typField.id, fieldName: 'Typ', name: '', color: 'blue' })}
                            className="px-2 py-1 rounded-lg text-xs font-medium border"
                            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-medium)' }}
                            title="Neuen Typ erstellen"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Priorität Dropdown */}
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Priorit&auml;t</label>
                      <div className="flex gap-1">
                        <select
                          value={createForm.prioritaet}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, prioritaet: e.target.value }))}
                          className="flex-1 px-2 py-1.5 rounded-lg border text-sm"
                          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                        >
                          <option value="">-- Keine --</option>
                          {prioField?.options.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.value}</option>
                          ))}
                        </select>
                        {prioField && (
                          <button
                            onClick={() => setNewOptionForm({ fieldId: prioField.id, fieldName: 'Priorität', name: '', color: 'red' })}
                            className="px-2 py-1 rounded-lg text-xs font-medium border"
                            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-medium)' }}
                            title="Neue Priorität erstellen"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Schüler + Fällig am Row */}
                  <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Sch&uuml;ler</label>
                      <select
                        value={createForm.schueler_id}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, schueler_id: e.target.value }))}
                        className="w-full px-2 py-1.5 rounded-lg border text-sm"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                      >
                        <option value="">-- Kein Sch&uuml;ler --</option>
                        {[...students].sort((a, b) =>
                          (a.vorname || '').localeCompare(b.vorname || '', 'de')
                        ).map(s => (
                          <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>F&auml;llig am</label>
                      <input
                        type="date"
                        value={createForm.faellig_am}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, faellig_am: e.target.value }))}
                        className="w-full px-2 py-1.5 rounded-lg border text-sm"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  {/* Neue Option Form (inline) */}
                  {newOptionForm && (
                    <div className="rounded-lg border p-3 mb-3" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)' }}>
                      <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Neue Option f&uuml;r &quot;{newOptionForm.fieldName}&quot;
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newOptionForm.name}
                            onChange={(e) => setNewOptionForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="w-full px-2 py-1.5 rounded border text-sm"
                            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                            placeholder="Name der neuen Option..."
                            autoFocus
                          />
                        </div>
                        <select
                          value={newOptionForm.color}
                          onChange={(e) => setNewOptionForm(prev => prev ? { ...prev, color: e.target.value } : null)}
                          className="px-2 py-1.5 rounded border text-sm"
                          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                        >
                          {BASEROW_COLORS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleCreateOption}
                          disabled={loading || !newOptionForm.name.trim()}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                          style={{ backgroundColor: loading ? '#6b7280' : '#10b981' }}
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setNewOptionForm(null)}
                          className="px-2 py-1.5 rounded-lg text-sm"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          X
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Erstellen Button */}
                  <button
                    onClick={handleCreateAufgabe}
                    disabled={loading || !createForm.titel.trim()}
                    className="w-full py-2 rounded-lg font-semibold text-white text-sm"
                    style={{ backgroundColor: loading || !createForm.titel.trim() ? '#6b7280' : '#10b981' }}
                  >
                    {loading ? 'Wird erstellt...' : 'Aufgabe erstellen'}
                  </button>
                </div>
              )}

              {/* Offene Aufgaben */}
              {offeneAufgaben.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  Keine offenen Aufgaben
                </div>
              ) : (
                offeneAufgaben.map(aufgabe => (
                  <div
                    key={aufgabe.id}
                    className="rounded-lg border p-4"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-light)',
                      borderLeft: `4px solid ${PRIO_COLORS[aufgabe.Priorität?.value || 'Niedrig'] || '#6b7280'}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{TYP_ICONS[aufgabe.Typ?.value || ''] || '📌'}</span>
                          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {aufgabe.Titel}
                          </span>
                        </div>
                        {aufgabe.Verknüpfung_Schueler?.[0] && (
                          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Sch&uuml;ler: {aufgabe.Verknüpfung_Schueler[0].value}
                          </div>
                        )}
                        {aufgabe.Fällig_am && (
                          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            F&auml;llig: {new Date(aufgabe.Fällig_am).toLocaleDateString('de-DE')}
                          </div>
                        )}
                        {aufgabe.Beschreibung && (
                          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {aufgabe.Beschreibung}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        {aufgabe.Typ?.value === 'Probeunterricht Termin' && aufgabe.Verknüpfung_Schueler?.[0] && (
                          <button
                            onClick={() => setTerminForm({
                              aufgabeId: aufgabe.id,
                              datum: '',
                              uhrzeit: '',
                            })}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                            style={{ backgroundColor: '#3b82f6' }}
                          >
                            Termin eintragen
                          </button>
                        )}
                        <button
                          onClick={() => handleErledigt(aufgabe)}
                          disabled={loading}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                          style={{ backgroundColor: '#10b981' }}
                        >
                          Erledigt
                        </button>
                      </div>
                    </div>

                    {/* Inline Termin-Form */}
                    {terminForm?.aufgabeId === aufgabe.id && (
                      <div className="mt-3 pt-3 border-t flex items-end gap-3 flex-wrap" style={{ borderColor: 'var(--border-light)' }}>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Datum</label>
                          <input
                            type="date"
                            value={terminForm.datum}
                            onChange={e => setTerminForm(prev => prev ? { ...prev, datum: e.target.value } : null)}
                            className="px-2 py-1.5 rounded border text-sm"
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Uhrzeit</label>
                          <input
                            type="time"
                            value={terminForm.uhrzeit}
                            onChange={e => setTerminForm(prev => prev ? { ...prev, uhrzeit: e.target.value } : null)}
                            className="px-2 py-1.5 rounded border text-sm"
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <button
                          onClick={handleTerminEintragen}
                          disabled={loading || !terminForm.datum}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                          style={{ backgroundColor: loading ? 'var(--border-medium)' : '#3b82f6' }}
                        >
                          {loading ? 'Speichern...' : 'Speichern'}
                        </button>
                        <button
                          onClick={() => setTerminForm(null)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Abbrechen
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Erledigte Aufgaben - Collapsible */}
              {erledigteAufgaben.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowErledigt(!showErledigt)}
                    className="text-sm font-medium flex items-center gap-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>{showErledigt ? '▼' : '▶'}</span>
                    Erledigt ({erledigteAufgaben.length})
                  </button>
                  {showErledigt && (
                    <div className="mt-2 space-y-2">
                      {erledigteAufgaben.map(aufgabe => (
                        <div
                          key={aufgabe.id}
                          className="rounded-lg border p-3 opacity-60"
                          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-light)' }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm line-through" style={{ color: 'var(--text-muted)' }}>
                              {TYP_ICONS[aufgabe.Typ?.value || ''] || '📌'} {aufgabe.Titel}
                            </span>
                            {aufgabe.Erledigt_am && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                ({new Date(aufgabe.Erledigt_am).toLocaleDateString('de-DE')})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
