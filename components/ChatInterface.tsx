'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    setIsLoading(true);

    // TODO: Implement AI chat logic
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Chat functionality coming soon...',
        },
      ]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      <div>
        <h2 className="text-2xl font-bold mb-4">Chat Mode</h2>
        <p className="text-muted-foreground mb-6">
          Ask questions about constitutional law cases and get AI-powered
          answers with citations.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 border rounded-lg p-4 bg-muted/10">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No messages yet. Start a conversation below!</p>
          </div>
        ) : (
          messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <Card
                className={`p-4 max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>
              </Card>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="p-4 bg-card">
              <div className="text-sm text-muted-foreground">Thinking...</div>
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
        <Button onClick={handleSend} disabled={!input.trim() || isLoading} className="w-full sm:w-auto">
          Send Message
        </Button>
      </div>
    </div>
  );
}
