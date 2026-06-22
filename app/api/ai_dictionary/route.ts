// app/api/ai_dictionary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    // ── 1. Validate env ──────────────────────────────────────────────────────
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    if (!process.env.GROQ_API_KEY)
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });

    // ── 2. Parse request ─────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body?.query)
      return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const { query }: { query: string } = body;

    // ── 3. Fetch ONLY medicines that have a description ──────────────────────
    // Medicines without description are excluded — the AI has nothing to match on.
    const today = new Date().toISOString().split("T")[0];

    const { data: medicines, error: dbError } = await supabase
      .from("pharma_medicines")
      .select("id, med_name, med_dosage, med_type, exp_date, quantity, unit, description")
      .gt("quantity", 0)
      .eq("archived", false)
      .gt("exp_date", today)
      .not("description", "is", null)
      .neq("description", "")
      .order("med_name");

    if (dbError)
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );

    const inventory = medicines ?? [];

    // ── 4. No inventory at all ───────────────────────────────────────────────
    if (inventory.length === 0) {
      return NextResponse.json({
        recommendation: "Walang gamot sa inventory na may description. Pakiusap magdagdag ng description sa bawat gamot sa database.",
        structured: {
          summary: "Walang gamot sa inventory na may description.",
          dosis: "N/A",
          frequency: "N/A",
          tandaan: "Ang AI Dictionary ay gumagana lamang kung ang bawat gamot ay may description sa database.",
          medicines: [],
        },
        medicines: [],
      });
    }

    // ── 5. Build inventory text — description only from DB ───────────────────
    const inventoryList = inventory
      .map(
        (m, idx) =>
          `${idx + 1}. ${m.med_name} | ${m.med_dosage} ${m.unit} | ${m.med_type} | Stock: ${m.quantity}\n   Description: ${m.description!.trim()}`
      )
      .join("\n\n");

    // ── 6. Call Groq / Llama ─────────────────────────────────────────────────
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 600,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `Ikaw ay isang clinical pharmacist ng Philippine Rural Health Unit (RHU).

MAHALAGANG PANUNTUNAN — sundin nang walang pagbubukod:
1. Ang inventory list na ibibigay sa iyo ay ang TANGING pinagkukunan mo ng impormasyon.
2. Bawat gamot sa inventory ay may "Description:" — doon mo malalaman kung para saan ang gamot.
3. Mag-recommend KA LAMANG ng gamot na ang Description ay clinically relevant sa query ng doktor.
4. BAWAL mag-recommend ng gamot na WALA sa inventory list — kahit alam mo na may gamot para sa kondisyon.
5. BAWAL mag-imbento ng gamot o magdagdag ng gamot na hindi nakasulat sa ibinigay na inventory.
6. Kung walang gamot sa inventory na akma sa query, sabihin nang tapat at huwag mag-suggest ng ibang gamot.
7. Kung pasyente ay bata, i-adjust ang dosis at banggitin ito sa sagot.

Sumagot ng PURE JSON LAMANG — walang markdown, walang \`\`\`json, walang kahit anong text bago o pagkatapos ng JSON:
{
  "summary": "Direktang sagot sa query. Hal: 'Para sa asthma, inirerekomenda ang Salbutamol Syrup.' O kung wala: 'Walang gamot sa kasalukuyang inventory na akma para sa inilarawang kondisyon.'",
  "dosis": "Specific na dosis batay sa gamot at description. Hal: '2.5mg' o '5ml' — o 'N/A' kung walang akma",
  "frequency": "Hal: 'Tuwing 4-6 oras' o '3x bawat araw' — o 'N/A' kung walang akma",
  "tandaan": "Maikling clinical note mula sa description. O kung wala: 'Isaalang-alang ang referral o reseta ng ibang gamot na hindi available sa inventory.'",
  "medicines": ["ExactMedNameFromInventory"]
}

PAALALA: Ang "medicines" array ay dapat naglalaman LAMANG ng mga pangalan na EKSAKTONG makikita sa inventory list. Kung walang akma, ilagay ang empty array: []`,
        },
        {
          role: "user",
          content: `Query ng doktor: "${query}"

INVENTORY (description galing sa database — ito lang ang dapat gamitin):

${inventoryList}

Batay sa description ng bawat gamot sa itaas, alin ang akma para sa: "${query}"?
BAWAL mag-suggest ng gamot na wala sa listahan. JSON lang ang sagot.`,
        },
      ],
    });

    const aiText = (completion.choices[0]?.message?.content ?? "").trim();
    console.log("[AI Dictionary] Groq response:", aiText.slice(0, 500));

    // ── 7. Parse JSON ────────────────────────────────────────────────────────
    let structured: {
      summary: string;
      dosis: string;
      frequency: string;
      tandaan: string;
      medicines: string[];
    } | null = null;

    try {
      const jsonStart = aiText.indexOf("{");
      const jsonEnd = aiText.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        structured = JSON.parse(aiText.slice(jsonStart, jsonEnd + 1));
      }
    } catch (e) {
      console.error("[AI Dictionary] JSON parse error:", e);
    }

    // ── 8. Match recommended medicine names back to DB rows ──────────────────
    // Only return medicines whose exact name appears in the AI's medicines array.
    // This ensures nothing outside the inventory is ever returned.
    let recommendedMedicines: typeof inventory = [];

    if (structured?.medicines?.length) {
      recommendedMedicines = inventory.filter((m) =>
        structured!.medicines.some(
          (name) =>
            m.med_name.toLowerCase().trim() === name.toLowerCase().trim() ||
            m.med_name.toLowerCase().includes(name.toLowerCase().trim()) ||
            name.toLowerCase().includes(m.med_name.toLowerCase().trim())
        )
      );
    }

    // ── 9. Respond ───────────────────────────────────────────────────────────
    return NextResponse.json({
      recommendation: structured?.summary?.trim() || aiText.slice(0, 300),
      structured,
      medicines: recommendedMedicines,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ AI Dictionary error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}