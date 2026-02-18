export type GLPITicketStatus = 1 | 2 | 3 | 4 | 5 | 6;
// 1=Nouveau, 2=Assigne, 3=Planifie, 4=En attente, 5=Resolu, 6=Clos

export type GLPIPriority = 1 | 2 | 3 | 4 | 5 | 6;
// 1=Tres basse, 2=Basse, 3=Moyenne, 4=Haute, 5=Tres haute, 6=Majeure

export type GLPITicketType = 1 | 2;
// 1=Incident, 2=Demande

export const GLPI_STATUS_LABELS: Record<GLPITicketStatus, string> = {
  1: 'Nouveau',
  2: 'Assign\u00e9',
  3: 'Planifi\u00e9',
  4: 'En attente',
  5: 'R\u00e9solu',
  6: 'Clos',
};

export const GLPI_PRIORITY_LABELS: Record<GLPIPriority, string> = {
  1: 'Tr\u00e8s basse',
  2: 'Basse',
  3: 'Moyenne',
  4: 'Haute',
  5: 'Tr\u00e8s haute',
  6: 'Majeure',
};

export interface GLPITicket {
  id: number;
  name: string; // titre
  status: GLPITicketStatus;
  priority: GLPIPriority;
  urgency: number;
  type: GLPITicketType;
  date: string; // date de creation
  date_mod: string;
  solvedate?: string;
  closedate?: string;
  content?: string;
  itilcategories_id?: number;
  _users_id_requester?: string;
  _users_id_assign?: string;
}

export interface GLPITicketSummary {
  total: number;
  byStatus: Record<number, number>;
  byPriority: Record<number, number>;
  openCount: number;
  criticalCount: number; // priority >= 5
  avgResolutionHours?: number;
}
