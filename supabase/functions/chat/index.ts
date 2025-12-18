import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing chat request with', messages.length, 'messages');

    const systemPrompt = `Bạn là VietSpots Bot - trợ lý du lịch Việt Nam thông minh và nhiệt tình. 

Nhiệm vụ của bạn:
- Gợi ý địa điểm du lịch phù hợp với sở thích người dùng
- Cung cấp thông tin chi tiết về các điểm đến (địa chỉ, thời gian tham quan tốt nhất, chi phí ước tính)
- Tư vấn lịch trình, ẩm thực địa phương, và mẹo du lịch
- Luôn thân thiện, sử dụng emoji phù hợp 🎒🏖️🏔️

Khi gợi ý địa điểm, hãy format như sau:
📍 **Tên địa điểm** - Tỉnh/Thành phố
   Mô tả ngắn gọn về địa điểm
   
Luôn trả lời bằng tiếng Việt, ngắn gọn và hữu ích.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Hết hạn mức sử dụng AI, vui lòng nạp thêm credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Lỗi kết nối AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Streaming response from AI gateway');

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
