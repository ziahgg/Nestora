import { House } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** Figma "Sign In / Create Account" frame: logo row, light-italic greeting, title. */
export function AuthShell({ greeting, title, children }: { greeting: string; title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-[max(20px,env(safe-area-inset-top))] pb-8">
      <Link href="/" className="inline-flex items-center gap-2.5 self-start" aria-label="Nestora home">
        <span className="grid size-10 place-items-center rounded-[12px] bg-ink text-amber">
          <House size={20} aria-hidden />
        </span>
        <span className="t-section">Nestora</span>
      </Link>
      <p className="mt-6 t-greeting text-text-muted">{greeting}</p>
      <h1 className="mb-6 t-display">{title}</h1>
      {children}
    </main>
  );
}
