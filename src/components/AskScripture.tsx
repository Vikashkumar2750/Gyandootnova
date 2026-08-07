import { useState, useRef, useEffect } from "react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { X, Send, Loader2, BookOpen, Sparkles } from "lucide-react";

// Strict sanitizer: allow only safe inline formatting, no scripts/styles/links.
const sanitize = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["strong", "em", "b", "i", "br"],
    ALLOWED_ATTR: [],
  });

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  cached?: boolean;
}

interface AskScriptureProps {
  bookId?: string;
  bookTitle?: string;
}

const AskScripture = ({ bookId, bookTitle }: AskScriptureProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isGeneral = !bookId;
  const displayTitle = bookTitle || "Sanatana Dharma";
  const subtitle = isGeneral ? "Ask any question about Hindu dharma" : bookTitle;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const askQuestion = async () => {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-ask", {
        body: {
          action: "ask",
          question: q,
          book_id: bookId || "general",
        },
      });

      if (error) {
        // Check if it's an auth error
        const errorBody = typeof error === 'object' && 'context' in error ? error : null;
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer || "That information isn't available.",
        cached: data.cached,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("AI Ask error:", err);
      const errorMessage = err?.message?.includes("login") || err?.message?.includes("Unauthorized")
        ? "Please sign in first. Login is required to use the AI assistant."
        : "Something went wrong. Please try again.";
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorMessage,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  // Escape any raw HTML in the AI response, then apply our markdown-like
  // formatting, then sanitize the result with DOMPurify before rendering.
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const formatLine = (line: string) => {
    const escaped = escapeHtml(line);
    const bolded = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    const italicized = bolded.replace(/\*(.*?)\*/g, "<em>$1</em>");
    return sanitize(italicized);
  };

  const formatResponse = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) {
        return <h4 key={i} className="font-bold text-sm mt-2 mb-1">{line.slice(4)}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={i} className="font-bold text-base mt-2 mb-1">{line.slice(3)}</h3>;
      }
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return <li key={i} className="ml-3 list-disc" dangerouslySetInnerHTML={{ __html: formatLine(line.slice(2)) }} />;
      }
      if (line.trim() === "") {
        return <br key={i} />;
      }
      return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: formatLine(line) }} />;
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
        aria-label="Ask Gyandootnova AI"
      >
        <Sparkles className="h-5 w-5" />
        <span className="hidden sm:inline text-sm font-medium">
          {isGeneral ? "Ask about dharma" : "Ask this book"}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden"
      style={{ height: "min(520px, calc(100vh - 2rem))" }}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-primary px-4 py-3 text-primary-foreground">
        {isGeneral ? (
          <Sparkles className="h-5 w-5 shrink-0" />
        ) : (
          <BookOpen className="h-5 w-5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {isGeneral ? "Gyandootnova AI" : "Ask this book"}
          </p>
          <p className="text-xs opacity-80 truncate">{subtitle}</p>
        </div>
        <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-primary-foreground/20 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
            <Sparkles className="h-10 w-10 mb-3 text-primary/40" />
            <p className="text-sm font-medium">Gyandootnova AI</p>
            <p className="text-xs mt-1 max-w-[220px]">
              {isGeneral
                ? "Get authentic information about the Vedas, Gita, Ramayana, Upanishads or any Hindu scripture"
                : `Ask any question about "${displayTitle}"`}
            </p>
          </div>
        )}
        <div className="space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="space-y-0">{formatResponse(msg.content)}</div>
                ) : (
                  msg.content
                )}
                {msg.cached && (
                  <span className="block text-[10px] opacity-60 mt-1">⚡ cached</span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{isGeneral ? "Searching the scriptures..." : "Searching this book..."}</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isGeneral ? "Ask a question about dharma..." : "Type your question here..."}
            disabled={loading}
            className="flex-1 rounded-full text-sm"
          />
          <Button
            size="icon"
            onClick={askQuestion}
            disabled={loading || !input.trim()}
            className="rounded-full shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AskScripture;
