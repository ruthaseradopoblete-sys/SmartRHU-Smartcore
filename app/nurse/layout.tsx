import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SmartRHU Nurse',
  description: 'Nurse Dashboard',
}

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}