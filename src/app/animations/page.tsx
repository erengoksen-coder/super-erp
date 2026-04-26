'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AnimatedCounter, Typewriter, ParticleEffect, ProgressRing, ConfettiEffect } from '@/components/animations/AnimatedComponents'

export default function AnimationDemo() {
  const [counterValue, setCounterValue] = useState(0)
  const [showParticles, setShowParticles] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleCounterUpdate = useCallback(() => {
    setCounterValue(Math.floor(Math.random() * 1000))
    setShowParticles(true)
    setTimeout(() => setShowParticles(false), 1000)
  }, [])

  const handleConfetti = useCallback(() => {
    setShowConfetti(true)
    setProgress(100)
  }, [])

  const handleProgress = useCallback(() => {
    const newProgress = Math.min(progress + 20, 100)
    setProgress(newProgress)
    
    if (newProgress === 100) {
      handleConfetti()
    }
  }, [progress, handleConfetti])

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          <Typewriter
            text="Animation Components Showcase"
            speed={50}
            className="text-primary"
          />
        </h1>
        <p className="text-gray-600">
          Interactive demonstrations of the new animation system
        </p>
      </div>

      {/* Animated Counter Demo */}
      <Card className="hover-lift">
        <CardHeader
          title="Animated Counter"
          subtitle="Smooth number transitions with easing"
          actions={
            <Button onClick={handleCounterUpdate} variant="outline">
              Random Number
            </Button>
          }
        />
        <CardBody className="p-8 text-center">
          <div className="relative">
            <ParticleEffect trigger={showParticles} />
            <div className="text-6xl font-bold text-primary tabular-nums">
              <AnimatedCounter
                value={counterValue}
                duration={1000}
                prefix="₺"
                decimals={2}
              />
            </div>
            <p className="text-gray-500 mt-2">Current Value</p>
          </div>
        </CardBody>
      </Card>

      {/* Progress Ring Demo */}
      <Card className="hover-lift">
        <CardHeader
          title="Progress Ring"
          subtitle="Circular progress with smooth animation"
          actions={
            <Button onClick={handleProgress} variant="outline">
              Increase Progress
            </Button>
          }
        />
        <CardBody className="p-8 text-center">
          <div className="relative inline-block">
            <ConfettiEffect trigger={showConfetti} />
            <ProgressRing progress={progress} size={150} strokeWidth={12} />
          </div>
          <p className="text-gray-500 mt-4">Current Progress: {progress}%</p>
        </CardBody>
      </Card>

      {/* Typewriter Demo */}
      <Card className="hover-lift">
        <CardHeader
          title="Typewriter Effect"
          subtitle="Text appearing character by character"
        />
        <CardBody className="p-8 text-center">
          <Typewriter
            text="Welcome to the modern animation system!"
            speed={100}
            delay={500}
            className="text-2xl font-medium text-gray-800"
          />
        </CardBody>
      </Card>

      {/* Interactive Demo Grid */}
      <Card>
        <CardHeader
          title="Interactive Animations"
          subtitle="Click to trigger various effects"
        />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="solid"
              color="primary"
              onClick={handleCounterUpdate}
              className="hover-scale"
            >
              Counter Animation
            </Button>
            <Button
              variant="solid"
              color="success"
              onClick={handleProgress}
              className="hover-lift"
            >
              Progress Update
            </Button>
            <Button
              variant="solid"
              color="warning"
              onClick={handleConfetti}
              className="hover-rotate"
            >
              Confetti Burst
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Animation States Display */}
      <Card>
        <CardHeader
          title="Animation States"
          subtitle="Current animation system status"
        />
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Counter Value</span>
              <span className="text-primary font-bold">{counterValue}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Progress</span>
              <span className="text-primary font-bold">{progress}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Particles Active</span>
              <span className="text-primary font-bold">{showParticles ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Confetti Active</span>
              <span className="text-primary font-bold">{showConfetti ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}