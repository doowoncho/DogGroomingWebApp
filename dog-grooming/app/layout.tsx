import type { Metadata, Viewport } from 'next'
import { Nunito, Nunito_Sans } from 'next/font/google'
import './globals.css'

import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import { LanguageProvider } from '@/components/LanguageContext'
import ContactFooter from '@/components/layout/ContactFooter'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito-sans',
  display: 'swap',
  adjustFontFallback: false,
})

export const metadata: Metadata = {
  title: 'Mung Mung Grooming',
  description: 'Private dog grooming.',
  applicationName: 'Mung Mung Grooming',
  appleWebApp: {
    capable: true,
    title: 'Mung Mung',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#faf7f4',
  // Let the on-screen keyboard shrink the layout so sticky actions stay visible.
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
        />
      </head>

      <body
        className={`${nunito.variable} ${nunitoSans.variable} font-nunito-sans bg-surface antialiased`}
      >
        <LanguageProvider>
          <div className="app-frame flex flex-col h-dvh">
            <TopBar />

            <main id="app-scroll" className="flex-1 overflow-y-auto overscroll-contain no-scrollbar">
              {children}
            </main>

            {/* <BottomNav /> */}
            <ContactFooter></ContactFooter>
          </div>
        </LanguageProvider>
      </body>
    </html>
  )
}