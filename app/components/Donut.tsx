"use client";
import { useTheme } from "@/lib/theme";

type Props = {
  segments: { v: number; c: string }[];
  size: number;
  thick: number;
  label?: string;
};

export default function Donut({ segments, size, thick, label }: Props) {
  const { t } = useTheme();
  const r = (size - thick) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.v, 0);
  let offset = 0;

  return (
    <svg width={size} height={size} style={{ display: "block", transform: "rotate(-90deg)" }}>
      {segments.map((seg, i) => {
        const dash = (seg.v / total) * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.c} strokeWidth={thick}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset} />
        );
        offset += dash;
        return el;
      })}
      {label && (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          style={{
            transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px`,
            fontSize: 8, fill: t.text3, fontFamily: "Nunito,sans-serif",
          }}>
          {label}
        </text>
      )}
    </svg>
  );
}
