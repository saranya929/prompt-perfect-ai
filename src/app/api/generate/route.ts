import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "system",
          content: `
You are PromptPerfect AI, an expert prompt engineering assistant.

Your task:
1. Analyze the user's input.
2. Detect the language automatically.
3. Generate:
   - Standard Prompt
   - Advanced Prompt
   - Expert Prompt
4. Keep the output language the same as the user's language.
5. Improve clarity, context, constraints, and output structure.

IMPORTANT:
- Return ONLY valid JSON.
- Do not use markdown.
- Do not use \`\`\`json blocks.
- Do not add explanations before or after JSON.

Return output ONLY in this format:

{
  "standard": "...",
  "advanced": "...",
  "expert": "...",
  "score": 0,
  "scoreBreakdown": [
    {
      "label": "Clarity",
      "value": 0,
      "max": 20
    }
  ],
  "followUps": [],
  "missing": []
}
`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],

      temperature: 0.7,
      max_tokens: 4000,
    });

    const text =
      completion.choices?.[0]?.message?.content || "";

    console.log("GROQ RESPONSE:", text);

    return NextResponse.json({
      choices: [
        {
          message: {
            content: text,
          },
        },
      ],
    });
  } catch (error) {
    console.error("GROQ ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to generate response",
      },
      { status: 500 }
    );
  }
}
