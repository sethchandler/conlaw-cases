'use client';

import { Card } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { getPrimaryUrl } from '@/lib/case-url';
import type { CaseWithChiefJustice } from '@/types/case';

interface CaseCardProps {
  case_: CaseWithChiefJustice;
}

export default function CaseCard({ case_: c }: CaseCardProps) {
  const url = getPrimaryUrl(c);

  return (
    <Card className="p-4 hover:bg-accent/50 transition-colors">
      <div className="space-y-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{c.name}</span>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                title="View opinion"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {c.year} · Chief Justice: {c.chief_justice_name || 'Unknown'}
          </div>
        </div>
        {c.description && (
          <p className="text-sm">{c.description}</p>
        )}
        {c.issues && c.issues.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {c.issues.map((issue, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
              >
                {issue}
              </span>
            ))}
          </div>
        )}
        {c.provisions && c.provisions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {c.provisions.map((prov, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md text-xs"
              >
                {prov}
              </span>
            ))}
          </div>
        )}
        {c.trigger_types && c.trigger_types.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {c.trigger_types.map((trigger, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md text-xs"
              >
                {trigger}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
