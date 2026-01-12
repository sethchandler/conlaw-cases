'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import CaseCard from '@/components/CaseCard';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CaseWithChiefJustice } from '@/types/case';

interface ChiefJustice {
  name: string;
  startYear: number;
  endYear: number | null;
}

interface Decade {
  label: string;
  startYear: number;
  endYear: number;
}

interface EraWithDecades {
  chiefJustice: ChiefJustice;
  decades: Decade[];
  caseCount: number;
}

export default function ExploreTimePage() {
  const [eras, setEras] = useState<EraWithDecades[]>([]);
  const [expandedEras, setExpandedEras] = useState<Set<string>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState<{ type: 'era' | 'decade'; eraName: string; decade?: Decade } | null>(null);
  const [cases, setCases] = useState<CaseWithChiefJustice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCases, setLoadingCases] = useState(false);

  // Fetch chief justices and build eras with decades
  useEffect(() => {
    async function fetchEras() {
      try {
        const response = await fetch('/api/schema-info');
        const data = await response.json();

        if (data.chiefJustices) {
          const eraData: EraWithDecades[] = [];

          for (const cj of data.chiefJustices) {
            const endYear = cj.endYear || new Date().getFullYear();
            const decades: Decade[] = [];

            // Calculate decades within this era
            const startDecade = Math.floor(cj.startYear / 10) * 10;
            const endDecade = Math.floor(endYear / 10) * 10;

            for (let d = startDecade; d <= endDecade; d += 10) {
              const decadeStart = Math.max(d, cj.startYear);
              const decadeEnd = Math.min(d + 9, endYear);
              if (decadeStart <= decadeEnd) {
                decades.push({
                  label: `${d}s`,
                  startYear: decadeStart,
                  endYear: decadeEnd,
                });
              }
            }

            // Get case count for this era
            const countResponse = await fetch('/api/execute-query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `
                  SELECT COUNT(*) as count FROM cases_view
                  WHERE chief_justice_name = '${cj.name.replace(/'/g, "''")}'
                `
              }),
            });
            const countData = await countResponse.json();
            const caseCount = countData.success ? parseInt(countData.data[0]?.count || '0') : 0;

            if (caseCount > 0) {
              eraData.push({
                chiefJustice: cj,
                decades,
                caseCount,
              });
            }
          }

          // Sort by start year descending (most recent first)
          eraData.sort((a, b) => b.chiefJustice.startYear - a.chiefJustice.startYear);
          setEras(eraData);

          // Select first era by default
          if (eraData.length > 0) {
            const firstEra = eraData[0];
            setExpandedEras(new Set([firstEra.chiefJustice.name]));
            setSelectedPeriod({ type: 'era', eraName: firstEra.chiefJustice.name });
          }
        }
      } catch (err) {
        console.error('Failed to fetch eras:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEras();
  }, []);

  // Fetch cases for selected period
  useEffect(() => {
    if (!selectedPeriod) return;

    async function fetchCases() {
      if (!selectedPeriod) return;
      setLoadingCases(true);
      try {
        let query: string;

        if (selectedPeriod.type === 'era') {
          query = `
            SELECT * FROM cases_view
            WHERE chief_justice_name = '${selectedPeriod.eraName.replace(/'/g, "''")}'
            ORDER BY year DESC
          `;
        } else if (selectedPeriod.decade) {
          query = `
            SELECT * FROM cases_view
            WHERE chief_justice_name = '${selectedPeriod.eraName.replace(/'/g, "''")}'
              AND year >= ${selectedPeriod.decade.startYear}
              AND year <= ${selectedPeriod.decade.endYear}
            ORDER BY year DESC
          `;
        } else {
          return;
        }

        const response = await fetch('/api/execute-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
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
  }, [selectedPeriod]);

  const toggleEra = (eraName: string) => {
    const newExpanded = new Set(expandedEras);
    if (newExpanded.has(eraName)) {
      newExpanded.delete(eraName);
    } else {
      newExpanded.add(eraName);
    }
    setExpandedEras(newExpanded);
  };

  const getSelectedLabel = () => {
    if (!selectedPeriod) return '';
    if (selectedPeriod.type === 'era') {
      const era = eras.find(e => e.chiefJustice.name === selectedPeriod.eraName);
      if (era) {
        const endYear = era.chiefJustice.endYear || 'present';
        return `${era.chiefJustice.name} Court (${era.chiefJustice.startYear}-${endYear})`;
      }
    } else if (selectedPeriod.decade) {
      return `${selectedPeriod.decade.label} (${selectedPeriod.eraName} Court)`;
    }
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading time periods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Explore by Time Period</h1>
          <p className="text-muted-foreground">
            View cases by Chief Justice era and decade.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Era List */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {eras.map((era) => (
                  <div key={era.chiefJustice.name}>
                    {/* Era Header */}
                    <button
                      onClick={() => toggleEra(era.chiefJustice.name)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors"
                    >
                      {expandedEras.has(era.chiefJustice.name) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="flex-1 text-left truncate">
                        {era.chiefJustice.name} Court
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {era.caseCount}
                      </span>
                    </button>

                    {/* Expanded Content */}
                    {expandedEras.has(era.chiefJustice.name) && (
                      <div className="ml-6 space-y-1">
                        {/* All cases in era */}
                        <button
                          onClick={() => setSelectedPeriod({ type: 'era', eraName: era.chiefJustice.name })}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                            selectedPeriod?.type === 'era' && selectedPeriod.eraName === era.chiefJustice.name
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-accent'
                          }`}
                        >
                          All ({era.chiefJustice.startYear}-{era.chiefJustice.endYear || 'present'})
                        </button>

                        {/* Decades */}
                        {era.decades.map((decade) => (
                          <button
                            key={decade.label}
                            onClick={() => setSelectedPeriod({ type: 'decade', eraName: era.chiefJustice.name, decade })}
                            className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                              selectedPeriod?.type === 'decade' &&
                              selectedPeriod.eraName === era.chiefJustice.name &&
                              selectedPeriod.decade?.label === decade.label
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-accent'
                            }`}
                          >
                            {decade.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Panel - Cases */}
          <div className="lg:col-span-3">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{getSelectedLabel()}</h2>
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
