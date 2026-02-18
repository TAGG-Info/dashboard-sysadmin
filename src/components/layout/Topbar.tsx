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
    <header className="flex h-12 items-center justify-between border-b border-border/50 bg-background/50 backdrop-blur-sm px-4 lg:px-6">
      {/* Left: Welcome message */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Welcome back,{' '}
          <span className="font-medium text-primary">{userName}</span>
        </span>
      </div>

      {/* Right: source indicators + user */}
      <div className="flex items-center gap-3">
        {/* Source status indicators - hidden on small screens */}
        <SourceStatusDots />

        <Separator orientation="vertical" className="hidden lg:block h-5" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 h-8"
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm text-foreground">
                {userName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {userName}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Deconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
