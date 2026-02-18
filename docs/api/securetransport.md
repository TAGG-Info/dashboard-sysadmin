# API — SecureTransport

> Retour vers [API Index](README.md)

Toutes les reponses SecureTransport sont agregees depuis toutes les instances Axway SecureTransport configurees.

Cache TTL par defaut : **120 secondes** (configurable via `CACHE_TTL_ST`)

## Endpoints

### GET /api/securetransport/transfers

**Description** : Retourne un resume agrege des comptes, certificats et sites de transfert de toutes les instances SecureTransport.

**Authentification** : session requise (tout role)

**Cache** : TTL 120 secondes (stale jusqu'a 600s)

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
