'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { generateSQL } from '@/lib/ai/providers';
import { DATABASE_SCHEMA } from '@/lib/schema';
import type { AIProviderName } from '@/types/ai';
import type { CaseWithChiefJustice } from '@/types/case';

export default function QueryBuilder() {
  const [query, setQuery] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<CaseWithChiefJustice[]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const handleGenerateSQL = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    // Get saved settings
    const provider = localStorage.getItem('ai-provider') as AIProviderName;
    const apiKey = localStorage.getItem(`api-key-${provider}`);
    const model = localStorage.getItem(`ai-model-${provider}`);

    // Debug logging
    console.log('Provider:', provider);
    console.log('Model key:', `ai-model-${provider}`);
    console.log('Model:', model);
    console.log('Has API key:', !!apiKey);

    if (!provider) {
      setError('Please select an AI provider in Settings and click "Save Settings"');
      return;
    }
    if (!apiKey) {
      setError('Please enter an API key in Settings and click "Save Settings"');
      return;
    }
    if (!model) {
      setError('Please select a model in Settings and click "Save Settings"');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedSQL('');

    const result = await generateSQL(provider, apiKey, model, query, DATABASE_SCHEMA);

    if (result.error) {
      setError(result.error);
    } else {
      setGeneratedSQL(result.sql);
    }

    setIsGenerating(false);
  };

  const handleExecuteSQL = async () => {
    if (!generatedSQL.trim()) {
      setError('No SQL query to execute');
      return;
    }

    setIsExecuting(true);
    setError('');
    setResults([]);
    setExecutionTime(null);

    try {
      const response = await fetch('/api/execute-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: generatedSQL }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to execute query');
        return;
      }

      if (data.success) {
        setResults(data.data);
        setExecutionTime(data.executionTime);
        if (data.truncated) {
          setError(data.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute query');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Query Builder</h2>
        <p className="text-muted-foreground mb-6">
          Enter a natural language query to search constitutional law cases.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Natural Language Query
          </label>
          <Input
            placeholder="e.g., Show me all Commerce Clause cases after 1990"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerateSQL();
              }
            }}
            className="w-full"
          />
        </div>

        <Button
          onClick={handleGenerateSQL}
          disabled={isGenerating || !query.trim()}
          className="w-full sm:w-auto"
        >
          {isGenerating ? 'Generating SQL...' : 'Generate SQL Query'}
        </Button>

        {error && (
          <Card className="p-4 border-red-500 bg-red-50 dark:bg-red-950/20">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </Card>
        )}

        {generatedSQL && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Generated SQL (Editable)
                </label>
                <span className="text-xs text-muted-foreground">
                  You can edit this query before executing
                </span>
              </div>
              <Textarea
                value={generatedSQL}
                onChange={(e) => setGeneratedSQL(e.target.value)}
                className="font-mono text-sm"
                rows={8}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleExecuteSQL}
                disabled={isExecuting}
                className="flex-1 sm:flex-initial"
              >
                {isExecuting ? 'Executing...' : 'Execute Query'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedSQL('');
                  setResults([]);
                  setError('');
                  setExecutionTime(null);
                }}
              >
                Clear
              </Button>
            </div>

            {executionTime !== null && (
              <div className="text-sm text-muted-foreground">
                Query executed in {executionTime}ms
              </div>
            )}
          </div>
        )}

        {!generatedSQL && !isGenerating && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-2">No query generated yet.</p>
            <p className="text-sm">
              Enter a natural language query above and click "Generate SQL Query"
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Results ({results.length} {results.length === 1 ? 'case' : 'cases'})
              </h3>
            </div>
            <div className="space-y-4">
              {results.map((result, i) => (
                <Card key={i} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="space-y-2">
                    <div>
                      <div className="font-semibold text-lg">{result.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.year} • Chief Justice: {result.chief_justice_name || 'Unknown'}
                      </div>
                    </div>
                    {result.description && (
                      <p className="text-sm">{result.description}</p>
                    )}
                    {result.issues && result.issues.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {result.issues.map((issue, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
