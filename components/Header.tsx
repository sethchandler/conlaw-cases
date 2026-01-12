'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SettingsPanel from '@/components/SettingsPanel';
import ConnectionStatus from '@/components/ConnectionStatus';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/query', label: 'AI Query' },
  { href: '/chat', label: 'Chat' },
];

const EXPLORE_ITEMS = [
  { href: '/explore/topics', label: 'Legal Topics' },
  { href: '/explore/provisions', label: 'Provisions' },
  { href: '/explore/triggers', label: 'Triggers' },
  { href: '/explore/time', label: 'Time Periods' },
];

export default function Header() {
  const pathname = usePathname();
  const isExplorePage = pathname?.startsWith('/explore');

  return (
    <div className="border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image
              src="/con-law-cases-app-icon.png"
              alt="ConLaw Cases"
              width={48}
              height={48}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-lg font-bold">ConLaw Cases</h1>
              <p className="text-xs text-muted-foreground">
                Professor Seth J. Chandler, University of Houston Law Center
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <ConnectionStatus />
            <SettingsPanel />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 mt-3 -mb-3 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Explore dropdown */}
          <div className="relative group">
            <button
              className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                isExplorePage
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              Explore
            </button>
            <div className="absolute left-0 top-full z-50 hidden group-hover:block min-w-[160px]">
              <div className="bg-popover border rounded-md shadow-lg py-1 mt-0.5">
                {EXPLORE_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-4 py-2 text-sm transition-colors ${
                      pathname === item.href
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
