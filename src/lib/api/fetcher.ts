export const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    const info = await res.json()
    ;(error as any).status = res.status
    ;(error as any).info = info
    throw error
  }
  const payload = await res.json()
  return payload.data // We typically wrap our responses in { data: ... }
}
