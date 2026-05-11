import type { Metadata } from 'next'
import './global.css'

export const metadata: Metadata = {
  title: 'SmartRHU Warehouse',
  description: 'Warehouse Dashboard',
}

export default function WarehouseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}