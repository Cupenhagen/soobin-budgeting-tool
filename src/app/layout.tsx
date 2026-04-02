import type { Metadata } from 'next'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { AppProviders } from '@/components/layout/AppProviders'

export const metadata: Metadata = {
  title: 'Soobin — Personal Finance',
  description: 'Your personal finance coach for the Philippines',
  manifest: '/manifest.json',
  themeColor: '#7C3AED',
}

const DEV_BYPASS = process.env.DEV_BYPASS_AUTH === 'true'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const inner = (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders devBypass={DEV_BYPASS}>{children}</AppProviders>
      </body>
    </html>
  )

  if (DEV_BYPASS) return inner

  return <ClerkProvider afterSignOutUrl="/sign-in">{inner}</ClerkProvider>
}
