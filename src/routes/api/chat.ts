import { createFileRoute } from "@tanstack/react-router";
import { searchPropertiesServer, type SearchFilters } from "@/lib/properties.functions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Msg = { role: "user" | "assistant"; content: string };
type ReqBody = { messages: Msg[]; filters?: SearchFilters; sessionId?: string | null };

// Local, rule-based keyword extraction for filters (No AI needed)
function localExtractFilters(text: string, prev: SearchFilters): SearchFilters {
  const t = text.toLowerCase();
  const next = { ...prev };
  
  // Known Areas
  const areas = ["Asok", "Thonglor", "Phrom Phong", "Ekkamai", "Bang Na", "Silom", "Sathorn", "Siam", "Chidlom", "Ari", "Kaset", "Lat Phrao", "Ratchada", "Huai Khwang", "Bang Sue", "Chatuchak", "Ramkhamhaeng", "Bang Kapi", "Thonburi", "Bang Rak", "Pinklao", "On Nut", "Udom Suk", "Rangsit"];
  for (const a of areas) {
    if (t.includes(a.toLowerCase())) next.area = a;
  }
  
  // Property Types
  if (t.includes("condo") || t.includes("apartment")) next.propertyType = "condo";
  if (t.includes("house") || t.includes("home")) next.propertyType = "house";
  if (t.includes("townhouse")) next.propertyType = "townhouse";
  if (t.includes("commercial")) next.propertyType = "commercial";
  
  // Listing Types
  if (t.includes("rent") || t.includes("rental")) next.listingType = "rent";
  if (t.includes("sale") || t.includes("buy")) next.listingType = "sale";
  
  // Price (e.g. "under 50k", "< 80000")
  const maxPriceMatch = t.match(/under\s*(\d+)k?/i) || t.match(/<\s*(\d+)k?/i) || t.match(/max\s*(\d+)k?/i);
  if (maxPriceMatch) {
    let val = parseInt(maxPriceMatch[1], 10);
    if (t.includes(maxPriceMatch[1] + "k") || val < 1000) val *= 1000;
    next.maxPrice = val;
  }

  // Bedrooms
  const bedMatch = t.match(/(\d+)\s*bed/i);
  if (bedMatch) {
    next.bedrooms = parseInt(bedMatch[1], 10);
  }
  
  // Proximity tags
  if (t.includes("bts") || t.includes("mrt") || t.includes("transit") || t.includes("train")) next.nearTransit = true;
  if (t.includes("university") || t.includes("chula") || t.includes("kaset")) next.nearUniversity = true;
  if (t.includes("mall") || t.includes("shopping") || t.includes("paragon") || t.includes("iconsiam")) next.nearMall = true;
  
  // Reset keywords
  if (t.includes("clear") || t.includes("reset") || t.includes("any")) {
    return {};
  }

  return next;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as ReqBody;
          const messages = body.messages ?? [];
          const prevFilters: SearchFilters = body.filters ?? {};
          const sessionId = body.sessionId ?? null;

          // 1. Maintain chat session in Supabase (if keys allow it)
          let activeSessionId = sessionId;
          if (!activeSessionId) {
            try {
              const { data: created } = await supabaseAdmin
                .from("chat_sessions")
                .insert({ questionnaire: {} })
                .select("id")
                .single();
              activeSessionId = created?.id ?? null;
            } catch (e) {
              console.warn("Could not create chat session (RLS or Key error). Continuing without DB logs.");
            }
          }

          // 2. Extract new filters using local rules
          const lastUser = [...messages].reverse().find((m) => m.role === "user");
          const userText = lastUser?.content ?? "";
          const newFilters = localExtractFilters(userText, prevFilters);

          // 3. Query properties
          const { properties, total } = await searchPropertiesServer({ ...newFilters, limit: 12 });

          // 4. Log user message to Supabase
          if (activeSessionId && lastUser) {
            try {
               await supabaseAdmin
                .from("chat_logs")
                .insert({ session_id: activeSessionId, role: "user", content: userText, filters_applied: newFilters as any });
            } catch (e) { /* noop */ }
          }

          // 5. Generate local rule-based text response
          let assistantText = "";
          if (properties.length === 0) {
            assistantText = "I couldn't find any exact matches for your request in our database. Try manually clearing some filters or searching a different area!";
          } else {
            assistantText = "Here are some of the best matches I found based on your request:\n\n" + 
              properties.slice(0, 3).map(p => `- **${p.name}** in ${p.area_name}: ฿${p.price.toLocaleString()}`).join("\n") + 
              "\n\nI've updated the map and filters with these results!";
          }

          // 6. Return standard SSE Stream so the frontend streamChat.ts works exactly as before
          const filtersEvent = `event: filters\ndata: ${JSON.stringify({ filters: newFilters, total, sessionId: activeSessionId })}\n\n`;
          
          const stream = new ReadableStream({
            start(controller) {
              const enc = new TextEncoder();
              
              // Send the filters immediately
              controller.enqueue(enc.encode(filtersEvent));
              
              // Simulate a short processing delay to mimic AI typing effect
              setTimeout(async () => {
                const chunks = assistantText.match(/.{1,15}(\s|$)/g) || [assistantText];
                for (const chunk of chunks) {
                  const textEvent = `data: ${JSON.stringify({choices: [{delta: {content: chunk}}]})}\n\n`;
                  controller.enqueue(enc.encode(textEvent));
                  await new Promise(r => setTimeout(r, 40));
                }
                
                controller.enqueue(enc.encode("data: [DONE]\n\n"));
                controller.close();
                
                // Log assistant message
                if (activeSessionId) {
                  try {
                    await supabaseAdmin
                      .from("chat_logs")
                      .insert({ session_id: activeSessionId, role: "assistant", content: assistantText, filters_applied: newFilters as any });
                  } catch (e) { /* noop */ }
                }
              }, 300);
            }
          });

          return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });

        } catch (e) {
          console.error("Local chat handler error", e);
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), { status: 500 });
        }
      },
    },
  },
});
