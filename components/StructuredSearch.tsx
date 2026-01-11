'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import type { CaseWithChiefJustice } from '@/types/case';

interface Issue {
  id: string;
  name: string;
  description?: string;
}

interface Provision {
  id: string;
  parentId: string | null;
  name: string;
}

interface ChiefJustice {
  name: string;
  startYear: number;
  endYear: number | null;
}

interface SchemaInfo {
  issues: Issue[];
  issueNames: string[];
  provisions: Provision[];
  chiefJustices: ChiefJustice[];
  yearRange: { min: number; max: number };
  counts: { cases: number; issues: number; triggers: number; provisions: number };
}

export default function StructuredSearch() {
  // Schema info from API
  const [schemaInfo, setSchemaInfo] = useState<SchemaInfo | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(true);

  // Filter state
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [selectedProvisions, setSelectedProvisions] = useState<string[]>([]);
  const [selectedChiefJustice, setSelectedChiefJustice] = useState<string>('');
  const [yearMin, setYearMin] = useState<string>('');
  const [yearMax, setYearMax] = useState<string>('');
  const [textSearch, setTextSearch] = useState('');

  // Results state
  const [results, setResults] = useState<CaseWithChiefJustice[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // Fetch schema info on mount
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
      } finally {
        setLoadingSchema(false);
      }
    }
    fetchSchemaInfo();
  }, []);

  // Build SQL from filters
  const buildSQL = (): string => {
    const conditions: string[] = [];

    // Issue filter
    selectedIssues.forEach(issueName => {
      conditions.push(`'${issueName.replace(/'/g, "''")}' = ANY(issues)`);
    });

    // Provision filter
    selectedProvisions.forEach(provId => {
      conditions.push(`'${provId}' = ANY(provision_ids)`);
    });

    // Chief Justice filter
    if (selectedChiefJustice) {
      conditions.push(`chief_justice_name = '${selectedChiefJustice.replace(/'/g, "''")}'`);
    }

    // Year range
    if (yearMin) {
      conditions.push(`year >= ${parseInt(yearMin)}`);
    }
    if (yearMax) {
      conditions.push(`year <= ${parseInt(yearMax)}`);
    }

    // Text search
    if (textSearch.trim()) {
      const escaped = textSearch.replace(/'/g, "''");
      conditions.push(`(name ILIKE '%${escaped}%' OR description ILIKE '%${escaped}%')`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    return `SELECT * FROM cases_view ${whereClause} ORDER BY year DESC LIMIT 100`;
  };

  // Execute search
  const handleSearch = async () => {
    setIsSearching(true);
    setError('');
    setResults([]);
    setExecutionTime(null);

    try {
      const sql = buildSQL();
      const response = await fetch('/api/execute-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Search failed');
        return;
      }

      if (data.success) {
        setResults(data.data);
        setExecutionTime(data.executionTime);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedIssues([]);
    setSelectedProvisions([]);
    setSelectedChiefJustice('');
    setYearMin('');
    setYearMax('');
    setTextSearch('');
    setResults([]);
    setError('');
    setExecutionTime(null);
  };

  // Add issue to filter
  const addIssue = (issueName: string) => {
    if (issueName && !selectedIssues.includes(issueName)) {
      setSelectedIssues([...selectedIssues, issueName]);
    }
  };

  // Remove issue from filter
  const removeIssue = (issueName: string) => {
    setSelectedIssues(selectedIssues.filter(i => i !== issueName));
  };

  // Add provision to filter
  const addProvision = (provId: string) => {
    if (provId && !selectedProvisions.includes(provId)) {
      setSelectedProvisions([...selectedProvisions, provId]);
    }
  };

  // Remove provision from filter
  const removeProvision = (provId: string) => {
    setSelectedProvisions(selectedProvisions.filter(p => p !== provId));
  };

  // Get top-level provisions for the dropdown
  const getTopLevelProvisions = () => {
    if (!schemaInfo) return [];
    return schemaInfo.provisions.filter(p => !p.parentId);
  };

  // Get provision name by ID
  const getProvisionName = (id: string) => {
    if (!schemaInfo) return id;
    const prov = schemaInfo.provisions.find(p => p.id === id);
    return prov ? prov.name : id;
  };

  if (loadingSchema) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading filters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Structured Search</h2>
        <p className="text-muted-foreground mb-6">
          Filter cases using the controls below. All filters are combined with AND logic.
        </p>
      </div>

      {/* Filter Panel */}
      <Card className="p-6 space-y-4">
        {/* Issues */}
        <div>
          <label className="text-sm font-medium mb-2 block">Issues</label>
          <div className="flex gap-2 flex-wrap mb-2">
            {selectedIssues.map(issue => (
              <span
                key={issue}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
              >
                {issue}
                <button onClick={() => removeIssue(issue)} className="hover:text-primary/70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <Select onValueChange={addIssue} value="">
            <SelectTrigger>
              <SelectValue placeholder="Add an issue..." />
            </SelectTrigger>
            <SelectContent>
              {schemaInfo?.issueNames
                .filter(name => !selectedIssues.includes(name))
                .map(name => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Provisions */}
        <div>
          <label className="text-sm font-medium mb-2 block">Constitutional Provisions</label>
          <div className="flex gap-2 flex-wrap mb-2">
            {selectedProvisions.map(provId => (
              <span
                key={provId}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md text-sm"
              >
                {getProvisionName(provId)}
                <button onClick={() => removeProvision(provId)} className="hover:text-blue-400">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <Select onValueChange={addProvision} value="">
            <SelectTrigger>
              <SelectValue placeholder="Add a provision..." />
            </SelectTrigger>
            <SelectContent>
              {getTopLevelProvisions()
                .filter(p => !selectedProvisions.includes(p.id))
                .map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year Range and Chief Justice */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Year From</label>
            <Input
              type="number"
              placeholder={schemaInfo?.yearRange.min.toString() || "1789"}
              value={yearMin}
              onChange={(e) => setYearMin(e.target.value)}
              min={schemaInfo?.yearRange.min}
              max={schemaInfo?.yearRange.max}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Year To</label>
            <Input
              type="number"
              placeholder={schemaInfo?.yearRange.max.toString() || "2024"}
              value={yearMax}
              onChange={(e) => setYearMax(e.target.value)}
              min={schemaInfo?.yearRange.min}
              max={schemaInfo?.yearRange.max}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Chief Justice</label>
            <Select onValueChange={setSelectedChiefJustice} value={selectedChiefJustice}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                {schemaInfo?.chiefJustices.map(cj => (
                  <SelectItem key={cj.name} value={cj.name}>
                    {cj.name} ({cj.startYear}-{cj.endYear || 'present'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Text Search */}
        <div>
          <label className="text-sm font-medium mb-2 block">Text Search (name or description)</label>
          <Input
            placeholder="Search for keywords..."
            value={textSearch}
            onChange={(e) => setTextSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card className="p-4 border-red-500 bg-red-50 dark:bg-red-950/20">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Results ({results.length} {results.length === 1 ? 'case' : 'cases'})
            </h3>
            {executionTime !== null && (
              <span className="text-sm text-muted-foreground">
                {executionTime}ms
              </span>
            )}
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

      {results.length === 0 && !isSearching && !error && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No results yet. Use the filters above and click Search.</p>
          {schemaInfo && (
            <p className="text-sm mt-2">
              Database contains {schemaInfo.counts.cases} cases, {schemaInfo.counts.issues} issues, {schemaInfo.counts.provisions} provisions
            </p>
          )}
        </div>
      )}
    </div>
  );
}
