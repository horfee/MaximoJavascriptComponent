# EXTable

Composant Maximo UI Script qui remplace la liste de résultats native Maximo par un tableau HTML riche et entièrement personnalisable, sans dépendance externe. La classe `MaximoTable` gère la pagination, le tri, le filtrage, la sélection, le redimensionnement et le réordonnancement des colonnes, ainsi que l'export CSV.

---

## Fonctionnalités

- **Pagination** côté serveur ou côté client (tailles configurables : 10, 25, 50, 100…)
- **Tri** multi-colonne avec indicateurs visuels ascendant/descendant
- **Filtrage** en ligne par colonne (debounced, 200 ms)
- **Sélection** mono ou multi-lignes avec case à cocher
- **Redimensionnement** des colonnes par glisser-déposer
- **Réordonnancement** des colonnes par glisser-déposer
- **Gestionnaire de colonnes** (modal) : afficher/masquer, réordonner, réinitialiser
- **Export CSV** du contenu courant
- **Repli/déploiement** du tableau (collapse)
- **Persistance** de la configuration des colonnes dans le `localStorage`
- Types de cellule supportés : `text`, `number`, `date`, `boolean`, `link`, `badge`
- Deux thèmes CSS fournis : `extable.style1.css` (header bleu IBM) et `extable.style2.css`

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `extable.js` | Bibliothèque principale — classe `MaximoTable` |
| `extable.style1.css` | Thème CSS style IBM Maximo (header bleu, accents orange) |
| `extable.style2.css` | Thème CSS alternatif |
| `ticket_list.js` | Exemple d'intégration : liste de tickets SR avec navigation vers la fiche |
| `APPBEAN.SR.jython` | Script Jython côté serveur — événements `selectRow`, `gotoRecord`, `gotoTab` |

---

## Utilisation

### 1. Déclarer les scripts dans la présentation XML

```xml
<script id="extable_lib"    scriptnum="EXTABLE"/>
<script id="extable_css"    scriptnum="EXTABLE_CSS"/>
<script datasrc="results_showlist" id="ticket_list_script" scriptnum="TICKET_LIST"/>
<section id="results_showlist_section"/>
<datasrc id="results_showlist" mboname="INCIDENT" startempty="false"/>
```

### 2. Instancier `MaximoTable` dans un script UI

```js
const table = new MaximoTable("#ma-section-id", {
    title:        "Mes tickets",
    dataSourceId: "results_showlist",
    storageKey:   APPID + "ma-section-id-table",   // clé localStorage
    columns:      [
        { key: "ticketid",    label: "Ticket",      width: 160, displaytype: "link",  type: "text",   visible: true, sortable: true },
        { key: "description", label: "Description", width: 300, type: "text",   visible: true, sortable: true },
        { key: "status",      label: "Statut",      width: 100, type: "text",   visible: true, sortable: true },
    ],
    pageSize:     25,
    pageSizes:    [10, 25, 50, 100],
    multiSelect:  false,
    actions:      []
});

// Rechargement des données à chaque changement de filtre ou de tri
table.addEventListener("filter-changed", table.retrieveData.bind(table));
table.addEventListener("sort-changed",   table.retrieveData.bind(table));

// Navigation vers la fiche au clic / double-clic
table.addEventListener("row-double-click", (ev) => {
    this.sendEvent({ eventType: "gotoRecord", eventValue: ev.detail.selectedIndex, targetId: APPID });
});
```

### 3. Réagir aux événements ScriptControl

```js
this.registerNotificationCallBack(async (event) => {
    if (event === "render" || event === "refresh") {
        document.querySelector("#ma-section-id").appendChild(table._root);
    }
    if (event === "update" || event === "refresh") {
        table.retrieveData();
    }
});
```

---

## API `MaximoTable`

### Constructeur

```js
new MaximoTable(container, options)
```

| Option | Type | Défaut | Description |
|---|---|---|---|
| `title` | `string` | `""` | Titre affiché dans la barre d'outils |
| `dataSourceId` | `string` | — | ID du datasource Maximo |
| `columns` | `Column[]` | `DEFAULT_COLUMNS` | Définition des colonnes |
| `pageSize` | `number` | `25` | Nombre de lignes par page |
| `pageSizes` | `number[]` | `[10,25,50,100]` | Choix proposés dans le sélecteur de taille |
| `multiSelect` | `boolean` | `false` | Activer la sélection multiple |
| `storageKey` | `string` | — | Clé localStorage pour persister la config colonnes |
| `actions` | `Action[]` | `[]` | Boutons d'action supplémentaires dans la barre |

### Événements émis

| Événement | `detail` | Description |
|---|---|---|
| `row-selected` | `{ rowIndex, data }` | Ligne sélectionnée (simple clic) |
| `row-double-click` | `{ selectedIndex, data }` | Ligne double-cliquée |
| `link-click` | `{ selectedIndex, data }` | Cellule de type `link` cliquée |
| `filter-changed` | `{ filters }` | Un filtre a changé |
| `sort-changed` | `{ key, dir }` | Le tri a changé |
| `selection-changed` | `{ selected }` | Sélection multiple modifiée |

### Méthodes principales

| Méthode | Description |
|---|---|
| `retrieveData(includeFilter?)` | Recharge les données depuis Maximo |
| `setData(data, currentRow?)` | Injecte les données directement |
| `getSelected()` | Retourne les lignes sélectionnées |
| `setFilters(filters)` | Applique des filtres programmatiquement |
| `setTitle(title)` | Modifie le titre |
| `setFilterOpen(open)` | Affiche / masque la ligne de filtre |
| `refresh()` | Alias de `retrieveData()` |

---

## Script Jython (`APPBEAN.SR.jython`)

| Fonction | Événement Maximo | Description |
|---|---|---|
| `selectRow(ctx)` | `selectRow` | Met en surbrillance une ligne dans le datasource |
| `gotoRecord(ctx)` | `gotoRecord` | Navigue vers la fiche et bascule sur l'onglet `insert` |
| `gotoTab(ctx)` | `gotoTab` | Bascule sur un onglet donné |

---

## Dépendances

- Aucune bibliothèque externe — JavaScript pur (ES2020+)
- Maximo 7.6.1+ (API `getData`, `sendEvent`, `registerNotificationCallBack`)
