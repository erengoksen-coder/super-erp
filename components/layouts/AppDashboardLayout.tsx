import React from 'react'
import { cn } from '@/lib/cn'
import { LucideIcon } from 'lucide-react'

interface Breadcrumb {
  label: string
  href?: string
}

interface AppDashboardLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  icon?: LucideIcon
  breadcrumbs?: Breadcrumb[]
  actions?: React.ReactNode
  className?: string
}

/**
 * Standart Dashboard Layout Bileşeni
 * 
 * Production Dashboard sayfasındaki layout yapısını tüm uygulamaya taşır
 * 
 * Özellikler:
 * - Tutarlı spacing (space-y-6)
 * - Standart başlık hiyerarşisi (h1: text-3xl font-bold)
 * - Breadcrumb desteği
 * - Action button'ları için alan
 * - Fade-in animasyonu
 * - Responsive tasarım
 */
export function AppDashboardLayout({
  children,
  title,
  subtitle,
  icon: Icon,
  breadcrumbs,
  actions,
  className
}: AppDashboardLayoutProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-gray-900 transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-gray-900 font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {Icon && (
            <div className="p-3 bg-primary/10 rounded-xl">
              <Icon className="w-8 h-8 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex items-center space-x-3">
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}

/**
 * Sayfa Başlığı Bileşeni (Standalone)
 */
interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {Icon && (
          <div className="p-3 bg-primary/10 rounded-xl">
            <Icon className="w-8 h-8 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center space-x-3">
          {actions}
        </div>
      )}
    </div>
  )
}

/**
 * Sayfa Section Bileşeni
 */
interface PageSectionProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
}

export function PageSection({ children, title, subtitle, className }: PageSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || subtitle) && (
        <div>
          {title && <h2 className="text-xl font-semibold text-gray-900">{title}</h2>}
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
