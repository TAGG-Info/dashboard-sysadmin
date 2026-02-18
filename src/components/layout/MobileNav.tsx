'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Activity,
  Server,
  Database,
  Ticket,
  ArrowUpDown,
  Settings,
  Menu,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const renderLink = (item: typeof mainNavItems[0]) => {
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
            ? 'bg-white/[0.07] text-foreground border-l-2 border-primary -ml-[2px] pl-[14px]'
            : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
        )}
      >
        <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-primary')} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-12 items-center border-b border-border/50 bg-background/50 backdrop-blur-sm px-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="mr-2 h-8 w-8">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetHeader className="p-4">
            <SheetTitle className="flex items-center gap-2.5 text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              SysAdmin
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 py-2">
            <nav className="flex flex-col gap-4 px-3">
              <div>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  MAIN NAVIGATION
                </p>
                <div className="flex flex-col gap-0.5">
                  {mainNavItems.map(renderLink)}
                </div>
              </div>
            </nav>
          </ScrollArea>
          <div className="border-t border-border/30 px-3 py-3">
            {renderLink({ href: '/settings', label: 'Settings', icon: Settings })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Brand on mobile */}
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-bold tracking-tight text-foreground">SysAdmin</span>
      </Link>
    </div>
  );
}
