
import { GoogleGenAI, Type } from "@google/genai";
import { AccessibilityIssue } from "../types";

export interface FixResult {
  fixedHtml: string;
  appliedFixes: {
    category: string;
    description: string;
    snippetBefore: string;
    snippetAfter: string;
    selector?: string;
    ruleId?: string;
  }[];
}

export class GeminiService {
  static async getRemediation(issue: AccessibilityIssue): Promise<string> {
    const apiKey = import.meta.env.VITE_API_KEY;
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

  /**
   * Fixes HTML using a "Targeted Patching Strategy".
   * Receives detected issues to ensure remediation specifically addresses reported violations.
   */
  static async fixHtml(originalHtml: string, issues: AccessibilityIssue[]): Promise<FixResult> {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    
    // Format issues for the prompt
    const issueSummary = issues.map(i => `- [${i.id}] ${i.help}: ${i.description}`).join('\n');

    const systemInstruction = `You are a specialized Accessibility Remediation Engine. 
    Your goal is to reduce the violation count to ZERO. 
    Focus specifically on the provided list of violations.
    Return a JSON object with 'appliedFixes' containing CSS selectors and the corrected HTML.
    Ensure 'snippetAfter' actually resolves the specific WCAG failure for that element.`;

    const prompt = `
      I have detected the following accessibility violations in my HTML:
      ${issueSummary}

      Input HTML:
      ${originalHtml}

      Please provide targeted fixes for these specific elements. 
      For each fix, return:
      1. "selector": CSS selector to find the element.
      2. "ruleId": The ID of the rule being fixed (e.g. 'color-contrast', 'SIA-R2').
      3. "category": "Design", "Content", or "Development".
      4. "description": Brief explanation of the fix.
      5. "snippetBefore": The original element HTML.
      6. "snippetAfter": The corrected element HTML that resolves the violation.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 1024 },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              appliedFixes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    selector: { type: Type.STRING },
                    ruleId: { type: Type.STRING },
                    category: { type: Type.STRING },
                    description: { type: Type.STRING },
                    snippetBefore: { type: Type.STRING },
                    snippetAfter: { type: Type.STRING }
                  },
                  required: ["selector", "category", "description", "snippetBefore", "snippetAfter"]
                }
              }
            },
            required: ["appliedFixes"]
          }
        }
      });
      
      let text = response.text?.trim() || "";
      text = text.replace(/^```json/, "").replace(/```$/, "").trim();

      const rawResult = JSON.parse(text);
      const patches = rawResult.appliedFixes || [];
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(originalHtml, 'text/html');
      
      patches.forEach((patch: any) => {
        try {
          const element = doc.querySelector(patch.selector);
          if (element) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = patch.snippetAfter.trim();
            const newNode = tempDiv.firstElementChild;
            if (newNode) {
              element.replaceWith(newNode);
            }
          }
        } catch (e) {}
      });

      return {
        fixedHtml: doc.documentElement.outerHTML,
        appliedFixes: patches
      };
    } catch (e) {
      console.error("Gemini Targeted Fix Error:", e);
      throw e;
    }
  }
}
