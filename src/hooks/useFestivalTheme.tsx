import { useEffect } from "react";

/** Auto-apply a subtle festival theme (background hue + accent glow) based on today's date. */
const FESTIVAL_WINDOWS: { name: string; from: string; to: string; className: string }[] = [
  // Format: MM-DD; if today's MM-DD is between from..to, apply
  { name: "Diwali",           from: "10-25", to: "11-15", className: "theme-diwali" },
  { name: "Holi",             from: "03-01", to: "03-10", className: "theme-holi" },
  { name: "Navratri/Dussehra",from: "10-01", to: "10-24", className: "theme-navratri" },
  { name: "Janmashtami",      from: "08-20", to: "08-30", className: "theme-janmashtami" },
  { name: "Makar Sankranti",  from: "01-13", to: "01-16", className: "theme-sankranti" },
  { name: "Shivratri",        from: "02-12", to: "02-18", className: "theme-shivratri" },
];

const currentFestival = () => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const md = `${mm}-${dd}`;
  return FESTIVAL_WINDOWS.find((f) => md >= f.from && md <= f.to) ?? null;
};

export const useFestivalTheme = () => {
  useEffect(() => {
    const f = currentFestival();
    const cls = f?.className;
    if (cls) document.documentElement.classList.add(cls);
    return () => { if (cls) document.documentElement.classList.remove(cls); };
  }, []);
};

export const FestivalBanner = () => {
  const f = currentFestival();
  if (!f) return null;
  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-cream p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-lg">✦</div>
      <div>
        <div className="text-sm font-medium">{f.name} ki hardik shubhkamnayein</div>
        <div className="text-xs text-muted-foreground">Aaj ki path-yatra vishesh hai — theme adjust ho gayi hai.</div>
      </div>
    </div>
  );
};

export default useFestivalTheme;
