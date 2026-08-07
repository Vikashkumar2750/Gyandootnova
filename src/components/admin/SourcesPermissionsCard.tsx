import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText } from "lucide-react";

export type SourceType =
  | "original"
  | "translation"
  | "public_domain"
  | "licensed"
  | "quoted_excerpt";

interface Props {
  sourceType: SourceType;
  sourceCitation: string;
  permissionNotes: string;
  onChange: (patch: Partial<{
    source_type: SourceType;
    source_citation: string;
    permission_notes: string;
  }>) => void;
  disabled?: boolean;
}

const options: { value: SourceType; label: string; hint: string }[] = [
  { value: "original", label: "Original writing", hint: "Written from scratch for GyandootNova" },
  { value: "translation", label: "In-house translation", hint: "Our own translation of a source text" },
  { value: "public_domain", label: "Public domain text", hint: "Vedic shlokas, out-of-copyright works" },
  { value: "licensed", label: "Licensed / permission granted", hint: "Written permission on file" },
  { value: "quoted_excerpt", label: "Short quoted excerpt", hint: "Fair-use quotation with attribution" },
];

const SourcesPermissionsCard = ({
  sourceType, sourceCitation, permissionNotes, onChange, disabled,
}: Props) => {
  return (
    <Card className="border-amber-200/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-amber-600" />
          Sources & Permissions
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Every piece must declare its provenance. Borrowed text without permission cannot be published.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-1.5 block text-sm">Source type</Label>
          <Select
            value={sourceType}
            onValueChange={(v) => onChange({ source_type: v as SourceType })}
            disabled={disabled}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{o.label}</span>
                    <span className="text-xs text-muted-foreground">{o.hint}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-sm">
            Source citation / references{" "}
            {sourceType !== "original" && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            value={sourceCitation}
            onChange={(e) => onChange({ source_citation: e.target.value })}
            placeholder="e.g. Gita Press Gorakhpur, Srimad Bhagavad Gita (1986), Ch. 2, or a URL"
            rows={2}
            disabled={disabled}
          />
        </div>

        <div>
          <Label className="mb-1.5 block text-sm">
            Permissions / rights notes{" "}
            {(sourceType === "licensed" || sourceType === "quoted_excerpt") && (
              <span className="text-destructive">*</span>
            )}
          </Label>
          <Textarea
            value={permissionNotes}
            onChange={(e) => onChange({ permission_notes: e.target.value })}
            placeholder="Written permission on file? License? Rights holder? (Leave blank for original writing.)"
            rows={2}
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SourcesPermissionsCard;
