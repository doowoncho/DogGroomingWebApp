'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/LanguageContext'
import { translations } from '@/lib/translations'
import { useEffect, useState } from 'react'
import { Dogs } from '@/types'
import { DOG_BREEDS } from '@/lib/data'

export default function PetsPage() {
  const { language } = useLanguage()
  const t = translations[language]

  const [pets, setPets] = useState<Dogs[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBreed, setNewBreed] = useState('')
  const [breedQuery, setBreedQuery] = useState('')
  const [showBreedDropdown, setShowBreedDropdown] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editBreed, setEditBreed] = useState('')
  const [editBreedQuery, setEditBreedQuery] = useState('')
  const [showEditBreedDropdown, setShowEditBreedDropdown] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  
  useEffect(() => {
    async function loadPets() {
      try {
        setLoading(true)
        const res = await fetch('/api/dogs')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load pets')
        setPets(json.dogs || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadPets()
  }, [])

  async function addDog() {
    if (!newName || !newBreed) return
    const res = await fetch('/api/dogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, breed: newBreed }),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error); return }
    setPets((prev) => [...prev, json.dog])
    setNewName('')
    setNewBreed('')
    setBreedQuery('')
    setShowAddForm(false)
  }

async function editDog(id: string, name: string, breed: string) {
  const res = await fetch('/api/dogs', {  // ← no id in the URL
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, breed }),  // ← id goes in the body
  })
  const json = await res.json()
  if (!res.ok) { alert(json.error); return }
  setPets((prev) => prev.map((p) => (p.id === id ? json.dog : p)))
  setEditingId(null)
}

async function deleteDog(id: string) {
  const res = await fetch('/api/dogs', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const json = await res.json()
  if (!res.ok) { alert(json.error); return }
  setPets((prev) => prev.filter((p) => p.id !== id))
}

  return (
    <div>
      {/* Delete confirm popup */}
    {confirmDeleteId && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 pb-100">
        <div className="w-1/2 bg-white rounded-[22px] p-5 space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <i className="ti ti-trash text-red-400 text-[22px]" />
            </div>
            <p className="font-nunito font-extrabold text-[17px] text-text-primary">Remove pet?</p>
            <p className="text-[13px] text-text-muted mt-1">This can't be undone.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="flex-1 border border-border text-text-secondary font-bold text-[14px] py-3 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                deleteDog(confirmDeleteId)
                setConfirmDeleteId(null)
              }}
              className="flex-1 bg-red-400 text-white font-bold text-[14px] py-3 rounded-xl"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    )}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-5 pt-5">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-text-secondary"
          >
            <i className="ti ti-chevron-left text-[16px]" />
            {t.common.back}
          </Link>

          <h1 className="mt-3 font-nunito font-extrabold text-[24px] text-text-primary">
            {t.account.myPets}
          </h1>

          <p className="text-[13px] text-text-muted mt-1">
            {t.pets.subtitle}
          </p>
        </div>

        {loading && (
          <p className="px-5 pt-5 text-sm text-text-muted">Loading pets...</p>
        )}

        {error && (
          <p className="px-5 pt-5 text-sm text-red-500">{error}</p>
        )}

        <div className="px-5 pt-5 space-y-3">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className="bg-white border border-border rounded-[22px] p-4"
            >
            {editingId === pet.id ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-brand-pale flex items-center justify-center flex-shrink-0">
                <i className="ti ti-dog text-brand text-[24px]" />
              </div>
              <div className="flex-1 space-y-2">
                <input
                  className="border border-border rounded-xl px-3 py-2 text-[14px] font-nunito font-extrabold text-text-primary outline-none focus:border-brand"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Name"
                  autoFocus
                />
                <div className="relative">
                  <input
                    className="border border-border rounded-xl px-3 py-2 text-[14px] text-text-primary outline-none focus:border-brand"
                    placeholder="Search breed"
                    value={editBreedQuery}
                    onChange={(e) => {
                      setEditBreedQuery(e.target.value)
                      setEditBreed(e.target.value)
                      setShowEditBreedDropdown(true)
                    }}
                    onFocus={() => setShowEditBreedDropdown(true)}
                  />
                  {showEditBreedDropdown && editBreedQuery.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-border rounded-[14px] shadow-lg z-20">
                      {DOG_BREEDS
                        .filter((breed) => breed.toLowerCase().includes(editBreedQuery.toLowerCase()))
                        .filter((breed) => breed !== editBreedQuery)
                        .slice(0, 6)
                        .map((breed) => (
                          <button
                            key={breed}
                            type="button"
                            onClick={() => {
                              setEditBreedQuery(breed)
                              setEditBreed(breed)
                              setShowEditBreedDropdown(false)
                            }}
                            className="w-full text-left px-4 py-3 text-[14px] font-medium text-text-primary hover:bg-surface-secondary"
                          >
                            {breed}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => editDog(pet.id, editName, editBreed)}
                className="flex-1 bg-brand text-white font-bold text-[14px] py-2.5 rounded-xl"
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="flex-1 border border-border text-text-secondary font-bold text-[14px] py-2.5 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-brand-pale flex items-center justify-center">
                    <i className="ti ti-dog text-brand text-[24px]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-nunito font-extrabold text-[17px] text-text-primary">
                      {pet.name}
                    </p>
                    <p className="text-[13px] text-text-secondary">
                      {pet.breed ?? 'Unknown breed'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingId(pet.id)
                      setEditName(pet.name)
                      setEditBreed(pet.breed ?? '')
                      setEditBreedQuery(pet.breed ?? '')
                    }}
                    className="text-sm text-brand font-bold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(pet.id)}
                    className="text-text-muted hover:text-red-400 transition-colors"
                  >
                    <i className="ti ti-trash text-[18px]" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {!loading && pets.length === 0 && (
            <p className="text-sm text-text-muted px-2">No pets found.</p>
          )}

          {/* Add form */}
          {showAddForm ? (
            <div className="bg-white border border-border rounded-[22px] p-4 space-y-3">
              <p className="font-nunito font-extrabold text-[15px] text-text-primary">
                New pet
              </p>
              <input
                className="w-full border border-border rounded-xl px-3 py-2 text-[14px] text-text-primary outline-none focus:border-brand"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <div className="relative">
                <input
                  className="w-full border border-border rounded-xl px-3 py-2 text-[14px] text-text-primary outline-none focus:border-brand"
                  placeholder="Search breed"
                  value={breedQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    setBreedQuery(value)
                    setNewBreed(value)
                    setShowBreedDropdown(true)
                  }}
                  onFocus={() => setShowBreedDropdown(true)}
                />
                {showBreedDropdown && breedQuery.length > 0 && (
                  <div className="left-0 right-0 mt-1 bg-white border border-border rounded-[14px] shadow-lg z-20">
                    {DOG_BREEDS
                      .filter((breed) =>
                        breed.toLowerCase().includes(breedQuery.toLowerCase())
                      )
                      .filter((breed) => breed !== breedQuery)
                      .slice(0, 6)
                      .map((breed) => (
                        <button
                          key={breed}
                          type="button"
                          onClick={() => {
                            setBreedQuery(breed)
                            setNewBreed(breed)
                            setShowBreedDropdown(false)
                          }}
                          className="w-full text-left px-4 py-3 text-[14px] font-medium text-text-primary hover:bg-surface-secondary"
                        >
                          {breed}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addDog}
                  className="flex-1 bg-brand text-white font-bold text-[14px] py-2.5 rounded-xl"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewName(''); setNewBreed(''); setBreedQuery('') }}
                  className="flex-1 border border-border text-text-secondary font-bold text-[14px] py-2.5 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full border-2 border-dashed border-border rounded-[22px] py-5 flex flex-col items-center justify-center text-text-secondary"
            >
              <i className="ti ti-plus text-[24px]" />
              <span className="mt-1 text-[14px] font-bold">
                {t.pets.addAnotherPet}
              </span>
            </button>
          )}
        </div>

        <div className="h-8" />
      </div>
    </div>
  )
}