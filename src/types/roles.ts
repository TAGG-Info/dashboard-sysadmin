export interface DashboardRole {
  id: string; // slug unique (ex: 'admin', 'compta', 'support')
  name: string; // nom d'affichage (ex: 'Administrateur', 'Comptabilité')
  adGroups: string[]; // groupes AD associés (ex: ['GS-SYSADMINS'])
  pages: string[]; // pages autorisées (ex: ['/', '/monitoring', '/tickets'])
  isSystem?: boolean; // true pour admin — non supprimable/modifiable sur certains champs
}

export const DASHBOARD_PAGES = [
  { path: '/', label: 'Accueil' },
  { path: '/monitoring', label: 'Monitoring' },
  { path: '/infrastructure', label: 'Infrastructure' },
  { path: '/backups', label: 'Sauvegardes' },
  { path: '/transfers', label: 'Transferts' },
  { path: '/tickets', label: 'Tickets' },
] as const;

export type DashboardPagePath = (typeof DASHBOARD_PAGES)[number]['path'];

export const ALL_PAGE_PATHS: string[] = DASHBOARD_PAGES.map((p) => p.path);
