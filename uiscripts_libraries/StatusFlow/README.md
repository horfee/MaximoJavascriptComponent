# StatusFlow

Composant Maximo UI Script qui affiche une **timeline horizontale de l'historique des statuts** d'un enregistrement Maximo (ticket, OT, SR…). Les statuts déjà franchis sont mis en évidence, le statut courant est signalé visuellement, et les étapes futures du workflow nominal sont affichées en grisé pour indiquer la progression attendue.

---

## Fonctionnalités

- Timeline horizontale sans dépendance externe (HTML/CSS pur)
- Affichage des **statuts passés** avec date et auteur du changement
- **Statut courant** mis en évidence (indicateur visuel distinct)
- **Statuts futurs** du workflow nominal affichés en grisé
- Tri chronologique des entrées (`changedate` ascendant)
- Affichage de la **note** (`memo`) associée à chaque changement de statut
- Rafraîchissement automatique à chaque événement `update` / `refresh` du ScriptControl
- Formatage des dates en locale française (dd/mm/yyyy hh:mm)

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `statusflow.js` | Script UI — récupère l'historique des statuts et rend la timeline |
| `statusflow.css` | Styles de la timeline |

---

## Intégration XML (présentation Maximo)

```xml
<datasrc id="status_ds" relationship="TKSTATUS"/>
<script datasrc="mainrecord" id="status_script"     scriptnum="ext_stepper"/>
<script id="status_script_css"                       scriptnum="ext_stepper_css"/>
<section id="status_showhistory"/>
```

> Le datasource `status_ds` doit pointer vers la relation d'historique des statuts de l'objet (ex. `TKSTATUS` pour les tickets, `WOSTATUS` pour les OT). Adapter le `relationship` selon l'application cible.

---

## Configuration du workflow nominal

Le tableau `NOMINAL_STATUSES` dans [`statusflow.js`](statusflow.js) définit la séquence des statuts attendus. Adapter les valeurs à votre workflow :

```js
const NOMINAL_STATUSES = [
    "NOUVEAU",
    "INSTRUIT",
    "CONTROLE",
    "APPROUVE",
    "SOLDE",
    "CLOTURE"
];
```

- Si le statut courant fait partie de ce tableau, les statuts **suivants** sont affichés en tant qu'étapes futures.
- Si le statut courant n'est pas dans la liste, aucune étape future n'est ajoutée.

---

## Données lues depuis Maximo

Le script appelle `getData(dataSourceId, fields, undefined, { changedate: true }, 0, 1000)` sur le datasource `status_ds` avec les champs suivants :

| Champ | Description |
|---|---|
| `changedate` | Date du changement de statut |
| `status` | Code du nouveau statut |
| `changeby` | Identifiant de l'auteur |
| `memo` | Note saisie lors du changement |

---

## Noms des scripts Maximo

Les scripts doivent être enregistrés dans Maximo sous les noms suivants :

| Script | Nom Maximo (`scriptnum`) |
|---|---|
| `statusflow.js` | `ext_stepper` |
| `statusflow.css` | `ext_stepper_css` |

---

## Dépendances

- Aucune bibliothèque externe — JavaScript pur (ES2020+) + CSS pur
- Maximo 7.6.1+ (API `getData`, `registerNotificationCallBack`)
