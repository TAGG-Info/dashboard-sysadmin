import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';
import { TimeAgo } from '@/components/ui/TimeAgo';
import type { GLPITicket } from '@/types/glpi';

const STATUS_LABELS: Record<number, string> = {
  1: 'Nouveau',
  2: 'Assigne',
  3: 'Planifie',
  4: 'En attente',
  5: 'Resolu',
  6: 'Clos',
};

const STATUS_MAP: Record<number, 'new' | 'info' | 'neutral' | 'warning' | 'healthy' | 'critical'> = {
  1: 'new',
  2: 'info',
  3: 'info',
  4: 'warning',
  5: 'healthy',
  6: 'neutral',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Tres basse',
  2: 'Basse',
  3: 'Moyenne',
  4: 'Haute',
  5: 'Tres haute',
  6: 'Majeure',
};

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-[#6b7280]/15 text-[#6b7280] border-transparent',
  2: 'bg-[#6b7280]/15 text-[#6b7280] border-transparent',
  3: 'bg-[#3b82f6]/15 text-[#3b82f6] border-transparent',
  4: 'bg-[#f59e0b]/15 text-[#f59e0b] border-transparent',
  5: 'bg-[#ef4444]/15 text-[#ef4444] border-transparent',
  6: 'bg-[#ef4444]/15 text-[#ef4444] border-transparent',
};

const TYPE_LABELS: Record<number, string> = {
  1: 'Incident',
  2: 'Demande',
};

interface TicketCardProps {
  ticket: GLPITicket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const glpiUrl = process.env.NEXT_PUBLIC_GLPI_URL || '';
  const ticketUrl = `${glpiUrl}/front/ticket.form.php?id=${ticket.id}`;

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              #{ticket.id} - {ticket.name}
            </p>
          </div>
          <ExternalLink
            href={ticketUrl}
            label="GLPI"
            source="glpi"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={STATUS_MAP[ticket.status] || 'neutral'}
            label={STATUS_LABELS[ticket.status] || `Statut ${ticket.status}`}
          />
          <Badge className={PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS[3]}>
            {PRIORITY_LABELS[ticket.priority] || `P${ticket.priority}`}
          </Badge>
          <Badge variant="outline" className="text-sm">
            {TYPE_LABELS[ticket.type] || `Type ${ticket.type}`}
          </Badge>
        </div>

        {(ticket._users_id_requester || ticket._users_id_assign) && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {ticket._users_id_requester && (
              <span>De : <span className="text-foreground">{ticket._users_id_requester}</span></span>
            )}
            {ticket._users_id_assign && (
              <span>Assigné : <span className="text-foreground">{ticket._users_id_assign}</span></span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Cree</span>
          <TimeAgo date={ticket.date} />
          {ticket.date_mod !== ticket.date && (
            <>
              <span className="text-border">|</span>
              <span>Modifie</span>
              <TimeAgo date={ticket.date_mod} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
