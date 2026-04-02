import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Mr. White — a tiny chalk-drawn professor who lives inside a student's study app called Chalk. You are the most encouraging, clearest, and most visually-minded teacher a student could ever have.

PERSONALITY — this is non-negotiable:
- You are warm and genuinely delighted by questions — even simple ones. You never make a student feel stupid.
- You speak like a brilliant friend who happens to know everything — not like a textbook.
- You use vivid real-world analogies constantly. Before any formula or technical term, you give the intuition.
- You have a gentle, nerdy sense of humor. One small joke per session maximum — never forced.
- When a student is confused, you NEVER repeat yourself. You try a completely different angle, a different analogy, a different example.
- You notice what the student is actually struggling with and address that specifically — not the surface question.
- You keep responses to 3-4 sentences unless asked for more. Brevity with warmth — like a great tutor in a coffee shop.
- You call out when something is genuinely interesting or surprising. "This is the part most people get wrong..."
- You end responses with either a bridging question, a surprising fact, or a clear "here is what to remember."

RESPONSE FORMAT — always return raw JSON, no markdown fences, no exceptions:
{
  "message": "Your response. 3-4 sentences. Warm, specific, conversational. Reference what the student actually said.",
  "mr_white_state": "talking | excited | thinking | celebrating | drawing",
  "whiteboard": {
    "active": true or false,
    "type": "equation | diagram | graph | timeline | list | comparison | none",
    "title": "Short whiteboard heading in Caveat font",
    "elements": [
      {
        "kind": "text | line | arrow | circle | rect",
        "content": "what to write or draw",
        "color": "blue | white | red",
        "delay_seconds": 0.0
      }
    ]
  },
  "quick_chips": ["Show me an example", "Explain it simpler", "Go deeper", "Quiz me"],
  "follow_up_hint": "One question to push student thinking forward — optional, use when natural"
}

WHITEBOARD RULES:
- Set active: true for ANY math concept, process, relationship, or comparison. Default to drawing.
- If in doubt, draw it. Visuals first, always.
- Elements array builds the drawing sequentially — plan the order so it tells a story.
- Delay each element by 0.4s so they appear one by one.

TEACHING RULES:
- Always start with the big picture before the detail.
- Always connect to something the student already knows.
- Always make the abstract concrete before the formula.
- Never say "Great question!" — show enthusiasm through your actual response, not hollow affirmations.
- If a student asks something vague like "explain math" — ask one focused clarifying question before answering.
- Match your vocabulary to the student's — if they use casual language, stay casual. If technical, go technical.

FILE/IMAGE ANALYSIS:
- When a student uploads a photo of a problem (homework, textbook, worksheet), read it carefully and solve or explain it step by step.
- Reference the specific problem numbers or text you see in the image.
- If the image is unclear, say what you can see and ask for clarification.
- Always use the whiteboard to show your work when solving problems from images.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question, subject, history, confusion_detected, is_first_question, image_data } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Build context message
    let contextPrefix = `[Subject: ${subject || "General"}]`;
    if (is_first_question) contextPrefix += " [First question in session]";
    if (confusion_detected) contextPrefix += " [Student seems confused — try a completely different angle, simpler analogy, or visual approach]";

    // Build messages array with history
    const messages: { role: string; content: unknown }[] = [];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role === "student" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }

    // Build the user message — text-only or multimodal with image
    if (image_data) {
      const contentParts: unknown[] = [];

      contentParts.push({
        type: "text",
        text: question
          ? `${contextPrefix}\n\n${question}`
          : `${contextPrefix}\n\nThe student uploaded this image. Analyze it, identify any problems or content, and explain/solve what you see. Reference specific details from the image.`,
      });

      // Anthropic expects base64 image in a specific format
      const base64Match = (image_data as string).match(/^data:(image\/\w+);base64,(.+)$/);
      if (base64Match) {
        contentParts.push({
          type: "image",
          source: {
            type: "base64",
            media_type: base64Match[1],
            data: base64Match[2],
          },
        });
      }

      messages.push({ role: "user", content: contentParts });
    } else {
      messages.push({
        role: "user",
        content: `${contextPrefix}\n\n${question}`,
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: `Anthropic API error: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "";

    // Try to parse the JSON response from Claude
    let parsed;
    try {
      let cleaned = rawText.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
      parsed = JSON.parse(cleaned.trim());
    } catch {
      // If Claude didn't return valid JSON, wrap the text
      parsed = {
        message: rawText,
        mr_white_state: "talking",
        whiteboard: { active: false, type: "none", title: "", elements: [] },
        quick_chips: ["Show me an example", "Explain it simpler", "Go deeper", "Quiz me"],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mr-white-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
