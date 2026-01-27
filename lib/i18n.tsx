'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Language = 'tr' | 'en'

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

// Çeviri dosyalarını yükle
async function loadTranslations(lang: Language): Promise<Translations> {
  try {
    const module = await import(`@/locales/${lang}.json`)
    return module.default || module
  } catch (error) {
    console.warn(`Çeviri dosyası yüklenemedi: locales/${lang}.json`, error)
    return {}
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('tr')
  const [loadedTranslations, setLoadedTranslations] = useState<Record<Language, Translations>>({
    tr: {},
    en: {}
  })

  // Dil değiştiğinde çevirileri yükle
  useEffect(() => {
    if (!loadedTranslations[language] || Object.keys(loadedTranslations[language]).length === 0) {
      loadTranslations(language).then(trans => {
        setLoadedTranslations(prev => ({
          ...prev,
          [language]: trans
        }))
        translations[language] = trans
      })
    }
  }, [language, loadedTranslations])

  // İlk yüklemede Türkçe çevirileri yükle
  useEffect(() => {
    loadTranslations('tr').then(trans => {
      setLoadedTranslations(prev => ({
        ...prev,
        tr: trans
      }))
      translations.tr = trans
    })
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    // Dil tercihini localStorage'a kaydet
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang)
    }
  }

  // localStorage'dan dil tercihini yükle
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') as Language | null
      if (savedLang && (savedLang === 'tr' || savedLang === 'en')) {
        setLanguageState(savedLang)
      }
    }
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




