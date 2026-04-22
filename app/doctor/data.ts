// ── Types ─────────────────────────────────────────────
export type PatientStatus = "waiting" | "urgent" | "done";
export type VisitType = "consultation" | "lab" | "prescription" | "follow-up" | "emergency";

export interface Patient {
  id: number; name: string; time: string; status: PatientStatus;
  age: string; gender: string; civil: string; addr: string;
}
export interface DiseaseItem { label: string; pct: number; color: string; count: number; }
export interface StockItem { name: string; level: number; color: string; }
export interface VisitEvent {
  id: number; date: string; time: string; type: VisitType; title: string;
  doctor: string; diagnosis: string; prescription?: string[]; labTests?: string[];
  notes: string; bp?: string; temp?: string; weight?: string;
  status: "completed" | "ongoing" | "scheduled";
}
export interface TimelinePatient {
  id: number; name: string; age: string; gender: string; civil: string;
  addr: string; philHealth: string; bloodType: string;
  allergies: string[]; conditions: string[]; visits: VisitEvent[];
}

// ── Mock Data ──────────────────────────────────────────
export const INITIAL_PATIENTS: Patient[] = [
  { id:1, name:"Maria Santos",   time:"09:00 AM", status:"urgent",  age:"34", gender:"Female", civil:"Married", addr:"Brgy 1, Lopez, Quezon" },
  { id:2, name:"Juan Dela Cruz", time:"09:30 AM", status:"waiting", age:"45", gender:"Male",   civil:"Married", addr:"Brgy 3, Lopez, Quezon" },
  { id:3, name:"Ana Reyes",      time:"10:00 AM", status:"waiting", age:"28", gender:"Female", civil:"Single",  addr:"Brgy 7, Lopez, Quezon" },
  { id:4, name:"Carlos Mendoza", time:"10:30 AM", status:"done",    age:"52", gender:"Male",   civil:"Married", addr:"Brgy 5, Lopez, Quezon" },
  { id:5, name:"Liza Bautista",  time:"11:00 AM", status:"waiting", age:"39", gender:"Female", civil:"Widow",   addr:"Brgy 2, Lopez, Quezon" },
];

export const DISEASES: DiseaseItem[] = [
  { label:"Hypertension", pct:34, count:82, color:"#ef4444" },
  { label:"Diabetes",     pct:22, count:53, color:"#f97316" },
  { label:"URTI",         pct:18, count:43, color:"#eab308" },
  { label:"Asthma",       pct:15, count:36, color:"#4ade80" },
  { label:"Diarrhea",     pct:11, count:26, color:"#818cf8" },
];

export const STOCK: StockItem[] = [
  { name:"Antibiotics",      level:72, color:"#1d7a3f" },
  { name:"Analgesics",       level:45, color:"#f59e0b" },
  { name:"Antihypertensive", level:28, color:"#ef4444" },
  { name:"Vitamins",         level:88, color:"#16a34a" },
  { name:"Antiseptics",      level:61, color:"#3b82f6" },
];

export const MEDICINES = [
  "Amoxicillin 500mg","Paracetamol 500mg","Amlodipine 5mg","Metformin 500mg",
  "Losartan 50mg","Cetirizine 10mg","Salbutamol Inhaler","ORS Sachet",
  "Vitamin C 500mg","Ferrous Sulfate 325mg",
];

export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const DAY_LABELS = ["S","M","T","W","TH","F","S"];

export const AI_RESPONSES: Record<string,string> = {
  hypertension: "Hypertension (≥130/80 mmHg). First-line: ACE inhibitors, ARBs, or thiazide diuretics.",
  diabetes:     "Type 2 DM: Metformin + lifestyle changes. Monitor HbA1c every 3 months.",
  urti:         "URTI: Rest, hydration, symptomatic relief. Antibiotics only if bacterial.",
  asthma:       "Asthma: SABA for acute attacks. ICS for long-term maintenance.",
  diarrhea:     "Diarrhea: ORS for rehydration. Zinc supplementation. Antibiotics if indicated.",
  dengue:       "Dengue: Supportive. Daily CBC. Avoid NSAIDs. Platelet transfusion if <10,000.",
  pneumonia:    "CAP: Amoxicillin-clavulanate or Azithromycin. O2 if SpO2 <94%.",
  uti:          "UTI: TMP-SMX or Nitrofurantoin. 7-day course. Urine C&S for complicated cases.",
};

export const TIMELINE_PATIENTS: TimelinePatient[] = [
  {
    id:1, name:"Maria Santos", age:"34", gender:"Female", civil:"Married",
    addr:"Brgy 1, Lopez, Quezon", philHealth:"PH-1234-5678-90",
    bloodType:"O+", allergies:["Penicillin"], conditions:["Hypertension","Asthma"],
    visits:[
      { id:1, date:"2026-04-20", time:"09:00 AM", type:"consultation", status:"ongoing",
        title:"Hypertension Follow-up", doctor:"Dr. Maria Reyes",
        diagnosis:"Stage 1 Hypertension — BP 148/92 mmHg",
        prescription:["Amlodipine 5mg (1 tab OD)","Losartan 50mg (1 tab OD)"],
        notes:"Occasional headaches. Advised low-sodium diet.", bp:"148/92", temp:"36.8°C", weight:"62 kg" },
      { id:2, date:"2026-03-15", time:"10:30 AM", type:"lab", status:"completed",
        title:"Routine Lab Work", doctor:"Dr. Maria Reyes",
        diagnosis:"Annual workup — within normal limits",
        labTests:["CBC with Platelet Count","Fasting Blood Sugar","Cholesterol","Urinalysis"],
        notes:"FBS: 95 mg/dL. Cholesterol: 198 mg/dL. CBC unremarkable.",
        bp:"142/88", temp:"36.6°C", weight:"61.5 kg" },
    ],
  },
  {
    id:2, name:"Juan Dela Cruz", age:"45", gender:"Male", civil:"Married",
    addr:"Brgy 3, Lopez, Quezon", philHealth:"PH-2345-6789-01",
    bloodType:"A+", allergies:["None"], conditions:["Type 2 Diabetes","Hypertension"],
    visits:[
      { id:1, date:"2026-04-20", time:"09:30 AM", type:"consultation", status:"ongoing",
        title:"Diabetes & Hypertension Check", doctor:"Dr. Maria Reyes",
        diagnosis:"Type 2 DM — suboptimal. HbA1c 8.2%",
        prescription:["Metformin 500mg (1 tab BID)","Amlodipine 5mg (1 tab OD)"],
        notes:"HbA1c elevated. Strict diet advised.", bp:"145/90", temp:"36.7°C", weight:"78 kg" },
    ],
  },
  {
    id:3, name:"Ana Reyes", age:"28", gender:"Female", civil:"Single",
    addr:"Brgy 7, Lopez, Quezon", philHealth:"PH-3456-7890-12",
    bloodType:"B+", allergies:["Aspirin"], conditions:["URTI (recurring)"],
    visits:[
      { id:1, date:"2026-04-20", time:"10:00 AM", type:"consultation", status:"ongoing",
        title:"URTI Consultation", doctor:"Dr. Maria Reyes",
        diagnosis:"Acute viral URTI",
        prescription:["Paracetamol 500mg (q4h PRN)","Cetirizine 10mg (OD)","Vitamin C 500mg (OD)"],
        notes:"Cough, colds, mild fever x 3 days. Rest and hydration.", bp:"110/70", temp:"37.6°C", weight:"54 kg" },
    ],
  },
  {
    id:4, name:"Carlos Mendoza", age:"52", gender:"Male", civil:"Married",
    addr:"Brgy 5, Lopez, Quezon", philHealth:"PH-4567-8901-23",
    bloodType:"O-", allergies:["None"], conditions:["Diabetes","Diarrhea"],
    visits:[
      { id:1, date:"2026-04-20", time:"10:30 AM", type:"consultation", status:"completed",
        title:"Acute Diarrhea", doctor:"Dr. Maria Reyes",
        diagnosis:"Acute viral gastroenteritis",
        prescription:["ORS Sachet (after each loose stool)","Zinc 20mg (OD x 10 days)"],
        notes:"5 loose watery stools. Mild dehydration. ORT advised.", bp:"130/85", temp:"37.0°C", weight:"75 kg" },
    ],
  },
  {
    id:5, name:"Liza Bautista", age:"39", gender:"Female", civil:"Widow",
    addr:"Brgy 2, Lopez, Quezon", philHealth:"PH-5678-9012-34",
    bloodType:"AB+", allergies:["Ibuprofen"], conditions:["Asthma","Anemia"],
    visits:[
      { id:1, date:"2026-04-20", time:"11:00 AM", type:"follow-up", status:"ongoing",
        title:"Asthma & Anemia Follow-up", doctor:"Dr. Maria Reyes",
        diagnosis:"Mild persistent asthma — controlled. IDA improving.",
        prescription:["Salbutamol Inhaler (2 puffs PRN)","Ferrous Sulfate 325mg (OD)"],
        notes:"Hgb improved 9.2 → 10.8 g/dL. Continue iron x 3 months.",
        bp:"118/76", temp:"36.6°C", weight:"58 kg" },
    ],
  },
];
