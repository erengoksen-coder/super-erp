'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { Plus, Clock, Save, Trash2 } from 'lucide-react'

export function ShiftManagement() {
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    start_time: '09:00',
    end_time: '18:00',
    break_minutes: 60,
    work_days: '1,2,3,4,5'
  })

  const loadShifts = async () => {
    try {
      const data = await fetchApi('/api/hr/shifts')
      setShifts(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error('Vardiyalar yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadShifts() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetchApi('/api/hr/shifts', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      toast.success('Vardiya şablonu oluşturuldu.')
      setShowNew(false)
      loadShifts()
    } catch (err: any) {
      toast.error(err.message || 'Hata oluştu.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" /> Vardiya Şablonları
        </h3>
        <Button size="sm" onClick={() => setShowNew(!showNew)}>
          <Plus className="w-4 h-4 mr-2" /> Yeni Şablon
        </Button>
      </div>

      {showNew && (
        <Card variant="outlined" className="bg-blue-500/5 border-blue-500/20">
          <CardBody>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="text-xs font-medium text-gray-400 mb-1 block">Şablon Adı</label>
                <Input 
                  placeholder="Örn: Standart Mesai" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Giriş Saati</label>
                <Input 
                  type="time" 
                  value={formData.start_time}
                  onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Çıkış Saati</label>
                <Input 
                  type="time" 
                  value={formData.end_time}
                  onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Mola (Dakika)</label>
                <Input 
                  type="number" 
                  value={formData.break_minutes}
                  onChange={e => setFormData({ ...formData, break_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="md:col-span-2 flex items-end gap-2">
                <Button type="submit" className="w-full">
                  <Save className="w-4 h-4 mr-2" /> Kaydet
                </Button>
                <Button variant="ghost" onClick={() => setShowNew(false)}>İptal</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shifts.map(shift => (
          <Card key={shift.id} variant="elevated">
            <CardBody className="p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-white">{shift.name}</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-tighter font-bold">
                  {shift.work_days === '1,2,3,4,5' ? 'Hafta İçi' : 'Özel'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{shift.start_time} - {shift.end_time}</span>
                </div>
                <div>Mola: {shift.break_minutes} dk</div>
              </div>
            </CardBody>
          </Card>
        ))}
        {shifts.length === 0 && !loading && (
          <div className="col-span-full py-8 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
            Henüz vardiya şablonu tanımlanmamış.
          </div>
        )}
      </div>
    </div>
  )
}
