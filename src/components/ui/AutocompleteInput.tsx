'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, X, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface AutocompleteItem {
  id: string | number
  name: string
  code?: string
  subtitle?: string
  stock_amount?: number
  [key: string]: any
}

interface AutocompleteInputProps {
  options: AutocompleteItem[]
  onSelect: (item: AutocompleteItem) => void
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  isLoading?: boolean
  className?: string
  required?: boolean
  disabled?: boolean
  noResultsMessage?: string
  id?: string
  error?: string
  value?: string
}

const normalizeTurkish = (text: string) => {
  return text
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/İ/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase()
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  options = [],
  onSelect,
  onChange = () => {},
  placeholder = 'Aramak için yazın...',
  label,
  isLoading = false,
  className,
  required = false,
  disabled = false,
  noResultsMessage = 'Eşleşen kayıt bulunamadı',
  id,
  error,
  value = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteItem[]>([])
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const isFocused = useRef(false)

  // Dışarıdan gelen value değişirse
  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  // Arama filtresi
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options.slice(0, 50)) // İlk 50'yi göster
      return
    }

    const normSearch = normalizeTurkish(searchTerm)
    const filtered = options.filter(opt => 
      normalizeTurkish(opt.name).includes(normSearch) || 
      (opt.code && normalizeTurkish(opt.code).includes(normSearch))
    )
    setFilteredOptions(filtered.slice(0, 20))
    setActiveIndex(0)
  }, [searchTerm, options])

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') setIsOpen(true)
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredOptions[activeIndex]) {
          handleSelect(filteredOptions[activeIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  const handleSelect = (item: AutocompleteItem) => {
    setSearchTerm(item.name)
    onSelect(item)
    setIsOpen(false)
    setActiveIndex(0)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchTerm(val)
    onChange(val)
    setIsOpen(true)
    setActiveIndex(0)
  }

  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text
    const normText = normalizeTurkish(text)
    const normQuery = normalizeTurkish(query)
    const index = normText.indexOf(normQuery)
    
    if (index === -1) return text

    const before = text.substring(0, index)
    const match = text.substring(index, index + query.length)
    const after = text.substring(index + query.length)

    return (
      <>
        {before}
        <span className="text-blue-400 font-bold">{match}</span>
        {after}
      </>
    )
  }

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative group">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            isFocused.current = true
            setIsOpen(true)
          }}
          onBlur={() => {
            isFocused.current = false
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          placeholder={isLoading ? 'Yükleniyor...' : placeholder}
          disabled={disabled}
          className={cn(
            "w-full px-4 py-3 bg-gray-800/20 border rounded-xl text-gray-100 transition-all outline-none",
            "placeholder:text-gray-600 placeholder:italic",
            error 
              ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
              : "border-gray-800 hover:border-gray-700/50 focus:border-blue-500/50 focus:bg-gray-800/40 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)]",
            disabled && "opacity-50 cursor-not-allowed grayscale"
          )}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          ) : (
            <>
              {searchTerm && !disabled && (
                <button 
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    onChange('')
                    onSelect({ id: '', name: '' })
                    setIsOpen(true)
                    inputRef.current?.focus()
                  }}
                  className="p-1 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronDown className={cn(
                "w-4 h-4 text-gray-600 transition-transform duration-300",
                isOpen && "rotate-180"
              )} />
            </>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-[10px] mt-1.5 ml-1 font-medium">{error}</p>}

      {isOpen && !disabled && (
        <div 
          ref={suggestionsRef}
          className="absolute z-[100] w-full mt-2 bg-[#0B0E14] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="max-h-64 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-gray-800">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => (
                <div
                  key={opt.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(opt)
                  }}
                  className={cn(
                    "px-4 py-3 cursor-pointer rounded-xl transition-all duration-200 flex flex-col gap-0.5",
                    index === activeIndex 
                      ? "bg-blue-600/10 border border-blue-500/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]" 
                      : "border border-transparent hover:bg-white/5"
                  )}
                >
                  <div className="flex justify-between items-center gap-4">
                    <span className={cn(
                      "font-semibold text-sm truncate",
                      index === activeIndex ? "text-blue-400" : "text-gray-200"
                    )}>
                      {renderHighlightedText(opt.name, searchTerm)}
                    </span>
                    {opt.code && (
                      <span className={cn(
                        "text-[9px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider",
                        index === activeIndex ? "bg-blue-500/20 text-blue-300" : "bg-gray-800 text-gray-500"
                      )}>
                        {opt.code}
                      </span>
                    )}
                  </div>
                  {(opt.subtitle || opt.stock_amount !== undefined) && (
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 italic truncate">{opt.subtitle}</span>
                      {opt.stock_amount !== undefined && (
                        <span className={cn(
                          "font-mono",
                          opt.stock_amount > 0 ? "text-emerald-500/70" : "text-red-500/70"
                        )}>
                          Kalan: {opt.stock_amount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-6 py-10 text-center flex flex-col items-center gap-3">
                <div className="p-3 bg-gray-900 rounded-2xl border border-gray-800">
                  <Search className="w-5 h-5 text-gray-700" />
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{noResultsMessage}</p>
                  <p className="text-gray-600 text-[10px] italic">"{searchTerm}" için bir eşleşme bulamadık</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
