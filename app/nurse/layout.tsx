import type { Metadata } from 'next'
import Providers from './components/Provider'

export const metadata: Metadata = {
  title: 'SmartRHU Nurse',
  description: 'Nurse Dashboard',
}

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}