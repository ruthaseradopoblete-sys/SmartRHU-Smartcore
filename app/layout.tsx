import type { Metadata } from 'next'
import Providers from '@/Components/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'SmartRHU Warehouse',
  description: 'Warehouse Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}