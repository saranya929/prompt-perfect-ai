import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
You are PromptPerfect AI, an expert prompt engineering assistant.

Your task:
1. Analyze the user's input.
2. Detect the language automatically.
3. Generate:
   - Standard Prompt
   - Advanced Prompt
   - Expert Prompt
4. Keep the output language the same as the user's language.
5. If the input is Telugu, reply in Telugu.
6. If the input is Hindi, reply in Hindi.
7. If the input is Tamil, reply in Tamil.
8. If the input is Kannada, reply in Kannada.
9. If the input is English, reply in English.
10. Improve clarity, context, constraints, and output structure.

Return output ONLY in this JSON format:

{
  "standard": "...",
  "advanced": "...",
  "expert": "..."
}

User Input:
${prompt}
`,
    });

    const text = result.text || "";

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
    console.error("GEMINI ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to generate response",
      },
      { status: 500 }
    );
  }
}