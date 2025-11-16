/**
 * Simplified OpenRouter Client
 *
 * Standalone version without database dependencies.
 */

export type MessageContent =
  | string
  | Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: {
        url: string;
      };
    }>;

export interface ChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: MessageContent;
  }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  totalCost?: number;
}

export class SimpleOpenRouterClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
  }

  async chat(userId: string, request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/ZeldaMeetsClaude',
        'X-Title': 'ZeldaMeetsClaude BRF Extraction',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenRouter API error: ${JSON.stringify(error)}`);
    }

    const data: ChatResponse = await response.json();

    // Calculate approximate cost (simplified)
    if (data.usage) {
      const promptCost = (data.usage.prompt_tokens / 1000000) * 0.15; // $0.15 per 1M tokens
      const completionCost = (data.usage.completion_tokens / 1000000) * 0.60; // $0.60 per 1M tokens
      data.totalCost = promptCost + completionCost;
    }

    return data;
  }
}
