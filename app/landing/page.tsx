'use client'
import Link from 'next/link'
import Image from 'next/image'
import { ORG_CHART_SVG } from './orgChartSvg'

const NAV_LINKS = [
  { id: 'history', label: 'History' },
  { id: 'mission', label: 'Mission & Vision' },
  { id: 'orgchart', label: 'Org Chart' },
  { id: 'team', label: 'Dev Team' },
]

const TEAM = [
  { name: 'Lynnel Barroa', role: 'Lead Programmer' },
  { name: 'Mariel Palaya', role: 'Programmer' },
  { name: 'Ruth Poblete', role: 'Programmer' },
  { name: 'Lovely Gift Navera', role: 'UI / UX Designer' },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export default function LandingPage() {
  return (
    <div className="landingRoot">

      {/* ── Sticky nav (always visible) ── */}
      <nav className="heroNav">
        <div className="heroNavBrand">
          <Image src="/logo.jpg" alt="" width={34} height={34} className="navSeal" />
          <span>SMARTRHU</span>
        </div>
        <div className="heroNavLinks">
          {NAV_LINKS.map(link => (
            <button key={link.id} onClick={() => scrollToId(link.id)} className="navLink">
              {link.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="heroSide" id="top">
        <div className="heroImage" />
        <div className="heroOverlay" />

        <div className="heroContent">
          <p className="heroEyebrow">Rural Healthcare Unit · Lopez, Quezon</p>
          <h1 className="heroTitle">
            Welcome to<br />
            SMART<span className="accent">RHU</span>
          </h1>
          <p className="heroTagline">Inventory and Patient Management</p>

          <Link href="/login" className="ctaBtn">
            <span>Get Started</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </header>

      {/* ── History ── */}
      <section className="section" id="history">
        <p className="sectionEyebrow">Brief profile of the municipality of Lopez</p>
        <h2 className="sectionTitle">Our history</h2>

        <div className="historyGrid">
          <article className="historyCard">
            <h3 className="historyCardTitle">The Kalilayan Kingdom of Lakan Bugtali</h3>
            <p className="historyText">
              There was once a flourishing coastal settlement in the southern part of
              what is now Gumaca, named Talolong — after a sturdy tree abundant in the
              area. Founded by the descendants of Datu Dumangsil and Balingsula of the
              Kalilayan Kingdom, the settlement faced frequent raids from pirates and
              was eventually moved to the town&rsquo;s present location. Of the original
              settlement, no trace remains today — not even a fraction of its 16th
              century history.
            </p>
          </article>

          <article className="historyCard">
            <h3 className="historyCardTitle">From barrio to township</h3>
            <p className="historyText">
              In 1792, Don Miguel de San Agustin, provincial governor of Tayabas,
              named the settlement &ldquo;Vista Talolong.&rdquo; By 1795, Don Francisco
              de San Jose became its first Teniente Mayor, tasked with protecting the
              village from piracy. Peace drew settlers, among them Mateo Lopez of
              Tayabas, who helped found the community as &ldquo;Pueblo.&rdquo; With the
              help of Señora Hermana Vito, Mateo Lopez traveled to Manila and, on
              April 30, 1856, returned with the Spanish Governor-General&rsquo;s
              certificate of approval — formally founding the town that bears his name.
            </p>
          </article>

          <article className="historyCard">
            <h3 className="historyCardTitle">Growth and governance</h3>
            <p className="historyText">
              Under the administration of Don Antonio Fortuna, salaries of employees
              were increased to bring greater standardization of living and efficiency
              in public service — a step toward the modern local government Lopez has
              today.
            </p>
          </article>

          <article className="historyCard">
            <h3 className="historyCardTitle">Lopez today</h3>
            <p className="historyText">
              Lopez is now one of the largest municipalities in Quezon Province, with a
              total land area of 395.1 square kilometers — 4.53% of the province. It is
              composed of 95 barangays (7 urban, 88 rural) across nine political
              districts, and recorded a population of 103,411 in 2022, making it one of
              the first-class municipalities in the Fourth Congressional District.
            </p>
          </article>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="section sectionAlt" id="mission">
        <p className="sectionEyebrow">Lopez Rural Health Unit</p>
        <h2 className="sectionTitle">Mission &amp; vision</h2>

        <div className="mvGrid">
          <div className="mvCard">
            <span className="mvLabel">Mission</span>
            <p className="mvText">
              To ensure the implementation of responsive health programs for
              Lopezeños through concerted efforts of the Local Government Unit,
              Non-Government Organizations, and the community.
            </p>
          </div>
          <div className="mvCard mvCardDark">
            <span className="mvLabel">Vision</span>
            <p className="mvText">
              A quality health care delivery system in attaining better health
              outcomes, competitive and responsive health care system toward a
              healthy and productive Lopezeños.
            </p>
          </div>
        </div>
      </section>

      {/* ── Organizational Chart ── */}
      <section className="section" id="orgchart">
        <p className="sectionEyebrow">Lopez Rural Health Unit</p>
        <h2 className="sectionTitle">Organizational chart</h2>
        <p className="sectionSub">Drag or scroll sideways to see the full structure.</p>

        <div className="orgChartWrap">
          <div className="orgChartScroll" dangerouslySetInnerHTML={{ __html: ORG_CHART_SVG }} />
          <div className="orgChartFade" />
        </div>
      </section>

      {/* ── Dev Team ── */}
      <section className="section sectionAlt" id="team">
        <p className="sectionEyebrow">Built by</p>
        <h2 className="sectionTitle">Development team</h2>
        <p className="sectionSub">The team behind SMARTRHU&rsquo;s inventory and patient management system.</p>

        <div className="teamGrid">
          {TEAM.map(member => (
            <div key={member.name} className="teamCard">
              <div className="teamAvatar">{member.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
              <p className="teamName">{member.name}</p>
              <p className="teamRole">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landingFooter">
        <Image src="/logo.jpg" alt="" width={44} height={44} className="footerSeal" />
        <p className="footerText">
          RHU Lopez Quezon © {new Date().getFullYear()}<br />
          Department of Health — Philippines
        </p>
      </footer>

      <style>{`
        * { box-sizing: border-box; }

        .landingRoot {
          width: 100%;
          font-family: "DM Sans", system-ui, sans-serif;
          background: #fefefe;
        }

        /* ── Hero ── */
        .heroSide {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .heroImage {
          position: absolute;
          inset: 0;
          background-image: url('/hero-bg.jpg');
          background-size: cover;
          background-position: center;
        }
        .heroOverlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            165deg,
            rgba(13, 59, 31, 0.94) 0%,
            rgba(13, 59, 31, 0.82) 45%,
            rgba(22, 163, 74, 0.55) 100%
          );
        }

        .heroNav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 48px;
          background: rgba(13, 59, 31, 0.92);
          backdrop-filter: blur(8px);
        }
        .heroNavBrand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.02em;
        }
        .navSeal {
          border-radius: 50%;
          object-fit: cover;
        }
        .heroNavLinks {
          display: flex;
          gap: 8px;
        }
        .navLink {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.82);
          font-size: 13.5px;
          font-weight: 600;
          font-family: inherit;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .navLink:hover {
          background: rgba(255,255,255,0.14);
          color: #ffffff;
        }

        .heroContent {
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 0 48px 72px;
          max-width: 680px;
        }
        .heroEyebrow {
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.65);
          margin: 0 0 18px;
        }
        .heroTitle {
          font-size: clamp(2.6rem, 5.5vw, 4.2rem);
          font-weight: 800;
          line-height: 1.04;
          letter-spacing: -0.02em;
          color: #ffffff;
          margin: 0 0 14px;
        }
        .heroTitle .accent { color: #4ade80; }
        .heroTagline {
          font-size: 18px;
          font-weight: 400;
          color: rgba(255,255,255,0.78);
          margin: 0 0 40px;
        }

        .ctaBtn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          width: fit-content;
          background: #ffffff;
          color: #0d3b1f;
          font-size: 15px;
          font-weight: 700;
          padding: 15px 30px;
          border-radius: 999px;
          text-decoration: none;
          box-shadow: 0 8px 28px rgba(0,0,0,0.25);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          animation: ctaPulse 2.6s ease-in-out 1.2s 2;
        }
        .ctaBtn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.3);
        }
        .ctaBtn svg { transition: transform 0.2s ease; }
        .ctaBtn:hover svg { transform: translateX(3px); }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 8px 28px rgba(0,0,0,0.25); }
          50% { box-shadow: 0 8px 28px rgba(0,0,0,0.25), 0 0 0 8px rgba(255,255,255,0.12); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ctaBtn { animation: none; }
        }
        .ctaBtn:focus-visible {
          outline: 3px solid #4ade80;
          outline-offset: 3px;
        }

        /* ── Generic section ── */
        .section {
          padding: 88px 48px;
          max-width: 1180px;
          margin: 0 auto;
          scroll-margin-top: 64px;
        }
        .sectionAlt {
          background: #f4faf6;
          max-width: 100%;
          padding: 88px 48px;
          scroll-margin-top: 64px;
        }
        .sectionAlt > * {
          max-width: 1180px;
          margin-left: auto;
          margin-right: auto;
        }
        .sectionEyebrow {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #16a34a;
          margin: 0 0 10px;
        }
        .sectionTitle {
          font-size: clamp(1.8rem, 3vw, 2.4rem);
          font-weight: 800;
          color: #0a2912;
          letter-spacing: -0.01em;
          margin: 0 0 12px;
        }
        .sectionSub {
          font-size: 14.5px;
          color: #5c7466;
          margin: 0 0 40px;
          max-width: 560px;
        }

        /* ── History ── */
        .historyGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 28px;
          margin-top: 36px;
        }
        .historyCard {
          background: #f4faf6;
          border: 1px solid #d8e6dc;
          border-radius: 14px;
          padding: 28px;
        }
        .historyCardTitle {
          font-size: 16px;
          font-weight: 700;
          color: #0d3b1f;
          margin: 0 0 10px;
        }
        .historyText {
          font-size: 13.5px;
          line-height: 1.75;
          color: #44544a;
          margin: 0;
        }

        /* ── Mission & Vision ── */
        .mvGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 28px;
          margin-top: 36px;
        }
        .mvCard {
          background: #ffffff;
          border: 1px solid #d8e6dc;
          border-radius: 16px;
          padding: 36px;
        }
        .mvCardDark {
          background: #0d3b1f;
          border-color: #0d3b1f;
        }
        .mvLabel {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #16a34a;
          margin-bottom: 16px;
        }
        .mvCardDark .mvLabel { color: #4ade80; }
        .mvText {
          font-size: 16px;
          line-height: 1.7;
          color: #1f2937;
          margin: 0;
        }
        .mvCardDark .mvText { color: rgba(255,255,255,0.92); }

        /* ── Org chart ── */
        .orgChartWrap {
          position: relative;
        }
        .orgChartScroll {
          overflow-x: auto;
          padding: 8px 0 16px;
          border-top: 1px solid #e5ece7;
          text-align: left;
        }
        .orgChartFade {
          position: absolute;
          top: 9px;
          right: 0;
          bottom: 16px;
          width: 64px;
          background: linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.95));
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
          border: 1px solid #d8e6dc;
          border-radius: 14px;
          padding: 32px 20px;
          text-align: center;
        }
        .teamAvatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #0d3b1f;
          color: #ffffff;
          font-size: 18px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .teamName {
          font-size: 14.5px;
          font-weight: 700;
          color: #0a2912;
          margin: 0 0 4px;
        }
        .teamRole {
          font-size: 12.5px;
          color: #5c7466;
          margin: 0;
        }

        /* ── Footer ── */
        .landingFooter {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 56px 48px;
          background: #0a2912;
        }
        .footerSeal {
          border-radius: 50%;
          object-fit: cover;
        }
        .footerText {
          font-size: 12px;
          color: rgba(255,255,255,0.55);
          text-align: center;
          line-height: 1.7;
          margin: 0;
        }

        /* ── Mobile ── */
        @media (max-width: 860px) {
          .heroNav {
            padding: 18px 24px;
          }
          .heroNavLinks {
            display: none;
          }
          .heroContent {
            padding: 0 24px 48px;
          }
          .heroTitle {
            font-size: clamp(2.2rem, 9vw, 3rem);
          }
          .section, .sectionAlt {
            padding: 56px 24px;
          }
          .historyGrid, .mvGrid {
            grid-template-columns: 1fr;
          }
          .teamGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  )
}
