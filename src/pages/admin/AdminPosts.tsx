import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowLeft, Eye, Globe, CheckCircle, AlertTriangle, Upload, X, Loader2, Download, ScrollText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { downloadTableAsCsv } from "@/lib/exportCsv";
import RichTextEditor from "@/components/RichTextEditor";
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
  return slug || `post-${Date.now()}`;
};

const emptyForm = {
  title: "", slug: "", content: "", excerpt: "", post_type: "article" as string,
  is_published: false, meta_title: "", meta_description: "", cover_url: "",
  publish_status: "draft" as "draft" | "scheduled" | "published",
  scheduled_at: "" as string, // datetime-local value
  timezone: "Asia/Kolkata",
  category: "", primary_keyword: "",
  secondary_keywords: "" as string, // comma-separated in the form
  tags: "" as string,
  author: "",
  featured_image_title: "", featured_image_alt: "", featured_image_caption: "",
  social_caption: "", social_excerpt: "",
  canonical_url: "",
  schema_type: "BlogPosting",
  // Originality workflow
  source_type: "original" as "original" | "translation" | "public_domain" | "licensed" | "quoted_excerpt",
  source_citation: "",
  permission_notes: "",
};


/* ── SEO Score helpers ──────────────────────────────────────── */
const getSeoScore = (form: typeof emptyForm) => {
  let score = 0;
  const checks: { label: string; pass: boolean; tip: string }[] = [];

  const metaTitle = form.meta_title || form.title;
  const metaDesc = form.meta_description || form.excerpt;

  // Title length
  const titleLen = metaTitle.length;
  const titleOk = titleLen >= 15 && titleLen <= 60;
  checks.push({ label: "Title length (15-60 chars)", pass: titleOk, tip: `${titleLen}/60 characters` });
  if (titleOk) score += 20;

  // Meta description length
  const descLen = metaDesc.length;
  const descOk = descLen >= 50 && descLen <= 160;
  checks.push({ label: "Description (50-160 chars)", pass: descOk, tip: `${descLen}/160 characters` });
  if (descOk) score += 20;

  // Slug
  const slugOk = (form.slug || slugify(form.title)).length > 3;
  checks.push({ label: "URL slug is set", pass: slugOk, tip: slugOk ? "Good slug" : "Add a meaningful slug" });
  if (slugOk) score += 15;

  // Excerpt
  const excerptOk = form.excerpt.length > 20;
  checks.push({ label: "Excerpt provided", pass: excerptOk, tip: excerptOk ? "Good excerpt" : "Add a summary for listings" });
  if (excerptOk) score += 15;

  // Content length
  const contentText = form.content.replace(/<[^>]*>/g, "");
  const contentOk = contentText.length > 300;
  checks.push({ label: "Content (300+ chars)", pass: contentOk, tip: `${contentText.length} characters` });
  if (contentOk) score += 15;

  // Has cover image
  const hasImage = !!form.cover_url || form.content.includes("<img");
  checks.push({ label: "Has cover image", pass: hasImage, tip: hasImage ? "Image set" : "Add a cover image" });
  if (hasImage) score += 15;

  return { score, checks };
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-500";
};

const getProgressColor = (score: number) => {
  if (score >= 80) return "[&>div]:bg-green-500";
  if (score >= 50) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-red-500";
};

const AdminPosts = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);

  const { data: posts } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const parseList = (s: string): string[] =>
    s.split(",").map((t) => t.trim()).filter(Boolean);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const finalSlug = form.slug.trim() || slugify(form.title);
      const scheduledIso = form.publish_status === "scheduled" && form.scheduled_at
        ? new Date(form.scheduled_at).toISOString()
        : null;
      const payload: any = {
        title: form.title,
        slug: finalSlug,
        content: form.content,
        excerpt: form.excerpt,
        post_type: form.post_type,
        meta_title: form.meta_title,
        meta_description: form.meta_description,
        cover_url: form.cover_url || null,
        manually_edited: true,
        publish_status: form.publish_status,
        scheduled_at: scheduledIso,
        timezone: form.timezone || "Asia/Kolkata",
        category: form.category || null,
        primary_keyword: form.primary_keyword || null,
        secondary_keywords: parseList(form.secondary_keywords),
        tags: parseList(form.tags),
        author: form.author || null,
        featured_image_title: form.featured_image_title || null,
        featured_image_alt: form.featured_image_alt || null,
        featured_image_caption: form.featured_image_caption || null,
        social_caption: form.social_caption || null,
        social_excerpt: form.social_excerpt || null,
        canonical_url: form.canonical_url || null,
        schema_type: form.schema_type || "BlogPosting",
        source_type: form.source_type,
        source_citation: form.source_citation || null,
        permission_notes: form.permission_notes || null,
      };
      if (editing) {
        const { error } = await supabase.from("posts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      toast({ title: editing ? "Post updated" : "Post created" });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-posts"] }); toast({ title: "Post deleted" }); },
  });

  const resetForm = () => { setForm({ ...emptyForm }); setEditing(null); setView("list"); };

  const toDatetimeLocal = (iso: string | null): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      title: p.title, slug: p.slug ?? "", content: p.content ?? "", excerpt: p.excerpt ?? "",
      post_type: p.post_type, is_published: !!p.is_published,
      meta_title: p.meta_title ?? "", meta_description: p.meta_description ?? "",
      cover_url: p.cover_url ?? "",
      publish_status: (p.publish_status ?? (p.is_published ? "published" : "draft")) as any,
      scheduled_at: toDatetimeLocal(p.scheduled_at ?? null),
      timezone: p.timezone ?? "Asia/Kolkata",
      category: p.category ?? "",
      primary_keyword: p.primary_keyword ?? "",
      secondary_keywords: Array.isArray(p.secondary_keywords) ? p.secondary_keywords.join(", ") : "",
      tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
      author: p.author ?? "",
      featured_image_title: p.featured_image_title ?? "",
      featured_image_alt: p.featured_image_alt ?? "",
      featured_image_caption: p.featured_image_caption ?? "",
      social_caption: p.social_caption ?? "",
      social_excerpt: p.social_excerpt ?? "",
      canonical_url: p.canonical_url ?? "",
      schema_type: p.schema_type ?? "BlogPosting",
      source_type: (p.source_type ?? "original") as any,
      source_citation: p.source_citation ?? "",
      permission_notes: p.permission_notes ?? "",
    });
    setView("form");
  };


  const seo = getSeoScore(form);
  const previewTitle = form.meta_title || form.title || "Post Title";
  const previewDesc = form.meta_description || form.excerpt || "Post description will appear here...";
  const previewSlug = form.slug || (form.title ? slugify(form.title) : "post-url");

  /* ─── Form view ────────────────────────────────────────────────── */
  if (view === "form") {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={resetForm}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="font-serif text-2xl font-bold">{editing ? "Edit Post" : "New Post"}</h1>
        </div>

        <div className="space-y-5">
          {/* Title & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Post title" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.post_type} onValueChange={(v) => setForm({ ...form, post_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="program">Program</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Slug */}
          <div>
            <Label>URL Slug</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground shrink-0">/articles/</span>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder={form.title ? slugify(form.title) : "auto-generated-from-title"}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setForm({ ...form, slug: slugify(form.title) })}
                disabled={!form.title}
              >
                Auto
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-generate from title. Supports Hindi/Unicode.</p>
          </div>

          {/* Excerpt */}
          <div>
            <Label>Excerpt <span className="text-muted-foreground text-xs">(short summary shown in listing)</span></Label>
            <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="mt-1" rows={2} placeholder="Brief description…" />
          </div>

          {/* Cover Image */}
          <div>
            <Label>Cover Image</Label>
            {form.cover_url ? (
              <div className="mt-1 relative inline-block">
                <img src={form.cover_url} alt="Cover" className="h-40 w-auto rounded-lg border border-border object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={() => setForm({ ...form, cover_url: "" })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted text-sm">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span>{uploading ? "Uploading…" : "Upload image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setUploading(true);
                        const ext = file.name.split(".").pop() || "jpg";
                        const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
                        const { error } = await supabase.storage.from("post-images").upload(path, file, { cacheControl: "3600", upsert: false });
                        if (error) throw error;
                        const { data } = supabase.storage.from("post-images").getPublicUrl(path);
                        setForm((f) => ({ ...f, cover_url: data.publicUrl }));
                        toast({ title: "Image uploaded" });
                      } catch (err: any) {
                        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                      } finally {
                        setUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
                <Input
                  value={form.cover_url}
                  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                  placeholder="…or paste image URL"
                  className="flex-1"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Shown at the top of the article and in listing cards.</p>
          </div>


          {/* Rich Content Editor */}
          <div>
            <Label className="mb-1 block">Content</Label>
            <RichTextEditor
              value={form.content}
              onChange={(html) => setForm({ ...form, content: html })}
              placeholder="Write your article content here…"
              minHeight={400}
            />
          </div>

          {/* SEO Section */}
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" /> SEO Settings
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${getScoreColor(seo.score)}`}>{seo.score}%</span>
                <Progress value={seo.score} className={`w-24 h-2 ${getProgressColor(seo.score)}`} />
              </div>
            </div>

            {/* Google Preview */}
            <Card className="border-dashed">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Google Search Preview
                </p>
                <div className="space-y-0.5">
                  <p className="text-blue-600 text-lg leading-tight hover:underline cursor-default truncate">
                    {previewTitle.slice(0, 60)}{previewTitle.length > 60 ? "..." : ""}
                  </p>
                  <p className="text-green-700 text-sm truncate">
                    gyandootnova.in › articles › {previewSlug}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {previewDesc.replace(/<[^>]*>/g, "").slice(0, 160)}{previewDesc.replace(/<[^>]*>/g, "").length > 160 ? "..." : ""}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SEO Checklist */}
            <div className="grid gap-1.5">
              {seo.checks.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {c.pass ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                  )}
                  <span className={c.pass ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                  <span className="text-muted-foreground ml-auto">{c.tip}</span>
                </div>
              ))}
            </div>

            {/* Meta fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Meta Title <span className="text-muted-foreground text-xs">({(form.meta_title || form.title).length}/60)</span></Label>
                <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} className="mt-1" placeholder={form.title || "SEO title"} />
              </div>
              <div>
                <Label>Meta Description <span className="text-muted-foreground text-xs">({(form.meta_description || form.excerpt).length}/160)</span></Label>
                <Textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} className="mt-1" rows={2} placeholder="SEO description" />
              </div>
            </div>
          </div>

          {/* Publishing & Scheduling */}
          <div className="border-t border-border pt-4 space-y-4">
            <p className="text-sm font-medium">Publishing & Scheduling</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={form.publish_status}
                  onValueChange={(v: any) => setForm({ ...form, publish_status: v })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scheduled date & time</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="mt-1"
                  disabled={form.publish_status !== "scheduled"}
                />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="mt-1" placeholder="Asia/Kolkata" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1" placeholder="e.g. Spirituality" />
              </div>
              <div>
                <Label>Author</Label>
                <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="mt-1" placeholder="Author name" />
              </div>
              <div>
                <Label>Schema type</Label>
                <Select value={form.schema_type} onValueChange={(v) => setForm({ ...form, schema_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BlogPosting">BlogPosting</SelectItem>
                    <SelectItem value="Article">Article</SelectItem>
                    <SelectItem value="NewsArticle">NewsArticle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Primary keyword</Label>
                <Input value={form.primary_keyword} onChange={(e) => setForm({ ...form, primary_keyword: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Secondary keywords <span className="text-xs text-muted-foreground">(comma-separated)</span></Label>
                <Input value={form.secondary_keywords} onChange={(e) => setForm({ ...form, secondary_keywords: e.target.value })} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Tags <span className="text-xs text-muted-foreground">(5-10, comma-separated)</span></Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="mt-1" placeholder="tag1, tag2, tag3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Featured image title</Label>
                <Input value={form.featured_image_title} onChange={(e) => setForm({ ...form, featured_image_title: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Featured image alt</Label>
                <Input value={form.featured_image_alt} onChange={(e) => setForm({ ...form, featured_image_alt: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Featured image caption</Label>
                <Input value={form.featured_image_caption} onChange={(e) => setForm({ ...form, featured_image_caption: e.target.value })} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Social caption</Label>
                <Textarea value={form.social_caption} onChange={(e) => setForm({ ...form, social_caption: e.target.value })} className="mt-1" rows={2} placeholder="≤280 chars, incl. hashtags" />
              </div>
              <div>
                <Label>Social excerpt</Label>
                <Textarea value={form.social_excerpt} onChange={(e) => setForm({ ...form, social_excerpt: e.target.value })} className="mt-1" rows={2} />
              </div>
            </div>

            <div>
              <Label>Canonical URL</Label>
              <Input value={form.canonical_url} onChange={(e) => setForm({ ...form, canonical_url: e.target.value })} className="mt-1" placeholder="https://…" />
            </div>
          </div>

          {/* Sources & Permissions + Originality (new) */}
          <div className="border-t border-border pt-4 grid gap-4 md:grid-cols-2">
            <SourcesPermissionsCard
              sourceType={form.source_type}
              sourceCitation={form.source_citation}
              permissionNotes={form.permission_notes}
              onChange={(patch) => setForm({ ...form, ...patch as any })}
            />
            <OriginalityPanel
              entityType="post"
              entityId={editing?.id ?? null}
              score={editing?.originality_score ?? null}
              report={(editing?.originality_report ?? null) as any}
              checkedAt={editing?.originality_checked_at ?? null}
              approvalStatus={editing?.approval_status ?? "draft"}
              disableRun={!editing}
              onChecked={() => qc.invalidateQueries({ queryKey: ["admin-posts"] })}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              {form.publish_status === "scheduled" && form.scheduled_at
                ? `Will auto-publish at ${new Date(form.scheduled_at).toLocaleString("en-IN")}`
                : form.publish_status === "published"
                  ? "Live on site"
                  : "Saved as draft"}
              {editing?.approval_status && editing.approval_status !== "approved" && (
                <span className="ml-2 text-amber-700">
                  · Requires admin approval before publish
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              {editing && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const { error } = await supabase.rpc("submit_post_for_review" as any, { _post_id: editing.id } as any);
                      if (error) throw error;
                      toast({ title: "Submitted for review", description: "Running originality check…" });
                      // Kick off originality check right after submission
                      await supabase.functions.invoke("content-originality-check", {
                        body: { entity_type: "post", entity_id: editing.id },
                      });
                      qc.invalidateQueries({ queryKey: ["admin-posts"] });
                    } catch (e: any) {
                      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
                    }
                  }}
                >
                  <Send className="mr-1 h-4 w-4" /> Submit for Review
                </Button>
              )}
              <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending || (form.publish_status === "scheduled" && !form.scheduled_at)}>
                {saveMutation.isPending ? "Saving…" : editing ? "Update Post" : "Save Post"}
              </Button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  /* ─── List view ────────────────────────────────────────────────── */
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold">Posts</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => downloadTableAsCsv({ table: "posts", filenamePrefix: "posts", orderBy: { column: "created_at", ascending: false } })}>
            <Download className="mr-1 h-4 w-4" /> Download All
          </Button>
          <UploadCsvButton table="posts" size="default" label="Upload CSV" onDone={() => qc.invalidateQueries({ queryKey: ["admin-posts"] })} />
          <Button
            variant="secondary"
            disabled={aiRunning}
            onClick={async () => {
              setAiRunning(true);
              try {
                const { data, error } = await supabase.functions.invoke("seo-blog-agent", { body: {} });
                if (error) throw error;
                if (!data?.success) throw new Error(data?.error || "Agent failed");
                toast({ title: `AI ${data.action}: ${data.slug}`, description: `Focus: ${data.focus_keyword}` });
                qc.invalidateQueries({ queryKey: ["admin-posts"] });
              } catch (e: any) {
                toast({ title: "Agent error", description: e.message, variant: "destructive" });
              } finally {
                setAiRunning(false);
              }
            }}
          >
            {aiRunning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            Run SEO Agent
          </Button>
          <AgentLogsDialog />
          <Button onClick={() => setView("form")}><Plus className="mr-1 h-4 w-4" /> Add Post</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(() => {
          const all = posts ?? [];
          const statusOf = (p: any) => p.publish_status ?? (p.is_published ? "published" : "draft");
          const stats = [
            { label: "Total", value: all.length, cls: "text-foreground" },
            { label: "Published", value: all.filter((p: any) => statusOf(p) === "published").length, cls: "text-emerald-600" },
            { label: "Draft", value: all.filter((p: any) => statusOf(p) === "draft").length, cls: "text-muted-foreground" },
            { label: "Scheduled", value: all.filter((p: any) => statusOf(p) === "scheduled").length, cls: "text-amber-600" },
          ];
          return stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
              </CardContent>
            </Card>
          ));
        })()}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{p.slug}</TableCell>
                  <TableCell className="capitalize">{p.post_type}</TableCell>
                  <TableCell>
                    {(() => {
                      const status = p.publish_status ?? (p.is_published ? "published" : "draft");
                      if (status === "published") return <span className="text-green-600 font-medium">Published</span>;
                      if (status === "scheduled") return (
                        <span className="text-blue-600 font-medium">
                          Scheduled{p.scheduled_at ? ` · ${new Date(p.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}
                        </span>
                      );
                      return <span className="text-muted-foreground">Draft</span>;
                    })()}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!posts || posts.length === 0) && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No posts yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

function AgentLogsDialog() {
  const [open, setOpen] = useState(false);
  const { data: logs, isLoading } = useQuery({
    queryKey: ["seo-agent-logs"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_agent_logs")
        .select("*")
        .order("run_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><ScrollText className="mr-1 h-4 w-4" /> Agent Logs</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>SEO Agent — Recent Runs</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !logs?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No runs yet.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((l: any) => (
              <div key={l.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-semibold">{l.topic || "(no topic)"}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full ${l.status === "error" ? "bg-red-500/10 text-red-600" : l.action === "updated" ? "bg-blue-500/10 text-blue-600" : "bg-green-500/10 text-green-600"}`}>
                      {l.status === "error" ? "error" : l.action}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(l.run_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                  <div>Slug: <span className="text-foreground">{l.slug || "—"}</span></div>
                  <div>Focus: <span className="text-foreground">{l.focus_keyword || "—"}</span></div>
                  <div>Similarity: <span className="text-foreground">{l.similarity_score != null ? Number(l.similarity_score).toFixed(2) : "—"}</span></div>
                  <div>Words: <span className="text-foreground">{l.word_count || "—"} ({l.reading_time_min || "—"} min)</span></div>
                </div>
                {l.matched_slug && (
                  <div className="mt-1 text-xs">Matched existing: <code>/{l.matched_slug}</code></div>
                )}
                {!!(l.sources?.length) && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Sources researched ({l.sources.length})</summary>
                    <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                      {l.sources.map((s: any, i: number) => (
                        <li key={i}><a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{s.title || s.url}</a></li>
                      ))}
                    </ul>
                  </details>
                )}
                {!!(l.internal_links?.length) && (
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Internal links added ({l.internal_links.length})</summary>
                    <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                      {l.internal_links.map((s: any, i: number) => (
                        <li key={i}><code>{s.url}</code> — {s.anchor}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {!!(l.external_links?.length) && (
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">External links ({l.external_links.length})</summary>
                    <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                      {l.external_links.map((s: any, i: number) => (
                        <li key={i}><a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{s.anchor || s.url}</a></li>
                      ))}
                    </ul>
                  </details>
                )}
                {l.error && <div className="mt-2 text-xs text-red-600">Error: {l.error}</div>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AdminPosts;

