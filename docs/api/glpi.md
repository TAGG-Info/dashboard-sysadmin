# API — GLPI

> Retour vers [API Index](README.md)

Toutes les reponses GLPI sont agregees depuis toutes les instances GLPI configurees.

Cache TTL par defaut : **60 secondes** (configurable via `CACHE_TTL_GLPI`)

**Statuts des tickets GLPI :**

| Code | Libelle    |
|------|------------|
| 1    | Nouveau    |
| 2    | Assigne    |
| 3    | Planifie   |
| 4    | En attente |
| 5    | Resolu     |
| 6    | Clos       |

**Priorites des tickets GLPI :**

| Code | Libelle    |
|------|------------|
| 1    | Tres basse |
| 2    | Basse      |
| 3    | Moyenne    |
| 4    | Haute      |
| 5    | Tres haute |
| 6    | Majeure    |

## Endpoints

### GET /api/glpi/summary

**Description** : Retourne un resume agrege des tickets GLPI de toutes les instances.

**Authentification** : session requise (tout role)

**Cache** : TTL 60 secondes (stale jusqu'a 300s)

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "data": {
    "total": 312,
    "byStatus": {
      "1": 45,
      "2": 87,
      "3": 12,
      "4": 23,
      "5": 98,
      "6": 47
    },
    "byPriority": {
      "1": 15,
      "2": 64,
      "3": 120,
      "4": 78,
      "5": 23,
      "6": 12
    },
    "openCount": 167,
    "criticalCount": 35,
    "avgResolutionHours": 8.4
  },
  "_stale": false,
  "_source": "glpi",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure de `data` (type `GLPITicketSummary` agrege) :

| Champ                | Type                    | Description                                                |
|----------------------|-------------------------|------------------------------------------------------------|
| `total`              | number                  | Nombre total de tickets                                    |
| `byStatus`           | Record<number, number>  | Repartition par statut (cle = code statut)                 |
| `byPriority`         | Record<number, number>  | Repartition par priorite (cle = code priorite)            |
| `openCount`          | number                  | Tickets ouverts (statuts 1, 2, 3)                         |
| `criticalCount`      | number                  | Tickets critiques (priorite >= 5)                         |
| `avgResolutionHours` | number (optionnel)      | Temps moyen de resolution en heures (pondere par volume)  |

**Reponse 502 (aucune instance configuree) :**

```json
{ "error": "No GLPI instances configured", "source": "glpi" }
```

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/glpi/summary
```

---

### GET /api/glpi/tickets

**Description** : Retourne la liste complete des tickets GLPI de toutes les instances.

**Authentification** : session requise (tout role)

**Cache** : TTL 60 secondes (stale jusqu'a 300s)

#### Parametres query

Aucun

#### Reponse (200)

```json
{
  "data": [
    {
      "id": 1234,
      "name": "Imprimante hors service en salle 3B",
      "status": 2,
      "priority": 4,
      "urgency": 3,
      "type": 1,
      "date": "2024-02-15T09:00:00Z",
      "date_mod": "2024-02-15T14:30:00Z",
      "solvedate": null,
      "closedate": null,
      "content": "L'imprimante ne repond plus...",
      "itilcategories_id": 5,
      "_users_id_requester": "jdupont",
      "_users_id_assign": "techsupport",
      "_instanceId": "glpi-prod",
      "_instanceName": "GLPI Production"
    }
  ],
  "_stale": false,
  "_source": "glpi",
  "_timestamp": 1708123456789,
  "_partial": false
}
```

Structure d'un element dans `data` (type `GLPITicket`) :

| Champ                  | Type                  | Description                               |
|------------------------|-----------------------|-------------------------------------------|
| `id`                   | number                | ID unique du ticket                       |
| `name`                 | string                | Titre du ticket                           |
| `status`               | number (1-6)          | Statut (voir tableau ci-dessus)           |
| `priority`             | number (1-6)          | Priorite (voir tableau ci-dessus)         |
| `urgency`              | number                | Urgence (1-6)                             |
| `type`                 | `1` \| `2`            | `1` = Incident, `2` = Demande             |
| `date`                 | string ISO 8601       | Date de creation                          |
| `date_mod`             | string ISO 8601       | Date de derniere modification             |
| `solvedate`            | string ISO 8601 (opt.)| Date de resolution                        |
| `closedate`            | string ISO 8601 (opt.)| Date de cloture                           |
| `content`              | string (optionnel)    | Corps du ticket                           |
| `itilcategories_id`    | number (optionnel)    | ID de la categorie ITIL                   |
| `_users_id_requester`  | string (optionnel)    | Identifiant du demandeur                  |
| `_users_id_assign`     | string (optionnel)    | Identifiant du technicien assigne         |

#### Exemple curl

```bash
curl -b cookies.txt https://<host>/api/glpi/tickets
```
