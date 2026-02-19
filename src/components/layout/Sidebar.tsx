'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Home, Settings, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SourceLogo } from '@/components/ui/SourceLogo';
import type { SourceName } from '@/types/common';

interface NavItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  source?: SourceName;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'MAIN NAVIGATION',
    items: [
      { href: '/', label: 'Dashboard', icon: Home },
      { href: '/monitoring', label: 'Monitoring', source: 'prtg' },
      { href: '/infrastructure', label: 'Infrastructure', source: 'vcenter' },
      { href: '/backups', label: 'Backups', source: 'veeam' },
      { href: '/tickets', label: 'Tickets', source: 'glpi' },
      { href: '/transfers', label: 'Transferts', source: 'securetransport' },
    ],
  },
];

const settingsItem: NavItem = { href: '/settings', label: 'Settings', icon: Settings };

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = session?.user?.role === 'admin';
  const allowedPages = session?.user?.allowedPages;

  const filteredSections = useMemo(() => {
    if (isAdmin || !allowedPages) return navSections;
    return navSections.map((section) => ({
      ...section,
      items: section.items.filter((item) => allowedPages.includes(item.href)),
    }));
  }, [isAdmin, allowedPages]);

  const showSettings = isAdmin || !allowedPages;

  const isItemActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const renderNavLink = (item: NavItem) => {
    const active = isItemActive(item.href);
    const Icon = item.icon;

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
          active
            ? 'text-foreground border-primary -ml-[2px] border-l-2 bg-white/[0.07] pl-[14px]'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
        )}
      >
        {item.source ? (
          <SourceLogo source={item.source} size={18} className={cn(!active && 'opacity-70')} />
        ) : Icon ? (
          <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-primary')} />
        ) : null}
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{linkContent}</div>;
  };

  return (
    <div
      className={cn(
        'border-border/30 bg-sidebar relative flex h-screen flex-col border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-56 2xl:w-64',
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center px-4">
        {!collapsed ? (
          <>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="bg-primary/15 flex h-8 w-8 items-center justify-center rounded-lg">
                <Zap className="text-primary h-4 w-4" />
              </div>
              <span className="from-primary to-primary/60 bg-gradient-to-r bg-clip-text text-sm font-bold tracking-tight text-transparent">
                SysAdmin
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground hover:text-foreground ml-auto h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="mx-auto flex flex-col items-center gap-1">
            <Link href="/">
              <div className="bg-primary/15 flex h-8 w-8 items-center justify-center rounded-lg">
                <Zap className="text-primary h-4 w-4" />
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              className="text-muted-foreground hover:text-foreground h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Decorative accent line */}
      <div className="from-primary/40 via-primary/10 mx-3 h-px bg-gradient-to-r to-transparent" />

      {/* Navigation sections */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-4 px-3">
          {filteredSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="text-muted-foreground/60 mb-2 flex items-center gap-1.5 px-3 text-[11px] font-semibold tracking-wider uppercase">
                  <span className="bg-primary/50 inline-block h-1 w-1 rounded-full" />
                  {section.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">{section.items.map(renderNavLink)}</div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Settings at bottom — admin only */}
      {showSettings && <div className="border-border/30 border-t px-3 py-3">{renderNavLink(settingsItem)}</div>}
    </div>
  );
}
