'use client';

import { useState, useMemo, useEffect } from 'react';
import { ShieldCheck, Plus, Pencil, Trash2, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useRoles } from '@/hooks/useRoles';
import { DASHBOARD_PAGES } from '@/types/roles';
import type { DashboardRole } from '@/types/roles';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

interface RoleFormState {
  id: string;
  name: string;
  adGroups: string[];
  pages: string[];
}

const emptyForm: RoleFormState = { id: '', name: '', adGroups: [], pages: [] };

export function RoleManager() {
  const { roles, loading, error, createRole, updateRole, deleteRole } = useRoles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<DashboardRole | null>(null);
  const [form, setForm] = useState<RoleFormState>(emptyForm);
  const [adGroupInput, setAdGroupInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const isEditing = editingRole !== null;

  const openCreateDialog = () => {
    setEditingRole(null);
    setForm(emptyForm);
    setAdGroupInput('');
    setDialogOpen(true);
  };

  const openEditDialog = (role: DashboardRole) => {
    setEditingRole(role);
    setForm({
      id: role.id,
      name: role.name,
      adGroups: [...role.adGroups],
      pages: [...role.pages],
    });
    setAdGroupInput('');
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      id: isEditing ? prev.id : toSlug(name),
    }));
  };

  const addAdGroup = () => {
    const group = adGroupInput.trim();
    if (!group) return;
    if (form.adGroups.includes(group)) {
      setAdGroupInput('');
      return;
    }
    setForm((prev) => ({ ...prev, adGroups: [...prev.adGroups, group] }));
    setAdGroupInput('');
  };

  const removeAdGroup = (group: string) => {
    setForm((prev) => ({ ...prev, adGroups: prev.adGroups.filter((g) => g !== group) }));
  };

  const togglePage = (path: string) => {
    setForm((prev) => ({
      ...prev,
      pages: prev.pages.includes(path) ? prev.pages.filter((p) => p !== path) : [...prev.pages, path],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    if (!form.id || form.id.length < 2) {
      toast.error("L'identifiant doit contenir au moins 2 caracteres");
      return;
    }
    if (form.pages.length === 0) {
      toast.error('Selectionnez au moins une page');
      return;
    }

    setSaving(true);
    const errMsg = isEditing
      ? await updateRole({ id: form.id, name: form.name, adGroups: form.adGroups, pages: form.pages })
      : await createRole({ id: form.id, name: form.name, adGroups: form.adGroups, pages: form.pages });

    setSaving(false);
    if (errMsg) {
      toast.error(errMsg);
    } else {
      toast.success(isEditing ? 'Role modifie' : 'Role cree');
      setDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    const errMsg = await deleteRole(id);
    setSaving(false);
    if (errMsg) {
      toast.error(errMsg);
    } else {
      toast.success('Role supprime');
    }
    setConfirmDelete(null);
  };

  const sortedRoles = useMemo(() => {
    return [...roles].sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [roles]);

  const pageLabel = (path: string) => {
    const page = DASHBOARD_PAGES.find((p) => p.path === path);
    if (page) return page.label;
    if (path === '/settings') return 'Parametres';
    return path;
  };

  return (
    <div className="bg-card border-border/60 overflow-hidden rounded-lg border">
      {/* Header */}
      <div className="border-border/60 flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
            <ShieldCheck className="text-muted-foreground h-4 w-4" />
          </div>
          <div>
            <h3 className="text-foreground text-sm font-semibold">Roles &amp; Acces</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">Mappez les groupes AD vers les pages du dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && roles.length > 0 && (
            <Badge variant="secondary" className="h-5 px-2 text-xs font-medium">
              {roles.length} role{roles.length > 1 ? 's' : ''}
            </Badge>
          )}
          <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Role List */}
      <div className="space-y-2 p-3">
        {loading ? (
          <>
            {[1, 2].map((k) => (
              <div key={k} className="border-border/60 bg-muted/50 h-24 animate-pulse rounded-lg border" />
            ))}
          </>
        ) : sortedRoles.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">Aucun role configure</div>
        ) : (
          sortedRoles.map((role) => (
            <div key={role.id} className="border-border/60 bg-card space-y-3 rounded-lg border p-4">
              {/* Role header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm font-semibold">{role.name}</span>
                  <span className="text-muted-foreground font-mono text-xs">({role.id})</span>
                  {role.isSystem && (
                    <Badge className="h-5 gap-1 border-amber-500/20 bg-amber-500/10 px-1.5 text-[10px] text-amber-400">
                      <Lock className="h-2.5 w-2.5" />
                      Systeme
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground h-7 w-7"
                    onClick={() => openEditDialog(role)}
                    disabled={false}
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-7 w-7"
                    onClick={() => setConfirmDelete(role.id)}
                    disabled={!!role.isSystem}
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* AD Groups */}
              <div className="space-y-1">
                <span className="text-muted-foreground/60 text-[11px] font-semibold tracking-wider uppercase">
                  Groupes AD
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {role.adGroups.length > 0 ? (
                    role.adGroups.map((group) => (
                      <Badge key={group} variant="secondary" className="font-mono text-xs">
                        {group}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-xs italic">Aucun groupe</span>
                  )}
                </div>
              </div>

              {/* Pages */}
              <div className="space-y-1">
                <span className="text-muted-foreground/60 text-[11px] font-semibold tracking-wider uppercase">
                  Pages autorisees
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {role.pages.map((path) => (
                    <Badge key={path} variant="outline" className="text-xs">
                      {pageLabel(path)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Modifier le role' : 'Nouveau role'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Modifiez les proprietes du role.'
                : 'Creez un role pour mapper des groupes AD aux pages du dashboard.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Display name */}
            <div className="space-y-2">
              <Label htmlFor="role-name">Nom d&apos;affichage</Label>
              <Input
                id="role-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="ex: Comptabilite"
              />
            </div>

            {/* Slug / ID */}
            <div className="space-y-2">
              <Label htmlFor="role-id">Identifiant</Label>
              <Input
                id="role-id"
                value={form.id}
                onChange={(e) => !isEditing && setForm((prev) => ({ ...prev, id: e.target.value }))}
                placeholder="ex: compta"
                readOnly={isEditing}
                className={isEditing ? 'cursor-not-allowed opacity-60' : ''}
              />
              {!isEditing && (
                <p className="text-muted-foreground text-[11px]">
                  Auto-genere depuis le nom. Minuscules, chiffres et tirets uniquement.
                </p>
              )}
            </div>

            {/* AD Groups */}
            <div className="space-y-2">
              <Label>Groupes AD</Label>
              <div className="flex gap-2">
                <Input
                  value={adGroupInput}
                  onChange={(e) => setAdGroupInput(e.target.value)}
                  placeholder="ex: GS-COMPTA"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAdGroup();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addAdGroup} className="shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {form.adGroups.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {form.adGroups.map((group) => (
                    <Badge key={group} variant="secondary" className="gap-1 pr-1 font-mono text-xs">
                      {group}
                      <button
                        type="button"
                        onClick={() => removeAdGroup(group)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-white/10"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Pages checkboxes */}
            <div className="space-y-2">
              <Label>Pages autorisees</Label>
              <div className="grid grid-cols-2 gap-2">
                {DASHBOARD_PAGES.map((page) => (
                  <label
                    key={page.path}
                    className="border-border/60 bg-card hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={form.pages.includes(page.path)}
                      onChange={() => togglePage(page.path)}
                      className="text-primary focus:ring-primary/30 accent-primary h-4 w-4 rounded border-white/20 bg-white/5"
                    />
                    <span className="text-foreground text-sm">{page.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation Dialog */}
      <Dialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le role</DialogTitle>
            <DialogDescription>Cette action est irreversible. Le role sera supprime definitivement.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={saving}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={saving}
            >
              {saving ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
