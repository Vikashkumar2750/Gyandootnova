import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, X, Image, FileText, BookOpen, FileSpreadsheet } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

interface BulkBookItem {
  id: string;
  title: string;
  author: string;
  price: number;
  is_free: boolean;
  coverFile: File | null;
  coverPreview: string;
  bookFile: File | null;
  bookFileName: string;
}

const createEmptyItem = (): BulkBookItem => ({
  id: crypto.randomUUID(),
  title: "",
  author: "GyandootNova",
  price: 0,
  is_free: true,
  coverFile: null,
  coverPreview: "",
  bookFile: null,
  bookFileName: "",
});

const SAMPLE_BOOKS: Omit<BulkBookItem, "id" | "coverFile" | "coverPreview" | "bookFile" | "bookFileName">[] = [
  { title: "आत्मविश्वास की शक्ति", author: "GyandootNova", price: 0, is_free: true },
  { title: "सफलता के 21 सूत्र", author: "GyandootNova", price: 99, is_free: false },
  { title: "Digital Marketing Guide", author: "GyandootNova", price: 149, is_free: false },
];

const SAMPLE_CSV = `title,author,price,is_free
आत्मविश्वास की शक्ति,GyandootNova,0,true
सफलता के 21 सूत्र,GyandootNova,99,false
Digital Marketing Guide,GyandootNova,149,false`;

const BulkBookUpload = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BulkBookItem[]>([createEmptyItem(), createEmptyItem(), createEmptyItem()]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [csvText, setCsvText] = useState("");
  const coverRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const bookRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const csvFileRef = useRef<HTMLInputElement>(null);

  const updateItem = (id: string, patch: Partial<BulkBookItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const addRow = () => setItems((prev) => [...prev, createEmptyItem()]);

  const handleCoverSelect = (id: string, file: File | null) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    updateItem(id, { coverFile: file, coverPreview: preview });
  };

  const handleBookFileSelect = (id: string, file: File | null) => {
    if (!file) return;
    updateItem(id, { bookFile: file, bookFileName: file.name });
  };

  const loadSample = () => {
    setItems(
      SAMPLE_BOOKS.map((s) => ({
        ...s,
        id: crypto.randomUUID(),
        coverFile: null,
        coverPreview: "",
        bookFile: null,
        bookFileName: "",
      }))
    );
  };

  /* ─── CSV parsing ────────────────────────────────────── */
  const parseCSV = (text: string): BulkBookItem[] => {
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
      return {
        id: crypto.randomUUID(),
        title: row.title || "",
        author: row.author || "GyandootNova",
        price: Number(row.price) || 0,
        is_free: row.is_free === "true" || row.is_free === "1" || row.price === "0",
        coverFile: null,
        coverPreview: "",
        bookFile: null,
        bookFileName: "",
      };
    });
  };

  const importCSVText = () => {
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) {
      toast({ title: "Invalid CSV", description: "कम से कम header + 1 row होनी चाहिए", variant: "destructive" });
      return;
    }
    setItems(parsed);
    toast({ title: `${parsed.length} books loaded from CSV ✅` });
  };

  const handleCSVFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setItems(parsed);
        toast({ title: `${parsed.length} books loaded from file ✅` });
      }
    };
    reader.readAsText(file);
  };

  /* ─── Upload helpers ─────────────────────────────────── */
  const uploadToStorage = async (file: File, bucket: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const normalizeFileType = (value?: string | null): string | null => {
    const normalized = value?.split(".").pop()?.trim().toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
    return normalized || null;
  };

  const allowedFileTypes = new Set(["pdf", "doc", "docx", "text", "jpeg", "jpg", "png", "webp"]);

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const valid = items.filter((it) => it.title.trim());
      if (valid.length === 0) throw new Error("कम से कम एक book का title डालें");

      setUploading(true);
      setProgress(0);
      const total = valid.length;
      let done = 0;

      for (const item of valid) {
        let cover_url: string | null = null;
        let file_url: string | null = null;
        let file_type: string | null = null;

        if (item.coverFile) {
          cover_url = await uploadToStorage(item.coverFile, "book-covers");
        }
        if (item.bookFile) {
          file_url = await uploadToStorage(item.bookFile, "book-files");
          file_type = normalizeFileType(item.bookFile.name);

          if (!file_type || !allowedFileTypes.has(file_type)) {
            throw new Error(`'${item.title}' ka file format invalid hai. Sirf PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP allowed hain.`);
          }
        }

        const slug = slugify(item.title);
        const { data: inserted, error } = await supabase.from("books").insert({
          title: item.title,
          author: item.author,
          slug,
          price: item.is_free ? 0 : item.price,
          is_free: item.is_free,
          cover_url,
          file_type,
        }).select("id").single();
        if (error) throw error;

        if (file_url && inserted?.id) {
          const { error: fileErr } = await supabase.rpc("admin_set_book_file_url", {
            _book_id: inserted.id,
            _file_url: file_url,
          });
          if (fileErr) throw fileErr;
        }


        done++;
        setProgress(Math.round((done / total) * 100));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-books"] });
      const count = items.filter((it) => it.title.trim()).length;
      toast({ title: `${count} books successfully created! ✅` });
      setOpen(false);
      setItems([createEmptyItem(), createEmptyItem(), createEmptyItem()]);
      setCsvText("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    onSettled: () => { setUploading(false); setProgress(0); },
  });

  const validCount = items.filter((it) => it.title.trim()).length;

  const resetAll = () => {
    setItems([createEmptyItem(), createEmptyItem(), createEmptyItem()]);
    setCsvText("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Upload className="mr-1 h-4 w-4" /> Bulk Upload</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Bulk Book Upload
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" className="mt-1">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-1"><FileSpreadsheet className="h-3.5 w-3.5" /> CSV Import</TabsTrigger>
          </TabsList>

          {/* ─── CSV Tab ──────────────────────────────── */}
          <TabsContent value="csv" className="space-y-3 mt-3">
            <div>
              <p className="text-sm text-muted-foreground mb-2">CSV file upload करें या paste करें (format: title, author, price, is_free)</p>
              <div className="flex gap-2 mb-2">
                <Button size="sm" variant="outline" onClick={() => csvFileRef.current?.click()}>
                  <Upload className="mr-1 h-3.5 w-3.5" /> Upload CSV
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCsvText(SAMPLE_CSV)} className="text-xs">
                  Load Sample CSV
                </Button>
                <input ref={csvFileRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => handleCSVFile(e.target.files?.[0] ?? null)} />
              </div>
              <Textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={SAMPLE_CSV}
                rows={6}
                className="font-mono text-xs"
              />
              <Button size="sm" className="mt-2" onClick={importCSVText} disabled={!csvText.trim()}>
                Parse & Load Books
              </Button>
            </div>
            {items.some((it) => it.title.trim()) && (
              <p className="text-sm text-primary font-medium">✅ {validCount} books loaded — scroll down to review & attach files</p>
            )}
          </TabsContent>

          {/* ─── Manual Tab ───────────────────────────── */}
          <TabsContent value="manual" className="mt-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">एक साथ multiple books add करें</p>
              <Button size="sm" variant="ghost" onClick={loadSample} className="text-xs">
                Load Sample Data
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── Book items (shared) ────────────────────── */}
        <div className="space-y-3">
          {items.map((item, idx) => (
            <Card key={item.id} className="relative">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {/* Cover thumbnail */}
                  <div
                    className="w-14 h-[4.5rem] rounded border-2 border-dashed border-border flex-shrink-0 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                    onClick={() => coverRefs.current[item.id]?.click()}
                    title="Upload cover image"
                  >
                    {item.coverPreview ? (
                      <img src={item.coverPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="h-4 w-4 text-muted-foreground" />
                    )}
                    <input
                      ref={(el) => { coverRefs.current[item.id] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCoverSelect(item.id, e.target.files?.[0] ?? null)}
                    />
                  </div>

                  {/* Fields */}
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder={`Book ${idx + 1} title *`}
                          value={item.title}
                          onChange={(e) => updateItem(item.id, { title: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Input
                        placeholder="Author"
                        value={item.author}
                        onChange={(e) => updateItem(item.id, { author: e.target.value })}
                        className="h-8 text-sm w-28"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={item.is_free}
                          onCheckedChange={(v) => updateItem(item.id, { is_free: v, price: v ? 0 : item.price })}
                          className="scale-75"
                        />
                        <span className="text-xs text-muted-foreground">{item.is_free ? "Free" : "Paid"}</span>
                      </div>
                      {!item.is_free && (
                        <Input
                          type="number"
                          min={1}
                          placeholder="₹ Price"
                          value={item.price || ""}
                          onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })}
                          className="h-7 text-xs w-20"
                        />
                      )}
                      {/* Book file button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => bookRefs.current[item.id]?.click()}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {item.bookFileName ? item.bookFileName.slice(0, 15) + (item.bookFileName.length > 15 ? "…" : "") : "PDF/DOC"}
                      </Button>
                      <input
                        ref={(el) => { bookRefs.current[item.id] = el; }}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => handleBookFileSelect(item.id, e.target.files?.[0] ?? null)}
                      />
                      {item.bookFile && (
                        <span className="text-[10px] text-muted-foreground">({(item.bookFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                      )}
                    </div>
                  </div>

                  {/* Remove */}
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 mt-0.5"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addRow} className="w-full mt-2">
          <Plus className="mr-1 h-4 w-4" /> Add Another Book
        </Button>

        {uploading && (
          <div className="space-y-1 mt-2">
            <p className="text-xs text-muted-foreground">Uploading... {progress}%</p>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <Button
          className="w-full mt-3"
          onClick={() => bulkMutation.mutate()}
          disabled={validCount === 0 || bulkMutation.isPending || uploading}
        >
          {uploading ? "Uploading..." : `Upload ${validCount} Book${validCount !== 1 ? "s" : ""}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default BulkBookUpload;
