'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SourceStatusDots } from '@/components/layout/SourceStatusDots';
import { Separator } from '@/components/ui/separator';

export function Topbar() {
  const { data: session } = useSession();

  const userName = session?.user?.name || 'Admin';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="relative">
      <div className="border-border/50 bg-background/50 flex h-12 items-center justify-between border-b px-4 backdrop-blur-sm lg:px-6">
        {/* Left: Welcome message */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            Welcome back, <span className="text-primary font-medium">{userName}</span>
          </span>
        </div>

        {/* Right: source indicators + user */}
        <div className="flex items-center gap-3">
          {/* Source status indicators - hidden on small screens */}
          <SourceStatusDots />

          <Separator orientation="vertical" className="hidden h-5 lg:block" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex h-8 items-center gap-2 px-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground hidden text-sm sm:inline">{userName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {userName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Deconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Subtle gradient accent line */}
      <div className="from-primary/30 via-primary/10 absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r to-transparent" />
    </header>
  );
}
