# API Reference

> SysAdmin Dashboard — Next.js 16 App Router
> Base URL: `https://<your-domain>` (or `http://localhost:3000` in development)

---

## Table des matieres

- [Authentification](#authentification)
- [Structure de reponse commune](#structure-de-reponse-commune)
- [Gestion des erreurs](#gestion-des-erreurs)
- [Cache](#cache)
- Sources :
  - [Health](health.md)
  - [PRTG](prtg.md)
  - [vCenter](vcenter.md)
  - [Proxmox](proxmox.md)
  - [Veeam](veeam.md)
  - [GLPI](glpi.md)
  - [SecureTransport](securetransport.md)
  - [Settings](settings.md)

---

## Authentification

Tous les endpoints (sauf `/api/auth/*`) requierent une session NextAuth active.

La session est etablie via `/api/auth/signin` en utilisant les identifiants LDAP/AD ou le compte administrateur local defini dans les variables d'environnement.

**Obtenir une session (cookie) :**

```bash
curl -c cookies.txt -X POST https://<host>/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "secret"}'
```

Toutes les requetes suivantes doivent inclure le cookie de session (option `-b cookies.txt` avec curl).

**Roles :**

| Role    | Acces                                      |
|---------|--------------------------------------------|
| `admin` | Tous les endpoints, y compris `/api/settings/*` |
| `viewer`| Tous les endpoints sauf `/api/settings/*`   |
| custom  | Depend des pages autorisees configurees dans le role |

Les roles sont configurables via l'API `/api/settings/roles` ou depuis la page Settings. Voir [Settings](settings.md#roles) pour la documentation complete.

**Reponse en cas d'echec d'authentification :**

```json
{ "error": "Unauthorized" }
```
HTTP status : `401`

**Reponse en cas de privilege insuffisant :**

```json
{ "error": "Forbidden" }
```
HTTP status : `403`

---

## Structure de reponse commune

La plupart des endpoints de donnees retournent cette enveloppe :

```json
{
  "data": <tableau ou objet de donnees>,
  "_stale": false,
  "_source": "prtg",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

| Champ        | Type      | Description                                                                 |
|--------------|-----------|-----------------------------------------------------------------------------|
| `data`       | any       | Les donnees metier                                                           |
| `_stale`     | boolean   | `true` si les donnees proviennent du cache expire (stale-while-revalidate) |
| `_source`    | string    | Identifiant de la source (`prtg`, `vcenter`, etc.)                          |
| `_timestamp` | number    | Timestamp Unix (ms) de la reponse                                           |
| `_partial`   | boolean   | `true` si au moins une instance a echoue mais d'autres ont reussi           |

Chaque element dans `data` peut aussi contenir :

| Champ           | Type   | Description                                 |
|-----------------|--------|---------------------------------------------|
| `_instanceId`   | string | Identifiant de l'instance source            |
| `_instanceName` | string | Nom affichable de l'instance source         |

---

## Gestion des erreurs

### Codes HTTP standards

| Code | Signification                                                                              |
|------|--------------------------------------------------------------------------------------------|
| 200  | Succes                                                                                     |
| 400  | Requete invalide (champs manquants, valeur inconnue, validation echouee)                   |
| 401  | Non authentifie (session absente ou expiree)                                               |
| 403  | Acces interdit (role insuffisant — typiquement `viewer` sur un endpoint `admin`)           |
| 404  | Ressource introuvable (instance de configuration inconnue)                                 |
| 409  | Conflit (tentative de creation d'une instance avec un ID deja existant)                    |
| 500  | Erreur serveur interne (echec lecture/ecriture config, erreur inattendue)                  |
| 502  | Source non configuree (aucune instance definie pour la source demandee)                    |

### Format des reponses d'erreur

```json
{ "error": "Message d'erreur lisible" }
```

Pour les erreurs liees a une source non configuree (502) :

```json
{ "error": "No PRTG instances configured", "source": "prtg" }
```

---

## Cache

### Mecanisme stale-while-revalidate

Tous les endpoints de donnees (hors `/api/health` et `/api/settings/*`) utilisent un cache a deux niveaux :

1. **Cache frais** : si la valeur en cache est dans le TTL, elle est retournee immediatement (`_stale: false`).
2. **Cache stale** : si l'appel API upstream echoue et qu'une valeur expiree est disponible, elle est retournee avec `_stale: true`. Le TTL stale est egal a `TTL * STALE_MULTIPLIER` (multiplicateur = 5 par defaut).
3. **Erreur** : si aucune donnee n'est disponible (ni frais ni stale), l'instance est consideree en echec. Si d'autres instances ont repondu, `_partial: true` est retourne.

Le cache est implemente dans `src/lib/cache.ts` avec Redis (ioredis) comme backend primaire et une `Map` en memoire comme fallback.

### Cles de cache

Format : `dashboard:{source}:{instanceId}:{type}`

Exemples :
- `dashboard:prtg:prtg-prod:summary`
- `dashboard:vcenter:vcenter-dc1:vms`
- `dashboard:proxmox:proxmox-prod:nodes`
- `dashboard:st:st-prod:logs:50:0:a:partner|p:SFTP`

### TTLs par source

| Source          | TTL par defaut | TTL stale (x5)  | Variable d'environnement  |
|-----------------|----------------|-----------------|---------------------------|
| PRTG            | 30 secondes    | 150 secondes    | `CACHE_TTL_PRTG`          |
| vCenter         | 60 secondes    | 300 secondes    | `CACHE_TTL_VCENTER`       |
| Proxmox         | 60 secondes    | 300 secondes    | `CACHE_TTL_PROXMOX`       |
| Veeam           | 120 secondes   | 600 secondes    | `CACHE_TTL_VEEAM`         |
| GLPI            | 60 secondes    | 300 secondes    | `CACHE_TTL_GLPI`          |
| SecureTransport | 120 secondes   | 600 secondes    | `CACHE_TTL_ST`            |
| ST logs         | 5 minutes      | 25 minutes      | (non configurable)        |

Les valeurs des variables d'environnement sont exprimees en **secondes**.

Note : les logs SecureTransport utilisent un TTL propre (5 min pour les donnees, 10 min pour le `totalCount` seul) car les logs historiques changent moins frequemment.

### Configuration de la source

La configuration des instances est lue depuis `data/config.json` avec un cache interne de **10 secondes** pour eviter les lectures disque repetees. Ce cache est invalide automatiquement apres chaque ecriture.

En l'absence de configuration dans `data/config.json`, les variables d'environnement servent de fallback :

| Source          | Variables d'environnement                                          |
|-----------------|--------------------------------------------------------------------|
| PRTG            | `PRTG_BASE_URL`, `PRTG_API_KEY`, `PRTG_EXTERNAL_URL`              |
| vCenter         | `VCENTER_BASE_URL`, `VCENTER_USERNAME`, `VCENTER_PASSWORD`, `VCENTER_EXTERNAL_URL` |
| Proxmox         | `PROXMOX_BASE_URL`, `PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET`, `PROXMOX_EXTERNAL_URL` |
| Veeam           | `VEEAM_BASE_URL`, `VEEAM_USERNAME`, `VEEAM_PASSWORD`, `VEEAM_EXTERNAL_URL` |
| GLPI            | `GLPI_BASE_URL`, `GLPI_APP_TOKEN`, `GLPI_USER_TOKEN`, `GLPI_EXTERNAL_URL` |
| SecureTransport | `ST_BASE_URL`, `ST_USERNAME`, `ST_PASSWORD`, `ST_API_VERSION`, `ST_EXTERNAL_URL` |
