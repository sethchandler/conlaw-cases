'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { BookOpen, Scale, Zap, Clock, Search, MessageSquare, Database } from 'lucide-react';

interface SchemaInfo {
  counts: {
    cases: number;
    issues: number;
    triggers: number;
    provisions: number;
  };
}

const navigationCards = [
  {
    title: 'Explore by Legal Topic',
    description: 'Browse cases by constitutional doctrine and legal issues',
    href: '/explore/topics',
    icon: BookOpen,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    title: 'Explore by Provision',
    description: 'Find cases by constitutional article, amendment, or clause',
    href: '/explore/provisions',
    icon: Scale,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    title: 'Explore by Trigger',
    description: 'Discover what governmental actions prompted each case',
    href: '/explore/triggers',
    icon: Zap,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    title: 'Explore by Time Period',
    description: 'View cases by Chief Justice era and decade',
    href: '/explore/time',
    icon: Clock,
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  {
    title: 'Explore Cases',
    description: 'Search and filter cases with multiple criteria',
    href: '/search',
    icon: Search,
    color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  },
];

const toolCards = [
  {
    title: 'AI Query',
    description: 'Ask questions in natural language, see the SQL generated',
    href: '/query',
    icon: Database,
  },
  {
    title: 'Chat',
    description: 'Have a conversation grounded in the case database',
    href: '/chat',
    icon: MessageSquare,
  },
];

export default function Home() {
  const [counts, setCounts] = useState<SchemaInfo['counts'] | null>(null);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const response = await fetch('/api/schema-info');
        if (response.ok) {
          const data: SchemaInfo = await response.json();
          setCounts(data.counts);
        }
      } catch (err) {
        console.error('Failed to fetch counts:', err);
      }
    }
    fetchCounts();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Orientation */}
        <div className="max-w-3xl mb-8">
          <p className="text-lg text-muted-foreground">
            This database contains the core cases of Professor Chandler's Constitutional Law course.
            Each case is annotated with legal topics, constitutional provisions, and historical triggers
            that explain what governmental action prompted the litigation.
          </p>
        </div>

        {/* Metrics */}
        {counts && (
          <div className="flex flex-wrap gap-4 mb-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="font-semibold text-foreground">{counts.cases}</span> cases
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="font-semibold text-foreground">{counts.issues}</span> legal topics
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="font-semibold text-foreground">{counts.provisions}</span> provisions
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="font-semibold text-foreground">{counts.triggers}</span> triggers
            </span>
          </div>
        )}

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {navigationCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="p-6 h-full hover:bg-accent/50 transition-colors cursor-pointer">
                <div className={`inline-flex p-2 rounded-lg mb-3 ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <h2 className="font-semibold mb-1">{card.title}</h2>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </Card>
            </Link>
          ))}
        </div>

        {/* AI Tools Section */}
        <div className="border-t pt-8">
          <h2 className="text-lg font-semibold mb-4">AI-Powered Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            {toolCards.map((card) => (
              <Link key={card.href} href={card.href}>
                <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <card.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">{card.title}</h3>
                      <p className="text-sm text-muted-foreground">{card.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
