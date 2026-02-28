'use client'

import {
  getPresetDates,
  DATE_RANGE_PRESET_LABELS,
  type DateRangePreset,
} from '@/lib/utils/dateRangePresets'
import { cn } from '@/lib/cn'

export type ReportFiltersValue = {
  preset: DateRangePreset
  from: string
  to: string
  status?: string
  type?: string
}

type ReportFiltersProps = {
  value: ReportFiltersValue
  onChange: (v: ReportFiltersValue) => void
  showDateRange?: boolean
  statusOptions?: { value: string; label: string }[]
  typeOptions?: { value: string; label: string }[]
  statusLabel?: string
  typeLabel?: string
  className?: string
  /** Inline (flex row) vs stacked (grid with labels) */
  variant?: 'inline' | 'stacked'
}

const defaultPresetDates = () => {
  const { from, to } = getPresetDates('month')
  return { preset: 'month' as DateRangePreset, from, to }
}

export function getDefaultReportFilters(): ReportFiltersValue {
  return defaultPresetDates()
}

export function ReportFilters({
  value,
  onChange,
  showDateRange = true,
  statusOptions,
  typeOptions,
  statusLabel = 'Durum',
  typeLabel = 'Tip',
  className,
  variant = 'inline',
}: ReportFiltersProps) {
  const applyPreset = (p: DateRangePreset) => {
    if (p !== 'custom') {
      const { from, to } = getPresetDates(p)
      onChange({ ...value, preset: p, from, to })
    } else {
      onChange({ ...value, preset: p })
    }
  }

  const inputClass =
    'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm'

  if (variant === 'stacked') {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-4 gap-4', className)}>
        {showDateRange && (
          <>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Dönem</label>
              <select
                value={value.preset}
                onChange={(e) => applyPreset(e.target.value as DateRangePreset)}
                className={cn('w-full', inputClass)}
              >
                {(Object.keys(DATE_RANGE_PRESET_LABELS) as DateRangePreset[]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {DATE_RANGE_PRESET_LABELS[k]}
                    </option>
                  )
                )}
              </select>
            </div>
            {value.preset === 'custom' && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Başlangıç</label>
                  <input
                    type="date"
                    value={value.from}
                    onChange={(e) => onChange({ ...value, from: e.target.value })}
                    className={cn('w-full', inputClass)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Bitiş</label>
                  <input
                    type="date"
                    value={value.to}
                    onChange={(e) => onChange({ ...value, to: e.target.value })}
                    className={cn('w-full', inputClass)}
                  />
                </div>
              </>
            )}
          </>
        )}
        {statusOptions && statusOptions.length > 0 && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">{statusLabel}</label>
            <select
              value={value.status ?? ''}
              onChange={(e) => onChange({ ...value, status: e.target.value || undefined })}
              className={cn('w-full', inputClass)}
            >
              <option value="">Tümü</option>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {typeOptions && typeOptions.length > 0 && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">{typeLabel}</label>
            <select
              value={value.type ?? ''}
              onChange={(e) => onChange({ ...value, type: e.target.value || undefined })}
              className={cn('w-full', inputClass)}
            >
              <option value="">Tümü</option>
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {showDateRange && (
        <>
          <select
            value={value.preset}
            onChange={(e) => applyPreset(e.target.value as DateRangePreset)}
            className={inputClass}
          >
            {(Object.keys(DATE_RANGE_PRESET_LABELS) as DateRangePreset[]).map(
              (k) => (
                <option key={k} value={k}>
                  {DATE_RANGE_PRESET_LABELS[k]}
                </option>
              )
            )}
          </select>
          {value.preset === 'custom' && (
            <>
              <input
                type="date"
                value={value.from}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
                className={inputClass}
              />
              <span className="text-gray-500">–</span>
              <input
                type="date"
                value={value.to}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
                className={inputClass}
              />
            </>
          )}
        </>
      )}
      {statusOptions && statusOptions.length > 0 && (
        <select
          value={value.status ?? ''}
          onChange={(e) => onChange({ ...value, status: e.target.value || undefined })}
          className={inputClass}
          title={statusLabel}
        >
          <option value="">{statusLabel}: Tümü</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {typeOptions && typeOptions.length > 0 && (
        <select
          value={value.type ?? ''}
          onChange={(e) => onChange({ ...value, type: e.target.value || undefined })}
          className={inputClass}
          title={typeLabel}
        >
          <option value="">{typeLabel}: Tümü</option>
          {typeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
