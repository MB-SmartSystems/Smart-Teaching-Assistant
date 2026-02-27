'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextType {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastId
    setToasts(prev => {
      const updated = [...prev, { id, message, type }]
      // Max 3 sichtbar
      return updated.slice(-3)
    })

    // Auto-dismiss nach 4s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const ctx: ToastContextType = {
    success: useCallback((msg: string) => addToast(msg, 'success'), [addToast]),
    error: useCallback((msg: string) => addToast(msg, 'error'), [addToast]),
    info: useCallback((msg: string) => addToast(msg, 'info'), [addToast]),
  }

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast Container - fixed unten rechts, z-[70] über allen Modals */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2" style={{ maxWidth: '360px' }}>
          {toasts.map(toast => (
            <div
              key={toast.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-slide-in"
              style={{
                backgroundColor:
                  toast.type === 'success' ? '#10b981' :
                  toast.type === 'error' ? '#ef4444' :
                  '#3b82f6',
                animation: 'slideIn 0.3s ease-out',
              }}
            >
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white/80 hover:text-white text-lg leading-none"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback wenn außerhalb von Provider (z.B. in Tests)
    return {
      success: (msg) => console.log('Toast success:', msg),
      error: (msg) => console.error('Toast error:', msg),
      info: (msg) => console.info('Toast info:', msg),
    }
  }
  return ctx
}
