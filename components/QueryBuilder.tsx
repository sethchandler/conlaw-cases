'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Copy, Check } from 'lucide-react';
import CaseCard from '@/components/CaseCard';
import { generateSQL } from '@/lib/ai/providers';
import { DATABASE_SCHEMA } from '@/lib/schema';
import type { AIProviderName } from '@/types/ai';
import type { CaseWithChiefJustice } from '@/types/case';

const EXAMPLE_QUERIES = [
  "Show me Commerce Clause cases after 1990",
  "Which cases involve the Fourteenth Amendment Equal Protection Clause?",
  "Find cases triggered by federal legislation from 1932 to 1945",
  "What cases involving federalism were decided during the Warren Court?",
  "Cases involving the Tenth Amendment",
  "Show me the most recent cases in the database",
  "Show me cases triggered by war",
];

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
  const [copied, setCopied] = useState(false);

  const copySQL = async () => {
    await navigator.clipboard.writeText(generatedSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        <h2 className="text-2xl font-bold mb-2">AI Query Builder</h2>
        <p className="text-muted-foreground">
          Ask a question in natural language and see the SQL generated to answer it.
        </p>
      </div>

      {/* Input Section */}
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Ask a question about the cases
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Show me Commerce Clause cases after 1990"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerateSQL();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleGenerateSQL}
              disabled={isGenerating || !query.trim()}
            >
              {isGenerating ? 'Generating...' : 'Generate Query'}
            </Button>
          </div>
        </div>

        {/* Example Queries */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example, i) => (
              <button
                key={i}
                onClick={() => setQuery(example)}
                className="px-3 py-1.5 text-sm bg-accent hover:bg-accent/80 rounded-full transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card className={`p-4 ${error.startsWith('Note:') ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}`}>
          <p className={`text-sm ${error.startsWith('Note:') ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'}`}>{error}</p>
        </Card>
      )}

      {/* Generated SQL */}
      {generatedSQL && (
        <Card className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Generated SQL</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={copySQL}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>
            </div>
            <Textarea
              value={generatedSQL}
              onChange={(e) => setGeneratedSQL(e.target.value)}
              className="font-mono text-sm bg-muted/50"
              rows={6}
            />
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleExecuteSQL}
              disabled={isExecuting}
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
            {executionTime !== null && (
              <span className="text-sm text-muted-foreground">
                Executed in {executionTime}ms
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Results ({results.length} {results.length === 1 ? 'case' : 'cases'})
          </h3>
          <div className="space-y-4">
            {results.map((result) => (
              <CaseCard key={result.id} case_={result} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
