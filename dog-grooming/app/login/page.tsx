'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false)

  return (
    <div className="app-shell flex flex-col h-dvh">
      {/* Back button */}
      <div className="px-5 pt-4">
        <Link
          href="/"
          className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center inline-flex"
          aria-label="Back"
        >
          <i className="ti ti-arrow-left text-[18px] text-text-secondary" aria-hidden="true" />
        </Link>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="px-5 pt-6 pb-2 text-center">
          <div className="w-20 h-20 bg-brand-pale rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-dog text-[36px] text-brand" aria-hidden="true" />
          </div>
          <h1 className="font-nunito font-extrabold text-[26px] text-text-primary mb-1.5">
            {isSignup ? 'Create account' : 'Welcome back'}
          </h1>
          <p className="text-[14px] text-text-muted leading-relaxed">
            {isSignup
              ? 'Join Kiin and book your first session.'
              : 'Sign in to manage your bookings.'}
          </p>
        </div>

        <div className="px-5 pt-5">
          {/* Google */}
          <button className="w-full bg-white border border-border rounded-full py-3.5 text-[14px] font-bold font-nunito text-text-primary flex items-center justify-center gap-2">
            <i className="ti ti-brand-google text-[18px] text-[#ea4335]" aria-hidden="true" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-2.5 py-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[12px] font-semibold text-text-muted">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Name (signup only) */}
          {isSignup && (
            <div className="mb-3">
              <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
                Full name
              </label>
              <input
                type="text"
                placeholder="Alex Johnson"
                className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans bg-white text-text-primary outline-none focus:border-brand"
              />
            </div>
          )}

          {/* Email */}
          <div className="mb-3">
            <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans bg-white text-text-primary outline-none focus:border-brand"
            />
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans bg-white text-text-primary outline-none focus:border-brand"
            />
          </div>

          {/* Confirm password (signup only) */}
          {isSignup && (
            <div className="mb-3">
              <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans bg-white text-text-primary outline-none focus:border-brand"
              />
            </div>
          )}

          {/* Switch */}
          <p className="text-center text-[13px] text-text-muted font-semibold py-3">
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => setIsSignup((v) => !v)}
              className="text-brand"
            >
              {isSignup ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 py-3.5 bg-surface">
        <Link
          href="/"
          className="w-full bg-brand text-white font-nunito font-bold text-base rounded-full py-4 text-center block"
        >
          {isSignup ? 'Create account' : 'Sign in'}
        </Link>
      </div>
    </div>
  )
}
