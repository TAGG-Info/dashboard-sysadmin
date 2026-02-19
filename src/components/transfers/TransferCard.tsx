import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExternalLink } from '@/components/ui/ExternalLink';

interface TransferCardProps {
  name: string;
  type: 'account' | 'certificate';
  status: 'active' | 'disabled';
  href?: string;
}

export function TransferCard({ name, type, status, href }: TransferCardProps) {
  const isActive = status === 'active';

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex min-w-0 items-center gap-3">
          <StatusBadge status={isActive ? 'healthy' : 'neutral'} label={isActive ? 'Actif' : 'Desactive'} />
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-medium">{name}</p>
            <Badge variant="outline" className="mt-1 text-sm">
              {type === 'account' ? 'Compte' : 'Certificat'}
            </Badge>
          </div>
        </div>
        {href && <ExternalLink href={href} label="Voir" source="securetransport" />}
      </CardContent>
    </Card>
  );
}
