import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { AnnouncementBar } from './announcement-bar';
import { Navbar } from './navbar';
import { Footer } from './footer';

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  // Wouter keeps scroll position between routes; a store should start at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <AnnouncementBar />
      <Navbar />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
