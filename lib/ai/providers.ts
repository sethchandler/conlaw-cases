'use client';

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProviderName } from '@/types/ai';

/**
 * Test connection to an AI provider
 */
export async function testConnection(
  provider: AIProviderName,
  apiKey: string,
  model: string
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'anthropic':
        return await testAnthropic(apiKey, model);
      case 'openai':
        return await testOpenAI(apiKey, model);
      case 'gemini':
        return await testGemini(apiKey, model);
      case 'openrouter':
        return await testOpenRouter(apiKey, model);
      default:
        return { success: false, error: 'Unknown provider' };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Connection failed' };
  }
}

async function testAnthropic(apiKey: string, model: string) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: model,
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Hi' }],
  });

  if (response.content[0].type === 'text') {
    return { success: true };
  }
  return { success: false, error: 'Invalid response' };
}

async function testOpenAI(apiKey: string, model: string) {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.chat.completions.create({
    model: model,
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Hi' }],
  });

  if (response.choices[0]?.message?.content) {
    return { success: true };
  }
  return { success: false, error: 'Invalid response' };
}

async function testGemini(apiKey: string, model: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model: model });

  const result = await geminiModel.generateContent('Hi');
  const response = await result.response;

  if (response.text()) {
    return { success: true };
  }
  return { success: false, error: 'Invalid response' };
}

async function testOpenRouter(apiKey: string, model: string) {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: model,
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Hi' }],
  });

  if (response.choices[0]?.message?.content) {
    return { success: true };
  }
  return { success: false, error: 'Invalid response' };
}

/**
 * Generate SQL from natural language using AI
 */
export async function generateSQL(
  provider: AIProviderName,
  apiKey: string,
  model: string,
  userQuery: string,
  schema: string
): Promise<{ sql: string; error?: string }> {
  const systemPrompt = `You are a PostgreSQL expert. Generate ONLY valid PostgreSQL SELECT queries based on user requests.

Database Schema:
${schema}

CRITICAL RULES:
- Return ONLY the SQL query, no explanations or markdown
- Use only SELECT statements (no INSERT, UPDATE, DELETE, DROP)
- IMPORTANT: When filtering by issues, you MUST use the EXACT issue names from the "Valid Issue Names" list above
- Do NOT invent issue names - only use values that appear in the dynamic values section
- For array contains queries, use: 'Exact Issue Name' = ANY(issues)
- For text search in descriptions, use ILIKE for case-insensitive matching
- Use the cases_view view for queries
- Include ORDER BY year DESC unless otherwise specified`;

  try {
    switch (provider) {
      case 'anthropic':
        return await generateSQLAnthropic(apiKey, model, systemPrompt, userQuery);
      case 'openai':
        return await generateSQLOpenAI(apiKey, model, systemPrompt, userQuery);
      case 'gemini':
        return await generateSQLGemini(apiKey, model, systemPrompt, userQuery);
      case 'openrouter':
        return await generateSQLOpenRouter(apiKey, model, systemPrompt, userQuery);
      default:
        return { sql: '', error: 'Unknown provider' };
    }
  } catch (error: any) {
    return { sql: '', error: error.message || 'Failed to generate SQL' };
  }
}

async function generateSQLAnthropic(apiKey: string, model: string, systemPrompt: string, userQuery: string) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: model,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userQuery }],
  });

  if (response.content[0].type === 'text') {
    const sql = response.content[0].text.trim();
    return { sql: cleanSQL(sql) };
  }
  return { sql: '', error: 'Invalid response' };
}

async function generateSQLOpenAI(apiKey: string, model: string, systemPrompt: string, userQuery: string) {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.chat.completions.create({
    model: model,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery }
    ],
  });

  const sql = response.choices[0]?.message?.content?.trim() || '';
  return { sql: cleanSQL(sql) };
}

async function generateSQLGemini(apiKey: string, model: string, systemPrompt: string, userQuery: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model: model });

  const prompt = `${systemPrompt}\n\nUser Query: ${userQuery}`;
  const result = await geminiModel.generateContent(prompt);
  const response = await result.response;

  const sql = response.text().trim();
  return { sql: cleanSQL(sql) };
}

async function generateSQLOpenRouter(apiKey: string, model: string, systemPrompt: string, userQuery: string) {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: model,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery }
    ],
  });

  const sql = response.choices[0]?.message?.content?.trim() || '';
  return { sql: cleanSQL(sql) };
}

/**
 * Clean SQL output (remove markdown code blocks, etc.)
 */
function cleanSQL(sql: string): string {
  // Remove markdown code blocks
  sql = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '');
  // Remove leading/trailing whitespace
  sql = sql.trim();
  return sql;
}

/**
 * Case type for RAG context
 */
interface CaseContext {
  name: string;
  year: number;
  description: string;
  issues: string[];
  trigger_types?: string[];
  chief_justice_name: string;
  oyez_url?: string | null;
  cornell_url?: string | null;
  justia_url?: string | null;
}

/**
 * Message in conversation history
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Chat with RAG - answers questions using retrieved cases as context
 * @param conversationHistory - Previous messages in the conversation (for context)
 * @param useGeneralKnowledge - If true, allows AI to use general knowledge beyond the case database
 */
export async function chatWithRAG(
  provider: AIProviderName,
  apiKey: string,
  model: string,
  userQuestion: string,
  cases: CaseContext[],
  conversationHistory: ConversationMessage[] = [],
  useGeneralKnowledge: boolean = false
): Promise<{ response: string; error?: string }> {
  // Build context from retrieved cases, including URLs and triggers
  const caseContext = cases.map((c, i) => {
    const url = c.oyez_url || c.cornell_url || c.justia_url;
    const urlLine = url ? `\n   Opinion: ${url}` : '';
    const triggerLine = c.trigger_types && c.trigger_types.length > 0
      ? `\n   Triggers: ${c.trigger_types.join(', ')}`
      : '';
    return `${i + 1}. ${c.name} (${c.year})
   Chief Justice: ${c.chief_justice_name}
   Issues: ${c.issues.join(', ')}${triggerLine}
   Summary: ${c.description}${urlLine}`;
  }).join('\n\n');

  let systemPrompt: string;

  if (useGeneralKnowledge) {
    systemPrompt = `You are a constitutional law expert assistant. The user has enabled "General Knowledge Mode" which means you may use your full knowledge of constitutional law, legal history, and related topics.

You have access to the following cases from the user's database. Use these as primary sources when relevant, but you are NOT limited to only these cases:

CASES FROM DATABASE:
${caseContext}

IMPORTANT RULES:
- When citing a case from the database above, use markdown link format: [*Case Name* (Year)](URL) if a URL is available
- You may also reference cases and legal concepts NOT in the database
- When referencing cases not in the database, clearly indicate this (e.g., "While not in your database, *Case Name* (Year) is also relevant...")
- Be accurate and thorough
- If you're uncertain about something, say so`;
  } else {
    systemPrompt = `You are a constitutional law expert assistant. Answer questions based ONLY on the cases provided below.

IMPORTANT RULES:
- Base your answers ONLY on the provided cases - do not use outside knowledge
- When citing a case, use markdown link format: [*Case Name* (Year)](URL) if a URL is available
- If no URL is available for a case, cite as: *Case Name* (Year)
- If the provided cases don't contain enough information to answer, say so
- Be concise but thorough
- When discussing legal principles, tie them to specific cases from the list

AVAILABLE CASES:
${caseContext}

If no cases are provided or relevant, explain that you need more specific information to answer.`;
  }

  try {
    switch (provider) {
      case 'anthropic':
        return await chatAnthropic(apiKey, model, systemPrompt, userQuestion, conversationHistory);
      case 'openai':
        return await chatOpenAI(apiKey, model, systemPrompt, userQuestion, conversationHistory);
      case 'gemini':
        return await chatGemini(apiKey, model, systemPrompt, userQuestion, conversationHistory);
      case 'openrouter':
        return await chatOpenRouter(apiKey, model, systemPrompt, userQuestion, conversationHistory);
      default:
        return { response: '', error: 'Unknown provider' };
    }
  } catch (error: any) {
    return { response: '', error: error.message || 'Failed to generate response' };
  }
}

async function chatAnthropic(apiKey: string, model: string, systemPrompt: string, userQuestion: string, history: ConversationMessage[]) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  // Build messages array with history
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userQuestion }
  ];

  const response = await client.messages.create({
    model: model,
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  if (response.content[0].type === 'text') {
    return { response: response.content[0].text };
  }
  return { response: '', error: 'Invalid response' };
}

async function chatOpenAI(apiKey: string, model: string, systemPrompt: string, userQuestion: string, history: ConversationMessage[]) {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  // Build messages array with history
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userQuestion }
  ];

  const response = await client.chat.completions.create({
    model: model,
    max_tokens: 2048,
    messages,
  });

  return { response: response.choices[0]?.message?.content || '' };
}

async function chatGemini(apiKey: string, model: string, systemPrompt: string, userQuestion: string, history: ConversationMessage[]) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model: model });

  // Build conversation history into prompt
  let conversationText = '';
  if (history.length > 0) {
    conversationText = '\n\nPrevious conversation:\n' +
      history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n') +
      '\n\n';
  }

  const prompt = `${systemPrompt}${conversationText}User: ${userQuestion}`;
  const result = await geminiModel.generateContent(prompt);
  const response = await result.response;

  return { response: response.text() };
}

async function chatOpenRouter(apiKey: string, model: string, systemPrompt: string, userQuestion: string, history: ConversationMessage[]) {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true,
  });

  // Build messages array with history
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userQuestion }
  ];

  const response = await client.chat.completions.create({
    model: model,
    max_tokens: 2048,
    messages,
  });

  return { response: response.choices[0]?.message?.content || '' };
}
