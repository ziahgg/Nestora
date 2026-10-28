import { Screen } from '@/components/screen';

/** Figma "Search Results / Loading": skeleton rows. */
export default function Loading() {
  return (
    <Screen wide>
      <div className="h-14 rounded-full skeleton" />
      <div className="flex justify-between">
        <div className="h-6 w-40 rounded-full skeleton" />
        <div className="h-8 w-32 rounded-full skeleton" />
      </div>
      <ul className="grid gap-3 lg:grid-cols-2" aria-busy="true" aria-label="Loading homes">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex gap-3 rounded-[24px] bg-surface p-2.5">
            <div className="size-[104px] shrink-0 rounded-[18px] skeleton" />
            <div className="flex flex-1 flex-col gap-2 py-2">
              <div className="h-3 w-24 rounded-full skeleton" />
              <div className="h-4 w-44 rounded-full skeleton" />
              <div className="h-3 w-32 rounded-full skeleton" />
              <div className="h-4 w-20 rounded-full skeleton" />
            </div>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
