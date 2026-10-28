import { House } from 'lucide-react';

/** Small illustrative map with a home marker — not a real location (exact addresses aren't plotted). */
export function MiniMap({ label, x = 50, y = 50 }: { label: string; x?: number; y?: number }) {
  return (
    <figure className="relative h-[150px] overflow-hidden rounded-[24px] bg-map" aria-label={label}>
      <svg className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        <rect x="0" y="34" width="100" height="8" fill="var(--map-road)" />
        <rect x="0" y="70" width="100" height="8" fill="var(--map-road)" />
        <rect x="32" y="0" width="5" height="100" fill="var(--map-road)" />
        <rect x="72" y="0" width="5" height="100" fill="var(--map-road)" />
      </svg>
      <span className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink text-amber" style={{ left: `${20 + x * 0.6}%`, top: `${25 + y * 0.5}%` }}>
        <House size={18} aria-hidden />
      </span>
      <figcaption className="absolute bottom-2.5 left-2.5 rounded-full bg-surface/90 px-2.5 py-1 t-caption text-text-secondary">Illustrative map</figcaption>
    </figure>
  );
}
