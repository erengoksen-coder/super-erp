import React from 'react'
import { cn } from '@/lib/cn'
import { LucideIcon } from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'

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

import { Clock } from '@/components/ui/Clock'

/**
 * Standart Dashboard Layout Bileşeni
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
  const isDashboardHeader = title.includes('Hoş Geldin') || title === 'Kontrol Paneli' || title === 'Dashboard' || title.includes('İyi') || title.includes('Günaydın');

  return (
    <div className={cn("space-y-6 animate-fade-in", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-300">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-gray-900 dark:hover:text-slate-100 transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-gray-900 dark:text-slate-100 font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Header */}
      <div className={`relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 mb-6 px-4 sm:px-6 lg:px-8 py-8 ${isDashboardHeader ? 'bg-[url("/dashboard-bg.png")] bg-cover bg-center overflow-hidden' : 'bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-900/40 border-b border-slate-700/50 shadow-sm'}`}>
        {isDashboardHeader && <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" />}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {Icon && (
              <div className={cn(
                "p-3 rounded-xl flex items-center justify-center shrink-0 border",
                isDashboardHeader
                  ? "bg-blue-500/20 text-blue-400 backdrop-blur-md shadow-lg shadow-blue-500/10 border-blue-500/30"
                  : "bg-gradient-to-br from-indigo-500/20 to-blue-500/10 text-indigo-400 shadow-inner border-indigo-500/20"
              )}>
                <Icon className="w-8 h-8 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-md tracking-tight">{title}</h1>
              <div className="mt-3 flex items-center gap-3">
                {subtitle && (
                  <>
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-inner backdrop-blur-md transition-all",
                      /^\d{2}\.\d{2}\.\d{4}$/.test(subtitle)
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-slate-500/10 border-slate-500/20"
                    )}>
                      <span className={cn(
                        "text-[15px] font-bold tracking-widest",
                        /^\d{2}\.\d{2}\.\d{4}$/.test(subtitle)
                          ? "text-emerald-400 font-mono drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          : "text-slate-300"
                      )}>
                        {subtitle}
                      </span>
                      {/^\d{2}\.\d{2}\.\d{4}$/.test(subtitle) && (
                        <>
                          <div className="w-px h-4 bg-slate-700/50 mx-1" />
                          <span className="text-[11px] font-black text-amber-500/90 uppercase tracking-[0.15em] drop-shadow-[0_0_5px_rgba(245,158,11,0.4)]">
                            {new Date(subtitle.split('.').reverse().join('-')).toLocaleDateString('tr-TR', { weekday: 'short' })}
                          </span>
                        </>
                      )}
                    </div>
                  </>
                )}
                <Clock />
              </div>
            </div>
          </div>

          {/* Actions + Notifications */}
          <div className="flex items-center space-x-3">
            <NotificationBell />
            {actions}
          </div>
        </div>
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
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/20 shadow-inner rounded-xl">
            <Icon className="w-8 h-8 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">{title}</h1>
          {subtitle && (
            <p className="text-slate-400 font-medium tracking-wide mt-1.5">{subtitle}</p>
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
          {title && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>}
          {subtitle && <p className="text-gray-600 dark:text-slate-200 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
