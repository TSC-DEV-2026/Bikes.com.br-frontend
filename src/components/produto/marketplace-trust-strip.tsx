import { cn } from "@/lib/utils";

const TRUST_ITEMS = [
  "Anúncios reais",
  "Detalhe sem login",
  "Compra segura",
] as const;

export function MarketplaceTrustStrip({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[0.7rem] font-medium text-gray-600 sm:text-xs",
        className,
      )}
    >
      {TRUST_ITEMS.map((item, i) => (
        <span key={item} className="inline-flex items-center gap-3">
          {i > 0 ? (
            <span className="hidden text-gray-300 sm:inline" aria-hidden>
              •
            </span>
          ) : null}
          <span>{item}</span>
        </span>
      ))}
    </p>
  );
}
