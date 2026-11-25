'use client'

import { useEffect, useState } from 'react'
import type { DBService } from '@/types'
import { ConfirmDialog, EmptyState, Field, Sheet, btn, cardCls, iconBtn, inputCls } from './ui'

type ServiceDraft = Pick<DBService, 'name_eng' | 'name_kor' | 'desc_eng' | 'desc_kor' | 'sm_price' | 'md_price' | 'lg_price' | 'duration'>

const EMPTY_DRAFT: ServiceDraft = {
  name_eng: '', name_kor: '', desc_eng: '', desc_kor: '', sm_price: 0, md_price: 0, lg_price: 0, duration: 180,
}

function toDraft(s: DBService): ServiceDraft {
  return {
    name_eng: s.name_eng ?? '',
    name_kor: s.name_kor ?? '',
    desc_eng: s.desc_eng ?? '',
    desc_kor: s.desc_kor ?? '',
    sm_price: s.sm_price ?? 0,
    md_price: s.md_price ?? 0,
    lg_price: s.lg_price ?? 0,
    duration: s.duration ?? 180,
  }
}

function formatDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}

async function patchService(id: number, d: ServiceDraft) {
  const res = await fetch('/api/admin/services', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    // duration must always be sent — the API derives `slots` from it.
    body: JSON.stringify({ id, ...d }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Failed to save')
  return data.service as DBService
}

export default function ServicesPanel() {
  const [services, setServices] = useState<DBService[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState<DBService | 'new' | null>(null)
  const [orderState, setOrderState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/services')
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        setServices(
          (json.services ?? [])
            .map((d: DBService) => ({ ...d, order: d.order ?? 0 }))
            .sort((a: DBService, b: DBService) => a.order - b.order),
        )
      })
      .catch(() => !cancelled && setLoadError("Couldn't load services."))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  async function persistOrder(list: DBService[]) {
    setOrderState('saving')
    try {
      const res = await fetch('/api/admin/services/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: list.map((s, i) => ({ id: s.id, order: i })) }),
      })
      if (!res.ok) throw new Error()
      setOrderState('saved')
      setTimeout(() => setOrderState(s => (s === 'saved' ? 'idle' : s)), 2500)
    } catch {
      setOrderState('error')
    }
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= services.length) return
    const next = [...services]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    const withOrder = next.map((s, i) => ({ ...s, order: i }))
    setServices(withOrder)
    persistOrder(withOrder)
  }

  function endDrag() {
    if (dragIndex !== null && overIndex !== null) move(dragIndex, overIndex)
    setDragIndex(null)
    setOverIndex(null)
  }

  if (loading) return <p className="p-8 text-sm text-text-secondary">Loading services…</p>
  if (loadError) return <p className="p-8 text-sm text-red-500">{loadError}</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-text-secondary flex-1">
          {orderState === 'idle' ? (
            'Prices by dog size and appointment length. Drag or use the arrows to change the order customers see.'
          ) : (
            <span className={`font-bold ${orderState === 'error' ? 'text-red-500' : 'text-text-primary'}`} role="status">
              {orderState === 'saving' ? 'Saving order…' : orderState === 'saved' ? (
                <><i className="ti ti-check text-green-600" aria-hidden="true" /> Order saved</>
              ) : "Couldn't save the new order. Reload and try again."}
            </span>
          )}
        </p>
        <button onClick={() => setEditing('new')} className={btn.primary}>
          <i className="ti ti-plus" aria-hidden="true" /> <span className="hidden sm:inline">Add service</span><span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className={`${cardCls} overflow-hidden`}>
        {services.length === 0 ? (
          <EmptyState icon="ti-scissors" title="Add your first service" body="Services appear on the booking page in this order." />
        ) : (
          <ul className="divide-y divide-border">
            {services.map((s, i) => (
              <li
                key={s.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={e => { e.preventDefault(); if (overIndex !== i) setOverIndex(i) }}
                onDrop={e => { e.preventDefault(); endDrag() }}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null) }}
                className={`flex items-center gap-2 pl-1.5 pr-2 sm:px-3 py-2.5 transition-colors ${
                  dragIndex === i ? 'opacity-40' : 'hover:bg-surface'
                } ${overIndex === i && dragIndex !== null && dragIndex !== i ? 'shadow-[inset_0_2px_0_0_var(--color-brand)]' : ''}`}
              >
                <span className="hidden md:flex w-6 h-10 items-center justify-center text-text-muted cursor-grab active:cursor-grabbing" aria-hidden="true">
                  <i className="ti ti-grip-vertical" />
                </span>
                <div className="flex flex-col md:hidden">
                  <button onClick={() => move(i, i - 1)} disabled={i === 0} className={`${iconBtn} !h-8`} aria-label={`Move ${s.name_eng} up`}>
                    <i className="ti ti-chevron-up" />
                  </button>
                  <button onClick={() => move(i, i + 1)} disabled={i === services.length - 1} className={`${iconBtn} !h-8`} aria-label={`Move ${s.name_eng} down`}>
                    <i className="ti ti-chevron-down" />
                  </button>
                </div>

                <button onClick={() => setEditing(s)} className="min-w-0 flex-1 text-left py-1">
                  <p className="font-nunito font-bold text-[15px] text-text-primary truncate">
                    {s.name_eng}
                    {s.name_kor && <span className="font-normal text-text-secondary text-sm"> · {s.name_kor}</span>}
                  </p>
                  {s.desc_eng && <p className="text-xs text-text-secondary line-clamp-1">{s.desc_eng}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {([['S', s.sm_price], ['M', s.md_price], ['L', s.lg_price]] as const).map(([k, v]) => (
                      <span key={k} className="text-[11px] font-bold font-nunito bg-surface-secondary text-text-primary rounded-full px-2 py-0.5">
                        {k} ${v ?? 0}
                      </span>
                    ))}
                    <span className="text-[11px] font-bold font-nunito bg-brand-pale text-brand rounded-full px-2 py-0.5">
                      <i className="ti ti-clock" aria-hidden="true" /> {formatDuration(s.duration ?? 180)}
                    </span>
                  </div>
                </button>

                <div className="hidden md:flex items-center">
                  <button onClick={() => move(i, i - 1)} disabled={i === 0} className={iconBtn} aria-label={`Move ${s.name_eng} up`}>
                    <i className="ti ti-arrow-up" />
                  </button>
                  <button onClick={() => move(i, i + 1)} disabled={i === services.length - 1} className={iconBtn} aria-label={`Move ${s.name_eng} down`}>
                    <i className="ti ti-arrow-down" />
                  </button>
                </div>
                <button onClick={() => setEditing(s)} className={iconBtn} aria-label={`Edit ${s.name_eng}`}>
                  <i className="ti ti-pencil text-lg" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <ServiceEditor
          service={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={saved => {
            setServices(prev => (prev.some(s => s.id === saved.id) ? prev.map(s => (s.id === saved.id ? saved : s)) : [...prev, saved]))
            setEditing(null)
          }}
          onDeleted={id => {
            setServices(prev => prev.filter(s => s.id !== id))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function ServiceEditor({ service, onClose, onSaved, onDeleted }: {
  service: DBService | null
  onClose: () => void
  onSaved: (s: DBService) => void
  onDeleted: (id: number) => void
}) {
  const [draft, setDraft] = useState<ServiceDraft>(service ? toDraft(service) : EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const set = <K extends keyof ServiceDraft>(k: K, v: ServiceDraft[K]) => setDraft(d => ({ ...d, [k]: v }))
  const num = (v: string) => (v === '' ? 0 : Math.max(0, parseFloat(v) || 0))

  async function save() {
    if (!draft.name_eng.trim()) { setError('Enter an English name.'); return }
    if (draft.duration < 30) { setError('Duration must be at least 30 minutes.'); return }
    setSaving(true)
    setError(null)
    try {
      if (service) {
        const saved = await patchService(service.id, draft)
        onSaved({ ...service, ...draft, ...saved })
      } else {
        const res = await fetch('/api/admin/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...draft, icon: '' }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? 'Failed to add service')
        let created: DBService = data.service
        // POST always stores the default duration; follow up with the chosen one.
        if (created.duration !== draft.duration) created = { ...created, ...(await patchService(created.id, draft)) }
        onSaved(created)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!service) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/services?id=${service.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to delete service')
      }
      onDeleted(service.id)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={service ? 'Edit service' : 'New service'}
        subtitle={service ? service.name_eng : 'Shown on the booking page'}
        footer={
          <>
            <div className="flex gap-2">
              {service && (
                <button onClick={() => setConfirmDelete(true)} className={btn.danger} aria-label="Delete service">
                  <i className="ti ti-trash" aria-hidden="true" />
                </button>
              )}
              <button onClick={onClose} disabled={saving} className={`${btn.secondary} flex-1`}>Cancel</button>
              <button onClick={save} disabled={saving} className={`${btn.primary} flex-1`}>
                {saving ? 'Saving…' : service ? 'Save changes' : 'Add service'}
              </button>
            </div>
            {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
          </>
        }
      >
        <div className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="font-nunito font-extrabold text-sm text-text-primary mb-2">Name</legend>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="English">
                <input autoFocus={!service} value={draft.name_eng} onChange={e => set('name_eng', e.target.value)} placeholder="Full groom" className={inputCls} />
              </Field>
              <Field label="Korean">
                <input value={draft.name_kor} onChange={e => set('name_kor', e.target.value)} placeholder="전체 미용" className={inputCls} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-nunito font-extrabold text-sm text-text-primary mb-2">Description</legend>
            <Field label="English">
              <textarea rows={3} value={draft.desc_eng} onChange={e => set('desc_eng', e.target.value)} className={`${inputCls} resize-y`} />
            </Field>
            <Field label="Korean">
              <textarea rows={3} value={draft.desc_kor} onChange={e => set('desc_kor', e.target.value)} className={`${inputCls} resize-y`} />
            </Field>
          </fieldset>

          <fieldset>
            <legend className="font-nunito font-extrabold text-sm text-text-primary mb-2">Price by dog size</legend>
            <div className="grid grid-cols-3 gap-2.5">
              {([['sm_price', 'Small'], ['md_price', 'Medium'], ['lg_price', 'Large']] as const).map(([k, label]) => (
                <Field key={k} label={label}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                    <input
                      type="number" inputMode="decimal" min={0}
                      value={draft[k]}
                      onChange={e => set(k, num(e.target.value))}
                      className={`${inputCls} pl-6`}
                    />
                  </div>
                </Field>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-nunito font-extrabold text-sm text-text-primary mb-2">Length</legend>
            <Field label="Duration (minutes)" hint={`Blocks ${Math.ceil(draft.duration / 60)} hour slot(s) on the calendar.`}>
              <input
                type="number" inputMode="numeric" min={30} step={30}
                value={draft.duration}
                onChange={e => set('duration', Math.round(num(e.target.value)))}
                className={inputCls}
              />
            </Field>
          </fieldset>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        tone="danger"
        icon="ti-trash"
        title={`Delete ${service?.name_eng ?? 'this service'}?`}
        body="Customers won't be able to book it anymore. This can't be undone."
        confirmLabel="Yes, delete"
        cancelLabel="Keep service"
        busy={deleting}
        error={deleteError}
        onConfirm={remove}
        onCancel={() => { setConfirmDelete(false); setDeleteError(null) }}
      />
    </>
  )
}
