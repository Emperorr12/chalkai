import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subject, topics, examDate, quizResults } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const today = new Date().toISOString().split("T")[0];
    const daysUntilExam = Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000));

    const topicList = topics
      .map((t: { name: string; confidence: number }) => `- ${t.name} (confidence: ${t.confidence}/5)`)
      .join("\n");

    const quizContext = quizResults && quizResults.length > 0
      ? `\n\nRecent quiz performance:\n${quizResults.map((q: { topic: string; score: number; date: string }) => `- ${q.topic}: ${q.score}% on ${q.date}`).join("\n")}`
      : "";

    const systemPrompt = `You are Mr. White, an expert study planner. Generate a structured daily study plan for a student preparing for an exam.

Return ONLY valid JSON with this exact structure:
{
  "dailyPlan": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "sessions": [
        {
          "topic": "Topic name",
          "activity": "Brief description of what to study/practice",
          "duration_minutes": 30,
          "type": "learn" | "review" | "practice" | "quiz"
        }
      ],
      "focus": "Main focus for the day"
    }
  ],
  "summary": {
    "weak_topics": ["topic1", "topic2"],
    "strong_topics": ["topic3"],
    "strategy": "Brief overall strategy description"
  },
  "todayPlan": {
    "totalMinutes": 90,
    "sessions": [
      {
        "topic": "Topic name",
        "activity": "What to do",
        "duration_minutes": 30,
        "type": "learn" | "review" | "practice" | "quiz"
      }
    ],
    "motivation": "A short encouraging message from Mr. White"
  }
}

Rules:
- Weak topics (confidence 1-2) get 2-3x more time than strong topics
- Strong topics (4-5) get spaced review every 3-4 days
- Include practice/quiz sessions for medium topics (3)
- Last 2 days before exam: review everything, no new material
- Keep daily study time between 60-120 minutes
- Vary activities to prevent burnout`;

    const userPrompt = `Subject: ${subject}
Exam date: ${examDate} (${daysUntilExam} days from today: ${today})

Topics and confidence levels:
${topicList}${quizContext}

Generate a complete study plan from today until the exam date. Focus today's plan on the most impactful activities.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(rawText);
    } catch {
      // Try extracting from code fences
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error("Failed to parse study plan response");
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-study-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
