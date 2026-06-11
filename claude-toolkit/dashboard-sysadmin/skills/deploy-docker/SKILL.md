---
description: Débugger ou préparer le déploiement Docker du dashboard — image Next.js standalone, compose (app + Redis + Caddy), reverse proxy HTTPS, config chiffrée. À utiliser quand le conteneur ne démarre pas, que Caddy ne sert pas, ou avant une mise en prod.
argument-hint: "[service ou symptôme]"
---

# /deploy-docker — Stack Docker du dashboard

La stack : `docker-compose.yml` = app Next.js (Dockerfile multi-stage) + Redis 7 +
Caddy 2 (`Caddyfile`) en reverse proxy HTTPS. Entrée : `docker-entrypoint.sh`.

## Diagnostic (dans cet ordre)

1. `docker compose ps -a` puis `docker compose logs --tail=100 <service>` — cherche la
   **première** erreur, pas la dernière.
2. `docker compose config` — vérifie les variables `.env` résolues. Points sensibles du
   repo :
   - `AUTH_SECRET` / secrets NextAuth manquants → l'app démarre puis 500 sur /login
   - `REDIS_URL` absent n'est PAS bloquant (fallback mémoire) mais un `REDIS_URL` faux
     ralentit chaque requête (timeout 3s à la connexion)
   - Le volume de config chiffrée (credentials des sources AES-256-GCM) doit être monté
     et la clé de chiffrement présente, sinon les sources disparaissent
3. **Caddy** : `docker compose logs caddy` — erreurs de cert ACME ou d'upstream. Tester
   l'app en direct depuis le réseau compose :
   `docker compose exec caddy wget -qO- http://app:3000/api/health` (adapter au nom de
   service réel du compose). Si l'app répond mais pas Caddy → `Caddyfile` (domaine, TLS).
4. **LDAP depuis le conteneur** : l'app doit joindre l'AD — `scripts/test-connections.sh`
   existe pour tester les connectivités sources, utilise-le.

## Avant une mise en prod

1. `/check` complet vert.
2. `docker compose build` local sans erreur — le Dockerfile copie `package-lock.json` :
   un lockfile désynchronisé casse le build ici même si le dev local marche.
3. Vérifie que `.env.example` documente toute nouvelle variable introduite.
4. Récapitule à l'utilisateur ce qui va changer en prod AVANT tout `docker compose up -d`
   sur un hôte distant.

## Interdits

- `docker compose down -v` : détruit Redis ET la config chiffrée des sources. Jamais
  sans confirmation explicite.
- Ne jamais logger ni afficher le contenu déchiffré de la config des sources.
