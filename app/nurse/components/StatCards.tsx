import styles from './nurse.module.css'

interface Stats {
  consultations: number
  vaccinations: number
  waiting: number
}

export default function StatCards({ stats }: { stats: Stats }) {
  const cards = [
    { icon: '🩺', val: stats.consultations, label: 'Consultations Today', accent: '#16a34a' },
    { icon: '💉', val: stats.vaccinations,  label: 'Vaccinations (Mock)',  accent: '#7c3aed' },
    { icon: '⏳', val: stats.waiting,       label: 'Waiting Patients',     accent: '#f59e0b' },
  ]

  return (
    <div className={styles.statGrid}>
      {cards.map(s => (
        <div
          key={s.label}
          className={styles.statCard}
          style={{ borderTop: `3px solid ${s.accent}` }}
        >
          <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 6 }}>{s.icon}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: s.accent, lineHeight: 1 }}>
            {s.val}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 600, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: 0.06, marginTop: 4,
          }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}
