'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Home, Activity, Server, Database, Ticket, ArrowUpDown, Settings, Menu, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/monitoring', label: 'Monitoring', icon: Activity },
  { href: '/infrastructure', label: 'Infrastructure', icon: Server },
  { href: '/backups', label: 'Backups', icon: Database },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/transfers', label: 'Transferts', icon: ArrowUpDown },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const isAdmin = session?.user?.role === 'admin';
  const allowedPages = session?.user?.allowedPages;

  const filteredNavItems = useMemo(() => {
    if (isAdmin || !allowedPages) return mainNavItems;
    return mainNavItems.filter((item) => allowedPages.includes(item.href));
  }, [isAdmin, allowedPages]);

  const showSettings = isAdmin || !allowedPages;

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const renderLink = (item: (typeof mainNavItems)[0]) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150',
          active
            ? 'text-accent-foreground bg-accent'
            : 'text-muted-foreground hover:text-accent-foreground hover:bg-accent/70',
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="border-border bg-background flex h-12 items-center border-b px-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="mr-2 h-8 w-8">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="bg-sidebar w-64 p-0">
          <SheetHeader className="p-4">
            <SheetTitle className="text-foreground flex items-center gap-2.5">
              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
                <Zap className="text-foreground h-4 w-4" />
              </div>
              SysAdmin
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 py-2">
            <nav className="flex flex-col gap-4 px-3">
              <div>
                <p className="text-muted-foreground/60 mb-2 px-3 text-[11px] font-medium tracking-wider uppercase">
                  MAIN NAVIGATION
                </p>
                <div className="flex flex-col gap-0.5">{filteredNavItems.map(renderLink)}</div>
              </div>
            </nav>
          </ScrollArea>
          {showSettings && (
            <div className="border-sidebar-border border-t px-3 py-3">
              {renderLink({ href: '/settings', label: 'Settings', icon: Settings })}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Brand on mobile */}
      <Link href="/" className="flex items-center gap-2">
        <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-lg">
          <Zap className="text-foreground h-3.5 w-3.5" />
        </div>
        <span className="text-foreground text-sm font-semibold tracking-tight">SysAdmin</span>
      </Link>
    </div>
  );
}
