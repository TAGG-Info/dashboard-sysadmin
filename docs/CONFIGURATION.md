# Configuration — SysAdmin Dashboard

## Variables d'environnement requises

Ces variables sont indispensables au demarrage de l'application.

| Variable | Description |
|---|---|
| `NEXTAUTH_SECRET` | Secret JWT et cle de chiffrement de la config. Generer avec `openssl rand -base64 32`. Minimum 32 caracteres. |
| `NEXTAUTH_URL` | URL canonique de l'application (ex: `https://dashboard.internal.example.com`). Requis en production. |
| `LOCAL_ADMIN_USERNAME` | Nom d'utilisateur du compte administrateur local (fallback si LDAP indisponible). |
| `LOCAL_ADMIN_PASSWORD_HASH` | Hash bcrypt du mot de passe de l'admin local. Voir la section "Generer un hash bcrypt" ci-dessous. |
| `AUTH_TRUST_HOST` | Mettre a `true` derriere un reverse proxy (Caddy, nginx). Permet a NextAuth de faire confiance au header Host forwarde. |

### Generer un hash bcrypt

#### Avec Docker (recommande)

Docker Compose interprete les `$` dans les fichiers `.env`, ce qui casse les hash bcrypt (`$2b$10$...`). **Stocker le hash encode en base64** :

```bash
node -e "const b=require('bcryptjs'); console.log(Buffer.from(b.hashSync('votre-mot-de-passe',10)).toString('base64'))"
```

La sortie est une chaine alphanumerique sans `$` (ex: `JDJiJDEwJC4uLg==`). Le code la decode automatiquement au demarrage.

#### Sans Docker (dev local)

Le hash brut fonctionne directement :

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
| `ALLOW_SELF_SIGNED_CERTS` | Accepter les certificats auto-signes pour les APIs internes (positionne `NODE_TLS_REJECT_UNAUTHORIZED=0`) | `false` |
| `CRYPTO_SALT` | Sel pour la derivation de cle AES-256-GCM. **Obligatoire en production** (le serveur refuse de demarrer sans). Generer avec `openssl rand -base64 16`. | erreur si absent |
| `DATA_DIR` | Repertoire de stockage de `config.json` | `./data` |

```env
ALLOW_SELF_SIGNED_CERTS=true
```

A utiliser uniquement en reseau interne de confiance. S'applique a toutes les requetes HTTPS sortantes du serveur (vCenter, Proxmox, Veeam, GLPI, SecureTransport, PRTG).

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

Les roles sont configurables depuis la page **Settings > Roles & Acces** (admin uniquement). Ils mappent des groupes Active Directory vers des pages du dashboard.

### Roles systeme (non supprimables)

| Role | ID | Groupe AD | Acces |
|---|---|---|---|
| Administrateur | `admin` | `LDAP_ADMIN_GROUP` (env) ou `Dashboard-Admins` | Toutes les pages + `/settings` |
| Lecteur | `viewer` | aucun (fallback) | Toutes les pages sauf `/settings` |

### Roles custom

L'administrateur peut creer des roles supplementaires depuis l'interface. Exemple :

| Role | ID | Groupes AD | Pages autorisees |
|---|---|---|---|
| Comptabilite | `compta` | `GS-COMPTA` | Accueil, Tickets |
| Supervision | `supervision` | `GS-SUPERVISION` | Accueil, Monitoring, Infrastructure |

Chaque role custom definit :
- **ID** : slug unique (minuscules, chiffres, tirets, 2-32 chars)
- **Nom d'affichage** : visible dans l'interface
- **Groupes AD** : noms CN des groupes Active Directory (comparaison case-insensitive)
- **Pages autorisees** : les pages du dashboard accessibles pour ce role

### Resolution du role a la connexion

Lors de la connexion LDAP, le systeme lit l'attribut `memberOf` de l'utilisateur et extrait les CN. Il compare ensuite ces CN avec les `adGroups` de chaque role :

1. Si un match avec le role `admin` → role admin
2. Si un match avec un role custom → premier role custom qui matche
3. Aucun match → role `viewer` (fallback)

**Compte admin local :** recoit toujours le role `admin`, independamment de toute configuration de groupe.

### Stockage

Les roles sont stockes dans `data/roles.json` (meme repertoire que `config.json`, configurable via `DATA_DIR`). Le fichier est cree automatiquement avec les roles systeme par defaut au premier acces.

### Navigation filtree

La sidebar et la navigation mobile n'affichent que les pages autorisees par le role de l'utilisateur connecte. Le middleware redirige vers la premiere page autorisee si l'utilisateur tente d'acceder a une page non autorisee.
