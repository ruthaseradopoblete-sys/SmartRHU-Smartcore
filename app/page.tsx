'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { User, Shield } from 'lucide-react'
import styles from '@/Components/Warehouse.module.css'

export default function AccessPoint() {
  const router = useRouter()
  const [selected, setSelected] = useState<'member' | 'admin' | null>(null)

  const handleSelect = (role: 'member' | 'admin') => {
    setSelected(role)
    setTimeout(() => router.push(`/login?role=${role}`), 200)
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authLeft}>
        <div className={styles.authLeftOverlay} />
        <img
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800"
          alt="Medical background"
          className={styles.authLeftImg}
        />
        <div className={styles.authLeftText}>
          <p className={styles.authLeftSub}>Welcome to</p>
          <p className={styles.authLeftTitle}>
            SMART<span>RHU</span>
          </p>
          <p className={styles.authLeftCaption}>Inventory and Patient Management</p>
        </div>
      </div>

      <div className={styles.authRight}>
        <div className={styles.authLogo}>
          <Image src="/logo.jpg" alt="Logo" width={80} height={80} className={styles.authLogoImg} />
          <p className={styles.authLogoSub}>Rural Healthcare Unit Lopez, Quezon</p>
        </div>

        <div className={styles.authForm}>
          <div className={styles.authDivider} />
          <p className={styles.accessTitle}>Secure Access</p>
          <p className={styles.accessSubtitle}>Select your access type to continue</p>

          <button
            onClick={() => handleSelect('member')}
            className={`${styles.accessBtn} ${selected === 'member' ? '' : ''}`}>
            <div className={styles.accessBtnIcon}><User size={20} /></div>
            <div className={styles.accessBtnTextWrap}>
              <span className={styles.accessBtnLabel}>MEMBER</span>
              <span className={styles.accessBtnSub}>For Staffs</span>
            </div>
            <div className={styles.accessBtnArrow}>▶</div>
          </button>

          <button
            onClick={() => handleSelect('admin')}
            className={`${styles.accessBtn} ${styles.accessBtnAdmin} ${selected === 'admin' ? '' : ''}`}>
            <div className={styles.accessBtnIcon}><Shield size={20} /></div>
            <div className={styles.accessBtnTextWrap}>
              <span className={styles.accessBtnLabel}>ADMIN</span>
              <span className={styles.accessBtnSub}>For Administrator Only</span>
            </div>
            <div className={styles.accessBtnArrow}>▶</div>
          </button>
        </div>

        <p className={styles.authFooter}>
          RHU Lopez Quezon © 2026<br />Department of Health – Philippines
        </p>
      </div>
    </div>
  )
}