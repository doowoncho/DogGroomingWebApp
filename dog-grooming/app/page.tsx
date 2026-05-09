import Link from 'next/link'
import { SERVICES } from '@/lib/data'

const PHOTOS = [
  { name: 'Charlie',   breed: 'Golden Retriever', bg: 'from-[#ffd89b] to-[#ff8c42]'  },
  { name: 'Biscuit', breed: 'Labrador',          bg: 'from-[#d4ecd4] to-[#7bc47b]'  },
  { name: 'Coco',    breed: 'Poodle',            bg: 'from-[#ddd6f3] to-[#a18cd1]'  },
  { name: 'Daisy',   breed: 'Shih Tzu',          bg: 'from-[#fbc2eb] to-[#e2789e]'  },
]

const TRUST = [
  { icon: 'ti-certificate', label: 'Korean Certified groomer' },
  { icon: 'ti-home-heart',  label: 'Cage-free salon'    },
  { icon: 'ti-star',        label: '5★ on Google'       },
]

const REVIEWS = [
  {
    initials: 'SK',
    name: 'Sarah K.',
    breed: 'Golden Retriever owner',
    text: '"Dog came home looking absolutely incredible. Kiin is so gentle and professional — we\'ll never go anywhere else."',
    avatarBg: 'bg-brand-pale',
    avatarText: 'text-brand',
  },
  {
    initials: 'JL',
    name: 'James L.',
    breed: 'Labrador owner',
    text: '"Booked in 30 seconds and Biscuit was done in an hour. Best grooming experience we\'ve had in Calgary."',
    avatarBg: 'bg-[#eaf3de]',
    avatarText: 'text-[#3B6D11]',
  },
]

export default function HomePage() {
  return (
    <div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Greeting */}
        <div className="px-5 pt-1">
          <p className="text-[13px] text-text-muted font-semibold">At-Home grooming salon</p>
          <h2 className="font-nunito font-extrabold text-xl text-text-primary mt-0.5">
            Private, low-stress grooming for a calmer experience
          </h2>
        </div>

        {/* Hero banner */}
        <div className="mx-5 mt-4 rounded-[20px] bg-gradient-to-r from-brand to-brand-light p-5 flex items-center justify-between">
          <div>
            {/* <span className="bg-white/25 text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-wide inline-block mb-2">
              10% off this week
            </span> */}
            <h3 className="font-nunito font-extrabold text-xl text-white leading-tight mb-3">
              Book your first<br />session today
            </h3>
            <Link
              href="/book"
              className="bg-white text-brand font-nunito font-bold text-[13px] px-4 py-2 rounded-full inline-block"
            >
              Book now
            </Link>
          </div>
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <i className="ti ti-dog-bowl text-[42px] text-white" aria-hidden="true" />
          </div>
        </div>

        {/* Photo gallery */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-nunito font-extrabold text-[17px] text-text-primary">
            Happy clients 🐾
          </h3>
        </div>

        <div className="px-4">
          <div className="flex justify-center gap-4 overflow-x-auto no-scrollbar pb-1">
            {PHOTOS.map((p) => (
              <div
                key={p.name}
                className={`min-w-[170px] h-[180px] rounded-[18px] bg-gradient-to-br ${p.bg} flex-shrink-0 relative overflow-hidden flex items-center justify-center`}
              >
                <i
                  className="ti ti-dog text-[60px] text-white/60"
                  aria-hidden="true"
                />

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-2.5 pt-5">
                  <p className="text-white text-[12px] font-bold">
                    {p.name} · {p.breed}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-nunito font-extrabold text-[17px] text-text-primary">Why Kiin?</h3>
        </div>
        <div className="grid grid-cols-3 gap-2.5 px-5">
          {TRUST.map(({ icon, label }) => (
            <div key={label} className="bg-white rounded-[16px] p-3.5 text-center border border-border">
              <i className={`ti ${icon} text-[24px] text-brand block mb-1.5`} aria-hidden="true" />
              <p className="text-[11px] font-bold text-text-primary leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Services */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-nunito font-extrabold text-[17px] text-text-primary">Our services</h3>
          {/* <Link href="/book" className="text-[13px] text-brand font-semibold">See all</Link> */}
        </div>
        <div className="px-4">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {SERVICES.map((svc) => (
            <Link
              key={svc.id}
              href="/book"
              className="min-w-[138px] bg-white rounded-[20px] p-4 border border-border flex-shrink-0 block"
            >
              <div className="w-full h-[76px] bg-brand-pale rounded-[14px] flex items-center justify-center mb-2.5">
                <i className={`ti ${svc.icon} text-[34px] text-brand-light`} aria-hidden="true" />
              </div>
              <p className="font-nunito font-bold text-[14px] text-text-primary">{svc.name}</p>
              <p className="text-[11px] text-text-muted mt-0.5 mb-1.5">{svc.duration}</p>
              <p className="font-nunito font-extrabold text-[16px] text-brand">{svc.price}</p>
            </Link>
          ))}
        </div>
        </div>

        {/* Testimonials */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-nunito font-extrabold text-[17px] text-text-primary">What clients say</h3>
        </div>
        {REVIEWS.map((r) => (
          <div key={r.name} className="mx-5 mb-3 bg-white rounded-[20px] p-4 border border-border">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className={`w-10 h-10 rounded-full ${r.avatarBg} flex items-center justify-center font-nunito font-extrabold text-[15px] ${r.avatarText} flex-shrink-0`}>
                {r.initials}
              </div>
              <div>
                <p className="font-nunito font-bold text-[14px] text-text-primary">{r.name}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{r.breed}</p>
              </div>
            </div>
            <p className="text-[13px] text-brand-light mb-1.5">★★★★★</p>
            <p className="text-[13px] text-text-secondary leading-relaxed italic">{r.text}</p>
          </div>
        ))}

        <div className="h-5" />
      </div>
    </div>
  )
}