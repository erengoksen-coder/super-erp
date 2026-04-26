'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useAgiAudio Hook
 * 
 * A procedural audio engine for the Agi-OS Platinum environment.
 * Generates ambient 'Space Hum' and interactive 'Particle Shimmers'.
 * 
 * Features:
 * - 0KB overheard (pure Web Audio API).
 * - Dynamic frequency modulation based on mouse movement.
 * - Handles browser auto-play policies automatically.
 */

export function useAgiAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const humOscRef = useRef<OscillatorNode | null>(null)
  
  const [isInitialized, setIsInitialized] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  // Initialize the audio context (must be triggered by user gesture)
  const initAudio = useCallback(async () => {
    if (audioCtxRef.current) {
        if (audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume()
        }
        return
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioContextClass()
    audioCtxRef.current = ctx

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.3, ctx.currentTime)
    masterGain.connect(ctx.destination)
    masterGainRef.current = masterGain

    // 1. Ambient 'Space Hum' (Drone)
    const humOsc = ctx.createOscillator()
    humOsc.type = 'sine'
    humOsc.frequency.setValueAtTime(55, ctx.currentTime) // Low A

    const humGain = ctx.createGain()
    humGain.gain.setValueAtTime(0.05, ctx.currentTime)
    
    // Low-Frequency Oscillator (LFO) for breathing effect
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.setValueAtTime(0.5, ctx.currentTime) // 0.5 Hertz
    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(0.02, ctx.currentTime)
    
    lfo.connect(lfoGain)
    lfoGain.connect(humGain.gain)
    
    humOsc.connect(humGain)
    humGain.connect(masterGain)
    
    humOsc.start()
    lfo.start()
    humOscRef.current = humOsc

    setIsInitialized(true)
  }, [])

  // Interactive 'Shimmer' Sound (Particles)
  const playPulse = useCallback((velocity: number) => {
    if (!audioCtxRef.current || isMuted || audioCtxRef.current.state !== 'running') return
    
    const ctx = audioCtxRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = 'sine'
    // Frequency based on movement intensity
    const freq = 400 + Math.min(velocity * 100, 2000)
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.1)
    
    gain.gain.setValueAtTime(0.02, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    
    osc.connect(gain)
    gain.connect(masterGainRef.current!)
    
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  }, [isMuted])

  // Mouse tracking to trigger pulses
  useEffect(() => {
    let lastX = 0
    let lastY = 0
    let lastTime = Date.now()

    const handleMouseMove = (e: MouseEvent) => {
        const now = Date.now()
        const dt = now - lastTime
        if (dt < 50) return // Throttle
        
        const dx = e.clientX - lastX
        const dy = e.clientY - lastY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const velocity = dist / dt
        
        if (velocity > 0.5) {
            playPulse(velocity)
        }
        
        lastX = e.clientX
        lastY = e.clientY
        lastTime = now
    }

    if (isInitialized && !isMuted) {
        window.addEventListener('mousemove', handleMouseMove)
    }

    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isInitialized, isMuted, playPulse])

  const toggleMute = () => {
    if (!masterGainRef.current) return
    const newMuted = !isMuted
    setIsMuted(newMuted)
    masterGainRef.current.gain.setTargetAtTime(newMuted ? 0 : 0.3, audioCtxRef.current!.currentTime, 0.1)
  }

  return { initAudio, toggleMute, isMuted, isInitialized }
}
