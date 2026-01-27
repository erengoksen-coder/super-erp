import React from 'react'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

// Logo with background (black rectangle) - Text based for better readability
export function LogoWithBackground({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-10 px-4 text-lg',
    md: 'h-14 px-6 text-xl',
    lg: 'h-20 px-8 text-3xl',
  }

  return (
    <div className={`bg-black flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      <span className="text-white font-bold tracking-wider">LIVASOFA</span>
    </div>
  )
}

// SVG Logo (backup)
export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 350 70"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* L - Block capital */}
        <rect x="5" y="5" width="12" height="60" fill="white" />
        <rect x="5" y="58" width="35" height="12" fill="white" />
        
        {/* I - with tittle on top */}
        <rect x="50" y="5" width="12" height="60" fill="white" />
        <rect x="45" y="5" width="22" height="6" fill="white" />
        <rect x="45" y="59" width="22" height="6" fill="white" />
        <line x1="50" y1="5" x2="65" y2="5" stroke="white" strokeWidth="2" />
        
        {/* V - Double line effect */}
        <path d="M80 5 L100 65 M85 5 L105 65" stroke="white" strokeWidth="9" strokeLinecap="round" />
        
        {/* A - Double line with crossbar */}
        <path d="M120 65 L115 5 M120 65 L125 5 M110 38 L130 38" stroke="white" strokeWidth="9" strokeLinecap="round" />
        
        {/* S - Angular/block style */}
        <path d="M145 5 L170 5 L170 22 L145 22 L145 38 L170 38 L170 54 L145 54 L145 65 L170 65" 
              stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        
        {/* O - Squared with diagonal line */}
        <rect x="185" y="5" width="35" height="60" stroke="white" strokeWidth="9" fill="none" />
        <line x1="185" y1="5" x2="220" y2="35" stroke="white" strokeWidth="6" />
        
        {/* F - Angular */}
        <rect x="235" y="5" width="10" height="60" fill="white" />
        <rect x="235" y="5" width="35" height="10" fill="white" />
        <rect x="235" y="32" width="25" height="10" fill="white" />
        
        {/* A - Double line (second) */}
        <path d="M285 65 L280 5 M285 65 L290 5 M275 38 L295 38" stroke="white" strokeWidth="9" strokeLinecap="round" />
      </svg>
    </div>
  )
}
