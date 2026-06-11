# Préférences — Chris (2-LACS-IT / TAGG-Info)

## Langue et style
- Réponds en français. Le code, les identifiants, les commits et les commentaires restent en anglais.
- Va droit au but : la conclusion d'abord, les détails ensuite. Pas de blabla.
- Si tu n'es pas sûr, dis-le clairement au lieu d'inventer.

## Git
- Messages de commit : Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`).
- Jamais de commit/push sans que je le demande explicitement.
- Jamais de `--force` sur une branche partagée.
- Pas de PR sans demande explicite.

## Code
- TypeScript strict par défaut sur les projets TS. Pas de `any` sauf justification.
- Respecte les conventions du fichier voisin (imports, nommage, densité de commentaires)
  plutôt qu'un style générique.
- Avant de déclarer un travail terminé : lance les checks du projet (`/check`).

## Contexte technique
- Sysadmin/infra : Docker Compose, Caddy, Redis, LDAP/AD, Proxmox, vCenter, Veeam, PRTG, GLPI.
- Stack web habituelle : Next.js App Router + React + Tailwind + shadcn/ui.
- Bots Discord en TypeScript (discord.js).
- Python pour l'outillage (pdf-compare).
