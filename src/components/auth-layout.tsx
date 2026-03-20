import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

const BrandIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor" opacity="0.95" />
    <rect x="13" y="2" width="9" height="9" rx="2" fill="currentColor" opacity="0.45" />
    <rect x="2" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.45" />
    <rect x="13" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.95" />
  </svg>
)

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* ── Left decorative panel ── */}
      <div
        className="hidden lg:flex lg:w-[44%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0f0c29 0%, #302b63 52%, #4a1d96 100%)' }}
      >
        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* Decorative ring — top right */}
        <div
          className="absolute -top-28 -right-28 w-[420px] h-[420px] rounded-full border border-white"
          style={{ animation: 'auth-pulse-ring 7s ease-in-out infinite', opacity: 0.07 }}
        />
        <div
          className="absolute -top-10 -right-10 w-72 h-72 rounded-full border border-white"
          style={{ animation: 'auth-pulse-ring 7s ease-in-out infinite 1.2s', opacity: 0.05 }}
        />

        {/* Decorative ring — bottom left */}
        <div
          className="absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full border border-white"
          style={{ animation: 'auth-pulse-ring 8s ease-in-out infinite 2.4s', opacity: 0.06 }}
        />

        {/* Decorative ring — mid right */}
        <div
          className="absolute top-1/2 -right-16 w-52 h-52 rounded-full border border-white/[0.05]"
        />

        {/* Glowing orb */}
        <div
          className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.38) 0%, rgba(79,70,229,0.18) 45%, transparent 75%)',
            animation: 'auth-float 8s ease-in-out infinite',
          }}
        />

        {/* Rotating accent ring */}
        <div
          className="absolute top-[38%] left-[42%] w-36 h-36 rounded-full border border-dashed border-violet-400/20"
          style={{ animation: 'auth-spin-slow 18s linear infinite' }}
        />

        {/* Logo */}
        <Link to="/login" className="relative z-10 flex items-center gap-3 w-fit">
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/15 shrink-0">
            <BrandIcon className="w-[18px] h-[18px] text-white" />
          </div>
          <span
            className="text-white font-semibold text-[17px] tracking-tight"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            POS Tempest
          </span>
        </Link>

        {/* Tagline */}
        <div className="relative z-10">
          <p
            className="text-[2.5rem] font-bold text-white leading-[1.15] tracking-tight"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Manage your
            <br />
            <span style={{ color: '#c4b5fd' }}>business</span>
            <br />
            with ease.
          </p>
          <p className="mt-5 text-white/40 text-sm leading-relaxed max-w-[270px]">
            A complete point-of-sale and content management system built for modern businesses.
          </p>
        </div>

        {/* Bottom indicator dots */}
        <div className="relative z-10 flex items-center gap-1.5">
          <div className="w-6 h-1.5 rounded-full bg-violet-400/80" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Mobile-only logo bar */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <BrandIcon className="w-4 h-4 text-white" />
          </div>
          <span
            className="font-semibold text-gray-900 text-sm"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            POS Tempest
          </span>
        </div>

        {/* Centered content */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
      </div>
    </div>
  )
}
