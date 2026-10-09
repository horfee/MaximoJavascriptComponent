/**
 * Composant Fil d'Ariane pour Maximo
 * Permet l'affichage dynamique basé sur un ID de section spécifique.
 *
 * Adapté pour l'intégration avec le ScriptControl de Maximo.
 * Société : CAPGemini
 * Auteur: Alexandre Vigier
 * Poste : Architecte Solution Maximo
 */

// Configuration et logique de rendu, encapsulées pour la clarté.
// Renommé en WoStatusRenderer pour éviter les conflits et mieux refléter son rôle.
const WoStatusRenderer = {
    // Configuration
    config: {
        sectionId: 'wo-breadcrumb-section', // ID de l'élément HTML où le fil d'Ariane sera injecté
        statusOrder: ['WSCH', 'WAPPR', 'APPR', 'INPRG', 'COMP', 'CLOSE'],
        labels: {
            'WSCH': 'Planifié',
            'WAPPR': 'En Attente Appr.',
            'APPR': 'Approuvé',
            'INPRG': 'En cours',
            'COMP': 'Complété',
            'CLOSE': 'Fermé'
        }
    },

    // Extracteur robuste du statut depuis les différentes formes renvoyées
    // par this.getData(). On privilégie data.data[ currentRow || 0 ].STATUS
    extractCurrentStatus: function(data) {
        if (!data) return null;

        const getStatusFromRecord = (r) => {
            if (!r) return null;
            return r.STATUS || r.status || r.Status || null;
        };

        // 1) Si la réponse est un tableau direct
        if (Array.isArray(data) && data.length > 0) {
            const s = getStatusFromRecord(data[0]);
            return s ? String(s).toUpperCase() : null;
        }

        // 2) Wrapper commun { data: [...], status: 'ok', currentRow: 0 }
        if (data && Array.isArray(data.data) && data.data.length > 0) {
            const idx = (typeof data.currentRow === 'number' && data.currentRow >= 0 && data.currentRow < data.data.length) ? data.currentRow : 0;
            const s = getStatusFromRecord(data.data[idx]);
            if (s) return String(s).toUpperCase();
        }

        // 3) Statut direct sur l'objet (n'acceptez que si ça ressemble à un statut connu)
        if (data && (data.STATUS || data.status || data.Status)) {
            const raw = String(data.STATUS || data.status || data.Status);
            const up = raw.toUpperCase();
            if (this.config && Array.isArray(this.config.statusOrder) && this.config.statusOrder.indexOf(up) !== -1) return up;
        }

        // 4) Autres structures connues
        if (data && Array.isArray(data.records) && data.records.length > 0) {
            const s = getStatusFromRecord(data.records[0]);
            return s ? String(s).toUpperCase() : null;
        }

        return null;
    },

    /**
     * Initialise et affiche le fil d'Ariane
     * @param {string} currentStatus - Le statut actuel de l'intervention (ex: 'APPR')
     */
    render: function(currentStatus, dynamicRenderId) {
        const targetElementId = dynamicRenderId || this.config.sectionId;

        // Ensure styles are added once
        this._ensureStyles();

        let container = document.getElementById(targetElementId);

        // If container not found, create it at the end of body so the control is visible
        if (!container) {
            console.warn(`WoStatusBreadcrumb: conteneur '${targetElementId}' introuvable. Création d'un conteneur dynamique.`);
            container = document.createElement('div');
            container.id = targetElementId;
            // try to append near known maximo container, otherwise to body
            const main = document.querySelector('#mcs') || document.body;
            main.appendChild(container);
        }

        // Ensure the container has a known class so CSS can target it even when renderId differs
        try {
            container.classList.add('wo-breadcrumb-container');
        } catch (e) {}

        const currentIndex = this.config.statusOrder.indexOf(currentStatus);

        // Debug logs for troubleshooting visual state
        try {
            console.log('WoStatusBreadcrumb.render: currentStatus=', currentStatus, 'resolvedRenderId=', targetElementId, 'statusOrder=', this.config.statusOrder, 'currentIndex=', currentIndex);
            console.log('WoStatusBreadcrumb.render: style tag present=', !!document.getElementById('wo-breadcrumb-styles'));
        } catch (e) {
            // ignore logging errors
        }

        let htmlContent = '<div class="wo-breadcrumb-stepper" role="list" aria-label="Fil d\'Ariane statut WO">';

        this.config.statusOrder.forEach((status, index) => {
            const isCompleted = currentIndex > index;
            const isActive = currentIndex === index;
            const isPending = currentIndex < index;
            const label = this.config.labels[status] || status;

            // Inline styles to force color overriding Maximo CSS if nécessaire
            const iconStyle = (isCompleted || isActive) ? 'style="background:#2196f3;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;margin-bottom:4px"' : 'style="background:#ddd;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;margin-bottom:4px"';
            const lineStyle = isCompleted ? 'style="background:#2196f3;height:2px;flex:1;margin:0 4px"' : 'style="background:#ddd;height:2px;flex:1;margin:0 4px"';

            htmlContent += `\n                <div class="breadcrumb-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}" role="listitem" aria-current="${isActive ? 'step' : 'false'}">\n                    <div class="step-icon" ${iconStyle}>${isCompleted ? '✓' : index + 1}</div>\n                    <div class="step-label">${label}</div>\n                </div>`;

            if (index < this.config.statusOrder.length - 1) {
                htmlContent += `\n                <div class="breadcrumb-line ${isCompleted ? 'completed' : ''}" ${lineStyle} aria-hidden="true"></div>`;
            }
        });

        htmlContent += '</div>';
        container.innerHTML = htmlContent;

        // Log rendered HTML length to help debugging if styles not applied
        try {
            console.log('WoStatusBreadcrumb.render: rendered html length=', htmlContent.length);
            // Also log classes present on each step for quick verification
            Array.from(container.querySelectorAll('.breadcrumb-step')).forEach((el, i) => {
                console.log(`WoStatusBreadcrumb.render: step[${i}] classes=`, el.className, 'inner=', el.innerText && el.innerText.trim());
            });
        } catch (e) {}
    },

    // Minimal CSS injected to ensure visibility inside Maximo UI
    _ensureStyles: function() {
        if (document.getElementById('wo-breadcrumb-styles')) return;
        const css = `
            .wo-breadcrumb-stepper{display:flex;align-items:center;font-family:Arial,Helvetica,sans-serif}
            .breadcrumb-step{display:flex;flex-direction:column;align-items:center;padding:6px 8px;text-align:center}
            .breadcrumb-step .step-icon{width:28px;height:28px;border-radius:50%;background:#ddd;display:flex;align-items:center;justify-content:center;margin-bottom:4px}
            /* Utiliser une couleur bleue pour l'avancement (actif + complétés) */
            .breadcrumb-step.completed .step-icon{background:#2196f3;color:#fff !important}
            .breadcrumb-step.active .step-icon{background:#2196f3;color:#fff !important}
            .breadcrumb-step .step-label{font-size:12px;color:#333}
            .breadcrumb-line{height:2px;flex:1;background:#ddd;margin:0 4px}
            .breadcrumb-line.completed{background:#2196f3 !important}
            /* augmenter la priorité pour tenter d'override les styles Maximo: ciblage via la classe du conteneur */
            .wo-breadcrumb-container .breadcrumb-step .step-icon { background: #ddd !important; }
            .wo-breadcrumb-container .breadcrumb-step.completed .step-icon{background:#2196f3 !important}
            .wo-breadcrumb-container .breadcrumb-step.active .step-icon{background:#2196f3 !important}
            .wo-breadcrumb-container .breadcrumb-line.completed{background:#2196f3 !important}
        `;
        const style = document.createElement('style');
        style.id = 'wo-breadcrumb-styles';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }
};

/**
 * Résolution du renderId à partir du mapping des composants.
 * Gère plusieurs formats observés dans Maximo :
 * - mapping[key][`${key}-se`].renderId
 * - mapping[key] = { something: { renderId: '...' } }
 * - mapping[key] = 'someId'
 */
WoStatusRenderer.resolveRenderIdFromMapping = function(mapping, sectionKey) {
    if (!mapping || !sectionKey) return undefined;

    // cas simple : mapping contient la clé directement
    const entry = mapping[sectionKey];
    if (entry !== undefined) {
        // si c'est une string, on suppose que c'est l'id rendu
        if (typeof entry === 'string') return entry;
        // si c'est un objet, check common patterns
        if (entry[`${sectionKey}-se`] && entry[`${sectionKey}-se`].renderId) return entry[`${sectionKey}-se`].renderId;
        if (entry.renderId) return entry.renderId;
        // sinon, rechercher dans les propriétés imbriquées
        for (const k in entry) {
            const val = entry[k];
            if (val && typeof val === 'object' && val.renderId) return val.renderId;
        }
    }

    // sinon, parcourir toutes les entrées pour trouver un renderId valide
    for (const key in mapping) {
        const val = mapping[key];
        if (!val) continue;
        if (typeof val === 'string') return val;
        if (val.renderId) return val.renderId;
        for (const sub in val) {
            const v2 = val[sub];
            if (v2 && typeof v2 === 'object' && v2.renderId) return v2.renderId;
        }
    }

    return undefined;
};

// Helper pour extraire proprement le statut depuis les différentes formes
// que peut retourner this.getData().
WoStatusRenderer.parseStatus = function(data) {
    // Délégation vers la méthode plus récente et robuste extractCurrentStatus
    try {
        if (typeof WoStatusRenderer.extractCurrentStatus === 'function') {
            return WoStatusRenderer.extractCurrentStatus(data);
        }
    } catch (e) {
        console.error('WoStatusBreadcrumb: parseStatus delegation failed', e);
    }

    // Fallback minimal: tenter de retrouver une propriété STATUS en dernier recours
    if (!data) return null;
    if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        for (const k in first) {
            if (k.toUpperCase() === 'STATUS') return first[k];
        }
    }
    if (data && typeof data === 'object') {
        if (data.STATUS) return data.STATUS;
        for (const key in data) {
            if (key.toUpperCase() === 'STATUS') return data[key];
            const val = data[key];
            if (val && typeof val === 'object') {
                for (const k in val) {
                    if (k.toUpperCase() === 'STATUS') return val[k];
                }
            }
        }
    }
    return null;
};

// Point d'entrée principal pour le ScriptControl Maximo
// 'this' fait référence au contexte du ScriptControl.
if (typeof this.registerNotificationCallBack === 'function') {
    // resolved renderId cached across invocations to avoid repeated mapping lookups
    let _resolvedRenderId = null;

    this.registerNotificationCallBack(async (ev) => {
        // Dump complet de l'événement pour diagnostiquer les formes inattendues
        console.log('WoStatusBreadcrumb: Événement reçu (objet) :', ev);

        // Normalisation robuste du type d'événement :
        // - certains environnements envoient une string simple (ex: 'render')
        // - d'autres envoient un objet avec des propriétés type / eventType / event / action / eventName
        let evType;
        if (typeof ev === 'string') {
            evType = ev;
        } else if (ev && typeof ev === 'object') {
            evType = ev.type || ev.eventType || ev.event || ev.action || ev.eventName || ev.name;
        } else if (ev != null) {
            // cas où ev est un primitif non string (nombre, bool...), on cast en string
            evType = String(ev);
        }
        evType = evType ? String(evType) : undefined;
        console.log(`WoStatusBreadcrumb: Événement reçu - type normalisé: ${evType}`);

        // Nous nous intéressons aux événements qui indiquent un besoin de rafraîchissement de l'UI ou de mise à jour des données.
        // 'render', 'refresh', 'update' sont les plus pertinents pour déclencher un rendu.
        if (evType === 'render' || evType === 'refresh' || evType === 'update') {
            try {
                // Récupérer le statut de l'intervention à partir de la source de données principale.
                // Hypothèse : Le statut est dans la source de données 'MAINRECORD' sous l'attribut 'STATUS'.
                // Si la source de données ou l'attribut est différent, cela devra être ajusté.
                const data = await this.getData('MAINRECORD', ['STATUS']);
                console.log('WoStatusBreadcrumb: Données récupérées de MAINRECORD :', data);

                const currentStatus = WoStatusRenderer.parseStatus(data);
                if (currentStatus) {
                    console.log(`WoStatusBreadcrumb: Statut actuel récupéré : ${currentStatus}`);
                    // vérification supplémentaire : est-ce que le statut figure dans statusOrder ?
                    const idx = WoStatusRenderer.config.statusOrder.indexOf(currentStatus);
                    console.log('WoStatusBreadcrumb: statusOrder contains currentStatus? index=', idx);
                    if (idx === -1) {
                        console.warn('WoStatusBreadcrumb: Statut récupéré non reconnu dans statusOrder. Vérifiez les valeurs attendues. statusOrder=', WoStatusRenderer.config.statusOrder);
                    }
                    // Assurer le rendu : résoudre _resolvedRenderId si nécessaire, puis appeler render
                    try {
                        if (!_resolvedRenderId) {
                            const componentMapping = await this.getComponentsMapping();
                            _resolvedRenderId = WoStatusRenderer.resolveRenderIdFromMapping(componentMapping, WoStatusRenderer.config.sectionId);
                            if (!_resolvedRenderId) {
                                if (componentMapping && typeof componentMapping === 'object') {
                                    const guessKey = Object.keys(componentMapping).find(k => /status|flow|container/i.test(k));
                                    if (guessKey) {
                                        _resolvedRenderId = WoStatusRenderer.resolveRenderIdFromMapping(componentMapping, guessKey);
                                    }
                                }
                            }
                            if (!_resolvedRenderId) {
                                _resolvedRenderId = WoStatusRenderer.config.sectionId;
                            }
                        }
                        WoStatusRenderer.render(currentStatus, _resolvedRenderId);
                    } catch (e) {
                        console.error('WoStatusBreadcrumb: Erreur lors de la résolution du mapping ou du rendu :', e);
                    }
                } else {
                    console.warn('WoStatusBreadcrumb: Impossible d\'extraire un statut depuis les données MAINRECORD. Data dump ci-dessus.');
                    // Resolve the runtime renderId from the component mapping (once)
                    try {
                        if (!_resolvedRenderId) {
                            const componentMapping = await this.getComponentsMapping();
                            _resolvedRenderId = WoStatusRenderer.resolveRenderIdFromMapping(componentMapping, WoStatusRenderer.config.sectionId);
                            if (!_resolvedRenderId) {
                                // fallback: attempt to heuristically find a mapping key containing 'status'
                                if (componentMapping && typeof componentMapping === 'object') {
                                    const guessKey = Object.keys(componentMapping).find(k => /status|flow|container/i.test(k));
                                    if (guessKey) {
                                        _resolvedRenderId = WoStatusRenderer.resolveRenderIdFromMapping(componentMapping, guessKey);
                                    }
                                }
                            }
                            if (!_resolvedRenderId) {
                                console.warn("WoStatusBreadcrumb: Unable to find target section in component mapping. Falling back to configured sectionId and creating a container if needed.");
                                _resolvedRenderId = WoStatusRenderer.config.sectionId;
                            }
                        }
                        // Render inside the resolved canvas element (WoStatusRenderer.render créera le conteneur si besoin)
                        WoStatusRenderer.render(currentStatus, _resolvedRenderId);
                    } catch (e) {
                        console.error('WoStatusBreadcrumb: Erreur lors de la résolution du mapping ou du rendu :', e);
                    }
                    console.warn("WoStatusBreadcrumb: Impossible de déterminer le statut depuis 'MAINRECORD'. Data retournée:", data);
                }
            } catch (error) {
                console.error("WoStatusBreadcrumb: Erreur lors de la récupération des données :", error);
            }
        }
    });
} else {
    console.error("WoStatusBreadcrumb: 'this.registerNotificationCallBack' n'est pas disponible. Le script n'est peut-être pas exécuté dans un ScriptControl Maximo.");
}