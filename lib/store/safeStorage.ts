import type { StateStorage } from 'zustand/middleware'

const memoryStorage = (() => {
  const store = new Map<string, string>()
  return {
    getItem: (name: string) => store.get(name) ?? null,
    setItem: (name: string, value: string) => {
      store.set(name, value)
    },
    removeItem: (name: string) => {
      store.delete(name)
    },
  } satisfies StateStorage
})()

export function getSafeStorage(): StateStorage {
  if (typeof window === 'undefined') return memoryStorage
  
  // Check if cookies are available and working
  try {
    const testKey = '__storage_test__'
    const testValue = 'test'
    
    // Test localStorage
    window.localStorage.setItem(testKey, testValue)
    const localStorageValue = window.localStorage.getItem(testKey)
    window.localStorage.removeItem(testKey)
    
    if (localStorageValue === testValue) {
      return window.localStorage
    }
  } catch {
    // localStorage failed, use memory storage
  }
  
  return memoryStorage
}
