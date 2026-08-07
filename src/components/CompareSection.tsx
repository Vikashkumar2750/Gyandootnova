import { Check, X } from "lucide-react";

const rows = [
  { feature: "Buy once, read forever", us: true, print: false, pdf: false },
  { feature: "Read on mobile / tablet / laptop", us: true, print: false, pdf: true },
  { feature: "Dark mode + adjustable font size", us: true, print: false, pdf: false },
  { feature: "No risk of torn or lost pages", us: true, print: false, pdf: true },
  { feature: "Bookmarks + reading progress", us: true, print: false, pdf: false },
  { feature: "Free author updates", us: true, print: false, pdf: false },
  { feature: "Can't be pirated or forwarded", us: true, print: false, pdf: false },
  { feature: "No shipping delays", us: true, print: false, pdf: true },
];

const Cell = ({ ok }: { ok: boolean }) =>
  ok ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600/15 text-green-700">
      <Check className="h-3.5 w-3.5" />
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-destructive">
      <X className="h-3.5 w-3.5" />
    </span>
  );

export default function CompareSection() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container max-w-4xl">
        <div className="text-center mb-8">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            See the difference
          </span>
          <h2 className="mt-3 font-serif text-2xl md:text-3xl font-bold">
            Printed book, ordinary PDF, or <span className="text-primary">GyandootNova?</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            One quick look — see which option is the smartest.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left p-3 md:p-4 font-semibold">Feature</th>
                <th className="p-3 md:p-4 font-serif font-bold text-primary text-center whitespace-nowrap">
                  GyandootNova
                </th>
                <th className="p-3 md:p-4 font-semibold text-muted-foreground text-center whitespace-nowrap">
                  Printed Book
                </th>
                <th className="p-3 md:p-4 font-semibold text-muted-foreground text-center whitespace-nowrap">
                  PDF
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature} className="border-b border-border last:border-0">
                  <td className="p-3 md:p-4 font-medium text-foreground/90">{r.feature}</td>
                  <td className="p-3 md:p-4 text-center bg-primary/[0.04]">
                    <Cell ok={r.us} />
                  </td>
                  <td className="p-3 md:p-4 text-center">
                    <Cell ok={r.print} />
                  </td>
                  <td className="p-3 md:p-4 text-center">
                    <Cell ok={r.pdf} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
