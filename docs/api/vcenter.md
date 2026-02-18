# API — vCenter

> Retour vers [API Index](README.md)

Toutes les reponses vCenter sont agregees depuis toutes les instances vCenter configurees.

Cache TTL par defaut : **60 secondes** (configurable via `CACHE_TTL_VCENTER`)

## Endpoints

### GET /api/vcenter/vms

**Description** : Retourne la liste de toutes les machines virtuelles de toutes les instances vCenter.

**Authentification** : session requise (tout role)

**Cache** : TTL 60 secondes (stale jusqu'a 300s)

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "data": [
    {
      "vm": "vm-1001",
      "name": "web-server-01",
      "power_state": "POWERED_ON",
      "cpu_count": 4,
      "memory_size_MiB": 8192,
      "guest_OS": "Ubuntu Linux (64-bit)",
      "host": "host-101",
      "_instanceId": "vcenter-prod",
      "_instanceName": "vCenter Production"
    }
  ],
  "_stale": false,
  "_source": "vcenter",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure d'un element dans `data` (type `VCenterVM`) :

| Champ            | Type                                         | Description                        |
|------------------|----------------------------------------------|------------------------------------|
| `vm`             | string                                       | ID unique vCenter (ex: `vm-1001`)  |
| `name`           | string                                       | Nom de la VM                       |
| `power_state`    | `POWERED_ON` \| `POWERED_OFF` \| `SUSPENDED` | Etat d'alimentation                |
| `cpu_count`      | number                                       | Nombre de vCPU                     |
| `memory_size_MiB`| number                                       | RAM en MiB                         |
| `guest_OS`       | string (optionnel)                           | Systeme d'exploitation invite      |
| `host`           | string (optionnel)                           | ID de l'hote ESXi                  |

**Reponse 502 (aucune instance configuree) :**

```json
{ "error": "No vCenter instances configured", "source": "vcenter" }
```

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/vcenter/vms
```

---

### GET /api/vcenter/hosts

**Description** : Retourne la liste de tous les hotes ESXi, enrichis du nombre de VMs.

**Authentification** : session requise (tout role)

**Cache** : TTL 60 secondes (stale jusqu'a 300s)

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "data": [
    {
      "host": "host-101",
      "name": "esxi-01.local",
      "power_state": "POWERED_ON",
      "connection_state": "CONNECTED",
      "cpu_count": 32,
      "memory_size_MiB": 131072,
      "vm_count": 15,
      "running_vm_count": 14,
      "_instanceId": "vcenter-prod",
      "_instanceName": "vCenter Production"
    }
  ],
  "_stale": false,
  "_source": "vcenter",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure d'un element dans `data` (type `VCenterHost`) :

| Champ              | Type                                                           | Description                          |
|--------------------|----------------------------------------------------------------|--------------------------------------|
| `host`             | string                                                         | ID unique vCenter (ex: `host-101`)   |
| `name`             | string                                                         | Nom FQDN ou affichable               |
| `power_state`      | `POWERED_ON` \| `POWERED_OFF` \| `SUSPENDED`                  | Etat d'alimentation                  |
| `connection_state` | `CONNECTED` \| `DISCONNECTED` \| `NOT_RESPONDING`             | Etat de connexion vCenter            |
| `cpu_count`        | number (optionnel)                                             | Nombre de coeurs CPU physiques       |
| `memory_size_MiB`  | number (optionnel)                                             | RAM totale en MiB                    |
| `vm_count`         | number                                                         | Nombre total de VMs sur cet hote     |
| `running_vm_count` | number                                                         | Nombre de VMs allumees sur cet hote  |

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/vcenter/hosts
```

---

### GET /api/vcenter/datastores

**Description** : Retourne la liste de tous les datastores vCenter avec leur capacite et espace libre.

**Authentification** : session requise (tout role)

**Cache** : TTL 60 secondes (stale jusqu'a 300s)

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "data": [
    {
      "datastore": "datastore-201",
      "name": "SAN-LUN-01",
      "type": "VMFS",
      "free_space": 1073741824000,
      "capacity": 2199023255552,
      "_instanceId": "vcenter-prod",
      "_instanceName": "vCenter Production"
    }
  ],
  "_stale": false,
  "_source": "vcenter",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure d'un element dans `data` (type `VCenterDatastore`) :

| Champ        | Type   | Description                              |
|--------------|--------|------------------------------------------|
| `datastore`  | string | ID unique vCenter (ex: `datastore-201`)  |
| `name`       | string | Nom du datastore                         |
| `type`       | string | Type (`VMFS`, `NFS`, `vSAN`, etc.)       |
| `free_space` | number | Espace libre en octets                   |
| `capacity`   | number | Capacite totale en octets                |

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/vcenter/datastores
```
