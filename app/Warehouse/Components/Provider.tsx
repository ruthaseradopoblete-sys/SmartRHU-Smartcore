import type { Metadata } from 'next'

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