'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { generateSQL } from '@/lib/ai/providers';
import { DATABASE_SCHEMA } from '@/lib/schema';
import type { AIProviderName } from '@/types/ai';
import type { CaseWithChiefJustice } from '@/types/case';

interface Issue {
  id: string;
  name: string;
}

interface Provision {
  id: string;
  parentId: string | null;
  name: string;
}

interface SchemaInfo {
  issues: Issue[];
  issueNames: string[];
  provisions: Provision[];
  triggerTypes: string[];
  chiefJustices: { name: string; startYear: number; endYear: number | null }[];
  yearRange: { min: number; max: number };
}

export default function QueryBuilder() {
  const [query, setQuery] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<CaseWithChiefJustice[]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [schemaInfo, setSchemaInfo] = useState<SchemaInfo | null>(null);

  // Fetch dynamic schema info on mount
  useEffect(() => {
    async function fetchSchemaInfo() {
      try {
        const response = await fetch('/api/schema-info');
        if (response.ok) {
          const data = await response.json();
          setSchemaInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch schema info:', err);
      }
    }
    fetchSchemaInfo();
  }, []);

  // Build dynamic schema context for the AI
  const getDynamicSchema = () => {
    let schema = DATABASE_SCHEMA;

    if (schemaInfo) {
      // Add controlled vocabulary - these are the ONLY valid values
      schema += `

═══════════════════════════════════════════════════════════════════
CONTROLLED VOCABULARY - YOU MUST USE THESE EXACT VALUES
═══════════════════════════════════════════════════════════════════

VALID ISSUE NAMES (use these exact strings in WHERE clauses):
${schemaInfo.issueNames.map(name => `  - "${name}"`).join('\n')}

VALID PROVISION IDs (for filtering by constitutional provision):
${schemaInfo.provisions.filter(p => !p.parentId).map(p => `  - "${p.id}" = ${p.name}`).join('\n')}

CHIEF JUSTICES (with tenure years):
${schemaInfo.chiefJustices.map(cj => `  - "${cj.name}" (${cj.startYear}-${cj.endYear || 'present'})`).join('\n')}

CASE YEAR RANGE: ${schemaInfo.yearRange.min} to ${schemaInfo.yearRange.max}

═══════════════════════════════════════════════════════════════════
CRITICAL: Do NOT invent values. Only use the exact strings listed above.
═══════════════════════════════════════════════════════════════════`;
    }

    return schema;
  };

  const handleGenerateSQL = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    // Get saved settings
    const provider = localStorage.getItem('ai-provider') as AIProviderName;
    const apiKey = localStorage.getItem(`api-key-${provider}`);
    const model = localStorage.getItem(`ai-model-${provider}`);

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

    const result = await generateSQL(provider, apiKey, model, query, getDynamicSchema());

    if (result.error) {
      setError(result.error);
    } else {
      // Validate generated SQL against known values
      let sql = result.sql;
      let warnings: string[] = [];

      // Check if SQL contains issue names not in our list
      if (schemaInfo) {
        const issuePattern = /'([^']+)'\s*=\s*ANY\s*\(\s*issues\s*\)/gi;
        let match;
        while ((match = issuePattern.exec(sql)) !== null) {
          const usedIssue = match[1];
          if (!schemaInfo.issueNames.includes(usedIssue)) {
            // Try to find a close match
            const closestMatch = findClosestMatch(usedIssue, schemaInfo.issueNames);
            if (closestMatch) {
              warnings.push(`Corrected "${usedIssue}" → "${closestMatch}"`);
              sql = sql.replace(match[0], `'${closestMatch}' = ANY(issues)`);
            } else {
              warnings.push(`Unknown issue: "${usedIssue}"`);
            }
          }
        }
      }

      setGeneratedSQL(sql);
      if (warnings.length > 0) {
        setError(`Note: ${warnings.join('; ')}`);
      }
    }

    setIsGenerating(false);
  };

  // Simple fuzzy matching
  const findClosestMatch = (input: string, candidates: string[]): string | null => {
    const inputLower = input.toLowerCase();

    // Exact match (case-insensitive)
    const exact = candidates.find(c => c.toLowerCase() === inputLower);
    if (exact) return exact;

    // Contains match
    const contains = candidates.find(c =>
      c.toLowerCase().includes(inputLower) || inputLower.includes(c.toLowerCase())
    );
    if (contains) return contains;

    // Word overlap
    const inputWords = inputLower.split(/\s+/);
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const candidateWords = candidate.toLowerCase().split(/\s+/);
      const overlap = inputWords.filter(w => candidateWords.some(cw => cw.includes(w) || w.includes(cw))).length;
      if (overlap > bestScore) {
        bestScore = overlap;
        bestMatch = candidate;
      }
    }

    return bestScore > 0 ? bestMatch : null;
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
        <h2 className="text-2xl font-bold mb-4">AI Query Builder</h2>
        <p className="text-muted-foreground mb-6">
          Enter a natural language query and let AI generate SQL for you.
          For more reliable results, use the Structured Search tab.
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
          <Card className={`p-4 ${error.startsWith('Note:') ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}`}>
            <p className={`text-sm ${error.startsWith('Note:') ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'}`}>{error}</p>
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
                    {result.provisions && result.provisions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {result.provisions.map((prov, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md text-xs"
                          >
                            {prov}
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
