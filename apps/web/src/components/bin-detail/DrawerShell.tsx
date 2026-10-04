'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

const CLOSE_HREF = '/';

/** Side panel over the heatmap. Closes with the ✕ link, a backdrop click, or Escape. */
export function DrawerShell({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') router.push(CLOSE_HREF, { scroll: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return (
    <>
      <Link
        href={CLOSE_HREF}
        scroll={false}
        aria-label="Close bin detail"
        tabIndex={-1}
        className="fixed inset-0 z-10 bg-zinc-950/30"
      />
      <aside
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-label={title}
        className="fixed inset-y-0 right-0 z-20 flex w-full max-w-md flex-col overflow-y-auto border-l border-zinc-200 bg-background shadow-xl outline-none dark:border-zinc-800"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Bin detail</span>
          <Link
            href={CLOSE_HREF}
            scroll={false}
            aria-label="Close"
            className="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            ✕
          </Link>
        </div>
        <div className="flex flex-col gap-6 px-5 py-5">{children}</div>
      </aside>
    </>
  );
}
