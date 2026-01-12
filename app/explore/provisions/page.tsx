'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import CaseCard from '@/components/CaseCard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { CaseWithChiefJustice } from '@/types/case';

interface ProvisionWithCount {
  provision_id: string;
  name: string;
  count: number;
}

export default function ExploreProvisionsPage() {
  const [provisions, setProvisions] = useState<ProvisionWithCount[]>([]);
  const [selectedProvision, setSelectedProvision] = useState<string>('');
  const [selectedName, setSelectedName] = useState<string>('');
  const [cases, setCases] = useState<CaseWithChiefJustice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCases, setLoadingCases] = useState(false);
  const [filter, setFilter] = useState('');

  // Fetch provisions with counts
  useEffect(() => {
    async function fetchProvisions() {
      try {
        const response = await fetch('/api/execute-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              SELECT p.provision_id, p.name, COUNT(cp.case_id) as count
              FROM provisions p
              LEFT JOIN case_provisions cp ON cp.provision_id = p.provision_id
              GROUP BY p.provision_id, p.name
              HAVING COUNT(cp.case_id) > 0
              ORDER BY count DESC, p.name
            `
          }),
        });
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setProvisions(data.data);
          setSelectedProvision(data.data[0].provision_id);
          setSelectedName(data.data[0].name);
        }
      } catch (err) {
        console.error('Failed to fetch provisions:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProvisions();
  }, []);

  // Fetch cases for selected provision
  useEffect(() => {
    if (!selectedProvision) return;

    async function fetchCases() {
      setLoadingCases(true);
      try {
        const response = await fetch('/api/execute-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              SELECT * FROM cases_view
              WHERE '${selectedProvision}' = ANY(provision_ids)
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
  }, [selectedProvision]);

  const filteredProvisions = provisions.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.provision_id.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading provisions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Explore by Constitutional Provision</h1>
          <p className="text-muted-foreground">
            Find cases by article, amendment, section, or clause.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Provision List */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter provisions..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {filteredProvisions.map((prov) => (
                  <button
                    key={prov.provision_id}
                    onClick={() => {
                      setSelectedProvision(prov.provision_id);
                      setSelectedName(prov.name);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedProvision === prov.provision_id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <span className="flex justify-between items-center">
                      <span className="truncate">{prov.name}</span>
                      <span className={`text-xs ml-2 ${
                        selectedProvision === prov.provision_id
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}>
                        {prov.count}
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
              <h2 className="text-lg font-semibold">{selectedName}</h2>
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
