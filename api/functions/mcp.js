// MCP function - Lovable MCP integration
// Note: This function uses Lovable-specific libraries that are not available in Node.js.
// In the Railway deployment, MCP is handled by the Supabase Edge Function directly.

const handler = async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }
  return new Response(
    JSON.stringify({ error: "MCP endpoint is served by Supabase Edge Functions" }),
    {
      status: 501,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
};

export default handler;
