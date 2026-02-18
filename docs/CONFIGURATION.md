# Configuration — SysAdmin Dashboard

## Variables d'environnement requises

Ces variables sont indispensables au demarrage de l'application.

| Variable | Description |
|---|---|
| `NEXTAUTH_SECRET` | Secret JWT et cle de chiffrement de la config. Generer avec `openssl rand -base64 32`. Minimum 32 caracteres. |
| `NEXTAUTH_URL` | URL canonique de l'application (ex: `https://dashboard.internal.example.com`). Requis en production. |
| `LOCAL_ADMIN_USERNAME` | Nom d'utilisateur du compte administrateur local (fallback si LDAP indisponible). |
| `LOCAL_ADMIN_PASSWORD_HASH` | Hash bcrypt du mot de passe de l'admin local. Voir la section "Generer un hash bcrypt" ci-dessous. |

### Generer un hash bcrypt

```bash
# Avec Node.js
node -e "const b = require('bcryptjs'); b.hash('votre-mot-de-passe', 10).then(h => console.log(h))"

# Ou avec Python
python3 -c "import bcrypt; print(bcrypt.hashpw(b'votre-mot-de-passe', bcrypt.gensalt(10)).decode())"
```

Copier le hash resultant (ex: `$2b$10$...`) dans `LOCAL_ADMIN_PASSWORD_HASH`.

---

## Configuration LDAP / Active Directory

LDAP est la methode d'authentification principale. Si les variables LDAP sont absentes ou si le serveur est indisponible, le systeme bascule automatiquement sur le compte admin local.

| Variable | Requis | Description | Exemple |
|---|---|---|---|
| `LDAP_URL` | Oui* | URL du serveur LDAP | `ldaps://dc.internal.example.com:636` |
| `LDAP_BASE_DN` | Oui* | Base DN de recherche | `DC=internal,DC=example,DC=com` |
| `LDAP_BIND_DN` | Oui* | DN du compte de service | `CN=svc-dashboard,OU=ServiceAccounts,DC=internal,DC=example,DC=com` |
| `LDAP_BIND_PASSWORD` | Oui* | Mot de passe du compte de service | `votre-mot-de-passe` |
| `LDAP_USER_SEARCH_FILTER` | Non | Filtre de recherche utilisateur | `(sAMAccountName={{username}})` |
| `LDAP_ADMIN_GROUP` | Non | Nom du groupe AD pour le role admin | `Dashboard-Admins` (defaut) |
| `LDAP_TLS_REJECT_UNAUTHORIZED` | Non | Valider strictement les certificats TLS LDAP | `true` (defaut) / `false` |

*Requis pour activer l'authentification LDAP. Sans ces variables, seul le compte admin local fonctionne.

### Filtre de recherche

Le placeholder `{{username}}` est remplace par le nom d'utilisateur saisi (echappe selon RFC 4515). Exemples :
- Active Directory : `(sAMAccountName={{username}})`
- OpenLDAP : `(uid={{username}})`

### Groupes et roles

Le systeme lit l'attribut `memberOf` de l'utilisateur trouve en LDAP. Si l'une des valeurs contient (insensible a la casse) le nom defini dans `LDAP_ADMIN_GROUP`, l'utilisateur recoit le role `admin`. Sinon, il recoit le role `viewer`.

### TLS LDAP

Par defaut, les certificats TLS sont valides strictement. Pour les environnements avec des certificats auto-signes ou une CA interne :

```env
LDAP_TLS_REJECT_UNAUTHORIZED=false
```

Ne desactiver qu'en reseau interne de confiance.

---

## Configuration des sources via l'interface Settings

La configuration recommandee est via l'interface web (page **Settings**, accessible aux admins). Les credentials sont chiffres en AES-256-GCM avant stockage dans `data/config.json`.

Chaque source accepte une ou plusieurs instances. Chaque instance a un `id` (slug unique) et un `name` (nom d'affichage).

### PRTG

| Champ | Description | Exemple |
|---|---|---|
| URL de base | URL interne PRTG avec port | `https://prtg.internal.example.com:1616` |
| Cle API | Bearer token PRTG v2 | Cree dans PRTG > Setup > API Keys |
| URL externe | URL pour les liens dans l'UI | `https://prtg.internal.example.com` |

L'API PRTG v2 ecoute sur le port 1616 par defaut (distinct du port web 80/443).

### VMware vCenter

| Champ | Description | Exemple |
|---|---|---|
| URL de base | URL vCenter | `https://vcenter.internal.example.com` |
| Nom d'utilisateur | Compte API vCenter | `apiuser@vsphere.local` |
| Mot de passe | Mot de passe du compte | — |
| URL externe | URL pour les liens dans l'UI (interface web) | `https://vcenter.internal.example.com/ui` |

Le compte doit avoir les permissions en lecture sur les objets cibles (VMs, hosts, datastores).

### Proxmox VE

| Champ | Description | Exemple |
|---|---|---|
| URL de base | URL Proxmox avec port | `https://proxmox.internal.example.com:8006` |
| Token ID | Identifiant du token API | `apiuser@pam!dashboard` |
| Token Secret | Secret du token API (UUID) | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| URL externe | URL pour les liens dans l'UI | `https://proxmox.internal.example.com:8006` |

Creer le token dans Proxmox > Datacenter > Permissions > API Tokens. Permissions recommandees : `VM.Audit`, `Datastore.Audit`, `Sys.Audit`.

### Veeam Backup & Replication

| Champ | Description | Exemple |
|---|---|---|
| URL de base | URL Veeam REST API avec port | `https://veeam.internal.example.com:9419` |
| Nom d'utilisateur | Compte API Veeam | `apiuser` |
| Mot de passe | Mot de passe du compte | — |
| URL externe | URL pour les liens dans l'UI | `https://veeam.internal.example.com:9419` |

Necessite Veeam B&R 12+ (REST API v1). Le compte doit avoir le role `Veeam Backup Viewer` minimum.

### GLPI

| Champ | Description | Exemple |
|---|---|---|
| URL de base | URL de l'API REST GLPI | `https://glpi.internal.example.com/apirest.php` |
| App Token | Token applicatif GLPI | Cree dans GLPI > Configuration > General > API |
| User Token | Token utilisateur GLPI | Cree dans GLPI > Mon compte > API |
| URL externe | URL pour les liens dans l'UI | `https://glpi.internal.example.com` |

Les deux tokens sont requis. L'App Token identifie l'application cliente, le User Token identifie l'utilisateur API.

### Axway SecureTransport

| Champ | Description | Exemple |
|---|---|---|
| URL de base | URL SecureTransport avec port | `https://securetransport.internal.example.com:8444` |
| Nom d'utilisateur | Compte administrateur API | `apiadmin` |
| Mot de passe | Mot de passe du compte | — |
| Version API | Version de l'API REST | `v2.0` (defaut) |
| URL externe | URL pour les liens dans l'UI | `https://securetransport.internal.example.com:8444` |

---

## Variables d'environnement optionnelles

### Application

| Variable | Description | Defaut |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Nom affiche dans l'interface | `SysAdmin Dashboard` |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'application | — |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Desactiver la validation TLS globale (mettre a `0`) | non defini (validation active) |
| `ALLOW_SELF_SIGNED_CERTS` | Alternative : wrapper qui positionne `NODE_TLS_REJECT_UNAUTHORIZED=0` | `false` |
| `CRYPTO_SALT` | Sel pour la derivation de cle AES | `dashboard-tagg-config-salt` |
| `DATA_DIR` | Repertoire de stockage de `config.json` | `./data` |

Pour autoriser les certificats auto-signes ou une CA interne, deux approches equivalentes sont possibles :

```env
# Approche 1 — variable directe (recommandee, utilisee dans .env.example)
NODE_TLS_REJECT_UNAUTHORIZED=0

# Approche 2 — wrapper (active NODE_TLS_REJECT_UNAUTHORIZED=0 via next.config.ts)
ALLOW_SELF_SIGNED_CERTS=true
```

A utiliser uniquement en reseau interne de confiance. Ces parametres s'appliquent a toutes les requetes HTTPS sortantes du serveur (vCenter, Proxmox, Veeam, GLPI, SecureTransport, PRTG).

### Sources via variables d'environnement (fallback)

Si aucune config UI n'est presente pour une source, ces variables sont utilisees comme instance "Default".

| Variable | Source |
|---|---|
| `PRTG_BASE_URL`, `PRTG_API_KEY`, `PRTG_EXTERNAL_URL` | PRTG |
| `VCENTER_BASE_URL`, `VCENTER_USERNAME`, `VCENTER_PASSWORD`, `VCENTER_EXTERNAL_URL` | vCenter |
| `PROXMOX_BASE_URL`, `PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET`, `PROXMOX_EXTERNAL_URL` | Proxmox |
| `VEEAM_BASE_URL`, `VEEAM_USERNAME`, `VEEAM_PASSWORD`, `VEEAM_EXTERNAL_URL` | Veeam |
| `GLPI_BASE_URL`, `GLPI_APP_TOKEN`, `GLPI_USER_TOKEN`, `GLPI_EXTERNAL_URL` | GLPI |
| `ST_BASE_URL`, `ST_USERNAME`, `ST_PASSWORD`, `ST_API_VERSION`, `ST_EXTERNAL_URL` | SecureTransport |

Les variables `NEXT_PUBLIC_*_URL` exposent les URLs publiques au navigateur pour les liens de redirection.

### Cache et TTLs

| Variable | Description | Defaut |
|---|---|---|
| `REDIS_URL` | URL de connexion Redis | — (fallback memoire) |
| `CACHE_TTL_PRTG` | TTL cache PRTG en secondes | `30` |
| `CACHE_TTL_VCENTER` | TTL cache vCenter en secondes | `60` |
| `CACHE_TTL_PROXMOX` | TTL cache Proxmox en secondes | `60` |
| `CACHE_TTL_VEEAM` | TTL cache Veeam en secondes | `120` |
| `CACHE_TTL_GLPI` | TTL cache GLPI en secondes | `60` |
| `CACHE_TTL_ST` | TTL cache SecureTransport en secondes | `120` |

### Intervalles de refresh UI

Ces variables controlent la frequence d'actualisation automatique cote client.

| Variable | Description | Defaut |
|---|---|---|
| `NEXT_PUBLIC_REFRESH_PRTG` | Intervalle refresh PRTG en ms | `30000` |
| `NEXT_PUBLIC_REFRESH_INFRA` | Intervalle refresh infrastructure en ms | `60000` |
| `NEXT_PUBLIC_REFRESH_VEEAM` | Intervalle refresh Veeam en ms | `120000` |
| `NEXT_PUBLIC_REFRESH_TICKETS` | Intervalle refresh tickets en ms | `60000` |
| `NEXT_PUBLIC_REFRESH_TRANSFERS` | Intervalle refresh transferts en ms | `120000` |

---

## Roles utilisateur

| Role | Acces |
|---|---|
| `admin` | Toutes les pages + `/settings` (lecture et ecriture de la configuration) |
| `viewer` | Toutes les pages de consultation sauf `/settings`. Toute tentative d'acces aux Settings redirige vers le Dashboard. |

**Attribution du role en LDAP :** l'appartenance au groupe defini dans `LDAP_ADMIN_GROUP` donne le role `admin`. Tout autre utilisateur authentifie en LDAP recoit le role `viewer`.

**Compte admin local :** recoit toujours le role `admin`, independamment de toute configuration de groupe.
