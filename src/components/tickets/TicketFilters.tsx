'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface TicketFilterValues {
  status: string;
  priority: string;
  type: string;
}

interface TicketFiltersProps {
  filters: TicketFilterValues;
  onFilterChange: (filters: TicketFilterValues) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: '1', label: 'Nouveau' },
  { value: '2', label: 'Assigne' },
  { value: '3', label: 'Planifie' },
  { value: '4', label: 'En attente' },
  { value: '5', label: 'Resolu' },
  { value: '6', label: 'Clos' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Toutes les priorites' },
  { value: '1', label: 'Tres basse' },
  { value: '2', label: 'Basse' },
  { value: '3', label: 'Moyenne' },
  { value: '4', label: 'Haute' },
  { value: '5', label: 'Tres haute' },
  { value: '6', label: 'Majeure' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'Tous les types' },
  { value: '1', label: 'Incident' },
  { value: '2', label: 'Demande' },
];

export function TicketFilters({ filters, onFilterChange }: TicketFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.status}
        onValueChange={(value) =>
          onFilterChange({ ...filters, status: value })
        }
      >
        <SelectTrigger className="w-[180px] bg-card border-border/50">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(value) =>
          onFilterChange({ ...filters, priority: value })
        }
      >
        <SelectTrigger className="w-[180px] bg-card border-border/50">
          <SelectValue placeholder="Priorite" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.type}
        onValueChange={(value) =>
          onFilterChange({ ...filters, type: value })
        }
      >
        <SelectTrigger className="w-[160px] bg-card border-border/50">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
