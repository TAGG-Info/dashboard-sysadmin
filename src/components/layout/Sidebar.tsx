'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
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
  const [collapsed, setCollapsed] = useState(false);

  const isItemActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const renderNavLink = (item: NavItem) => {
    const active = isItemActive(item.href);
    const Icon = item.icon;

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
          active
            ? 'bg-white/[0.07] text-foreground border-l-2 border-primary -ml-[2px] pl-[14px]'
            : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
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
        'relative flex h-screen flex-col border-r border-border/50 bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center px-4">
        {!collapsed ? (
          <>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">
                SysAdmin
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="ml-auto h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 mx-auto">
            <Link href="/">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Zap className="h-4 w-4 text-primary" />
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation sections */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-4 px-3">
          {navSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map(renderNavLink)}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Settings at bottom */}
      <div className="border-t border-border/30 px-3 py-3">
        {renderNavLink(settingsItem)}
      </div>
    </div>
  );
}
