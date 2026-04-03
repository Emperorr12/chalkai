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
  "narration_script": "A longer, natural narration script (4-6 sentences) that Mr. White would speak aloud while teaching this concept with visuals. Written conversationally, as if lecturing at a whiteboard. Include pauses indicated by '...' for dramatic effect.",
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
topic_detected: always identify the specific topic — this is used to track the student's learning profile.

NARRATION SCRIPT RULES:
- The narration_script should be a natural, conversational version of the lesson — as if Mr. White is speaking to a student while drawing on the whiteboard.
- It should cover the same content as "message" but expanded for voice delivery.
- Include references to what's being drawn: "Let me show you on the board...", "See this line here?", "Notice how..."
- Keep it under 200 words for a 60-90 second video.`;

async function callClaude(messages: any[], systemPrompt: string, apiKey: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Anthropic error:", response.status, errorText);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  return await response.json();
}

async function generateHeyGenVideo(narrationScript: string, topic: string, heygenApiKey: string): Promise<string> {
  // Step 1: Create the video
  const createResponse = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": heygenApiKey,
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: "Daisy-inskirt-20220818",
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: narrationScript,
            voice_id: "QngvLQR8bsLR5bzoa6Vv",
          },
          background: {
            type: "color",
            value: "#1E2D3A",
          },
        },
      ],
      dimension: {
        width: 1280,
        height: 720,
      },
      test: false,
    }),
  });

  if (!createResponse.ok) {
    const errBody = await createResponse.text();
    console.error("HeyGen create error:", createResponse.status, errBody);
    throw new Error(`HeyGen video creation failed: ${createResponse.status} - ${errBody}`);
  }

  const createData = await createResponse.json();
  const videoId = createData.data?.video_id;

  if (!videoId) {
    throw new Error("HeyGen did not return a video_id");
  }

  console.log(`HeyGen video created: ${videoId}, polling for completion...`);

  // Step 2: Poll for completion (max 3 minutes)
  const maxAttempts = 36; // 36 * 5s = 180s
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusResponse = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      {
        headers: { "X-Api-Key": heygenApiKey },
      }
    );

    if (!statusResponse.ok) {
      console.error("HeyGen status check error:", statusResponse.status);
      continue;
    }

    const statusData = await statusResponse.json();
    const status = statusData.data?.status;

    console.log(`HeyGen poll attempt ${attempt + 1}: status=${status}`);

    if (status === "completed") {
      return statusData.data.video_url;
    }

    if (status === "failed") {
      throw new Error(`HeyGen video generation failed: ${statusData.data?.error || "unknown error"}`);
    }
  }

  throw new Error("HeyGen video generation timed out after 3 minutes");
}

function buildUserContent(
  question: string,
  contextPrefix: string,
  fileData?: string,
  fileType?: string,
  fileName?: string
): any[] {
  const userContent: any[] = [];

  if (fileData && fileType) {
    const isImage = fileType.startsWith("image/");
    const base64Match = fileData.match(/^data:([^;]+);base64,(.+)$/);

    if (base64Match) {
      if (isImage) {
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: base64Match[1], data: base64Match[2] },
        });
      } else if (fileType === "application/pdf") {
        userContent.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64Match[2] },
        });
      } else {
        const decoded = atob(base64Match[2]);
        userContent.push({
          type: "text",
          text: `[File: ${fileName || "uploaded file"}]\n\n${decoded}`,
        });
      }
    }
  }

  userContent.push({
    type: "text",
    text: `${contextPrefix}\n\nStudent question: ${question}\n\nRespond as Mr. White. Return raw JSON only.`,
  });

  return userContent;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      question, subject, history, confusion_detected,
      is_first_question, file_data, file_type, file_name,
      student_profile, generate_video,
    } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");

    // Build context prefix
    let contextPrefix = `Subject: ${subject || "General"}`;
    if (is_first_question) contextPrefix += " | First question in session";
    if (confusion_detected) contextPrefix += " | Student seems confused — try a completely different angle";
    if (student_profile) contextPrefix += ` | ${student_profile}`;

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

    const userContent = buildUserContent(question, contextPrefix, file_data, file_type, file_name);
    messages.push({ role: "user", content: userContent });

    // Step 1: Claude generates the lesson
    const data = await callClaude(messages, SYSTEM_PROMPT, ANTHROPIC_API_KEY);
    const rawText = data.content[0].text;

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        message: rawText,
        narration_script: rawText,
        mr_white_state: "talking",
        whiteboard: { active: false, type: "none", title: "", elements: [] },
        quick_chips: ["Explain it simpler", "Go deeper", "Show me an example", "Quiz me"],
      };
    }

    // Step 2: If video generation requested, send to HeyGen
    if (generate_video) {
      const HEYGEN_API_KEY = Deno.env.get("HEYGEN_API_KEY");
      if (!HEYGEN_API_KEY) {
        console.warn("HEYGEN_API_KEY not set, skipping video generation");
        parsed.video_url = null;
        parsed.video_error = "Video generation not configured";
      } else {
        try {
          const narration = parsed.narration_script || parsed.message;
          const topic = parsed.topic_detected || question;
          const videoUrl = await generateHeyGenVideo(narration, topic, HEYGEN_API_KEY);
          parsed.video_url = videoUrl;
        } catch (videoErr) {
          console.error("HeyGen video error:", videoErr);
          parsed.video_url = null;
          parsed.video_error = videoErr instanceof Error ? videoErr.message : "Video generation failed";
        }
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
