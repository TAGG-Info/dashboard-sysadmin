# API — SecureTransport

> Retour vers [API Index](README.md)

Toutes les reponses SecureTransport sont agregees depuis toutes les instances Axway SecureTransport configurees.

---

## Endpoints

### GET /api/securetransport/transfers

**Description** : Retourne un resume agrege des comptes, certificats et sites de transfert de toutes les instances SecureTransport.

**Authentification** : session requise (tout role)

**Cache** : TTL 120 secondes (stale jusqu'a 600s, configurable via `CACHE_TTL_ST`)

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "data": {
    "accounts": {
      "total": 245,
      "active": 230,
      "disabled": 15
    },
    "certificates": {
      "total": 42,
      "expiringSoon": [
        {
          "alias": "partner-cert-abc",
          "notAfter": "2024-03-01T00:00:00Z",
          "_instanceName": "SecureTransport Production"
        }
      ]
    },
    "sites": {
      "total": 87
    }
  },
  "_stale": false,
  "_source": "securetransport",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure de `data` :

| Champ                                        | Type                         | Description                                           |
|----------------------------------------------|------------------------------|-------------------------------------------------------|
| `accounts.total`                             | number                       | Nombre total de comptes                               |
| `accounts.active`                            | number                       | Comptes actifs                                        |
| `accounts.disabled`                          | number                       | Comptes desactives                                    |
| `certificates.total`                         | number                       | Nombre total de certificats                           |
| `certificates.expiringSoon`                  | array                        | Certificats expirant dans moins de 30 jours           |
| `certificates.expiringSoon[].alias`          | string                       | Alias du certificat                                   |
| `certificates.expiringSoon[].notAfter`       | string ISO 8601              | Date d'expiration                                     |
| `certificates.expiringSoon[]._instanceName`  | string                       | Nom de l'instance source                              |
| `sites.total`                                | number                       | Nombre total de sites de transfert                    |

Note : `certificates.expiringSoon` est trie par date d'expiration croissante (le plus urgent en premier).

**Reponse 502 (aucune instance configuree) :**

```json
{ "error": "No SecureTransport instances configured", "source": "securetransport" }
```

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/securetransport/transfers
```

---

### GET /api/securetransport/logs

**Description** : Retourne les logs de transfert de toutes les instances SecureTransport, tries du plus recent au plus ancien (pagination inversee).

**Authentification** : session requise (tout role)

**Cache** :
- Donnees : TTL **5 minutes** (stale jusqu'a 25 min)
- Count : TTL **10 minutes** — cache separe du `totalCount` (survit a l'expiration du cache data pour eviter un double appel ST)

> L'API ST v2.0 ne supporte pas de parametre de tri (`orderBy` inexistant). Les donnees sont retournees du plus ancien au plus recent par defaut. La route applique une **pagination inversee** pour afficher les transferts les plus recents en premier (voir [Pagination inversee](#pagination-inversee)).

#### Parametres query

| Parametre   | Type    | Requis | Description                                                                    |
|-------------|---------|--------|--------------------------------------------------------------------------------|
| `limit`     | number  | Non    | Nombre de resultats par page (defaut : `50`, max : `200`)                      |
| `offset`    | number  | Non    | Decalage de pagination logique — `0` = page la plus recente (defaut : `0`)     |
| `account`   | string  | Non    | Filtrer par compte utilisateur                                                 |
| `filename`  | string  | Non    | Filtrer par nom de fichier (wildcard `*` supporte nativement par ST)           |
| `status`    | string  | Non    | Filtrer par statut (voir valeurs ci-dessous)                                   |
| `protocol`  | string  | Non    | Filtrer par protocole (`ssh`, `ftp`, `https`, `as2`, `pesit`, etc.)            |
| `incoming`  | boolean | Non    | `true` = entrants, `false` = sortants                                          |
| `startDate` | number  | Non    | Timestamp epoch (ms) — transferts apres cette date (converti en RFC2822 c.ST)  |
| `endDate`   | number  | Non    | Timestamp epoch (ms) — transferts avant cette date (converti en RFC2822 c.ST)  |

**Valeurs de statut supportees :**

| Valeur API              | Couleur UI  | Description                              |
|-------------------------|-------------|------------------------------------------|
| `Processed`             | Vert        | Transfert termine avec succes            |
| `Failed`                | Rouge       | Echec du transfert                       |
| `Aborted`               | Rouge       | Transfert annule                         |
| `Failed Subtransmission`| Rouge       | Echec partiel (sous-transmission)        |
| `Failed Transfer Resubmit` | Rouge    | Echec apres resoumission                 |
| `In Progress`           | Bleu        | Transfert en cours                       |
| `Paused`                | Orange      | Transfert en pause                       |
| `Waiting`               | Orange      | En attente de traitement                 |
| `Pending receipt`       | Orange      | En attente de confirmation reception     |

#### Reponse (200)

```json
{
  "data": {
    "transfers": [
      {
        "id": {
          "mTransferStatusId": "abc-123",
          "mTransferStartTime": 1708123400000,
          "urlrepresentation": "Id [mTransferStatusId=abc-123, mTransferStartTime=1708123400000]"
        },
        "status": "Processed",
        "secure": true,
        "resubmitted": false,
        "account": "partner-sftp",
        "login": "partner-sftp",
        "incoming": true,
        "serverInitiated": false,
        "serverName": "st-prod-01",
        "filename": "data_20240217.csv",
        "filesize": 1048576,
        "protocol": "ssh",
        "startTime": "2024-02-17T10:30:00Z",
        "duration": "00:00:03",
        "remoteDir": "/upload",
        "remotePartner": "192.168.1.50",
        "site": { "id": "site-01", "name": "Partenaire A" },
        "_instanceId": "st-prod",
        "_instanceName": "SecureTransport Production"
      }
    ],
    "resultSet": {
      "returnCount": 50,
      "totalCount": 1234
    }
  },
  "_stale": false,
  "_source": "securetransport",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure d'un element dans `data.transfers` (type `STTransferLog`) :

| Champ                        | Type            | Description                                          |
|------------------------------|-----------------|------------------------------------------------------|
| `id.mTransferStatusId`       | string          | ID unique du transfert                               |
| `id.mTransferStartTime`      | number          | Timestamp de debut (epoch ms)                        |
| `id.urlrepresentation`       | string          | Representation composite de l'ID (format ST)         |
| `status`                     | string          | Statut (voir tableau des valeurs ci-dessus)          |
| `secure`                     | boolean         | `true` si le transfert est chiffre (TLS)             |
| `resubmitted`                | boolean         | `true` si le transfert a ete resoumis                |
| `account`                    | string          | Compte utilisateur ST                                |
| `login`                      | string          | Identifiant de connexion                             |
| `incoming`                   | boolean         | `true` = reception, `false` = envoi                  |
| `serverInitiated`            | boolean         | `true` si initie par le serveur ST                   |
| `serverName`                 | string          | Nom du serveur ST                                    |
| `filename`                   | string          | Nom du fichier transfere                             |
| `filesize`                   | number          | Taille du fichier en octets                          |
| `protocol`                   | string          | Protocole utilise                                    |
| `startTime`                  | string ISO 8601 | Date/heure de debut                                  |
| `duration`                   | string          | Duree du transfert (format `HH:MM:SS`)               |
| `remoteDir`                  | string          | Repertoire distant                                   |
| `remotePartner`              | string / null   | Adresse IP ou nom du partenaire distant              |
| `site.id`                    | string / null   | ID du site de transfert configure                    |
| `site.name`                  | string / null   | Nom du site de transfert                             |
| `_instanceId`                | string          | ID de l'instance ST source                           |
| `_instanceName`              | string          | Nom de l'instance ST source                          |

> **Note sur `remotePartner` vs `site.name`** : l'interface affiche `remotePartner || site.name` dans la colonne Partenaire. `remotePartner` contient l'IP/hostname de la connexion entrante ; `site.name` contient le nom du site ST configure pour les connexions sortantes.

Structure de `data.resultSet` :

| Champ         | Type   | Description                                                 |
|---------------|--------|-------------------------------------------------------------|
| `returnCount` | number | Nombre de transferts retournes dans cette page              |
| `totalCount`  | number | Nombre total de transferts correspondant aux filtres donnes  |

**Reponse 502 (aucune instance configuree) :**

```json
{ "error": "No SecureTransport instances configured", "source": "securetransport" }
```

#### Exemples curl

```bash
# Derniers 50 transferts du jour
curl -b cookies.txt https://<host>/api/securetransport/logs

# Filtrer par compte et protocole, page 2
curl -b cookies.txt "https://<host>/api/securetransport/logs?account=partner-sftp&protocol=ssh&limit=50&offset=50"

# Transferts entrants echoues sur les 7 derniers jours
SINCE=$(date -d '7 days ago' +%s%3N)
curl -b cookies.txt "https://<host>/api/securetransport/logs?incoming=true&status=Failed&startDate=$SINCE"

# Recherche par nom de fichier (wildcard)
curl -b cookies.txt "https://<host>/api/securetransport/logs?filename=data_*.csv"
```

---

## Specificites de l'API Axway SecureTransport v2.0

### Absence de tri

L'API REST ST v2.0 (`GET /api/v2.0/logs/transfers`) **ne supporte pas de parametre `orderBy`**. Les resultats sont toujours retournes du plus ancien au plus recent.

### Pagination inversee

Pour afficher les transferts les plus recents en premier, la route applique une pagination inversee :

```
totalCount = getTransferLogsCount(filters)  // appel ST avec limit=1
stOffset   = max(0, totalCount - limit - offset)
result     = ST API (stOffset, limit)
result     = result.reverse()               // newest first dans la page
```

Exemples concrets :

| totalCount | limit | offset (logique) | stOffset (reel ST) | Contenu retourne       |
|------------|-------|------------------|---------------------|------------------------|
| 100        | 50    | 0                | 50                  | Transferts 51 → 100    |
| 100        | 50    | 50               | 0                   | Transferts 1 → 50      |
| 30         | 50    | 0                | 0                   | Transferts 1 → 30      |
| 100        | 50    | 100              | —                   | Vide (offset >= total) |

### Double cache pour le count

Pour eviter 2 appels ST sequentiels a chaque expiration du cache data :

```
Cache data  : TTL 5 min  (cle = filtres + pagination)
Cache count : TTL 10 min (cle = filtres seuls)

T+0min  : miss count + miss data  → 2 appels ST
T+3min  : hit data                → 0 appel ST
T+5min  : hit count + miss data   → 1 appel ST  (count encore valide)
T+10min : miss count + miss data  → 2 appels ST
```

### Format des dates

L'API ST attend les dates au format **RFC2822** (`Wed, 18 Feb 2026 11:00:00 GMT`), pas epoch ms. La conversion est faite automatiquement par `buildFilterParams()` dans `src/lib/securetransport.ts`.

Les dates dans la cache key sont arrondies a l'heure (`roundToHour`) pour stabiliser les cles et eviter un miss de cache a chaque requete.

### Certificats auto-signes

Les instances ST utilisent generalement des certificats auto-signes. Mettre `ALLOW_SELF_SIGNED_CERTS=true` dans `.env.local` pour bypasser la validation TLS globalement (uniquement en reseau interne de confiance).
