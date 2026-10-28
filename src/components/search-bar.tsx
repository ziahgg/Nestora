import { Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';

/** Figma search bar on Discover: opens Search; the ink button opens the results with filters. */
export function SearchBarLink() {
  return (
    <div className="relative flex h-14 items-center rounded-full bg-surface pr-1.5 pl-5">
      <Search size={20} className="shrink-0 text-text-secondary" aria-hidden />
      <Link href="/search" className="min-w-0 flex-1 truncate pl-3 t-body text-text-muted after:absolute after:inset-0 after:rounded-full">
        Search neighborhood, address or ZIP
      </Link>
      <Link href="/homes?filters=1" aria-label="Filters" className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full bg-ink text-on-ink">
        <SlidersHorizontal size={20} aria-hidden />
      </Link>
    </div>
  );
}
