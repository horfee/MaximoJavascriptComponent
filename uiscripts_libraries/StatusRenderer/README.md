# StatusRenderer

Composant Maximo UI Script qui affiche un **fil d'Ariane horizontal** (stepper) du statut courant d'un enregistrement Maximo (OT, ticket, etc.). Chaque étape du workflow nominal est représentée visuellement : les étapes passées sont cochées, l'étape courante est mise en évidence en bleu, et les étapes futures sont grisées.

---

## Fonctionnalités

- Stepper horizontal sans dépendance externe (HTML/CSS injecté dynamiquement)
- **Étapes passées** : cercle bleu avec coche (✓)
- **Étape courante** : cercle bleu avec numéro, `aria-current="step"`
- **Étapes futures** : cercle gris avec numéro
- Lignes de connexion colorées entre les étapes (bleu si franchie, gris sinon)
- Résolution robuste du `renderId` Maximo via `getComponentsMapping()` avec plusieurs stratégies de fallback
- Extraction du statut tolérante aux différentes formes retournées par `getData()` : tableau direct, wrapper `{ data, status, currentRow }`, propriété directe, tableau `records`
- Création automatique d'un conteneur DOM si la section Maximo cible est introuvable
- Rafraîchissement automatique sur les événements `render`, `refresh` et `update` du ScriptControl
- CSS injecté une seule fois dans `<head>` (`id="wo-breadcrumb-styles"`) pour éviter les doublons
- Styles inline en secours pour forcer la priorité sur les CSS Maximo

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `StatusRenderer.js` | Composant complet — objet `WoStatusRenderer` + point d'entrée ScriptControl |

> Aucun fichier CSS séparé : les styles sont injectés dynamiquement par `_ensureStyles()`.

---

## Intégration XML (présentation Maximo)

Ajouter dans la présentation XML de l'application (ici un onglet OT) :

```xml
<tab id="main" label="Work Order" type="insert">
    <script datasrc="MAINRECORD" id="wo_status_renderer_script" scriptnum="WO_FIL_ARIANE"/>
    <section border="true" id="headerA_1">
        <sectionrow id="headerA_2">
            <sectioncol id="headerA_3">
                <section id="headerA_4">
                    <section id="wo-breadcrumb-section">
                        <!-- Le fil d'Ariane sera injecté ici -->
                        <textbox dataattribute="worktype" id="main_grid3_37" lookup="worktype"/>
                    </section>
                </section>
            </sectioncol>
        </sectionrow>
    </section>
</tab>
```

L'ID de section cible (`wo-breadcrumb-section`) doit correspondre à `WoStatusRenderer.config.sectionId`.

---

## Configuration

Toute la configuration est centralisée dans `WoStatusRenderer.config` au début du fichier :

```js
const WoStatusRenderer = {
    config: {
        sectionId:   'wo-breadcrumb-section',          // ID HTML cible
        statusOrder: ['WSCH', 'WAPPR', 'APPR', 'INPRG', 'COMP', 'CLOSE'],
        labels: {
            'WSCH':  'Planifié',
            'WAPPR': 'En Attente Appr.',
            'APPR':  'Approuvé',
            'INPRG': 'En cours',
            'COMP':  'Complété',
            'CLOSE': 'Fermé'
        }
    }
};
```

| Propriété | Description |
|---|---|
| `sectionId` | ID de l'élément `<section>` Maximo où le stepper sera injecté |
| `statusOrder` | Séquence ordonnée des statuts du workflow nominal |
| `labels` | Libellés affichés sous chaque étape (clé = code statut) |

Pour adapter le composant à un autre objet Maximo (ticket SR, permis de travail…), modifier ces trois propriétés ainsi que le nom du datasource `'MAINRECORD'` dans le callback.

---

## API `WoStatusRenderer`

### `render(currentStatus, dynamicRenderId?)`

Génère et injecte le HTML du stepper dans le conteneur cible.

| Paramètre | Type | Description |
|---|---|---|
| `currentStatus` | `string` | Code du statut courant (ex. `'APPR'`) — doit être en majuscules |
| `dynamicRenderId` | `string` | ID DOM résolu par Maximo ; si absent, `config.sectionId` est utilisé |

### `extractCurrentStatus(data)`

Extrait le statut depuis la réponse de `getData()`, en gérant quatre structures différentes :

| Priorité | Format | Exemple |
|---|---|---|
| 1 | Tableau direct | `[{ STATUS: 'APPR' }]` |
| 2 | Wrapper standard (Maximo 7.6.1+) | `{ data: [...], currentRow: 0, status: 'ok' }` |
| 3 | Propriété directe sur l'objet | `{ STATUS: 'APPR' }` |
| 4 | Tableau `records` | `{ records: [{ STATUS: 'APPR' }] }` |

### `parseStatus(data)`

Alias de `extractCurrentStatus` avec fallback supplémentaire par recherche case-insensitive des propriétés.

### `resolveRenderIdFromMapping(mapping, sectionKey)`

Résout le `renderId` Maximo dynamique à partir du mapping retourné par `getComponentsMapping()`.  
Stratégies appliquées dans l'ordre :
1. `mapping[key][`${key}-se`].renderId`
2. `mapping[key].renderId`
3. Recherche récursive dans les propriétés imbriquées
4. Parcours complet du mapping (fallback heuristique)

### `_ensureStyles()`

Injecte les styles CSS dans `<head>` (une seule fois, idempotent).

---

## Comportement du ScriptControl

Le callback `registerNotificationCallBack` réagit aux événements `render`, `refresh` et `update` :

```
render/refresh/update
    └─ getData('MAINRECORD', ['STATUS'])
        ├─ [succès] extractCurrentStatus()
        │       └─ getComponentsMapping() → resolveRenderIdFromMapping()
        │               └─ WoStatusRenderer.render(status, renderId)
        └─ [échec / statut null]
                └─ render avec statut null (conteneur créé dynamiquement si besoin)
```

Le `renderId` résolu est mis en cache (`_resolvedRenderId`) pour éviter un appel `getComponentsMapping()` à chaque événement.

---

## Dépendances

- Aucune bibliothèque externe — JavaScript pur (ES5-compatible, pas d'`async/await` dans le rendu lui-même)
- Maximo 7.6.1+ (API `getData`, `getComponentsMapping`, `registerNotificationCallBack`)
