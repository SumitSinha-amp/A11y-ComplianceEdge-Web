
import { GoogleGenAI, Type } from "@google/genai";
import { AccessibilityIssue } from "../types";

export interface FixResult {
  fixedHtml: string;
  appliedFixes: {
    category: string;
    description: string;
    snippetBefore: string;
    snippetAfter: string;
  }[];
}

export class GeminiService {
  static async getRemediation(issue: AccessibilityIssue): Promise<string> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "Gemini API key is required.";

    const ai = new GoogleGenAI({ apiKey });
    const node = issue.nodes[0];
    const prompt = `
      Act as an expert Accessibility Engineer.
      Analyze this issue in an AEM component:
      Rule: ${issue.help} (${issue.id})
      Description: ${issue.description}
      Snippet: \`${node?.html || 'N/A'}\`

      Provide:
      1. Precise diagnosis.
      2. Corrected code block.
      3. WCAG success criteria explanation.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "No response.";
    } catch (e) {
      return "AI Service error.";
    }
  }

  static async fixHtml(html: string): Promise<FixResult> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    
    // We use a specific system instruction to ensure the model focuses on valid JSON escaping
    const systemInstruction = `You are a specialized Accessibility Remediation Engine. 
    Your task is to take HTML and return a JSON object containing the fixed version.
    CRITICAL: The "fixedHtml" field must contain the entire provided HTML with your improvements applied.
    Ensure all special characters within the HTML strings are correctly escaped for JSON compatibility.
    Do not truncate the HTML.`;

    const prompt = `
      Analyze the provided HTML and apply common, high-confidence accessibility fixes for:
      1. Missing alt text for images.
      2. Missing form labels (use aria-label or associated labels).
      3. Incorrect heading sequences (skip levels).
      4. Missing lang attributes on <html> or containers.
      5. Basic ARIA improvements (roles, states).
      
      Input HTML:
      ${html}
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          // Increase token limits for large HTML files
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 1024 },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fixedHtml: { 
                type: Type.STRING,
                description: "The complete modified HTML string with all fixes applied."
              },
              appliedFixes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    description: { type: Type.STRING },
                    snippetBefore: { type: Type.STRING },
                    snippetAfter: { type: Type.STRING }
                  },
                  required: ["category", "description", "snippetBefore", "snippetAfter"]
                }
              }
            },
            required: ["fixedHtml", "appliedFixes"]
          }
        }
      });
      
      let text = response.text?.trim() || "";
      
      // Sanitization: Remove potential markdown wrappers if the model included them
      if (text.startsWith("```json")) {
        text = text.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (text.startsWith("```")) {
        text = text.replace(/^```/, "").replace(/```$/, "").trim();
      }

      try {
        return JSON.parse(text) as FixResult;
      } catch (parseError) {
        console.error("JSON Parse failed on text:", text.substring(0, 100) + "...");
        throw new Error("The AI response was malformed. This usually happens with very large HTML files exceeding output limits.");
      }
    } catch (e) {
      console.error("Gemini Fix Error:", e);
      throw e;
    }
  }
}
