import { useLocale } from "@/hooks/useLocale";
import { CURRENCIES, SELECTABLE_CURRENCY_CODES, type CurrencyCode } from "@/lib/currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  className?: string;
  /** Compact = symbol + code only (for headers/toolbars). */
  compact?: boolean;
}

const CurrencySelector = ({ className, compact }: Props) => {
  const { currency, setCurrency } = useLocale();

  return (
    <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
      <SelectTrigger
        className={className ?? (compact ? "h-8 w-[104px] text-xs" : "h-9 w-[190px] text-sm")}
        aria-label="Select currency"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-50 bg-popover">
        {SELECTABLE_CURRENCY_CODES.map((code) => {
          const c = CURRENCIES[code];
          return (
            <SelectItem key={code} value={code}>
              {compact ? `${c.symbol} ${code}` : `${c.symbol} ${code} — ${c.label}`}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;
