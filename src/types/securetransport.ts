export interface STAccount {
  name: string;
  businessUnit?: string;
  type: string;
  disabled: boolean;
}

export interface STCertificate {
  alias: string;
  subject?: string;
  issuer?: string;
  notBefore: string;
  notAfter: string;
  type?: string;
}

/** Certificate expiring soon, enriched with instance metadata when multi-instance */
export interface STCertificateExpiring {
  alias: string;
  notAfter: string;
  _instanceId?: string;
  _instanceName?: string;
}

export interface STTransferSite {
  name: string;
  type: string;
  protocol?: string;
  host?: string;
}

export interface STTransferSummary {
  accounts: { total: number; active: number; disabled: number };
  certificates: { total: number; expiringSoon: STCertificateExpiring[] }; // < 30 jours
  sites: { total: number };
}

export interface STTransferLog {
  id: {
    mTransferStatusId: string;
    mTransferStartTime: number;
    urlrepresentation: string;
  };
  status: string;
  secure: boolean;
  resubmitted: boolean;
  account: string;
  login: string;
  incoming: boolean;
  serverInitiated: boolean;
  serverName: string;
  filename: string;
  filesize: number;
  protocol: string;
  startTime: string;
  duration: string;
  remoteDir: string;
  remotePartner: string | null;
  site: { id: string | null; name: string | null };
}

export interface STTransferLogList {
  resultSet: { returnCount: number; totalCount: number };
  transfers: STTransferLog[];
  _instanceId?: string;
  _instanceName?: string;
}
