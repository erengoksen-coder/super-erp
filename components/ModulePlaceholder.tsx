'use client'

import { Card, CardBody } from '@/components/ui/Card'

type ModulePlaceholderProps = {
  title: string
  description: string
  features: string[]
}

export default function ModulePlaceholder({ title, description, features }: ModulePlaceholderProps) {
  return (
    <Card className="bg-slate-900/70 border border-slate-800">
      <CardBody className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-300 mt-1">{description}</p>
        </div>
        <ul className="grid gap-2 text-sm text-slate-200">
          {features.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400">
          Bu modül için API ve veri modeli henüz tanımlı değil.
        </p>
      </CardBody>
    </Card>
  )
}
