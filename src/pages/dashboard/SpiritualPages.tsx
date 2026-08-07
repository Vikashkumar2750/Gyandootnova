import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Play, Pause, RotateCcw, Sparkles } from "lucide-react";

const QUOTES: { hi: string; en: string; source: string }[] = [
  { hi: "योगः कर्मसु कौशलम्।", en: "Yoga is skill in action.", source: "Bhagavad Gita 2.50" },
  { hi: "सत्यमेव जयते।", en: "Truth alone triumphs.", source: "Mundaka Upanishad" },
  { hi: "अहिंसा परमो धर्मः।", en: "Non-violence is the highest dharma.", source: "Mahabharata" },
  { hi: "वसुधैव कुटुम्बकम्।", en: "The world is one family.", source: "Maha Upanishad" },
  { hi: "तत्त्वमसि।", en: "That thou art.", source: "Chandogya Upanishad" },
  { hi: "आत्मानं विद्धि।", en: "Know thyself.", source: "Upanishads" },
  { hi: "मन एव मनुष्याणां कारणं बन्धमोक्षयोः।", en: "The mind alone is the cause of bondage and liberation.", source: "Amritabindu Upanishad" },
];

const MANTRAS = [
  { hi: "ॐ नमः शिवाय", en: "Om Namah Shivaya" },
  { hi: "ॐ नमो भगवते वासुदेवाय", en: "Om Namo Bhagavate Vasudevaya" },
  { hi: "ॐ गं गणपतये नमः", en: "Om Gam Ganapataye Namah" },
  { hi: "गायत्री मंत्र", en: "Om Bhur Bhuvah Svaha..." },
];

const FESTIVALS_2026 = [
  { date: "2026-01-14", name: "Makar Sankranti" },
  { date: "2026-02-15", name: "Maha Shivratri" },
  { date: "2026-03-03", name: "Holi" },
  { date: "2026-04-19", name: "Ram Navami" },
  { date: "2026-08-15", name: "Krishna Janmashtami" },
  { date: "2026-09-11", name: "Ganesh Chaturthi" },
  { date: "2026-10-19", name: "Dussehra" },
  { date: "2026-11-08", name: "Diwali" },
];

const dayIndex = () => {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = new Date().getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const SpiritualHome = () => {
  const q = QUOTES[dayIndex() % QUOTES.length];
  const m = MANTRAS[dayIndex() % MANTRAS.length];
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl md:text-3xl">Daily Spiritual</h1>
      <Card className="surface-card bg-gradient-cream">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary"/> Aaj ka vichaar</CardTitle></CardHeader>
        <CardContent>
          <p className="font-serif text-2xl text-foreground">{q.hi}</p>
          <p className="mt-2 text-sm italic text-muted-foreground">"{q.en}"</p>
          <p className="mt-2 text-[11px] uppercase tracking-widest text-primary">— {q.source}</p>
        </CardContent>
      </Card>
      <Card className="surface-card">
        <CardHeader><CardTitle className="text-base">Aaj ka mantra</CardTitle></CardHeader>
        <CardContent>
          <p className="font-serif text-xl">{m.hi}</p>
          <p className="text-sm text-muted-foreground mt-1">{m.en}</p>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="surface-card">
          <CardHeader><CardTitle className="text-base">Aaj ki tithi (approx.)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("hi-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            <p className="mt-2 text-xs text-muted-foreground">Vistrit panchang jald hi aayega.</p>
          </CardContent>
        </Card>
        <Card className="surface-card">
          <CardHeader><CardTitle className="text-base">Prayer reminder</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Din mein 3 baar 2 minute ke liye antarmukhi banein — subah, dopahar, sandhya.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const MeditationTimer = () => {
  const [duration, setDuration] = useState(10 * 60);
  const [remaining, setRemaining] = useState(10 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setRemaining((r) => {
      if (r <= 1) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.frequency.value = 528; o.type = "sine"; o.connect(g); g.connect(ctx.destination);
          g.gain.setValueAtTime(0.001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
          o.start(); o.stop(ctx.currentTime + 3);
        } catch {}
        setRunning(false);
        return 0;
      }
      return r - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [running]);

  const mm = String(Math.floor(remaining/60)).padStart(2,"0");
  const ss = String(remaining%60).padStart(2,"0");
  const pct = duration > 0 ? ((duration - remaining) / duration) * 100 : 0;

  const setPreset = (mins: number) => { setDuration(mins*60); setRemaining(mins*60); setRunning(false); };

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Meditation Timer</h1>
      <Card className="surface-card">
        <CardContent className="p-8 text-center">
          <Compass className="mx-auto h-8 w-8 text-primary"/>
          <div className="mt-4 font-serif text-6xl tabular-nums">{mm}:{ss}</div>
          <div className="mt-4 h-1.5 rounded-full bg-primary/10 max-w-sm mx-auto"><div className="h-full rounded-full bg-primary transition-all" style={{width:`${pct}%`}}/></div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button onClick={() => setRunning((r) => !r)} size="lg">
              {running ? <><Pause className="mr-2 h-4 w-4"/>Pause</> : <><Play className="mr-2 h-4 w-4"/>Shuru karein</>}
            </Button>
            <Button variant="outline" size="lg" onClick={() => { setRemaining(duration); setRunning(false); }}>
              <RotateCcw className="mr-2 h-4 w-4"/>Reset
            </Button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
            {[5,10,15,20,30].map((m) => (
              <Button key={m} size="sm" variant="ghost" onClick={() => setPreset(m)}>{m} min</Button>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Aankhein band karein, saans par dhyaan dein, aur ghanti tak baithe rahein.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const FestivalCalendar = () => {
  const upcoming = FESTIVALS_2026.filter((f) => new Date(f.date) >= new Date(new Date().toDateString()));
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl md:text-3xl">Festival Calendar</h1>
      <Card className="surface-card">
        <CardContent className="p-0 divide-y divide-border/60">
          {upcoming.map((f) => (
            <div key={f.name} className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm font-medium">{f.name}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(f.date).toLocaleDateString("hi-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
              </div>
              <div className="text-xs text-primary">{Math.max(0, Math.round((new Date(f.date).getTime() - Date.now()) / (1000*60*60*24)))} din</div>
            </div>
          ))}
          {upcoming.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Is saal ke sabhi tyohar samapt.</div>}
        </CardContent>
      </Card>
    </div>
  );
};
