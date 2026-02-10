'use client'

import { useState } from 'react'
import { DRUM_BOOKS, formatBookName } from '@/lib/bookList'

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
  
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customBook, setCustomBook] = useState('')

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
    if (customBook.trim()) {
      onBookChange(customBook.trim())
      setCustomBook('')
      setShowCustomInput(false)
      onToggleEdit()
    }
  }

  if (showCustomInput) {
    return (
      <div>
        <input
          type="text"
          value={customBook}
          onChange={(e) => setCustomBook(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCustomBookSave()}
          className="w-full p-3 border-2 border-gray-300 rounded-lg font-medium text-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Anderes Buch eingeben..."
          autoFocus
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleCustomBookSave}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            ✓ Speichern
          </button>
          <button
            onClick={() => {
              setShowCustomInput(false)
              setCustomBook('')
              onToggleEdit()
            }}
            className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
          >
            ✖ Abbrechen
          </button>
        </div>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="relative">
        <select
          value={currentBook}
          onChange={handleSelectChange}
          onBlur={onToggleEdit}
          className="w-full p-3 border-2 border-gray-300 rounded-lg font-medium text-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer shadow-sm"
          autoFocus
        >
          <option value="" className="text-gray-500">
            Buch auswählen...
          </option>
          {DRUM_BOOKS.filter(book => book !== '').map((book) => (
            <option key={book} value={book} className="py-2">
              {book}
            </option>
          ))}
          
          <option value="__custom__" className="py-2 font-medium text-blue-600">
            ➕ Anderes Buch eingeben...
          </option>
        </select>
        
        {/* Info-Text */}
        <div className="text-xs text-gray-600 mt-1">
          Klicke auf ein Buch um es auszuwählen
        </div>
      </div>
    )
  }

  return (
    <div 
      className="cursor-pointer hover:bg-gray-200 p-3 rounded-lg border-2 border-dashed border-gray-300 font-medium text-lg transition-colors duration-200 min-h-[3rem] flex items-center"
      onClick={onToggleEdit}
    >
      <div className="flex items-center justify-between w-full">
        <span className={currentBook ? 'text-gray-900' : 'text-gray-500'}>
          {formatBookName(currentBook)}
        </span>
        <svg 
          className="w-5 h-5 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}