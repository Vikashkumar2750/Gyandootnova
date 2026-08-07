import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";

type Props = {
  title: string;
  url?: string;
  className?: string;
};

export default function SocialShareBar({ title, url, className }: Props) {
  const shareUrl =
    url ?? (typeof window !== "undefined" ? window.location.href : "");
  const encoded = encodeURIComponent(shareUrl);
  const text = encodeURIComponent(title);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const btn =
    "inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-background hover:bg-muted transition-colors";

  return (
    <div
      className={`flex items-center gap-2 flex-wrap ${className ?? ""}`}
      aria-label="Share this page"
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Share2 className="h-3.5 w-3.5" /> Share
      </span>
      <a
        className={btn}
        href={`https://api.whatsapp.com/send?text=${text}%20${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        title="WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-[#25D366]">
          <path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.4-.3-.7-.5-.6-.7-.6h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.2.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.4zM12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.8-1.5C8.4 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2z" />
        </svg>
      </a>
      <a
        className={btn}
        href={`https://twitter.com/intent/tweet?text=${text}&url=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        title="X (Twitter)"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
          <path d="M18.244 2H21l-6.545 7.48L22 22h-6.828l-5.36-6.86L3.6 22H1l7.02-8.02L1 2h7l4.84 6.24L18.244 2zm-1.196 18h1.516L7.06 4H5.44l11.608 16z" />
        </svg>
      </a>
      <a
        className={btn}
        href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        title="Facebook"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-[#1877F2]">
          <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-2.9h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12h2.6l-.4 2.9h-2.2v7A10 10 0 0 0 22 12z" />
        </svg>
      </a>
      <a
        className={btn}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        title="LinkedIn"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-[#0A66C2]">
          <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001 2.5 2.5 0 0 1 0-5.001zM3 9h4v12H3V9zm7 0h3.8v1.7h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1V21H18v-5.4c0-1.29-.02-2.94-1.8-2.94-1.8 0-2.08 1.4-2.08 2.85V21H10V9z" />
        </svg>
      </a>
      <button
        onClick={copy}
        className={btn}
        aria-label="Copy link"
        title="Copy link"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
