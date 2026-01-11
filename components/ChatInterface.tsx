'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { chatWithRAG } from '@/lib/ai/providers';
import { getPrimaryUrl } from '@/lib/case-url';
import type { AIProviderName } from '@/types/ai';

interface CaseInfo {
  name: string;
  year: number;
  url: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  casesUsed?: CaseInfo[];
}

interface CaseResult {
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
 * Render markdown links as clickable <a> tags
 * Handles: [text](url) format
 */
function renderMarkdownLinks(text: string): React.ReactNode {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the link
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:text-primary/80"
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;

    // Get saved settings
    const provider = localStorage.getItem('ai-provider') as AIProviderName;
    const apiKey = localStorage.getItem(`api-key-${provider}`);
    const model = localStorage.getItem(`ai-model-${provider}`);

    if (!provider || !apiKey || !model) {
      setError('Please configure AI provider in Settings first');
      return;
    }

    const userQuestion = input.trim();
    setInput('');
    setError('');

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userQuestion }]);
    setIsLoading(true);

    try {
      // Step 1: Search for relevant cases
      const searchResponse = await fetch('/api/search-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuestion, limit: 15 }),
      });

      const searchData = await searchResponse.json();

      if (!searchResponse.ok) {
        throw new Error(searchData.error || 'Failed to search cases');
      }

      const cases: CaseResult[] = searchData.cases || [];
      const caseInfos: CaseInfo[] = cases.map(c => ({
        name: c.name,
        year: c.year,
        url: getPrimaryUrl(c),
      }));

      // Step 2: Generate response using RAG
      const result = await chatWithRAG(provider, apiKey, model, userQuestion, cases);

      if (result.error) {
        throw new Error(result.error);
      }

      // Add assistant message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: result.response,
          casesUsed: caseInfos,
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
      // Remove the user message if we failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      <div>
        <h2 className="text-2xl font-bold mb-4">Chat Mode</h2>
        <p className="text-muted-foreground mb-6">
          Ask questions about constitutional law cases. Answers are grounded in your case database.
        </p>
      </div>

      {error && (
        <Card className="p-4 mb-4 border-red-500 bg-red-50 dark:bg-red-950/20">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </Card>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 border rounded-lg p-4 bg-muted/10">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">Ask questions like:</p>
            <ul className="text-sm space-y-2">
              <li>"How has Commerce Clause doctrine evolved?"</li>
              <li>"Compare the Warren and Rehnquist Courts on federalism"</li>
              <li>"What are the key Equal Protection cases?"</li>
              <li>"Explain the development of substantive due process"</li>
            </ul>
          </div>
        ) : (
          messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`max-w-[85%] ${message.role === 'user' ? '' : 'space-y-2'}`}>
                <Card
                  className={`p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {message.role === 'assistant'
                      ? renderMarkdownLinks(message.content)
                      : message.content}
                  </div>
                </Card>
                {message.role === 'assistant' && message.casesUsed && message.casesUsed.length > 0 && (
                  <details className="text-xs text-muted-foreground ml-2">
                    <summary className="cursor-pointer hover:text-foreground">
                      Based on {message.casesUsed.length} cases
                    </summary>
                    <ul className="mt-1 ml-4 space-y-0.5">
                      {message.casesUsed.map((c, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          {c.name} ({c.year})
                          {c.url && (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="View opinion"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="p-4 bg-card">
              <div className="text-sm text-muted-foreground">
                Searching cases and generating response...
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Ask a question about constitutional law cases..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={3}
        />
        <div className="flex gap-2">
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? 'Thinking...' : 'Send Message'}
          </Button>
          {messages.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setMessages([])}
            >
              Clear Chat
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
