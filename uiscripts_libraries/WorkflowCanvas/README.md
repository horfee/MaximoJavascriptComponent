# WorkflowCanvas

Composant Maximo UI Script qui remplace l'éditeur graphique natif de Maximo Workflow par un **canvas interactif** rendu en SVG. Il permet de créer, déplacer et relier des nœuds de workflow directement depuis l'interface Maximo, avec persistance dans les tables standard Maximo (`WFNODE`, `WFACTION`).

---

## Fonctionnalités

- **Canvas SVG** : visualisation et édition graphique des nœuds et des relations
- **Types de nœuds** supportés : tâche (`task`), condition (`condition`), saisie manuelle (`input`), interaction (`interaction`), sous-processus (`subprocess`), attente (`wait`), arrêt (`stop`)
- **Création** de nœuds via la barre d'outils ou le menu contextuel
- **Déplacement** des nœuds par glisser-déposer (positions persistées dans Maximo)
- **Connexions** entre nœuds : liaison positive ou négative (ispositive)
- **Sélection** de nœuds et de relations avec propriétés editables dans les panneaux Maximo natifs
- **Suppression** des nœuds et relations sélectionnés
- **Zoom** (molette + boutons) et **panoramique** (glisser sur le fond)
- **Ajustement automatique** (`Fit to content`)
- **Annuler / Rétablir** (undo/redo) avec pile d'historique
- **Lecture seule** selon le statut du processus
- Mode **readonly** vs **edit** géré dynamiquement
- Raccourcis clavier : Suppr (suppression), Ctrl+Z (annuler), Ctrl+Y (rétablir), Échap (désélection)

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `wfcanvas.js` | Composant principal — classe `MaximoWorkflowEditor` + glue ScriptControl |
| `wfcanvas.css` | Styles du canvas |
| `APPBEAN.WFDESIGN.jython` | Script Jython côté serveur — CRUD nœuds et actions, événements propriétés |

---

## Intégration XML (présentation Maximo)

À insérer dans l'onglet de conception du Workflow Designer :

```xml
<tab id="wfdesigner1" label="Design" type="insert">
    <section id="wfdesigner1_section">
        <sectionrow id="designer_outerGrid_1_1_grid1_row1">
            <sectioncol id="designer_outerGrid_1_1_grid1_col1">
                <section id="designer_outerGrid_1_1_grid1_col1_1">
                    <multiparttextbox dataattribute="processname" descdataattribute="description"
                                      id="designer_outerGrid_1_1_grid1_1"/>
                    <textbox dataattribute="objectname" id="designer_outerGrid_1_1_grid2_1" lookup="objectname"/>
                    <textbox dataattribute="processrev"  id="designer_outerGrid_1_1_grid2_2"/>
                </section>
            </sectioncol>
            <!-- colonnes dates, checkboxes enabled/active/autoinitiate ... -->
        </sectionrow>
    </section>
    <section id="mynewcanvas">
        <section id="section_canvas"/>
        <script datasrc="mainrecord" id="wfcanvas_script" jstype="text/javascript" scriptnum="wfcanvas"/>
        <script id="wfcanvas_css_script" scriptnum="wfcanvas_css"/>
    </section>
</tab>
```

---

## Script Jython (`APPBEAN.WFDESIGN.jython`)

### Événements exposés

| Fonction | Événement Maximo | Description |
|---|---|---|
| `getAllNodes(ctx)` | `getAllNodes` | Retourne tous les nœuds du processus en JSON |
| `getAllActions(ctx)` | `getAllActions` | Retourne toutes les actions (relations) du processus en JSON |
| `createNode(ctx)` | `createNode` | Crée un nœud du type spécifié (`task`, `condition`, `input`, `interaction`, `subprocess`, `wait`, `stop`) |
| `updateNode(ctx)` | `updateNode` | Met à jour les coordonnées `(xcoordinate, ycoordinate)` d'un nœud |
| `selectNode(ctx)` | `selectNode` | Met en surbrillance un nœud dans le datasource `nodes_table` |
| `openPropertiesForNode(ctx)` | `openPropertiesForNode` | Ouvre le panneau de propriétés natif Maximo pour le nœud sélectionné |
| `createRelationship(ctx)` | `createRelationship` | Crée une action/relation entre deux nœuds (`source`, `target`, `kind`: `"positive"` ou `"negative"`) |
| `openPropertiesForAction(ctx)` | `openPropertiesForAction` | Ouvre le panneau de propriétés natif pour une action/relation |

### Format JSON d'un nœud

```json
{
  "nodeid":      42,
  "title":       "Vérification",
  "description": "Contrôle qualité",
  "nodetype":    "TASK",
  "xcoordinate": 250,
  "ycoordinate": 180,
  "pointedto":   "NEXTNODE"
}
```

### Format JSON d'une action

```json
{
  "actionid":       7,
  "ownernodeid":    "42",
  "action":         "APPROVE",
  "instruction":    "Valider",
  "membernodetitle":"Réalisation",
  "ispositive":     true
}
```

---

## Datasources requis

| Datasource | Objet Maximo | Rôle |
|---|---|---|
| `mainrecord` | `WFPROCESS` | Processus workflow courant |
| `nodes_table` | `WFNODE` | Nœuds du processus |
| `actions_table` | `WFACTION` | Actions/transitions entre nœuds |

---

## API `MaximoWorkflowEditor`

### Méthodes principales

| Méthode | Description |
|---|---|
| `load(fitToContent?)` | Charge les nœuds et actions depuis Maximo et rend le canvas |
| `createNode(type, x, y)` | Crée un nœud à des coordonnées données |
| `createRelationship(source, target, kind)` | Crée une relation entre deux nœuds |
| `selectNode(id)` | Sélectionne un nœud |
| `deleteSelection()` | Supprime les éléments sélectionnés |
| `fitToContent()` | Ajuste le zoom pour afficher tous les nœuds |
| `undo()` / `redo()` | Annule / rétablit la dernière action |
| `setReadOnly(bool)` | Passe en mode lecture seule |
| `getData()` | Retourne l'état courant (nœuds + relations) |
| `destroy()` | Libère les écouteurs et supprime le DOM |

### Événements émis

| Événement | Description |
|---|---|
| `node-selected` | Un nœud vient d'être sélectionné |
| `relationship-selected` | Une relation vient d'être sélectionnée |
| `node-moved` | Un nœud a été déplacé |
| `node-created` | Un nœud a été créé |
| `relationship-created` | Une relation a été créée |
| `selection-cleared` | La sélection a été effacée |

---

## Dépendances

- Aucune bibliothèque externe — SVG natif + JavaScript pur (ES2020+)
- Maximo 7.6.1+ avec le module Workflow configuré
