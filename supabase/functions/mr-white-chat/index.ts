import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
- You end responses with either a bridging question, a surprising fact, or a clear here is what to remember.

STUDENT PROFILE CONTEXT:
When a student profile summary is provided, USE it to personalize your response:
- Reference their strengths naturally ("Since you're solid on algebra, let's connect this...")
- Be extra patient with their weak topics — try different angles
- Remind them to review topics they haven't seen in a while
- Celebrate streaks and progress

ALWAYS return raw JSON only. No markdown. No code fences. Just the JSON:
{
  "message": "Your response. 3-4 sentences. Warm, specific, conversational.",
  "mr_white_state": "talking",
  "topic_detected": "the specific topic being discussed",
  "whiteboard": {
    "active": true,
    "type": "equation|diagram|graph|timeline|list|comparison|none",
    "title": "Short whiteboard heading",
    "elements": []
  },
  "quick_chips": ["Show me an example", "Explain it simpler", "Go deeper", "Quiz me"]
}

WHITEBOARD ELEMENTS — You can draw actual SVG graphics on the whiteboard. Use these element kinds:

The SVG canvas is 640x400 pixels. Place elements using these coordinates.

kind: "text" — chalk-style text label
  content: the text to display (placed at auto-layout Y position)
  Example: {"kind":"text","content":"F = ma","color":"blue","delay_seconds":0.0}

kind: "line" — a straight line between two points
  content: "x1,y1 to x2,y2" — optionally add "arrow" to show arrowhead
  Example: {"kind":"line","content":"100,200 to 500,200 arrow","color":"blue","delay_seconds":0.4}

kind: "arrow" — shorthand for a line with arrowhead and optional label
  content: "x1,y1 to x2,y2 Label Text"
  Example: {"kind":"arrow","content":"100,180 to 400,180 Force","color":"red","delay_seconds":0.8}

kind: "curve" — a bezier/quadratic curve
  content: SVG path data starting with M, or "x1,y1 cx,cy x2,y2" for a quadratic curve
  Example: {"kind":"curve","content":"50,300 320,100 590,300","color":"blue","delay_seconds":0.4}

kind: "circle" — a circle with optional label
  content: "cx,cy radius label"
  Example: {"kind":"circle","content":"320,200 50 Nucleus","color":"red","delay_seconds":0.4}

kind: "rect" — a labeled rectangle
  content: "x,y width height label"
  Example: {"kind":"rect","content":"100,120 180 60 Input","color":"blue","delay_seconds":0.4}

kind: "axis" — draws x/y axes with tick marks
  content: "xLabel,yLabel"
  Example: {"kind":"axis","content":"Time (s),Velocity (m/s)","color":"blue","delay_seconds":0.0}

kind: "point" — a filled dot at coordinates with label
  content: "x,y label"
  Example: {"kind":"point","content":"250,150 (2, 4)","color":"red","delay_seconds":1.2}

kind: "path" — raw SVG path data for complex shapes
  content: any valid SVG d attribute
  Example: {"kind":"path","content":"M100 300 Q200 100 300 300 Q400 500 500 300","color":"blue","delay_seconds":0.4}

CRITICAL VISUAL RULE: For any math or science question you MUST include at least one axis, curve, circle, or diagram element. Text-only whiteboards are never acceptable for visual concepts.

Minimum elements required per topic:
- Derivative/calculus: axis + curve + point + text
- Physics/forces: rect (object) + arrow + text label
- Chemistry: circle elements (atoms) + line (bonds)
- Graphs/data: axis + curve or line + point labels
- Processes: rect boxes + arrow connections + labels

Never return only text elements for math or science topics. Always draw something.

WHITEBOARD RULES:
- Use coordinates within the 640x400 canvas.
- For graphs: start with "axis", then add "curve"/"line"/"point" elements on top.
- For diagrams: use "rect" for boxes, "arrow" for connections, "text" for labels.
- For equations: use "text" elements — they auto-layout vertically.
- For processes/flows: chain "rect" boxes with "arrow" connections between them.
- Stagger delay_seconds by 0.4s per element for progressive drawing animation.
- ALWAYS set whiteboard.active = true for math, science, processes, or any concept that benefits from visual explanation.
- Color options: blue (default), white (dark text), red (emphasis), green (positive/correct), yellow (highlight/warning).

mr_white_state options: talking, thinking, excited, celebrating, drawing
topic_detected: always identify the specific topic — this is used to track the student's learning profile.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question, subject, history, confusion_detected, is_first_question, file_data, file_type, file_name, student_profile } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set in Supabase secrets");
    }

    // Build context
    let contextPrefix = `Subject: ${subject || "General"}`;
    if (is_first_question) contextPrefix += " | First question in session";
    if (confusion_detected) {
      contextPrefix += " | Student seems confused — try a completely different angle";
    }
    if (student_profile) {
      contextPrefix += ` | ${student_profile}`;
    }

    // Build conversation history
    const messages: Array<{ role: string; content: any }> = [];

    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-6)) {
        messages.push({
          role: msg.role === "student" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }

    // Build current user message content blocks
    const userContent: any[] = [];
    
    if (file_data && file_type) {
      const isImage = file_type.startsWith("image/");
      
      if (isImage) {
        // Extract base64 from data URL
        const base64Match = file_data.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          userContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: base64Match[1],
              data: base64Match[2],
            },
          });
        }
      } else {
        // For documents (PDF, text, etc.) — extract text content
        const base64Match = file_data.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          if (file_type === "application/pdf") {
            // Send PDF as document to Claude
            userContent.push({
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Match[2],
              },
            });
          } else {
            // Text-based files — decode and send as text
            const decoded = atob(base64Match[2]);
            userContent.push({
              type: "text",
              text: `[File: ${file_name || "uploaded file"}]\n\n${decoded}`,
            });
          }
        }
      }
    }

    // Add the question text
    userContent.push({
      type: "text",
      text: `${contextPrefix}\n\nStudent question: ${question}\n\nRespond as Mr. White. Return raw JSON only.`,
    });

    messages.push({
      role: "user",
      content: userContent,
    });

    // Call Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic error:", response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.content[0].text;

    // Parse JSON response from Mr. White
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      // Fallback if Claude returns something unexpected
      parsed = {
        message: rawText,
        mr_white_state: "talking",
        whiteboard: {
          active: false,
          type: "none",
          title: "",
          elements: [],
        },
        quick_chips: ["Explain it simpler", "Go deeper", "Show me an example", "Quiz me"],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    console.error("mr-white-chat error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
        message: "Hmm, I hit a snag. Let's try that again?",
        mr_white_state: "thinking",
        whiteboard: { active: false, type: "none", title: "", elements: [] },
        quick_chips: ["Try again", "Ask something else"],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
