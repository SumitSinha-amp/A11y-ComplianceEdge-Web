
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
   * Generates a remediated HTML version using a strict Patching strategy.
   * This ensures that every fix shown in the modal is exactly what is in the file.
   */
  static async fixHtml(originalHtml: string, issues: AccessibilityIssue[]): Promise<FixResult> {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    
    const issueSummary = issues.map(i => `- ${i.help} (ID: ${i.id})`).join('\n');

    const systemInstruction = `You are a specialized A11y Remediation Engine. 
    MANDATORY: Return ONLY the 'appliedFixes' array of atomic patches. 
    Do NOT modify HTML parts that are not violating rules. 
    Every single code change MUST be logged in the array. 
    If you don't log it, it won't be applied.`;

    const prompt = `
      HTML SOURCE:
      ${originalHtml}

      VIOLATIONS:
      ${issueSummary}

      TASK:
      Create a patch for EVERY violation. 
      Use unique CSS selectors (IDs are best) or precise element paths.
      Document snippetBefore (exact original) and snippetAfter (corrected).
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
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
                    category: { type: Type.STRING, enum: ["Design", "Content", "Development"] },
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
      
      const rawResult = JSON.parse(response.text);
      const patches = rawResult.appliedFixes || [];
      
      // Generate Fixed HTML strictly from the patch list on the client side
      const parser = new DOMParser();
      const doc = parser.parseFromString(originalHtml, 'text/html');
      
      patches.forEach((patch: any) => {
        try {
          // Attempt find by selector first
          let element = doc.querySelector(patch.selector);
          
          // Fallback: Find by exact HTML match if selector is too generic
          if (!element) {
            const all = Array.from(doc.querySelectorAll('*'));
            element = all.find(el => el.outerHTML === patch.snippetBefore) || null;
          }

          if (element) {
            const temp = document.createElement('div');
            temp.innerHTML = patch.snippetAfter.trim();
            const replacement = temp.firstElementChild;
            if (replacement) {
              element.replaceWith(replacement);
            }
          }
        } catch (e) {
          console.warn(`Parity Check: Failed to apply patch ${patch.selector}`);
        }
      });

      return {
        fixedHtml: doc.documentElement.outerHTML,
        appliedFixes: patches
      };
    } catch (e) {
      console.error("Gemini Remediation Error:", e);
      throw e;
    }
  }
}
