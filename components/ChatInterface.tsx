'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ExternalLink, Plus, MessageSquare, Trash2, Menu, X, Download, Brain } from 'lucide-react';
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

interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
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

const STORAGE_KEY = 'conlaw-chat-threads';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getFirstSixWords(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 6);
  return words.join(' ') + (text.trim().split(/\s+/).length > 6 ? '...' : '');
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
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [useGeneralKnowledge, setUseGeneralKnowledge] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Export current thread to markdown
  const exportToMarkdown = () => {
    if (!activeThread || activeThread.messages.length === 0) return;

    const lines: string[] = [
      `# ${activeThread.title}`,
      `*Exported from ConLaw Cases on ${new Date().toLocaleDateString()}*`,
      '',
    ];

    for (const msg of activeThread.messages) {
      if (msg.role === 'user') {
        lines.push(`## Question`);
        lines.push(msg.content);
        lines.push('');
      } else {
        lines.push(`## Answer`);
        lines.push(msg.content);
        if (msg.casesUsed && msg.casesUsed.length > 0) {
          lines.push('');
          lines.push('**Sources:**');
          for (const c of msg.casesUsed) {
            if (c.url) {
              lines.push(`- [${c.name} (${c.year})](${c.url})`);
            } else {
              lines.push(`- ${c.name} (${c.year})`);
            }
          }
        }
        lines.push('');
      }
    }

    const markdown = lines.join('\n');
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeThread.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load threads from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setThreads(parsed);
        // Select the most recent thread if any exist
        if (parsed.length > 0) {
          setActiveThreadId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to parse saved threads:', e);
      }
    }
  }, []);

  // Save threads to localStorage whenever they change
  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    }
  }, [threads]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, activeThreadId]);

  const activeThread = threads.find(t => t.id === activeThreadId);
  const messages = activeThread?.messages || [];

  const createNewThread = () => {
    const newThread: ChatThread = {
      id: generateId(),
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setError('');
  };

  const deleteThread = (threadId: string) => {
    setThreads(prev => prev.filter(t => t.id !== threadId));
    if (activeThreadId === threadId) {
      const remaining = threads.filter(t => t.id !== threadId);
      setActiveThreadId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const updateThreadMessages = (threadId: string, newMessages: ChatMessage[]) => {
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        // Update title based on first user message if still "New Chat"
        let title = t.title;
        if (title === 'New Chat' && newMessages.length > 0) {
          const firstUserMsg = newMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = getFirstSixWords(firstUserMsg.content);
          }
        }
        return { ...t, messages: newMessages, title };
      }
      return t;
    }));
  };

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

    // Create new thread if none active
    let threadId = activeThreadId;
    if (!threadId) {
      const newThread: ChatThread = {
        id: generateId(),
        title: 'New Chat',
        createdAt: new Date().toISOString(),
        messages: [],
      };
      setThreads(prev => [newThread, ...prev]);
      threadId = newThread.id;
      setActiveThreadId(threadId);
    }

    const userQuestion = input.trim();
    setInput('');
    setError('');

    // Add user message immediately
    const currentMessages = threads.find(t => t.id === threadId)?.messages || [];
    const updatedMessages = [...currentMessages, { role: 'user' as const, content: userQuestion }];
    updateThreadMessages(threadId, updatedMessages);

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
      const result = await chatWithRAG(provider, apiKey, model, userQuestion, cases, useGeneralKnowledge);

      if (result.error) {
        throw new Error(result.error);
      }

      // Add assistant message
      const finalMessages = [
        ...updatedMessages,
        {
          role: 'assistant' as const,
          content: result.response,
          casesUsed: caseInfos,
        },
      ];
      updateThreadMessages(threadId, finalMessages);
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
      // Remove the user message if we failed
      updateThreadMessages(threadId, currentMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden border-r bg-muted/30 flex flex-col`}>
        <div className="p-3 border-b">
          <Button
            onClick={createNewThread}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.map(thread => (
            <div
              key={thread.id}
              className={`group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent ${
                activeThreadId === thread.id ? 'bg-accent' : ''
              }`}
              onClick={() => {
                setActiveThreadId(thread.id);
                setError('');
              }}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{thread.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteThread(thread.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {threads.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No conversations yet
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with toggle */}
        <div className="flex items-center justify-between p-2 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <h2 className="font-semibold">
              {activeThread?.title || 'Chat'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* General Knowledge Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useGeneralKnowledge}
                onChange={(e) => setUseGeneralKnowledge(e.target.checked)}
                className="sr-only"
              />
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                useGeneralKnowledge
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}>
                <Brain className="h-3 w-3" />
                <span>General Knowledge</span>
              </div>
            </label>
            {/* Export Button */}
            {activeThread && activeThread.messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={exportToMarkdown}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-auto w-full max-w-3xl px-4 pt-2">
            <Card className="p-3 border-red-500 bg-red-50 dark:bg-red-950/20">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </Card>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
            {messages.length === 0 && !activeThreadId ? (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold mb-4">ConLaw Cases Chat</h3>
                <p className="text-muted-foreground mb-6">
                  Ask questions about constitutional law cases. Answers are grounded in your case database.
                </p>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium">Try asking:</p>
                  <ul className="space-y-1">
                    <li>"How has Commerce Clause doctrine evolved?"</li>
                    <li>"Compare the Warren and Rehnquist Courts on federalism"</li>
                    <li>"What are the key Equal Protection cases?"</li>
                    <li>"Explain the development of substantive due process"</li>
                  </ul>
                </div>
              </div>
            ) : messages.length === 0 && activeThreadId ? (
              <div className="text-center py-16 text-muted-foreground">
                <p>Start a conversation by typing a message below.</p>
              </div>
            ) : (
              messages.map((message, i) => (
                <div key={i} className="space-y-2">
                  {/* User Message */}
                  {message.role === 'user' && (
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-2 max-w-[85%]">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  )}
                  {/* Assistant Message */}
                  {message.role === 'assistant' && (
                    <div className="space-y-2">
                      <div className="bg-muted rounded-2xl px-4 py-3 max-w-[85%]">
                        <div className="text-sm whitespace-pre-wrap">
                          {renderMarkdownLinks(message.content)}
                        </div>
                      </div>
                      {/* Grounding footer */}
                      {message.casesUsed && message.casesUsed.length > 0 && (
                        <details className="text-xs text-muted-foreground ml-2">
                          <summary className="cursor-pointer hover:text-foreground">
                            Based on {message.casesUsed.length} cases from the database
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
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="space-y-2">
                <div className="bg-muted rounded-2xl px-4 py-3 max-w-[85%]">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <div className="animate-pulse">Searching cases and generating response...</div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
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
                rows={2}
                className="resize-none"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-6"
              >
                Send
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {useGeneralKnowledge ? (
                <span className="text-amber-600 dark:text-amber-400">
                  General Knowledge mode: AI may use knowledge beyond the case database.
                </span>
              ) : (
                'Responses are grounded in the case database. Press Enter to send.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
