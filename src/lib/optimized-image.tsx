import { useState, useEffect, useRef } from 'react'
import Image, { ImageProps } from 'next/image'

type OptimizedImageProps = Omit<ImageProps, 'placeholder' | 'blurDataURL'> & {
  priority?: boolean
  loading?: 'lazy' | 'eager'
}

export function OptimizedImage({ priority = false, loading = 'lazy', ...props }: OptimizedImageProps) {
  return (
    <Image
      {...props}
      priority={priority}
      loading={priority ? 'eager' : loading}
      quality={priority ? 85 : 75}
      sizes={props.sizes || '(max-width: 768px) 100vw, 50vw'}
    />
  )
}

export function AvatarImage({ src, alt, size = 40 }: { src: string | null | undefined, alt: string, size?: number }) {
  if (!src) {
    return (
      <div 
        className="rounded-full bg-gray-600 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg className="w-1/2 h-1/2 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15.49c8.038 0 11.952-5.81 11.952-12.458 0-.796-.07-1.566-.202-2.328C22.49 2.744 23.616 5.334 23.616 5.334c1.044.671 2.194 1.067 3.33 1.067 1.136 0 2.286-.396 3.33-1.067 0 0 .862-2.59 2.126-5.334a14.37 14.37 0 01-1.692-2.328c.132-.762.202-1.532.202-2.328 0-8.648-6.914-15.458-15.914-15.458-8.999 0-15.913 6.81-15.913 15.458 0 .796.07 1.566.202 2.328-1.094 1.742-2.126 5.334-2.126 5.334a14.976 14.976 0 01-4.336-1.328c1.046-.672 2.195-1.068 3.331-1.068 1.136 0 2.285.396 3.33 1.068 0 0 .862-2.59 2.126-5.334a14.37 14.37 0 01-1.692-2.328c.132-.762.202-1.532.202-2.328C5.696 5.81 12.61-.001 21.609-.001 38.61 0 43.523 6.81 43.523 15.458 0 .796-.07 1.566-.202 2.328"/>
        </svg>
      </div>
    )
  }
  
  return (
    <OptimizedImage 
      src={src} 
      alt={alt}
      width={size}
      height={size}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  )
}

export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-700/50 rounded ${className}`} />
}

export function LazySection({ children, threshold = 0.1 }: { children: React.ReactNode, threshold?: number }) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])

  return (
    <div ref={ref}>
      {isVisible ? children : <SkeletonBox className="h-64" />}
    </div>
  )
}