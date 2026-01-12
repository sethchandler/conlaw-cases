'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import CaseCard from '@/components/CaseCard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { CaseWithChiefJustice } from '@/types/case';

interface TopicWithCount {
  name: string;
  count: number;
}

export default function ExploreTopicsPage() {
  const [topics, setTopics] = useState<TopicWithCount[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [cases, setCases] = useState<CaseWithChiefJustice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCases, setLoadingCases] = useState(false);
  const [filter, setFilter] = useState('');

  // Fetch topics with counts
  useEffect(() => {
    async function fetchTopics() {
      try {
        const response = await fetch('/api/execute-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              SELECT i.name, COUNT(ci.case_id) as count
              FROM issues i
              LEFT JOIN case_issues ci ON ci.issue_id = i.issue_id
              GROUP BY i.name
              ORDER BY count DESC, i.name
            `
          }),
        });
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setTopics(data.data);
          setSelectedTopic(data.data[0].name);
        }
      } catch (err) {
        console.error('Failed to fetch topics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTopics();
  }, []);

  // Fetch cases for selected topic
  useEffect(() => {
    if (!selectedTopic) return;

    async function fetchCases() {
      setLoadingCases(true);
      try {
        const response = await fetch('/api/execute-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              SELECT * FROM cases_view
              WHERE '${selectedTopic.replace(/'/g, "''")}' = ANY(issues)
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
  }, [selectedTopic]);

  const filteredTopics = topics.filter(t =>
    t.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading topics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Explore by Legal Topic</h1>
          <p className="text-muted-foreground">
            Browse cases by constitutional doctrine and legal issues.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Topic List */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter topics..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {filteredTopics.map((topic) => (
                  <button
                    key={topic.name}
                    onClick={() => setSelectedTopic(topic.name)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedTopic === topic.name
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <span className="flex justify-between items-center">
                      <span className="truncate">{topic.name}</span>
                      <span className={`text-xs ml-2 ${
                        selectedTopic === topic.name
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}>
                        {topic.count}
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
              <h2 className="text-lg font-semibold">{selectedTopic}</h2>
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
