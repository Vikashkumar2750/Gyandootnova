import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import useWhatsApp from "@/hooks/useWhatsApp";
import { cn } from "@/lib/utils";

type Props = {
  book?: string | null;
  url?: string | null;
  label?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
};

const WhatsAppSupportButton = ({
  book,
  url,
  label = "WhatsApp पर सहायता लें",
  className,
  size = "default",
  variant = "outline",
}: Props) => {
  const { buildLink } = useWhatsApp();
  const href = buildLink({ book, url });
  if (!href) return null;

  return (
    <Button asChild size={size} variant={variant} className={cn("gap-2", className)}>
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
        <MessageCircle className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
};

export default WhatsAppSupportButton;
