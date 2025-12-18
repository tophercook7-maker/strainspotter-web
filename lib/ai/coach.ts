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
    entry_type: string;
    text: string;
    related_plant_id?: string;
  }>;
}

interface CoachResponse {
  insights: string[];
  actions: string[];
  warnings: string[];
  questions: string[];
}

const SYSTEM_PROMPT = `You are a cannabis garden assistant.
You ONLY use the provided garden data (plants, tasks, environment logs, logbook entries).
If data is missing, ask questions.
Never invent measurements or sensor readings.
Never give medical advice.
Be supportive and practical.`;

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
 */
function generateRuleBasedInsights(
  context: GardenContext,
  userMessage?: string
): CoachResponse {
  const insights: string[] = [];
  const actions: string[] = [];
  const warnings: string[] = [];
  const questions: string[] = [];

  const plants = context.plants || [];
  const tasks = context.tasks || [];
  const envLogs = context.environment || [];
  const logbook = context.logbook || [];

  // Summary insights
  insights.push(`Your garden "${context.garden.name}" has ${plants.length} plant${plants.length !== 1 ? 's' : ''}.`);

  // Plants insights
  if (plants.length > 0) {
    const stages = plants.map((p) => p.stage);
    const uniqueStages = [...new Set(stages)];
    if (uniqueStages.length > 0) {
      insights.push(`Plants are in stages: ${uniqueStages.join(", ")}.`);
    }

    // Check for notes with keywords
    const plantsWithNotes = plants.filter((p) => p.notes && p.notes.length > 0);
    if (plantsWithNotes.length > 0) {
      const hasYellowing = plantsWithNotes.some((p) =>
        p.notes?.toLowerCase().includes("yellow")
      );
      if (hasYellowing) {
        insights.push("Some plants show yellowing - this could indicate nutrient or watering issues.");
        actions.push("Check pH levels and review your feeding schedule.");
      }
    }
  } else {
    insights.push("No plants added yet.");
    actions.push("Add your first plant to start tracking.");
  }

  // Tasks insights
  if (tasks.length > 0) {
    const overdue = tasks.filter((t) => {
      if (!t.due_at) return false;
      return new Date(t.due_at) < new Date();
    });
    if (overdue.length > 0) {
      insights.push(`You have ${overdue.length} overdue task${overdue.length !== 1 ? 's' : ''}.`);
      warnings.push("Prioritize overdue tasks to stay on track.");
    } else {
      insights.push(`You have ${tasks.length} open task${tasks.length !== 1 ? 's' : ''}.`);
    }
    actions.push(...tasks.slice(0, 3).map((t) => `Complete: ${t.title}`));
  } else {
    insights.push("No open tasks.");
    actions.push("Create tasks to track important garden activities.");
  }

  // Environment insights
  if (envLogs.length > 0) {
    const latest = envLogs[0];
    const daysSinceLastLog = Math.floor(
      (new Date().getTime() - new Date(latest.logged_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastLog > 7) {
      warnings.push(`No environment logged in ${daysSinceLastLog} days. Regular tracking helps identify issues.`);
      actions.push("Log today's environment (temperature, humidity).");
    } else {
      if (latest.temperature) {
        insights.push(`Latest temperature: ${latest.temperature}°F`);
      }
      if (latest.humidity) {
        insights.push(`Latest humidity: ${latest.humidity}%`);
      }
    }
  } else {
    insights.push("No environment logs yet.");
    actions.push("Log today's environment to establish a baseline.");
  }

  // Logbook insights
  if (logbook.length > 0) {
    const lastEntry = logbook[0];
    const daysSinceLastEntry = Math.floor(
      (new Date().getTime() - new Date(lastEntry.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastEntry > 3) {
      warnings.push(`No logbook entry in ${daysSinceLastEntry} days. Regular entries help track progress.`);
    }

    insights.push(`Last logbook entry: ${lastEntry.entry_type} - "${lastEntry.text.substring(0, 50)}${lastEntry.text.length > 50 ? '...' : ''}"`);
  } else {
    insights.push("No logbook entries yet.");
    actions.push("Create your first logbook entry to document observations.");
  }

  // Answer user message if provided
  if (userMessage) {
    const lowerMsg = userMessage.toLowerCase();
    if (lowerMsg.includes("task") || lowerMsg.includes("todo")) {
      if (tasks.length > 0) {
        insights.push(`You have ${tasks.length} open task${tasks.length !== 1 ? 's' : ''}: ${tasks.map((t) => t.title).join(", ")}`);
      } else {
        insights.push("No open tasks. Consider adding tasks to track important activities.");
      }
    }
    if (lowerMsg.includes("environment") || lowerMsg.includes("temp") || lowerMsg.includes("humidity")) {
      if (envLogs.length > 0) {
        const latest = envLogs[0];
        insights.push(`Latest environment: ${latest.temperature ? `${latest.temperature}°F` : 'temp not logged'}, ${latest.humidity ? `${latest.humidity}% humidity` : 'humidity not logged'}`);
      } else {
        insights.push("No environment data logged yet. Start logging to track conditions.");
      }
    }
  }

  // General suggestions
  if (plants.length > 0 && envLogs.length === 0) {
    actions.push("Log environment conditions to help diagnose plant issues.");
  }

  if (plants.length > 0 && logbook.length === 0) {
    actions.push("Start a logbook entry to document plant observations.");
  }

  // Questions
  if (plants.length === 0) {
    questions.push("What strain would you like to add to your garden?");
  }
  if (envLogs.length === 0) {
    questions.push("What's the current temperature and humidity in your grow space?");
  }

  return {
    insights,
    actions,
    warnings,
    questions,
  };
}
