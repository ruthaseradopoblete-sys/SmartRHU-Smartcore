// app/api/ai_dictionary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Medicine = {
  id: string;
  med_name: string;
  med_dosage: string;
  med_type: string;
  exp_date: string;
  quantity: number;
  unit: string;
  description?: string | null;
};

function cleanQuery(q: string) {
  return q
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 8);
}

// Tagalog/Taglish symptom terms mapped to English clinical terms so they can
// match against the (English-only) description text in the inventory.
const TAGALOG_SYMPTOM_MAP: Record<string, string[]> = {
  hirap: ["breath", "breathing", "dyspnea", "bronchospasm", "wheezing", "bronchodilator"],
  huminga: ["breath", "breathing", "dyspnea", "bronchospasm", "wheezing", "bronchodilator"],
  hingal: ["breath", "breathing", "dyspnea", "bronchospasm", "wheezing", "bronchodilator"],
  inip: ["breath", "breathing", "dyspnea", "bronchospasm", "wheezing"],
  ubo: ["cough", "mucus", "mucolytic", "phlegm"],
  sipon: ["cold", "congestion", "mucus", "respiratory", "decongestant"],
  lagnat: ["fever", "temperature", "antipyretic"],
  nilalamig: ["fever", "chills", "antipyretic"],
  pamamaga: ["inflammation", "swelling", "anti-inflammatory"],
  masakit: ["pain", "analgesic"],
  sakit: ["pain", "analgesic"],
  pananakit: ["pain", "analgesic"],
  tiyan: ["stomach", "gastric", "abdominal"],
  pagtatae: ["diarrhea", "rehydration"],
  pagsusuka: ["vomiting", "nausea", "antiemetic"],
  hilo: ["dizziness", "vertigo"],
  allergy: ["allergy", "antihistamine"],
  pangangati: ["itch", "allergy", "antihistamine"],
  highblood: ["hypertension", "blood pressure"],
  altapresyon: ["hypertension", "blood pressure"],
  diabetes: ["diabetes", "blood sugar", "glucose"],
};

function expandTagalogTerms(words: string[]): string[] {
  const expanded = new Set<string>(words);

  for (const w of words) {
    const mapped = TAGALOG_SYMPTOM_MAP[w];
    if (mapped) {
      mapped.forEach((term) => expanded.add(term));
    }
  }

  return Array.from(expanded);
}

function fallbackSearch(query: string, meds: Medicine[]) {
  const words = expandTagalogTerms(cleanQuery(query));

  return meds
    .map((m) => {
      const haystack = `${m.med_name} ${m.med_type} ${m.description ?? ""}`.toLowerCase();
      const score = words.reduce((s, w) => s + (haystack.includes(w) ? 1 : 0), 0);
      return { med: m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.med)
    .slice(0, 8);
}

function sampleInventory(meds: Medicine[], n: number): Medicine[] {
  const shuffled = [...meds].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// --- NEW: guard against greetings / non-clinical short queries ---
const GREETING_PATTERNS = [
  /^hi+$/i,
  /^hello+$/i,
  /^hey+$/i,
  /^h[ae]llo* po$/i,
  /^kumusta/i,
  /^kamusta/i,
  /^good\s*(morning|afternoon|evening|day)$/i,
  /^magandang\s*(umaga|hapon|gabi|araw)/i,
  /^test$/i,
  /^ok(ay)?$/i,
  /^thanks?$|^thank you$|^salamat$/i,
  /^\?+$/,
];

function isGreetingOrEmpty(query: string): boolean {
  const trimmed = query.trim();

  if (trimmed.length === 0) return true;

  // Strip punctuation for matching but keep original length check
  const normalized = trimmed.replace(/[^\w\s]/g, "").trim();

  if (normalized.length === 0) return true;

  if (GREETING_PATTERNS.some((re) => re.test(normalized))) return true;

  // Very short input (1-2 chars after cleanup) with no digits/letters forming a real word
  if (normalized.length <= 2) return true;

  return false;
}

function clarificationResponse(language: "tagalog" | "english") {
  const summary =
    language === "english"
      ? "Hi Doctor! Please describe the patient's symptoms, age, or condition so I can search the inventory for matching medicines."
      : "Kumusta Doktor! Pakilagay po ang sintomas, edad, o kondisyon ng pasyente para makahanap ako ng tugmang gamot sa inventory.";

  return NextResponse.json({
    recommendation: summary,
    structured: {
      mode: "list",
      summary,
      dosis: "N/A",
      frequency: "N/A",
      tandaan: "",
      medicines: [],
    },
    medicines: [],
    mode: "list",
  });
}
// --- end guard ---

export async function POST(req: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => null);

    if (!body?.query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const query = String(body.query).trim();
    const responseLanguage: "tagalog" | "english" =
      body.language === "english" ? "english" : "tagalog";

    // --- NEW: bail out early on greetings / non-clinical input ---
    if (isGreetingOrEmpty(query)) {
      return clarificationResponse(responseLanguage);
    }
    // --- end early bail ---

    const today = new Date().toISOString().split("T")[0];

    const { data: allMedicines, error: dbError } = await supabase
      .from("pharma_medicines")
      .select("id, med_name, med_dosage, med_type, exp_date, quantity, unit, description")
      .gt("quantity", 0)
      .eq("archived", false)
      .gt("exp_date", today)
      .not("description", "is", null)
      .neq("description", "")
      .order("med_name");

    if (dbError) {
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    const inventory = allMedicines ?? [];

    if (inventory.length === 0) {
      return NextResponse.json({
        recommendation:
          responseLanguage === "english"
            ? "No available medicine with description was found in inventory."
            : "Walang available na gamot na may description sa inventory.",
        medicines: [],
        structured: {
          mode: "list",
          summary:
            responseLanguage === "english"
              ? "No available medicine with description was found in inventory."
              : "Walang available na gamot na may description sa inventory.",
          dosis: "N/A",
          frequency: "N/A",
          tandaan: "",
          medicines: [],
        },
      });
    }

    const matchedMedicines = fallbackSearch(query, inventory);

    // If keyword matching found nothing, do NOT default to the first 12
    // medicines alphabetically (that always surfaced unrelated meds like
    // "Cotrimoxazole" just because it sorts early). Instead, send a larger,
    // randomized sample of the full inventory so Groq can reason over a
    // representative set and pick based on actual Description matches.
    const hasKeywordMatch = matchedMedicines.length > 0;

    const candidateMedicines = hasKeywordMatch
      ? matchedMedicines.slice(0, 14)
      : sampleInventory(inventory, Math.min(inventory.length, 40));

    const inventoryList = candidateMedicines
      .map(
        (m, i) =>
          `${i + 1}. ${m.med_name} | ${m.med_dosage} ${m.unit} | ${m.med_type} | Stock: ${m.quantity}\nDescription: ${m.description ?? ""}`
      )
      .join("\n\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 350,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are an RHU medicine assistant.

Answer language: ${responseLanguage}.

Rules:
1. Use ONLY the medicine inventory given.
2. Do not suggest medicines outside the inventory.
3. Keep the answer short.
4. Maximum 4 medicines only.
5. Return PURE JSON only.
6. Medicine names must exactly match inventory names.
7. Before including ANY medicine, read its Description field and verify it explicitly treats the symptom/condition the doctor described. Example: dyspnea/hirap huminga/wheezing → only bronchodilators (Description mentions bronchospasm, wheezing, or airway relief). Fever → only antipyretics (Description mentions fever/temperature). Bacterial infection → antibiotics. Do NOT include a medicine just because it is a "drug" or because other medicines nearby in the list are unrelated matches.
8. NEVER include antibiotics, antiparasitics, vaccines, vitamins, or supplements unless the doctor's query specifically describes a bacterial/parasitic infection, immunization need, or nutritional deficiency. Respiratory symptoms (hirap huminga, cough, wheezing, sipon) must map to bronchodilators or mucolytics/decongestants only, never antibiotics, unless infection is explicitly mentioned.
9. Only return an empty "medicines" array if the query truly has no clinical content at all (e.g. a greeting, "thanks", or random text with no symptoms/condition mentioned).
10. If symptoms or a condition ARE described, find the best-matching medicines strictly by checking each candidate's Description against that symptom. If NONE of the candidates' descriptions genuinely match, return an empty "medicines" array rather than picking unrelated ones — do not force a match.

JSON format:
{
  "mode": "list" | "dosage" | "detailed",
  "summary": "short answer",
  "dosis": "dose or N/A",
  "frequency": "frequency or N/A",
  "tandaan": "short reminder",
  "medicines": ["Exact Medicine Name"]
}
          `,
        },
        {
          role: "user",
          content: `
Doctor query: ${query}

Inventory:
${inventoryList}
          `,
        },
      ],
    });

    const aiText = completion.choices[0]?.message?.content?.trim() ?? "";

    let structured: {
      mode: "list" | "dosage" | "detailed";
      summary: string;
      dosis: string;
      frequency: string;
      tandaan: string;
      medicines: string[];
    } | null = null;

    try {
      const start = aiText.indexOf("{");
      const end = aiText.lastIndexOf("}");

      if (start !== -1 && end !== -1) {
        structured = JSON.parse(aiText.slice(start, end + 1));
      }
    } catch {
      structured = null;
    }

    const recommendedMedicines: Medicine[] = [];

    if (structured?.medicines?.length) {
      for (const name of structured.medicines.slice(0, 4)) {
        const cleanName = name.toLowerCase().trim();

        const match = candidateMedicines.find(
          (m) =>
            m.med_name.toLowerCase().trim() === cleanName ||
            m.med_name.toLowerCase().includes(cleanName) ||
            cleanName.includes(m.med_name.toLowerCase().trim())
        );

        if (match && !recommendedMedicines.some((m) => m.id === match.id)) {
          recommendedMedicines.push(match);
        }
      }
    }

    return NextResponse.json({
      recommendation:
        structured?.summary ||
        (responseLanguage === "english"
          ? "Here are the matching medicines from the inventory."
          : "Ito ang mga gamot na tugma sa inventory."),
      structured,
      medicines: recommendedMedicines,
      mode: structured?.mode ?? "list",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}