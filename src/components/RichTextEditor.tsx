import { useEditor, EditorContent } from "@tiptap/react";
<<<<<<< HEAD
import { Extension } from "@tiptap/core";
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
<<<<<<< HEAD
import { FontFamily } from "@tiptap/extension-font-family";
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
<<<<<<< HEAD
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Preserve inline style/align on block + span nodes (Word paste) ─── */
const PreserveStyles = Extension.create({
  name: "preserveStyles",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "listItem", "blockquote", "tableCell", "tableHeader", "tableRow", "table"],
        attributes: {
          style: {
            default: null,
            parseHTML: (el) => el.getAttribute("style"),
            renderHTML: (attrs) => (attrs.style ? { style: attrs.style } : {}),
          },
          align: {
            default: null,
            parseHTML: (el) => el.getAttribute("align"),
            renderHTML: (attrs) => (attrs.align ? { align: attrs.align } : {}),
          },
        },
      },
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => {
              const e = el as HTMLElement;
              return e.style.fontSize || e.getAttribute("size") || null;
            },
            renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {}),
          },
          fontFamily: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.fontFamily || null,
            renderHTML: (attrs) => (attrs.fontFamily ? { style: `font-family:${attrs.fontFamily}` } : {}),
          },
          backgroundColor: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.backgroundColor || null,
            renderHTML: (attrs) => (attrs.backgroundColor ? { style: `background-color:${attrs.backgroundColor}` } : {}),
          },
          color: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.color || null,
            renderHTML: (attrs) => (attrs.color ? { style: `color:${attrs.color}` } : {}),
          },
        },
      },
    ];
  },
});

/* ─── Clean MS Word HTML but keep formatting ──────────────────────────── */
function cleanWordHtml(html: string): string {
  if (!html) return html;
  let out = html;
  // Strip Word-specific tags/comments/xml
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/<\?xml[\s\S]*?\?>/g, "");
  out = out.replace(/<\/?(o:p|w:[^>]+|m:[^>]+|v:[^>]+)[^>]*>/gi, "");
  out = out.replace(/<style[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<meta[^>]*>/gi, "");
  out = out.replace(/<link[^>]*>/gi, "");
  // Remove mso-* inline style props but KEEP font-family, font-size, colors etc
  out = out.replace(/style="([^"]*)"/gi, (_m, s) => {
    const cleaned = s
      .split(";")
      .map((p: string) => p.trim())
      .filter((p: string) => p && !/^mso-/i.test(p))
      .join(";");
    return cleaned ? `style="${cleaned}"` : "";
  });
  // Remove Word class attrs (MsoNormal etc.) but keep other classes
  out = out.replace(/\sclass="Mso[^"]*"/gi, "");
  // Convert Word's fake bullet paragraphs (·, o, §) into real bullet text — TipTap will keep them as paragraphs but at least the marker survives
  // Better: leave them; users usually paste small snippets
  return out;
}

=======
import { useCallback, useRef, useState } from "react";
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Highlighter, Palette, Undo, Redo, Quote, Minus, Code,
<<<<<<< HEAD
  Upload, Table as TableIcon, Plus, Trash2,
  Columns3, Rows3,
=======
  Upload,
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ─── Toolbar button ─────────────────────────────────────────────────── */
const ToolBtn = ({ onClick, active, title, children, disabled }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode; disabled?: boolean;
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "h-7 w-7 flex items-center justify-center rounded text-sm transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "hover:bg-muted text-foreground/70 hover:text-foreground",
      disabled && "opacity-40 cursor-not-allowed"
    )}
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-5 bg-border mx-0.5 shrink-0" />;

/* ─── Text color swatches ─────────────────────────────────────────────── */
const COLORS = [
  "#000000", "#374151", "#6b7280", "#ffffff",
  "#dc2626", "#ea580c", "#d97706", "#65a30d",
  "#0284c7", "#7c3aed", "#db2777", "#0f766e",
];

/* ─── Highlight swatches ─────────────────────────────────────────────── */
const HIGHLIGHTS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#fecdd3",
  "#e9d5ff", "#fed7aa", "#a7f3d0", "#fde68a",
];

/* ─── IMAGE SIZE CLASSES ─────────────────────────────────────────────── */
const IMG_SIZES = [
  { label: "Small", cls: "w-1/4" },
  { label: "Medium", cls: "w-1/2" },
  { label: "Large", cls: "w-3/4" },
  { label: "Full", cls: "w-full" },
];

/* ─── Props ──────────────────────────────────────────────────────────── */
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const RichTextEditor = ({ value, onChange, placeholder = "Start writing…", minHeight = 300 }: RichTextEditorProps) => {
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
<<<<<<< HEAD
      FontFamily,
      PreserveStyles,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline cursor-pointer" } }),
      Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { class: "rounded-lg my-3 mx-auto block" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "rte-table" } }),
      TableRow,
      TableHeader,
      TableCell,
=======
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline cursor-pointer" } }),
      Image.configure({ inline: false, HTMLAttributes: { class: "rounded-lg my-3 mx-auto block" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
<<<<<<< HEAD
        class: "outline-none prose prose-sm max-w-none px-4 py-3 rte-content",
        style: `min-height:${minHeight}px`,
      },
      transformPastedHTML: (html) => cleanWordHtml(html),
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        const imageFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (it.kind === "file" && it.type.startsWith("image/")) {
            const f = it.getAsFile();
            if (f) imageFiles.push(f);
          }
        }
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        (async () => {
          setUploading(true);
          try {
            for (const file of imageFiles) {
              const ext = file.name.split(".").pop() || "png";
              const path = `editor/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
              const { error } = await supabase.storage.from("post-images").upload(path, file, { upsert: true });
              if (error) throw error;
              const { data } = supabase.storage.from("post-images").getPublicUrl(path);
              const { state, dispatch } = view;
              const node = view.state.schema.nodes.image.create({ src: data.publicUrl });
              dispatch(state.tr.replaceSelectionWith(node));
            }
          } catch (e: any) {
            toast({ title: "Image paste failed", description: e.message, variant: "destructive" });
          } finally {
            setUploading(false);
          }
        })();
        return true;
      },

    },
  });


  /* Sync external `value` changes into the editor (e.g. when async-loading
     an existing chapter's content after mount). Without this, the editor
     stays showing the initial empty content and any save wipes the row. */
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    // TipTap serializes empty doc as "<p></p>"; treat that as equivalent to ""
    const isEmpty = (s: string) => !s || s === "<p></p>";
    if (value !== current && !(isEmpty(value) && isEmpty(current))) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);


=======
        class: "outline-none prose prose-sm max-w-none px-4 py-3",
        style: `min-height:${minHeight}px`,
      },
    },
  });

>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
  /* ─── Image upload to Supabase storage ─────────────────────────────── */
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `editor/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("post-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      editor?.chain().focus().setImage({ src: data.publicUrl }).run();
    } catch (e: any) {
      toast({ title: "Image upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [editor, toast]);

  /* ─── Set link ──────────────────────────────────────────────────────── */
  const applyLink = () => {
    if (!linkUrl) { editor?.chain().focus().unsetLink().run(); }
    else { editor?.chain().focus().setLink({ href: linkUrl }).run(); }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-background">
      {/* ─── TOOLBAR ─────────────────────────────────────────────── */}
      <div className="border-b border-border bg-muted/40 px-2 py-1.5 flex flex-wrap gap-0.5 items-center">

        {/* Undo / Redo */}
        <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Headings */}
        <ToolBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Text formatting */}
        <ToolBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Text color */}
        <div className="relative">
          <ToolBtn title="Text Color" onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }}>
            <span className="flex flex-col items-center gap-0">
              <Palette className="h-3.5 w-3.5" />
              <span className="h-0.5 w-4 rounded-full" style={{ background: editor.getAttributes("textStyle").color || "#000" }} />
            </span>
          </ToolBtn>
          {showColorPicker && (
            <div className="absolute top-8 left-0 z-50 bg-popover border border-border rounded-lg p-2 shadow-xl grid grid-cols-4 gap-1 w-28">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  className="h-5 w-5 rounded border border-border/50 hover:scale-110 transition-transform"
                  style={{ background: c }}
                  onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false); }}
                />
              ))}
              <button type="button" className="col-span-4 text-[10px] text-muted-foreground hover:text-foreground mt-1" onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}>
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Highlight */}
        <div className="relative">
          <ToolBtn title="Highlight" active={editor.isActive("highlight")} onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}>
            <Highlighter className="h-3.5 w-3.5" />
          </ToolBtn>
          {showHighlightPicker && (
            <div className="absolute top-8 left-0 z-50 bg-popover border border-border rounded-lg p-2 shadow-xl grid grid-cols-4 gap-1 w-28">
              {HIGHLIGHTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  className="h-5 w-5 rounded border border-border/50 hover:scale-110 transition-transform"
                  style={{ background: c }}
                  onClick={() => { editor.chain().focus().setHighlight({ color: c }).run(); setShowHighlightPicker(false); }}
                />
              ))}
              <button type="button" className="col-span-4 text-[10px] text-muted-foreground hover:text-foreground mt-1" onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false); }}>
                Remove
              </button>
            </div>
          )}
        </div>
        <Divider />

        {/* Alignment */}
        <ToolBtn title="Align Left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Align Center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Align Right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Lists */}
        <ToolBtn title="Bullet List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Ordered List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Link */}
        <div className="relative">
          <ToolBtn title="Insert Link" active={editor.isActive("link")} onClick={() => { setShowLinkInput(!showLinkInput); setShowColorPicker(false); setShowHighlightPicker(false); }}>
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolBtn>
          {showLinkInput && (
            <div className="absolute top-8 left-0 z-50 bg-popover border border-border rounded-lg p-2 shadow-xl flex gap-1 w-56">
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="h-7 text-xs"
                onKeyDown={(e) => e.key === "Enter" && applyLink()}
                autoFocus
              />
              <Button type="button" size="sm" className="h-7 px-2 text-xs shrink-0" onClick={applyLink}>OK</Button>
            </div>
          )}
        </div>

        {/* Image upload */}
        <ToolBtn title={uploading ? "Uploading…" : "Insert Image"} onClick={() => imageInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Upload className="h-3.5 w-3.5 animate-pulse" /> : <ImageIcon className="h-3.5 w-3.5" />}
        </ToolBtn>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }}
        />
<<<<<<< HEAD

        <Divider />
        {/* Table controls */}
        <ToolBtn title="Insert Table (3×3)" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        {editor.isActive("table") && (
          <>
            <ToolBtn title="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <Columns3 className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn title="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <Rows3 className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn title="Toggle header row" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
              <Plus className="h-3.5 w-3.5" />
            </ToolBtn>
            <ToolBtn title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
              <Trash2 className="h-3.5 w-3.5" />
            </ToolBtn>
          </>
        )}
=======
>>>>>>> 2840b3afbb193528fe8027118692ccff30ac79c4
      </div>

      {/* ─── IMAGE SIZE HELPER (shows when image is selected) ─────── */}
      {editor.isActive("image") && (
        <div className="border-b border-border bg-muted/20 px-3 py-1.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Image size:</span>
          {IMG_SIZES.map((s) => (
            <button
              key={s.label}
              type="button"
              className="text-xs px-2 py-0.5 rounded border border-border hover:bg-muted transition-colors"
              onClick={() => {
                editor.chain().focus().updateAttributes("image", { class: `rounded-lg my-3 mx-auto block ${s.cls}` }).run();
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── EDITOR AREA ─────────────────────────────────────────── */}
      <div
        className="cursor-text"
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} />
        {editor.isEmpty && (
          <p className="absolute pointer-events-none text-muted-foreground text-sm px-4 pt-3 select-none">{placeholder}</p>
        )}
      </div>

      {/* ─── CLICK OUTSIDE to close pickers ─────────────────────── */}
      {(showColorPicker || showHighlightPicker || showLinkInput) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowColorPicker(false); setShowHighlightPicker(false); setShowLinkInput(false); }}
        />
      )}
    </div>
  );
};

export default RichTextEditor;
