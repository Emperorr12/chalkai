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
    "layout": "graph_single_curve",
    "title": "Short whiteboard heading",
    "labels": ["label1", "label2"],
    "colors": ["blue", "white"]
  },
  "quick_chips": ["Show me an example", "Explain it simpler", "Go deeper", "Quiz me"]
}

WHITEBOARD SYSTEM — use named layouts only.

Instead of specifying raw coordinates, return a layout name and labels array:

{
  "whiteboard": {
    "active": true,
    "layout": "graph_single_curve",
    "title": "What a Derivative Means",
    "labels": ["f(x)", "slope = f'(x)", "tangent line", "x", "y"],
    "colors": ["blue", "red", "yellow", "white", "white"]
  }
}

Available layouts:
- graph_single_curve: for any function graph. Labels: [curveLabel, pointLabel, slopeLabel, xAxisLabel, yAxisLabel]
- force_diagram: for physics force problems. Labels: [objectName, upForce, downForce, rightForce, equation]
- molecule_horizontal: for chemistry molecules. Labels: [atom1, atom2, atom3, moleculeName]
- process_three_steps: for any 3-step process. Labels: [step1, step2, step3, desc1, desc2, desc3]
- comparison_two_col: for comparing two things. Labels: [leftHeader, rightHeader, leftItem1, rightItem1, leftItem2, rightItem2, ...]
- equation_buildup: for showing a formula term by term. Labels: [term1, term2, term3, ..., result]

The frontend maps your layout choice to exact pixel-perfect coordinates automatically. You only choose the layout and provide labels. This eliminates all coordinate errors.

Color options for the colors array: blue (default), white, red, green, yellow.
ALWAYS set whiteboard.active = true for math, science, processes, or any concept that benefits from visual explanation.
Do NOT include an "elements" array — the frontend generates elements from the layout name and labels.

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
        max_tokens: 4000,
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
