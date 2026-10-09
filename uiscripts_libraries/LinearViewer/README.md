# LinearViewer

Composant Maximo UI Script qui affiche une **vue linéaire** d'un actif linéaire (pipeline, route, câble…) directement dans l'application Actifs. Il représente graphiquement les fonctions, spécifications, ordres de travail, tickets et relations positionnés sur l'axe de l'actif, avec un navigateur de fenêtre glissant et un arbre de catégories à chargement différé.

---

## Fonctionnalités

- Représentation d'un actif linéaire sur son axe de mesure (startMeasure → endMeasure)
- **Navigateur de fenêtre** : zoom et panoramique sur une portion de l'axe
- **Arbre de catégories** latéral avec chargement paresseux (_lazy load_) :
  - Fonctions linéaires (features) avec leurs spécifications
  - Spécifications directes
  - Ordres de travail positionnés
  - Tickets / demandes de service positionnés
  - Relations inter-actifs
- Affichage des éléments sous forme de **segments** ou de **points** selon la présence d'une valeur `endMeasure`
- Tooltips détaillés au survol de chaque élément
- Rafraîchissement automatique à chaque événement `update` / `refresh` du ScriptControl

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `linearasset_cmp.js` | Bibliothèque principale — classe `LinearAsset` |
| `linearasset_cmp_css.css` | Styles du composant |
| `asset_laviewer.js` | Script d'intégration Maximo — charge les données et instancie `LinearAsset` |
| `APPBEAN.ASSET.jython` | Script Jython côté serveur — expose les événements asynchrones de données |

---

## Intégration XML (présentation Maximo)

```xml
<section id="linearviewer_section_holder">
    <script id="linearviewer_section_sc1" scriptnum="LINEARASSET_CMP"/>
    <script id="linearviewer_section_sc2" scriptnum="LINEARASSET_CMP_CSS"/>
    <script id="linearviewer_section_sc3" scriptnum="ASSET_LAVIEWER" datasrc="mainrecord"/>
    <section id="linearviewer_section"/>
</section>
```

---

## Datasources requis

Adapter les noms à votre schéma Maximo dans [`asset_laviewer.js`](asset_laviewer.js) :

| Constante | Datasource Maximo | Contenu |
|---|---|---|
| `LINEASSET_DS` | `mainrecord` | Actif principal (startmeasure, endmeasure, unité) |
| `LINFEATURE_DS` | `features_datasrc` | Fonctions linéaires |
| `LINEFEATURESPEC_DS` | `features_spec_datasrc` | Spécifications de fonctions |
| `LINSPEC_DS` | `specifications_datasrc` | Spécifications directes |
| `LINWORK_DS` | `workorders_datasrc` | Ordres de travail positionnés |
| `LINTICKET_DS` | `tickets_datasrc` | Tickets / SR positionnés |
| `LINRELATION_DS` | `relationships_datasrc` | Relations inter-actifs |

---

## Script Jython (`APPBEAN.ASSET.jython`)

### Événements exposés

| Fonction | Événement Maximo | Description |
|---|---|---|
| `hasLinearData(ctx)` | `hasLinearData` | Retourne un JSON `{ hasFeatures, hasSpecifications, hasWorks, hasTickets }` indiquant si chaque catégorie contient des données |
| `fetchLinearData(ctx)` | `fetchLinearData` | Retourne les enregistrements d'un datasource sous forme de tableau JSON |
| `fetchSpecsForFeature(ctx)` | `fetchSpecsForFeature` | Retourne les spécifications de toutes les fonctions linéaires |
| `selectRow(ctx)` | `selectRow` | Met en surbrillance une ligne dans un datasource |

### Format de requête pour `fetchLinearData`

```json
{
  "dataSourceId": "features_datasrc",
  "fields": ["feature", "feature.description", "startmeasure", "endmeasure"],
  "includeCountFor": "features_spec_datasrc"
}
```

---

## API `LinearAsset`

### Constructeur

```js
new LinearAsset(container, options)
```

| Option | Type | Description |
|---|---|---|
| `title` | `string` | Titre affiché en en-tête |
| `startPoint` | `number` | Début de l'axe |
| `endPoint` | `number` | Fin de l'axe |
| `unit` | `string` | Unité de mesure affichée |
| `showWindow` | `boolean` | Afficher le navigateur de fenêtre |
| `categories` | `Category[]` | Définition des catégories (voir ci-dessous) |
| `loadCategory` | `async fn` | Fonction de chargement des données d'une catégorie |

### Structure d'une catégorie

```js
{
    id:           "features",
    label:        "Fonctions",
    icon:         "feature",
    color:        "#0f62fe",
    hasChildren:  true,          // indique si la catégorie peut être dépliée
    loadCategory: async (d) => { /* retourne un tableau d'items */ }
}
```

### Structure d'un item

```js
{
    id:           "feat-001",
    label:        "F001 — Canalisation principale",
    startMeasure: 0,
    endMeasure:   150,           // null ou absent = point
    color:        "#0f62fe",
    icon:         "segment",     // "segment" | "point"
    tooltip:      "...",
    hasChildren:  false,
    loadCategory: async (ev) => { /* sous-items */ }
}
```

### Méthodes principales

| Méthode | Description |
|---|---|
| `setData(categories)` | Définit les catégories |
| `setSpan(start, end)` | Redéfinit l'axe de l'actif |
| `setWindow(start, end)` | Positionne la fenêtre de visualisation |
| `getWindow()` | Retourne `{ start, end }` de la fenêtre courante |
| `setTitle(title)` | Modifie le titre |
| `setCategoryItems(id, items)` | Injecte des items dans une catégorie |
| `addEventListener(type, cb)` | S'abonne aux événements |
| `destroy()` | Détruit le composant et libère les écouteurs |

### Événements émis

| Événement | Description |
|---|---|
| `item-click` | Un item a été cliqué |
| `window-change` | La fenêtre de visualisation a changé |

---

## Dépendances

- Aucune bibliothèque externe — JavaScript pur (ES2020+)
- Maximo 7.6.1+ avec support des actifs linéaires (`LINEARASSET`, `LINFEATURE`, etc.)
