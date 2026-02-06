'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Briefcase, ArrowLeft, Plus, UserPlus } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'

type Opening = {
  id: string
  title: string
  department_id: string | null
  department_name: string | null
  location: string | null
  description: string | null
  status: string
  created_at: string
}

type Candidate = {
  id: string
  job_opening_id: string
  job_title: string
  full_name: string
  email: string | null
  phone: string | null
  status: string
  notes: string | null
  created_at: string
}

type Department = { id: string; name: string }

const STATUS_LABELS: Record<string, string> = {
  applied: 'Başvurdu',
  interview: 'Mülakat',
  offer: 'Teklif',
  rejected: 'Reddedildi',
}

export default function HrRecruitmentPage() {
  const [openings, setOpenings] = useState<Opening[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState({ title: '', department_id: '', location: '', description: '' })
  const [candForm, setCandForm] = useState({ job_opening_id: '', full_name: '', email: '', phone: '', notes: '' })
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    Promise.all([
      fetchApi<Opening[]>('/api/hr/recruitment/openings'),
      fetchApi<Candidate[]>(selectedJobId ? `/api/hr/recruitment/candidates?job_opening_id=${selectedJobId}` : '/api/hr/recruitment/candidates'),
      fetchApi<Department[]>('/api/hr/departments'),
    ])
      .then(([o, c, d]) => {
        setOpenings(o)
        setCandidates(c)
        setDepartments(d)
      })
      .catch((err) => toast.error(err?.message || 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [selectedJobId])

  async function createOpening(e: React.FormEvent) {
    e.preventDefault()
    if (!openForm.title.trim()) {
      toast.warning('Pozisyon adı girin')
      return
    }
    try {
      await fetchApi('/api/hr/recruitment/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(openForm),
      })
      toast.success('İlan eklendi')
      setOpenForm({ title: '', department_id: '', location: '', description: '' })
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Eklenemedi')
    }
  }

  async function createCandidate(e: React.FormEvent) {
    e.preventDefault()
    if (!candForm.job_opening_id || !candForm.full_name.trim()) {
      toast.warning('İlan ve aday adı seçin')
      return
    }
    try {
      await fetchApi('/api/hr/recruitment/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candForm),
      })
      toast.success('Aday eklendi')
      setCandForm((f) => ({ ...f, full_name: '', email: '', phone: '', notes: '' }))
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Eklenemedi')
    }
  }

  async function updateCandidateStatus(candId: string, status: string) {
    try {
      await fetchApi(`/api/hr/recruitment/candidates/${candId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      toast.success('Durum güncellendi')
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Güncellenemedi')
    }
  }

  const filteredCandidates = selectedJobId ? candidates.filter((c) => c.job_opening_id === selectedJobId) : candidates

  return (
    <AppDashboardLayout
      title="İşe Alım"
      subtitle="Açık pozisyonlar ve adaylar"
      icon={Briefcase}
      breadcrumbs={[{ label: 'İnsan Kaynakları', href: '/hr' }, { label: 'İşe Alım' }]}
    >
      <div className="space-y-6">
        <div>
          <Link href="/hr" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            İnsan Kaynaklarına dön
          </Link>
        </div>

        {loading ? (
          <PageLoader fullScreen label="Yükleniyor..." />
        ) : (
          <>
            <Card className="bg-gray-900 border border-gray-800">
              <CardHeader title="Açık pozisyonlar" />
              <CardBody className="space-y-4">
                <form onSubmit={createOpening} className="flex flex-wrap gap-3 p-3 rounded-lg bg-gray-800/50">
                  <input
                    placeholder="Pozisyon adı"
                    value={openForm.title}
                    onChange={(e) => setOpenForm((f) => ({ ...f, title: e.target.value }))}
                    className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm min-w-[180px]"
                  />
                  <select
                    value={openForm.department_id}
                    onChange={(e) => setOpenForm((f) => ({ ...f, department_id: e.target.value }))}
                    className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm min-w-[140px]"
                  >
                    <option value="">Departman</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Lokasyon"
                    value={openForm.location}
                    onChange={(e) => setOpenForm((f) => ({ ...f, location: e.target.value }))}
                    className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-32"
                  />
                  <Button type="submit" size="sm"><Plus className="w-4 h-4 mr-1" />İlan ekle</Button>
                </form>
                <ul className="space-y-2">
                  {openings.map((o) => (
                    <li key={o.id} className="flex items-center justify-between border-b border-gray-800 py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(selectedJobId === o.id ? null : o.id)}
                        className={`text-left flex-1 ${selectedJobId === o.id ? 'text-blue-400' : 'text-gray-200'}`}
                      >
                        <span className="font-medium">{o.title}</span>
                        {o.department_name && <span className="text-gray-500 ml-2">({o.department_name})</span>}
                        <span className={`ml-2 text-xs ${o.status === 'open' ? 'text-green-400' : 'text-gray-500'}`}>
                          {o.status === 'open' ? 'Açık' : 'Kapalı'}
                        </span>
                      </button>
                    </li>
                  ))}
                  {!openings.length && <li className="text-gray-400 text-sm">İlan yok.</li>}
                </ul>
              </CardBody>
            </Card>

            <Card className="bg-gray-900 border border-gray-800">
              <CardHeader
                title="Adaylar"
                subtitle={selectedJobId ? openings.find((o) => o.id === selectedJobId)?.title : 'Tümü'}
              />
              <CardBody className="space-y-4">
                <form onSubmit={createCandidate} className="flex flex-wrap gap-3 p-3 rounded-lg bg-gray-800/50">
                  <select
                    value={candForm.job_opening_id}
                    onChange={(e) => setCandForm((f) => ({ ...f, job_opening_id: e.target.value }))}
                    className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm min-w-[180px]"
                    required
                  >
                    <option value="">İlan seçin</option>
                    {openings.filter((o) => o.status === 'open').map((o) => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Ad Soyad"
                    value={candForm.full_name}
                    onChange={(e) => setCandForm((f) => ({ ...f, full_name: e.target.value }))}
                    className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm min-w-[140px]"
                  />
                  <input
                    placeholder="E-posta"
                    value={candForm.email}
                    onChange={(e) => setCandForm((f) => ({ ...f, email: e.target.value }))}
                    className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm min-w-[160px]"
                  />
                  <input
                    placeholder="Telefon"
                    value={candForm.phone}
                    onChange={(e) => setCandForm((f) => ({ ...f, phone: e.target.value }))}
                    className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-32"
                  />
                  <Button type="submit" size="sm"><UserPlus className="w-4 h-4 mr-1" />Aday ekle</Button>
                </form>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-800">
                        <th className="py-2">Aday</th>
                        <th className="py-2">İlan</th>
                        <th className="py-2">İletişim</th>
                        <th className="py-2">Durum</th>
                        <th className="py-2 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((c) => (
                        <tr key={c.id} className="border-b border-gray-800 text-gray-200">
                          <td className="py-2 font-medium">{c.full_name}</td>
                          <td className="py-2">{c.job_title}</td>
                          <td className="py-2">{c.email || c.phone || '—'}</td>
                          <td className="py-2">{STATUS_LABELS[c.status] || c.status}</td>
                          <td className="py-2 text-right">
                            <select
                              value={c.status}
                              onChange={(e) => updateCandidateStatus(c.id, e.target.value)}
                              className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-white text-xs"
                            >
                              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                      {!filteredCandidates.length && (
                        <tr><td colSpan={5} className="py-4 text-center text-gray-400">Aday yok.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </AppDashboardLayout>
  )
}
