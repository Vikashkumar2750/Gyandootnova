import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as pdfjsLib from "pdfjs-dist";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { FileUp, Sparkles, Loader2, Save, ScrollText } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface Analysis {
  title: string;
  slug: string;
  excerpt: string;
  meta_title: string;
  meta_description: string;
  primary_keyword: string;
  tags: string[];
  simple_meaning: string;
  content_html: string;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);

const AdminVerseStudio = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [fileName, setFileName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [verse, setVerse] = useState("");
  const [instructions, setInstructions] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [provider, setProvider] = useState<string>("");

  const readFile = async (file: File) => {
    setExtracting(true);
    try {
      let text = "";
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map((it: any) => it.str ?? "").join(" "));
        }
        text = pages.join("\n\n");
      } else {
        text = await file.text();
      }
      text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      if (!text) throw new Error("Is file se koi text nahi mila (scanned PDF ho sakta hai).");
      setFileName(file.name);
      setSourceText(text);
      if (!verse.trim()) {
        const firstLines = text.split("\n").filter((l) => l.trim()).slice(0, 2).join("\n");
        setVerse(firstLines.slice(0, 400));
      }
      toast({ title: "Text extracted", description: `${text.length.toLocaleString()} characters` });
    } catch (e: any) {
      toast({ title: "Extraction failed", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("verse-analyze", {
        body: {
          verse,
          source_text: sourceText,
          source_name: fileName || undefined,
          extra_instructions: instructions || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { analysis: Analysis; provider: string };
    },
    onSuccess: (d) => {
      setAnalysis(d.analysis);
      setProvider(d.provider);
      toast({ title: "Analysis ready", description: `Provider: ${d.provider}` });
    },
    onError: (e: any) =>
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!analysis) throw new Error("No analysis");
      const { error } = await supabase.from("posts").insert({
        title: analysis.title,
        slug: analysis.slug || slugify(analysis.title),
        content: analysis.content_html,
        excerpt: analysis.excerpt,
        meta_title: analysis.meta_title,
        meta_description: analysis.meta_description,
        primary_keyword: analysis.primary_keyword,
        tags: analysis.tags,
        post_type: "article",
        publish_status: publish ? "published" : "draft",
        is_published: publish,
        source_citation: fileName ? `Uploaded source: ${fileName}` : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
      toast({ title: "Blog post saved" });
    },
    onError: (e: any) =>
      toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-primary" /> Verse Studio
        </h1>
        <p className="text-sm text-muted-foreground">
          PDF ya text file upload karein, verse chunein, aur deep research analysis ko blog post me convert karein.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Source upload</CardTitle>
            <CardDescription>PDF, TXT ya MD file se text nikala jayega (browser me hi).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="verse-file" className="sr-only">Upload file</Label>
            <Input
              id="verse-file"
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void readFile(f);
              }}
            />
            {extracting && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Text nikala ja raha hai...
              </p>
            )}
            {sourceText && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <FileUp className="h-4 w-4 text-primary" />
                  <span className="truncate">{fileName}</span>
                  <Badge variant="secondary">{sourceText.length.toLocaleString()} chars</Badge>
                </div>
                <Textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Verse & instructions</CardTitle>
            <CardDescription>Jis pankti ka analysis chahiye wo yahan paste ya edit karein.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="verse">Verse / Shloka / Mantra</Label>
              <Textarea
                id="verse"
                value={verse}
                onChange={(e) => setVerse(e.target.value)}
                rows={5}
                placeholder="यहाँ अपनी पंक्ति डालें..."
                className="font-serif"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="instr">Extra instructions (optional)</Label>
              <Textarea
                id="instr"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder="जैसे: Jyotisha section vistaar se, ya kisi book ka backlink jodein."
              />
            </div>
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={!verse.trim() || analyzeMutation.isPending}
              className="w-full"
            >
              {analyzeMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deep research chal raha hai...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Run deep analysis</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Preview & publish</CardTitle>
            <CardDescription>
              {provider ? `Generated via ${provider}` : ""} — edit karke blog section me daalein.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="a-title">Title</Label>
                <Input id="a-title" value={analysis.title}
                  onChange={(e) => setAnalysis({ ...analysis, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="a-slug">Slug</Label>
                <Input id="a-slug" value={analysis.slug}
                  onChange={(e) => setAnalysis({ ...analysis, slug: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="a-mt">Meta title</Label>
                <Input id="a-mt" value={analysis.meta_title}
                  onChange={(e) => setAnalysis({ ...analysis, meta_title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="a-kw">Primary keyword</Label>
                <Input id="a-kw" value={analysis.primary_keyword}
                  onChange={(e) => setAnalysis({ ...analysis, primary_keyword: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="a-md">Meta description</Label>
              <Textarea id="a-md" rows={2} value={analysis.meta_description}
                onChange={(e) => setAnalysis({ ...analysis, meta_description: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="a-ex">Excerpt</Label>
              <Textarea id="a-ex" rows={2} value={analysis.excerpt}
                onChange={(e) => setAnalysis({ ...analysis, excerpt: e.target.value })} />
            </div>
            {analysis.simple_meaning && (
              <p className="rounded-md border bg-muted/40 p-3 text-sm">
                <strong>सरल अर्थ:</strong> {analysis.simple_meaning}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {analysis.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
            </div>

            <Separator />

            <div className="space-y-1">
              <Label htmlFor="a-html">Content (HTML)</Label>
              <Textarea id="a-html" rows={12} className="font-mono text-xs" value={analysis.content_html}
                onChange={(e) => setAnalysis({ ...analysis, content_html: e.target.value })} />
            </div>

            <div className="rounded-md border p-4 overflow-x-auto">
              <div
                className="prose prose-sm dark:prose-invert max-w-none [&_table]:w-full [&_td]:border [&_th]:border [&_td]:p-2 [&_th]:p-2"
                dangerouslySetInnerHTML={{ __html: analysis.content_html }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending}>
                <Save className="mr-2 h-4 w-4" /> Save as draft
              </Button>
              <Button variant="secondary" onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>
                Publish now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminVerseStudio;
