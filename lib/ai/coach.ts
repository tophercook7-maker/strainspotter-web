/**
 * AI Coach Service
 * Generates insights, actions, warnings, and questions based on garden content
 */

interface GardenContext {
  garden: {
    id: string;
    name: string;
    created_at: string;
  };
  plants?: Array<{
    strain_name: string;
    stage: string;
    started_at: string;
    notes?: string;
  }>;
  tasks?: Array<{
    title: string;
    due_at?: string;
    created_at: string;
  }>;
  environment?: Array<{
    logged_at: string;
    temperature?: number;
    humidity?: number;
    vpd?: number;
    notes?: string;
  }>;
  logbook?: Array<{
    created_at: string;
    entry_type?: string;
    text: string;
    stage?: string;
    related_plant_id?: string;
    source_metadata?: {
      source_type: string;
      source_id?: string;
      source_title?: string;
      source_author?: string;
    };
    community_context?: string;
  }>;
  grow_notes?: Array<{
    created_at: string;
    content: string;
    source: string;
  }>;
  last_scan?: {
    scan_type: string;
    created_at: string;
    vision?: any;
    enrichment?: any;
    match_result?: any;
  } | null;
  recent_issues?: Array<{
    created_at: string;
    text: string;
    stage?: string;
  }>;
}

interface CoachResponse {
  seeing: string[]; // "What I'm seeing" (2-3 bullets)
  reasoning: string[]; // "Why I think this" (2-4 bullets)
  action: string; // "Do next" (ONE clear action)
  question?: string; // "If you want, tell me" (ONE optional question)
}

const SYSTEM_PROMPT = `You are a cannabis garden assistant providing practical, contextual guidance.

RESPONSE FORMAT (STRICTLY ENFORCED):
You must structure your response in exactly these 4 sections:

1) "What I'm seeing"
- 2-3 bullet points summarizing key observations from the user's data
- Reference specific logbook entries, notes, tasks, or scan results
- If data is sparse, note what's missing

2) "Why I think this"
- 2-4 bullet points explaining your reasoning
- MUST reference at least 2 real data points (logbook entry, grow note, task, scan result, or plant note)
- Cite specific dates or entries when possible
- Example: "Your logbook entry from [date] mentioned [specific detail]"

3) "Do next"
- ONE clear, actionable step
- Be specific and practical
- Reference the user's current situation

4) "If you want, tell me"
- ONE optional follow-up question
- Helps gather missing context or clarify next steps
- Only include if it adds value

TONE:
- Calm and practical
- Not verbose (keep it concise)
- Supportive but direct
- No medical claims
- No legal advice
- No instructions for illegal activity

DATA USAGE:
- If data is sparse, ask 1-2 targeted questions instead of generic advice
- Always reference real data points when available
- Never invent measurements, readings, or observations
- If you can't reference at least 2 data points, ask questions instead

SAFETY:
- Never provide medical advice
- Never provide legal advice
- Never provide instructions for illegal activity
- You can provide general plant care guidance
- Encourage compliance with local laws`;

/**
 * Call AI service to generate coach insights
 */
export async function generateCoachInsights(
  context: GardenContext,
  userMessage?: string
): Promise<CoachResponse> {
  // TODO: Replace with actual AI service call
  // For now, use rule-based coach
  return generateRuleBasedInsights(context, userMessage);
}

/**
 * Rule-based coach (deterministic, safe)
 * Generates responses in the locked format
 */
function generateRuleBasedInsights(
  context: GardenContext,
  userMessage?: string
): CoachResponse {
  const seeing: string[] = [];
  const reasoning: string[] = [];
  let action = "";
  let question: string | undefined = undefined;

  const plants = context.plants || [];
  const tasks = context.tasks || [];
  const envLogs = context.environment || [];
  const logbook = context.logbook || [];
  const growNotes = context.grow_notes || [];
  const lastScan = context.last_scan;
  const recentIssues = context.recent_issues || [];

  // Count available data points
  const dataPoints = {
    logbook: logbook.length,
    growNotes: growNotes.length,
    tasks: tasks.length,
    scans: lastScan ? 1 : 0,
    issues: recentIssues.length,
    plants: plants.length,
    envLogs: envLogs.length,
  };
  const totalDataPoints = Object.values(dataPoints).reduce((a, b) => a + b, 0);

  // If data is sparse, ask targeted questions
  if (totalDataPoints < 2) {
    seeing.push("I don't have much data about your garden yet.");
    if (logbook.length === 0) {
      question = "What have you observed in your garden recently?";
    } else if (growNotes.length === 0 && logbook.length === 0) {
      question = "What stage are your plants in, and what are you seeing?";
    }
    action = "Add a logbook entry or grow note to help me provide better guidance.";
    reasoning.push("I need more information about your garden to provide specific advice.");
    return { seeing, reasoning, action, question };
  }

  // Build "What I'm seeing" section (2-3 bullets)
  // Reference recent issues if available
  if (recentIssues.length > 0) {
    const latestIssue = recentIssues[0];
    const issueDate = new Date(latestIssue.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    seeing.push(`Your logbook entry from ${issueDate} mentions: "${latestIssue.text.substring(0, 60)}${latestIssue.text.length > 60 ? '...' : ''}"`);
  }

  // Reference last scan if available
  if (lastScan) {
    const scanDate = new Date(lastScan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (lastScan.scan_type === 'doctor' && lastScan.enrichment) {
      seeing.push(`Your last Doctor scan (${scanDate}) identified: ${lastScan.enrichment.explanation?.substring(0, 80) || 'plant health observations'}...`);
    } else if (lastScan.scan_type === 'id' && lastScan.match_result) {
      seeing.push(`Your last ID scan (${scanDate}) matched: ${lastScan.match_result.strain_name || 'a strain'}`);
    }
  }

  // Reference recent logbook entries
  if (logbook.length > 0) {
    const lastEntry = logbook[0];
    const entryDate = new Date(lastEntry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    seeing.push(`Your most recent logbook entry (${entryDate}) notes: "${lastEntry.text.substring(0, 60)}${lastEntry.text.length > 60 ? '...' : ''}"`);
  }

  // Reference open tasks
  if (tasks.length > 0) {
    const overdue = tasks.filter((t) => t.due_at && new Date(t.due_at) < new Date());
    if (overdue.length > 0) {
      seeing.push(`You have ${overdue.length} overdue task${overdue.length !== 1 ? 's' : ''} that need attention.`);
    } else {
      seeing.push(`You have ${tasks.length} open task${tasks.length !== 1 ? 's' : ''} to complete.`);
    }
  }

  // If we don't have enough "seeing" points, add general observations
  if (seeing.length < 2) {
    if (plants.length > 0) {
      const stages = [...new Set(plants.map(p => p.stage))];
      seeing.push(`Your garden has ${plants.length} plant${plants.length !== 1 ? 's' : ''} in ${stages.join(', ')} stage${stages.length > 1 ? 's' : ''}.`);
    }
    if (growNotes.length > 0) {
      seeing.push(`You've created ${growNotes.length} grow note${growNotes.length !== 1 ? 's' : ''} recently.`);
    }
  }

  // Ensure 2-3 bullets
  const finalSeeing = seeing.slice(0, 3);
  if (finalSeeing.length === 0) {
    finalSeeing.push("I don't have enough data about your garden yet.");
  }

  // Build "Why I think this" section (2-4 bullets, must reference 2+ data points)
  // Reference specific logbook entries
  if (logbook.length > 0) {
    const entry = logbook[0];
    const entryDate = new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    reasoning.push(`Your logbook entry from ${entryDate} shows: "${entry.text.substring(0, 80)}${entry.text.length > 80 ? '...' : ''}"`);
  }

  // Reference grow notes
  if (growNotes.length > 0) {
    const note = growNotes[0];
    const noteDate = new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    reasoning.push(`Your grow note from ${noteDate} mentions: "${note.content.substring(0, 80)}${note.content.length > 80 ? '...' : ''}"`);
  }

  // Reference scan results
  if (lastScan && lastScan.enrichment) {
    if (lastScan.enrichment.observed_signals && lastScan.enrichment.observed_signals.length > 0) {
      reasoning.push(`Your last scan detected: ${lastScan.enrichment.observed_signals.slice(0, 3).join(', ')}`);
    }
    if (lastScan.enrichment.probable_conditions && lastScan.enrichment.probable_conditions.length > 0) {
      reasoning.push(`The scan analysis suggests: ${lastScan.enrichment.probable_conditions.slice(0, 2).join(', ')}`);
    }
  }

  // Reference tasks
  if (tasks.length > 0) {
    const task = tasks[0];
    const taskDate = task.due_at ? new Date(task.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'recently';
    reasoning.push(`You have an open task "${task.title}" ${task.due_at ? `due ${taskDate}` : 'to complete'}.`);
  }

  // Reference recent issues
  if (recentIssues.length > 0) {
    const issue = recentIssues[0];
    const issueDate = new Date(issue.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    reasoning.push(`Your entry from ${issueDate} flagged a potential issue that needs attention.`);
  }

  // Ensure we have at least 2 data point references
  if (reasoning.length < 2) {
    if (logbook.length > 1) {
      const entry = logbook[1];
      reasoning.push(`A previous logbook entry noted: "${entry.text.substring(0, 60)}${entry.text.length > 60 ? '...' : ''}"`);
    }
    if (plants.length > 0) {
      const plant = plants[0];
      if (plant.notes) {
        reasoning.push(`Your plant notes mention: "${plant.notes.substring(0, 60)}${plant.notes.length > 60 ? '...' : ''}"`);
      }
    }
    if (growNotes.length > 1) {
      const note = growNotes[1];
      reasoning.push(`Another grow note mentions: "${note.content.substring(0, 60)}${note.content.length > 60 ? '...' : ''}"`);
    }
  }

  // Ensure 2-4 bullets
  const finalReasoning = reasoning.slice(0, 4);
  if (finalReasoning.length === 0) {
    finalReasoning.push("Based on the data you've shared, I'm making these observations.");
  }

  // Build "Do next" section (ONE clear action)
  if (recentIssues.length > 0) {
    const issue = recentIssues[0];
    if (issue.text.toLowerCase().includes('yellow')) {
      action = "Check your pH levels and review your nutrient schedule - yellowing often indicates pH imbalance or nutrient deficiency.";
    } else if (issue.text.toLowerCase().includes('droop')) {
      action = "Check your watering schedule - drooping can indicate over or under-watering.";
    } else {
      action = "Address the issue mentioned in your recent logbook entry - start by checking the basics: pH, watering, and environment.";
    }
  } else if (tasks.length > 0) {
    const task = tasks[0];
    action = `Complete your task: "${task.title}"`;
  } else if (lastScan && lastScan.enrichment && lastScan.enrichment.recommendations && lastScan.enrichment.recommendations.length > 0) {
    action = lastScan.enrichment.recommendations[0];
  } else if (logbook.length === 0) {
    action = "Create a logbook entry documenting what you're seeing in your garden today.";
  } else {
    action = "Continue monitoring your plants and log any changes you observe.";
  }

  // Build "If you want, tell me" section (ONE optional question)
  if (!userMessage) {
    if (logbook.length === 0 && growNotes.length === 0) {
      question = "What stage are your plants in, and what are you observing?";
    } else if (envLogs.length === 0) {
      question = "What's the current temperature and humidity in your grow space?";
    } else if (recentIssues.length > 0) {
      question = "Have you made any changes since noting that issue?";
    } else {
      question = "What would you like to focus on improving in your grow?";
    }
  }

  return {
    seeing: finalSeeing,
    reasoning: finalReasoning,
    action,
    question,
  };
}
