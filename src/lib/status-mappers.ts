// Veeam job result → StatusLevel (from JobList.tsx + JobCard.tsx)
export function resultToStatus(result?: string): 'healthy' | 'warning' | 'critical' | 'neutral' {
  if (!result) return 'neutral';
  switch (result.toLowerCase()) {
    case 'success':
      return 'healthy';
    case 'warning':
      return 'warning';
    case 'failed':
    case 'error':
      return 'critical';
    case 'none':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function resultLabel(result?: string): string {
  if (!result) return 'N/A';
  switch (result.toLowerCase()) {
    case 'success':
      return 'Success';
    case 'warning':
      return 'Warning';
    case 'failed':
      return 'Failed';
    case 'none':
      return 'Jamais execute';
    default:
      return result;
  }
}

// vCenter power state (from VMList.tsx)
export function powerStateToStatus(state: string): 'healthy' | 'warning' | 'neutral' {
  switch (state.toUpperCase()) {
    case 'POWERED_ON':
      return 'healthy';
    case 'SUSPENDED':
      return 'warning';
    case 'POWERED_OFF':
    default:
      return 'neutral';
  }
}

export function powerStateLabel(state: string): string {
  switch (state.toUpperCase()) {
    case 'POWERED_ON':
      return 'On';
    case 'POWERED_OFF':
      return 'Off';
    case 'SUSPENDED':
      return 'Suspended';
    default:
      return state;
  }
}

// PRTG device status (from DeviceTree.tsx)
export function prtgStatusToLevel(status: string): 'healthy' | 'warning' | 'critical' | 'info' | 'neutral' {
  switch (status) {
    case 'Down':
      return 'critical';
    case 'Warning':
    case 'Unusual':
      return 'warning';
    case 'Up':
      return 'healthy';
    case 'Paused':
      return 'neutral';
    default:
      return 'info';
  }
}
