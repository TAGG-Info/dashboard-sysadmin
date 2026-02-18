# Deploiement — SysAdmin Dashboard

## Deploiement Docker Compose

### Prerequis

- Docker Engine 24+ et Docker Compose v2
- Un nom de domaine interne resolu vers le serveur (ex: `dashboard.internal.example.com`)
- Acces reseau du serveur vers toutes les APIs configurees

### Architecture des services

```
Internet / Reseau interne
        |
    [Caddy :80/:443]         -- TLS auto, headers securite
        |
    [dashboard :3000]        -- Next.js standalone, lie a 127.0.0.1 uniquement
        |
    [Redis :6379]            -- Cache, reseau interne prive, non expose
```

Tous les services partagent le reseau bridge `dashboard`. Redis n'est pas accessible depuis l'exterieur. Le dashboard n'est accessible via l'exterieur que par Caddy.

### Premier deploiement

```bash
# Cloner le depot
git clone https://github.com/votre-org/dashboard-tagg.git
cd dashboard-tagg

# Preparer la configuration
cp .env.example .env.local
# Editer .env.local avec les valeurs de production (voir docs/CONFIGURATION.md)

# Lancer tous les services
docker compose up -d --build
```

L'application est accessible via le nom de domaine configure dans `Caddyfile`.

### Verifier le statut

```bash
docker compose ps
docker compose logs -f dashboard
docker compose logs -f caddy
```

---

## Variables d'environnement pour Docker

Le fichier `docker-compose.yml` charge automatiquement `.env.local` via `env_file`. Les variables suivantes sont requises en production :

```env
# Requis
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://dashboard.internal.example.com
LOCAL_ADMIN_USERNAME=admin
LOCAL_ADMIN_PASSWORD_HASH=<bcrypt-hash>

# Redis (inclus dans docker-compose)
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_PASSWORD=<mot-de-passe-fort>

# LDAP (si applicable)
LDAP_URL=ldaps://dc.internal.example.com:636
LDAP_BASE_DN=DC=internal,DC=example,DC=com
LDAP_BIND_DN=CN=svc-dashboard,OU=ServiceAccounts,DC=internal,DC=example,DC=com
LDAP_BIND_PASSWORD=<mot-de-passe-service>

# Sources d'infrastructure (ou configurer via l'interface Settings)
# PRTG_BASE_URL=https://prtg.internal.example.com:1616
# ...
```

Si `REDIS_PASSWORD` est defini, l'URL Redis doit inclure le mot de passe :

```env
REDIS_URL=redis://:votre-password@redis:6379
```

### Volume de donnees

La configuration des sources (chiffree) est stockee dans `data/config.json` a l'interieur du conteneur. Pour la persister entre les recreations de conteneur, ajouter un volume dans `docker-compose.yml` :

```yaml
services:
  dashboard:
    volumes:
      - ./data:/app/data
```

Sans ce volume, la configuration UI est perdue a chaque recreation du conteneur.

---

## Configuration Caddy

Le fichier `Caddyfile` a la racine du projet est monte dans le conteneur Caddy.

### Caddyfile par defaut

```caddy
dashboard.internal.example.com {
    reverse_proxy dashboard:3000

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
    }
}
```

**Adapter le nom de domaine** en remplacant `dashboard.internal.example.com` par votre FQDN.

### TLS automatique

Caddy obtient et renouvelle automatiquement un certificat TLS via ACME (Let's Encrypt ou ZeroSSL). Pour un reseau interne sans acces Internet :
- Utiliser un certificat interne : voir [Caddy — manual TLS](https://caddyserver.com/docs/caddyfile/directives/tls)
- Ou desactiver TLS et gerer le certificat en amont (load balancer)

### Ports Caddy

| Port | Usage |
|---|---|
| 80 | Redirection HTTP -> HTTPS (automatique) |
| 443 | HTTPS avec TLS |

Ces ports sont lies sur toutes les interfaces (`0.0.0.0`) par defaut dans `docker-compose.yml`, ce qui est normal pour Caddy qui est le point d'entree public.

---

## Mise a jour de l'application

```bash
# Recuperer les nouvelles sources
git pull

# Rebuilder et relancer uniquement le dashboard
docker compose build dashboard
docker compose up -d dashboard

# Verifier les logs apres redemarrage
docker compose logs -f dashboard
```

Pour une mise a jour complete (tous les services) :

```bash
docker compose pull          # Mettre a jour les images Redis et Caddy
docker compose build         # Rebuilder le dashboard
docker compose up -d         # Relancer tous les services
```

### Zero-downtime

Docker Compose ne garantit pas le zero-downtime nativement. Le redemarrage du conteneur `dashboard` provoque une interruption de quelques secondes. Si le zero-downtime est requis, utiliser un orchestrateur (Kubernetes, Docker Swarm) ou un load balancer avec health check.

---

## Logs et monitoring

### Consulter les logs

```bash
# Logs en temps reel
docker compose logs -f

# Logs d'un service specifique
docker compose logs -f dashboard
docker compose logs -f redis
docker compose logs -f caddy

# Derniers N logs
docker compose logs --tail=100 dashboard
```

### Health check

L'endpoint `/api/health` teste la connectivite vers toutes les sources configurees et retourne leur statut. Utilisable pour le monitoring externe (Zabbix, PRTG lui-meme, Uptime Kuma, etc.) :

```bash
curl -s https://dashboard.internal.example.com/api/health
```

Reponse exemple :
```json
[
  { "source": "prtg", "status": "connected", "latency": 42 },
  { "source": "vcenter", "status": "error", "error": "Connection refused" }
]
```

### Monitoring Redis

```bash
# Connexion au Redis du compose
docker compose exec redis redis-cli -a votre-password info memory
docker compose exec redis redis-cli -a votre-password dbsize
```

---

## Considerations de securite

### Binding reseau

Le service `dashboard` est lie uniquement a `127.0.0.1:3000` (pas expose directement). Seul Caddy expose les ports 80 et 443. Verifier dans `docker-compose.yml` :

```yaml
ports:
  - "127.0.0.1:3000:3000"   # Correct : lie localement uniquement
  # - "3000:3000"            # Incorrect : expose sur toutes les interfaces
```

Redis n'a aucun port expose a l'hote (`ports` absent dans le service redis).

### NEXTAUTH_SECRET

Le secret doit etre unique, aleatoire et suffisamment long. Il est utilise pour :
- Signer les JWT de session
- Deriver la cle de chiffrement AES-256-GCM pour `data/config.json`

**Changer ce secret invalide toutes les sessions actives et rend illisible la config existante.** Si un changement est necessaire, reconfigurer les sources dans l'interface Settings apres le changement.

### Certificats auto-signes pour les APIs internes

Si les APIs internes (vCenter, Proxmox, etc.) utilisent des certificats auto-signes :

```env
ALLOW_SELF_SIGNED_CERTS=true
```

Cela desactive la validation TLS pour toutes les requetes HTTP sortantes du serveur. Acceptable en reseau interne de confiance, a eviter en environnement expose.

Pour LDAP uniquement :
```env
LDAP_TLS_REJECT_UNAUTHORIZED=false
```

### Permissions du fichier de configuration

Le fichier `data/config.json` contient les credentials chiffres. S'assurer que :
- Le repertoire `data/` n'est pas accessible via HTTP (Next.js ne sert pas ce repertoire)
- Si un volume est monte (`./data:/app/data`), les permissions fichier sont restrictives (`chmod 600 data/config.json`)

### Headers de securite Caddy

Les headers configures dans `Caddyfile` couvrent :
- `Strict-Transport-Security` : force HTTPS, HSTS un an incluant les sous-domaines
- `X-Frame-Options: DENY` : protection contre le clickjacking
- `X-Content-Type-Options: nosniff` : prevention du MIME sniffing
- `Content-Security-Policy` : restriction des sources de contenu
- `Permissions-Policy` : desactivation des permissions navigateur non utilisees (camera, micro, geolocation)

### Protection CSRF

Les routes mutantes de `/api/settings` (POST, PUT, DELETE, PATCH) verifient que l'en-tete `Origin` correspond au `Host`. Les requetes cross-origin sont rejetees avec 403.
