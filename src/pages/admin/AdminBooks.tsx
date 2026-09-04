import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload, Image, FileText, X, ChevronRight, ArrowLeft, Globe, Eye, CheckCircle, AlertTriangle, Download } from "lucide-react";
import { downloadTableAsCsv } from "@/lib/exportCsv";
import { Progress } from "@/components/ui/progress";
import RichTextEditor from "@/components/RichTextEditor";
import BulkBookUpload from "@/components/admin/BulkBookUpload";
import UploadCsvButton from "@/components/admin/UploadCsvButton";
import SourcesPermissionsCard from "@/components/admin/SourcesPermissionsCard";
import OriginalityPanel from "@/components/admin/OriginalityPanel";
import { Send } from "lucide-react";

const slugify = (t: string) => {
  const slug = t
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, "-")
    .replace(/[^\p{L}\p{N}\-]/gu, "")
    .replace(/(^-|-$)/g, "");
  return slug || `book-${Date.now()}`;
};

/* ── SEO Score helpers ──────────────────────────────────────── */
const getBookSeoScore = (form: { title: string; slug: string; description: string; author: string; category: string; cover_url: string }) => {
  let score = 0;
  const checks: { label: string; pass: boolean; tip: string }[] = [];

  const titleLen = form.title.length;
  const titleOk = titleLen >= 5 && titleLen <= 80;
  checks.push({ label: "Title (5-80 chars)", pass: titleOk, tip: `${titleLen}/80` });
  if (titleOk) score += 20;

  const slugOk = (form.slug || slugify(form.title)).length > 2;
  checks.push({ label: "URL slug set", pass: slugOk, tip: slugOk ? "Good" : "Add slug" });
  if (slugOk) score += 15;

  const descText = form.description.replace(/<[^>]*>/g, "");
  const descOk = descText.length > 50;
  checks.push({ label: "Description (50+ chars)", pass: descOk, tip: `${descText.length} chars` });
  if (descOk) score += 25;

  const catOk = !!form.category;
  checks.push({ label: "Category set", pass: catOk, tip: catOk ? form.category : "Select category" });
  if (catOk) score += 15;

  const coverOk = !!form.cover_url;
  checks.push({ label: "Cover image", pass: coverOk, tip: coverOk ? "Uploaded" : "Add cover" });
  if (coverOk) score += 15;

  const authorOk = form.author.length > 2;
  checks.push({ label: "Author name", pass: authorOk, tip: authorOk ? form.author : "Add author" });
  if (authorOk) score += 10;

  return { score, checks };
};

const getScoreColor = (s: number) => s >= 80 ? "text-green-600" : s >= 50 ? "text-yellow-600" : "text-red-500";
const getProgressColor = (s: number) => s >= 80 ? "[&>div]:bg-green-500" : s >= 50 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500";

/* ═══════════════════════════════════════════════════════════════
   CHAPTER EDITOR
═══════════════════════════════════════════════════════════════ */
const ChapterEditor = ({ book, onBack }: { book: any; onBack: () => void }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", content: "", chapter_number: 1, is_preview: true,
    source_type: "original" as "original" | "translation" | "public_domain" | "licensed" | "quoted_excerpt",
    source_citation: "",
    permission_notes: "",
  });

  const { data: chapters } = useQuery({
    queryKey: ["admin-chapters", book.id],
    queryFn: async () => {
      const { data } = await supabase.from("book_chapters").select("id, book_id, title, slug, chapter_number, is_preview, created_at, updated_at, approval_status, originality_score, originality_report, originality_checked_at, source_type, source_citation, permission_notes").eq("book_id", book.id).order("chapter_number");
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = slugify(form.title);
      const payload = { ...form, slug, book_id: book.id };
      if (editing) {
        const { error } = await supabase.from("book_chapters").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("book_chapters").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-chapters", book.id] });
      toast({ title: editing ? "Chapter updated" : "Chapter created" });
      resetChapterForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("book_chapters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-chapters", book.id] }); toast({ title: "Chapter deleted" }); },
  });

  const resetChapterForm = () => {
    setForm({
      title: "", content: "", chapter_number: (chapters?.length ?? 0) + 1, is_preview: true,
      source_type: "original", source_citation: "", permission_notes: "",
    });
    setEditing(null);
    setView("list");
  };

  const openEdit = async (ch: any) => {
    setEditing(ch);
    setForm({
      title: ch.title, content: "", chapter_number: ch.chapter_number, is_preview: ch.is_preview,
      source_type: (ch.source_type ?? "original") as any,
      source_citation: ch.source_citation ?? "",
      permission_notes: ch.permission_notes ?? "",
    });
    setView("form");
    const { data, error } = await supabase.rpc("admin_get_chapter_full", { _chapter_id: ch.id });
    if (error) { toast({ title: "Failed to load chapter content", description: error.message, variant: "destructive" }); return; }
    const content = Array.isArray(data) ? (data[0]?.content ?? "") : (data as any)?.content ?? "";
    setForm((f) => ({ ...f, content }));
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      title: "", content: "", chapter_number: (chapters?.length ?? 0) + 1, is_preview: true,
      source_type: "original", source_citation: "", permission_notes: "",
    });
    setView("form");
  };

  if (view === "form") {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={resetChapterForm}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <p className="text-xs text-muted-foreground">{book.title}</p>
            <h2 className="font-serif text-xl font-bold">{editing ? "Edit Chapter" : "New Chapter"}</h2>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label>Chapter Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Chapter title" />
            </div>
            <div>
              <Label>Chapter Number</Label>
              <Input type="number" min={1} value={form.chapter_number} onChange={(e) => setForm({ ...form, chapter_number: Number(e.target.value) })} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="mb-1 block">Content</Label>
            <RichTextEditor
              value={form.content}
              onChange={(html) => setForm({ ...form, content: html })}
              placeholder="Write chapter content here…"
              minHeight={450}
            />
          </div>


          {/* Sources & Permissions + Originality (new) */}
          <div className="grid gap-4 md:grid-cols-2 border-t border-border pt-4">
            <SourcesPermissionsCard
              sourceType={form.source_type}
              sourceCitation={form.source_citation}
              permissionNotes={form.permission_notes}
              onChange={(patch) => setForm({ ...form, ...patch as any })}
            />
            <OriginalityPanel
              entityType="chapter"
              entityId={editing?.id ?? null}
              score={editing?.originality_score ?? null}
              report={(editing?.originality_report ?? null) as any}
              checkedAt={editing?.originality_checked_at ?? null}
              approvalStatus={editing?.approval_status ?? "draft"}
              disableRun={!editing}
              onChecked={() => qc.invalidateQueries({ queryKey: ["admin-chapters", book.id] })}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_preview} onCheckedChange={(v) => setForm({ ...form, is_preview: v })} />
              <Label>{form.is_preview ? "Free Preview" : "Paid Chapter"}</Label>
              {editing?.approval_status && editing.approval_status !== "approved" && (
                <span className="ml-3 text-xs text-amber-700">
                  · Needs admin approval before publish
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetChapterForm}>Cancel</Button>
              {editing && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const { error } = await supabase.rpc("submit_chapter_for_review" as any, { _chapter_id: editing.id } as any);
                      if (error) throw error;
                      toast({ title: "Submitted for review", description: "Running originality check…" });
                      await supabase.functions.invoke("content-originality-check", {
                        body: { entity_type: "chapter", entity_id: editing.id },
                      });
                      qc.invalidateQueries({ queryKey: ["admin-chapters", book.id] });
                    } catch (e: any) {
                      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
                    }
                  }}
                >
                  <Send className="mr-1 h-4 w-4" /> Submit for Review
                </Button>
              )}
              <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : editing ? "Update Chapter" : "Add Chapter"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Chapters</p>
          <h2 className="font-serif text-xl font-bold">{book.title}</h2>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Add Chapter</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chapters?.map((ch) => (
                <TableRow key={ch.id}>
                  <TableCell className="text-muted-foreground">{ch.chapter_number}</TableCell>
                  <TableCell className="font-medium">{ch.title}</TableCell>
                  <TableCell>{ch.is_preview ? <span className="text-primary font-medium text-sm">Free</span> : <span className="text-muted-foreground text-sm">Paid</span>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(ch)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ch.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!chapters || chapters.length === 0) && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No chapters yet. Add your first chapter!</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ADMIN BOOKS (main)
═══════════════════════════════════════════════════════════════ */
const AdminBooks = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", slug: "", author: "GyandootNova", description: "", price: 0,
    is_free: true, is_featured: false, cover_url: "", file_url: "", file_type: "",
    preview_chapters: 0, category: "", referral_commission_percent: 0,
    access_validity_days: null as number | null,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const bookRef = useRef<HTMLInputElement>(null);

  const { data: books } = useQuery({
    queryKey: ["admin-books"],
    queryFn: async () => {
      const { data } = await supabase.from("books").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bucket = folder === "covers" ? "book-covers" : "book-files";
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    if (bucket === "book-files") {
      // Private bucket: store only the object path; admin RPC fetches it later.
      return path;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const normalizeFileType = (value?: string | null): string | null => {
    const normalized = value?.split(".").pop()?.trim().toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
    return normalized || null;
  };

  const allowedFileTypes = new Set(["pdf", "doc", "docx", "text", "jpeg", "jpg", "png", "webp"]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true); setUploadProgress(10);
      let cover_url = form.cover_url;
      let file_url = form.file_url;
      let file_type = normalizeFileType(form.file_type);

      if (coverFile) {
        setUploadProgress(30);
        cover_url = await uploadFile(coverFile, "covers");
        setUploadProgress(55);
      }

      if (bookFile) {
        setUploadProgress(60);
        file_url = await uploadFile(bookFile, "books");
        file_type = normalizeFileType(bookFile.name);

        if (!file_type || !allowedFileTypes.has(file_type)) {
          throw new Error("Book file format invalid hai. Sirf PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP allowed hain.");
        }

        setUploadProgress(90);
      }

      if (file_type && !allowedFileTypes.has(file_type)) {
        file_type = null;
      }

      const finalSlug = form.slug.trim() || slugify(form.title);
      const payload = {
        title: form.title, slug: finalSlug, author: form.author, description: form.description,
        price: form.is_free ? 0 : form.price, is_free: form.is_free, is_featured: form.is_featured,
        cover_url, file_type, preview_chapters: form.preview_chapters, category: form.category,
        referral_commission_percent: form.referral_commission_percent,
        access_validity_days: form.is_free ? null : form.access_validity_days,
      };
      let bookId = editing?.id as string | undefined;
      if (editing) {
        const { error } = await supabase.from("books").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from("books").insert(payload).select("id").single();
        if (error) throw error;
        bookId = inserted?.id;
      }

      // Save the private file path through the admin-only RPC.
      if (bookId) {
        const { error: rpcError } = await supabase.rpc("admin_set_book_file_url" as any, {
          _book_id: bookId,
          _file_url: file_url ?? "",
        });
        if (rpcError) throw rpcError;
      }

      setUploadProgress(100);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-books"] });
      toast({ title: editing ? "Book updated" : "Book created" });
      setOpen(false); resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    onSettled: () => { setUploading(false); setUploadProgress(0); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-books"] }); toast({ title: "Book deleted" }); },
  });

  const resetForm = () => {
    setForm({
      title: "", slug: "", author: "GyandootNova", description: "", price: 0,
      is_free: true, is_featured: false, cover_url: "", file_url: "", file_type: "",
      preview_chapters: 0, category: "", referral_commission_percent: 0,
      access_validity_days: null,
    });
    setEditing(null); setCoverFile(null); setBookFile(null);
  };

  const openEdit = async (book: any) => {
    setEditing(book);
    let fileUrl = "";
    try {
      const { data } = await supabase.rpc("admin_get_book_file_url" as any, { _book_id: book.id });
      if (typeof data === "string") fileUrl = data;
    } catch {
      // ignore
    }
    setForm({
      title: book.title, slug: book.slug ?? "", author: book.author,
      description: book.description ?? "", price: book.price, is_free: book.is_free,
      is_featured: book.is_featured, cover_url: book.cover_url ?? "",
      file_url: fileUrl, file_type: book.file_type ?? "",
      preview_chapters: book.preview_chapters ?? 0, category: book.category ?? "",
      referral_commission_percent: (book as any).referral_commission_percent ?? 0,
      access_validity_days: (book as any).access_validity_days ?? null,
    });
    setOpen(true);
  };

  const seo = getBookSeoScore(form);
  const previewSlug = form.slug || (form.title ? slugify(form.title) : "book-url");

  /* ─── Chapter manager ──────────────────────────────────────────── */
  if (selectedBook) {
    return <ChapterEditor book={selectedBook} onBack={() => setSelectedBook(null)} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold sm:text-3xl">Books</h1>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => downloadTableAsCsv({ table: "books", filenamePrefix: "books", orderBy: { column: "created_at", ascending: false } })}>
            <Download className="mr-1 h-4 w-4" /> Download All
          </Button>
          <UploadCsvButton table="books" label="Upload CSV" onDone={() => queryClient.invalidateQueries({ queryKey: ["admin-books"] })} />
          <BulkBookUpload />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Book</Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif">{editing ? "Edit Book" : "New Book"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Book title" /></div>

              {/* Slug */}
              <div>
                <Label>URL Slug</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground shrink-0">/books/</span>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder={form.title ? slugify(form.title) : "auto-generated"}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, slug: slugify(form.title) })} disabled={!form.title}>
                    Auto
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-generate. Hindi supported.</p>
              </div>

              <div><Label>Author</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="mt-1" /></div>
              <div>
                <Label>Category</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">No Category</option>
                  <option value="devi">देवी</option>
                  <option value="devta">देवता</option>
                  <option value="adhyatm">अध्यात्म</option>
                  <option value="puran">पुराण</option>
                  <option value="katha">कथा</option>
                  <option value="other">अन्य</option>
                </select>
              </div>
              <div>
                <Label>Description</Label>
                <div className="mt-1">
                  <RichTextEditor
                    value={form.description}
                    onChange={(html) => setForm({ ...form, description: html })}
                    placeholder="Book description with headings, images, etc."
                    minHeight={200}
                  />
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <Label>Cover Image</Label>
                <div className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => coverRef.current?.click()}>
                  {coverFile ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm"><Image className="h-4 w-4 text-primary" /><span className="truncate max-w-[180px]">{coverFile.name}</span></div>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setCoverFile(null); }}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : form.cover_url ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Image className="h-4 w-4" /><span>Cover uploaded</span><span className="text-xs text-primary">(click to replace)</span></div>
                  ) : (
                    <div className="text-muted-foreground"><Upload className="mx-auto h-6 w-6 mb-1" /><p className="text-xs">Click to upload cover (JPG, PNG, WebP)</p></div>
                  )}
                </div>
                <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
              </div>

              {/* Book File */}
              <div>
                <Label>Book File (PDF / DOC / DOCX)</Label>
                <div className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => bookRef.current?.click()}>
                  {bookFile ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary" /><span className="truncate max-w-[180px]">{bookFile.name}</span><span className="text-xs text-muted-foreground">({(bookFile.size / 1024 / 1024).toFixed(1)} MB)</span></div>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setBookFile(null); }}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : form.file_url ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileText className="h-4 w-4" /><span>File uploaded ({form.file_type})</span><span className="text-xs text-primary">(click to replace)</span></div>
                  ) : (
                    <div className="text-muted-foreground"><Upload className="mx-auto h-6 w-6 mb-1" /><p className="text-xs">Click to upload PDF, DOC, or DOCX</p></div>
                  )}
                </div>
                <input ref={bookRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setBookFile(e.target.files?.[0] ?? null)} />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.is_free} onCheckedChange={(v) => setForm({ ...form, is_free: v })} /><Label>Free</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} /><Label>Featured</Label></div>
              </div>
              {!form.is_free && (
                <>
                  <div><Label>Price (₹)</Label><Input type="number" min={1} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="mt-1" /></div>
                  <div>
                    <Label>Free Preview Chapters</Label>
                    <Input type="number" min={0} value={form.preview_chapters} onChange={(e) => setForm({ ...form, preview_chapters: Number(e.target.value) })} className="mt-1" placeholder="e.g. 7" />
                    <p className="text-xs text-muted-foreground mt-1">पहले कितने chapters free demo में दिखाने हैं (0 = कोई नहीं)</p>
                  </div>
                  <div>
                    <Label>Referral Commission (%)</Label>
                    <Input type="number" min={0} max={100} value={form.referral_commission_percent} onChange={(e) => setForm({ ...form, referral_commission_percent: Number(e.target.value) })} className="mt-1" placeholder="e.g. 10" />
                    <p className="text-xs text-muted-foreground mt-1">Referrer को हर sale पर कितने % commission मिलेगा (0 = disabled)</p>
                  </div>
                  <div>
                    <Label>Access Validity (Purchase ke baad kitne din tak access)</Label>
                    <select
                      value={form.access_validity_days === null ? "lifetime" : String(form.access_validity_days)}
                      onChange={(e) => setForm({ ...form, access_validity_days: e.target.value === "lifetime" ? null : Number(e.target.value) })}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="lifetime">Lifetime (हमेशा के लिए)</option>
                      <option value="30">30 दिन</option>
                      <option value="90">90 दिन</option>
                      <option value="180">180 दिन</option>
                      <option value="365">365 दिन (1 साल)</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Buyer ko book kitne din tak read karne di jaye. Validity khatm hone par book lock ho jayegi aur repurchase ka option milega.</p>
                  </div>
                </>
              )}

              {/* SEO Score & Preview */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" /> SEO Score
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${getScoreColor(seo.score)}`}>{seo.score}%</span>
                    <Progress value={seo.score} className={`w-24 h-2 ${getProgressColor(seo.score)}`} />
                  </div>
                </div>

                {/* Google Preview */}
                <Card className="border-dashed">
                  <CardContent className="p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Google Search Preview
                    </p>
                    <p className="text-blue-600 text-base leading-tight truncate">
                      {(form.title || "Book Title").slice(0, 60)} — GyandootNova
                    </p>
                    <p className="text-green-700 text-xs truncate">
                      gyandootnova.in › books › {previewSlug}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {form.description.replace(/<[^>]*>/g, "").slice(0, 160) || "Book description will appear here..."}
                    </p>
                  </CardContent>
                </Card>

                {/* Checklist */}
                <div className="grid gap-1">
                  {seo.checks.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {c.pass ? <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                      <span className={c.pass ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                      <span className="text-muted-foreground ml-auto">{c.tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {uploading && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending || uploading}>
                {saveMutation.isPending ? "Saving..." : editing ? "Update Book" : "Create Book"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Slug</TableHead>
                <TableHead className="hidden sm:table-cell">Author</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden md:table-cell">File</TableHead>
                <TableHead className="hidden md:table-cell">Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books?.map((book) => (
                <TableRow key={book.id}>
                  <TableCell>
                    <button
                      className="font-medium hover:text-primary transition-colors flex items-center gap-1 text-left"
                      onClick={() => setSelectedBook(book)}
                    >
                      {book.title}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[120px] truncate">{book.slug}</TableCell>
                  <TableCell className="hidden sm:table-cell">{book.author}</TableCell>
                  <TableCell>{book.is_free ? "Free" : `₹${book.price}`}</TableCell>
                  <TableCell className="hidden md:table-cell">{book.file_type || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{book.is_featured ? "Yes" : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(book)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(book.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!books || books.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No books yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBooks;
