import { Input } from "@/components/ui/input";
import { INPUT_CLASS } from "@/pages/vender/vender-produto-create-form";
import {
  normalizeCurrencyDraftOnBlur,
  sanitizeCurrencyDraft,
} from "@/pages/vender/vender-produto-create-utils";

export type CurrencyDraftInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  "aria-invalid"?: boolean;
};

export function CurrencyDraftInput({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  "aria-invalid": ariaInvalid,
}: CurrencyDraftInputProps) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(sanitizeCurrencyDraft(e.target.value))}
      onBlur={(e) => onChange(normalizeCurrencyDraftOnBlur(e.target.value))}
      disabled={disabled}
      placeholder={placeholder}
      aria-invalid={ariaInvalid}
      className={INPUT_CLASS}
    />
  );
}
