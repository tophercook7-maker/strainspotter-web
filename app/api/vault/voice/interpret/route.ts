/**
 * POST /api/vault/voice/interpret
 * Interpret voice command using GPT
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

const PROMPT = `You are the StrainSpotter OS assistant. Convert the user's natural language into a structured command.

Available intents:
- run_pipeline: Run full pipeline for a strain
- start_scraper: Start scraper for a strain
- pause_scraper: Pause scraper
- resume_scraper: Resume scraper
- start_generator: Start generator for a strain
- restart_gpu: Restart GPU server
- show_ai_status: Show AI status
- navigate: Navigate to a page (target: /vault/files, /vault/datasets, etc.)
- open_dataset: Open dataset for a strain
- rebuild_clusters: Rebuild clusters
- show_manifests: Show manifests folder

Return JSON with:
{
  "intent": "intent_name",
  "strain": "strain-slug" (if mentioned),
  "target": "/vault/path" (for navigation),
  "action": "action_name" (if needed)
}

Examples:
"run full pipeline for blue dream" → {"intent": "run_pipeline", "strain": "blue-dream"}
"go to mission control" → {"intent": "navigate", "target": "/vault/mission"}
"restart GPU server" → {"intent": "restart_gpu"}
"open dataset for wedding cake" → {"intent": "open_dataset", "strain": "wedding-cake"}`;

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { command } = body;

    if (!command) {
      return NextResponse.json({ error: 'command is required' }, { status: 400 });
    }

    // Import OpenAI only at runtime, not at build time
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Use GPT-4o-mini for intent parsing
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: command }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const intent = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json(intent);
  } catch (error: any) {
    console.error('Interpret voice command error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to interpret command' },
      { status: 500 }
    );
  }
}
