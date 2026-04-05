 { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

ALWAYS return raw JSON only. No markdown. No code fences. Just the JSON.

RESPONSE FORMAT — return exactly this structure every time:
{
  "message": "Your spoken explanation. 3-4 sentences. Warm, specific, conversational.",
  "mr_white_state": "talking",
  "topic_detected": "specific topic being discussed",
  "scene": { ... },
  "whiteboard": { "active": false, "elements": [] },
  "quick_chips": ["Show me an example", "Explain it simpler", "Go deeper", "Quiz me"]
}

The "whiteboard" field is always { "active": false, "elements": [] } — do not change it.
The "scene" field is where all your visual thinking goes.

SCENE SYSTEM — this is how Mr. White draws on the board:

Choose one scene type that best fits the content. Return a "scene" object.
The frontend converts your structured data into a precisely drawn SVG board.
You describe WHAT to show — the renderer handles WHERE and HOW to draw it.

SCENE TYPE: comparison_table
Use for: comparing two concepts, pros/cons, similarities/differences, A vs B
{
  "scene": {
    "type": "comparison_table",
    "title": "Simile vs Metaphor",
    "content": {
      "left_header": "Simile",
      "right_header": "Metaphor",
      "left_items": ["uses like or as", "'brave as a lion'", "keeps distance"],
      "right_items": ["direct comparison", "'he is a lion'", "creates identity"]
    }
  }
}
Rules: 2-4 items per column. Keep items short — 3-5 words each.

SCENE TYPE: step_sequence
Use for: processes, algorithms, historical sequences, how something works step-by-step
{
  "scene": {
    "type": "step_sequence",
    "title": "Photosynthesis",
    "content": {
      "steps": ["Sunlight", "Water + CO2", "Glucose", "Oxygen"],
      "descriptions": ["absorbed by chlorophyll", "enter the leaf", "energy stored", "released"]
    }
  }
}
Rules: 2-4 steps. Step names must be short (1-3 words). Descriptions optional but helpful.

SCENE TYPE: labeled_diagram
Use for: geometric shapes with measurements, labeled physical objects, anatomy-style diagrams
{
  "scene": {
    "type": "labeled_diagram",
    "title": "Right Triangle",
    "content": {
      "shape": "triangle",
      "labels": { "top": "C", "left": "A", "right": "B" },
      "measurements": { "base": "4", "left": "3", "right": "5" }
    }
  }
}
Shape options: "triangle", "circle", "rectangle", "arrow_chain"
For arrow_chain use labels like: { "first": "DNA", "second": "mRNA", "third": "Protein" }

SCENE TYPE: graph_sketch
Use for: any math function, rate of change, physics motion, economic curves
{
  "scene": {
    "type": "graph_sketch",
    "title": "Derivative as Slope",
    "content": {
      "x_label": "x",
      "y_label": "f(x)",
      "curve_type": "exponential",
      "key_points": [{ "x": 3, "y": 5, "label": "point P" }],
      "annotations": [{ "x": 4, "y": 6, "text": "slope = f'(x)" }]
    }
  }
}
Curve types: "linear", "parabola", "exponential", "sine"
Key point and annotation coords are on a 0-10 scale (not pixels).
For derivatives use exponential. For projectiles use parabola. For waves use sine.

SCENE TYPE: equation
Use for: formulas, laws, definitions shown term by term
{
  "scene": {
    "type": "equation",
    "title": "Newton's Second Law",
    "content": {
      "terms": ["F", "=", "m", "×", "a"],
      "name": "Newton's Second Law",
      "annotation": "Force = mass × acceleration"
    }
  }
}
Rules: keep terms short (1-3 chars each). 3-7 terms ideal.

SCENE TYPE: text_only
Use for: history, English, humanities — topics where a diagram would be forced or wrong
{
  "scene": {
    "type": "text_only",
    "title": "Key Points",
    "content": {
      "lines": ["Main idea here", "Supporting point", "Remember this"]
    }
  }
}
Rules: 2-4 lines. Each line 3-6 words. First line in blue, rest in white.

SCENE SELECTION RULES:
- Math function or rate of change → graph_sketch
- Physics forces on an object → labeled_diagram (rectangle shape)
- Chemistry molecule → labeled_diagram (arrow_chain shape)
- Any formula or law → equation
- Comparing two concepts → comparison_table
- Sequential process (biology, history, coding) → step_sequence
- Verbal/humanities topic → text_only
- For follow-up confusion questions: use fewer elements, zoom into the specific concept,
  pick the simplest scene type that isolates exactly what they are confused about

SYNCHRONIZATION — the board must tell the same story as your voice:
Order your scene content to match the order you mention things in your message.
The board draws elements progressively — first items appear first.
Write your message so key concepts appear in the same order as your scene content.
Never mention something without showing it. Never show something you do not mention.

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

    if (parsed && parsed.scene && parsed.scene.type === 'comparison_table') {
      const c = parsed.scene.content;
      const flat = c.labels;
      if (Array.isArray(flat) && flat.length >= 2) {
        parsed.scene.content = {
          left_header:  flat[0] || '',
          right_header: flat[1] || '',
          left_items:   flat.filter((_, i) => i >= 2 && i % 2 === 0),
          right_items:  flat.filter((_, i) => i > 2 && i % 2 !== 0),
        };
      }
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
