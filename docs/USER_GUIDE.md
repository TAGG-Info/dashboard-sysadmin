# Guide Utilisateur — SysAdmin Dashboard

## Table des matières

1. [Connexion](#connexion)
2. [Navigation](#navigation)
3. [Dashboard (Accueil)](#dashboard-accueil)
4. [Monitoring (PRTG)](#monitoring-prtg)
5. [Infrastructure](#infrastructure)
6. [Sauvegardes (Veeam)](#sauvegardes-veeam)
7. [Tickets (GLPI)](#tickets-glpi)
8. [Transferts (SecureTransport)](#transferts-securetransport)
9. [Paramètres](#paramètres)
10. [Actualisation automatique](#actualisation-automatique)
11. [Gestion des erreurs](#gestion-des-erreurs)

---

## Connexion

L'accès au dashboard nécessite une authentification. La page de connexion est automatiquement affichée si vous n'êtes pas encore connecté.

### Champs requis

- **Nom d'utilisateur** : votre identifiant réseau (format `prenom.nom` recommandé)
- **Mot de passe** : votre mot de passe habituel

### Méthodes d'authentification

Le dashboard supporte deux méthodes :

1. **LDAP / Active Directory** (méthode principale) : utilisez vos identifiants de domaine.
2. **Compte administrateur local** (méthode de secours) : un compte local peut être configuré dans l'environnement du serveur. Utile si l'annuaire AD est indisponible.

### En cas d'erreur

Si vos identifiants sont incorrects, un message d'erreur s'affiche en rouge sous le formulaire. Vérifiez votre saisie et réessayez. En cas de problème persistant, contactez votre administrateur.

### Déconnexion

Cliquez sur votre nom d'utilisateur en haut à droite de l'interface, puis sélectionnez **Déconnexion**.

---

## Navigation

### Menu latéral (Sidebar)

Le menu latéral gauche donne accès à toutes les sections du dashboard. Il peut être réduit ou agrandi à l'aide du bouton fléché situé en bas du menu.

| Icône | Section | Description |
|-------|---------|-------------|
| Maison | Dashboard | Vue d'ensemble générale |
| Activité | Monitoring | Supervision PRTG |
| Serveur | Infrastructure | VMware vCenter + Proxmox |
| Base de données | Backups | Sauvegardes Veeam |
| Ticket | Tickets | Helpdesk GLPI |
| Flèches | Transferts | SecureTransport |
| Engrenage | Settings | Configuration (admin uniquement) |

En mode réduit, les libellés sont masqués mais des infobulles apparaissent au survol de chaque icône.

### Barre supérieure (Topbar)

La barre du haut affiche :

- **Le titre de la page courante** (à gauche)
- **Les indicateurs de statut des sources** : petits points colorés représentant l'état de connexion à chacune des 6 sources de données (PRTG, VMware, Proxmox, Veeam, GLPI, SecureTransport)
- **Le menu utilisateur** (à droite) : affiche votre nom et permet la déconnexion

### Rôles et droits d'accès

Deux rôles existent dans le dashboard :

| Rôle | Accès |
|------|-------|
| **Admin** | Accès à toutes les pages, y compris les Paramètres |
| **Viewer** | Accès à toutes les pages sauf Paramètres. Toute tentative d'accès aux Paramètres redirige vers le Dashboard |

---

## Dashboard (Accueil)

La page d'accueil offre une vue synthétique de l'ensemble de l'infrastructure. Elle est composée de trois zones.

### Cartes de synthèse (OverviewCards)

Cinq cartes cliquables en haut de page résument l'état de chaque source. Cliquer sur une carte navigue vers la page correspondante.

| Carte | Source | Indicateurs affichés |
|-------|--------|----------------------|
| **Monitoring** | PRTG | Nombre de capteurs Down / Warning, ou "Tout OK" |
| **Infrastructure** | vCenter + Proxmox | Nombre de VMs running sur le total |
| **Backups** | Veeam | Résultat du dernier job, nombre d'échecs sur 24h |
| **Tickets** | GLPI | Nombre de tickets ouverts, dont critiques |
| **Transferts** | SecureTransport | Comptes actifs, alertes de certificats expirant |

Chaque carte affiche un badge de statut coloré :
- **Vert** : situation normale
- **Orange** : avertissement
- **Rouge** : état critique

### Carte des devices (StatusGrid)

Grille visuelle de carrés colorés représentant l'état de chaque device PRTG. Passez la souris sur un carré pour voir le nom du device, son adresse IP, et le détail de ses capteurs (up/down/warning/paused).

Légende des couleurs :
- Vert : Up
- Orange : Warning
- Rouge : Down
- Gris : Paused

### Activité récente (RecentActivity)

Liste chronologique (20 derniers événements maximum) regroupant trois types de données :

- **Alertes PRTG** : capteurs en état Down ou Warning, avec le nom du device parent et la dernière valeur mesurée.
- **Sessions Veeam** : sessions des dernières 48 heures (succès, warnings, échecs, en cours).
- **Tickets GLPI** : tickets modifiés dans les dernières 48 heures, classés par priorité.

Chaque événement affiche : l'icône de la source, un badge de statut coloré (rouge, orange, vert, bleu), le titre, une description optionnelle, l'ancienneté relative, et un lien direct vers la source si configuré. Les événements sont triés du plus récent au plus ancien.

---

## Monitoring (PRTG)

La page Monitoring affiche les données de supervision issues de PRTG.

### Compteurs de capteurs (SensorGrid)

Quatre compteurs en haut de page indiquent le nombre total de capteurs par état :

- **Up** (vert) : capteurs fonctionnels
- **Down** (rouge) : capteurs en erreur
- **Warning** (orange) : capteurs en avertissement ou comportement inhabituel (Unusual)
- **Paused** (gris) : capteurs mis en pause manuellement

### Liste des alertes (AlertList)

Carte listant tous les capteurs PRTG en état d'alerte (Down, Warning ou Unusual). Aucun filtre : la liste complète est affichée, triée par sévérité décroissante (Down > Warning > Unusual) puis par priorité décroissante.

Chaque alerte affiche :
- Badge de statut coloré (rouge, orange)
- Priorité sous forme d'étoiles (1 à 5 `*`)
- Nom du capteur
- Nom du device parent
- Dernière valeur mesurée (si disponible)
- Message de diagnostic (en italique, si présent)
- Ancienneté de la dernière vérification (TimeAgo)
- Lien direct vers la page du capteur dans PRTG (si URL configurée)

Si aucune alerte n'est active, un message "Aucune alerte active" avec une icône verte est affiché.

### Arborescence des devices (DeviceTree)

Arborescence expandable représentant la hiérarchie PRTG : groupes → devices → capteurs. Les groupes et devices sont dépliables/repliables par clic.

Chaque device affiche un résumé compact de ses capteurs par état :
- Vert `✓N` : capteurs Up
- Rouge `✗N` : capteurs Down
- Orange `△N` : capteurs Warning
- Amber `~N` : capteurs Unusual (si > 0)
- Gris `‖N` : capteurs Paused (si > 0)

Survoler ces compteurs affiche une infobulle explicative. Déplier un device affiche la liste de ses capteurs via des SensorCard individuelles, avec pour chacune : statut, priorité, dernière valeur, message de diagnostic, dernière vérification et lien PRTG.

### Actualisation manuelle

Un bouton **Actualiser** est disponible en haut à droite de la page. Il force le rechargement de toutes les données PRTG (compteurs, alertes, arborescence).

---

## Infrastructure

La page Infrastructure centralise les informations des deux hyperviseurs : VMware vCenter et Proxmox. Les données sont présentées dans deux onglets séparés.

### Onglet VMware (vCenter)

#### Hosts ESXi

Grille de cartes représentant chaque hôte ESXi. Chaque carte affiche :
- Nom du host (FQDN)
- Badge de connexion : **Connecté** (vert), **Déconnecté** (rouge) ou **Ne répond pas** (orange)
- Nombre de VMs total et nombre de VMs actives
- Nombre de CPU et quantité de RAM totale en Go (si disponibles via l'API)
- Lien direct vers la page du host dans vSphere (si URL configurée)

#### Machines virtuelles (VMList)

Tableau des VMs gérées par vCenter, trié alphabétiquement par nom.

Colonnes : **Nom**, **Etat** (On / Off / Suspended), **Host** (FQDN de l'hôte ESXi), **CPU** (vCPU alloués), **RAM** (en Go ou MiB), **Lien** vers vSphere.

Un filtre dropdown permet d'afficher uniquement les VMs dans un état particulier : Tous / On / Off / Suspended. Le compteur en-tête affiche le nombre de VMs filtrées sur le total.

#### Datastores (DatastoreList)

Liste des datastores vCenter affichés sous forme de barres de progression. Chaque datastore affiche :
- Nom du datastore
- Espace utilisé / total en GB (barre colorée)
- Avertissement rouge "Espace disque critique (X%)" si l'utilisation dépasse 85%

Les datastores sont triés par taux d'utilisation décroissant (les plus remplis en premier).

### Onglet Proxmox

#### Nodes

Grille de cartes pour chaque nœud Proxmox. Chaque carte affiche :
- Nom du nœud
- Badge de statut : **Online** (vert) ou **Offline** (rouge)
- Pour les nœuds en ligne : trois jauges circulaires **CPU%**, **RAM%** et **Disk%**
- Uptime formaté (ex : `3j 12h` ou `45m 30s`)
- Lien direct vers la page du nœud dans l'interface Proxmox (si URL configurée)

#### VMs Proxmox (ProxmoxVMTable)

Tableau des machines virtuelles et conteneurs (CT) Proxmox.

Colonnes : **Type** (VM / CT), **Nom**, **Node** (nœud d'hébergement), **Etat** (Running / Stopped), **CPU** (cores alloués), **RAM** (utilisée / max pour les VMs en cours d'exécution, max seul pour les arrêtées), **Lien** vers Proxmox.

### Instances multiples

Si plusieurs instances vCenter ou Proxmox sont configurées, les ressources sont regroupées par instance avec un en-tête de section indiquant le nom de l'instance.

### Actualisation manuelle

Un bouton **Actualiser** est disponible en haut à droite. Il recharge les données des deux hyperviseurs simultanément.

---

## Sauvegardes (Veeam)

La page Backups affiche l'état des sauvegardes gérées par Veeam Backup & Replication.

### Compteurs (dernières 24 heures)

Quatre cartes en haut de page résument l'activité des dernières 24 heures :

- **Total jobs** : nombre total de jobs de sauvegarde configurés
- **Success 24h** (vert) : sessions de sauvegarde réussies
- **Warnings 24h** (orange) : sessions terminées avec avertissements
- **Echecs 24h** (rouge) : sessions en erreur. Si des échecs sont présents, un badge "failed" s'affiche.

### Liste des jobs (JobList)

Tableau de tous les jobs de sauvegarde configurés dans Veeam. Aucun filtre disponible ; tous les jobs sont affichés.

Colonnes : **Nom**, **Type** (badge), **Dernier résultat** (Success / Warning / Failed / Jamais exécuté), **Dernier run** (ancienneté relative), **Actif** (badge Actif / Désactivé), **Lien** vers l'interface Veeam.

Les jobs désactivés apparaissent en semi-transparent. Le compteur en-tête indique le nombre total de jobs.

### Chronologie des sessions (SessionTimeline)

Vue chronologique des **20 sessions les plus récentes**, triées de la plus récente à la plus ancienne.

Chaque session affiche :
- Point coloré de timeline (vert, orange, rouge, bleu pour "en cours", gris)
- Nom du job
- Badge statut (Success / Warning / Failed / En cours)
- Ancienneté de création et durée d'exécution (ex : `2h 15m`)
- Message de résultat si présent
- Pour les sessions en cours : barre de progression avec pourcentage d'avancement

Si plusieurs instances Veeam sont configurées, le nom de l'instance apparaît en badge à côté du nom du job.

### Calendrier des sauvegardes (BackupCalendar)

Calendrier mensuel navigable (boutons mois précédent / suivant) affichant l'historique des sauvegardes.

Chaque jour est coloré selon le pire résultat des sessions exécutées ce jour-là :
- **Vert** : toutes les sessions réussies
- **Orange** : au moins un warning
- **Rouge** : au moins un échec
- **Gris foncé** : aucun backup ce jour-là

Survoler un jour affiche une infobulle avec la date complète et le statut. Les jours en dehors du mois courant sont affichés en semi-transparent. Une légende est visible sous le calendrier.

### Actualisation manuelle

Un bouton **Actualiser** est disponible en haut à droite de la page.

---

## Tickets (GLPI)

La page Tickets affiche les tickets du helpdesk issus de GLPI.

### Indicateur de connexion

Un indicateur de statut affiché à côté du titre confirme si la connexion à GLPI est active.

### Compteurs de tickets (TicketStats)

Cinq cartes de synthèse :

| Carte | Couleur | Description |
|-------|---------|-------------|
| **Total ouverts** | Jaune | Nombre de tickets en cours (hors résolus et clos) |
| **Nouveaux** | Violet | Tickets au statut "Nouveau" (non encore assignés) |
| **Assignés** | Bleu | Tickets au statut "Assigné" |
| **Critiques** | Rouge | Tickets de priorité 5 (Très haute) ou 6 (Majeure) |
| **Temps moyen résolution** | Gris | Durée moyenne de résolution en heures (sur les tickets résolus) |

Un badge de statut s'affiche sous la valeur quand elle est non nulle.

### Liste des tickets (TicketList)

Tableau complet des tickets GLPI avec filtres combinables.

**Colonnes** : ID (`#`), Titre, Priorité (badge coloré), Statut, Type (Incident / Demande), Assigné (nom de l'assignataire), Date (ancienneté), Lien GLPI.

**Priorités** (badges colorés) :
- Très basse / Basse → gris
- Moyenne → bleu
- Haute → orange
- Très haute / Majeure → rouge

**Statuts** : Nouveau, Assigné, Planifié, En attente, Résolu, Clos.

**Filtres disponibles** (dropdowns combinables) : Statut, Priorité, Type. Le compteur indique le nombre de tickets filtrés sur le total.

**Tri** : priorité décroissante, puis date décroissante.

### Actualisation manuelle

Un bouton **Actualiser** est disponible en haut à droite de la page.

---

## Transferts (SecureTransport)

La page Transferts affiche les informations issues de IBM Sterling Secure Transport (ST).

### Indicateur de connexion

Un indicateur de statut affiché à côté du titre confirme si la connexion à SecureTransport est active.

### Compteurs (TransferStats)

Trois cartes de synthèse :

| Carte | Description |
|-------|-------------|
| **Comptes actifs** | Nombre de comptes actifs / total. Badge gris si des comptes sont désactivés. |
| **Certificats** | Nombre total de certificats. Badge orange si certains expirent prochainement, badge vert "Tous valides" sinon. |
| **Sites de transfert** | Nombre total de sites de transfert configurés. |

### Liste des transferts / certificats (TransferList)

Liste des **certificats arrivant à expiration** (dans les 30 prochains jours). Chaque ligne affiche :
- Badge rouge "Expire"
- Alias du certificat
- Instance SecureTransport (si plusieurs instances configurées)
- Date d'expiration en format relatif (ex : "dans 12 jours")

Si aucun certificat n'expire prochainement, une bannière verte "Aucun certificat n'expire prochainement" est affichée à la place.

### Transferts récents

Un encadré d'information indique que le log de transfert complet n'est pas toujours disponible via l'API REST. Un lien direct vers l'interface web SecureTransport est proposé si une URL externe est configurée.

### Actualisation manuelle

Un bouton **Actualiser** est disponible en haut à droite de la page.

---

## Paramètres

> **Accès réservé aux administrateurs.** Les utilisateurs avec le rôle Viewer sont automatiquement redirigés vers le Dashboard s'ils tentent d'accéder à cette page.

La page Paramètres permet de configurer les connexions aux sources de données et de consulter les informations système.

### Configuration des sources (SourceConfigs)

Section principale permettant de gérer les connexions aux 6 sources de données. Chaque source peut avoir une ou plusieurs instances configurées.

#### Sources disponibles

| Source | Authentification requise |
|--------|--------------------------|
| PRTG | URL API + Clé API |
| VMware (vCenter) | URL + Nom d'utilisateur + Mot de passe |
| Proxmox | URL + Token ID + Token Secret |
| Veeam | URL + Nom d'utilisateur + Mot de passe |
| GLPI | URL API + App Token + User Token |
| SecureTransport | URL + Nom d'utilisateur + Mot de passe + Version API |

#### Gestion des instances

Pour chaque source, vous pouvez :

- **Ajouter une nouvelle instance** : cliquez sur le bouton d'ajout pour créer une nouvelle configuration. Un nom d'instance est obligatoire (ex. "PRTG Production").
- **Modifier une instance existante** : les champs sont éditables directement.
- **Tester la connexion** : le bouton "Tester la connexion" vérifie que les paramètres saisis permettent d'atteindre la source. Le résultat s'affiche immédiatement (temps de réponse en ms si succès, message d'erreur sinon).
- **Sauvegarder** : enregistre la configuration sur le serveur. Un retour visuel confirme le succès ou l'échec.
- **Supprimer une instance** : le bouton Supprimer demande une confirmation avant de procéder.

**Champs secrets** (mots de passe, tokens) : les valeurs sont masquées par défaut. Un bouton oeil permet d'afficher/masquer la valeur. Si un secret est déjà configuré, le champ affiche `****`. Laisser ce champ vide lors d'une sauvegarde conserve l'ancienne valeur.

Les configurations sont stockées sur le serveur avec chiffrement AES-256-GCM des champs sensibles.

### Health Checks

Panneau permettant de vérifier en temps réel la connectivité vers chacune des 6 sources.

- **"Tout tester"** : lance simultanément un test de connexion vers toutes les sources. Le résultat s'affiche pour chacune (temps de réponse ou message d'erreur).
- **Test individuel** : cliquez sur une tuile de source pour tester uniquement cette source.
- Le compteur en en-tête indique le nombre de sources connectées sur le total (ex. "4/6 connectés").

### Intervalles de refresh

Panneau d'information affichant les intervalles d'actualisation automatique actifs pour chaque source. Ces valeurs sont configurées dans les variables d'environnement du serveur et ne peuvent pas être modifiées depuis l'interface.

| Source | Intervalle par défaut |
|--------|----------------------|
| PRTG | 30 secondes |
| VMware | 60 secondes |
| Proxmox | 60 secondes |
| Veeam | 2 minutes |
| GLPI | 60 secondes |
| SecureTransport | 2 minutes |

### Liens externes

Panneau affichant des raccourcis vers les interfaces web des sources configurées. Chaque lien s'ouvre dans un nouvel onglet. Les sources sans URL externe configurée sont affichées comme "Non configuré".

---

## Actualisation automatique

Le dashboard actualise automatiquement les données sans intervention de l'utilisateur.

### Fonctionnement

Chaque source de données est interrogée selon son propre intervalle (voir tableau ci-dessus dans la section Paramètres). En cas d'erreur répétée, le système espace progressivement les tentatives de reconnexion pour ne pas surcharger les sources (mécanisme de backoff exponentiel).

Les données peuvent être dans un état **"périmé"** (stale) si elles n'ont pas pu être rafraichies dans le délai imparti — dans ce cas, les données précédentes restent affichées.

### Bouton d'actualisation manuelle

Toutes les pages (sauf le Dashboard) disposent d'un bouton **Actualiser** en haut à droite. Ce bouton force le rechargement immédiat de toutes les données de la page courante, indépendamment du cycle d'actualisation automatique. Un indicateur de chargement s'affiche pendant l'opération.

### Compte à rebours

Le compte à rebours avant le prochain refresh est géré en interne par les hooks de données. Il n'est pas affiché visuellement dans l'interface utilisateur : les données sont simplement rafraîchies silencieusement en arrière-plan selon l'intervalle de chaque source.

---

## Gestion des erreurs

Le dashboard est conçu pour continuer à fonctionner même si une ou plusieurs sources sont indisponibles.

### Comportement en cas de panne d'une source

- Les données des autres sources continuent de s'afficher normalement.
- La source en erreur affiche un encadré rouge avec le message d'erreur et un bouton **Réessayer**.
- Les indicateurs de statut dans la barre supérieure reflètent l'état de chaque source.

### Types d'états

| Badge / Couleur | Signification |
|-----------------|---------------|
| Vert — Healthy | Tout est normal |
| Orange — Warning | Situation dégradée, attention requise |
| Rouge — Critical | Problème critique |
| Gris — Neutral | Source inactive ou non configurée |

### Que faire si une source est indisponible ?

1. Vérifiez l'état de la source dans la page **Paramètres > Health Checks** (admin uniquement).
2. Si le test de connexion échoue, vérifiez que l'URL et les identifiants sont corrects.
3. Si la source est configurée mais inaccessible depuis le serveur du dashboard, vérifiez la connectivité réseau entre le serveur et la source.
4. Utilisez le lien externe (Paramètres > Liens externes) pour accéder directement à l'interface web de la source concernée.
5. En cas de doute, contactez votre administrateur système.

### Données en cache

Le dashboard utilise un cache côté serveur (Redis ou mémoire en fallback) pour optimiser les performances. Si une source est momentanément indisponible, les dernières données valides sont servies depuis le cache — elles peuvent donc être légèrement périmées. L'état "stale" est géré en interne et n'est pas affiché explicitement dans l'interface : les données précédentes restent visibles jusqu'au prochain refresh réussi.
