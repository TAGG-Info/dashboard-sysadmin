import type { GLPITicket, GLPITicketSummary } from '@/types/glpi';
import type { GLPIInstance } from '@/lib/config';
import { loggers } from '@/lib/logger';

export class GLPIClient {
  private baseUrl: string;
  private appToken: string;
  private userToken: string;
  private sessionToken: string | null = null;
  private sessionExpiry: number = 0;

  constructor(config: GLPIInstance) {
    this.baseUrl = config.baseUrl;
    this.appToken = config.appToken;
    this.userToken = config.userToken;
  }

  private async getSession(): Promise<string> {
    if (this.sessionToken && Date.now() < this.sessionExpiry) {
      return this.sessionToken;
    }

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

  // Tickets ouverts (statuts 1=Nouveau, 2=En cours (attribue), 3=En cours (planifie), 4=En attente)
  async getTickets(): Promise<GLPITicket[]> {
    const all = await this.request<GLPITicket[]>(`/Ticket?range=0-50&order=DESC&sort=15`);
    if (!Array.isArray(all)) {
      loggers.glpi.warn(
        { responseType: typeof all, response: JSON.stringify(all).slice(0, 500) },
        'GLPI /Ticket did not return array',
      );
      return [];
    }
    loggers.glpi.info(
      { total: all.length, sampleStatus: all[0]?.status, sampleStatusType: typeof all[0]?.status },
      'GLPI tickets fetched',
    );
    return all.filter((t) => t.status <= 4);
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
