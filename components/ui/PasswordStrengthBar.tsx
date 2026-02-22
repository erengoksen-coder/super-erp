'use client'

/**
 * Şifre gücü: uzunluk, büyük/küçük harf, rakam, özel karakter.
 * 0: Zayıf, 1: Zayıf, 2: Orta, 3: İyi, 4: Güçlü
 */
function getPasswordScore(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  return Math.min(4, score)
}

const LABELS = ['Zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü']
const COLORS = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-green-500']
const TEXT_COLORS = ['text-red-400', 'text-red-400', 'text-amber-400', 'text-lime-400', 'text-green-400']

export function PasswordStrengthBar({ password }: { password: string }) {
  const score = getPasswordScore(password)
  if (!password) return null
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? COLORS[score] : 'bg-gray-700'}`}
            aria-hidden
          />
        ))}
      </div>
      <p className={`text-xs ${TEXT_COLORS[score]}`}>
        Şifre gücü: {LABELS[score]}
        {score < 2 && password.length > 0 && ' (en az 8 karakter, büyük/küçük harf ve rakam önerilir)'}
      </p>
    </div>
  )
}
