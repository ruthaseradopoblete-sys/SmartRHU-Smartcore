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
    const body = await req.json().catch(() => null);
    if (!body || !body.query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const { query } = body;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    if (!process.env.GROQ_API_KEY)
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });

    // Fetch only in-stock, non-archived, non-expired medicines
    const today = new Date().toISOString().split("T")[0];

  const { data: medicines, error: dbError } = await supabase
  .from("pharma_medicines")
  .select("id, med_name, med_dosage, med_type, exp_date, quantity, unit, description")
  .gt("quantity", 0)
  .eq("archived", false)
  .gt("exp_date", today)
  .not("description", "is", null)   // ← only medicines WITH description
  .neq("description", "")           // ← exclude empty string descriptions
  .order("med_name");

    if (dbError) {
      return NextResponse.json({ error: `Supabase error: ${dbError.message}` }, { status: 500 });
    }

    if (!medicines || medicines.length === 0) {
      return NextResponse.json({
        recommendation: "No medicines are currently available in the inventory.",
        medicines: [],
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are a clinical assistant for a Philippine Rural Health Unit (RHU).
Recommend medicines from the inventory for the patient's symptoms.
Rules:
- ONLY recommend medicines from the inventory list.
- Consider patient age, weight-appropriate dosing, and contraindications.
- Flag expiring soon or low stock (quantity < 10) as warnings.
- Be concise and clinical.
- Structure: 1) Clinical assessment 2) Treatment plan 3) Dosage guidance 4) Warnings
- End with: MEDICINES: ["ExactName1", "ExactName2"]`,
        },
        {
          role: "user",
          content: `Patient query: "${query}"\n\nAvailable inventory:\n${JSON.stringify(medicines, null, 2)}`,
        },
      ],
    });

    const aiText = completion.choices[0]?.message?.content ?? "";

    let recommendedMedicines: typeof medicines = [];
    const match = aiText.match(/MEDICINES:\s*(\[[\s\S]*?\])/);
    if (match) {
      try {
        const names: string[] = JSON.parse(match[1]);
        recommendedMedicines = medicines.filter((m) =>
          names.some((name) => m.med_name.toLowerCase() === name.toLowerCase())
        );
      } catch {
        recommendedMedicines = [];
      }
    }

    const recommendation = aiText.replace(/MEDICINES:\s*\[[\s\S]*?\]/, "").trim();

    return NextResponse.json({ recommendation, medicines: recommendedMedicines });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ AI Dictionary error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}