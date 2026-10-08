/*
 * ============================================================
 * MAXIMO - Historique des statuts
 * Timeline horizontale sans librairie externe
 * ============================================================
 */

const sectionId = "status_showhistory";

const mapping = (await this.getComponentsMapping())[sectionId];
const containerId = "#" + mapping[sectionId + "-se"].renderId;

const dataSourceId = "status_ds";


/* ============================================================
 * WORKFLOW NOMINAL
 * ============================================================ */

const NOMINAL_STATUSES = [
    "NOUVEAU",
    "INSTRUIT",
    "CONTROLE",
    "APPROUVE",
    "SOLDE",
    "CLOTURE"
];


/* ============================================================
 * Helpers
 * ============================================================ */

function escapeHtml(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)

        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================================================
 * Date
 * ============================================================ */

function formatDate(value) {

    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {

        return String(value);
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);
}


/* ============================================================
 * Container
 * ============================================================ */

function getContainer() {

    return document.querySelector(containerId);
}


/* ============================================================
 * Message
 * ============================================================ */

function displayMessage(message) {

    const container =
        getContainer();

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="mx-status-history-message">
            ${escapeHtml(message)}
        </div>
    `;
}


/* ============================================================
 * Render
 * ============================================================ */

async function renderStatusHistory() {

    const container =
        getContainer();


    if (!container) {

        console.warn(
            "[STATUS_HISTORY] Container introuvable:",
            containerId
        );

        return;
    }


    /* --------------------------------------------------------
     * Chargement
     * -------------------------------------------------------- */

    container.innerHTML = `
        <div class="mx-status-history-message">
            Chargement de l'historique...
        </div>
    `;


    /* --------------------------------------------------------
     * Récupération des statuts
     * -------------------------------------------------------- */

    let result;


    try {

        result = await this.getData(

            dataSourceId,

            [
                "changedate",
                "status",
                "changeby",
                "memo"
            ],

            undefined,

            {
                changedate: true
            },

            0,

            1000

        );

    } catch (error) {

        console.error(
            "[STATUS_HISTORY] getData error:",
            error
        );

        displayMessage(
            "Impossible de récupérer l'historique des statuts."
        );

        return;
    }


    if (
        !result ||
        result.status !== "ok"
    ) {

        console.warn(
            "[STATUS_HISTORY] Réponse invalide:",
            result
        );

        displayMessage(
            "Aucun historique de statut disponible."
        );

        return;
    }


    let rows =
        result.data || [];


    if (rows.length === 0) {

        displayMessage(
            "Aucun historique de statut."
        );

        return;
    }


    /* --------------------------------------------------------
     * Ordre de l'historique
     *
     * Le getData() retourne actuellement les statuts dans
     * l'ordre inverse de celui souhaité.
     *
     * On conserve donc le comportement du script existant.
     * -------------------------------------------------------- */

    rows = rows.slice().reverse();


    /* --------------------------------------------------------
     * IMPORTANT
     *
     * Le dernier élément correspond au statut courant.
     * -------------------------------------------------------- */

    const currentIndex =
        rows.length - 1;

    const currentRow =
        rows[currentIndex];


    const currentStatus =
        String(
            currentRow.status || ""
        )
        .trim()
        .toUpperCase();


    console.debug(
        "[STATUS_HISTORY] Statut courant:",
        currentStatus
    );


    /* ========================================================
     * AJOUT DES STATUTS FUTURS
     * ======================================================== */

    const nominalIndex =
        NOMINAL_STATUSES.indexOf(
            currentStatus
        );


    /*
     * Si le statut courant fait partie du workflow nominal,
     * on ajoute uniquement les étapes qui suivent.
     *
     * Exemple :
     *
     * CONTROLE
     *
     *   historique :
     *     NOUVEAU
     *     INSTRUIT
     *     CONTROLE
     *
     *   futur :
     *     APPROUVE
     *     SOLDE
     *     CLOTURE
     */

    if (nominalIndex !== -1) {

        for (
            let i = nominalIndex + 1;
            i < NOMINAL_STATUSES.length;
            i++
        ) {

            rows.push({

                changedate: null,

                status:
                    NOMINAL_STATUSES[i],

                changeby: null,

                memo: null,

                isFuture: true
            });
        }
    }


    /* --------------------------------------------------------
     * Construction HTML
     * -------------------------------------------------------- */

    let html = `

        <div class="mx-status-history">

            <div class="mx-status-history-inner">
    `;


    rows.forEach((row, index) => {

        const isFuture =
            row.isFuture === true;


        const isCurrent =
            index === currentIndex;


        const status =
            escapeHtml(
                row.status || ""
            );


        /*
         * IMPORTANT :
         *
         * Le champ du datasource est changedate.
         */

        const date =
            escapeHtml(
                isFuture
                    ? ""
                    : formatDate(row.changedate)
            );


        const changeby =
            escapeHtml(
                isFuture
                    ? ""
                    : (row.changeby || "")
            );


        const memo =
            escapeHtml(
                isFuture
                    ? ""
                    : (row.memo || "")
            );


        /* ----------------------------------------------------
         * Classe CSS
         * ---------------------------------------------------- */

        let stepClass;

        if (isCurrent) {

            stepClass = "current";

        } else if (isFuture) {

            stepClass = "future";

        } else {

            stepClass = "history";
        }


        /* ----------------------------------------------------
         * Symbole
         * ---------------------------------------------------- */

        let symbol;

        if (isCurrent) {

            symbol = "✓";

        } else if (isFuture) {

            symbol = "○";

        } else {

            symbol = "✓";
        }


        /* ----------------------------------------------------
         * Étape
         * ---------------------------------------------------- */

        html += `

            <div
                class="
                    mx-status-step
                    ${stepClass}
                "

                ${
                    memo
                        ? `data-memo="${memo}"`
                        : ""
                }
            >

                <div class="mx-status-date">

                    ${date}

                </div>


                <div class="mx-status-dot">

                    ${symbol}

                </div>


                <div class="mx-status-label">

                    ${status}

                </div>


                ${
                    changeby
                    ? `
                        <div class="mx-status-user">

                            ${changeby}

                        </div>
                    `
                    : ""
                }

            </div>

        `;


        /* ----------------------------------------------------
         * Connecteur
         * ---------------------------------------------------- */

        if (index < rows.length - 1) {

            /*
             * Le connecteur est "current" lorsqu'il arrive
             * sur le statut courant.
             */

            const connectorCurrent =
                index === currentIndex - 1;


            /*
             * Le connecteur devient futur dès qu'il part
             * du statut courant vers une étape future.
             */

            const connectorFuture =
                index >= currentIndex;


            let connectorClass = "";


            if (connectorCurrent) {

                connectorClass = "current";

            } else if (connectorFuture) {

                connectorClass = "future";
            }


            html += `

                <div
                    class="
                        mx-status-connector
                        ${connectorClass}
                    "
                ></div>

            `;
        }

    });


    html += `

            </div>

        </div>

    `;


    container.innerHTML = html;


    /* ========================================================
     * TOOLTIP MEMO
     * ======================================================== */

    const steps =
        container.querySelectorAll(
            ".mx-status-step"
        );


    rows.forEach((row, index) => {

        if (
            row.isFuture === true ||
            !row.memo
        ) {
            return;
        }


        const step =
            steps[index];


        if (step) {

            step.title =
                String(row.memo);
        }

    });


    /* ========================================================
     * Scroll automatique vers le statut courant
     * ======================================================== */

    const currentStep =
        container.querySelector(
            ".mx-status-step.current"
        );


    if (currentStep) {

        currentStep.scrollIntoView({

            behavior: "smooth",

            block: "nearest",

            inline: "center"
        });
    }

}

renderStatusHistory.call(this);

/* ============================================================
 * MAXIMO LIFECYCLE
 * ============================================================ */

this.registerNotificationCallBack(
    async (event) => {

        console.debug(
            "[STATUS_HISTORY] event:",
            event
        );


        if (
            event === "render" ||
            event === "update" ||
            event === "refresh"
        ) {

            /*
             * Laisse Maximo terminer la construction du DOM.
             */

            await new Promise(
                resolve =>
                    setTimeout(resolve, 0)
            );


            await renderStatusHistory.call(this);

        }

    }
);