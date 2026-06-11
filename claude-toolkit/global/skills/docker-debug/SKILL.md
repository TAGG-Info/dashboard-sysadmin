---
description: Debug méthodique d'une stack Docker Compose — conteneurs qui crashent, services injoignables, problèmes réseau/volumes/healthchecks. À utiliser pour media-stack, dashboard-sysadmin, ou toute stack docker compose qui ne démarre pas ou se comporte mal.
argument-hint: "[nom du service, optionnel]"
---

# /docker-debug — Debug Docker Compose

## Démarche (dans cet ordre, ne saute pas d'étape)

1. **Vue d'ensemble** : `docker compose ps -a` — repère les services en `Exited`,
   `Restarting`, ou `unhealthy`. Si `$ARGUMENTS` cible un service, commence par lui mais
   vérifie quand même ses dépendances (`depends_on`).

2. **Logs du suspect** : `docker compose logs --tail=100 <service>`. Cherche la PREMIÈRE
   erreur, pas la dernière — les erreurs en cascade masquent la cause racine.

3. **Config effective** : `docker compose config` — montre le YAML résolu (variables
   d'env substituées). Vérifie en particulier :
   - Variables `.env` manquantes (elles deviennent des chaînes vides silencieuses)
   - Ports en conflit (`ss -tlnp | grep <port>` sur l'hôte)
   - Chemins de volumes inexistants ou mauvais droits (UID/GID — classique avec les
     stacks *arr et les montages NFS/SMB)

4. **Réseau** : si un service n'en joint pas un autre, teste DEPUIS le conteneur :
   `docker compose exec <svc> wget -qO- http://autre-service:port` (ou `getent hosts
   autre-service` pour le DNS). Les services se joignent par nom de service, pas par
   `localhost`.

5. **Healthcheck / démarrage** : `docker inspect <ctn> --format '{{json .State.Health}}'`.
   Un service "up" mais unhealthy bloque ses dépendants en `depends_on: condition:
   service_healthy`.

## Règles

- **Diagnostic avant action** : ne `restart`/`down`/`up --force-recreate` que quand tu
  sais POURQUOI ça va corriger. Un restart qui "répare" sans explication = problème
  toujours là.
- `docker compose down -v` détruit les volumes (= les données). Jamais sans confirmation
  explicite de l'utilisateur.
- Rapporte : cause racine → preuve (extrait de log/config) → fix appliqué ou proposé.
