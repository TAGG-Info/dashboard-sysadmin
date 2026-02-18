# API — Proxmox

> Retour vers [API Index](README.md)

Toutes les reponses Proxmox sont agregees depuis toutes les instances Proxmox configurees.

Cache TTL par defaut : **60 secondes** (configurable via `CACHE_TTL_PROXMOX`)

## Endpoints

### GET /api/proxmox/nodes

**Description** : Retourne la liste des noeuds Proxmox avec leurs statistiques de ressources.

**Authentification** : session requise (tout role)

**Cache** : TTL 60 secondes (stale jusqu'a 300s)

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "data": [
    {
      "node": "pve-node-01",
      "status": "online",
      "cpu": 0.12,
      "maxcpu": 16,
      "mem": 17179869184,
      "maxmem": 68719476736,
      "disk": 50000000000,
      "maxdisk": 500000000000,
      "uptime": 864000,
      "_instanceId": "proxmox-prod",
      "_instanceName": "Proxmox Production"
    }
  ],
  "_stale": false,
  "_source": "proxmox",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure d'un element dans `data` (type `ProxmoxNode`) :

| Champ     | Type                    | Description                     |
|-----------|-------------------------|---------------------------------|
| `node`    | string                  | Nom du noeud Proxmox            |
| `status`  | `"online"` \| `"offline"` | Etat du noeud                 |
| `cpu`     | number                  | Utilisation CPU (ratio 0-1)     |
| `maxcpu`  | number                  | Nombre de coeurs logiques       |
| `mem`     | number                  | RAM utilisee (octets)           |
| `maxmem`  | number                  | RAM totale (octets)             |
| `disk`    | number                  | Espace disque utilise (octets)  |
| `maxdisk` | number                  | Espace disque total (octets)    |
| `uptime`  | number                  | Uptime en secondes              |

**Reponse 502 (aucune instance configuree) :**

```json
{ "error": "No Proxmox instances configured", "source": "proxmox" }
```

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/proxmox/nodes
```

---

### GET /api/proxmox/vms

**Description** : Retourne la liste de toutes les VMs et conteneurs LXC de toutes les instances Proxmox.

**Authentification** : session requise (tout role)

**Cache** : TTL 60 secondes (stale jusqu'a 300s)

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "data": [
    {
      "vmid": 100,
      "name": "debian-web",
      "status": "running",
      "type": "qemu",
      "node": "pve-node-01",
      "cpus": 2,
      "maxmem": 2147483648,
      "mem": 1073741824,
      "uptime": 3600,
      "disk": 10000000000,
      "maxdisk": 32212254720,
      "_instanceId": "proxmox-prod",
      "_instanceName": "Proxmox Production"
    }
  ],
  "_stale": false,
  "_source": "proxmox",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure d'un element dans `data` (type `ProxmoxVM`) :

| Champ     | Type                                             | Description                         |
|-----------|--------------------------------------------------|-------------------------------------|
| `vmid`    | number                                           | ID unique de la VM dans Proxmox     |
| `name`    | string                                           | Nom de la VM ou conteneur           |
| `status`  | `running` \| `stopped` \| `paused` \| `suspended` | Etat d'execution                 |
| `type`    | `"qemu"` \| `"lxc"`                              | Type : VM KVM ou conteneur LXC      |
| `node`    | string                                           | Noeud Proxmox hebergeant la VM      |
| `cpus`    | number                                           | Nombre de vCPU                      |
| `maxmem`  | number                                           | RAM allouee (octets)                |
| `mem`     | number                                           | RAM utilisee (octets)               |
| `uptime`  | number                                           | Uptime en secondes                  |
| `disk`    | number (optionnel)                               | Espace disque utilise (octets)      |
| `maxdisk` | number (optionnel)                               | Espace disque alloue (octets)       |

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/proxmox/vms
```
