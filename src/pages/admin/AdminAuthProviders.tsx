import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Save, Trash2 } from "lucide-react";

type Channel = "sms" | "whatsapp" | "email";

// Sanitize pasted API keys: strip whitespace, zero-width chars, BOM, and surrounding quotes
// so it doesn't matter where the user copied from (email, PDF, docs, etc.)
const sanitizeKey = (raw: string): string => {
  if (!raw) return "";
  let s = raw
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width + BOM
    .replace(/\s+/g, "") // all whitespace incl. newlines
    .trim();
  // strip surrounding quotes/backticks
  if (/^["'`].*["'`]$/.test(s)) s = s.slice(1, -1);
  return s;
};

interface FieldDef { key: string; label: string; type?: string; placeholder?: string }
const PROVIDERS: Record<Channel, { id: string; name: string; fields: FieldDef[] }[]> = {
  sms: [
    { id: "twilio", name: "Twilio SMS", fields: [
      { key: "account_sid", label: "Account SID" },
      { key: "auth_token", label: "Auth Token", type: "password" },
      { key: "from_number", label: "From Number (+E.164)" },
    ]},
    { id: "msg91", name: "MSG91", fields: [
      { key: "auth_key", label: "Auth Key", type: "password" },
      { key: "template_id", label: "Flow Template ID" },
      { key: "sender_id", label: "Sender ID (6 chars)" },
    ]},
    { id: "fast2sms", name: "Fast2SMS", fields: [
      { key: "api_key", label: "API Key", type: "password" },
      { key: "route", label: "Route (otp / dlt)", placeholder: "otp" },
      { key: "sender_id", label: "Sender ID (DLT only)" },
      { key: "template_id", label: "Template message (DLT only)" },
    ]},
  ],
  whatsapp: [
    { id: "twilio", name: "Twilio WhatsApp", fields: [
      { key: "account_sid", label: "Account SID" },
      { key: "auth_token", label: "Auth Token", type: "password" },
      { key: "from_number", label: "From WhatsApp Number (+E.164)" },
    ]},
    { id: "whatsapp_cloud", name: "WhatsApp Cloud API (Meta)", fields: [
      { key: "access_token", label: "Access Token", type: "password" },
      { key: "phone_number_id", label: "Phone Number ID" },
      { key: "template_name", label: "Template name", placeholder: "otp_verification" },
      { key: "language", label: "Language code", placeholder: "en" },
    ]},
    { id: "gupshup", name: "Gupshup WhatsApp", fields: [
      { key: "api_key", label: "API Key", type: "password" },
      { key: "source_number", label: "Source Number" },
      { key: "app_name", label: "App Name (src.name)" },
      { key: "template_id", label: "Template ID" },
    ]},
  ],
  email: [
    { id: "resend", name: "Resend", fields: [
      { key: "_note", label: "Uses project's RESEND_API_KEY secret. No extra config needed.", placeholder: "" },
    ]},
  ],
};

interface ProviderRow {
  id: string;
  channel: Channel;
  provider_name: string;
  config_json: Record<string, any>;
  is_active: boolean;
}

const ChannelPanel = ({ channel }: { channel: Channel }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providerName, setProviderName] = useState<string>(PROVIDERS[channel][0].id);
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("otp-providers-manage", {
      body: { action: "list", channel },
    });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows(((data as any)?.rows || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [channel]);

  const def = PROVIDERS[channel].find((p) => p.id === providerName)!;

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("otp-providers-manage", {
      body: { action: "create", channel, provider_name: providerName, config_json: cfg },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast({ title: "Save failed", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    setCfg({});
    load();
  };

  const toggleActive = async (row: ProviderRow) => {
    const { data, error } = await supabase.functions.invoke("otp-providers-manage", {
      body: { action: "toggle", id: row.id, channel, activate: !row.is_active },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Failed", description: (data as any)?.error || error?.message, variant: "destructive" });
    }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this provider config?")) return;
    await supabase.functions.invoke("otp-providers-manage", { body: { action: "delete", id } });
    load();
  };

  const sendTest = async () => {
    if (!testTo) { toast({ title: "Enter a recipient", variant: "destructive" }); return; }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("phone-otp-send", { body: { recipient: testTo, channel } });
    setTesting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Test failed", description: (data as any)?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Test OTP sent", description: `Check ${testTo}` });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add {channel.toUpperCase()} provider</CardTitle>
          <CardDescription>Multiple providers add kar sakte hain — sirf ek time par ek active ho sakta hai.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Provider</Label>
            <Select value={providerName} onValueChange={(v) => { setProviderName(v); setCfg({}); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS[channel].map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {def.fields.map((f) => f.key === "_note" ? (
            <p key={f.key} className="text-sm text-muted-foreground">{f.label}</p>
          ) : (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <Input
                type={f.type || "text"}
                placeholder={f.placeholder}
                value={cfg[f.key] || ""}
                onChange={(e) => setCfg({ ...cfg, [f.key]: sanitizeKey(e.target.value) })}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData("text");
                  setCfg({ ...cfg, [f.key]: sanitizeKey(pasted) });
                }}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ))}
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save provider
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured providers</CardTitle>
          <CardDescription>Toggle karke kisi ek ko active rakhein.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Koi provider configured nahi hai.</p>
          ) : rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{r.provider_name}</span>
                  {r.is_active && <Badge>Active</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{Object.keys(r.config_json || {}).join(", ") || "no fields"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send test OTP</CardTitle>
          <CardDescription>
            Active provider use hoga. {channel === "email" ? "Email address" : "Phone number (+91XXXXXXXXXX)"} daalein.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder={channel === "email" ? "you@example.com" : "+919999999999"} />
          <Button onClick={sendTest} disabled={testing}>
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const AdminAuthProviders = () => {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-primary">Auth Providers</h1>
        <p className="text-muted-foreground">SMS, WhatsApp aur Email OTP providers ko configure aur test karein.</p>
      </div>
      <Tabs defaultValue="sms">
        <TabsList>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>
        <TabsContent value="sms"><ChannelPanel channel="sms" /></TabsContent>
        <TabsContent value="whatsapp"><ChannelPanel channel="whatsapp" /></TabsContent>
        <TabsContent value="email"><ChannelPanel channel="email" /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAuthProviders;
