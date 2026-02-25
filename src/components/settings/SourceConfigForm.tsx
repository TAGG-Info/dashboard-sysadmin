'use client';

import { useState, useCallback } from 'react';
import { Eye, EyeOff, Loader2, Save, Plug, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type SourceName = 'prtg' | 'vcenter' | 'proxmox' | 'veeam' | 'glpi' | 'securetransport';

export interface SourceConfigFormProps {
  source: SourceName;
  /** Existing config fields for this instance (null for brand new instance) */
  config: Record<string, string> | null;
  /** Instance ID (undefined for new instances that haven't been saved yet) */
  instanceId?: string;
  /** Instance name (pre-filled for existing, user-provided for new) */
  instanceName?: string;
  /** Called after a successful save or delete. For new instances, receives the generated instanceId. */
  onSave: (newInstanceId?: string) => void;
  /** Called when user clicks delete and confirms */
  onDelete?: () => void;
  /** Whether this is a new instance being created */
  isNew?: boolean;
}

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  defaultValue?: string;
}

const sourceLabels: Record<SourceName, string> = {
  prtg: 'PRTG',
  vcenter: 'VMware',
  proxmox: 'Proxmox',
  veeam: 'Veeam',
  glpi: 'GLPI',
  securetransport: 'SecureTransport',
};

const sourceFields: Record<SourceName, FieldDef[]> = {
  prtg: [
    { key: 'baseUrl', label: 'URL API', placeholder: 'https://prtg:1616' },
    { key: 'apiKey', label: 'API Key', secret: true },
    { key: 'externalUrl', label: 'URL interface web', placeholder: 'https://prtg.example.com' },
  ],
  vcenter: [
    { key: 'baseUrl', label: 'URL de base', placeholder: 'https://vcenter.example.com' },
    { key: 'username', label: "Nom d'utilisateur" },
    { key: 'password', label: 'Mot de passe', secret: true },
    { key: 'externalUrl', label: 'URL externe', placeholder: 'https://vcenter.example.com/ui' },
  ],
  proxmox: [
    { key: 'baseUrl', label: 'URL de base', placeholder: 'https://proxmox.example.com:8006' },
    { key: 'tokenId', label: 'Token ID', placeholder: 'user@pam!tokenname' },
    { key: 'tokenSecret', label: 'Token Secret', secret: true },
    { key: 'externalUrl', label: 'URL externe', placeholder: 'https://proxmox.example.com:8006' },
  ],
  veeam: [
    { key: 'baseUrl', label: 'URL VBEM', placeholder: 'https://vbem.example.com:9398' },
    { key: 'username', label: "Nom d'utilisateur" },
    { key: 'password', label: 'Mot de passe', secret: true },
    { key: 'psBaseUrl', label: 'URL PS Bridge (optionnel)', placeholder: 'http://vbr.example.com:9420' },
    { key: 'externalUrl', label: 'URL externe', placeholder: 'https://vbem.example.com' },
  ],
  glpi: [
    { key: 'baseUrl', label: 'URL API', placeholder: 'https://glpi/apirest.php' },
    { key: 'appToken', label: 'App Token', secret: true },
    { key: 'userToken', label: 'User Token', secret: true },
    { key: 'externalUrl', label: 'URL externe', placeholder: 'https://glpi.example.com' },
  ],
  securetransport: [
    { key: 'baseUrl', label: 'URL de base', placeholder: 'https://st.example.com' },
    { key: 'username', label: "Nom d'utilisateur" },
    { key: 'password', label: 'Mot de passe', secret: true },
    { key: 'apiVersion', label: 'Version API', defaultValue: 'v2.0' },
    { key: 'externalUrl', label: 'URL externe', placeholder: 'https://st.example.com' },
  ],
};

export function SourceConfigForm({
  source,
  config,
  instanceId,
  instanceName: initialInstanceName,
  onSave,
  onDelete,
  isNew,
}: SourceConfigFormProps) {
  const fields = sourceFields[source];

  const [instanceName, setInstanceName] = useState(initialInstanceName || '');

  // Initialize form values from config or defaults
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((field) => {
      if (config && config[field.key] && config[field.key] !== '****') {
        initial[field.key] = config[field.key];
      } else if (field.defaultValue) {
        initial[field.key] = field.defaultValue;
      } else {
        initial[field.key] = '';
      }
    });
    return initial;
  });

  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isLoading = testing || saving || deleting;

  const toggleSecret = useCallback((key: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Build the config payload, sending **** for unchanged secret fields
  const buildPayload = useCallback((): Record<string, string> => {
    const payload: Record<string, string> = {};
    // Always include instance name
    payload.name = instanceName;
    fields.forEach((field) => {
      const value = formValues[field.key];
      if (field.secret) {
        if (value && value !== '') {
          // User typed a new value
          payload[field.key] = value;
        } else if (config?.[field.key] === '****') {
          // Secret exists on server but user didn't change it — send **** to keep it
          payload[field.key] = '****';
        } else {
          payload[field.key] = value || '';
        }
      } else {
        payload[field.key] = value || '';
      }
    });
    return payload;
  }, [fields, formValues, instanceName, config]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/settings/sources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, instanceId, config: buildPayload() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Connecte${data.latency !== undefined ? ` (${data.latency} ms)` : ''}`);
      } else {
        toast.error(data.error || `Erreur HTTP ${res.status}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setTesting(false);
    }
  }, [source, instanceId, buildPayload]);

  const handleSave = useCallback(async () => {
    if (!instanceName.trim()) {
      toast.error("Le nom de l'instance est requis");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        source,
        config: buildPayload(),
      };
      if (instanceId) {
        body.instanceId = instanceId;
      }

      const res = await fetch('/api/settings/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.success('Configuration sauvegardee');
        onSave(data.instanceId);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Erreur HTTP ${res.status}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setSaving(false);
    }
  }, [source, instanceId, buildPayload, onSave, instanceName]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/settings/sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, instanceId }),
      });
      if (res.ok) {
        toast.success('Instance supprimee');
        onDelete?.();
        onSave();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Erreur HTTP ${res.status}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [source, instanceId, confirmDelete, onDelete, onSave]);

  return (
    <div className="space-y-4">
      {/* Instance name field */}
      <div className="space-y-2">
        <Label htmlFor={`${source}-${instanceId || 'new'}-name`} className="text-muted-foreground text-sm">
          Nom de l&apos;instance <span className="text-[#ef4444]">*</span>
        </Label>
        <Input
          id={`${source}-${instanceId || 'new'}-name`}
          type="text"
          value={instanceName}
          onChange={(e) => setInstanceName(e.target.value)}
          placeholder={`Ex: ${sourceLabels[source]} Production`}
          className="bg-background border-border/60"
          disabled={isLoading}
        />
      </div>

      {/* Form fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const isSecret = field.secret === true;
          const isMasked = isSecret && config?.[field.key] === '****';
          const isVisible = visibleSecrets[field.key] || false;

          return (
            <div key={field.key} className="space-y-2">
              <Label
                htmlFor={`${source}-${instanceId || 'new'}-${field.key}`}
                className="text-muted-foreground text-sm"
              >
                {field.label}
              </Label>
              <div className="relative">
                <Input
                  id={`${source}-${instanceId || 'new'}-${field.key}`}
                  type={isSecret && !isVisible ? 'password' : 'text'}
                  value={formValues[field.key]}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={isMasked ? '****  (laisser vide pour conserver)' : field.placeholder || ''}
                  className="bg-background border-border/60 pr-10"
                  disabled={isLoading}
                />
                {isSecret && (
                  <button
                    type="button"
                    onClick={() => toggleSecret(field.key)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 transition-colors"
                    tabIndex={-1}
                  >
                    {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions and results */}
      <div className="flex flex-col items-start gap-3 pt-2 sm:flex-row sm:items-center">
        <Button variant="outline" size="sm" onClick={handleTest} disabled={isLoading} className="gap-2">
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
          Tester la connexion
        </Button>

        <Button size="sm" onClick={handleSave} disabled={isLoading} className="gap-2">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Sauvegarder
        </Button>

        {/* Delete button (only for existing instances) */}
        {!isNew && instanceId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
            className={`ml-auto gap-2 ${
              confirmDelete
                ? 'border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444]/10'
                : 'text-[#ef4444] hover:bg-[#ef4444]/10 hover:text-[#ef4444]'
            }`}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            {confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
          </Button>
        )}
      </div>
    </div>
  );
}
