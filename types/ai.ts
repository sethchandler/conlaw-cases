/**
 * Type definitions for AI Provider Integration
 */

// Supported AI providers
export type AIProviderName = 'anthropic' | 'openai' | 'gemini' | 'openrouter';

// Available models per provider
export interface AIModels {
  anthropic: {
    'claude-sonnet-4.5': string;
    'claude-haiku-4.5': string;
  };
  openai: {
    'gpt-5-mini': string;
    'gpt-5-nano': string;
  };
  gemini: {
    'gemini-3-flash': string;
  };
  openrouter: {
    'anthropic/claude-sonnet-4.5': string;
    'anthropic/claude-haiku-4.5': string;
    'google/gemini-3-flash': string;
    'openai/gpt-5-mini': string;
    'openai/gpt-5-nano': string;
    'x-ai/grok-code-fast-1': string;
    'xiaomi/mimo-v2-flash:free': string;
  };
}

// Embedding models
export type EmbeddingModel =
  | 'text-embedding-3-small'
  | 'text-embedding-3-large'
  | 'text-embedding-ada-002';

// Message format for chat
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// AI Provider configuration
export interface AIProviderConfig {
  provider: AIProviderName;
  apiKey: string;
  model: string;
  embeddingModel?: EmbeddingModel;
}

// User settings stored in localStorage
export interface UserSettings {
  provider: AIProviderName;
  apiKeys: Partial<Record<AIProviderName, string>>;
  selectedModels: Partial<Record<AIProviderName, string>>;
  embeddingModel: EmbeddingModel;
  defaultTab: 'query' | 'chat';
  theme?: 'light' | 'dark' | 'system';
}

// Query generation request
export interface QueryGenerationRequest {
  prompt: string;
  schema: string;
  provider: AIProviderName;
  model: string;
}

// Query generation response
export interface QueryGenerationResponse {
  sql: string;
  explanation?: string;
}

// Embedding generation request
export interface EmbeddingRequest {
  text: string;
  model: EmbeddingModel;
}

// Embedding generation response
export interface EmbeddingResponse {
  embedding: number[];
  model: string;
}

// Chat request
export interface ChatRequest {
  messages: Message[];
  context?: string;
  provider: AIProviderName;
  model: string;
}

// Streaming chat response
export interface ChatResponse {
  content: string;
  done: boolean;
}

// Error types
export interface AIError {
  provider: AIProviderName;
  message: string;
  code?: string;
}
