'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { usePreferencesStore, type Language } from '@/lib/store/preferencesStore'

interface Translations {
  [key: string]: string | Translations
}

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

// Çeviri dosyalarını dinamik olarak yükle
const translations: Record<Language, Translations> = {
  tr: {},
  en: {}
}

// Çeviri dosyalarını public/locales üzerinden yükle (ChunkLoadError önlenir)
async function loadTranslations(lang: Language): Promise<Translations> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/locales/${lang}.json`, { cache: 'no-store' })
      if (!res.ok) return {}
      const data = await res.json()
      return (data && typeof data === 'object') ? data : {}
    } catch {
      return {}
    }
  }
  return {}
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const language = usePreferencesStore((state) => state.language)
  const setLanguage = usePreferencesStore((state) => state.setLanguage)
  const [loadedTranslations, setLoadedTranslations] = useState<Record<Language, Translations>>({
    tr: {},
    en: {}
  })

  // Dil değiştiğinde çevirileri yükle
  useEffect(() => {
    // Zaten yüklüyse veya yüklenen bir şey gelmişse tekrar deneme
    if (Object.keys(loadedTranslations[language]).length > 0) return

    let active = true
    loadTranslations(language).then(trans => {
      if (!active) return
      // Boş olsa bile yüklendiğini işaretlemek için sembolik bir alan ekleyebiliriz
      // veya sadece trans'ın kendisini atayabiliriz.
      // Eğer trans boş gelse bile bir kere denediğimizi bilmeliyiz.
      setLoadedTranslations(prev => ({
        ...prev,
        [language]: Object.keys(trans).length > 0 ? trans : { __loaded: "true" }
      }))
      translations[language] = trans
    })
    return () => { active = false }
  }, [language])

  // İlk yüklemede Türkçe çevirileri yükle (eğer varsayılan TR ise yukarıdaki de yapacak ama güvenlik için)
  useEffect(() => {
    if (language === 'tr') return // Zaten yukarıdaki useEffect halleder
    loadTranslations('tr').then(trans => {
      setLoadedTranslations(prev => ({
        ...prev,
        tr: Object.keys(trans).length > 0 ? trans : { __loaded: "true" }
      }))
      translations.tr = trans
    })
  }, [])

  const t = (key: string, params?: Record<string, string | number>): string => {
    const currentTranslations = loadedTranslations[language] || translations[language] || {}

    // Nokta notasyonu ile nested key'leri destekle (örn: "common.save")
    const keys = key.split('.')
    let value: any = currentTranslations

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Çeviri bulunamazsa key'i döndür
        return key
      }
    }

    if (typeof value !== 'string') {
      return key
    }

    // Parametreleri değiştir (örn: "Merhaba {name}" -> "Merhaba Ahmet")
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match
      })
    }

    return value
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}




