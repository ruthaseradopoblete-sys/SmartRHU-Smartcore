import type { Metadata } from 'next'
import './global.css'
import Providers from './components/Provider'

export const metadata: Metadata = {
  title: 'SmartRHU Warehouse',
  description: 'Warehouse Dashboard',
}

export default function WarehouseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      {children}
    </Providers>
  )
}