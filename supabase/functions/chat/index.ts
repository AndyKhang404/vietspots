// Disable TypeScript checking in this Deno function file to avoid IDE/tsserver
// resolving remote std modules which can produce false-positive errors locally.
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    // Pick the last user message as the prompt for the backend chat
    const lastUser = (Array.isArray(messages) ? [...messages].reverse().find(m => m.role === 'user') : null)?.content || '';

    console.log('Proxying chat request to VietSpot backend, prompt length:', lastUser.length);

    const response = await fetch('https://vietspotbackend-production.up.railway.app/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: lastUser,
        session_id: undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend chat error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Lỗi kết nối backend chat' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
