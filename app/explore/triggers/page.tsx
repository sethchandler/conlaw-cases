'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import CaseCard from '@/components/CaseCard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { CaseWithChiefJustice } from '@/types/case';

interface TriggerWithCount {
  trigger_type: string;
  count: number;
}

export default function ExploreTriggersPage() {
  const [triggers, setTriggers] = useState<TriggerWithCount[]>([]);
  const [selectedTrigger, setSelectedTrigger] = useState<string>('');
  const [cases, setCases] = useState<CaseWithChiefJustice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCases, setLoadingCases] = useState(false);
  const [filter, setFilter] = useState('');

  // Fetch triggers with counts
  useEffect(() => {
    async function fetchTriggers() {
      try {
        const response = await fetch('/api/execute-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              SELECT t.trigger_type, COUNT(DISTINCT ct.case_id) as count
              FROM triggers t
              LEFT JOIN case_triggers ct ON ct.trigger_id = t.trigger_id
              WHERE t.trigger_type IS NOT NULL
              GROUP BY t.trigger_type
              ORDER BY count DESC, t.trigger_type
            `
          }),
        });
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setTriggers(data.data);
          setSelectedTrigger(data.data[0].trigger_type);
        }
      } catch (err) {
        console.error('Failed to fetch triggers:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTriggers();
  }, []);

  // Fetch cases for selected trigger
  useEffect(() => {
    if (!selectedTrigger) return;

    async function fetchCases() {
      setLoadingCases(true);
      try {
        const response = await fetch('/api/execute-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              SELECT * FROM cases_view
              WHERE '${selectedTrigger.replace(/'/g, "''")}' = ANY(trigger_types)
              ORDER BY year DESC
            `
          }),
        });
        const data = await response.json();
        if (data.success) {
          setCases(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch cases:', err);
      } finally {
        setLoadingCases(false);
      }
    }
    fetchCases();
  }, [selectedTrigger]);

  const filteredTriggers = triggers.filter(t =>
    t.trigger_type.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading triggers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Explore by Historical Trigger</h1>
          <p className="text-muted-foreground">
            Discover what governmental actions prompted each case to reach the Supreme Court.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Trigger List */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter triggers..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {filteredTriggers.map((trigger) => (
                  <button
                    key={trigger.trigger_type}
                    onClick={() => setSelectedTrigger(trigger.trigger_type)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedTrigger === trigger.trigger_type
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <span className="flex justify-between items-center">
                      <span className="truncate">{trigger.trigger_type}</span>
                      <span className={`text-xs ml-2 ${
                        selectedTrigger === trigger.trigger_type
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}>
                        {trigger.count}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Panel - Cases */}
          <div className="lg:col-span-3">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{selectedTrigger}</h2>
              <p className="text-sm text-muted-foreground">
                {cases.length} {cases.length === 1 ? 'case' : 'cases'}
              </p>
            </div>
            {loadingCases ? (
              <p className="text-muted-foreground">Loading cases...</p>
            ) : (
              <div className="space-y-4">
                {cases.map((c) => (
                  <CaseCard key={c.id} case_={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
