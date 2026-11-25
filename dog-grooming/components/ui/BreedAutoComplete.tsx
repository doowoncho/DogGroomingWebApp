import { DOG_BREEDS } from "@/lib/data"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

const MAX_SUGGESTIONS = 6
const ROW_HEIGHT = 52 // py-3.5 + 24px line height
const EDGE_GAP = 12   // breathing room above whatever ends the visible area
const MIN_COMFORTABLE_ROWS = 3 // scroll the field up if fewer than this would fit

/**
 * How many suggestion rows fit between the input and the bottom of what the
 * user can actually see: the on-screen keyboard (visualViewport), the app's
 * scroll area, or a pinned bottom action bar — whichever is highest. This way
 * the list never pushes past the fold and never needs scrolling.
 */
function spaceBelow(input: HTMLElement | null): number {
  if (!input || typeof window === 'undefined') return MAX_SUGGESTIONS * ROW_HEIGHT
  const inputBottom = input.getBoundingClientRect().bottom
  const vv = window.visualViewport
  const bounds = [vv ? vv.offsetTop + vv.height : window.innerHeight]
  const scrollArea = document.getElementById('app-scroll')
  if (scrollArea) bounds.push(scrollArea.getBoundingClientRect().bottom)
  const bottomBar = document.querySelector('[data-bottom-bar]')
  if (bottomBar) bounds.push(bottomBar.getBoundingClientRect().top)
  return Math.min(...bounds) - inputBottom - EDGE_GAP
}

function rowsThatFit(input: HTMLElement | null): number {
  return Math.max(1, Math.min(MAX_SUGGESTIONS, Math.floor(spaceBelow(input) / ROW_HEIGHT)))
}

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
  const [open, setOpen] = useState(false)
  const [maxRows, setMaxRows] = useState(MAX_SUGGESTIONS)
  const inputRef = useRef<HTMLInputElement>(null)

  const styles = {
    default: "bg-white ",
    muted: "bg-surface-secondary"
  };

  const matches = DOG_BREEDS.filter((b) =>
    b.toLowerCase().includes(breedQuery.toLowerCase()),
  ).filter((b) => b.toLowerCase() !== breedQuery.toLowerCase())

  const showList = open && breedQuery.length > 0 && matches.length > 0
  const filteredBreeds = matches.slice(0, maxRows)

  const measure = useCallback(() => setMaxRows(rowsThatFit(inputRef.current)), [])
  const wantedRows = Math.min(MIN_COMFORTABLE_ROWS, matches.length)
  const wantedRowsRef = useRef(wantedRows)
  wantedRowsRef.current = wantedRows

  // If the field sits too low (e.g. keyboard open on a short phone), scroll the
  // page up as far as it goes so more suggestions fit, then size the list to the room left.
  const makeRoom = useCallback(() => {
    const input = inputRef.current
    const scrollArea = document.getElementById('app-scroll')
    if (input && scrollArea) {
      const shortBy = Math.ceil(wantedRowsRef.current * ROW_HEIGHT - spaceBelow(input))
      if (shortBy > 0) {
        // never push the field itself off the top of the visible area
        const maxLift = input.getBoundingClientRect().top - scrollArea.getBoundingClientRect().top - EDGE_GAP
        const lift = Math.min(shortBy, maxLift)
        if (lift > 0) scrollArea.scrollTop += lift // the browser caps this at the page end
      }
    }
    measure()
  }, [measure])

  // Re-measure whenever the list is shown or its contents change.
  useLayoutEffect(() => {
    if (showList) makeRoom()
  }, [showList, breedQuery, makeRoom])

  // The keyboard opening/closing or the page scrolling changes the room left.
  useEffect(() => {
    if (!showList) return
    const vv = window.visualViewport
    const scrollArea = document.getElementById('app-scroll')
    vv?.addEventListener('resize', makeRoom)
    vv?.addEventListener('scroll', measure)
    window.addEventListener('resize', makeRoom)
    scrollArea?.addEventListener('scroll', measure, { passive: true })
    return () => {
      vv?.removeEventListener('resize', makeRoom)
      vv?.removeEventListener('scroll', measure)
      window.removeEventListener('resize', makeRoom)
      scrollArea?.removeEventListener('scroll', measure)
    }
  }, [showList, measure, makeRoom])


  return (
     <div>
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {!editMode && `${t.booking.dogBreed} ${optionalTag ? '(optional)' : ''}`}
        </label>
       <input
          ref={inputRef}
          type="text"
          placeholder={t.booking.searchBreed}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          value={breedQuery}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setBreedQuery(e.target.value)
            setOpen(true)
            onChange(e.target.value)
          }}
          className={`${styles[variant]} focus:bg-white w-full px-4 py-3.5 border border-border rounded-[14px] text-base font-nunito-sans text-text-primary outline-none focus:border-brand`}
        />
        {showList && (
          <div className="absolute left-5 right-5 mt-1 bg-white border border-border rounded-[14px] shadow-lg z-999 overflow-hidden">
            {filteredBreeds.map((b) => (
              <button
                key={b}
                type="button"
                // keep focus in the input so the tap isn't lost to the blur
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setBreedQuery(b)
                  setOpen(false)
                  onChange(b)
                }}
                className="w-full text-left px-4 py-3.5 text-base font-medium text-text-primary hover:bg-surface-secondary active:bg-surface-secondary transition-colors"
              >
                {b}
              </button>
            ))}
          </div>
        )}
      </div>
  )
}
