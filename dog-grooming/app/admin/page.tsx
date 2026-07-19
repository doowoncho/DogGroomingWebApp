'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { Booking, DBGroomingStyle, DBService } from '@/types'
import { useServices } from '@/lib/hooks/useServices'

// ─── Types ────────────────────────────────────────────────────────────────────
const BOOKING_TABS = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'declined'] as const
const serviceGridCls = 'grid grid-cols-[24px_minmax(90px,1fr)_minmax(90px,1fr)_minmax(140px,2fr)_minmax(140px,2fr)_56px_56px_56px_64px] gap-3'
type BookingTab = typeof BOOKING_TABS[number]

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-800',
  confirmed:  'bg-blue-50 text-blue-800',
  inprogress: 'bg-purple-50 text-purple-800',
  completed:  'bg-green-50 text-green-800',
  cancelled:  'bg-gray-100 text-gray-600',
  declined:   'bg-red-50 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'Pending',
  confirmed:  'Confirmed',
  inprogress: 'In progress',
  completed:  'Completed',
  cancelled:  'Cancelled',
  declined:   'Declined',
}

type AdminView = 'bookings' | 'services'
type CatalogTab = 'services' | 'styles'

// ─── Shared inline-edit primitives ───────────────────────────────────────────

const inputCls = 'text-sm font-nunito border border-border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 w-full'
const inputSmCls = 'text-xs font-nunito border border-border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 w-full'
const selectCls = 'text-xs font-bold font-nunito border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 w-full'
const saveBtnCls = 'text-xs font-bold font-nunito bg-brand text-white rounded-full px-3 py-1.5 hover:bg-brand/90 whitespace-nowrap'
const cancelBtnCls = 'text-xs font-bold font-nunito bg-gray-100 text-text-secondary rounded-full px-2.5 py-1.5 hover:bg-gray-200'
const iconBtnCls = 'w-7 h-7 flex items-center justify-center rounded-lg border border-border text-text-muted hover:bg-gray-100 transition-colors'
const delBtnCls = 'w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors'

// ─── Services panel ───────────────────────────────────────────────────────────

function ServiceRow({
  service,
  onSave,
  onDelete,
  index,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
}: {
  service: DBService
  onSave: (s: DBService) => void
  onDelete: (id: number) => void
  index: number
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDrop: () => void
  onDragEnd: () => void
  isDragging: boolean
  isDragOver: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<DBService>({
    ...service,
    name_eng: service.name_eng ?? '',
    name_kor: service.name_kor ?? '',
    desc_eng: service.desc_eng ?? '',
    desc_kor: service.desc_kor ?? '',
    icon: service.icon ?? '',
    sm_price: service.sm_price ?? 0,
    md_price: service.md_price ?? 0,
    lg_price: service.lg_price ?? 0,
    duration: service.duration ?? 180,
    slots: service.slots ?? 3,
  })

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id,
          name_eng: draft.name_eng,
          name_kor: draft.name_kor,
          sm_price: draft.sm_price,
          md_price: draft.md_price,
          lg_price: draft.lg_price,
          duration: draft.duration,
          desc_eng: draft.desc_eng,
          desc_kor: draft.desc_kor,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
      onSave(draft)
      setEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(service)
    setSaveError(null)
    setEditing(false)
  }

  const gridCls = serviceGridCls 

  if (editing) {
    return (
      <div className={`${gridCls} items-start px-4 py-3 bg-gray-50 border-b border-border`}>
        <div />
        <input autoFocus value={draft.name_eng} onChange={e => setDraft(d => ({ ...d, name_eng: e.target.value }))} placeholder="Name (English)" className={`${inputCls} font-bold`} />
        <input value={draft.name_kor} onChange={e => setDraft(d => ({ ...d, name_kor: e.target.value }))} placeholder="Name (Korean)" className={`${inputCls} font-bold`} />
        <input autoFocus value={draft.desc_eng} onChange={e => setDraft(d => ({ ...d, desc_eng: e.target.value }))} placeholder="Description (English)" className={`${inputCls} font-bold`} />
        <input value={draft.desc_kor} onChange={e => setDraft(d => ({ ...d, desc_kor: e.target.value }))} placeholder="Description (Korean)" className={`${inputCls} font-bold`} />
        <input type="number" min={0} value={draft.sm_price} onChange={e => setDraft(d => ({ ...d, sm_price: parseFloat(e.target.value) || 0 }))} className={`${inputCls} font-bold`} />
        <input type="number" min={0} value={draft.md_price} onChange={e => setDraft(d => ({ ...d, md_price: parseFloat(e.target.value) || 0 }))} className={`${inputCls} font-bold`} />
        <input type="number" min={0} value={draft.lg_price} onChange={e => setDraft(d => ({ ...d, lg_price: parseFloat(e.target.value) || 0 }))} className={`${inputCls} font-bold`} />
        <div className="flex flex-col pt-0.5">
          <div className="flex items-center">
            <button onClick={handleSave} disabled={saving} className={`${saveBtnCls} disabled:opacity-50`}>💾</button>
            <button onClick={handleCancel} disabled={saving} className={cancelBtnCls} aria-label="cancel">✕</button>
          </div>
          {saveError && <p className="text-[10px] text-red-500">{saveError}</p>}
        </div>
      </div>
    )
  }

  return (
  <div
    draggable
    onDragStart={() => onDragStart(index)}
    onDragOver={(e) => { e.preventDefault(); onDragOver(index) }}
    onDrop={(e) => { e.preventDefault(); onDrop() }}
    onDragEnd={onDragEnd}
    className={`${gridCls} items-center px-4 py-3 border-b border-border transition-colors ${
      isDragging ? 'opacity-40' : 'hover:bg-gray-50'
    } ${isDragOver ? 'border-t-2 border-t-brand' : ''}`}
  >
    <div className="w-6 h-8 flex items-center justify-center text-text-muted cursor-grab active:cursor-grabbing" aria-label="Drag to reorder">
      <i className="ti ti-grip-vertical text-sm" />
    </div>
    <p className="text-sm font-bold font-nunito text-text-primary truncate">{service.name_eng}</p>
    <p className="text-sm font-bold font-nunito text-text-primary truncate">{service.name_kor}</p>
    <p className="text-xs text-text-muted line-clamp-2 leading-snug">{service.desc_eng}</p>
    <p className="text-xs text-text-muted line-clamp-2 leading-snug">{service.desc_kor}</p>
    <p className="text-sm font-bold font-nunito text-text-primary">${service.sm_price}</p>
    <p className="text-sm font-bold font-nunito text-text-primary">${service.md_price}</p>
    <p className="text-sm font-bold font-nunito text-text-primary">${service.lg_price}</p>
    <div className="flex items-center gap-1">
      <button onClick={() => setEditing(true)} className={iconBtnCls}><i className="ti ti-edit text-sm" /></button>
      <button onClick={() => onDelete(service.id)} className={delBtnCls}><i className="ti ti-trash text-sm" /></button>
    </div>
  </div>
)
}

function NewServiceRow({ onAdd, onCancel }: { onAdd: (s: Omit<DBService, 'id' | 'order'>) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Omit<DBService, 'id'>>({
    name_eng: '',
    name_kor: '',
    desc_eng: '',
    desc_kor: '',
    icon: '',
    sm_price: 0,
    md_price: 0,
    lg_price: 0,
    duration: 180,
    slots: 3,
    needs_style: false,
    order: 0
  })
  return (
    <div className={`${serviceGridCls} items-center px-4 py-3 bg-gray-50 border-t border-border`}>
      <div />
      <input autoFocus value={draft.name_eng} onChange={e => setDraft(d => ({ ...d, name_eng: e.target.value }))} placeholder="Service name (English)" className={`${inputCls} font-bold`} />
      <input value={draft.name_kor} onChange={e => setDraft(d => ({ ...d, name_kor: e.target.value }))} placeholder="Service name (Korean)" className={`${inputCls} font-bold`} />
      <input value={draft.desc_eng} onChange={e => setDraft(d => ({ ...d, desc_eng: e.target.value }))} placeholder="Description (English)" className={`${inputCls} font-bold`} />
      <input value={draft.desc_kor} onChange={e => setDraft(d => ({ ...d, desc_kor: e.target.value }))} placeholder="Description (Korean)" className={`${inputCls} font-bold`} />
      <input type="number" min={0} value={draft.sm_price} onChange={e => setDraft(d => ({ ...d, sm_price: parseFloat(e.target.value) || 0 }))} placeholder="$0" className={`${inputCls} font-bold`} />
      <input type="number" min={0} value={draft.md_price} onChange={e => setDraft(d => ({ ...d, md_price: parseFloat(e.target.value) || 0 }))} placeholder="$0" className={`${inputCls} font-bold`} />
      <input type="number" min={0} value={draft.lg_price} onChange={e => setDraft(d => ({ ...d, lg_price: parseFloat(e.target.value) || 0 }))} placeholder="$0" className={`${inputCls} font-bold`} />
      <div className="flex items-center gap-1">
        <button onClick={() => { if (draft.name_eng.trim()) onAdd(draft) }} className={saveBtnCls}>Add</button>
        <button onClick={onCancel} className={cancelBtnCls} aria-label="cancel">✕</button>
      </div>
    </div>
  )
}

function ServicesTable() {
  const [services, setServices] = useState<DBService[]>([])
  const [loading, setLoading] = useState(true)
  const [addingNew, setAddingNew] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    async function fetchServices() {
      setLoading(true)
      const res = await fetch('/api/services')
      const json = await res.json()
      setServices(
        json.services
          .map((d: any) => ({
            id: d.id,
            name_eng: d.name_eng,
            name_kor: d.name_kor,
            desc_eng: d.desc_eng,
            desc_kor: d.desc_kor,
            sm_price: d.sm_price,
            md_price: d.md_price,
            lg_price: d.lg_price,
            duration: d.duration,
            icon: d.icon,
            needs_style: d.needs_style,
            order: d.order ?? 0,
          }))
          .sort((a: DBService, b: DBService) => a.order - b.order)
      )
      setLoading(false)
    }
    fetchServices()
  }, [])

  function handleSave(updated: DBService) {
    setServices(prev => prev.map(s => s.id === updated.id ? updated : s))
  }

  async function handleDelete(id: number) {
    setServices(prev => prev.filter(s => s.id !== id))
    const res = await fetch(`/api/admin/services?id=${id}`, { method: 'DELETE' })
    if (!res.ok) console.error('Failed to delete service')
  }

  async function handleAdd(data: Omit<DBService, 'id' | 'order'>) {
    const res = await fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      console.error('Failed to add service')
      return
    }

    const { service } = await res.json()
    setServices(prev => [...prev, service])
    setAddingNew(false)
  }

  async function persistOrder(reordered: DBService[]) {
    setReordering(true)
    try {
      await fetch('/api/admin/services/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: reordered.map((s, i) => ({ id: s.id, order: i })),
        }),
      })
    } catch (err) {
      console.error('Failed to save order:', err)
    } finally {
      setReordering(false)
    }
  }

  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragOver(index: number) {
    if (index !== dragOverIndex) setDragOverIndex(index)
  }

  function handleDrop() {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    const reordered = [...services]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(dragOverIndex, 0, moved)

    const withUpdatedOrder = reordered.map((s, i) => ({ ...s, order: i }))

    setServices(withUpdatedOrder)
    persistOrder(withUpdatedOrder)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  if (loading) return <div className="p-8 text-sm text-text-muted">Loading…</div>

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className={`${serviceGridCls} px-4 py-2.5 border-b border-border`}>
        {['', 'Name (English)', 'Name (Korean)', 'Desc (English)', 'Desc (Korean)', 'S', 'M', 'L', ''].map((h, i) => (
          <span key={i} className="text-[10px] font-bold font-nunito text-text-muted uppercase tracking-wide">{h}</span>
        ))}
      </div>
      {services.length === 0 && !addingNew && (
        <p className="text-center text-sm text-text-muted py-10">No services yet</p>
      )}
      {services.map((s, i) => (
        <ServiceRow
          key={s.id}
          service={s}
          onSave={handleSave}
          onDelete={handleDelete}
          index={i}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          isDragging={dragIndex === i}
          isDragOver={dragOverIndex === i && dragIndex !== i}
        />
      ))}
      {addingNew && <NewServiceRow onAdd={handleAdd} onCancel={() => setAddingNew(false)} />}
      {!addingNew && (
        <div className="px-4 py-3">
          <button onClick={() => setAddingNew(true)} className="flex items-center gap-1.5 text-xs font-bold font-nunito text-brand hover:text-brand/80 transition-colors">
            <i className="ti ti-plus text-sm" /> Add service
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Styles panel ─────────────────────────────────────────────────────────────

function StyleRow({ style, onSave, onDelete }: { style: DBGroomingStyle; onSave: (s: DBGroomingStyle) => void; onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(style)

  function handleSave() {
    onSave(draft)
    setEditing(false)
  }

  function handleCancel() {
    setDraft(style)
    setEditing(false)
  }

  if (editing) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_120px] gap-4 items-start px-4 py-3 bg-gray-50 border-b border-border">
      
      {/* Korean */}
      <div className="flex flex-col gap-1.5">
        <input
          autoFocus
          value={draft.name_kor}
          onChange={e => setDraft(d => ({ ...d, name_kor: e.target.value }))}
          placeholder="Style name (Korean)"
          className={`${inputCls} font-bold`}
        />

        <input
          value={draft.desc_kor}
          onChange={e => setDraft(d => ({ ...d, desc_kor: e.target.value }))}
          placeholder="Short description (Korean)"
          className={inputSmCls}
        />
      </div>

      {/* English */}
      <div className="flex flex-col gap-1.5">
        <input
          value={draft.name_eng}
          onChange={e => setDraft(d => ({ ...d, name_eng: e.target.value }))}
          placeholder="Style name (English)"
          className={`${inputCls} font-bold`}
        />

        <input
          value={draft.desc_eng}
          onChange={e => setDraft(d => ({ ...d, desc_eng: e.target.value }))}
          placeholder="Short description (English)"
          className={inputSmCls}
        />
      </div>

       {/* Emoji */}
      <div className="flex flex-col gap-1.5">
        <input
          value={draft.emoji}
          onChange={e => setDraft(d => ({ ...d, emoji: e.target.value }))}
          placeholder="Emoji"
          className={`${inputCls} font-bold`}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 justify-end pt-1">
        <button onClick={handleSave} className={saveBtnCls}>
          Save
        </button>

        <button
          onClick={handleCancel}
          className={cancelBtnCls}
          aria-label="cancel"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

return (
  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 items-start px-4 py-3 border-b border-border hover:bg-gray-50 transition-colors">
    {/* Korean */}
    <div>
      <p className="text-sm font-bold font-nunito text-text-primary">
        {style.name_kor}
      </p>

      {style.desc_kor && (
        <p className="text-xs text-text-muted mt-0.5">
          {style.desc_kor}
        </p>
      )}
    </div>

    {/* English */}
    <div>
      <p className="text-sm font-bold font-nunito text-text-primary">
        {style.name_eng}
      </p>

      {style.desc_eng && (
        <p className="text-xs text-text-muted mt-0.5">
          {style.desc_eng}
        </p>
      )}
    </div>

    {/* emoji */}
    <div>
      <p className="text-sm font-bold font-nunito text-text-primary">
        {style.emoji}
      </p>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-1 justify-end">
      <button
        onClick={() => setEditing(true)}
        className={iconBtnCls}
      >
        <i className="ti ti-edit text-sm" />
      </button>

      <button
        onClick={() => onDelete(style.id)}
        className={delBtnCls}
      >
        <i className="ti ti-trash text-sm" />
      </button>
    </div>
  </div>
)
}

function NewStyleRow({ onAdd, onCancel }: { onAdd: (s: Omit<DBGroomingStyle, 'id'>) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Omit<DBGroomingStyle, 'id'>>({ name_kor: '', desc_kor: '', name_eng: '', desc_eng: '', emoji: '' })

  return (
    <div className="grid grid-cols-[1fr_100px_88px_68px] gap-2 items-center px-4 py-3 bg-gray-50 border-t border-border">
      <div className="flex flex-col gap-1.5">
        <input autoFocus value={draft.name_kor} onChange={e => setDraft(d => ({ ...d, name_kor: e.target.value }))} placeholder="Style name (Korean)" className={`${inputCls} font-bold`} />
        <input value={draft.desc_kor} onChange={e => setDraft(d => ({ ...d, desc_kor: e.target.value }))} placeholder="Short description (Korean)" className={inputSmCls} />
        <input autoFocus value={draft.name_eng} onChange={e => setDraft(d => ({ ...d, name_eng: e.target.value }))} placeholder="Style name (English)" className={`${inputCls} font-bold`} />
        <input value={draft.desc_eng} onChange={e => setDraft(d => ({ ...d, desc_eng: e.target.value }))} placeholder="Short description (English)" className={inputSmCls} />
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => { if (draft.name_kor.trim() && draft.name_eng.trim()) onAdd(draft) }} className={saveBtnCls}>Add</button>
        <button onClick={onCancel} className={cancelBtnCls} aria-label="cancel">✕</button>
      </div>
    </div>
  )
}

function StylesTable() {
  const [styles, setStyles] = useState<DBGroomingStyle[]>([])
  const [loading, setLoading] = useState(true)
  const [addingNew, setAddingNew] = useState(false)
  const [nextId, setNextId] = useState(200)

 
  useEffect(() => {
    async function fetchStyles() {
      setLoading(true)
      const res = await fetch('/api/styles')
      const json = await res.json()
      console.log(json)
      setStyles(json.styles.map((d: any, i: number) => ({
        id: d.id,
        name_eng: d.name_eng,
        name_kor: d.name_kor,
        desc_eng: d.desc_eng,
        desc_kor: d.desc_kor,
        emoji: d.emoji,
      })))
      setLoading(false)
    }
    fetchStyles()
    setLoading(false)
  }, [])

  async function handleSave(updated: DBGroomingStyle) {
    setStyles(prev => prev.map(s => s.id === updated.id ? updated : s))
    const res = await fetch('/api/admin/styles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:          updated.id,
        name_eng:    updated.name_eng,
        name_kor:    updated.name_kor,
        desc_eng:    updated.desc_eng,
        desc_kor:    updated.desc_kor,
        emoji:       updated.emoji
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to save')
    }
  }

async function handleDelete(id: number) {
  await fetch(`/api/admin/styles/${id}`, {
    method: "DELETE",
  })
  setStyles(prev => prev.filter(s => s.id !== id))
}

async function handleAdd(data: Omit<DBGroomingStyle, 'id'>) {
  const tempId = nextId

  setStyles(prev => [...prev, { id: tempId, ...data }])
  setNextId(n => n + 1)
  setAddingNew(false)

  const res = await fetch('/api/admin/styles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
}
  if (loading) return <div className="p-8 text-sm text-text-muted">Loading…</div>

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 border-b border-border">
        {['Style (Korean)', 'Style (English)', 'emoji'].map(h => (
          <span key={h} className="text-[10px] font-bold font-nunito text-text-muted uppercase tracking-wide">{h}</span>
        ))}
      </div>
      {styles.length === 0 && !addingNew && (
        <p className="text-center text-sm text-text-muted py-10">No styles yet</p>
      )}
      {styles.map(s => (
        <StyleRow key={s.id} style={s} onSave={handleSave} onDelete={handleDelete} />
      ))}
      {addingNew && <NewStyleRow onAdd={handleAdd} onCancel={() => setAddingNew(false)} />}
      {!addingNew && (
        <div className="px-4 py-3">
          <button onClick={() => setAddingNew(true)} className="flex items-center gap-1.5 text-xs font-bold font-nunito text-brand hover:text-brand/80 transition-colors">
            <i className="ti ti-plus text-sm" /> Add style
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Catalog panel (Services + Styles sub-tabs) ───────────────────────────────

function CatalogPanel() {
  const [tab, setTab] = useState<CatalogTab>('services')

  return (
    <div>
      {/* Sub-tab switcher */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {(['services'] as CatalogTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-bold font-nunito capitalize border-b-2 transition-colors -mb-px ${
              tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {t === 'services' ? 'Services' : 'Styles'}
          </button>
        ))}
      </div>

      {tab === 'services' && (
        <>
          <p className="text-xs text-text-muted mb-3">Manage grooming services, base prices, and durations.</p>
          <ServicesTable />
        </>
      )}
      {tab === 'styles' && (
        <>
          <p className="text-xs text-text-muted mb-3">Manage haircut styles and any price add-on applied on top of the base service.</p>
          <StylesTable />
        </>
      )}
    </div>
  )
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<Booking[]>([])
  const [activeTab, setActiveTab] = useState<BookingTab>('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Booking | null>(null)
  const [view, setView] = useState<AdminView>('bookings')
  type ConfirmAction = { type: 'decline' | 'cancel'; id: string } | null
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [statusLoading, setStatusLoading] = useState(false)
const [statusError, setStatusError] = useState<string | null>(null)
const [photos, setPhotos] = useState<
  { id: number; signedUrl: string }[]
>([])
const [photosLoading, setPhotosLoading] = useState(false)
const { serviceMap } = useServices("eng")

  useEffect(() => {
    if (!selected) return

    async function fetchPhotos() {
      try {
        setPhotosLoading(true)

        const res = await fetch(
          `/api/photos?bookingId=${selected?.id}`
        )

        if (!res.ok) {
          throw new Error('Failed to fetch photos')
        }

        const data = await res.json()

        setPhotos(data.photos)
      } catch (err) {
        console.error(err)
        setPhotos([])
      } finally {
        setPhotosLoading(false)
      }
    }

    fetchPhotos()
  }, [selected])

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch('/api/admin/bookings')
        if (!res.ok) throw new Error('Failed to fetch bookings')
        const data = await res.json()
        setAppointments(data.bookings)
      } catch (err) {
        console.error(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    fetchBookings()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

async function updateStatus(bookingId: string, bookingStatus: Booking['status']) {
  setStatusLoading(true)
  setStatusError(null)
  try {
    const res = await fetch('/api/admin/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookingId, status: bookingStatus }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to update status')
    }

    setAppointments(prev => prev.map(a => a.id === bookingId ? { ...a, status: bookingStatus } : a))
    setSelected(prev => prev?.id === bookingId ? { ...prev, status: bookingStatus } : prev)

    // Send notification email — fire and forget, don't block the UI
    const booking = appointments.find(a => a.id === bookingId)
    if (booking?.email) {
      fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:     booking.email,
          dog_name:  booking.dog_name,
          date:      booking.date,
          time:      booking.time,
          status:    bookingStatus,
        }),
      }).catch(err => console.error('Email notify failed:', err))
    }

  } catch (err) {
    setStatusError(err instanceof Error ? err.message : 'Something went wrong')
  } finally {
    setStatusLoading(false)
  }
}

  const filtered = appointments
    .filter(a => activeTab === 'all' || a.status === activeTab)
    .filter(a => {
      const q = search.toLowerCase()
      return !q || a.dog_name.toLowerCase().includes(q) || a.breed?.toLowerCase().includes(q)
    })

  function countFor(tab: BookingTab) {
    return tab === 'all' ? appointments.length : appointments.filter(a => a.status === tab).length
  }

  function formatDate(d: string) {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  function ConfirmDialog({ action, onConfirm, onCancel }: {
  action: ConfirmAction
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!action) return null
  const isDecline = action.type === 'decline'
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 w-72 text-center shadow-lg">
        <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
          <i className="ti ti-alert-triangle text-xl text-red-500" />
        </div>
        <p className="font-bold font-nunito text-text-primary mb-1.5">
          {isDecline ? 'Decline this booking?' : 'Cancel this appointment?'}
        </p>
        <p className="text-sm text-text-muted mb-5 leading-relaxed">
          {isDecline
            ? 'The customer will be notified their booking was declined.'
            : 'This confirmed appointment will be marked as cancelled.'}
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={onConfirm} className="w-full py-2.5 rounded-full border border-red-200 text-red-600 text-sm font-bold font-nunito hover:bg-red-50">
            {isDecline ? 'Yes, decline' : 'Yes, cancel it'}
          </button>
          <button onClick={onCancel} className="w-full py-2.5 rounded-full border border-border text-text-secondary text-sm font-bold font-nunito hover:bg-gray-50">
            Keep {isDecline ? 'booking' : 'appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}

  if (loading) return <div className="p-8 text-sm text-text-muted">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold font-nunito text-text-primary">Admin dashboard</h1>
          {/* View switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setView('bookings')}
              className={`text-xs font-bold font-nunito px-3.5 py-1.5 rounded-full transition-colors ${
                view === 'bookings' ? 'bg-white text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Bookings
            </button>
            <button
              onClick={() => { setView('services'); setSelected(null) }}
              className={`text-xs font-bold font-nunito px-3.5 py-1.5 rounded-full transition-colors ${
                view === 'services' ? 'bg-white text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Services
            </button>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm border border-border rounded-full px-4 py-1.5 text-text-secondary font-nunito font-bold"
        >
          Sign out
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Bookings view ── */}
        {view === 'bookings' && (
          <>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total',     value: appointments.length },
                { label: 'Pending',   value: countFor('pending') },
                { label: 'Today',     value: appointments.filter(a => a.date === new Date().toISOString().slice(0, 10)).length },
                { label: 'Completed', value: countFor('completed') },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-border px-4 py-3">
                  <p className="text-xs text-text-muted mb-1">{s.label}</p>
                  <p className="text-2xl font-bold font-nunito text-text-primary">{s.value}</p>
                </div>
              ))}
            </div>

            <div className={`grid gap-4 ${selected ? 'grid-cols-[1fr_360px]' : 'grid-cols-1'}`}>
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="px-4 pt-4 pb-3 border-b border-border">
                  <input
                    type="text"
                    placeholder="Search dog, breed, or owner…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full text-sm border border-border rounded-full px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>

                <div className="flex gap-0 overflow-x-auto border-b border-border">
                  {BOOKING_TABS.map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2.5 text-xs font-nunito font-bold whitespace-nowrap border-b-2 transition-colors ${
                        activeTab === tab ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {STATUS_LABELS[tab] ?? 'All'} <span className="ml-1 opacity-60">{countFor(tab)}</span>
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-border">
                  {filtered.length === 0 && (
                    <p className="text-center text-sm text-text-muted py-10">No appointments found</p>
                  )}
                  {filtered.map(a => (
                    <div
                      key={a.id}
                      onClick={() => setSelected(selected?.id === a.id ? null : a)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === a.id ? 'bg-brand-pale' : ''}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-brand-pale flex items-center justify-center text-xs font-bold font-nunito text-brand flex-shrink-0">
                        {initials(a.dog_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-nunito text-text-primary">{a.dog_name}</span>
                          <span className="text-xs text-text-muted">{a.breed}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_STYLES[a.status]}`}>
                            {STATUS_LABELS[a.status]}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted truncate"> · {formatDate(a.date)}</p>
                      </div>
                      {/* <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {a.status === 'pending' && <>
                          <button onClick={() => updateStatus(a.id, 'confirmed')} className="text-xs px-2.5 py-1 rounded-full border border-green-300 text-green-700 font-bold hover:bg-green-50">Confirm</button>
                          <button onClick={() => updateStatus(a.id, 'declined')} className="text-xs px-2.5 py-1 rounded-full border border-red-200 text-red-600 font-bold hover:bg-red-50">Decline</button>
                        </>}
                        {a.status === 'confirmed' && <>
                          <button onClick={() => updateStatus(a.id, 'cancelled')} className="text-xs px-2.5 py-1 rounded-full border border-border text-text-muted font-bold hover:bg-gray-50">Cancel</button>
                        </>}
                      </div> */}
                    </div>
                  ))}
                </div>
              </div>

              {selected && (
                <div className="bg-white rounded-2xl border border-border p-5 self-start sticky top-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-nunito font-bold text-base text-text-primary">Appointment detail</h2>
                    <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-secondary">
                      <i className="ti ti-x text-[18px]" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                    <div className="w-12 h-12 rounded-full bg-brand-pale flex items-center justify-center font-nunito font-extrabold text-base text-brand">
                      {initials(selected.dog_name)}
                    </div>
                    <div>
                      <p className="font-nunito font-bold text-text-primary">{selected.dog_name} <span className="font-normal text-text-muted text-sm">· {selected.breed}</span></p>
                      <p className="text-sm text-text-muted">{selected.phone}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-4 text-sm">
                    {[
                      { label: 'Service', value:  serviceMap[selected.service_id] },
                      { label: 'Date',    value: `${formatDate(selected.date)} at ${selected.time}` },
                      { label: 'Email',   value: selected.email },
                      { label: 'Status',  value: (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${STATUS_STYLES[selected.status]}`}>
                          {STATUS_LABELS[selected.status]}
                        </span>
                      )},
                    ].map(f => (
                      <div key={f.label} className="flex justify-between items-center">
                        <span className="text-text-muted">{f.label}</span>
                        <span className="font-bold font-nunito text-text-primary text-right">{f.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-4">
                    <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">
                      Photos
                    </p>

                    {photosLoading ? (
                      <p className="text-sm text-text-muted">Loading photos...</p>
                    ) : photos.length === 0 ? (
                      <p className="text-sm text-text-muted">
                        No photos uploaded
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                       {photos.map(photo => (
                        <a
                          key={photo.id}
                          href={photo.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={photo.signedUrl}
                            className="w-full aspect-square object-cover rounded-lg border border-border"
                          />
                        </a>
                      ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-4">
                    <p className="text-xs text-text-muted mb-1 uppercase tracking-wide">Notes</p>
                    <p className="text-sm text-text-primary leading-relaxed">{selected.notes}</p>
                  </div>
   
                  <div className="flex flex-col gap-2">
                    {selected.status === 'pending' && <>
                      <button
                        onClick={() => updateStatus(selected.id, 'confirmed')}
                        disabled={statusLoading}
                        className="w-full py-2.5 rounded-full bg-brand text-white text-sm font-bold font-nunito disabled:opacity-50"
                      >
                        {statusLoading ? 'Saving…' : 'Confirm appointment'}
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'decline', id: selected.id })}
                        disabled={statusLoading}
                        className="w-full py-2.5 rounded-full border border-red-200 text-red-600 text-sm font-bold font-nunito disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </>}
                    {selected.status === 'confirmed' && (
                      <button
                        onClick={() => setConfirmAction({ type: 'cancel', id: selected.id })}
                        disabled={statusLoading}
                        className="w-full py-2.5 rounded-full border border-border text-text-secondary text-sm font-bold font-nunito disabled:opacity-50"
                      >
                        Cancel appointment
                      </button>
                    )}

                    {statusError && (
                      <p className="text-xs text-red-500 text-center">{statusError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Services & Styles view ── */}
        {view === 'services' && <CatalogPanel />}

      </div>

      <ConfirmDialog
  action={confirmAction}
  onConfirm={() => {
    if (confirmAction) {
      updateStatus(confirmAction.id, confirmAction.type === 'decline' ? 'declined' : 'cancelled')
    }
    setConfirmAction(null)
  }}
  onCancel={() => setConfirmAction(null)}
/>
    </div>
  )
}