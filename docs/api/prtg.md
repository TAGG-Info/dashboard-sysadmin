# API — PRTG

> Retour vers [API Index](README.md)

Toutes les reponses PRTG sont agregees depuis toutes les instances PRTG configurees.

Cache TTL par defaut : **30 secondes** (configurable via `CACHE_TTL_PRTG`)

## Endpoints

### GET /api/prtg/summary

**Description** : Retourne le resume agrege des capteurs et equipements de toutes les instances PRTG.

**Authentification** : session requise (tout role)

**Cache** : TTL 30 secondes (stale jusqu'a 150s)

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "data": {
    "sensors": {
      "up": 1240,
      "down": 3,
      "warning": 12,
      "paused": 45,
      "unusual": 2,
      "total": 1302
    },
    "devices": {
      "up": 180,
      "down": 2,
      "total": 182
    }
  },
  "_stale": false,
  "_source": "prtg",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

**Reponse 502 (aucune instance configuree) :**

```json
{ "error": "No PRTG instances configured", "source": "prtg" }
```

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/prtg/summary
```

---

### GET /api/prtg/alerts

**Description** : Retourne la liste des alertes actives (equipements en etat anormal) de toutes les instances PRTG.

**Authentification** : session requise (tout role)

**Cache** : TTL 30 secondes (stale jusqu'a 150s)

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "data": [
    {
      "id": 1042,
      "name": "Server-Web-01",
      "host": "192.168.1.10",
      "tags": ["web", "prod"],
      "status": "Down",
      "parentGroupId": 5,
      "metrics": {
        "sensors": {
          "up": 0, "down": 3, "warning": 0, "paused": 0, "unusual": 0, "undefined": 0, "total": 3
        }
      },
      "_instanceId": "prtg-prod",
      "_instanceName": "PRTG Production"
    }
  ],
  "_stale": false,
  "_source": "prtg",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure d'un element dans `data` (type `PRTGDevice`) :

| Champ                     | Type       | Description                                              |
|---------------------------|------------|----------------------------------------------------------|
| `id`                      | number     | ID unique de l'equipement PRTG                           |
| `name`                    | string     | Nom de l'equipement                                      |
| `host`                    | string     | Adresse IP ou hostname                                   |
| `tags`                    | string[]   | Tags associes                                            |
| `status`                  | string     | `Up`, `Warning`, `Down`, `Paused`, `Unusual`, `Unknown`  |
| `parentGroupId`           | number     | ID du groupe parent                                      |
| `metrics.sensors.up`      | number     | Nombre de capteurs UP                                    |
| `metrics.sensors.down`    | number     | Nombre de capteurs Down                                  |
| `metrics.sensors.warning` | number     | Nombre de capteurs Warning                               |
| `metrics.sensors.paused`  | number     | Nombre de capteurs en pause                              |
| `metrics.sensors.unusual` | number     | Nombre de capteurs Unusual                               |
| `metrics.sensors.total`   | number     | Total capteurs                                           |

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/prtg/alerts
```

---

### GET /api/prtg/devices

**Description** : Retourne la liste complete de tous les equipements de toutes les instances PRTG.

**Authentification** : session requise (tout role)

**Cache** : TTL 30 secondes (stale jusqu'a 150s)

#### Parametres query

Aucun

#### Reponse (200)

Meme structure que `/api/prtg/alerts` mais contient TOUS les equipements (tous statuts confondus).

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/prtg/devices
```

---

### GET /api/prtg/sensors

**Description** : Retourne la liste des capteurs PRTG, avec filtrage optionnel par equipement.

**Authentification** : session requise (tout role)

**Cache** : TTL 30 secondes (stale jusqu'a 150s)

#### Parametres query

| Parametre  | Type   | Requis | Description                                          |
|------------|--------|--------|------------------------------------------------------|
| `deviceId` | number | Non    | Si fourni, retourne uniquement les capteurs de cet equipement |

#### Reponse (200)

```json
{
  "data": [
    {
      "id": 2001,
      "name": "Ping",
      "type": "ping",
      "status": "Up",
      "priority": 3,
      "tags": ["network"],
      "parentDeviceId": 1042,
      "parentDeviceName": "Server-Web-01",
      "metrics": {
        "lastValue": "1.2 ms",
        "lastValueRaw": 1.2,
        "lastCheck": "2024-02-17T10:00:00Z",
        "message": "OK"
      },
      "_instanceId": "prtg-prod",
      "_instanceName": "PRTG Production"
    }
  ],
  "_stale": false,
  "_source": "prtg",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure d'un element dans `data` (type `PRTGSensor`) :

| Champ                   | Type             | Description                         |
|-------------------------|------------------|-------------------------------------|
| `id`                    | number           | ID unique du capteur                |
| `name`                  | string           | Nom du capteur                      |
| `type`                  | string           | Type de capteur PRTG                |
| `status`                | string           | Statut (`Up`, `Down`, etc.)         |
| `priority`              | number           | Priorite (1-5)                      |
| `tags`                  | string[]         | Tags                                |
| `parentDeviceId`        | number           | ID de l'equipement parent           |
| `parentDeviceName`      | string (opt.)    | Nom de l'equipement parent          |
| `metrics.lastValue`     | string (opt.)    | Derniere valeur (avec unite)        |
| `metrics.lastValueRaw`  | number (opt.)    | Derniere valeur brute               |
| `metrics.lastCheck`     | string (opt.)    | Date du dernier controle (ISO 8601) |
| `metrics.message`       | string (opt.)    | Message d'etat                      |

#### Exemple curl

```bash
# Tous les capteurs
curl -b cookies.txt https://<host>/api/prtg/sensors

# Capteurs d'un equipement specifique
curl -b cookies.txt "https://<host>/api/prtg/sensors?deviceId=1042"
```
