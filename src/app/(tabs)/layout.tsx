import { AppNav } from '@/components/nav';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AppNav />
    </>
  );
}
