import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { importCsvIntoTable } from "@/lib/importCsv";

type Props = {
  table: string;
  dropColumns?: string[];
  onConflict?: string;
  onDone?: () => void;
  label?: string;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "secondary";
};

export default function UploadCsvButton({
  table, dropColumns, onConflict, onDone,
  label = "Upload CSV", size = "sm", variant = "outline",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      await importCsvIntoTable(f, { table, dropColumns, onConflict });
      onDone?.();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        size={size}
        variant={variant}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
        {label}
      </Button>
    </>
  );
}
