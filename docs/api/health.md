# API — Health

> Retour vers [API Index](README.md)

## Endpoints

### GET /api/health

**Description** : Verifie la connectivite en temps reel vers toutes les instances configurees de toutes les sources. Ne passe pas par le cache.

**Authentification** : session requise (tout role)

**Cache** : Aucun — appel direct sans cache

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "sources": [
    {
      "source": "prtg",
      "instanceId": "prtg-prod",
      "instanceName": "PRTG Production",
      "status": "connected",
      "latency": 42
    },
    {
      "source": "vcenter",
      "instanceId": "vcenter-dc1",
      "instanceName": "vCenter DC1",
      "status": "error",
      "latency": 5001,
      "error": "HTTP 503"
    }
  ],
  "timestamp": 1708123456789
}
```

| Champ                   | Type                       | Description                           |
|-------------------------|----------------------------|---------------------------------------|
| `sources[].source`      | string                     | Nom de la source                      |
| `sources[].instanceId`  | string                     | ID unique de l'instance               |
| `sources[].instanceName`| string                     | Nom affichable                        |
| `sources[].status`      | `"connected"` \| `"error"` | Etat de la connexion                  |
| `sources[].latency`     | number                     | Latence en millisecondes              |
| `sources[].error`       | string (optionnel)         | Message d'erreur si `status="error"`  |
| `timestamp`             | number                     | Timestamp Unix (ms)                   |

**Methodes de verification par source :**

| Source          | Endpoint verifie                          | Auth utilisee              |
|-----------------|-------------------------------------------|----------------------------|
| PRTG            | `GET /api/v2/experimental/probes`         | Bearer token               |
| vCenter         | `POST /api/session` + `DELETE /api/session` | Basic (username/password) |
| Proxmox         | `GET /api2/json/version`                  | PVEAPIToken                |
| Veeam           | `POST /api/oauth2/token`                  | OAuth2 password grant      |
| GLPI            | `GET /initSession` + `GET /killSession`   | App-Token + user_token     |
| SecureTransport | `GET /api/{version}/myself`               | Basic (username/password)  |

Timeout par verification : **5 secondes**

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/health
```
