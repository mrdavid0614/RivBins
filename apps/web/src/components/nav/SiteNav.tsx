'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Heatmap' },
  { href: '/tasks', label: 'Audit plans' },
  { href: '/count', label: 'Count' },
] as const;

/** `/count/A-01-03` keeps "Count" active; the heatmap only matches `/`. */
const isActive = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav aria-label="Main" className="mx-auto flex w-full max-w-5xl items-center gap-6 px-4 py-3 text-sm">
        <span className="font-semibold tracking-tight">RivBins</span>
        <ul className="flex gap-4">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'font-medium text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
