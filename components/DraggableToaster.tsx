'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Toaster } from 'sonner'

const STORAGE_KEY = 'super-erp-toast-position'
const DEFAULT_TOP = 16
const DEFAULT_RIGHT = 16

function loadPosition(): { top: number; right: number } {
  if (typeof window === 'undefined') return { top: DEFAULT_TOP, right: DEFAULT_RIGHT }
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) {
      const p = JSON.parse(s) as { top?: number; right?: number }
      if (typeof p.top === 'number' && typeof p.right === 'number') return { top: p.top, right: p.right }
    }
  } catch {}
  return { top: DEFAULT_TOP, right: DEFAULT_RIGHT }
}

function savePosition(top: number, right: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ top, right }))
  } catch {}
}

export default function DraggableToaster() {
  const [pos, setPos] = useState(loadPosition)
  const [isDragging, setIsDragging] = useState(false)
  const startRef = useRef({ x: 0, y: 0, top: 0, right: 0 })
  const boxRef = useRef<HTMLDivElement>(null)

  const startDrag = useCallback((clientX: number, clientY: number) => {
    startRef.current = { x: clientX, y: clientY, top: pos.top, right: pos.right }
    setIsDragging(true)
  }, [pos.top, pos.right])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
  }, [startDrag])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    if (t) startDrag(t.clientX, t.clientY)
  }, [startDrag])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e) e.preventDefault()
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY
      if (clientX == null || clientY == null) return
      const dx = clientX - startRef.current.x
      const dy = clientY - startRef.current.y
      setPos((prev) => {
        const top = Math.max(0, Math.min(prev.top + dy, typeof window !== 'undefined' ? window.innerHeight - 80 : prev.top + dy))
        const right = Math.max(0, Math.min(prev.right - dx, typeof window !== 'undefined' ? window.innerWidth - 60 : prev.right - dx))
        return { top, right }
      })
    }
    const onUp = () => {
      setIsDragging(false)
      setPos((prev) => {
        savePosition(prev.top, prev.right)
        return prev
      })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
    }
  }, [isDragging])

  return (
    <>
      <style>{`
        [data-draggable-toaster] [data-sonner-toaster] {
          position: absolute !important;
          top: 0 !important;
          right: 0 !important;
          left: auto !important;
          bottom: auto !important;
        }
      `}</style>
      <div
        ref={boxRef}
        data-draggable-toaster
        className="fixed z-[999999999] select-none flex flex-col items-end"
        style={{
          top: pos.top,
          right: pos.right,
          left: 'auto',
          bottom: 'auto',
        }}
      >
        <div className="relative">
          <Toaster
            richColors
            position="top-right"
            closeButton
            toastOptions={{
              style: { marginTop: 0 },
            }}
          />
        </div>
        <button
          type="button"
          aria-label="Bildirimleri taşı"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="mt-1 flex h-11 w-11 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center rounded-full border-2 border-white bg-transparent text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] hover:shadow-[0_0_16px_rgba(168,85,247,0.6)] touch-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          title="Sürükleyerek taşıyın"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
    </>
  )
}
