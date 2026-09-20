'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { Booking, DBGroomingStyle, DBService } from '@/types'
import { useServices } from '@/lib/hooks/useServices'

// ─── Types ────────────────────────────────────────────────────────────────────
const BOOKING_TABS = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'declined'] as const
const serviceGridCls = 'grid grid-cols-[24px_minmax(90px,1fr)_minmax(90px,1fr)_minmax(140px,2fr)_minmax(140px,2fr)_56px_56px_56px_64px] gap-3'
type BookingTab = typeof BOOKING_TABS[number]

const DATE_RANGES = [
  { key: 'all',   label: 'All time' },
  { key: 'week',  label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'year',  label: 'This year' },
] as const
type DateRangeKey = typeof DATE_RANGES[number]['key']

// Only bookings in a terminal state can be bulk-cleared — pending/confirmed
// appointments are still live and shouldn't be removable in bulk.
const CLEARABLE_STATUSES = new Set(['completed', 'cancelled', 'declined'])

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-800',
  confirmed:  'bg-blue-50 text-blue-800',
  inprogress: 'bg-purple-50 text-purple-800',
  completed:  'bg-green-50 text-green-800',
  cancelled:  'bg-red-100 text-red-600',
  declined:   'bg-red-50 text-red-700',
}

// Solid dot colors for the calendar view (STATUS_STYLES above are bg/text pill pairs, too
// light-on-light to read as a small dot)
const STATUS_DOT: Record<string, string> = {
  pending:    'bg-amber-400',
  confirmed:  'bg-blue-500',
  inprogress: 'bg-purple-500',
  completed:  'bg-green-500',
  cancelled:  'bg-red-300',
  declined:   'bg-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'Pending',
  confirmed:  'Confirmed',
  inprogress: 'In progress',
  completed:  'Completed',
  cancelled:  'Cancelled',
  declined:   'Declined',
}

type AdminView = 'bookings' | 'calendar' | 'services'
type CatalogTab = 'services' | 'styles'

const CALGARY_TZ = 'America/Edmonton'

// ─── Timezone helpers (everything bucketed/displayed in Calgary local time) ──

/** Returns YYYY-MM-DD for the given ISO timestamp, as a Calgary calendar day. */
function calgaryDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CALGARY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

/** Returns e.g. "2:30 PM" for the given ISO timestamp, in Calgary local time. */
function calgaryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: CALGARY_TZ,
    hour: 'numeric',
    minute: '2-digit',
  })
}

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Today's date, as calendar parts (0-indexed month) in Calgary local time. */
function calgaryNowParts(): { key: string; y: number; m: number; d: number } {
  const key = new Intl.DateTimeFormat('en-CA', {
    timeZone: CALGARY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const [y, m, d] = key.split('-').map(Number)
  return { key, y, m: m - 1, d }
}

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
    <div className="px-4 py-4 border-b border-border space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Name (English)</label>
          <input
            autoFocus
            value={draft.name_eng}
            onChange={e => setDraft(d => ({ ...d, name_eng: e.target.value }))}
            placeholder="Name (English)"
            className="w-full px-3 py-2.5 text-sm font-bold font-nunito border border-border rounded-lg outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Name (Korean)</label>
          <input
            value={draft.name_kor}
            onChange={e => setDraft(d => ({ ...d, name_kor: e.target.value }))}
            placeholder="Name (Korean)"
            className="w-full px-3 py-2.5 text-sm font-bold font-nunito border border-border rounded-lg outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Description (English)</label>
          <textarea
            rows={3}
            value={draft.desc_eng}
            onChange={e => setDraft(d => ({ ...d, desc_eng: e.target.value }))}
            placeholder="Description (English)"
            className="w-full px-3 py-2.5 text-sm font-nunito-sans border border-border rounded-lg outline-none focus:border-brand resize-y"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Description (Korean)</label>
          <textarea
            rows={3}
            value={draft.desc_kor}
            onChange={e => setDraft(d => ({ ...d, desc_kor: e.target.value }))}
            placeholder="Description (Korean)"
            className="w-full px-3 py-2.5 text-sm font-nunito-sans border border-border rounded-lg outline-none focus:border-brand resize-y"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Small</label>
          <input
            type="number" min={0}
            value={draft.sm_price}
            onChange={e => setDraft(d => ({ ...d, sm_price: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2.5 text-sm font-bold font-nunito border border-border rounded-lg outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Medium</label>
          <input
            type="number" min={0}
            value={draft.md_price}
            onChange={e => setDraft(d => ({ ...d, md_price: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2.5 text-sm font-bold font-nunito border border-border rounded-lg outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide block mb-1">Large</label>
          <input
            type="number" min={0}
            value={draft.lg_price}
            onChange={e => setDraft(d => ({ ...d, lg_price: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2.5 text-sm font-bold font-nunito border border-border rounded-lg outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleSave} disabled={saving} className={`${saveBtnCls} disabled:opacity-50`}>💾 Save</button>
        <button onClick={handleCancel} disabled={saving} className={cancelBtnCls} aria-label="cancel">✕ Cancel</button>
        {saveError && <p className="text-[11px] text-red-500 ml-2">{saveError}</p>}
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

// ─── Calendar panel (month view, everything shown in Calgary time) ───────────

function CalendarPanel({
  appointments,
  onSelectBooking,
}: {
  appointments: Booking[]
  onSelectBooking: (b: Booking) => void
}) {
  // "Today" and the initial month, computed in Calgary local time rather than
  // the browser's local time, since that's what should drive the "Today" pill.
  const todayKeyRef = useMemo(() => calgaryNowParts(), [])

  const [calYear, setCalYear] = useState(todayKeyRef.y)
  const [calMonth, setCalMonth] = useState(todayKeyRef.m) // 0-indexed
  const [dayDetailKey, setDayDetailKey] = useState<string | null>(null)

  // Only appointments that actually fall within the selected month (in Calgary
  // local time) — everything else on this panel is scoped to this set.
  const monthAppointments = useMemo(() => {
    return appointments.filter(a => {
      const [y, m] = calgaryDateKey(a.date_time).split('-').map(Number)
      return y === calYear && m === calMonth + 1
    })
  }, [appointments, calYear, calMonth])

  const eventsByDay = useMemo(() => {
    const map: Record<string, Booking[]> = {}
    monthAppointments.forEach(a => {
      const key = calgaryDateKey(a.date_time)
      if (!map[key]) map[key] = []
      map[key].push(a)
    })
    Object.values(map).forEach(list => list.sort((a, b) => a.date_time.localeCompare(b.date_time)))
    return map
  }, [monthAppointments])

  const monthStats = useMemo(() => ({
    total: monthAppointments.length,
    pending: monthAppointments.filter(a => a.status === 'pending').length,
    confirmed: monthAppointments.filter(a => a.status === 'confirmed').length,
    completed: monthAppointments.filter(a => a.status === 'completed').length,
  }), [monthAppointments])

  const firstWeekday = new Date(calYear, calMonth, 1).getDay() // 0 = Sun
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate()

  type Cell = { day: number; y: number; m: number; inMonth: boolean }
  const cells: Cell[] = []

  // Leading days from previous month
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const m = calMonth === 0 ? 11 : calMonth - 1
    const y = calMonth === 0 ? calYear - 1 : calYear
    cells.push({ day, y, m, inMonth: false })
  }
  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, y: calYear, m: calMonth, inMonth: true })
  }
  // Trailing days to complete the grid (multiple of 7)
  const totalCells = Math.ceil(cells.length / 7) * 7
  let trailingDay = 1
  while (cells.length < totalCells) {
    const m = calMonth === 11 ? 0 : calMonth + 1
    const y = calMonth === 11 ? calYear + 1 : calYear
    cells.push({ day: trailingDay, y, m, inMonth: false })
    trailingDay++
  }

  function goPrevMonth() {
    setDayDetailKey(null)
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  function goNextMonth() {
    setDayDetailKey(null)
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }
  function goToday() {
    setDayDetailKey(null)
    setCalYear(todayKeyRef.y)
    setCalMonth(todayKeyRef.m)
  }

  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const MAX_VISIBLE = 3

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      {/* Header / nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="font-nunito font-bold text-base text-text-primary">{monthLabel}</h2>
          <span className="text-[10px] font-bold font-nunito text-text-muted uppercase tracking-wide bg-gray-100 rounded-full px-2 py-0.5">
            Calgary time
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={goToday} className="text-xs font-bold font-nunito text-text-secondary border border-border rounded-full px-3 py-1.5 hover:bg-gray-50">
            Today
          </button>
          <button onClick={goPrevMonth} aria-label="Previous month" className={iconBtnCls}>
            <i className="ti ti-chevron-left text-sm" />
          </button>
          <button onClick={goNextMonth} aria-label="Next month" className={iconBtnCls}>
            <i className="ti ti-chevron-right text-sm" />
          </button>
        </div>
      </div>

      {/* Month stats — scoped to the currently selected month only */}
      <div className="grid grid-cols-4 gap-3 px-4 py-3 border-b border-border bg-gray-50">
        {[
          { label: 'This month', value: monthStats.total },
          { label: 'Pending', value: monthStats.pending },
          { label: 'Confirmed', value: monthStats.confirmed },
          { label: 'Completed', value: monthStats.completed },
        ].map(s => (
          <div key={s.label}>
            <p className="text-[10px] text-text-muted mb-0.5 uppercase tracking-wide">{s.label}</p>
            <p className="text-lg font-bold font-nunito text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekdayLabels.map(w => (
          <div key={w} className="px-2 py-2 text-[10px] font-bold font-nunito text-text-muted uppercase tracking-wide text-center">
            {w}
          </div>
        ))}
      </div>

      {monthStats.total === 0 && (
        <p className="text-center text-sm text-text-muted py-3 border-b border-border">No appointments this month</p>
      )}

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const key = dateKey(cell.y, cell.m, cell.day)
          // Adjacent-month cells only exist to fill out the grid — they never
          // show that other month's appointments, since this panel is scoped
          // to the month currently selected.
          const dayEvents = cell.inMonth ? (eventsByDay[key] ?? []) : []
          const isToday = key === todayKeyRef.key
          const visible = dayEvents.slice(0, MAX_VISIBLE)
          const overflow = dayEvents.length - visible.length

          return (
            <div
              key={i}
              className={`min-h-[104px] border-b border-r border-border px-1.5 py-1.5 ${
                cell.inMonth ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center mb-1">
                <button
                  onClick={() => dayEvents.length > 0 && setDayDetailKey(key)}
                  disabled={dayEvents.length === 0}
                  className={`text-xs font-bold font-nunito w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                    isToday
                      ? 'bg-brand text-white'
                      : cell.inMonth
                        ? 'text-text-primary hover:bg-gray-100'
                        : 'text-text-muted/50'
                  } ${dayEvents.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {cell.day}
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                {visible.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => onSelectBooking(ev)}
                    title={`${ev.dog_name} · ${calgaryTime(ev.date_time)} · ${STATUS_LABELS[ev.status]}`}
                    className="flex items-center gap-1 text-[10px] font-nunito font-bold px-1 py-0.5 rounded hover:bg-gray-100 transition-colors text-left truncate"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[ev.status] ?? 'bg-gray-300'}`} />
                    <span className="text-text-muted flex-shrink-0">{calgaryTime(ev.date_time)}</span>
                    <span className="text-text-primary truncate">{ev.dog_name}</span>
                  </button>
                ))}
                {overflow > 0 && (
                  <button
                    onClick={() => setDayDetailKey(key)}
                    className="text-[10px] font-nunito font-bold text-brand px-1 text-left hover:underline"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Day detail popup — full list for a day, used when there are more
          bookings than fit inline in the cell */}
      {dayDetailKey && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
          onClick={() => setDayDetailKey(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-80 max-h-[70vh] overflow-y-auto shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-nunito font-bold text-text-primary">
                {(() => {
                  const [y, m, d] = dayDetailKey.split('-').map(Number)
                  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })
                })()}
              </h3>
              <button onClick={() => setDayDetailKey(null)} className="text-text-muted hover:text-text-secondary">
                <i className="ti ti-x text-[18px]" />
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {(eventsByDay[dayDetailKey] ?? []).map(ev => (
                <button
                  key={ev.id}
                  onClick={() => { onSelectBooking(ev); setDayDetailKey(null) }}
                  className="flex items-center gap-2 text-left px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[ev.status] ?? 'bg-gray-300'}`} />
                  <span className="text-xs font-bold font-nunito text-text-muted w-16 flex-shrink-0">{calgaryTime(ev.date_time)}</span>
                  <span className="text-sm font-bold font-nunito text-text-primary truncate flex-1">{ev.dog_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${STATUS_STYLES[ev.status]}`}>
                    {STATUS_LABELS[ev.status]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
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
  type ConfirmAction = { type: 'decline' | 'cancel' | 'completed'; id: string } | null
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [statusLoading, setStatusLoading] = useState(false)
const [statusError, setStatusError] = useState<string | null>(null)
const [photos, setPhotos] = useState<
  { id: number; signedUrl: string }[]
>([])
const [photosLoading, setPhotosLoading] = useState(false)
const { serviceMap } = useServices("eng")
const todayCalgaryKey = useMemo(() => calgaryNowParts().key, [])

// Date-range filter for the bookings list (All time / This week / This month / This year)
const [dateRange, setDateRange] = useState<DateRangeKey>('all')

// Bulk "clear old bookings" flow
const [selectMode, setSelectMode] = useState(false)
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
const [bulkDeleting, setBulkDeleting] = useState(false)
const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null)

  // useEffect(() => {
  //   if (!selected) return

  //   async function fetchPhotos() {
  //     try {
  //       setPhotosLoading(true)

  //       const res = await fetch(
  //         `/api/photos?bookingId=${selected?.id}`
  //       )

  //       if (!res.ok) {
  //         throw new Error('Failed to fetch photos')
  //       }

  //       const data = await res.json()

  //       setPhotos(data.photos)
  //     } catch (err) {
  //       console.error(err)
  //       setPhotos([])
  //     } finally {
  //       setPhotosLoading(false)
  //     }
  //   }

  //   fetchPhotos()
  // }, [selected])

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
          date:      booking.date_time,
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

  // Boundaries (inclusive, Calgary calendar days) for the selected date range.
  // Plain YYYY-MM-DD string comparison works fine here since that format sorts lexicographically.
  const dateRangeBounds = useMemo(() => {
    if (dateRange === 'all') return null
    const { y, m, d } = calgaryNowParts()
    if (dateRange === 'year') {
      return { start: `${y}-01-01`, end: `${y}-12-31` }
    }
    if (dateRange === 'month') {
      const lastDay = new Date(y, m + 1, 0).getDate()
      return { start: dateKey(y, m, 1), end: dateKey(y, m, lastDay) }
    }
    // week: Sunday through Saturday
    const anchor = new Date(y, m, d)
    const dow = anchor.getDay()
    const start = new Date(y, m, d - dow)
    const end = new Date(y, m, d - dow + 6)
    return {
      start: dateKey(start.getFullYear(), start.getMonth(), start.getDate()),
      end: dateKey(end.getFullYear(), end.getMonth(), end.getDate()),
    }
  }, [dateRange])

  const rangeAppointments = useMemo(() => {
    if (!dateRangeBounds) return appointments
    return appointments.filter(a => {
      const key = calgaryDateKey(a.date_time)
      return key >= dateRangeBounds.start && key <= dateRangeBounds.end
    })
  }, [appointments, dateRangeBounds])

  const filtered = rangeAppointments
    .filter(a => activeTab === 'all' || a.status === activeTab)
    .filter(a => {
      const q = search.toLowerCase()
      return !q || a.dog_name.toLowerCase().includes(q) || a.breed?.toLowerCase().includes(q) || a.phone?.toLowerCase().includes(q) || a.kakaoid?.toLowerCase().includes(q)
    })
    // Soonest appointment first — the API's own ordering isn't guaranteed,
    // and triage (especially the "pending" tab) needs the nearest ones on top.
    .sort((a, b) => a.date_time.localeCompare(b.date_time))

  function countFor(tab: BookingTab) {
    return tab === 'all' ? rangeAppointments.length : rangeAppointments.filter(a => a.status === tab).length
  }

  // Bookings currently visible (respecting range/tab/search) that are eligible for bulk clearing.
  const clearableInView = filtered.filter(a => CLEARABLE_STATUSES.has(a.status))

  function toggleSelected(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllClearable() {
    setSelectedIds(new Set(clearableInView.map(a => a.id)))
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setBulkDeleteError(null)
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    setBulkDeleteError(null)
    const ids = Array.from(selectedIds)
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to delete bookings')
      }

      const data: { deletedIds: string[]; skippedIds: string[] } = await res.json()
      const { deletedIds, skippedIds } = data

      setAppointments(prev => prev.filter(a => !deletedIds.includes(a.id)))
      setSelectedIds(prev => {
        const next = new Set(prev)
        deletedIds.forEach(id => next.delete(id))
        return next
      })

      if (skippedIds.length > 0) {
        // Server enforces the same "clearable statuses only" rule as the UI —
        // this only fires if something changed status between selection and delete.
        setBulkDeleteError(`${skippedIds.length} booking${skippedIds.length > 1 ? 's' : ''} couldn't be deleted (no longer eligible).`)
      } else {
        setConfirmBulkDelete(false)
        setSelectMode(false)
      }
    } catch (err) {
      setBulkDeleteError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBulkDeleting(false)
    }
  }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-CA', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZone: 'America/Edmonton',
  });
}

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  /** Jump from the calendar into the bookings list with a specific booking selected. */
  function handleSelectFromCalendar(b: Booking) {
    setView('bookings')
    setActiveTab('all')
    setSearch('')
    setSelected(b)
  }

  function ConfirmDialog({ action, onConfirm, onCancel }: {
    action: ConfirmAction
    onConfirm: () => void
    onCancel: () => void
  }) {
    if (!action) return null

    const config = {
      decline: {
        icon: 'ti-alert-triangle',
        iconBg: 'bg-red-50',
        iconColor: 'text-red-500',
        title: 'Decline this booking?',
        body: 'The customer will be notified their booking was declined.',
        confirmLabel: 'Yes, decline',
        confirmCls: 'border-red-200 text-red-600 hover:bg-red-50',
        keepLabel: 'Keep booking',
      },
      cancel: {
        icon: 'ti-alert-triangle',
        iconBg: 'bg-red-50',
        iconColor: 'text-red-500',
        title: 'Cancel this appointment?',
        body: 'This confirmed appointment will be marked as cancelled.',
        confirmLabel: 'Yes, cancel it',
        confirmCls: 'border-red-200 text-red-600 hover:bg-red-50',
        keepLabel: 'Keep appointment',
      },
      completed: {
        icon: 'ti-circle-check',
        iconBg: 'bg-green-50',
        iconColor: 'text-green-600',
        title: 'Mark as completed?',
        body: 'This appointment will be marked as completed and the customer will be notified.',
        confirmLabel: 'Yes, mark completed',
        confirmCls: 'border-green-200 text-green-700 hover:bg-green-50',
        keepLabel: 'Keep appointment',
      },
    } as const

    const c = config[action.type]

    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 w-72 text-center shadow-lg">
          <div className={`w-11 h-11 rounded-full ${c.iconBg} flex items-center justify-center mx-auto mb-3`}>
            <i className={`ti ${c.icon} text-xl ${c.iconColor}`} />
          </div>
          <p className="font-bold font-nunito text-text-primary mb-1.5">{c.title}</p>
          <p className="text-sm text-text-muted mb-5 leading-relaxed">{c.body}</p>
          <div className="flex flex-col gap-2">
            <button onClick={onConfirm} className={`w-full py-2.5 rounded-full border text-sm font-bold font-nunito ${c.confirmCls}`}>
              {c.confirmLabel}
            </button>
            <button onClick={onCancel} className="w-full py-2.5 rounded-full border border-border text-text-secondary text-sm font-bold font-nunito hover:bg-gray-50">
              {c.keepLabel}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <div className="p-8 text-sm text-text-muted">Loading...</div>

  return (
    <div className="app-shell bg-gray-50">
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
              onClick={() => { setView('calendar'); setSelected(null) }}
              className={`text-xs font-bold font-nunito px-3.5 py-1.5 rounded-full transition-colors ${
                view === 'calendar' ? 'bg-white text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Calendar
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
                { label: 'Today',     value: appointments.filter(a => calgaryDateKey(a.date_time) === todayCalgaryKey).length },
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
                    placeholder="Search dog, breed, or phone/kakaoid"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full text-sm border border-border rounded-full px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border flex-wrap">
                  {!selectMode ? (
                    <>
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {DATE_RANGES.map(r => (
                          <button
                            key={r.key}
                            onClick={() => setDateRange(r.key)}
                            className={`text-xs font-bold font-nunito px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                              dateRange === r.key ? 'bg-brand text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setSelectMode(true)}
                        className="text-xs font-bold font-nunito text-text-secondary border border-border rounded-full px-3 py-1.5 hover:bg-gray-50 whitespace-nowrap"
                      >
                        Select
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-bold font-nunito text-text-secondary whitespace-nowrap">
                          {selectedIds.size} selected
                        </span>
                        <button
                          onClick={selectAllClearable}
                          disabled={clearableInView.length === 0}
                          className="text-xs font-bold font-nunito text-brand hover:underline disabled:opacity-40 disabled:no-underline whitespace-nowrap"
                        >
                          Select all clearable ({clearableInView.length})
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setConfirmBulkDelete(true)}
                          disabled={selectedIds.size === 0}
                          className="text-xs font-bold font-nunito text-red-600 border border-red-200 rounded-full px-3 py-1.5 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          Clear selected
                        </button>
                        <button
                          onClick={exitSelectMode}
                          className="text-xs font-bold font-nunito text-text-secondary border border-border rounded-full px-3 py-1.5 hover:bg-gray-50 whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {selectMode && (
                  <p className="px-4 pt-2 text-[11px] text-text-muted">
                    Only completed, cancelled, or declined bookings can be cleared — pending and confirmed appointments are never removable here.
                  </p>
                )}

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
                  {filtered.map(a => {
                    const clearable = CLEARABLE_STATUSES.has(a.status)
                    const isChecked = selectedIds.has(a.id)
                    return (
                    <div
                      key={a.id}
                      onClick={() => {
                        if (selectMode) {
                          if (clearable) toggleSelected(a.id)
                          return
                        }
                        setSelected(selected?.id === a.id ? null : a)
                      }}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        selectMode
                          ? clearable ? 'cursor-pointer hover:bg-gray-50' : 'opacity-45 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-gray-50'
                      } ${(selectMode ? isChecked : selected?.id === a.id) ? 'bg-brand-pale' : ''}`}
                    >
                      {selectMode && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!clearable}
                          readOnly
                          title={clearable ? undefined : 'Only completed, cancelled, or declined bookings can be cleared'}
                          className="w-4 h-4 flex-shrink-0 accent-brand"
                        />
                      )}
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
                        <p className="text-xs text-text-muted truncate"> · {formatDate(a.date_time)}</p>
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
                  )})}
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
                      { label: 'Date',    value: `${formatDate(selected.date_time)}` },
                      { label: 'Phone',   value: selected.phone },
                      { label: 'KakaoId',   value: selected.kakaoid },
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
                      <>
                      <button
                        onClick={() => setConfirmAction({ type: 'completed', id: selected.id })}
                        disabled={statusLoading}
                        className="w-full py-2.5 rounded-full bg-brand text-white text-sm font-bold font-nunito disabled:opacity-50"
                        >
                        Completed
                      </button>

                      <button
                        onClick={() => setConfirmAction({ type: 'cancel', id: selected.id })}
                        disabled={statusLoading}
                        className="w-full py-2.5 rounded-full border border-border text-text-secondary text-sm font-bold font-nunito disabled:opacity-50"
                        >
                        Cancel appointment
                      </button>
                        </>
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

        {/* ── Calendar view ── */}
        {view === 'calendar' && (
          <CalendarPanel appointments={appointments} onSelectBooking={handleSelectFromCalendar} />
        )}

        {/* ── Services & Styles view ── */}
        {view === 'services' && <CatalogPanel />}

      </div>

      <ConfirmDialog
  action={confirmAction}
  onConfirm={() => {
    if (confirmAction) {
      const statusMap: Record<NonNullable<ConfirmAction>['type'], Booking['status']> = {
        decline: 'declined',
        cancel: 'cancelled',
        completed: 'completed',
      }
      updateStatus(confirmAction.id, statusMap[confirmAction.type])
    }
    setConfirmAction(null)
  }}
  onCancel={() => setConfirmAction(null)}
/>

      {confirmBulkDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-80 text-center shadow-lg">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <i className="ti ti-trash text-xl text-red-500" />
            </div>
            <p className="font-bold font-nunito text-text-primary mb-1.5">
              Delete {selectedIds.size} booking{selectedIds.size !== 1 ? 's' : ''}?
            </p>
            <p className="text-sm text-text-muted mb-5 leading-relaxed">
              This permanently removes {selectedIds.size === 1 ? 'this booking' : 'these bookings'} — completed, cancelled, and declined only. This can't be undone.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="w-full py-2.5 rounded-full border border-red-200 text-red-600 text-sm font-bold font-nunito hover:bg-red-50 disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting…' : 'Yes, delete them'}
              </button>
              <button
                onClick={() => setConfirmBulkDelete(false)}
                disabled={bulkDeleting}
                className="w-full py-2.5 rounded-full border border-border text-text-secondary text-sm font-bold font-nunito hover:bg-gray-50 disabled:opacity-50"
              >
                Keep bookings
              </button>
            </div>
            {bulkDeleteError && <p className="text-xs text-red-500 mt-3">{bulkDeleteError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}