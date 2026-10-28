import { AirVent, Building2, Car, ConciergeBell, Dumbbell, Flame, PlugZap, Sparkles, Sun, Trees, Utensils, WashingMachine, Waves } from 'lucide-react';

import type { IconType } from './ui';

/** Lucide icon names stored on amenities → components (unknown names fall back to a neutral icon). */
const ICONS: Record<string, IconType> = {
  'washing-machine': WashingMachine,
  utensils: Utensils,
  'air-vent': AirVent,
  trees: Trees,
  car: Car,
  dumbbell: Dumbbell,
  waves: Waves,
  'building-2': Building2,
  'plug-zap': PlugZap,
  sun: Sun,
  flame: Flame,
  'concierge-bell': ConciergeBell,
};

export function AmenityIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon size={size} aria-hidden />;
}
