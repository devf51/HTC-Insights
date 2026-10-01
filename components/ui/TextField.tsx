import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  /** แทนที่ hint และเปลี่ยนขอบเป็น danger — ต้องบอกวิธีแก้ ไม่ใช่แค่ว่าผิด */
  error?: ReactNode;
}

export function TextField({ label, hint, error, className, id, ...rest }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const msg = error ?? hint;
  return (
    <div className={cx("kn-field", error ? "kn-field-error" : null, className)}>
      {label && (
        <label className="kn-field-label" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <input
        id={fieldId}
        className="kn-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={msg ? `${fieldId}-msg` : undefined}
        {...rest}
      />
      {msg && (
        <p className="kn-field-hint" id={`${fieldId}-msg`}>
          {msg}
        </p>
      )}
    </div>
  );
}
