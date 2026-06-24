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

    const { query, language }: { query: string; language?: "tagalog" | "english" } = body;
    const responseLanguage: "tagalog" | "english" = language === "english" ? "english" : "tagalog";

    // ── 3. Fetch ONLY medicines that have a description ──────────────────────
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
      const noInventoryMsg =
        responseLanguage === "english"
          ? "No medicines in inventory have a description. Please add a description to each medicine in the database."
          : "Walang gamot sa inventory na may description. Pakiusap magdagdag ng description sa bawat gamot sa database.";
      const noInventoryNote =
        responseLanguage === "english"
          ? "The AI Dictionary only works if every medicine has a description in the database."
          : "Ang AI Dictionary ay gumagana lamang kung ang bawat gamot ay may description sa database.";

      return NextResponse.json({
        recommendation: noInventoryMsg,
        structured: {
          mode: "detailed",
          summary: noInventoryMsg,
          dosis: "N/A",
          frequency: "N/A",
          tandaan: noInventoryNote,
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
      max_tokens: 400,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `Ikaw ay isang clinical pharmacist ng Philippine Rural Health Unit (RHU).

WIKA NG SAGOT (pinaka-importante, sundin nang eksakto):
- Ang TANGGAPAN ng wika ng response ay: "${responseLanguage}".
- Kung "${responseLanguage}" ay "english": Isulat ang LAHAT ng "summary", "dosis", "frequency", at "tandaan" sa ENGLISH. Huwag maghalo ng Tagalog.
- Kung "${responseLanguage}" ay "tagalog": Isulat ang LAHAT ng "summary", "dosis", "frequency", at "tandaan" sa TAGALOG (o Taglish kung mas natural — sundin ang style ng query ng doktor).
- Ang mga MEDICINE NAMES sa "medicines" array ay HINDI isasalin — dapat eksaktong kopya mula sa inventory, kahit anong wika ang ginamit sa response.
- Ang mga values tulad ng "mode" (list/dosage/detailed) ay nananatiling ENGLISH literal kahit ano ang response language — ito ay internal field lang, hindi nakikita ng user.

MAHALAGANG PANUNTUNAN — sundin nang walang pagbubukod:
1. Ang inventory list na ibibigay sa iyo ay ang TANGING pinagkukunan mo ng impormasyon.
2. Bawat gamot sa inventory ay may "Description:" — doon mo malalaman kung para saan ang gamot, at kung paano ito i-dose (kung mayroon).
3. Mag-recommend KA LAMANG ng gamot na ang Description ay clinically relevant sa query ng doktor.
4. BAWAL mag-recommend ng gamot na WALA sa inventory list — kahit alam mo na may gamot para sa kondisyon.
5. BAWAL mag-imbento ng gamot o magdagdag ng gamot na hindi nakasulat sa ibinigay na inventory.
6. Kung walang gamot sa inventory na akma sa query, sabihin nang tapat at huwag mag-suggest ng ibang gamot.
7. Ang "medicines" array ay dapat NASA PAGKAKASUNOD-SUNOD MULA SA PINAKA-AKMA (best match) HANGGANG SA PINAKA-MALAYO (least relevant match) batay sa Description. Ang unang item sa array ay ang ipapakita bilang TOP recommendation.
8. ANG "medicines" ARRAY AY DAPAT MAY MAXIMUM NA 4 LANG NA GAMOT — kahit marami pang akma sa inventory. Piliin lamang ang 2 HANGGANG 4 na PINAKA-EFFECTIVE at PINAKA-AKMA na gamot batay sa Description. Huwag ilista ang lahat ng posibleng gamot — piliin ang pinakamahusay lang.

UNANG HAKBANG — TUKUYIN ANG MODE NG QUERY (ito ay internal classification lang, hindi naaapektuhan ng response language sa itaas):
- "list" mode: Simpleng paghingi ng listahan ng posibleng gamot, walang partikular na patient context (age, weight, BMI, specific severity, comorbidity, o tanong tungkol sa dosis). Mga halimbawa: "give me the list of medicine for fever", "anong gamot pwede sa ubo", "list ng gamot para sa sipon".
- "dosage" mode: Tanong tungkol sa DOSIS ng ISA O ILANG SPECIFIC na gamot (hindi general na "anong gamot"), may kasamang age, weight, o BMI ng pasyente. Mga halimbawa: "ano ang dosage ng paracetamol para sa 2-year-old", "dosis ng amoxicillin para sa batang 15kg", "tamang dose para sa adult na 70kg".
- "detailed" mode: May partikular na patient context (age, symptoms combination, severity, comorbidity) PERO hindi tanong tungkol sa specific na gamot/dosis. Mga halimbawa: "2-year-old with high fever and asthma".

Kung hindi sigurado, ituring na "list" mode (mas simple, mas ligtas na default).

PANUNTUNAN PARA SA "dosage" MODE (pinaka-mahalaga):
- Tingnan ang Description ng hinihinging gamot. Kung ang dosing formula ay BATAY SA WEIGHT (hal. "10-15mg/kg bawat dose") o BATAY SA AGE/BMI, at WALANG weight/BMI na binigay sa query (age lang ang ibinigay, hal. "2-year-old"):
  -- HUWAG mag-imbento o mag-guess ng exact weight ng bata batay lamang sa age. Sa halip, ibigay ang dosing FORMULA mula sa description (hal. "10-15mg/kg/dose"), at sabihin sa "tandaan" na kailangan ng aktwal na timbang (weight in kg) ng pasyente para macompute ang eksaktong dosis sa mg.
  -- Maaari kang magbigay ng karaniwang average range PARA SA TYPICAL na timbang ng edad na ibinigay (WHO/DOH growth standards), basta't malinaw na nilagay mong "average estimate lang ito" at hinihiling ang aktwal na timbang para sa eksaktong dosis.
- Kung BIGAY na ang weight/BMI sa query, i-compute ang eksaktong dosis gamit ang formula sa Description (hal. "12mg/kg x 15kg = 180mg, hatiin sa 3 dosis bawat araw = 60mg kada dose").
- Kung walang weight-based formula sa Description (fixed dose lang, hal. "500mg tablet kada 6 oras para sa adult"), ituloy lang ang fixed dose pero banggitin kung angkop ito sa edad/timbang ng pasyente.

Sumagot ng PURE JSON LAMANG — walang markdown, walang \`\`\`json, walang kahit anong text bago o pagkatapos ng JSON. (Ang JSON structure mismo — keys gaya ng "mode", "summary" — ay nananatiling ganito, ang VALUES lang ang nasa "${responseLanguage}".)

KUNG "list" MODE:
{
  "mode": "list",
  "summary": "Maikling intro lang.",
  "dosis": "N/A",
  "frequency": "N/A",
  "tandaan": "",
  "medicines": ["BestMatchMedName", "SecondBestMatchMedName"]
}
(Maximum 4 lang sa "medicines" array — ang 2-4 PINAKA-EFFECTIVE na gamot batay sa Description, hindi lahat ng posibleng akma.)

KUNG "dosage" MODE:
{
  "mode": "dosage",
  "summary": "Direktang sagot sa tanong tungkol sa dosis.",
  "dosis": "Eksaktong computed dose KUNG may weight, o ang FORMULA + average estimate KUNG age lang ang ibinigay.",
  "frequency": "Hal: tuwing ilang oras, ilang beses kada araw.",
  "tandaan": "Kung kailangan ng aktwal na weight, sabihin ito. Kung kumpleto na ang info, ibang clinical note mula sa description.",
  "medicines": ["ExactMedNameFromInventory"]
}

KUNG "detailed" MODE:
{
  "mode": "detailed",
  "summary": "Direktang sagot sa query.",
  "dosis": "Specific na dosis batay sa gamot at description, o 'N/A' kung walang akma.",
  "frequency": "Halimbawa: tuwing ilang oras o ilang beses kada araw, o 'N/A' kung walang akma.",
  "tandaan": "Maikling clinical note mula sa description, o kung wala, banggitin ang posibleng referral.",
  "medicines": ["BestMatchMedName", "SecondBestMatchMedName"]
}
(Maximum 4 lang sa "medicines" array dito rin — ang 2-4 PINAKA-EFFECTIVE na gamot batay sa Description.)

PAALALA: Ang "medicines" array ay dapat naglalaman LAMANG ng mga pangalan na EKSAKTONG makikita sa inventory list, NASA TAMANG PAGKAKASUNOD-SUNOD mula best match, AT HUWAG LALAGPAS SA 4 NA GAMOT. Kung walang akma, ilagay ang empty array: []`,
        },
        {
          role: "user",
          content: `Query ng doktor: "${query}"
(Response language: ${responseLanguage})

INVENTORY (description galing sa database — ito lang ang dapat gamitin):

${inventoryList}

Batay sa description ng bawat gamot sa itaas, alin ang akma para sa: "${query}"?
Tukuyin muna ang mode (list, dosage, o detailed) batay sa panuntunan, tapos sumagot nang naaayon sa "${responseLanguage}" bilang wika ng summary/dosis/frequency/tandaan.
BAWAL mag-suggest ng gamot na wala sa listahan. JSON lang ang sagot.`,
        },
      ],
    });

    const aiText = (completion.choices[0]?.message?.content ?? "").trim();
    console.log("[AI Dictionary] Groq response:", aiText.slice(0, 500));

    // ── 7. Parse JSON ────────────────────────────────────────────────────────
    let structured: {
      mode: "list" | "dosage" | "detailed";
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

    // Default mode if AI didn't include it (backward safety)
    if (structured && !structured.mode) {
      structured.mode = "detailed";
    }

    // ── 8. Match recommended medicine names back to DB rows ──────────────────
    // IMPORTANT: iterate over structured.medicines (AI's ranked order), not
    // inventory order — this preserves "best match first" ranking from the AI.
    // HARD CAP: max 4 medicines regardless of what the AI returns — this is
    // enforced in code, not left to the prompt alone, since the model can't
    // always be trusted to obey a count limit.
    const MAX_MEDICINES = 4;
    let recommendedMedicines: typeof inventory = [];

    if (structured?.medicines?.length) {
      const seen = new Set<string>();

      for (const name of structured.medicines) {
        if (recommendedMedicines.length >= MAX_MEDICINES) break;

        const cleanName = name.toLowerCase().trim();

        const match = inventory.find(
          (m) =>
            !seen.has(m.id) &&
            (m.med_name.toLowerCase().trim() === cleanName ||
              m.med_name.toLowerCase().includes(cleanName) ||
              cleanName.includes(m.med_name.toLowerCase().trim()))
        );

        if (match) {
          seen.add(match.id);
          recommendedMedicines.push(match);
        }
      }
    }

    // ── 9. Respond ───────────────────────────────────────────────────────────
    return NextResponse.json({
      recommendation: structured?.summary?.trim() || aiText.slice(0, 300),
      structured,
      medicines: recommendedMedicines,
      mode: structured?.mode ?? "detailed",
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ AI Dictionary error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}