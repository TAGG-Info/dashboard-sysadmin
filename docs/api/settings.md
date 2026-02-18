# API — Settings

> Retour vers [API Index](README.md)

Ces endpoints sont reserves au role **admin** uniquement.

La configuration est stockee dans `data/config.json` avec les champs sensibles chiffres en AES-256-GCM (cle derivee de `NEXTAUTH_SECRET`).

**Champs sensibles par source (masques en `"****"` dans les reponses GET) :**

| Source          | Champs sensibles            |
|-----------------|-----------------------------|
| PRTG            | `apiKey`                    |
| vCenter         | `password`                  |
| Proxmox         | `tokenSecret`               |
| Veeam           | `password`                  |
| GLPI            | `appToken`, `userToken`     |
| SecureTransport | `password`                  |

**Champs requis par source pour PUT :**

| Source          | Champs requis                             |
|-----------------|-------------------------------------------|
| PRTG            | `baseUrl`, `apiKey`                       |
| vCenter         | `baseUrl`, `username`, `password`         |
| Proxmox         | `baseUrl`, `tokenId`, `tokenSecret`       |
| Veeam           | `baseUrl`, `username`, `password`         |
| GLPI            | `baseUrl`, `appToken`, `userToken`        |
| SecureTransport | `baseUrl`, `username`, `password`         |

## Endpoints

### GET /api/settings/sources

**Description** : Retourne la configuration de toutes les instances de toutes les sources, avec les champs sensibles masques.

**Authentification** : session requise (role `admin` uniquement)

**Cache** : Aucun — lecture directe depuis `data/config.json`

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "config": {
    "prtg": [
      {
        "id": "prtg-prod",
        "name": "PRTG Production",
        "baseUrl": "https://prtg.example.com",
        "apiKey": "****",
        "externalUrl": "https://prtg.example.com"
      }
    ],
    "vcenter": [
      {
        "id": "vcenter-dc1",
        "name": "vCenter DC1",
        "baseUrl": "https://vcenter.example.com",
        "username": "administrator@vsphere.local",
        "password": "****",
        "externalUrl": "https://vcenter.example.com"
      }
    ],
    "proxmox": [],
    "veeam": [],
    "glpi": [],
    "securetransport": []
  }
}
```

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/settings/sources
```

---

### PUT /api/settings/sources

**Description** : Cree une nouvelle instance ou met a jour une instance existante pour une source donnee.

**Authentification** : session requise (role `admin` uniquement)

**Cache** : Aucun — ecriture directe dans `data/config.json`

#### Parametres query

Aucun

#### Corps de la requete (JSON)

```json
{
  "source": "prtg",
  "instanceId": "prtg-prod",
  "config": {
    "name": "PRTG Production",
    "baseUrl": "https://prtg.example.com",
    "apiKey": "****",
    "externalUrl": "https://prtg.example.com"
  }
}
```

| Champ        | Type   | Requis | Description                                                                         |
|--------------|--------|--------|-------------------------------------------------------------------------------------|
| `source`     | string | Oui    | Identifiant de la source (`prtg`, `vcenter`, `proxmox`, `veeam`, `glpi`, `securetransport`) |
| `instanceId` | string | Non    | ID de l'instance a mettre a jour. Si absent, une nouvelle instance est creee        |
| `config`     | object | Oui    | Champs de configuration. Les champs en `"****"` conservent la valeur existante      |

Regles de comportement :
- Si `instanceId` est fourni : mise a jour de l'instance existante. Retourne `404` si l'instance est introuvable.
- Si `instanceId` est absent : creation d'une nouvelle instance. L'`id` est genere automatiquement si non fourni dans `config`. Retourne `409` si un doublon d'`id` est detecte.
- Les champs sensibles passes avec la valeur `"****"` conservent leur valeur chiffree sur disque.

#### Reponse (200)

```json
{ "success": true }
```

**Codes d'erreur specifiques :**

| Code | Cas                                          |
|------|----------------------------------------------|
| 400  | `source` ou `config` manquant dans le corps  |
| 400  | Source inconnue                              |
| 400  | Champs requis manquants                      |
| 404  | Instance introuvable (mise a jour)           |
| 409  | Doublon d'ID (creation)                      |

#### Exemple curl

**Mise a jour :**

```bash
curl -b cookies.txt -X PUT https://<host>/api/settings/sources \
  -H "Content-Type: application/json" \
  -d '{
    "source": "prtg",
    "instanceId": "prtg-prod",
    "config": {
      "name": "PRTG Production",
      "baseUrl": "https://prtg.example.com",
      "apiKey": "****",
      "externalUrl": "https://prtg.example.com"
    }
  }'
```

**Creation :**

```bash
curl -b cookies.txt -X PUT https://<host>/api/settings/sources \
  -H "Content-Type: application/json" \
  -d '{
    "source": "proxmox",
    "config": {
      "name": "Proxmox DC2",
      "baseUrl": "https://proxmox-dc2.example.com",
      "tokenId": "dashboard@pam!mytoken",
      "tokenSecret": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "externalUrl": "https://proxmox-dc2.example.com"
    }
  }'
```

---

### DELETE /api/settings/sources

**Description** : Supprime une instance specifique d'une source.

**Authentification** : session requise (role `admin` uniquement)

**Cache** : Aucun — ecriture directe dans `data/config.json`

#### Parametres query

Aucun

#### Corps de la requete (JSON)

```json
{
  "source": "prtg",
  "instanceId": "prtg-old"
}
```

| Champ        | Type   | Requis | Description                          |
|--------------|--------|--------|--------------------------------------|
| `source`     | string | Oui    | Identifiant de la source             |
| `instanceId` | string | Oui    | ID de l'instance a supprimer         |

#### Reponse (200)

```json
{ "success": true }
```

**Codes d'erreur specifiques :**

| Code | Cas                                                   |
|------|-------------------------------------------------------|
| 400  | `source` ou `instanceId` manquant dans le corps       |
| 400  | Source inconnue                                       |
| 404  | Instance introuvable                                  |

#### Exemple curl

```bash
curl -b cookies.txt -X DELETE https://<host>/api/settings/sources \
  -H "Content-Type: application/json" \
  -d '{"source": "prtg", "instanceId": "prtg-old"}'
```

---

### POST /api/settings/sources/test

**Description** : Teste la connectivite vers une source sans sauvegarder la configuration.

**Authentification** : session requise (role `admin` uniquement)

**Cache** : Aucun — appel direct sans cache

#### Parametres query

Aucun

#### Corps de la requete (JSON)

```json
{
  "source": "proxmox",
  "instanceId": "proxmox-dc2",
  "config": {
    "baseUrl": "https://proxmox.example.com",
    "tokenId": "dashboard@pam!mytoken",
    "tokenSecret": "****"
  }
}
```

| Champ        | Type   | Requis | Description                                                                       |
|--------------|--------|--------|-----------------------------------------------------------------------------------|
| `source`     | string | Oui    | Source a tester                                                                   |
| `instanceId` | string | Non    | Si fourni, les valeurs `"****"` sont resolues depuis la config sauvegardee        |
| `config`     | object | Oui    | Champs de connexion (les `"****"` sont resolus si `instanceId` est fourni)        |

#### Reponse (200) — succes

```json
{
  "success": true,
  "latency": 124,
  "version": "8.1.1"
}
```

#### Reponse (200) — echec

```json
{
  "success": false,
  "latency": 5001,
  "error": "HTTP 401 Unauthorized"
}
```

| Champ     | Type             | Description                                    |
|-----------|------------------|------------------------------------------------|
| `success` | boolean          | `true` si la connexion a reussi                |
| `latency` | number           | Temps de reponse en millisecondes              |
| `error`   | string (opt.)    | Message d'erreur si `success=false`            |
| `version` | string (opt.)    | Version du serveur si disponible (Proxmox uniquement) |

Timeout de connexion : **10 secondes**

**Endpoints testes par source :**

| Source          | Endpoint teste                                    |
|-----------------|---------------------------------------------------|
| PRTG            | `GET /api/v2/experimental/devices?take=1`         |
| vCenter         | `POST /api/session` (puis `DELETE /api/session`)  |
| Proxmox         | `GET /api2/json/version`                          |
| Veeam           | `POST /api/oauth2/token`                          |
| GLPI            | `GET /initSession` (puis `GET /killSession`)      |
| SecureTransport | `GET /api/{apiVersion}/myself`                    |

#### Exemple curl

```bash
curl -b cookies.txt -X POST https://<host>/api/settings/sources/test \
  -H "Content-Type: application/json" \
  -d '{
    "source": "glpi",
    "config": {
      "baseUrl": "https://glpi.example.com/apirest.php",
      "appToken": "myapptoken",
      "userToken": "myusertoken"
    }
  }'
```
