
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
   * Fixes HTML using a "Patching Strategy" to avoid JSON truncation errors.
   * Instead of the full HTML, we ask for specific selectors and their fixes.
   */
  static async fixHtml(originalHtml: string): Promise<FixResult> {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `You are a specialized Accessibility Remediation Engine.
    Instead of returning the whole HTML, you must identify specific elements that need fixing and return an array of patches.
    For each patch, provide a CSS selector that uniquely identifies the element in the provided HTML and the new, corrected HTML snippet for that element.`;

    const prompt = `
      Analyze the provided HTML for accessibility violations (WCAG 2.1 AA).
      Return a JSON object with an array of "appliedFixes".
      
      Each fix object must contain:
      1. "selector": A unique CSS selector to find the element (e.g., "img[src*='hero']", "button.submit", "h2:nth-of-type(2)").
      2. "category": "Design", "Content", or "Development".
      3. "description": What was fixed.
      4. "snippetBefore": The original HTML of the element.
      5. "snippetAfter": The corrected HTML of the element.

      Input HTML:
      ${originalHtml}
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
      
      // Cleanup common model formatting artifacts
      text = text.replace(/^```json/, "").replace(/```$/, "").trim();

      try {
        const rawResult = JSON.parse(text);
        const patches = rawResult.appliedFixes || [];
        
        // Apply patches to the original HTML locally
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
          } catch (selectorError) {
            console.warn(`Could not apply patch for selector: ${patch.selector}`, selectorError);
          }
        });

        return {
          fixedHtml: doc.documentElement.outerHTML,
          appliedFixes: patches
        };
      } catch (parseError) {
        console.error("Failed to parse AI patches:", text);
        // Fallback: try to find any valid JSON structure if the model added text around it
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const fixedJson = JSON.parse(jsonMatch[0]);
            // Recurse once with fixed JSON if found
            return this.applyPatches(originalHtml, fixedJson.appliedFixes || []);
          } catch (innerError) {
            throw new Error("AI response was malformed and couldn't be recovered.");
          }
        }
        throw new Error("The AI remediation response was invalid.");
      }
    } catch (e) {
      console.error("Gemini Fix Error:", e);
      throw e;
    }
  }
  private static applyPatches(originalHtml: string, patches: any[]): FixResult {
    const parser = new DOMParser();
    const doc = parser.parseFromString(originalHtml, 'text/html');
    patches.forEach((patch: any) => {
      try {
        const element = doc.querySelector(patch.selector);
        if (element) {
          element.outerHTML = patch.snippetAfter;
        }
      } catch (e) {}
    });
    return {
      fixedHtml: doc.documentElement.outerHTML,
      appliedFixes: patches
    };
  }
}
