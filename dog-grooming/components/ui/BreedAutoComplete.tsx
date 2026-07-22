import { DOG_BREEDS } from "@/lib/data"
import { useState } from "react"

export default function BreedAutoComplete({
  breed,
  t,
  onChange,
  variant='default',
  optionalTag = false,
  editMode = false
}: {
  breed: string|null,
  t:any,
  onChange: (breed: string) => void,
  variant?: 'default' | 'muted',
  optionalTag?: boolean,
  editMode?: boolean;
}) {
 const [breedQuery, setBreedQuery] = useState(breed ?? '')
    const styles = {
        default: "bg-white ",
        muted: "bg-surface-secondary"
    };

const filteredBreeds = DOG_BREEDS.filter((breed) =>
    breed.toLowerCase().includes(breedQuery.toLowerCase()),
)
    .filter((breed) => breed.toLowerCase() !== breedQuery.toLowerCase())
    .slice(0, 6)

  return (
     <div>
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {!editMode && `${t.booking.dogBreed} ${optionalTag ? '(optional)' : ''}`}
        </label>
       <input
          type="text"
          placeholder={t.booking.searchBreed}
          value={breedQuery}
          onChange={(e) => {
            setBreedQuery(e.target.value)
            onChange(e.target.value)
          }}
          className={`${styles[variant]} focus:bg-white w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary outline-none focus:border-brand`}
        />
        {breedQuery.length > 0 && filteredBreeds.length > 0 && (
          <div className="absolute left-5 right-5 mt-1 bg-white border border-border rounded-[14px] shadow-lg z-999">
            {filteredBreeds.map((breed) => (
              <button
                key={breed}
                type="button"
                onClick={() => {
                  setBreedQuery(breed)
                  onChange(breed)
                }}
                className="w-full text-left px-4 py-3 text-[14px] font-medium text-text-primary hover:bg-surface-secondary transition-colors"
              >
                {breed}
              </button>
            ))}
          </div>
        )}
      </div>
  )
}
