import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users, Download, QrCode, Sparkles, Headphones, Play, Pause, Square,
  Wifi, WifiOff, BarChart3, Lock,
} from "lucide-react";

type PurchasedBook = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  category: string | null;
};

function usePurchasedBooks() {
  const { user } = useAuth();
  const [books, setBooks] = useState<PurchasedBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data: purchases } = await supabase
        .from("purchases")
        .select("book_id")
        .eq("user_id", user.id)
        .eq("status", "completed");
      const ids = (purchases ?? []).map((p) => p.book_id);
      if (!ids.length) { setBooks([]); setLoading(false); return; }
      const { data } = await supabase
        .from("books")
        .select("id,title,slug,cover_url,category")
        .in("id", ids);
      setBooks((data ?? []) as PurchasedBook[]);
      setLoading(false);
    })();
  }, [user]);

  return { books, loading };
}

// ========= 1. Family Library =========
export function FamilyLibrary() {
  const { user } = useAuth();
  const storageKey = `family_members_${user?.id ?? "guest"}`;
  const [members, setMembers] = useState<{ name: string; email: string }[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setMembers(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  const save = (next: typeof members) => {
    setMembers(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const add = () => {
    if (!name.trim() || !email.trim()) return toast.error("Name and email required");
    save([...members, { name: name.trim(), email: email.trim() }]);
    setName(""); setEmail("");
    toast.success("Family member added");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif">Family Library</h1>
        <p className="text-muted-foreground">Share your spiritual library with up to 5 family members.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Add Family Member</CardTitle>
          <CardDescription>They will receive access to your purchased books when this feature launches.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={add} disabled={members.length >= 5}>
            {members.length >= 5 ? "Limit reached (5)" : "Add member"}
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {members.map((m, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-sm text-muted-foreground">{m.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => save(members.filter((_, j) => j !== i))}>
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground">No family members yet.</p>
        )}
      </div>
    </div>
  );
}

// ========= 2. Audio Book Player (Browser TTS) =========
export function AudioBookPlayer() {
  const { books, loading } = usePurchasedBooks();
  const [selected, setSelected] = useState<string>("");
  const [text, setText] = useState("");
  const [playing, setPlaying] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const { data: chapters } = await supabase
        .from("book_chapters")
        .select("id,title,chapter_number")
        .eq("book_id", selected)
        .order("chapter_number")
        .limit(1);
      const first = chapters?.[0];
      if (!first) { setText(""); return; }
      const { data } = await supabase.rpc("get_chapter_content", { _chapter_id: first.id });
      const html = (data?.[0] as any)?.content ?? "";
      const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      setText(plain.slice(0, 8000));
    })();
  }, [selected]);

  const play = () => {
    if (!text) return toast.error("Select a book first");
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "hi-IN";
    u.rate = 0.95;
    u.onend = () => setPlaying(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setPlaying(true);
  };
  const pause = () => { window.speechSynthesis.pause(); setPlaying(false); };
  const stop = () => { window.speechSynthesis.cancel(); setPlaying(false); };

  useEffect(() => () => window.speechSynthesis.cancel(), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif">Audio Book Player</h1>
        <p className="text-muted-foreground">Listen to your books read aloud in Hindi.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Headphones className="h-5 w-5" /> Choose a book</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p>Loading…</p> : (
            <div className="grid gap-2 sm:grid-cols-2">
              {books.map((b) => (
                <Button
                  key={b.id}
                  variant={selected === b.id ? "default" : "outline"}
                  className="justify-start h-auto py-2"
                  onClick={() => setSelected(b.id)}
                >
                  {b.title}
                </Button>
              ))}
              {books.length === 0 && <p className="text-sm text-muted-foreground">Purchase a book to unlock audio.</p>}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={play} disabled={!text || playing}><Play className="h-4 w-4 mr-2" /> Play</Button>
            <Button onClick={pause} disabled={!playing} variant="outline"><Pause className="h-4 w-4 mr-2" /> Pause</Button>
            <Button onClick={stop} variant="outline"><Square className="h-4 w-4 mr-2" /> Stop</Button>
          </div>
          <p className="text-xs text-muted-foreground">Uses your browser's text-to-speech. Best on Chrome/Edge.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ========= 3. Offline Reading =========
export function OfflineReading() {
  const { books, loading } = usePurchasedBooks();
  const [cached, setCached] = useState<Record<string, boolean>>({});
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const map: Record<string, boolean> = {};
    books.forEach((b) => { map[b.id] = !!localStorage.getItem(`offline_book_${b.id}`); });
    setCached(map);
  }, [books]);

  const download = async (b: PurchasedBook) => {
    try {
      toast.loading(`Downloading ${b.title}…`, { id: b.id });
      const { data: chapters } = await supabase
        .from("book_chapters")
        .select("id,title,chapter_number")
        .eq("book_id", b.id)
        .order("chapter_number");
      const full: any[] = [];
      for (const ch of chapters ?? []) {
        const { data } = await supabase.rpc("get_chapter_content", { _chapter_id: ch.id });
        full.push({ ...ch, content: (data?.[0] as any)?.content ?? "" });
      }
      localStorage.setItem(`offline_book_${b.id}`, JSON.stringify({ book: b, chapters: full, savedAt: Date.now() }));
      setCached((c) => ({ ...c, [b.id]: true }));
      toast.success(`${b.title} available offline`, { id: b.id });
    } catch (e: any) {
      toast.error(e.message || "Download failed", { id: b.id });
    }
  };

  const remove = (b: PurchasedBook) => {
    localStorage.removeItem(`offline_book_${b.id}`);
    setCached((c) => ({ ...c, [b.id]: false }));
    toast.success("Removed from offline");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Offline Reading</h1>
          <p className="text-muted-foreground">Save books to read without internet.</p>
        </div>
        <Badge variant={online ? "default" : "destructive"} className="gap-1">
          {online ? <><Wifi className="h-3 w-3" /> Online</> : <><WifiOff className="h-3 w-3" /> Offline</>}
        </Badge>
      </div>
      {loading ? <p>Loading…</p> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {books.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{cached[b.id] ? "Saved" : "Not saved"}</p>
                </div>
                {cached[b.id] ? (
                  <Button size="sm" variant="outline" onClick={() => remove(b)}>Remove</Button>
                ) : (
                  <Button size="sm" onClick={() => download(b)}><Download className="h-4 w-4 mr-1" /> Save</Button>
                )}
              </CardContent>
            </Card>
          ))}
          {books.length === 0 && <p className="text-sm text-muted-foreground">No purchased books yet.</p>}
        </div>
      )}
    </div>
  );
}

// ========= 4. QR Codes for Purchased Books =========
export function BookQRCodes() {
  const { books, loading } = usePurchasedBooks();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif">Book QR Codes</h1>
        <p className="text-muted-foreground">Scan on any device to jump straight into your book.</p>
      </div>
      {loading ? <p>Loading…</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => {
            const url = `${window.location.origin}/books/${b.slug}`;
            return (
              <Card key={b.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><QrCode className="h-4 w-4" /> {b.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3">
                  <div className="bg-white p-3 rounded-md">
                    <QRCodeCanvas value={url} size={160} />
                  </div>
                  <Link to={`/books/${b.slug}`} className="text-xs text-primary underline">
                    Open book
                  </Link>
                </CardContent>
              </Card>
            );
          })}
          {books.length === 0 && <p className="text-sm text-muted-foreground">No purchased books yet.</p>}
        </div>
      )}
    </div>
  );
}

// ========= 5. Reading Insights =========
export function ReadingInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<{ topic: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data: purchases } = await supabase
        .from("purchases")
        .select("book_id")
        .eq("user_id", user.id)
        .eq("status", "completed");
      const ids = (purchases ?? []).map((p) => p.book_id);
      if (!ids.length) { setLoading(false); return; }
      const { data: books } = await supabase
        .from("books")
        .select("category")
        .in("id", ids);
      const counts: Record<string, number> = {};
      (books ?? []).forEach((b: any) => {
        const t = b.category || "Uncategorized";
        counts[t] = (counts[t] ?? 0) + 1;
      });
      setInsights(Object.entries(counts).map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count));
      setLoading(false);
    })();
  }, [user]);

  const max = useMemo(() => Math.max(1, ...insights.map((i) => i.count)), [insights]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif">Reading Insights</h1>
        <p className="text-muted-foreground">Discover the spiritual topics you gravitate toward.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Most-read topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading…</p> : insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">Start reading to see insights.</p>
          ) : insights.map((i) => (
            <div key={i.topic}>
              <div className="flex justify-between text-sm mb-1">
                <span>{i.topic}</span>
                <span className="text-muted-foreground">{i.count}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(i.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ========= 6. Exclusive Member Content =========
export function ExclusiveContent() {
  const { books } = usePurchasedBooks();
  const isMember = books.length > 0;

  const perks = [
    { title: "Monthly Satsang Recording", desc: "Exclusive audio discourse for members." },
    { title: "Ancient Text Study Notes", desc: "Curated commentary on select Upanishads." },
    { title: "Guided Meditation Series", desc: "10 progressive sessions for daily practice." },
    { title: "Early Access to New Books", desc: "Read new releases 7 days before launch." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif">Exclusive Member Content</h1>
        <p className="text-muted-foreground">Deeper teachings reserved for our reading community.</p>
      </div>
      {!isMember && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-6 flex items-center gap-4">
            <Lock className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <p className="font-medium">Become a member</p>
              <p className="text-sm text-muted-foreground">Purchase any book to unlock exclusive content.</p>
            </div>
            <Button asChild><Link to="/books">Browse books</Link></Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {perks.map((p) => (
          <Card key={p.title} className={!isMember ? "opacity-60" : ""}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> {p.title}
              </CardTitle>
              <CardDescription>{p.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" disabled={!isMember} variant={isMember ? "default" : "outline"}>
                {isMember ? "Access" : "Locked"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
