'use client'

import { useEffect } from 'react'

export default function GlobalInputUppercase() {
    useEffect(() => {
        const handleInput = (e: Event) => {
            const target = e.target as HTMLInputElement | HTMLTextAreaElement
            if (
                (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
                !target.classList.contains('no-uppercase') &&
                target.type !== 'password' &&
                target.type !== 'email' &&
                target.type !== 'number' &&
                target.type !== 'date' &&
                target.type !== 'datetime-local' &&
                target.type !== 'time' &&
                target.type !== 'file' &&
                target.type !== 'hidden' &&
                target.type !== 'color' &&
                target.type !== 'range' &&
                target.type !== 'checkbox' &&
                target.type !== 'radio'
            ) {
                const start = target.selectionStart
                const end = target.selectionEnd

                // Türkçe karakter desteği ile büyük harfe çevir
                const upperValue = target.value.toLocaleUpperCase('tr-TR')

                if (target.value !== upperValue) {
                    target.value = upperValue

                    // İmleç konumunu koru (Re-render durumlarında gerekebilir)
                    if (start !== null && end !== null) {
                        target.setSelectionRange(start, end)
                        // React re-render sonrası imlecin başa dönmesini engellemek için rAF kullan
                        requestAnimationFrame(() => {
                            if (target.isConnected) {
                                target.setSelectionRange(start, end)
                            }
                        })
                    }

                    // React/Next/Vue gibi framework'lerin değişikliği algılaması için event tetikle
                    const event = new Event('input', { bubbles: true })
                    target.dispatchEvent(event)
                }
            }
        }

        document.addEventListener('input', handleInput, true)
        return () => document.removeEventListener('input', handleInput, true)
    }, [])

    return null
}
