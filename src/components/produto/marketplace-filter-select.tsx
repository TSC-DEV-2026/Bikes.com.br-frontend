import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EMPTY_SENTINEL = "__marketplace_filter_empty__";

function toSelectValue(value: string): string {
  return value === "" ? EMPTY_SENTINEL : value;
}

function fromSelectValue(value: string): string {
  return value === EMPTY_SENTINEL ? "" : value;
}

export type MarketplaceFilterSelectOption = {
  value: string;
  label: string;
};

const TRIGGER_CLASS =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#0c1b33] shadow-sm outline-none transition-[color,box-shadow] focus-visible:border-[#09bc8a] focus-visible:ring-2 focus-visible:ring-[#09bc8a]/25 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-10 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate";

const CONTENT_CLASS =
  "z-[60] rounded-lg border border-gray-200 bg-white text-[#0c1b33] shadow-md";

const ITEM_CLASS =
  "rounded-md text-sm text-[#0c1b33] focus:bg-emerald-50 focus:text-[#0c1b33] data-[highlighted]:bg-emerald-50 data-[highlighted]:text-[#0c1b33] data-[state=checked]:bg-emerald-50/80 data-[state=checked]:font-medium data-[state=checked]:text-[#0c1b33]";

type MarketplaceFilterSelectProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly MarketplaceFilterSelectOption[];
  disabled?: boolean;
  /** z-index do menu (ex.: drawer mobile acima do sheet z-[2100]). */
  menuLayerClass?: string;
};

export function MarketplaceFilterSelect({
  id,
  value,
  onValueChange,
  options,
  disabled = false,
  menuLayerClass,
}: MarketplaceFilterSelectProps) {
  return (
    <Select
      value={toSelectValue(value)}
      onValueChange={(next) => onValueChange(fromSelectValue(next))}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn(TRIGGER_CLASS)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        className={cn(CONTENT_CLASS, menuLayerClass)}
        position="popper"
      >
        {options.map((option) => {
          const itemValue = toSelectValue(option.value);
          return (
            <SelectItem
              key={itemValue}
              value={itemValue}
              className={ITEM_CLASS}
            >
              {option.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
