'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, Users, Factory } from 'lucide-react'
import { getRecentViews, type RecentViewItem } from '@/lib/recentViews'
import { Card, CardBody } from '@/components/ui/Card'

const TYPE_ICON = {
  account: Users,
  invoice: FileText,
  production: Factory,
}

const TYPE_LABEL = {
  account: 'Cari',
  invoice: 'Fatura',
  production: 'Üretim',
}

export function RecentViews() {
  const [items, setItems] = useState<RecentViewItem[]>([])

  useEffect(() => {
    setItems(getRecentViews())
  }, [])

  if (items.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        Son görüntülenenler
      </h2>
      <Card variant="elevated" className="overflow-hidden">
        <CardBody className="p-3">
          <ul className="space-y-1">
            {items.slice(0, 5).map((item) => {
              const Icon = TYPE_ICON[item.type]
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 text-sm text-slate-200 dark:text-slate-300 hover:text-white hover:bg-white/5 rounded px-2 py-1.5 -mx-2 transition"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="truncate" title={item.label}>
                      {item.label}
                    </span>
                    <span className="text-xs text-slate-500 shrink-0">{TYPE_LABEL[item.type]}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </CardBody>
      </Card>
    </section>
  )
}
