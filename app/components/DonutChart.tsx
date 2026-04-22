"use client";
import { useRef, useState } from "react";

interface Slice { val: number; color: string; label?: string; count?: number; }
interface Props { data: Slice[]; size?: number; hole?: number; }

export default function DonutChart({ data, size = 100, hole = 0.6 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; color: string } | null>(null);
  const total = data.reduce((a, d) => a + d.val, 0);
  const r = size / 2, cx = r, cy = r, ri = r * hole;
  let cum = -Math.PI / 2;

  const slices = data.map(d => {
    const angle = (d.val / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cum), y1 = cy + r * Math.sin(cum);
    cum += angle;
    const x2 = cx + r * Math.cos(cum), y2 = cy + r * Math.sin(cum);
    const xi1 = cx + ri * Math.cos(cum - angle), yi1 = cy + ri * Math.sin(cum - angle);
    const xi2 = cx + ri * Math.cos(cum), yi2 = cy + ri * Math.sin(cum);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r},0,${large},1,${x2.toFixed(2)},${y2.toFixed(2)} L${xi2.toFixed(2)},${yi2.toFixed(2)} A${ri},${ri},0,${large},0,${xi1.toFixed(2)},${yi1.toFixed(2)} Z`;
    return { path, color: d.color, label: d.label, val: d.val, count: d.count };
  });

  function onMove(e: React.MouseEvent, s: typeof slices[0]) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const parts = [s.label, `${s.val}%`, s.count !== undefined ? `${s.count} cases` : ""].filter(Boolean);
    setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 38, text: parts.join(" · "), color: s.color });
  }

  return (
    <div style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity={0.9}
            style={{ cursor: "pointer", transition: "opacity .15s", transformOrigin: `${cx}px ${cy}px` }}
            onMouseMove={e => onMove(e, s)}
            onMouseLeave={() => setTooltip(null)}
            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseOut={e => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "scale(1)"; }} />
        ))}
        <circle cx={cx} cy={cy} r={ri - 3} fill="var(--surface, #fff)" />
      </svg>
      {tooltip && (
        <div style={{
          position: "absolute", left: tooltip.x, top: tooltip.y,
          background: "#0d3b1f", color: "#fff", padding: "5px 10px",
          borderRadius: 8, fontSize: 11, fontWeight: 600,
          pointerEvents: "none", whiteSpace: "nowrap", zIndex: 50,
          border: `2px solid ${tooltip.color}`, boxShadow: "0 4px 12px rgba(0,0,0,.3)",
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
