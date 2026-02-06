'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Target, ArrowLeft, Plus } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'
import { formatDate } from '@/lib/utils/dateFormat'

type Goal = {
  id: string
  employee_id: string
  employee_name: string
  title: string
  description: string | null
  target_value: string | null
  current_value: string | null
  period_start: string | null
  period_end: string | null
  status: string
}

type Review = {
  id: string
  employee_id: string
  employee_name: string
  period_start: string
  period_end: string
  rating: number | null
  comment: string | null
  created_at: string
}

type Employee = { id: string; full_name: string }

export default function HrPerformancePage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [goals, setGoals] = useState<Goal[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'goals' | 'reviews'>('goals')
  const [goalForm, setGoalForm] = useState({
    employee_id: '',
    title: '',
    description: '',
    target_value: '',
    period_start: '',
    period_end: '',
  })
  const [reviewForm, setReviewForm] = useState({
    employee_id: '',
    period_start: '',
    period_end: '',
    rating: 5,
    comment: '',
  })

  function load() {
    setLoading(true)
    Promise.all([
      fetchApi<Goal[]>(`/api/hr/performance/goals?year=${year}`),
      fetchApi<Review[]>(`/api/hr/performance/reviews?year=${year}`),
      fetchApi<Employee[]>('/api/hr/employees'),
    ])
      .then(([g, r, e]) => {
        setGoals(g)
        setReviews(r)
        setEmployees(e)
      })
      .catch((err) => toast.error(err?.message || 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [year])

  async function submitGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!goalForm.employee_id || !goalForm.title.trim()) {
      toast.warning('Çalışan ve hedef başlığı girin')
      return
    }
    try {
      await fetchApi('/api/hr/performance/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: goalForm.employee_id,
          title: goalForm.title.trim(),
          description: goalForm.description || undefined,
          target_value: goalForm.target_value || undefined,
          period_start: goalForm.period_start || undefined,
          period_end: goalForm.period_end || undefined,
        }),
      })
      toast.success('Hedef eklendi')
      setGoalForm({ employee_id: '', title: '', description: '', target_value: '', period_start: '', period_end: '' })
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Eklenemedi')
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!reviewForm.employee_id || !reviewForm.period_start || !reviewForm.period_end) {
      toast.warning('Çalışan ve dönem seçin')
      return
    }
    try {
      await fetchApi('/api/hr/performance/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: reviewForm.employee_id,
          period_start: reviewForm.period_start,
          period_end: reviewForm.period_end,
          rating: reviewForm.rating,
          comment: reviewForm.comment || undefined,
        }),
      })
      toast.success('Değerlendirme eklendi')
      setReviewForm({ employee_id: '', period_start: '', period_end: '', rating: 5, comment: '' })
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Eklenemedi')
    }
  }

  return (
    <AppDashboardLayout
      title="Performans"
      subtitle="Hedefler ve dönemsel değerlendirmeler"
      icon={Target}
      breadcrumbs={[{ label: 'İnsan Kaynakları', href: '/hr' }, { label: 'Performans' }]}
    >
      <div className="space-y-6">
        <div>
          <Link href="/hr" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            İnsan Kaynaklarına dön
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm text-gray-400">Yıl:</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="flex gap-2 border-b border-gray-700">
            {(['goals', 'reviews'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                  tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {t === 'goals' && 'Hedefler'}
                {t === 'reviews' && 'Değerlendirmeler'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <PageLoader fullScreen label="Yükleniyor..." />
        ) : (
          <>
            {tab === 'goals' && (
              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader title="Hedefler" />
                <CardBody className="space-y-4">
                  <form onSubmit={submitGoal} className="flex flex-wrap gap-3 p-3 rounded-lg bg-gray-800/50">
                    <select
                      value={goalForm.employee_id}
                      onChange={(e) => setGoalForm((f) => ({ ...f, employee_id: e.target.value }))}
                      className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm min-w-[160px]"
                      required
                    >
                      <option value="">Çalışan</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                      ))}
                    </select>
                    <input
                      placeholder="Hedef başlığı"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm((f) => ({ ...f, title: e.target.value }))}
                      className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm min-w-[180px]"
                    />
                    <input
                      placeholder="Hedef değer"
                      value={goalForm.target_value}
                      onChange={(e) => setGoalForm((f) => ({ ...f, target_value: e.target.value }))}
                      className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-28"
                    />
                    <input
                      type="date"
                      placeholder="Başlangıç"
                      value={goalForm.period_start}
                      onChange={(e) => setGoalForm((f) => ({ ...f, period_start: e.target.value }))}
                      className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm"
                    />
                    <input
                      type="date"
                      placeholder="Bitiş"
                      value={goalForm.period_end}
                      onChange={(e) => setGoalForm((f) => ({ ...f, period_end: e.target.value }))}
                      className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm"
                    />
                    <Button type="submit" size="sm"><Plus className="w-4 h-4 mr-1" />Ekle</Button>
                  </form>
                  {goals.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4">Hedef yok.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {goals.map((g) => (
                        <li key={g.id} className="flex justify-between items-start border-b border-gray-800 py-2">
                          <div>
                            <span className="font-medium text-white">{g.employee_name}</span>
                            <span className="text-gray-400 mx-2">·</span>
                            <span className="text-gray-200">{g.title}</span>
                            {g.target_value && <span className="text-gray-500 ml-2">({g.target_value})</span>}
                          </div>
                          <span className="text-gray-500 text-xs">
                            {g.period_start && formatDate(g.period_start)}
                            {g.period_end && ` - ${formatDate(g.period_end)}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            )}

            {tab === 'reviews' && (
              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader title="Değerlendirmeler" />
                <CardBody className="space-y-4">
                  <form onSubmit={submitReview} className="flex flex-wrap gap-3 p-3 rounded-lg bg-gray-800/50">
                    <select
                      value={reviewForm.employee_id}
                      onChange={(e) => setReviewForm((f) => ({ ...f, employee_id: e.target.value }))}
                      className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm min-w-[160px]"
                      required
                    >
                      <option value="">Çalışan</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={reviewForm.period_start}
                      onChange={(e) => setReviewForm((f) => ({ ...f, period_start: e.target.value }))}
                      className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm"
                      required
                    />
                    <input
                      type="date"
                      value={reviewForm.period_end}
                      onChange={(e) => setReviewForm((f) => ({ ...f, period_end: e.target.value }))}
                      className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm"
                      required
                    />
                    <select
                      value={reviewForm.rating}
                      onChange={(e) => setReviewForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                      className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-20"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <input
                      placeholder="Yorum"
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                      className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm flex-1 min-w-[120px]"
                    />
                    <Button type="submit" size="sm"><Plus className="w-4 h-4 mr-1" />Ekle</Button>
                  </form>
                  {reviews.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4">Değerlendirme yok.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {reviews.map((r) => (
                        <li key={r.id} className="flex justify-between items-start border-b border-gray-800 py-2">
                          <div>
                            <span className="font-medium text-white">{r.employee_name}</span>
                            <span className="text-gray-400 mx-2">·</span>
                            <span className="text-amber-400">{r.rating != null ? `${r.rating}/5` : '-'}</span>
                            {r.comment && <span className="text-gray-400 ml-2 truncate max-w-[200px]">{r.comment}</span>}
                          </div>
                          <span className="text-gray-500 text-xs">
                            {formatDate(r.period_start)} - {formatDate(r.period_end)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            )}
          </>
        )}
      </div>
    </AppDashboardLayout>
  )
}
