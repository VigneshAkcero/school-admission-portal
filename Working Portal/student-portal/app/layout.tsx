import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { StudentPopmeltProvider } from '@/components/popmelt-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Exam Portal | School Admission Test',
  description: 'School admission examination portal for students',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <StudentPopmeltProvider>{children}</StudentPopmeltProvider>
        <Analytics />
      </body>
    </html>
  )
}
