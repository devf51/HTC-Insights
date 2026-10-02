"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { DEPARTMENTS } from "@/lib/departments";
import { MAX_PHOTOS, PHOTO_TYPES, overallScore } from "@/lib/review-rules";

export type CompanyPick =
  | { kind: "existing"; id: string }
  | { kind: "place"; placeId: string; query: string }
  | { kind: "new" };

/** ค่าเริ่มต้นตอนแก้รีวิวที่ถูกปฏิเสธ — วันที่เป็น "YYYY-MM-DD" แล้ว */
export type ReviewDefaults = {
  department: string;
  gender: string;
  periodStart: string;
  periodEnd: string;
  dailyAllowance: string;
  hasAccommodation: boolean;
  hasTransport: boolean;
  workStartTime: string;
  workEndTime: string;
  scoreWork: number;
  scoreEnv: number;
  scoreMentor: number;
  scoreWelfare: number;
  textWork: string;
  textPros: string;
  textCons: string;
  textAdvice: string;
  isAnonymous: boolean;
};

const STEPS = ["ช่วงฝึกงาน", "คะแนน 4 ด้าน", "เบี้ยเลี้ยงและเวลางาน", "เล่าประสบการณ์", "ตรวจและส่ง"];

const SCORES = [
  { name: "scoreWork", label: "ลักษณะงาน", hint: "ตรงสาขา ได้ลงมือทำจริง" },
  { name: "scoreEnv", label: "สภาพแวดล้อม", hint: "สถานที่ เพื่อนร่วมงาน ความปลอดภัย" },
  { name: "scoreMentor", label: "พี่เลี้ยง", hint: "สอนงาน ดูแล ให้คำแนะนำ" },
  { name: "scoreWelfare", label: "เบี้ยเลี้ยงและสวัสดิการ", hint: "เบี้ยเลี้ยง ที่พัก รถรับส่ง" },
] as const;
type ScoreName = (typeof SCORES)[number]["name"];

const GENDERS = [
  ["MALE", "ชาย"],
  ["FEMALE", "หญิง"],
  ["PREFER_NOT", "ไม่ระบุ"],
] as const;

// วันนี้ตามเวลาไทย ในรูปแบบของ <input type="date">
const todayThai = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function ReviewForm({
  company,
  editId,
  defaults = {},
  uploadsEnabled,
}: {
  company: CompanyPick;
  editId?: string;
  defaults?: Partial<ReviewDefaults>;
  uploadsEnabled: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<ScoreName, number>>({
    scoreWork: defaults.scoreWork ?? 0,
    scoreEnv: defaults.scoreEnv ?? 0,
    scoreMentor: defaults.scoreMentor ?? 0,
    scoreWelfare: defaults.scoreWelfare ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const last = STEPS.length - 1;

  const fieldsOf = (i: number) =>
    Array.from(formRef.current?.querySelectorAll<Field>(`[data-step="${i}"] :is(input, select, textarea)`) ?? []);

  function next() {
    // every หยุดที่ช่องแรกที่ผิด — เบราว์เซอร์แสดงข้อความของมันที่ช่องนั้น
    if (fieldsOf(step).every((f) => f.reportValidity())) {
      setError(null);
      setStep(step + 1);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // กด Enter ในช่องข้อความ = ไปขั้นถัดไป ไม่ใช่ส่ง
    if (step < last) return next();
    // ขั้นก่อนหน้าตรวจไปแล้ว แต่ผู้ใช้อาจย้อนไปแก้ — ตรวจทุกขั้นอีกรอบ
    const bad = STEPS.findIndex((_, i) => !fieldsOf(i).every((f) => f.checkValidity()));
    if (bad !== -1) {
      setStep(bad);
      setError(`กรอกขั้นที่ ${bad + 1} (${STEPS[bad]}) ให้ครบก่อนส่ง`);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(editId ? `/api/reviews/${editId}` : "/api/reviews", {
        method: editId ? "PUT" : "POST",
        body: new FormData(e.currentTarget),
      });
      if (res.ok) {
        router.push("/profile?sent=1");
        return;
      }
      const body: { error?: string } | null = await res.json().catch(() => null);
      setError(body?.error ?? "ส่งไม่สำเร็จ ลองอีกครั้ง");
    } catch {
      setError("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง");
    }
    setSending(false);
  }

  const allScored = Object.values(scores).every((n) => n > 0);

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex max-w-2xl flex-col gap-6">
      {company.kind === "existing" && (
        <>
          <input type="hidden" name="companyKind" value="existing" />
          <input type="hidden" name="companyId" value={company.id} />
        </>
      )}
      {company.kind === "place" && (
        <>
          <input type="hidden" name="companyKind" value="place" />
          <input type="hidden" name="placeId" value={company.placeId} />
          <input type="hidden" name="placeQuery" value={company.query} />
        </>
      )}
      {company.kind === "new" && <input type="hidden" name="companyKind" value="new" />}

      <p className="text-small text-ink-muted" aria-live="polite">
        {`ขั้นที่ ${step + 1} จาก ${STEPS.length} · ${STEPS[step]}`}
      </p>

      <Step i={0} step={step}>
        {company.kind === "new" && (
          <>
            <TextField name="newName" label="ชื่อสถานประกอบการ" required minLength={2} maxLength={150} />
            <TextField name="newAddress" label="ที่อยู่" required minLength={5} maxLength={300} hint="ถนน อำเภอ จังหวัด ให้รุ่นน้องหาเจอ" />
          </>
        )}
        <Select name="department" label="แผนกวิชา" required defaultValue={defaults.department ?? ""}>
          <option value="" disabled>
            เลือกแผนก
          </option>
          {DEPARTMENTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
        <Select name="gender" label="เพศ" required defaultValue={defaults.gender ?? "PREFER_NOT"}>
          {GENDERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField type="date" name="periodStart" label="วันเริ่มฝึก" required max={todayThai()} defaultValue={defaults.periodStart} />
          <TextField type="date" name="periodEnd" label="วันสิ้นสุดการฝึก" required defaultValue={defaults.periodEnd} />
        </div>
      </Step>

      <Step i={1} step={step}>
        {SCORES.map((s) => (
          <fieldset key={s.name} className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2">
              {s.label} <span className="text-small text-ink-muted">· {s.hint}</span>
            </legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex-1">
                  <input
                    type="radio"
                    name={s.name}
                    value={n}
                    required
                    defaultChecked={defaults[s.name] === n}
                    onChange={() => setScores((v) => ({ ...v, [s.name]: n }))}
                    className="peer sr-only"
                  />
                  <span className="flex h-11 cursor-pointer items-center justify-center rounded-md border border-line peer-checked:border-signal peer-checked:bg-signal peer-checked:text-on-signal peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal">
                    {n}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <p className="text-small text-ink-muted">
          {`คะแนนรวม (ระบบคำนวณจากค่าเฉลี่ย 4 ด้าน): ${allScored ? overallScore(scores).toFixed(2) : "–"}`}
        </p>
      </Step>

      <Step i={2} step={step}>
        <TextField
          type="number"
          name="dailyAllowance"
          label="เบี้ยเลี้ยงต่อวัน (บาท)"
          hint="ใส่ 0 ถ้าไม่ได้รับ เว้นว่างถ้าจำไม่ได้"
          min={0}
          max={10000}
          step={1}
          inputMode="numeric"
          defaultValue={defaults.dailyAllowance}
        />
        <Check name="hasAccommodation" label="มีที่พักให้" defaultChecked={defaults.hasAccommodation} />
        <Check name="hasTransport" label="มีรถรับส่ง" defaultChecked={defaults.hasTransport} />
        <div className="grid grid-cols-2 gap-4">
          <TextField type="time" name="workStartTime" label="เวลาเข้างาน" defaultValue={defaults.workStartTime} />
          <TextField type="time" name="workEndTime" label="เวลาเลิกงาน" defaultValue={defaults.workEndTime} />
        </div>
      </Step>

      <Step i={3} step={step}>
        <Area
          name="textWork"
          label="ลักษณะงานที่ได้ทำ"
          hint="อย่างน้อย 30 ตัวอักษร เล่าว่าทำอะไรบ้างในแต่ละวัน"
          required
          minLength={30}
          maxLength={1000}
          defaultValue={defaults.textWork}
        />
        <Area name="textPros" label="ข้อดี" maxLength={500} defaultValue={defaults.textPros} />
        <Area name="textCons" label="ข้อควรรู้" maxLength={500} defaultValue={defaults.textCons} />
        <Area name="textAdvice" label="คำแนะนำถึงรุ่นน้อง" maxLength={500} defaultValue={defaults.textAdvice} />
      </Step>

      <Step i={4} step={step}>
        {uploadsEnabled && (
          <div className="kn-field">
            <label className="kn-field-label" htmlFor="photos">
              {`รูปประกอบ (ไม่เกิน ${MAX_PHOTOS} รูป ไฟล์ละไม่เกิน 5 MB)`}
            </label>
            <input
              id="photos"
              name="photos"
              type="file"
              multiple
              accept={PHOTO_TYPES.join(",")}
              className="kn-input h-auto py-2"
              onChange={(e) => {
                const files = e.currentTarget.files;
                e.currentTarget.setCustomValidity(files && files.length > MAX_PHOTOS ? `เลือกได้ไม่เกิน ${MAX_PHOTOS} รูป` : "");
              }}
            />
            {editId && <p className="kn-field-hint">แนบใหม่จะแทนที่รูปเดิมทั้งหมด ไม่แนบ = ใช้รูปเดิม</p>}
          </div>
        )}
        <Check name="isAnonymous" label="ไม่แสดงชื่อของฉันในรีวิวนี้" defaultChecked={defaults.isAnonymous} />
        <p className="text-small text-ink-muted">
          ผู้ดูแลยังเห็นว่าใครเขียนเพื่อตรวจสอบได้ แต่ชื่อจะไม่แสดงต่อผู้ใช้คนอื่น รีวิวจะเผยแพร่หลังผู้ดูแลตรวจแล้ว
        </p>
      </Step>

      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-between gap-4">
        {step > 0 ? <Button onClick={() => setStep(step - 1)}>ย้อนกลับ</Button> : <span />}
        {step < last ? (
          <Button key="next" variant="primary" onClick={next}>
            ถัดไป
          </Button>
        ) : (
          <Button key="submit" type="submit" variant="primary" disabled={sending}>
            {sending ? "กำลังส่ง…" : editId ? "ส่งรีวิวอีกครั้ง" : "ส่งรีวิว"}
          </Button>
        )}
      </div>
    </form>
  );
}

function Step({ i, step, children }: { i: number; step: number; children: ReactNode }) {
  return (
    <fieldset data-step={i} hidden={step !== i} className="flex min-w-0 flex-col gap-4">
      <legend className="sr-only">{STEPS[i]}</legend>
      {children}
    </fieldset>
  );
}

function Select({ label, name, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string }) {
  return (
    <div className="kn-field">
      <label className="kn-field-label" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} className="kn-input" {...rest}>
        {children}
      </select>
    </div>
  );
}

function Area({ label, hint, name, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; name: string }) {
  return (
    <div className="kn-field">
      <label className="kn-field-label" htmlFor={name}>
        {label}
      </label>
      <textarea id={name} name={name} rows={4} className="kn-input h-auto py-3" aria-describedby={hint ? `${name}-hint` : undefined} {...rest} />
      {hint && (
        <p className="kn-field-hint" id={`${name}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 accent-[var(--signal)]" />
      {label}
    </label>
  );
}
