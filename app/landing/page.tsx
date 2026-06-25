'use client'
import React, { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus_Jakarta_Sans, Public_Sans, IBM_Plex_Mono } from 'next/font/google'
import { ORG_CHART_SVG } from './orgChartSvg'

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
})
const body = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
})

const NAV_LINKS = [
  { id: 'history', label: 'History' },
  { id: 'mission', label: 'Mission & Vision' },
  { id: 'units', label: 'Units' },
  { id: 'orgchart', label: 'Org Chart' },
  { id: 'team', label: 'Dev Team' },
]

// Lopez, at a glance — real figures from the 2022 census / municipal profile.
const STATS = [
  { value: '103,411', label: 'Lopezeños served (2022)' },
  { value: '95', label: 'Barangays covered' },
  { value: '395.1', label: 'Sq. km land area' },
  { value: '9', label: 'Political districts' },
]

// The eight working units of the RHU — staff counts taken from the org chart.
const UNITS = [
  { name: 'Medical', count: 4, blurb: 'Consultation and diagnosis by the unit doctors.', icon: 'stethoscope' },
  { name: 'Nursing', count: 10, blurb: 'Public health nurses leading community care.', icon: 'pulse' },
  { name: 'Rural Health Midwives', count: 20, blurb: 'Maternal and barangay-level frontline care.', icon: 'baby' },
  { name: 'Dental', count: 3, blurb: 'Oral health checks and dental treatment.', icon: 'tooth' },
  { name: 'Laboratory & Radiology', count: 5, blurb: 'Lab tests and imaging that back diagnosis.', icon: 'flask' },
  { name: 'Pharmacy', count: 2, blurb: 'Dispensing and medicine stock management.', icon: 'pill' },
  { name: 'Sanitary Inspection', count: 5, blurb: 'Environmental health and food safety checks.', icon: 'shield' },
  { name: 'Administrative & Support', count: 14, blurb: 'Records, encoding, transport and logistics.', icon: 'folder' },
]

const TEAM = [
  { name: 'Lynnel Barroa', role: 'Lead Programmer' },
  { name: 'Mariel Palaya', role: 'Programmer' },
  { name: 'Ruth Poblete', role: 'Programmer' },
  { name: 'Lovely Gift Navera', role: 'UI / UX Designer' },
]

// History, restructured as a dated record — order here is real chronology, not decoration.
const TIMELINE = [
  {
    era: '16th Century',
    title: 'The Kalilayan Kingdom of Lakan Bugtali',
    text: `There was once a flourishing coastal settlement in the southern part of
      what is now Gumaca, named Talolong — after a sturdy tree abundant in the
      area. Founded by the descendants of Datu Dumangsil and Balingsula of the
      Kalilayan Kingdom, the settlement faced frequent raids from pirates and
      was eventually moved to the town's present location. Of the original
      settlement, no trace remains today — not even a fraction of its 16th
      century history.`,
  },
  {
    era: '1792 – 1856',
    title: 'From barrio to township',
    text: `In 1792, Don Miguel de San Agustin, provincial governor of Tayabas,
      named the settlement "Vista Talolong." By 1795, Don Francisco
      de San Jose became its first Teniente Mayor, tasked with protecting the
      village from piracy. Peace drew settlers, among them Mateo Lopez of
      Tayabas, who helped found the community as "Pueblo." With the
      help of Señora Hermana Vito, Mateo Lopez traveled to Manila and, on
      April 30, 1856, returned with the Spanish Governor-General's
      certificate of approval — formally founding the town that bears his name.`,
  },
  {
    era: 'Modern Era',
    title: 'Growth and governance',
    text: `Under the administration of Don Antonio Fortuna, salaries of employees
      were increased to bring greater standardization of living and efficiency
      in public service — a step toward the modern local government Lopez has
      today.`,
  },
  {
    era: 'Present Day',
    title: 'Lopez today',
    text: `Lopez is now one of the largest municipalities in Quezon Province, with a
      total land area of 395.1 square kilometers — 4.53% of the province. It is
      composed of 95 barangays (7 urban, 88 rural) across nine political
      districts, and recorded a population of 103,411 in 2022, making it one of
      the first-class municipalities in the Fourth Congressional District.`,
  },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

/* Small line icons for the unit cards — thin green strokes. */
function UnitIcon({ name }: { name: string }) {
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'stethoscope':
      return (
        <svg viewBox="0 0 24 24" {...p}>
          <path d="M5 3v6a4 4 0 0 0 8 0V3" />
          <path d="M9 13v2a5 5 0 0 0 10 0v-2" />
          <circle cx="19" cy="9" r="2" />
        </svg>
      )
    case 'pulse':
      return (
        <svg viewBox="0 0 24 24" {...p}>
          <path d="M3 12h4l2-5 4 10 2-5h6" />
        </svg>
      )
    case 'baby':
      return (
        <svg viewBox="0 0 24 24" {...p}>
          <circle cx="12" cy="6" r="3" />
          <path d="M12 9c-4 0-7 3-7 7v2h14v-2c0-4-3-7-7-7Z" />
          <path d="M9 13h.01M15 13h.01" />
        </svg>
      )
    case 'tooth':
      return (
        <svg viewBox="0 0 24 24" {...p}>
          <path d="M7 3c-2.5 0-4 2-4 5 0 4 1.5 6 2.5 11 .4 1.8 2.6 1.8 3-.2.4-2 .8-3.5 1.5-3.5s1.1 1.5 1.5 3.5c.4 2 2.6 2 3 .2C16.5 14 18 12 18 8c0-3-1.5-5-4-5-1.5 0-2.5 1-3 1s-1.5-1-4-1Z" />
        </svg>
      )
    case 'flask':
      return (
        <svg viewBox="0 0 24 24" {...p}>
          <path d="M9 3h6M10 3v6l-5 8a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 17l-5-8V3" />
          <path d="M7.5 14h9" />
        </svg>
      )
    case 'pill':
      return (
        <svg viewBox="0 0 24 24" {...p}>
          <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)" />
          <path d="M9 9l6 6" />
        </svg>
      )
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" {...p}>
          <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
    case 'folder':
      return (
        <svg viewBox="0 0 24 24" {...p}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
          <path d="M8 13h8M8 16h5" />
        </svg>
      )
    default:
      return null
  }
}

export default function LandingPage() {
  // Scroll-reveal: lightweight, no library, respects reduced-motion via CSS.
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    if (!els.length) return
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('isVisible')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.18 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <div className={`landingRoot ${display.variable} ${body.variable} ${mono.variable}`}>

      {/* ── Sticky nav ── */}
      <nav className="heroNav">
        <div className="heroNavBrand">
          <Image src="/logo.jpg" alt="" width={46} height={46} className="navSeal" />
          <span>SMART<span className="brandThin">RHU</span></span>
        </div>
        <div className="heroNavLinks">
          {NAV_LINKS.map(link => (
            <button key={link.id} onClick={() => scrollToId(link.id)} className="navLink">
              {link.label}
            </button>
          ))}
        </div>
        <Link href="/login" className="navCta">Open the system</Link>
      </nav>

      {/* ── Hero ── */}
      <header className="hero" id="top">
        <div className="heroImage" />
        <div className="heroOverlay" />

        {/* Floating "served" badge */}
        <div className="heroBadge" data-reveal>
          <div className="badgeAvatars">
            <span>LQ</span><span>RH</span><span>U</span>
          </div>
          <div className="badgeText">
            <strong>103,411</strong>
            <small>Lopezeños served</small>
          </div>
          <svg className="badgeCheck" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div className="heroContent">
          <p className="heroEyebrow"><span className="eyebrowBar" />Rural Healthcare Unit · Lopez, Quezon</p>
          <h1 className="heroTitle">
            Welcome to<br />
            SMART<span className="accent">RHU</span>
          </h1>
          <p className="heroLead">A standing record of inventory and patient care.</p>

          <div className="heroActions">
            <Link href="/login" className="ctaPrimary">
              <span>Open the system</span>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <button className="ctaPlay" onClick={() => scrollToId('history')}>
              <span className="playDot">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
              See our story
            </button>
          </div>
        </div>

        {/* Frosted stats bar overlapping the hero bottom */}
        <div className="statBar" data-reveal>
          {STATS.map((s, i) => (
            <div className="statItem" key={s.label}>
              <div className="statValue">{s.value}</div>
              <div className="statLabel">{s.label}</div>
              {i < STATS.length - 1 && <span className="statDivider" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </header>

      {/* ── History — a dated record ── */}
      <section className="section" id="history">
        <p className="sectionEyebrow"><span className="eyebrowDot" />Brief profile of the municipality of Lopez</p>
        <h2 className="sectionTitle">Our history</h2>

        <div className="timeline">
          {TIMELINE.map((entry, i) => (
            <div className="timelineItem" key={entry.title} data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
              <div className="timelineMarker">{entry.era}</div>
              <div className="timelineCard">
                <h3 className="historyCardTitle">{entry.title}</h3>
                <p className="historyText">{entry.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="section sectionAlt" id="mission">
        <span className="blob blobMission" aria-hidden="true" />
        <p className="sectionEyebrow"><span className="eyebrowDot" />Lopez Rural Health Unit</p>
        <h2 className="sectionTitle">Mission &amp; vision</h2>

        <div className="mvGrid">
          <div className="mvCard mvLight" data-reveal>
            <span className="mvLabel">Mission</span>
            <p className="mvText">
              To ensure the implementation of responsive health programs for
              Lopezeños through concerted efforts of the Local Government Unit,
              Non-Government Organizations, and the community.
            </p>
          </div>
          <div className="mvCard mvDark" data-reveal style={{ transitionDelay: '90ms' }}>
            <span className="mvLabel">Vision</span>
            <p className="mvText">
              A quality health care delivery system in attaining better health
              outcomes, competitive and responsive health care system toward a
              healthy and productive Lopezeños.
            </p>
          </div>
        </div>
      </section>

      {/* ── Units (departments grid) ── */}
      <section className="section" id="units">
        <span className="blob blobUnits" aria-hidden="true" />
        <p className="sectionEyebrow"><span className="eyebrowDot" />Lopez Rural Health Unit</p>
        <h2 className="sectionTitle">Our units</h2>
        <p className="sectionSub">
          The Lopez RHU works through eight teams, from medical and nursing to
          sanitation and records. The full roster sits in the org chart below.
        </p>

        <div className="unitGrid">
          {UNITS.map((u, i) => (
            <div key={u.name} className="unitCard" data-reveal style={{ transitionDelay: `${i * 50}ms` }}>
              <div className="unitIcon"><UnitIcon name={u.icon} /></div>
              <div className="unitBody">
                <div className="unitHead">
                  <h3 className="unitName">{u.name}</h3>
                  <span className="unitCount">{u.count} staff</span>
                </div>
                <p className="unitBlurb">{u.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Organizational Chart ── */}
      <section className="section sectionAlt" id="orgchart">
        <p className="sectionEyebrow"><span className="eyebrowDot" />Lopez Rural Health Unit</p>
        <h2 className="sectionTitle">Organizational chart</h2>
        <p className="sectionSub">Drag or scroll sideways to see the full structure.</p>

        <div className="orgChartWrap" data-reveal>
          <div className="orgChartScroll" dangerouslySetInnerHTML={{ __html: ORG_CHART_SVG }} />
          <div className="orgChartFade" />
        </div>
      </section>

      {/* ── Dev Team ── */}
      <section className="section" id="team">
        <p className="sectionEyebrow"><span className="eyebrowDot" />Built by</p>
        <h2 className="sectionTitle">Development team</h2>
        <p className="sectionSub">The team behind SMARTRHU&rsquo;s inventory and patient management system.</p>

        <div className="teamGrid">
          {TEAM.map((member, i) => (
            <div key={member.name} className="teamCard" data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
              <div className="teamAvatar">{member.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
              <p className="teamName">{member.name}</p>
              <span className="teamRole">{member.role}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landingFooter">
        <Image src="/logo.jpg" alt="" width={52} height={52} className="footerSeal" />
        <p className="footerText">
          RHU Lopez Quezon © {new Date().getFullYear()}<br />
          Department of Health — Philippines
        </p>
      </footer>

      <style>{`
        * { box-sizing: border-box; }

        .landingRoot {
          --green: #1f8a4c;
          --green-bright: #34a866;
          --green-deep: #15633a;
          --green-soft: #e8f5ee;
          --green-mist: #f3faf6;
          --leaf: #bfe6cf;
          --paper: #ffffff;
          --line: #d8e9df;
          --text: #1c2b22;
          --text-muted: #5f7268;

          width: 100%;
          font-family: var(--font-body), system-ui, sans-serif;
          background: var(--paper);
          color: var(--text);
          overflow-x: clip;
        }

        [data-reveal] {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }
        [data-reveal].isVisible { opacity: 1; transform: none; }
        @media (prefers-reduced-motion: reduce) {
          [data-reveal] { opacity: 1 !important; transform: none !important; transition: none !important; }
        }

        .eyebrowDot {
          display: inline-block;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--green);
          margin-right: 10px;
          position: relative;
          top: -1px;
        }

        /* ── Nav (a touch larger) ── */
        .heroNav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 26px;
          padding: 20px 50px;
          background: rgba(21, 99, 58, 0.78);
          border-bottom: 1px solid rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(12px);
        }
        .heroNavBrand {
          display: flex;
          align-items: center;
          gap: 13px;
          font-family: var(--font-display), sans-serif;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.01em;
          color: #ffffff;
        }
        .brandThin { color: var(--leaf); font-weight: 700; }
        .navSeal {
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
        .heroNavLinks { display: flex; gap: 2px; }
        .navLink {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.85);
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-body), sans-serif;
          padding: 9px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .navLink:hover { background: rgba(255, 255, 255, 0.16); color: #fff; }
        .navLink:focus-visible { outline: 2px solid var(--leaf); outline-offset: 2px; }
        .navCta {
          flex-shrink: 0;
          background: #ffffff;
          color: var(--green-deep);
          font-size: 14px;
          font-weight: 700;
          padding: 10px 20px;
          border-radius: 999px;
          text-decoration: none;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .navCta:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(21,99,58,0.3); }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-bottom: 84px;
        }
        .heroImage {
          position: absolute;
          inset: -24px;
          background-image: url('/landing.jpg');
          background-size: cover;
          background-position: center;
          transform: scale(1.05);
        }
        .heroOverlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            rgba(16, 71, 41, 0.95) 0%,
            rgba(21, 99, 58, 0.84) 40%,
            rgba(52, 168, 102, 0.4) 100%
          );
        }

        .heroBadge {
          position: absolute;
          z-index: 3;
          top: 116px;
          right: 56px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.96);
          border-radius: 999px;
          padding: 9px 16px 9px 10px;
          box-shadow: 0 16px 40px rgba(16, 71, 41, 0.32);
        }
        .badgeAvatars { display: flex; }
        .badgeAvatars span {
          width: 30px; height: 30px;
          border-radius: 50%;
          margin-left: -9px;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-mono), monospace;
          font-size: 9.5px;
          font-weight: 600;
          color: #fff;
          border: 2px solid #fff;
          background: var(--green);
        }
        .badgeAvatars span:first-child { margin-left: 0; background: var(--green-deep); }
        .badgeAvatars span:last-child { background: var(--green-bright); }
        .badgeText { display: flex; flex-direction: column; line-height: 1.1; }
        .badgeText strong { font-family: var(--font-display), sans-serif; font-size: 15px; font-weight: 800; color: var(--green-deep); }
        .badgeText small { font-size: 10.5px; color: var(--text-muted); }
        .badgeCheck {
          width: 22px; height: 22px;
          padding: 5px;
          border-radius: 50%;
          background: var(--green-bright);
          color: #fff;
          margin-left: 2px;
        }
        @media (max-width: 980px) { .heroBadge { display: none; } }

        .heroContent {
          position: relative;
          z-index: 2;
          padding: 0 56px;
          max-width: 720px;
        }
        .heroEyebrow {
          display: flex;
          align-items: center;
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.84);
          margin: 0 0 22px;
        }
        .eyebrowBar {
          display: inline-block;
          width: 26px; height: 2px;
          background: var(--leaf);
          margin-right: 12px;
        }
        .heroTitle {
          font-family: var(--font-display), sans-serif;
          font-size: clamp(3rem, 6.2vw, 5rem);
          font-weight: 800;
          line-height: 1.04;
          letter-spacing: -0.025em;
          color: #ffffff;
          margin: 0 0 18px;
        }
        .heroTitle .accent { color: var(--leaf); }
        .heroLead {
          font-size: 17px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.85);
          margin: 0 0 38px;
          max-width: 42ch;
        }

        .heroActions { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
        .ctaPrimary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          color: var(--green-deep);
          font-family: var(--font-body), sans-serif;
          font-size: 15px;
          font-weight: 700;
          padding: 15px 28px;
          border-radius: 999px;
          text-decoration: none;
          box-shadow: 0 14px 34px rgba(16, 71, 41, 0.34);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .ctaPrimary:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(16,71,41,0.4); }
        .ctaPrimary svg { transition: transform 0.2s ease; }
        .ctaPrimary:hover svg { transform: translateX(3px); }
        .ctaPrimary:focus-visible { outline: 3px solid var(--leaf); outline-offset: 3px; }
        .ctaPlay {
          display: inline-flex;
          align-items: center;
          gap: 13px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #fff;
          font-family: var(--font-body), sans-serif;
          font-size: 14.5px;
          font-weight: 600;
        }
        .playDot {
          width: 42px; height: 42px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255, 255, 255, 0.16);
          border: 1.5px solid rgba(255, 255, 255, 0.5);
          color: #fff;
          transition: background 0.18s ease, transform 0.18s ease;
        }
        .ctaPlay:hover .playDot { background: rgba(255,255,255,0.28); transform: scale(1.06); }
        .ctaPlay:focus-visible { outline: 2px solid var(--leaf); outline-offset: 4px; border-radius: 8px; }

        /* ── Frosted stats bar ── */
        .statBar {
          position: absolute;
          z-index: 4;
          left: 56px; right: 56px;
          bottom: -46px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 20px;
          padding: 30px 20px;
          box-shadow: 0 24px 60px rgba(16, 71, 41, 0.2);
          backdrop-filter: blur(10px);
        }
        .statItem { position: relative; text-align: center; padding: 0 12px; }
        .statValue {
          font-family: var(--font-display), sans-serif;
          font-size: clamp(1.7rem, 2.6vw, 2.3rem);
          font-weight: 800;
          color: var(--green-deep);
          letter-spacing: -0.02em;
        }
        .statLabel { font-size: 12.5px; color: var(--text-muted); margin-top: 4px; }
        .statDivider {
          position: absolute;
          right: 0; top: 50%;
          transform: translateY(-50%);
          width: 1px; height: 42px;
          background: var(--line);
        }

        /* ── Generic section ── */
        .section {
          position: relative;
          padding: 96px 56px;
          max-width: 1200px;
          margin: 0 auto;
          scroll-margin-top: 84px;
        }
        #history { padding-top: 132px; }
        .sectionAlt {
          background: var(--green-mist);
          max-width: 100%;
          margin: 0;
        }
        .sectionAlt > .sectionEyebrow,
        .sectionAlt > .sectionTitle,
        .sectionAlt > .sectionSub,
        .sectionAlt > .mvGrid,
        .sectionAlt > .orgChartWrap {
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }
        .sectionEyebrow {
          display: flex;
          align-items: center;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--green);
          margin: 0 0 12px;
        }
        .sectionTitle {
          font-family: var(--font-display), sans-serif;
          font-size: clamp(2rem, 3.4vw, 2.8rem);
          font-weight: 800;
          color: var(--green-deep);
          letter-spacing: -0.025em;
          line-height: 1.1;
          margin: 0 0 14px;
        }
        .sectionSub {
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-muted);
          margin: 0 0 44px;
          max-width: 560px;
        }

        /* soft background blobs */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(46px);
          z-index: 0;
          pointer-events: none;
        }
        .blobMission { width: 360px; height: 360px; background: rgba(52,168,102,0.16); top: -60px; right: -80px; }
        .blobUnits { width: 420px; height: 420px; background: rgba(52,168,102,0.12); bottom: -120px; left: -140px; }
        .section > *:not(.blob) { position: relative; z-index: 1; }

        /* ── History timeline ── */
        .timeline {
          position: relative;
          margin-top: 40px;
          padding-left: 124px;
        }
        .timeline::before {
          content: '';
          position: absolute;
          left: 48px; top: 6px; bottom: 6px;
          width: 2px;
          background: linear-gradient(var(--green-bright), var(--leaf));
          border-radius: 2px;
        }
        .timelineItem { position: relative; padding-bottom: 26px; }
        .timelineItem:last-child { padding-bottom: 0; }
        .timelineMarker {
          position: absolute;
          left: -124px; top: 24px;
          width: 96px;
          font-family: var(--font-mono), monospace;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--green);
          text-align: right;
          padding-right: 24px;
          line-height: 1.3;
        }
        .timelineMarker::after {
          content: '';
          position: absolute;
          right: -6px; top: 1px;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid var(--green-bright);
        }
        .timelineCard {
          background: #ffffff;
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 26px 30px;
          box-shadow: 0 6px 20px rgba(16, 71, 41, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .timelineCard:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(16, 71, 41, 0.1); }
        .historyCardTitle {
          font-family: var(--font-display), sans-serif;
          font-size: 17.5px;
          font-weight: 700;
          color: var(--green-deep);
          margin: 0 0 10px;
        }
        .historyText {
          font-size: 14px;
          line-height: 1.75;
          color: var(--text-muted);
          margin: 0;
        }

        /* ── Mission & Vision ── */
        .mvGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 26px;
          margin-top: 38px;
        }
        .mvCard {
          border-radius: 20px;
          padding: 44px 42px;
          position: relative;
        }
        .mvLight { background: #ffffff; border: 1px solid var(--line); box-shadow: 0 10px 30px rgba(16,71,41,0.05); }
        .mvDark {
          background: linear-gradient(150deg, var(--green-deep) 0%, var(--green) 130%);
          box-shadow: 0 18px 40px rgba(16, 71, 41, 0.22);
        }
        .mvLabel {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--green);
          margin-bottom: 18px;
        }
        .mvDark .mvLabel { color: var(--leaf); }
        .mvText {
          font-family: var(--font-display), sans-serif;
          font-size: 18px;
          font-weight: 500;
          line-height: 1.55;
          color: var(--green-deep);
          margin: 0;
        }
        .mvDark .mvText { color: rgba(255,255,255,0.94); }

        /* ── Units grid ── */
        .unitGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 22px;
        }
        .unitCard {
          display: flex;
          gap: 16px;
          background: #ffffff;
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 26px 22px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .unitCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 36px rgba(16, 71, 41, 0.12);
          border-color: var(--green-bright);
        }
        .unitIcon {
          flex-shrink: 0;
          width: 46px; height: 46px;
          border-radius: 13px;
          background: var(--green-soft);
          color: var(--green);
          display: flex; align-items: center; justify-content: center;
        }
        .unitIcon svg { width: 24px; height: 24px; }
        .unitHead { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 7px; }
        .unitName {
          font-family: var(--font-display), sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--green-deep);
          margin: 0;
          line-height: 1.2;
        }
        .unitCount {
          flex-shrink: 0;
          font-family: var(--font-mono), monospace;
          font-size: 10px;
          font-weight: 500;
          color: var(--green);
          background: var(--green-soft);
          padding: 3px 8px;
          border-radius: 20px;
        }
        .unitBlurb { font-size: 12.5px; line-height: 1.5; color: var(--text-muted); margin: 0; }

        /* ── Org chart ── */
        .orgChartWrap { position: relative; margin-top: 8px; }
        .orgChartScroll {
          overflow-x: auto;
          padding: 16px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 18px;
          box-shadow: 0 10px 30px rgba(16, 71, 41, 0.06);
          text-align: left;
        }
        .orgChartFade {
          position: absolute;
          top: 16px; right: 1px; bottom: 16px;
          width: 60px;
          background: linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.96));
          border-radius: 0 18px 18px 0;
          pointer-events: none;
        }

        /* ── Dev Team ── */
        .teamGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        .teamCard {
          background: #ffffff;
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 34px 20px 28px;
          text-align: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .teamCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 34px rgba(16, 71, 41, 0.12);
          border-color: var(--green-bright);
        }
        .teamAvatar {
          width: 62px; height: 62px;
          border-radius: 50%;
          background: linear-gradient(150deg, var(--green-deep), var(--green-bright));
          color: #ffffff;
          font-family: var(--font-display), sans-serif;
          font-size: 18px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
        }
        .teamName {
          font-family: var(--font-display), sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--green-deep);
          margin: 0 0 9px;
        }
        .teamRole {
          display: inline-block;
          font-family: var(--font-mono), monospace;
          font-size: 10px;
          letter-spacing: 0.02em;
          color: var(--green);
          background: var(--green-soft);
          padding: 4px 12px;
          border-radius: 20px;
        }

        /* ── Footer ── */
        .landingFooter {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 60px 48px;
          background: var(--green-deep);
        }
        .footerSeal {
          border-radius: 13px;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .footerText {
          font-family: var(--font-mono), monospace;
          font-size: 11.5px;
          color: rgba(255, 255, 255, 0.6);
          text-align: center;
          line-height: 1.8;
          margin: 0;
        }

        /* ── Tablet ── */
        @media (max-width: 1024px) {
          .unitGrid { grid-template-columns: repeat(2, 1fr); }
          .teamGrid { grid-template-columns: repeat(2, 1fr); }
        }

        /* ── Mobile ── */
        @media (max-width: 860px) {
          .heroNav { padding: 16px 22px; gap: 14px; }
          .heroNavLinks { display: none; }
          .heroContent { padding: 0 24px; }
          .heroTitle { font-size: clamp(2.6rem, 11vw, 3.6rem); }
          .statBar {
            position: static;
            left: auto; right: auto; bottom: auto;
            margin: 40px 24px 0;
            grid-template-columns: repeat(2, 1fr);
            gap: 26px 0;
            backdrop-filter: none;
          }
          .statItem:nth-child(2n) .statDivider { display: none; }
          .hero { padding-bottom: 48px; }
          .section { padding: 64px 24px; }
          #history { padding-top: 80px; }
          .timeline { padding-left: 0; margin-top: 32px; }
          .timeline::before { left: 7px; }
          .timelineItem { padding-left: 36px; padding-bottom: 22px; }
          .timelineMarker {
            position: static;
            width: auto;
            text-align: left;
            padding-right: 0;
            margin-bottom: 10px;
          }
          .timelineMarker::after { left: -36px; right: auto; top: 1px; }
          .mvGrid { grid-template-columns: 1fr; }
          .mvCard { padding: 34px 28px; }
          .unitGrid { grid-template-columns: 1fr; }
          .teamGrid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  )
}