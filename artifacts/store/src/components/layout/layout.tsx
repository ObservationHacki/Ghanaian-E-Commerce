import { ReactNode } from 'react';
import { AnnouncementBar } from './announcement-bar';
import { Navbar } from './navbar';
import { Footer } from './footer';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white dark:bg-[#1D1D1F] text-[#1D1D1F] dark:text-white selection:bg-blue-600 selection:text-white">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
