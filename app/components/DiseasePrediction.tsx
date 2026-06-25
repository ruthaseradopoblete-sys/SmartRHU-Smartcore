"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const QUARTER_LABELS: Record<number, string> = {
  1: "Q1 (Jan–Mar)",
  2: "Q2 (Apr–Jun)",
  3: "Q3 (Jul–Sep)",
  4: "Q4 (Oct–Dec)",
};

const QUARTER_SHORT: Record<number, string> = {
  1: "Q1",
  2: "Q2",
  3: "Q3",
  4: "Q4",
};

const QUARTER_SEASON: Record<number, "Rainy" | "Dry"> = {
  1: "Dry",
  2: "Dry",
  3: "Rainy",
  4: "Rainy",
};

const DB_AGE_GROUPS = ["0-5", "6-17", "18-59", "60+"] as const;

type DbAgeGroup = (typeof DB_AGE_GROUPS)[number];
type UiSex = "ALL" | "M" | "F";
type DbSeason = "Rainy" | "Dry";

const SEASON_ALERT: Record<DbSeason, string> = {
  Rainy:
    "Rainy season usually increases fever, body pain, headache, respiratory symptoms, and some waterborne or urinary cases.",
  Dry:
    "Dry and hot months usually increase stomach pain, loose bowel movement, vomiting, UTI, painful urination, rashes, and dehydration-related cases.",
};

const PALETTE = [
  "#E53935", // Red
  "#1E88E5", // Blue
  "#43A047", // Green
  "#FB8C00", // Orange
  "#8E24AA", // Purple
  "#00ACC1", // Cyan
  "#D81B60", // Pink
  "#6D4C41", // Brown
  "#FDD835", // Yellow
  "#111827", // Black
];

type Prediction = {
  disease_name: string;
  icd_code: string;
  predicted_cases: number;
  predicted_percentage: number;
  trend: string | null;
  trend_percentage: number | null;
  actual_cases: number | null | undefined;
  confidence_score: number | null;
  age_group: string;
  sex: string;
  barangay: string | null;
  season: string | null;
};

type AggrDisease = {
  icd_code: string;
  disease_name: string;
  predicted_cases: number;
  actual_cases: number;
  confidence_score: number;
  trend: string | null;
  trend_percentage: number | null;
  rank_score: number;
  displayPct: number;
};

const baseChartOpts = (yLabel = "", xLabels: string[] = []) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      grid: { color: "rgba(128,128,128,0.08)" },
      ticks: {
        font: { size: 10 },
        color: "#888",
        callback: (_val: unknown, index: number) => {
          const label = xLabels[index] ?? "";
          return label.length > 14 ? label.slice(0, 14) + "…" : label;
        },
      },
    },
    y: {
      min: 0,
      grid: { color: "rgba(128,128,128,0.08)" },
      ticks: {
        font: { size: 10 },
        color: "#888",
        callback: (v: number | string) => `${v}${yLabel}`,
      },
    },
  },
});

const multiTrendChartOpts = () => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index" as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: "bottom" as const,
      labels: {
        boxWidth: 12,
        boxHeight: 12,
        padding: 14,
        font: { size: 11, weight: "bold" as const },
        color: "#111827",
        usePointStyle: true,
        pointStyle: "circle" as const,
      },
    },
    tooltip: {
      backgroundColor: "rgba(30, 92, 46, 0.95)",
      titleFont: { size: 12, weight: "bold" as const },
      bodyFont: { size: 11 },
      padding: 10,
      callbacks: {
        label: (context: any) =>
          `${context.dataset.label}: ${Number(context.raw || 0).toLocaleString()} predicted cases`,
      },
    },
  },
  elements: {
    line: {
      borderWidth: 4,
      tension: 0.25,
    },
    point: {
      radius: 7,
      hoverRadius: 10,
      borderWidth: 3,
    },
  },
  scales: {
    x: {
      grid: { color: "rgba(128,128,128,0.08)" },
      ticks: {
        font: { size: 11, weight: "bold" as const },
        color: "#666",
        padding: 10,
      },
    },
    y: {
      min: -25,
      suggestedMax: 400,
      grid: { color: "rgba(128,128,128,0.10)" },
      ticks: {
        stepSize: 50,
        font: { size: 10 },
        color: "#777",
        padding: 10,
        callback: (value: number | string) =>
          Number(value) < 0 ? "" : value,
      },
    },
  },
});

function aggregateRows(rows: Prediction[], topN = 10): AggrDisease[] {
  /*
    IMPORTANT FIX:
    disease_predictions is saved per:
      disease + quarter + barangay + age_group + sex

    So the dashboard must SUM predicted_cases by disease.
    Do not display a single row only, because that will look very low.
  */

  const map = new Map<
    string,
    {
      icd_code: string;
      disease_name: string;
      predicted_cases: number;
      actual_cases_sum: number;
      actual_has_data: boolean;
      confidence_weighted_sum: number;
      confidence_weight: number;
      best_confidence: number;
      trend: string | null;
      trend_percentage: number | null;
    }
  >();

  rows.forEach((r) => {
    const key = r.icd_code || r.disease_name;
    const pc = Math.max(0, Number(r.predicted_cases) || 0);
    const acRaw = r.actual_cases;
    const ac = acRaw != null ? Math.max(0, Number(acRaw) || 0) : 0;

    // accepts either 0.88 or 88 from DB, but stores as 0.88 internally
    let cf = Number(r.confidence_score) || 0;
    if (cf > 1) cf = cf / 100;
    cf = Math.max(0, Math.min(1, cf));

    const cur = map.get(key);

    if (!cur) {
      map.set(key, {
        icd_code: r.icd_code,
        disease_name: r.disease_name,
        predicted_cases: pc,
        actual_cases_sum: ac,
        actual_has_data: acRaw != null,
        confidence_weighted_sum: cf * Math.max(pc, 1),
        confidence_weight: Math.max(pc, 1),
        best_confidence: cf,
        trend: r.trend,
        trend_percentage: r.trend_percentage,
      });
    } else {
      cur.predicted_cases += pc;

      if (acRaw != null) {
        cur.actual_cases_sum += ac;
        cur.actual_has_data = true;
      }

      cur.confidence_weighted_sum += cf * Math.max(pc, 1);
      cur.confidence_weight += Math.max(pc, 1);

      if (cf > cur.best_confidence) {
        cur.best_confidence = cf;
        cur.trend = r.trend;
        cur.trend_percentage = r.trend_percentage;
      }
    }
  });

  const allSorted = [...map.values()]
    .map((d) => {
      const confidence =
        d.confidence_weight > 0
          ? d.confidence_weighted_sum / d.confidence_weight
          : d.best_confidence;

      return {
        ...d,
        confidence_score: Math.max(0, Math.min(1, confidence)),
        rank_score: d.predicted_cases * Math.max(0.01, confidence),
      };
    })
    .sort((a, b) => {
      if (b.predicted_cases !== a.predicted_cases) {
        return b.predicted_cases - a.predicted_cases;
      }

      return b.confidence_score - a.confidence_score;
    });

  const top = allSorted.slice(0, topN);
  const grandTotal =
    allSorted.reduce((s, d) => s + d.predicted_cases, 0) || 1;

  return top.map((d) => ({
    icd_code: d.icd_code,
    disease_name: d.disease_name,
    predicted_cases: Math.round(d.predicted_cases),
    actual_cases: d.actual_has_data ? Math.round(d.actual_cases_sum) : 0,
    confidence_score: d.confidence_score,
    trend: d.trend,
    trend_percentage: d.trend_percentage,
    rank_score: d.rank_score,
    displayPct: +((d.predicted_cases / grandTotal) * 100).toFixed(1),
  }));
}

const SELECT_COLS =
  "disease_name, icd_code, predicted_cases, predicted_percentage, " +
  "trend, trend_percentage, actual_cases, confidence_score, " +
  "age_group, sex, barangay, season";

type QueryBuilder = (
  from: number,
  to: number
) => Promise<{ data: unknown; error: unknown }>;

async function fetchAllPages(buildQuery: QueryBuilder): Promise<Prediction[]> {
  const PAGE = 1000;
  const all: Prediction[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await buildQuery(offset, offset + PAGE - 1);

    if (error) {
      console.error("fetchAllPages error:", error);
      break;
    }

    const batch = (data as Prediction[]) ?? [];
    all.push(...batch);

    if (batch.length < PAGE) break;

    offset += PAGE;
  }

  return all;
}

function getQuarter(month: number): number {
  return Math.ceil(month / 3);
}

function rollingQuarters(): number[] {
  return [1, 2, 3, 4];
}

export default function DiseasePrediction() {
  const today = new Date();

  const [view, setView] = useState<"quarterly" | "seasonal">("quarterly");
  const [quarter, setQuarter] = useState(getQuarter(today.getMonth() + 1));
  const [year, setYear] = useState(today.getFullYear());

  const [season, setSeason] = useState<DbSeason>(
    QUARTER_SEASON[getQuarter(today.getMonth() + 1)]
  );

  const [ageGroup, setAgeGroup] = useState<DbAgeGroup | "ALL">("ALL");
  const [sex, setSex] = useState<UiSex>("ALL");
  const [barangay, setBarangay] = useState<string>("ALL");

  const [rawQuarterly, setRawQuarterly] = useState<Prediction[]>([]);
  const [rawTrend, setRawTrend] = useState<Prediction[][]>([[], [], [], []]);
  const [rawSeasonal, setRawSeasonal] = useState<{
    rainy: Prediction[];
    dry: Prediction[];
  }>({ rainy: [], dry: [] });

  const [barangayList, setBarangayList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("disease_predictions")
      .select("prediction_year")
      .order("prediction_year", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const latest = (data as { prediction_year: number }[] | null)?.[0]
          ?.prediction_year;

        if (!cancelled && latest && latest !== year) {
          setYear(latest);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBarangays() {
      const PAGE = 1000;
      const set: Set<string> = new Set();
      let offset = 0;

      while (true) {
        const { data, error } = await supabase
          .from("disease_predictions")
          .select("barangay")
          .eq("prediction_year", year)
          .not("barangay", "is", null)
          .order("barangay", { ascending: true })
          .range(offset, offset + PAGE - 1);

        if (error) {
          console.error("barangay load error:", error);
          break;
        }

        const batch = (data as { barangay: string }[]) ?? [];
        batch.forEach((r) => {
          if (r.barangay) set.add(r.barangay);
        });

        if (batch.length < PAGE) break;

        offset += PAGE;
      }

      if (!cancelled) setBarangayList([...set].sort());
    }

    loadBarangays();

    return () => {
      cancelled = true;
    };
  }, [year]);

  const fetchQuarter = useCallback(
    async (q: number): Promise<Prediction[]> => {
      return fetchAllPages(async (from, to) => {
        let query = supabase
          .from("disease_predictions")
          .select(SELECT_COLS)
          .eq("prediction_quarter", q)
          .eq("prediction_year", year)
          .gt("predicted_cases", 0)
          .range(from, to);

        if (sex !== "ALL") query = query.eq("sex", sex);
        if (ageGroup !== "ALL") query = query.eq("age_group", ageGroup);
        if (barangay !== "ALL") query = query.eq("barangay", barangay);

        return query;
      });
    },
    [year, sex, ageGroup, barangay]
  );

  const fetchSeasonal = useCallback(
    async (s: DbSeason): Promise<Prediction[]> => {
      return fetchAllPages(async (from, to) => {
        let query = supabase
          .from("disease_predictions")
          .select(SELECT_COLS)
          .eq("prediction_year", year)
          .eq("season", s)
          .gt("predicted_cases", 0)
          .range(from, to);

        if (sex !== "ALL") query = query.eq("sex", sex);
        if (ageGroup !== "ALL") query = query.eq("age_group", ageGroup);
        if (barangay !== "ALL") query = query.eq("barangay", barangay);

        return query;
      });
    },
    [year, sex, ageGroup, barangay]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setError(null);

      try {
        const tq = rollingQuarters();

        const [curRows, ...trendRowsArr] = await Promise.all([
          fetchQuarter(quarter),
          ...tq.map((q) => fetchQuarter(q)),
        ]);

        const [rainyRows, dryRows] = await Promise.all([
          fetchSeasonal("Rainy"),
          fetchSeasonal("Dry"),
        ]);

        if (!cancelled) {
          setRawQuarterly(curRows);
          setRawTrend(trendRowsArr);
          setRawSeasonal({
            rainy: rainyRows,
            dry: dryRows,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load predictions. Check console.");
        }

        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [quarter, year, ageGroup, sex, barangay, fetchQuarter, fetchSeasonal]);

  const topDiseases = aggregateRows(rawQuarterly, 10);
  const quarterTotalPredicted = aggregateRows(rawQuarterly, 9999).reduce(
    (sum, d) => sum + d.predicted_cases,
    0
  );
  const trendAggregated = rawTrend.map((rows) => aggregateRows(rows, 10));

  const tq = rollingQuarters();
  const trendLabels = tq.map((q) => QUARTER_SHORT[q]);

  const allTrendAggregated = rawTrend.map((rows) => aggregateRows(rows, 9999));

  // Same Top 10 list above = same order and same color in the Q1-Q4 chart/table
  const comparisonDiseases = topDiseases.slice(0, 10);

  const allTrendChartData = {
    labels: trendLabels,
    datasets: comparisonDiseases.map((d, i) => {
      const key = d.icd_code || d.disease_name;
      const color = PALETTE[i % PALETTE.length];

      return {
        label: d.disease_name,
        data: allTrendAggregated.map((qAggr) => {
          const found = qAggr.find(
            (r) => (r.icd_code || r.disease_name) === key
          );

          return found ? found.predicted_cases : 0;
        }),
        borderColor: color,
        backgroundColor: color,
        borderWidth: 4,
        pointRadius: 7,
        pointHoverRadius: 10,
        pointBorderWidth: 3,
        pointBackgroundColor: color,
        pointBorderColor: "#ffffff",
        tension: 0.25,
        clip: false,
      };
    }),
  };

  const QUARTERS_PER_SEASON = 2;

  const getSeasonalDiseases = (s: DbSeason) => {
    const rows = s === "Rainy" ? rawSeasonal.rainy : rawSeasonal.dry;

    const map = new Map<
      string,
      {
        name: string;
        icd: string;
        totalCases: number;
      }
    >();

    rows.forEach((r) => {
      const key = r.icd_code || r.disease_name;
      const cases = Number(r.predicted_cases) || 0;
      const cur = map.get(key);

      if (cur) {
        cur.totalCases += cases;
      } else {
        map.set(key, {
          name: r.disease_name,
          icd: r.icd_code,
          totalCases: cases,
        });
      }
    });

    const sorted = [...map.values()]
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, 6);

    const maxTotal = sorted[0]?.totalCases || 1;

    return sorted.map((d) => ({
      ...d,
      avgCases: Math.round(d.totalCases / QUARTERS_PER_SEASON),
      pct: +((d.totalCases / maxTotal) * 100).toFixed(1),
    }));
  };

  const currentSeasonDiseases = getSeasonalDiseases(season);

  const seasonalXLabels = currentSeasonDiseases.map((d) => d.name);

  const seasonalChartData = {
    labels: seasonalXLabels,
    datasets: [
      {
        label: `${season} Season`,
        data: currentSeasonDiseases.map((d) => d.avgCases),
        backgroundColor: currentSeasonDiseases.map(
          (_, i) => PALETTE[i % PALETTE.length] + "cc"
        ),
        borderColor: currentSeasonDiseases.map(
          (_, i) => PALETTE[i % PALETTE.length]
        ),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const trendIcon = (t: string | null) =>
    t === "increasing" ? "↑" : t === "decreasing" ? "↓" : "→";

  const trendColor = (t: string | null) =>
    t === "increasing"
      ? "#e03d3d"
      : t === "decreasing"
      ? "#2ecc71"
      : "#888";

  const card: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e8e8e8",
    borderRadius: "12px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    minHeight: 0,
  };

  const header: React.CSSProperties = {
    background: "#1e5c2e",
    padding: "12px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  };

  const headerTxt: React.CSSProperties = {
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.07em",
    margin: 0,
  };

  const body: React.CSSProperties = {
    padding: "16px 18px",
    overflowY: "auto",
    flex: 1,
    minHeight: 0,
  };

  const lbl: React.CSSProperties = {
    display: "block",
    fontSize: "10px",
    fontWeight: 600,
    color: "#888888",
    letterSpacing: "0.05em",
    marginBottom: "4px",
  };

  const sel: React.CSSProperties = {
    width: "100%",
    fontSize: "12px",
    padding: "6px 8px",
    borderRadius: "6px",
    border: "1px solid #dce8df",
    background: "#ffffff",
    cursor: "pointer",
    outline: "none",
  };

  const sectionLbl: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 600,
    color: "#888888",
    letterSpacing: "0.05em",
    margin: "0 0 10px",
  };

  const divider: React.CSSProperties = {
    height: "1px",
    background: "#f0f0f0",
    margin: "16px 0",
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    fontSize: "11px",
    padding: "4px 14px",
    borderRadius: "20px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    background: active ? "#ffffff" : "transparent",
    color: active ? "#1e5c2e" : "rgba(255,255,255,0.65)",
    transition: "background 0.15s, color 0.15s",
  });

  const seasonTab = (s: DbSeason): React.CSSProperties => ({
    fontSize: "11px",
    padding: "4px 14px",
    borderRadius: "20px",
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid",
    background:
      season === s ? (s === "Rainy" ? "#e6f1fb" : "#faeeda") : "#f5f5f5",
    color:
      season === s ? (s === "Rainy" ? "#0c447c" : "#633806") : "#888888",
    borderColor:
      season === s ? (s === "Rainy" ? "#85b7eb" : "#ef9f27") : "#dddddd",
  });

  return (
    <div style={card}>
      <div style={header}>
        <p style={headerTxt}>DISEASE PREDICTION</p>

        <div style={{ display: "flex", gap: "4px" }}>
          <button
            style={tabBtn(view === "quarterly")}
            onClick={() => setView("quarterly")}
          >
            Quarterly
          </button>

          <button
            style={tabBtn(view === "seasonal")}
            onClick={() => setView("seasonal")}
          >
            Seasonal
          </button>
        </div>
      </div>

      <div style={body}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
            marginBottom: "16px",
            paddingBottom: "14px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div>
            <label style={lbl}>AGE GROUP</label>
            <select
              style={sel}
              value={ageGroup}
              onChange={(e) =>
                setAgeGroup(e.target.value as DbAgeGroup | "ALL")
              }
            >
              <option value="ALL">All ages</option>
              {DB_AGE_GROUPS.map((a) => (
                <option key={a} value={a}>
                  {a} yrs
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={lbl}>SEX</label>
            <select
              style={sel}
              value={sex}
              onChange={(e) => setSex(e.target.value as UiSex)}
            >
              <option value="ALL">All</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>

          <div>
            <label style={lbl}>BARANGAY</label>
            <select
              style={sel}
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
            >
              <option value="ALL">All barangays</option>
              {barangayList.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #fca5a5",
              borderRadius: "8px",
              padding: "10px 12px",
              marginBottom: "12px",
            }}
          >
            <p style={{ margin: 0, fontSize: "12px", color: "#b91c1c" }}>
              ⚠ {error}
            </p>
          </div>
        )}

        {view === "quarterly" && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1a1a1a",
                  }}
                >
                  {QUARTER_LABELS[quarter]} {year}
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: "10px",
                    color: "#888888",
                    letterSpacing: "0.04em",
                  }}
                >
                  {QUARTER_SEASON[quarter].toUpperCase()} SEASON · TOP
                  PREDICTED DISEASES
                </p>

                {!loading && quarterTotalPredicted > 0 && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "10px",
                      color: "#aaaaaa",
                    }}
                  >
                    Total predicted cases this quarter:{" "}
                    {quarterTotalPredicted.toLocaleString()}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: "4px" }}>
                {([
                  ["‹", -1],
                  ["›", 1],
                ] as [string, number][]).map(([l, d]) => (
                  <button
                    key={l}
                    onClick={() =>
                      setQuarter((q) => Math.max(1, Math.min(4, q + d)))
                    }
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "6px",
                      border: "1px solid #dddddd",
                      background: "#ffffff",
                      cursor: "pointer",
                      fontSize: "14px",
                      lineHeight: "1",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
              {[1, 2, 3, 4].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuarter(q)}
                  style={{
                    fontSize: "11px",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    border: `1px solid ${
                      quarter === q ? "#1e5c2e" : "#dddddd"
                    }`,
                    background: quarter === q ? "#1e5c2e" : "#f5f5f5",
                    color: quarter === q ? "#ffffff" : "#888888",
                    cursor: "pointer",
                    fontWeight: quarter === q ? 600 : 400,
                  }}
                >
                  {QUARTER_SHORT[q]}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <p style={{ margin: 0, color: "#aaaaaa", fontSize: "13px" }}>
                  Loading predictions…
                </p>
              </div>
            ) : topDiseases.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <p style={{ margin: 0, color: "#aaaaaa", fontSize: "13px" }}>
                  No predictions for this filter.
                </p>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#bbbbbb",
                    fontSize: "11px",
                  }}
                >
                  Try changing filters or run <code>py train.py</code>
                </p>
              </div>
            ) : (
              topDiseases.map((d, i) => {
                const color = PALETTE[i % PALETTE.length];
                const conf = d.confidence_score
                  ? `${(d.confidence_score * 100).toFixed(0)}%`
                  : "—";

                return (
                  <div
                    key={d.icd_code || d.disease_name}
                    style={{ marginBottom: "12px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "12px",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "#1a1a1a",
                          fontWeight: 500,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: color,
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />

                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {d.disease_name}

                          {d.icd_code && (
                            <span
                              style={{
                                marginLeft: "5px",
                                fontSize: "10px",
                                color: "#aaaaaa",
                                fontWeight: 400,
                              }}
                            >
                              {d.icd_code}
                            </span>
                          )}
                        </span>
                      </span>

                      <span
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                          flexShrink: 0,
                          marginLeft: "8px",
                        }}
                      >
                        {d.trend && (
                          <span
                            style={{
                              color: trendColor(d.trend),
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          >
                            {trendIcon(d.trend)}
                            {d.trend_percentage
                              ? ` ${d.trend_percentage}%`
                              : ""}
                          </span>
                        )}

                        <span
                          style={{
                            color: "#888888",
                            minWidth: "36px",
                            textAlign: "right",
                          }}
                        >
                          {d.displayPct.toFixed(1)}%
                        </span>
                      </span>
                    </div>

                    <div
                      style={{
                        height: "5px",
                        borderRadius: "999px",
                        background: "#f0f0f0",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: "999px",
                          width: `${Math.min(100, d.displayPct)}%`,
                          background: color,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "3px",
                        fontSize: "10px",
                        color: "#bbbbbb",
                      }}
                    >
                      <span>{d.predicted_cases.toLocaleString()} predicted cases</span>

                      <span style={{ display: "flex", gap: "8px" }}>
                        {d.actual_cases > 0 && (
                          <span>actual: {d.actual_cases.toLocaleString()}</span>
                        )}

                        <span>conf: {conf}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            <div style={divider} />

            <p style={sectionLbl}>4-QUARTER DISEASE COMPARISON · TOP 10</p>

            {!loading && comparisonDiseases.length > 0 && (
              <>
                <div
                  style={{
                    height: "340px",
                    width: "100%",
                    background: "#f8fbf9",
                    border: "1px solid #e5efe8",
                    borderRadius: "10px",
                    padding: "12px",
                    marginBottom: "14px",
                  }}
                >
                  <Line
                    data={allTrendChartData}
                    options={multiTrendChartOpts() as any}
                  />
                </div>
              </>
            )}
          </>
        )}

        {view === "seasonal" && (
          <>
            <p style={sectionLbl}>SEASONAL DISEASE PREDICTION</p>

            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              {(["Rainy", "Dry"] as DbSeason[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeason(s)}
                  style={seasonTab(s)}
                >
                  {s === "Rainy"
                    ? "🌧 Rainy Season (Q3–Q4)"
                    : "☀️ Dry Season (Q1–Q2)"}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                borderRadius: "8px",
                padding: "10px 12px",
                marginBottom: "14px",
                background: season === "Rainy" ? "#e6f1fb" : "#faeeda",
              }}
            >
              <span style={{ fontSize: "14px", flexShrink: 0 }}>⚠</span>

              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  lineHeight: 1.5,
                  color: season === "Rainy" ? "#0c447c" : "#633806",
                }}
              >
                {SEASON_ALERT[season]}
              </p>
            </div>

            {loading ? (
              <p
                style={{
                  textAlign: "center",
                  color: "#aaaaaa",
                  fontSize: "13px",
                  padding: "16px 0",
                }}
              >
                Loading…
              </p>
            ) : currentSeasonDiseases.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: "#aaaaaa",
                  fontSize: "13px",
                  padding: "16px 0",
                }}
              >
                No seasonal data. Run <code>py train.py</code> first.
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginBottom: "14px",
                  }}
                >
                  {currentSeasonDiseases.map((d, i) => {
                    const color = PALETTE[i % PALETTE.length];

                    return (
                      <div
                        key={d.icd}
                        style={{
                          background: "#f8f8f8",
                          borderRadius: "8px",
                          padding: "10px 12px",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 2px",
                            fontSize: "10px",
                            color: "#888888",
                            letterSpacing: "0.04em",
                          }}
                        >
                          AVG PREDICTED CASES / QUARTER
                        </p>

                        <p
                          style={{
                            margin: "0 0 2px",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#1a1a1a",
                            lineHeight: 1.3,
                          }}
                        >
                          {d.name}
                        </p>

                        <p
                          style={{
                            margin: "0 0 6px",
                            fontSize: "10px",
                            color: "#bbbbbb",
                          }}
                        >
                          {d.icd}
                        </p>

                        <div
                          style={{
                            height: "6px",
                            borderRadius: "3px",
                            background: "#e8e8e8",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              borderRadius: "3px",
                              width: `${d.pct}%`,
                              background: color,
                              transition: "width 0.4s",
                            }}
                          />
                        </div>

                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: "11px",
                            color: "#888888",
                          }}
                        >
                          {d.avgCases.toLocaleString()} avg cases / quarter
                        </p>
                      </div>
                    );
                  })}
                </div>

                <p style={sectionLbl}>
                  DISEASE BREAKDOWN — {season.toUpperCase()} SEASON
                </p>

                <div style={{ height: "180px" }}>
                  <Bar
                    data={seasonalChartData}
                    options={
                      {
                        ...baseChartOpts(" cases", seasonalXLabels),
                        plugins: { legend: { display: false } },
                      } as any
                    }
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}