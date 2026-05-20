'use client'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import StatsCards from '../components/StatsCards'
import StockLevelChart from '../components/StockLevelChart'
import styles from '../components/warehouse.module.css'

export default function DashboardPage() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className={`${styles.root} ${mounted && theme === 'dark' ? styles.dark : ''}`}>
      <Sidebar />
      <div className={styles.mainArea}>
        <Topbar />
        <div className={styles.content}>
          <p className={styles.pageEyebrow}>Warehouse</p>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <StatsCards />
          <div style={{ marginTop: 16 }}>
            <StockLevelChart />
          </div>
        </div>
      </div>
    </div>
  )
}