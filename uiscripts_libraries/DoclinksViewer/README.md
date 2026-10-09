# DoclinksViewer

Composant Maximo UI Script qui affiche un onglet **Documentation** dans une application Maximo. Il combine un arbre hiérarchique Dojo (documents reliés à un OT, un équipement, un emplacement, etc.) et un panneau de prévisualisation en ligne du document sélectionné via une iframe sécurisée.

---

## Fonctionnalités

- Arbre de navigation hiérarchique des doclinks (OT, actif, emplacement, PM, SR, permis de travail)
- Prévisualisation instantanée du document sélectionné dans un panneau latéral (iframe)
- Chiffrement de l'URL du fichier via `JCEncryptUtil` + salt de session (servlet `secureprovider`)
- Rafraîchissement automatique à chaque événement `update` ou `refresh` du ScriptControl

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `doclinks_preview.js` | Script UI — crée l'iframe et gère le rafraîchissement de la prévisualisation |
| `DATABEAN.EXT_DOCUMENTATION_S1.jython` | Script Jython côté serveur — initialise le DrillDown bean et expose l'événement `encodeFile` |

---

## Intégration XML (présentation Maximo)

Coller le fragment suivant dans la présentation XML de votre application (onglet `Documentation`) :

```xml
<tab id="ext_documentation" label="Documentation" tabbodycss="tabBodyTableStretch">
    <section beanclass="psdi.webclient.beans.common.AssetLocDojoTreeBean"
             id="ext_documentation_s1" relationship="EXTDRILLDOWN">
        <sectionrow id="ext_documentation_s1_r1">
            <sectioncol id="ext_documentation_s1_c1" width="50%">
                <dojotree datasrc="ext_documentation_s1" height="310"
                          id="ext_documentation_s1_dt1" loadmorelabel="Charger plus (%1)">
                    <!-- nœuds WORKORDER, ASSET, LOCATION, PM, SR, PLUSPERMIT ... -->
                </dojotree>
            </sectioncol>
            <sectioncol id="ext_documentation_s1_c2" width="50%">
                <section id="ext_documentation_s1_c2_s1" inputmode="readonly"
                         parentdatasrc="ext_documentation_s1" relationship="EXT_DOCLINK">
                    <multiparttextbox dataattribute="document" .../>
                    <!-- champs document, description, version, type -->
                </section>
            </sectioncol>
        </sectionrow>
    </section>
    <script datasrc="ext_documentation_s1_c2_s1"
            id="ext_documentation_s2_preview_js" scriptnum="DOCLINKS_PREVIEW"/>
    <section id="ext_documentation_s2_preview"/>
</tab>
```

---

## Configuration du script Jython

Le script `DATABEAN.EXT_DOCUMENTATION_S1.jython` doit être enregistré dans Maximo avec les paramètres suivants :

| Paramètre | Valeur |
|---|---|
| `AUTOSCRIPT.INTERFACE` | `YES` |
| Binding `beanapp` (LITTERAL) | nom de l'application cible (ex. `ACTIVITY`) |
| Binding `beanid` (LITTERAL) | `ext_documentation_s1` |

### Événements exposés

| Fonction | Description |
|---|---|
| `initialize(ctx)` | Initialisé automatiquement par le databean ; lie le MBO courant au DrillDown |
| `encodeFile(ctx)` | Chiffre l'URL d'un fichier pour la servlet `secureprovider` et retourne `{ "url": "..." }` |

---

## Dépendances Maximo

- Relation `EXTDRILLDOWN` configurée sur l'objet principal
- Relation `EXT_DOCLINKS` sur les objets ASSET, LOCATION, WORKORDER, SR, PM, PLUSPERMIT
- Relation `EXT_DOCLINK` (singulier) pour afficher les détails d'un document sélectionné
- Servlet `/maximo/servlet/secureprovider` accessible
