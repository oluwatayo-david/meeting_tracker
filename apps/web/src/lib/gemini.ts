import { GoogleGenerativeAI } from "@google/generative-ai";
import { COPILOT_NAME } from '@/lib/brand';

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Cascade of active Gemini models
const GEMINI_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
];

export interface ExtractedActionPoint {
  title: string;
  description: string;
  suggestedAssignee: string;
  suggestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  suggestedDueDate: string;
  aiGuidance: string;
}

export interface MeetingExtractionResult {
  summary: string;
  actionItems: ExtractedActionPoint[];
}

/**
 * Execute a Gemini prompt with automatic model fallback cascade
 */
async function callGeminiCascade(prompt: string): Promise<string> {
  if (!genAI || !apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  let lastError: unknown = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (err: unknown) {
      lastError = err;
      console.warn(`[Gemini API] Model ${modelName} failed, trying next model in cascade...`);
    }
  }

  throw lastError || new Error("All Gemini models failed to respond.");
}

/**
 * Transcribe audio recording data (base64) using Gemini multimodal capabilities
 */
export async function transcribeAudioData(
  base64Data: string,
  mimeType: string = 'audio/webm'
): Promise<string> {
  if (!genAI || !apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const cleanBase64 = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
  const cleanMime = mimeType.split(';')[0]; // e.g. 'audio/webm', 'audio/mp3', 'audio/wav', 'audio/m4a'

  let lastError: unknown = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: cleanMime,
            data: cleanBase64,
          },
        },
        {
          text: "Transcribe this audio recording accurately word for word. If multiple speakers are speaking, label them as Speaker 1, Speaker 2, etc. (or with their actual names if mentioned). Return ONLY the transcription text without commentary.",
        },
      ]);
      const text = result.response.text();
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (err: unknown) {
      lastError = err;
      console.warn(`[Gemini Audio Transcription] Model ${modelName} failed, trying next...:`, err);
    }
  }

  throw lastError || new Error("Audio transcription failed with Gemini models.");
}

export async function extractMeetingInsights(
  transcript: string,
  meetingTitle: string
): Promise<MeetingExtractionResult> {
  try {
    const prompt = `You are an expert executive AI meeting assistant for enterprise teams.
Analyze the following meeting transcript for the meeting titled: "${meetingTitle}".

Your task:
1. Generate an accurate, comprehensive executive summary capturing key discussion points, context, and decisions.
2. Extract ALL actionable tasks and delegation points with specific assignees (identifying actual speaker names from the transcript), realistic due dates (format: YYYY-MM-DD), urgency priority (URGENT, HIGH, MEDIUM, or LOW), and detailed step-by-step guidance for completing each task.

Return STRICTLY valid JSON without commentary or markdown codeblocks in this structure:
{
  "summary": "Detailed executive summary of the meeting...",
  "actionItems": [
    {
      "title": "Action title stating clear deliverable",
      "description": "Specific deliverable expected and scope of work",
      "suggestedAssignee": "Actual person name mentioned in transcript or Role",
      "suggestedPriority": "URGENT | HIGH | MEDIUM | LOW",
      "suggestedDueDate": "YYYY-MM-DD",
      "aiGuidance": "Detailed technical or operational roadmap to fulfill this item"
    }
  ]
}

Meeting Transcript:
${transcript}`;

    const rawResponse = await callGeminiCascade(prompt);
    
    // Extract JSON block
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.summary && Array.isArray(parsed.actionItems)) {
        return parsed as MeetingExtractionResult;
      }
    }
  } catch (err) {
    console.warn("[Gemini extractMeetingInsights] API error, falling back to dynamic parser:", err);
  }

  // Dynamic regex fallback parsing directly from user transcript
  return generateDynamicExtraction(transcript, meetingTitle);
}

export async function generateActionCoPilotAdvice(
  actionTitle: string,
  description: string
): Promise<string> {
  try {
    const prompt = `You are ${COPILOT_NAME}, an execution assistant. A team member has been assigned the following action item:
Title: ${actionTitle}
Details: ${description}

Provide a structured, pragmatic execution plan containing:
1. Executive Objective & Standards to adhere to
2. Step-by-Step Execution Plan (3-4 high-impact steps)
3. Essential Deliverables & Evidence Required for Manager Sign-off
4. Potential Bottlenecks & Mitigation Tactics

Keep it structured, clear, and actionable with markdown formatting.`;

    const advice = await callGeminiCascade(prompt);
    return advice;
  } catch (err) {
    console.warn("[Gemini generateActionCoPilotAdvice] API error:", err);
  }

  return `### ⚡ AI Execution Plan: ${actionTitle}
**Objective**: Fulfill the deliverable requirements for "${actionTitle}" to meet manager sign-off criteria.

1. **Phase 1: Requirements & Scope Alignment**
   - Review the meeting context and verify necessary inputs from departmental collaborators.
   - Outline key deliverables and baseline metrics.

2. **Phase 2: Core Execution & Verification**
   - Implement the primary deliverable according to organizational standards.
   - Run internal quality checks to eliminate defects or regressions.

3. **Phase 3: Proof of Work & Manager Sign-off**
   - Upload completion documentation or deliverable links via the Proof Submission portal.
   - Request review and sign-off from your department manager.`;
}

export async function refineActionPoint(
  actionTitle: string,
  description: string
): Promise<string> {
  try {
    const prompt = `You are an expert organizational strategist and AI assistant. Refine and significantly improve the following action point to make it SMART (Specific, Measurable, Achievable, Relevant, Time-bound):

**Original Title**: ${actionTitle}
**Original Description**: ${description}

Please provide:
### 🎯 Refined Objective
A clear, improved version of this action point with precise measurable outcomes.

### 📋 Success Criteria (KPIs)
3-5 specific, measurable indicators of successful completion.

### 🗓️ Execution Milestones
Break into 3-4 time-bound mini-milestones with suggested completion checkpoints.

### ⚠️ Risk Assessment
2-3 potential blockers and concrete mitigation strategies for each.

### ✅ Manager Approval Criteria
Precise list of what the manager needs to see to approve this as complete.

Be specific, professional, and use markdown formatting.`;

    const refined = await callGeminiCascade(prompt);
    return refined;
  } catch (err) {
    console.warn("[Gemini refineActionPoint] API error:", err);
  }

  return `### 🎯 Refined Objective
Execute "${actionTitle}" with high quality and measurable outputs.

### 📋 Success Criteria (KPIs)
- Deliverables delivered on or before the designated target date
- Compliance with departmental guidelines
- Verified manager sign-off on submission proof

### 🗓️ Execution Milestones
1. **Milestone 1**: Requirements confirmation and stakeholder check-in
2. **Milestone 2**: Core draft / prototype implementation
3. **Milestone 3**: Finalization, testing, and proof submission

### ⚠️ Risk Assessment
- **Risk**: Dependency delays — *Mitigation*: Flag early to project lead
- **Risk**: Ambiguous scope — *Mitigation*: Clarify acceptance criteria before execution

### ✅ Manager Approval Criteria
- Evidence / proof of completion uploaded
- All primary acceptance requirements met`;
}

/**
 * Dynamic fallback that extracts actual speakers, sentences, and action points
 * from the user's transcript without ANY hardcoded dummy names.
 */
function generateDynamicExtraction(
  transcript: string,
  meetingTitle: string
): MeetingExtractionResult {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 4);
  const dueDateStr = futureDate.toISOString().split('T')[0];

  const lines = transcript
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const extractedActions: ExtractedActionPoint[] = [];

  // Regex patterns to detect speaker tags (e.g. "[00:00] Alice:" or "Alice:")
  const speakerRegex = /(?:\[[\d:]+\]\s*)?([A-Z][a-zA-Z\s.-]+?):\s*(.+)/;

  for (const line of lines) {
    const match = line.match(speakerRegex);
    if (match) {
      const speakerName = match[1].trim();
      const content = match[2].trim();

      // Check if line contains commitment keywords
      const hasActionVerb = /\b(will|need to|should|coordinate|implement|finalize|deliver|prepare|review|build|fix|deploy|test)\b/i.test(
        content
      );

      if (hasActionVerb && content.length > 15) {
        extractedActions.push({
          title: content.length > 70 ? `${content.substring(0, 67)}...` : content,
          description: `Action point assigned during meeting discussion: "${content}"`,
          suggestedAssignee: speakerName,
          suggestedPriority: content.toLowerCase().includes("urgent") ? "URGENT" : "HIGH",
          suggestedDueDate: dueDateStr,
          aiGuidance: `### Task Execution Steps for ${speakerName}:\n1. Review action point context from discussion.\n2. Complete deliverable and attach verification proof.`,
        });
      }
    }
  }

  // If no lines matched speaker pattern, extract key sentences
  if (extractedActions.length === 0) {
    const sentences = transcript.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 20);
    for (let i = 0; i < Math.min(sentences.length, 3); i++) {
      extractedActions.push({
        title: sentences[i].length > 70 ? `${sentences[i].substring(0, 67)}...` : sentences[i],
        description: sentences[i],
        suggestedAssignee: "Lead Assignee",
        suggestedPriority: "MEDIUM",
        suggestedDueDate: dueDateStr,
        aiGuidance: "Execute deliverable and document completion details.",
      });
    }
  }

  const summary = `Executive discussion on "${meetingTitle}". Analyzed ${lines.length} transcript segments with ${extractedActions.length} prioritized action items extracted for team execution.`;

  return {
    summary,
    actionItems: extractedActions,
  };
}
