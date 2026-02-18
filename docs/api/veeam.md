# API — Veeam

> Retour vers [API Index](README.md)

Toutes les reponses Veeam sont agregees depuis toutes les instances Veeam Backup & Replication configurees.

Cache TTL par defaut : **120 secondes** (configurable via `CACHE_TTL_VEEAM`)

## Endpoints

### GET /api/veeam/jobs

**Description** : Retourne la liste de tous les jobs de sauvegarde Veeam.

**Authentification** : session requise (tout role)

**Cache** : TTL 120 secondes (stale jusqu'a 600s)

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "name": "Backup-Prod-VMs",
      "type": "Backup",
      "isDisabled": false,
      "schedule": {
        "isEnabled": true
      },
      "lastRun": "2024-02-16T22:00:00Z",
      "lastResult": "Success",
      "_instanceId": "veeam-prod",
      "_instanceName": "Veeam Production"
    }
  ],
  "_stale": false,
  "_source": "veeam",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure d'un element dans `data` (type `VeeamJob`) :

| Champ                | Type                                         | Description                                  |
|----------------------|----------------------------------------------|----------------------------------------------|
| `id`                 | string (UUID)                                | ID unique du job Veeam                       |
| `name`               | string                                       | Nom du job                                   |
| `type`               | string                                       | Type de job (ex: `Backup`, `Replication`)    |
| `isDisabled`         | boolean                                      | `true` si le job est desactive               |
| `schedule.isEnabled` | boolean (optionnel)                          | `true` si la planification est active        |
| `lastRun`            | string ISO 8601 (optionnel)                  | Date de la derniere execution                |
| `lastResult`         | `Success` \| `Warning` \| `Failed` \| `None` | Resultat de la derniere execution            |

**Reponse 502 (aucune instance configuree) :**

```json
{ "error": "No Veeam instances configured", "source": "veeam" }
```

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/veeam/jobs
```

---

### GET /api/veeam/sessions

**Description** : Retourne la liste des sessions de sauvegarde recentes (historique d'execution).

**Authentification** : session requise (tout role)

**Cache** : TTL 120 secondes (stale jusqu'a 600s)

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "data": [
    {
      "id": "e5f6g7h8-...",
      "name": "Backup-Prod-VMs",
      "sessionType": "Backup",
      "state": "Stopped",
      "result": {
        "result": "Success",
        "message": "All VMs processed successfully"
      },
      "progress": 100,
      "creationTime": "2024-02-16T22:00:00Z",
      "endTime": "2024-02-16T23:15:00Z",
      "statistics": {
        "processedSize": 107374182400,
        "readSize": 10737418240,
        "transferredSize": 5368709120,
        "duration": 4500
      },
      "_instanceId": "veeam-prod",
      "_instanceName": "Veeam Production"
    }
  ],
  "_stale": false,
  "_source": "veeam",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure d'un element dans `data` (type `VeeamSession`) :

| Champ                          | Type                                         | Description                              |
|--------------------------------|----------------------------------------------|------------------------------------------|
| `id`                           | string (UUID)                                | ID unique de la session                  |
| `name`                         | string                                       | Nom du job associe                       |
| `sessionType`                  | string                                       | Type de session                          |
| `state`                        | `Stopped` \| `Working` \| `Idle`             | Etat courant de la session               |
| `result.result`                | `Success` \| `Warning` \| `Failed` \| `None` | Resultat                                 |
| `result.message`               | string (optionnel)                           | Message detaille                         |
| `progress`                     | number (optionnel)                           | Progression en pourcentage (0-100)       |
| `creationTime`                 | string ISO 8601                              | Date de debut                            |
| `endTime`                      | string ISO 8601 (optionnel)                  | Date de fin                              |
| `statistics.processedSize`     | number (optionnel)                           | Donnees traitees (octets)               |
| `statistics.readSize`          | number (optionnel)                           | Donnees lues (octets)                    |
| `statistics.transferredSize`   | number (optionnel)                           | Donnees transferees (octets)             |
| `statistics.duration`          | number (optionnel)                           | Duree en secondes                        |

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/veeam/sessions
```
