import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, object>({
  max: 500,
  ttl: 60_000,
})

export async function getOrSetCache<T>(
  key: string,
  ttlMs: number,
  resolver: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key) as T | undefined
  if (cached !== undefined) {
    return cached
  }
  const value = await resolver()
  cache.set(key, value as object, { ttl: ttlMs })
  return value
}

export function clearCache(prefix?: string) {
  if (!prefix) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}
