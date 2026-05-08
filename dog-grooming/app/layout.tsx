import type { Metadata } from 'next'
import { Nunito, Nunito_Sans } from 'next/font/google'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito-sans',
  display: 'swap',
  adjustFontFallback: false,  // ← add this
})

export const metadata: Metadata = {
  title: 'KIIN — Premium Dog Grooming',
  description: 'Professional dog grooming. Book in under a minute.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Tabler Icons CDN */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
        />
      </head>
      <body
        className={`${nunito.variable} ${nunitoSans.variable} font-nunito-sans bg-surface antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
