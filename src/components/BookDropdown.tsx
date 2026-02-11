'use client'

import { useState, useEffect } from 'react'
import { getAllBooks, getAllBooksAsync, addCustomBook, isCustomBook, updateCustomBook } from '@/lib/dynamicBooks'

interface BookDropdownProps {
  currentBook: string
  onBookChange: (book: string) => void
  isEditing: boolean
  onToggleEdit: () => void
}

export default function BookDropdown({ 
  currentBook, 
  onBookChange, 
  isEditing, 
  onToggleEdit 
}: BookDropdownProps) {
  
  const [availableBooks, setAvailableBooks] = useState<string[]>([])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customBook, setCustomBook] = useState('')
  const [editingExistingBook, setEditingExistingBook] = useState<string | null>(null)
  const [editedBookName, setEditedBookName] = useState('')

  // Books beim Mount und bei Änderungen laden - FRESH aus DB
  useEffect(() => {
    // Sofort lokale Bücher laden für schnelle Anzeige
    setAvailableBooks(getAllBooks())
    
    // Dann fresh Bücher aus DB laden
    getAllBooksAsync().then(freshBooks => {
      setAvailableBooks(freshBooks)
    }).catch(error => {
      console.warn('Fehler beim Laden fresh books:', error)
    })
  }, [])

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBook = event.target.value
    
    if (selectedBook === '__custom__') {
      setShowCustomInput(true)
      setCustomBook('')
      return
    }
    
    onBookChange(selectedBook)
    onToggleEdit() // Schließe das Dropdown nach Auswahl
  }

  const handleCustomBookSave = () => {
    const trimmedBook = customBook.trim()
    if (trimmedBook) {
      // Füge zur globalen Liste hinzu
      addCustomBook(trimmedBook)
      
      // Update lokale Bücher-Liste mit fresh data
      getAllBooksAsync().then(freshBooks => {
        setAvailableBooks(freshBooks)
      })
      
      // Setze als aktuelles Buch
      onBookChange(trimmedBook)
      
      // Cleanup
      setCustomBook('')
      setShowCustomInput(false)
      onToggleEdit()
    }
  }

  const handleCancelCustom = () => {
    setShowCustomInput(false)
    setCustomBook('')
    onToggleEdit()
  }

  const handleEditExistingBook = (bookName: string) => {
    setEditingExistingBook(bookName)
    setEditedBookName(bookName)
  }

  const handleSaveEditedBook = () => {
    const trimmedName = editedBookName.trim()
    if (trimmedName && editingExistingBook) {
      const success = updateCustomBook(editingExistingBook, trimmedName)
      
      if (success) {
        // Update lokale Bücher-Liste
        getAllBooksAsync().then(freshBooks => {
          setAvailableBooks(freshBooks)
        })
        
        // Wenn das aktuell ausgewählte Buch bearbeitet wurde, aktualisiere es
        if (currentBook === editingExistingBook) {
          onBookChange(trimmedName)
        }
        
        // Cleanup
        setEditingExistingBook(null)
        setEditedBookName('')
        onToggleEdit()
      } else {
        alert('Fehler: Name bereits vorhanden oder Buch kann nicht bearbeitet werden')
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingExistingBook(null)
    setEditedBookName('')
    onToggleEdit()
  }

  const formatBookName = (book: string): string => {
    if (!book) return 'Kein Buch ausgewählt'
    return book
  }

  // Bearbeitung existierender Bücher
  if (editingExistingBook) {
    return (
      <div className="space-y-3">
        <input
          type="text"
          value={editedBookName}
          onChange={(e) => setEditedBookName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleSaveEditedBook()
            if (e.key === 'Escape') handleCancelEdit()
          }}
          className="w-full p-3 border-2 rounded-lg font-medium text-lg focus:outline-none focus:ring-2 focus:border-transparent shadow-sm"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--primary)',
            color: 'var(--text-primary)',
            '--tw-ring-color': 'var(--primary)'
          } as React.CSSProperties}
          placeholder="Buch-Namen bearbeiten..."
          autoFocus
        />
        
        <div className="flex gap-2">
          <button
            onClick={handleSaveEditedBook}
            disabled={!editedBookName.trim()}
            className="bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:cursor-not-allowed transition-colors"
          >
            ✓ Speichern
          </button>
          <button
            onClick={handleCancelEdit}
            className="btn-secondary px-4 py-2 text-sm"
          >
            ✖ Abbrechen
          </button>
        </div>
        
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded border-l-4 border-l-green-500">
          ✏️ Nur selbst hinzugefügte Bücher (⭐) können bearbeitet werden
        </div>
      </div>
    )
  }

  // Custom Input Anzeige
  if (showCustomInput) {
    return (
      <div className="space-y-3">
        <input
          type="text"
          value={customBook}
          onChange={(e) => setCustomBook(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleCustomBookSave()
            if (e.key === 'Escape') handleCancelCustom()
          }}
          className="w-full p-3 border-2 rounded-lg font-medium text-lg focus:outline-none focus:ring-2 focus:border-transparent shadow-sm"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--primary)',
            color: 'var(--text-primary)',
            '--tw-ring-color': 'var(--primary)'
          } as React.CSSProperties}
          placeholder="Neues Buch eingeben..."
          autoFocus
        />
        
        <div className="flex gap-2">
          <button
            onClick={handleCustomBookSave}
            disabled={!customBook.trim()}
            className="bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:cursor-not-allowed transition-colors"
          >
            ✓ Hinzufügen & Auswählen
          </button>
          <button
            onClick={handleCancelCustom}
            className="btn-secondary px-4 py-2 text-sm"
          >
            ✖ Abbrechen
          </button>
        </div>
        
        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border-l-4 border-l-blue-500">
          💡 Das neue Buch wird für <strong>alle Schüler</strong> verfügbar sein
        </div>
      </div>
    )
  }

  // Dropdown-Auswahl
  if (isEditing) {
    return (
      <div className="space-y-2">
        <select
          value={currentBook}
          onChange={handleSelectChange}
          onBlur={onToggleEdit}
          className="w-full p-3 border-2 rounded-lg font-medium text-lg focus:outline-none focus:ring-2 focus:border-transparent cursor-pointer shadow-sm"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-medium)',
            color: 'var(--text-primary)',
            '--tw-ring-color': 'var(--primary)'
          } as React.CSSProperties}
          autoFocus
        >
          <option value="" className="py-2" style={{ color: 'var(--text-muted)' }}>
            Buch auswählen...
          </option>
          
          {/* Basis-Bücher */}
          {availableBooks.map((book) => (
            <option key={book} value={book} className="py-2">
              {book} {isCustomBook(book) ? '⭐' : ''}
            </option>
          ))}
          
          <option disabled className="py-1 font-medium" style={{ color: 'var(--text-muted)' }}>
            ──────────────
          </option>
          
          <option value="__custom__" className="py-2 font-medium" style={{ color: 'var(--primary)' }}>
            ➕ Neues Buch hinzufügen
          </option>
        </select>
        
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          ⭐ = von dir hinzugefügtes Buch • Neue Bücher sind für alle Schüler verfügbar
        </div>
      </div>
    )
  }

  // Display-Modus
  return (
    <div 
      className="cursor-pointer p-3 rounded-lg border-2 border-dashed font-medium text-lg transition-colors duration-200 min-h-[3rem] flex items-center group"
      style={{
        backgroundColor: 'var(--accent-light)',
        borderColor: 'var(--border-medium)'
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
      onClick={onToggleEdit}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span style={{ color: currentBook ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {formatBookName(currentBook)}
          </span>
          {currentBook && isCustomBook(currentBook) && (
            <>
              <span className="text-yellow-600 text-sm">⭐</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditExistingBook(currentBook)
                }}
                className="text-green-600 hover:text-green-800 p-1 rounded text-sm transition-colors"
                title="Buch-Namen bearbeiten"
              >
                ✏️
              </button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <span className="text-sm">Klicken zum Ändern</span>
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  )
}