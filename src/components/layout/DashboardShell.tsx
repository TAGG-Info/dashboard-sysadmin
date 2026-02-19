'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="md:hidden">
          <MobileNav />
        </div>
        <Topbar />
        <main
          className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6"
          style={{
            background:
              'radial-gradient(ellipse at 20% 0%, rgba(45,212,191,0.03) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(96,165,250,0.02) 0%, transparent 50%)',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
