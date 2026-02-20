import type { GLPITicket, GLPITicketSummary, GLPITicketStatus, GLPIPriority, GLPITicketType } from '@/types/glpi';
import type { GLPIInstance } from '@/lib/config';
import { loggers } from '@/lib/logger';

// GLPI Search API — search option IDs for Ticket
const SF = {
  ID: 2,
  NAME: 1,
  STATUS: 12,
  PRIORITY: 3,
  URGENCY: 10,
  TYPE: 14,
  DATE: 15,
  DATE_MOD: 19,
  SOLVEDATE: 17,
  CLOSEDATE: 16,
  CONTENT: 21,
  CATEGORY: 7,
} as const;

interface GLPISearchResponse {
  totalcount: number;
  count: number;
  data: Record<string, string | number | null>[];
}

export class GLPIClient {
  private baseUrl: string;
  private appToken: string;
  private userToken: string;
  private sessionToken: string | null = null;
  private sessionExpiry: number = 0;
  private sessionPromise: Promise<string> | null = null;

  constructor(config: GLPIInstance) {
    this.baseUrl = config.baseUrl;
    this.appToken = config.appToken;
    this.userToken = config.userToken;
  }

  private async getSession(): Promise<string> {
    if (this.sessionToken && Date.now() < this.sessionExpiry) {
      return this.sessionToken;
    }

    // Deduplicate concurrent session init requests
    if (this.sessionPromise) return this.sessionPromise;

    this.sessionPromise = this.initSession();
    try {
      return await this.sessionPromise;
    } finally {
      this.sessionPromise = null;
    }
  }

  private async initSession(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/initSession`, {
      headers: {
        'App-Token': this.appToken,
        Authorization: `user_token ${this.userToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      loggers.glpi.error({ status: res.status }, 'GLPI auth failed');
      throw new Error(`GLPI auth failed: ${res.status}`);
    }

    const data = await res.json();
    if (!data.session_token) {
      throw new Error('GLPI: session_token manquant dans la réponse initSession');
    }
    this.sessionToken = data.session_token;
    this.sessionExpiry = Date.now() + 50 * 60 * 1000;
    return this.sessionToken!;
  }

  async request<T>(path: string): Promise<T> {
    const session = await this.getSession();
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Session-Token': session,
        'App-Token': this.appToken,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401) {
      this.sessionToken = null;
      const newSession = await this.getSession();
      const retry = await fetch(`${this.baseUrl}${path}`, {
        headers: {
          'Session-Token': newSession,
          'App-Token': this.appToken,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!retry.ok) {
        loggers.glpi.error({ status: retry.status, path }, 'GLPI API error after re-auth');
        throw new Error(`GLPI error: ${retry.status}`);
      }
      return retry.json();
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      loggers.glpi.error({ status: res.status, path, body: body.slice(0, 500) }, 'GLPI API error');
      throw new Error(`GLPI error: ${res.status}`);
    }
    return res.json();
  }

  // Tickets ouverts via /search/Ticket avec criteres serveur-side
  // Statuts: 1=Nouveau, 2=Assigne, 3=Planifie, 4=En attente
  async getTickets(): Promise<GLPITicket[]> {
    const params = new URLSearchParams();

    // Criteres: status IN (1, 2, 3, 4)
    for (let i = 0; i < 4; i++) {
      if (i > 0) params.append(`criteria[${i}][link]`, 'OR');
      params.append(`criteria[${i}][field]`, String(SF.STATUS));
      params.append(`criteria[${i}][searchtype]`, 'equals');
      params.append(`criteria[${i}][value]`, String(i + 1));
    }

    // Champs a retourner
    const fields = [
      SF.ID,
      SF.NAME,
      SF.STATUS,
      SF.PRIORITY,
      SF.URGENCY,
      SF.TYPE,
      SF.DATE,
      SF.DATE_MOD,
      SF.SOLVEDATE,
      SF.CLOSEDATE,
      SF.CONTENT,
      SF.CATEGORY,
    ];
    fields.forEach((f, i) => params.append(`forcedisplay[${i}]`, String(f)));

    // Tri par date_mod desc, max 200 tickets
    params.append('sort', String(SF.DATE_MOD));
    params.append('order', 'DESC');
    params.append('range', '0-199');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.request<any>(`/search/Ticket?${params.toString()}`);

    // GLPI search peut retourner data comme array ou object (as_map)
    let rows: Record<string, string | number | null>[];
    if (Array.isArray(result.data)) {
      rows = result.data;
    } else if (result.data && typeof result.data === 'object') {
      rows = Object.values(result.data);
    } else {
      loggers.glpi.warn({ response: JSON.stringify(result).slice(0, 300) }, 'GLPI search returned no data');
      return [];
    }

    loggers.glpi.info({ totalcount: result.totalcount, count: rows.length }, 'GLPI tickets fetched');

    return rows.map((row) => ({
      id: Number(row[SF.ID]),
      name: String(row[SF.NAME] ?? ''),
      status: Number(row[SF.STATUS]) as GLPITicketStatus,
      priority: Number(row[SF.PRIORITY]) as GLPIPriority,
      urgency: Number(row[SF.URGENCY]),
      type: Number(row[SF.TYPE]) as GLPITicketType,
      date: String(row[SF.DATE] ?? ''),
      date_mod: String(row[SF.DATE_MOD] ?? ''),
      solvedate: row[SF.SOLVEDATE] ? String(row[SF.SOLVEDATE]) : undefined,
      closedate: row[SF.CLOSEDATE] ? String(row[SF.CLOSEDATE]) : undefined,
      content: row[SF.CONTENT] ? String(row[SF.CONTENT]) : undefined,
      itilcategories_id: row[SF.CATEGORY] ? Number(row[SF.CATEGORY]) : undefined,
    }));
  }

  async getTicket(id: number): Promise<GLPITicket> {
    return this.request<GLPITicket>(`/Ticket/${id}`);
  }

  // Calcule le summary a partir des tickets
  async getTicketSummary(): Promise<GLPITicketSummary> {
    const tickets = await this.getTickets();
    const byStatus: Record<number, number> = {};
    const byPriority: Record<number, number> = {};
    let solvedCount = 0;
    let totalResolutionMs = 0;

    for (const t of tickets) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      if (t.solvedate && t.date) {
        solvedCount++;
        totalResolutionMs += new Date(t.solvedate).getTime() - new Date(t.date).getTime();
      }
    }

    return {
      total: tickets.length,
      byStatus,
      byPriority,
      openCount: tickets.filter((t) => t.status <= 4).length,
      criticalCount: tickets.filter((t) => t.priority >= 5).length,
      avgResolutionHours: solvedCount > 0 ? totalResolutionMs / solvedCount / 3600000 : undefined,
    };
  }
}

// Factory that caches clients by instanceId (session-based, cache is critical)
const clientCache = new Map<string, GLPIClient>();

export function getGLPIClient(instance: GLPIInstance): GLPIClient {
  const cached = clientCache.get(instance.id);
  if (cached) return cached;
  const client = new GLPIClient(instance);
  clientCache.set(instance.id, client);
  return client;
}
