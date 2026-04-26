'use client'

let audioContext: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch {
      return null
    }
  }
  return audioContext
}

/** Kısa bildirim sesi; sayfa etkileşiminden sonra ses çalar (tarayıcı autoplay politikası). Ses yüksek (0.55) ve iki kısa bip. */
export function playNotificationSound() {
  const ctx = getContext()
  if (!ctx) return
  const play = () => {
    try {
      const t0 = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.55, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.12)
      osc.start(t0)
      osc.stop(t0 + 0.12)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.frequency.value = 1100
      osc2.type = 'sine'
      gain2.gain.setValueAtTime(0, t0 + 0.14)
      gain2.gain.linearRampToValueAtTime(0.5, t0 + 0.16)
      gain2.gain.exponentialRampToValueAtTime(0.01, t0 + 0.26)
      osc2.start(t0 + 0.14)
      osc2.stop(t0 + 0.26)
    } catch {
      // ignore
    }
  }
  try {
    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch(() => {})
    } else {
      play()
    }
  } catch {
    play()
  }
}
