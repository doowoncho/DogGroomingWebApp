import Link from 'next/link'

const PETS = [
  {
    name: 'Charlie',
    breed: 'Shih Tzu',
    age: '3 years old',
    weight: '14 lbs',
  },
  {
    name: 'Bear',
    breed: 'Golden Retriever',
    age: '5 years old',
    weight: '62 lbs',
  },
]

export default function PetsPage() {
  return (
    <div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-5 pt-5">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-text-secondary"
      >
        <i className="ti ti-chevron-left text-[16px]" />
        Back
      </Link>

      <h1 className="mt-3 font-nunito font-extrabold text-[24px] text-text-primary">
        My pets
      </h1>

      <p className="text-[13px] text-text-muted mt-1">
        Manage your dogs and grooming preferences.
      </p>
    </div>

        <div className="px-5 pt-5 space-y-3">
          {PETS.map((pet) => (
            <div
              key={pet.name}
              className="bg-white border border-border rounded-[22px] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-brand-pale flex items-center justify-center">
                  <i className="ti ti-dog text-brand text-[24px]" />
                </div>

                <div className="flex-1">
                  <p className="font-nunito font-extrabold text-[17px] text-text-primary">
                    {pet.name}
                  </p>

                  <p className="text-[13px] text-text-secondary">
                    {pet.breed}
                  </p>
                </div>
              </div>

              {/* <div className="flex gap-2 mt-4">
                <div className="flex-1 bg-surface-secondary rounded-[16px] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                    Age
                  </p>

                  <p className="mt-1 text-[13px] font-semibold text-text-primary">
                    {pet.age}
                  </p>
                </div>

                <div className="flex-1 bg-surface-secondary rounded-[16px] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                    Weight
                  </p>

                  <p className="mt-1 text-[13px] font-semibold text-text-primary">
                    {pet.weight}
                  </p>
                </div>
              </div> */}
            </div>
          ))}

          <button className="w-full border-2 border-dashed border-border rounded-[22px] py-5 flex flex-col items-center justify-center text-text-secondary">
            <i className="ti ti-plus text-[24px]" />

            <span className="mt-1 text-[14px] font-bold">
              Add another pet
            </span>
          </button>
        </div>

        <div className="h-8" />
      </div>
    </div>
  )
}