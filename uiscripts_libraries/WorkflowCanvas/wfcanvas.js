/**
 * Maximo Workflow Editor
 * Requires: maximo-workflow-editor.css
 * Data sources: this.getData("nodes", ...), this.getData("relationships", ...)
 */
(function (global) {
  "use strict";

  const LABELS = {
    "componentRequired": "Le contexte du composant Maximo est obligatoire.",
    "positiveLink": "Lien +",
    "negativeLink": "Lien −",
    "reorganize": "Réorganiser",
    "cancel": "Annuler",
    "reset": "Rétablir",
    "delete": "Supprimer",
    "refresh": "Actualiser",
    "open": "Ouvrir",
    "createPositiveLink": "Créer un lien positif",
    "createNegativeLink": "Créer un lien négatif",
    "startAlreadyPresent": "Le workflow possède déjà un point de départ",
    "loading": "Chargement…",
    "readOnlyMode": "Mode lecture seule",
    "editableMode": "Mode édition"
  };

  const TYPES = [
    "start",
    "task",
    "condition",
    "input",
    "subprocess",
    "wait",
    "interaction",
    "stop"
  ];

  const TYPES_LABELS = {
    "start": "Point de départ",
    "task": "Tâche",
    "condition": "Condition",
    "input": "Saisie utilisateur",
    "subprocess": "Sous-processus",
    "wait": "Attente",
    "interaction": "Interaction",
    "stop": "Stop"
  };

  const NODE_RULES = {
    start       : { maxIncoming:  0, maxPositiveOutgoing: 1,  maxNegativeOutgoing: 0 },
    task        : { maxIncoming: -1, maxPositiveOutgoing: 1,  maxNegativeOutgoing: 1 },
    condition   : { maxIncoming: -1, maxPositiveOutgoing: 1,  maxNegativeOutgoing: 1 },
    input       : { maxIncoming: -1, maxPositiveOutgoing: -1, maxNegativeOutgoing: 0 },
    subprocess  : { maxIncoming: -1, maxPositiveOutgoing: 1,  maxNegativeOutgoing: 1 },
    wait        : { maxIncoming: -1, maxPositiveOutgoing: 1,  maxNegativeOutgoing: 0 },
    interaction : { maxIncoming: -1, maxPositiveOutgoing: 1,  maxNegativeOutgoing: 0 },
    stop        : { maxIncoming: -1, maxPositiveOutgoing: 0,  maxNegativeOutgoing: 0 }
  };

  const COLORS = {
    task: "#75ace0",
    condition: "#f6d354",
    input: "#f4f4f4",
    subprocess: "#a98bc9",
    wait: "#c9b184",
    interaction: "#79c8bc",
    stop: "#ffffff",
    start: "#ffffff"
  };

  const DEFAULTS = {
    mount: null,
    width: "100%",
    height: "720px",
    grid: 20,
    snapToGrid: true,
    readOnly: false,
    autoLoad: true,
    nodeWidth: 132,
    nodeHeight: 64,
    ensureStart: true,
    openElement: null,
    onError: null
  };

  function uid(prefix) {
    return (prefix || "id") +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function asArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload) return [];
    if (Array.isArray(payload.member)) return payload.member;
    if (Array.isArray(payload.members)) return payload.members;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.response && Array.isArray(payload.response.member)) {
      return payload.response.member;
    }
    return [];
  }

  function normalizeNode(raw, index) {
    raw = raw || {};

    const type = String(
      raw.type ||
      raw.nodetype ||
      raw.nodeType ||
      "task"
    ).toLowerCase();

    if (type === "start" || type === "stop") {
      raw.width = 65;
      raw.height = 65;
    }

    if (
      raw.xcoordinate !== undefined &&
      raw.x === undefined
    ) {
      raw.x = (1 + Number(raw.xcoordinate)) * 200;
    }

    if (
      raw.ycoordinate !== undefined &&
      raw.y === undefined
    ) {
      raw.y = Number(raw.ycoordinate) * 150;
    }

    return {
      id: String(
        raw.id ??
        raw.nodeid ??
        raw.wfnodeid ??
        raw.title ??
        uid("node")
      ),

      type:
        TYPES.includes(type) || type === "start"
          ? type
          : "task",

      label:
        raw.label ||
        raw.title ||
        raw.description ||
        raw.name ||
        type.toUpperCase() + " " + (index + 1),

      x: Number(
        raw.x ??
        raw.posx ??
        raw.positionx ??
        80 + (index % 6) * 180
      ),

      y: Number(
        raw.y ??
        raw.posy ??
        raw.positiony ??
        140 + Math.floor(index / 6) * 120
      ),

      width: Number(raw.width || DEFAULTS.nodeWidth),
      height: Number(raw.height || DEFAULTS.nodeHeight),

      raw: raw
    };
  }

  function normalizeRelationship(raw) {
    raw = raw || {};

    const sourceReference =
      raw.ownernodeid ??
      raw.source ??
      raw.from ??
      raw.sourceid ??
      raw.fromnodeid ??
      "";

    const targetReference =
      raw.membernodetitle ??
      raw.target ??
      raw.to ??
      raw.targetid ??
      raw.tonodeid ??
      "";

    const positiveValue = raw.ispositive ?? raw.positive;

    const normalizedPositive =
      String(
        positiveValue == null ? "" : positiveValue
      )
        .trim()
        .toLowerCase();

    let kind = (
      positiveValue === false ||
      positiveValue === 0 ||
      normalizedPositive === "0" ||
      normalizedPositive === "false" ||
      normalizedPositive === "n" ||
      normalizedPositive === "no"
    )
      ? "negative"
      : "positive";

    const explicitKind = String(
      raw.kind ||
      raw.type ||
      raw.relationtype ||
      raw.relationshipType ||
      ""
    ).toLowerCase();

    if (explicitKind.includes("neg")) {
      kind = "negative";
    }

    if (explicitKind.includes("pos")) {
      kind = "positive";
    }

    return {
      id: String(
        raw.actionid ??
        raw.id ??
        raw.relationshipid ??
        raw.wfactionid ??
        raw.action ??
        uid("rel")
      ),

      source: String(sourceReference),
      target: String(targetReference),
      kind: kind,

      label:
        raw.label ||
        raw.instruction ||
        raw.INSTRUCTION ||
        raw.description ||
        "",

      raw: raw
    };
  }

  class MaximoWorkflowEditor {

    constructor(component, options) {
      if (!component) {
        throw new Error(LABELS.componentRequired);
      }

      this.component = component;

      this.options = Object.assign(
        {},
        DEFAULTS,
        options || {}
      );

      this.options.readOnly =
        this.options.readOnly === true;

      this.nodes = [];
      this.relationships = [];

      this.selectedNodeId = null;
      this.selectedRelationshipId = null;

      this.linkMode = null;
      this.dragState = null;
      this.panState = null;

      this.transform = {
        x: 0,
        y: 0,
        scale: 1
      };

      /*
       * Maximo coordinates are not pixels.
       *
       * X coordinate:
       *     1 index = 200 pixels
       *
       * Y coordinate:
       *     1 index = 150 pixels
       */
      this.coordinateScale = {
        x: 200,
        y: 150
      };

      /*
       * Coordinate origin used to translate negative
       * Maximo coordinates into positive SVG coordinates.
       *
       * Example:
       *
       * Maximo X = -3
       * minX     = -3
       * canvas X = (-3 - (-3)) * 200 = 0
       *
       * Therefore:
       *
       * canvas X = (xcoordinate - offset.x) * 200
       * xcoordinate = canvas X / 200 + offset.x
       */
      this.coordinateOffset = {
        x: 0,
        y: 0
      };

      this.undoStack = [];
      this.redoStack = [];

      this.destroyed = false;

      this.getNodes =
        typeof this.options.getNodes === "function"
          ? this.options.getNodes
          : () => this.readData("nodes");

      this.getActions =
        typeof this.options.getActions === "function"
          ? this.options.getActions
          : () => this.readData("relationships");

      this.init();
    }

    init() {
      this.root = this.resolveMount(
        this.options.mount
      );

      this.buildUI();

      if (!this.globalEventsBound) {
        this.bindGlobalEvents();
        this.globalEventsBound = true;
      }

      if (this.options.autoLoad) {
        this.load();
      }
    }

    resolveMount(mount) {
      if (mount instanceof Element) {
        return mount;
      }

      if (
        typeof mount === "string" &&
        document.querySelector(mount)
      ) {
        return document.querySelector(mount);
      }

      if (
        this.component.element instanceof Element
      ) {
        return this.component.element;
      }

      if (
        this.component.root instanceof Element
      ) {
        return this.component.root;
      }

      const fallback =
        document.createElement("div");

      document.body.appendChild(fallback);

      return fallback;
    }

    buildUI() {
      this.root.innerHTML = "";

      this.root.style.width =
        this.options.width;

      this.root.style.height =
        this.options.height;

      this.root.classList.add("mwe");

      const toolbar =
        document.createElement("div");

      toolbar.className = "mwe-toolbar";

      toolbar.innerHTML = `
        <button class="mwe-action" data-action="zoom-reset">1:1</button>
        <button class="mwe-action" data-action="zoom-in">＋</button>
        <button class="mwe-action" data-action="zoom-out">−</button>

        <span class="mwe-sep"></span>

        ${TYPES.map(t => `
          <button
            class="mwe-tool"
            draggable="true"
            data-type="${t}">
            ${this.toolIcon(t)}
            <span>${this.typeLabel(t)}</span>
          </button>
        `).join("")}

        <span class="mwe-sep"></span>

        <button
          class="mwe-action"
          data-action="link-positive">
          ${LABELS.positiveLink}
        </button>

        <button
          class="mwe-action"
          data-action="link-negative">
          ${LABELS.negativeLink}
        </button>

        <button
          class="mwe-action"
          data-action="delete">
          ${LABELS.delete}
        </button>

        <button
          class="mwe-action"
          data-action="refresh">
          ${LABELS.refresh}
        </button>

        <span
          class="mwe-mode-indicator"
          data-role="mode-indicator">
        </span>
      `;

      this.root.appendChild(toolbar);

      const wrap =
        document.createElement("div");

      wrap.className =
        "mwe-canvas-wrap";

      wrap.innerHTML = `
        <svg
          class="mwe-svg"
          role="application">

          <defs>

            <pattern
              id="mwe-grid"
              width="200"
              height="200"
              patternUnits="userSpaceOnUse">

              <path
                d="M200 0H0V200"
                fill="none"
                stroke="#cbd5e1"
                stroke-width="1"/>
            </pattern>

            <pattern
              id="mwe-grid-small"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse">

              <path
                d="M20 0L0 0 0 20"
                fill="none"
                stroke="#dce8f2"/>
            </pattern>

            <marker
              id="mwe-arrow-pos"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto">

              <path
                d="M0 0L10 5 0 10z"
                fill="#174a7e"/>
            </marker>

            <marker
              id="mwe-arrow-neg"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto">

              <path
                d="M0 0L10 5 0 10z"
                fill="#fa4d56"/>
            </marker>

          </defs>

          <rect
            class="mwe-grid"
            width="100%"
            height="100%"
            fill="url(#mwe-grid-small)">
          </rect>

          <g class="mwe-viewport">

            <g class="mwe-edges"></g>

            <g class="mwe-nodes"></g>

            <path
              class="mwe-preview-edge"
              fill="none"
              stroke="#0f62fe"
              stroke-width="2"
              stroke-dasharray="5 4"
              style="display:none">
            </path>

          </g>

        </svg>

        <div class="mwe-status">
          Prêt
        </div>

        <div class="mwe-coordinate-overlay">
          <span class="mwe-coordinate-item">
            X:
            <strong data-coordinate="x">0</strong>
          </span>

          <span class="mwe-coordinate-item">
            Y:
            <strong data-coordinate="y">0</strong>
          </span>
        </div>

        <div class="mwe-menu">

          <button data-menu="positive">
            ${LABELS.createPositiveLink}
          </button>

          <button data-menu="negative">
            ${LABELS.createNegativeLink}
          </button>

          <button data-menu="open">
            ${LABELS.open}
          </button>

          <button data-menu="delete">
            ${LABELS.delete}
          </button>

        </div>

        <div class="mwe-toast"></div>
      `;

      this.root.appendChild(wrap);

      this.toolbar = toolbar;
      this.wrap = wrap;

      this.svg =
        wrap.querySelector(".mwe-svg");

      this.viewport =
        wrap.querySelector(".mwe-viewport");

      this.edgesLayer =
        wrap.querySelector(".mwe-edges");

      this.nodesLayer =
        wrap.querySelector(".mwe-nodes");

      this.previewEdge =
        wrap.querySelector(".mwe-preview-edge");

      this.status =
        wrap.querySelector(".mwe-status");

      this.menu =
        wrap.querySelector(".mwe-menu");

      this.toastEl =
        wrap.querySelector(".mwe-toast");

      this.coordinateOverlay =
        wrap.querySelector(
          ".mwe-coordinate-overlay"
        );

      this.coordinateX =
        wrap.querySelector(
          '[data-coordinate="x"]'
        );

      this.coordinateY =
        wrap.querySelector(
          '[data-coordinate="y"]'
        );

      this.modeIndicator =
        toolbar.querySelector(
          '[data-role="mode-indicator"]'
        );

      this.bindUIEvents();
      this.applyEditorMode();
    }

    toolIcon(type) {
      const fill = COLORS[type];

      const stroke =
        'stroke="#525252" stroke-width="1.2"';

      let shape = `
        <rect
          x="7"
          y="6"
          width="50"
          height="32"
          rx="7"
          fill="${fill}"
          ${stroke}/>

        <path
          d="M17 17h24M17 24h18M17 31h12"
          stroke="#263238"
          stroke-width="1.5"
          stroke-linecap="round"
          opacity=".65"/>
      `;

      if (type === "start") {
        shape = `
          <circle
            cx="32"
            cy="22"
            r="18"
            fill="#e8f7ee"
            ${stroke}/>

          <circle
            cx="32"
            cy="22"
            r="13"
            fill="#42be65"
            opacity=".15"/>

          <path
            d="M28 14l12 8-12 8z"
            fill="#198038"/>
        `;
      }

      if (type === "condition") {
        shape = `
          <polygon
            points="32,5 54,22 32,39 10,22"
            fill="${fill}"
            ${stroke}/>
        `;
      }

      if (type === "input") {
        shape = `
          <polygon
            points="16,5 56,5 48,39 8,39"
            fill="${fill}"
            ${stroke}/>
        `;
      }

      if (type === "subprocess") {
        shape = `
          <rect
            x="8"
            y="6"
            width="48"
            height="32"
            fill="${fill}"
            ${stroke}/>

          <path
            d="M16 6v32M48 6v32"
            ${stroke}/>
        `;
      }

      if (type === "wait") {
        shape = `
          <path
            d="M8 6h31q17 0 17 16T39 38H8z"
            fill="${fill}"
            ${stroke}/>
        `;
      }

      if (type === "interaction") {
        shape = `
          <polygon
            points="8,16 56,5 56,39 8,30"
            fill="${fill}"
            ${stroke}/>
        `;
      }

      if (type === "stop") {
        shape = `
          <circle
            cx="32"
            cy="22"
            r="17"
            fill="#fff"
            ${stroke}/>

          <rect
            x="27"
            y="17"
            width="10"
            height="10"
            fill="#da1e28"/>
        `;
      }

      return `
        <svg
          width="64"
          height="43"
          viewBox="0 0 64 43">

          ${shape}

        </svg>
      `;
    }

    typeLabel(t) {
      return TYPES_LABELS[t] || t;
    }

    bindUIEvents() {

      this.toolbar.addEventListener(
        "click",
        e => {

          const b =
            e.target.closest("button");

          if (!b || b.disabled) {
            return;
          }

          if (b.dataset.type) {
            return this.createNodeAtCenter(
              b.dataset.type
            );
          }

          this.handleAction(
            b.dataset.action
          );
        }
      );

      this.toolbar
        .querySelectorAll(".mwe-tool")
        .forEach(b => {

          b.addEventListener(
            "dragstart",
            e => {

              if (this.options.readOnly) {
                e.preventDefault();
                return;
              }

              e.dataTransfer.setData(
                "application/x-mwe-node",
                b.dataset.type
              );

              e.dataTransfer.effectAllowed =
                "copy";
            }
          );
        });

      this.svg.addEventListener(
        "dragover",
        e => {
          e.preventDefault();
        }
      );

      this.svg.addEventListener(
        "drop",
        e => {

          e.preventDefault();

          const type =
            e.dataTransfer.getData(
              "application/x-mwe-node"
            );

          if (
            !TYPES.includes(type) ||
            this.options.readOnly
          ) {
            return;
          }

          const p =
            this.clientToWorld(
              e.clientX,
              e.clientY
            );

          this.createNode(
            type,
            p.x,
            p.y
          );
        }
      );

      this.svg.addEventListener(
        "pointerdown",
        e => this.onPointerDown(e)
      );

      this.svg.addEventListener(
        "dblclick",
        e => {

          const node =
            e.target.closest(".mwe-node");

          const edge =
            e.target.closest("[data-edge-id]");

          if (node) {

            const selectedNode =
              this.nodes.find(
                n => n.id === node.dataset.id
              );

            this.emit(
              "node.dblclick",
              {
                node: selectedNode
                  ? this.serializeNode(
                      selectedNode
                    )
                  : {
                      id: node.dataset.id
                    }
              }
            );

            this.openNode(
              node.dataset.id
            );

          } else if (edge) {

            const selectedRelationship =
              this.relationships.find(
                r =>
                  r.id === edge.dataset.edgeId
              );

            this.emit(
              "relationship.dblclick",
              {
                relationship:
                  selectedRelationship
                    ? this.serializeRelationship(
                        selectedRelationship
                      )
                    : {
                        id:
                          edge.dataset.edgeId
                      }
              }
            );
          }
        }
      );

      this.svg.addEventListener(
        "contextmenu",
        e => this.onContextMenu(e)
      );

      this.svg.addEventListener(
        "wheel",
        e => this.onWheel(e),
        { passive: false }
      );

      this.svg.addEventListener(
        "click",
        e => {

          const edge =
            e.target.closest("[data-edge-id]");

          const node =
            e.target.closest(".mwe-node");

          if (edge) {

            // Selection is handled by pointerdown.

          } else if (
            !node &&
            !this.linkMode
          ) {

            this.clearSelection();
          }
        }
      );

      this.menu.addEventListener(
        "click",
        e => {

          const action =
            e.target.dataset.menu;

          if (
            !action ||
            e.target.disabled
          ) {
            return;
          }

          this.hideMenu();

          if (
            action === "positive" ||
            action === "negative"
          ) {
            this.beginLink(
              this.selectedNodeId,
              action
            );
          }

          if (action === "open") {
            this.openNode(
              this.selectedNodeId
            );
          }

          if (action === "delete") {
            this.deleteSelection();
          }
        }
      );
    }

    bindGlobalEvents() {

      this.boundMove =
        e => this.onPointerMove(e);

      this.boundUp =
        () => this.onPointerUp();

      this.boundKey =
        e => this.onKeyDown(e);

      document.addEventListener(
        "pointermove",
        this.boundMove
      );

      document.addEventListener(
        "pointerup",
        this.boundUp
      );

      document.addEventListener(
        "keydown",
        this.boundKey
      );
    }

    readData(name) {
      return new Promise(
        (resolve, reject) => {

          let doneAlready = false;

          const done = data => {

            if (!doneAlready) {
              doneAlready = true;
              resolve(data);
            }
          };

          try {

            const result =
              this.component.getData(
                name,
                done
              );

            if (
              result &&
              typeof result.then ===
                "function"
            ) {
              result
                .then(done)
                .catch(reject);

            } else if (
              result !== undefined &&
              result !== null
            ) {
              done(result);
            }

          } catch (err) {
            reject(err);
          }
        }
      );
    }

    async load(fitToContent = true) {

      this.setStatus(
        LABELS.loading
      );

      try {

        const [
          nodesPayload,
          actionsPayload
        ] = await Promise.all([
          this.getNodes(),
          this.getActions()
        ]);

        const rawNodes =
          asArray(nodesPayload);

        /*
         * Determine the Maximo coordinate origin.
         *
         * Negative coordinates are shifted into
         * the positive SVG coordinate system.
         */
        const xCoordinates =
          rawNodes
            .map(n =>
              Number(n.xcoordinate)
            )
            .filter(Number.isFinite);

        const yCoordinates =
          rawNodes
            .map(n =>
              Number(n.ycoordinate)
            )
            .filter(Number.isFinite);

        const minX =
          xCoordinates.length
            ? Math.min(...xCoordinates)
            : 0;

        const minY =
          yCoordinates.length
            ? Math.min(...yCoordinates)
            : 0;

        this.coordinateOffset = {
          x: Math.min(0, minX),
          y: Math.min(0, minY)
        };

        this.nodes =
          rawNodes.map(
            normalizeNode
          );

        this.relationships =
          asArray(actionsPayload)
            .map(
              normalizeRelationship
            )
            .map(
              relationship =>
                this.resolveRelationshipEndpoints(
                  relationship
                )
            )
            .filter(
              relationship =>
                relationship.source &&
                relationship.target
            );

        this.render();

        if (fitToContent) {
          this.fitToContent();
        }

        this.setStatus(
          `${this.nodes.length} élément(s), ` +
          `${this.relationships.length} lien(s)`
        );

        const validation =
          this.validateWorkflow();

        if (!validation.valid) {
          console.warn(
            "Workflow non conforme",
            validation.errors
          );
        }

      } catch (err) {

        this.fail(
          "Impossible de charger le workflow",
          err
        );
      }
    }

    normalizeKey(value) {
      return String(
        value == null ? "" : value
      )
        .trim()
        .toLocaleLowerCase();
    }

    resolveNodeId(reference, mode) {

      const key =
        this.normalizeKey(reference);

      if (!key) {
        return null;
      }

      const node =
        this.nodes.find(candidate => {

          const raw =
            candidate.raw || {};

          const ids = [
            candidate.id,
            raw.id,
            raw.nodeid,
            raw.wfnodeid
          ];

          const titles = [
            candidate.label,
            raw.title,
            raw.name,
            raw.description
          ];

          const values =
            mode === "title"
              ? titles.concat(ids)
              : ids.concat(titles);

          return values.some(
            value =>
              this.normalizeKey(value) ===
              key
          );
        });

      return node
        ? node.id
        : null;
    }

    resolveRelationshipEndpoints(
      relationship
    ) {

      const raw =
        relationship.raw || {};

      const sourceReference =
        raw.ownernodeid ??
        relationship.source;

      const targetReference =
        raw.membernodetitle ??
        relationship.target;

      const source =
        this.resolveNodeId(
          sourceReference,
          "id"
        );

      const target =
        this.resolveNodeId(
          targetReference,
          "title"
        );

      if (!source || !target) {

        console.warn(
          "Relation Maximo ignorée : source ou cible introuvable",
          {
            action: raw,
            sourceReference,
            targetReference,
            resolvedSource: source,
            resolvedTarget: target
          }
        );
      }

      return Object.assign(
        {},
        relationship,
        {
          source,
          target
        }
      );
    }

    relationshipCounts(nodeId) {

      return {
        incoming:
          this.relationships.filter(
            r => r.target === nodeId
          ).length,

        positive:
          this.relationships.filter(
            r =>
              r.source === nodeId &&
              r.kind === "positive"
          ).length,

        negative:
          this.relationships.filter(
            r =>
              r.source === nodeId &&
              r.kind === "negative"
          ).length
      };
    }

    relationshipConstraint(
      sourceNode,
      targetNode,
      kind
    ) {

      if (!sourceNode || !targetNode) {
        return "Source ou cible introuvable";
      }

      if (
        sourceNode.id ===
        targetNode.id
      ) {
        return "Un noeud ne peut pas être relié à lui-même";
      }

      const sourceRule =
        NODE_RULES[sourceNode.type] ||
        NODE_RULES.task;

      const targetRule =
        NODE_RULES[targetNode.type] ||
        NODE_RULES.task;

      const sourceCounts =
        this.relationshipCounts(
          sourceNode.id
        );

      const targetCounts =
        this.relationshipCounts(
          targetNode.id
        );

      if (
        targetRule.maxIncoming === 0
      ) {
        return `${this.typeLabel(
          targetNode.type
        )} ne peut pas avoir de lien entrant`;
      }

      if (
        targetRule.maxIncoming > -1 &&
        targetCounts.incoming >=
          targetRule.maxIncoming
      ) {
        return `Le nombre maximal de liens entrants est atteint pour ${this.typeLabel(
          targetNode.type
        )}`;
      }

      if (
        kind === "negative" &&
        sourceRule.maxNegativeOutgoing === 0
      ) {
        return `${this.typeLabel(
          sourceNode.type
        )} ne peut pas avoir de lien négatif sortant`;
      }

      if (
        kind === "positive" &&
        sourceRule.maxPositiveOutgoing === 0
      ) {
        return `${this.typeLabel(
          sourceNode.type
        )} ne peut pas avoir de lien positif sortant`;
      }

      if (
        kind === "negative" &&
        sourceRule.maxNegativeOutgoing > -1 &&
        sourceCounts.negative >=
          sourceRule.maxNegativeOutgoing
      ) {
        return `${this.typeLabel(
          sourceNode.type
        )} a déjà son nombre maximal de liens négatifs sortants`;
      }

      if (
        kind === "positive" &&
        sourceRule.maxPositiveOutgoing > -1 &&
        sourceCounts.positive >=
          sourceRule.maxPositiveOutgoing
      ) {
        return `${this.typeLabel(
          sourceNode.type
        )} a déjà son nombre maximal de liens positifs sortants`;
      }

      return null;
    }

    canBeginLink(node, kind) {

      if (
        !node ||
        this.options.readOnly
      ) {
        return false;
      }

      const rule =
        NODE_RULES[node.type] ||
        NODE_RULES.task;

      const counts =
        this.relationshipCounts(
          node.id
        );

      return kind === "negative"
        ? rule.maxNegativeOutgoing !== 0 &&
          (
            rule.maxNegativeOutgoing < 0 ||
            counts.negative <
              rule.maxNegativeOutgoing
          )
        : rule.maxPositiveOutgoing !== 0 &&
          (
            rule.maxPositiveOutgoing < 0 ||
            counts.positive <
              rule.maxPositiveOutgoing
          );
    }

    validateWorkflow() {

      const errors = [];

      const starts =
        this.nodes.filter(
          n => n.type === "start"
        );

      if (starts.length !== 1) {
        errors.push(
          "Le workflow doit contenir exactement un point de départ"
        );
      }

      this.nodes.forEach(node => {

        const rule =
          NODE_RULES[node.type] ||
          NODE_RULES.task;

        const counts =
          this.relationshipCounts(
            node.id
          );

        if (
          rule.maxIncoming > -1 &&
          counts.incoming >
            rule.maxIncoming
        ) {
          errors.push(
            `${node.label} dépasse le nombre de liens entrants autorisé`
          );
        }

        if (
          rule.maxPositiveOutgoing > -1 &&
          counts.positive >
            rule.maxPositiveOutgoing
        ) {
          errors.push(
            `${node.label} dépasse le nombre de liens positifs sortants autorisé`
          );
        }

        if (
          rule.maxNegativeOutgoing > -1 &&
          counts.negative >
            rule.maxNegativeOutgoing
        ) {
          errors.push(
            `${node.label} dépasse le nombre de liens négatifs sortants autorisé`
          );
        }
      });

      return {
        valid: errors.length === 0,
        errors,
        message:
          errors[0] ||
          "Workflow valide"
      };
    }

    addEventListener(
      name,
      callback
    ) {

      this.root.addEventListener(
        name,
        e => {

          if (
            typeof callback ===
            "function"
          ) {
            callback(
              e.detail || {}
            );
          }
        }
      );
    }

    removeEventListener(
      name,
      callback
    ) {

      this.root.removeEventListener(
        name,
        e => {

          if (
            typeof callback ===
            "function"
          ) {
            callback(
              e.detail || {}
            );
          }
        }
      );
    }

    emit(name, payload) {

      this.root.dispatchEvent(
        new CustomEvent(
          name,
          {
            detail:
              payload || {},
            bubbles: true,
            cancelable: true
          }
        )
      );
    }

    shapeMarkup(n) {

      const w = n.width;
      const h = n.height;

      const fill =
        COLORS[n.type] ||
        COLORS.task;

      const stroke = "#525252";

      if (n.type === "condition") {
        return `
          <polygon
            class="mwe-shape"
            points="
              ${w / 2},2
              ${w - 2},${h / 2}
              ${w / 2},${h - 2}
              2,${h / 2}
            "
            fill="${fill}"
            stroke="${stroke}"/>

          <circle
            cx="${w / 2}"
            cy="${h / 2}"
            r="9"
            fill="#fff"
            opacity=".32"/>

          <path
            d="
              M${w / 2} ${h / 2 - 5}
              v7
              M${w / 2} ${h / 2 + 7}
              v1"
            stroke="#6f5900"
            stroke-width="2.2"
            stroke-linecap="round"/>
        `;
      }

      if (n.type === "input") {
        return `
          <path
            class="mwe-shape"
            d="
              M16 2
              H${w - 2}
              L${w - 16} ${h - 2}
              H2Z"
            fill="${fill}"
            stroke="${stroke}"/>

          <path
            d="
              M30 ${h / 2}
              h${w - 58}
              M${w - 36} ${h / 2 - 6}
              l7 6
              -7 6"
            fill="none"
            stroke="#525252"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"/>
        `;
      }

      if (n.type === "subprocess") {
        return `
          <rect
            class="mwe-shape"
            x="1"
            y="1"
            width="${w - 2}"
            height="${h - 2}"
            rx="9"
            fill="${fill}"
            stroke="${stroke}"/>

          <path
            d="
              M14 2v${h - 4}
              M${w - 14} 2v${h - 4}"
            stroke="#765997"
            opacity=".8"/>

          <rect
            x="${w / 2 - 10}"
            y="${h / 2 - 10}"
            width="20"
            height="20"
            rx="5"
            fill="#fff"
            opacity=".25"/>

          <path
            d="
              M${w / 2 - 5} ${h / 2}h10
              M${w / 2} ${h / 2 - 5}v10"
            stroke="#fff"
            stroke-width="2"
            stroke-linecap="round"/>
        `;
      }

      if (n.type === "wait") {
        return `
          <rect
            class="mwe-shape"
            x="1"
            y="1"
            width="${w - 2}"
            height="${h - 2}"
            rx="${h / 2}"
            fill="${fill}"
            stroke="${stroke}"/>

          <circle
            cx="${w / 2}"
            cy="${h / 2}"
            r="13"
            fill="#fff"
            opacity=".35"/>

          <path
            d="
              M${w / 2} ${h / 2 - 8}
              v9
              l6 4"
            fill="none"
            stroke="#604f2d"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"/>
        `;
      }

      if (n.type === "interaction") {
        return `
          <path
            class="mwe-shape"
            d="
              M2 16
              L${w - 2} 2
              v${h - 4}
              L2 ${h - 16}Z"
            fill="${fill}"
            stroke="${stroke}"/>

          <path
            d="
              M${w / 2 - 12} ${h / 2 - 7}
              h24
              v14
              h-24z

              M${w / 2 - 12} ${h / 2 - 7}
              l12 9
              12-9"
            fill="none"
            stroke="#185f56"
            stroke-width="1.8"
            stroke-linejoin="round"/>
        `;
      }

      if (n.type === "stop") {
        return `
          <circle
            class="mwe-shape"
            cx="${w / 2}"
            cy="${h / 2}"
            r="${Math.min(w, h) / 2 - 3}"
            fill="#fff1f1"
            stroke="#da1e28"/>

          <circle
            cx="${w / 2}"
            cy="${h / 2}"
            r="15"
            fill="#da1e28"
            opacity=".12"/>

          <rect
            x="${w / 2 - 7}"
            y="${h / 2 - 7}"
            width="14"
            height="14"
            rx="3"
            fill="#da1e28"/>
        `;
      }

      if (n.type === "start") {
        return `
          <circle
            class="mwe-shape"
            cx="${w / 2}"
            cy="${h / 2}"
            r="${Math.min(w, h) / 2 - 3}"
            fill="#e8f7ee"
            stroke="#198038"/>

          <circle
            cx="${w / 2}"
            cy="${h / 2}"
            r="15"
            fill="#42be65"
            opacity=".15"/>

          <polygon
            points="
              ${w / 2 - 7},${h / 2 - 11}
              ${w / 2 + 12},${h / 2}
              ${w / 2 - 7},${h / 2 + 11}"
            fill="#198038"/>
        `;
      }

      return `
        <rect
          class="mwe-shape"
          x="1"
          y="1"
          width="${w - 2}"
          height="${h - 2}"
          rx="9"
          fill="${fill}"
          stroke="${stroke}"/>

        <rect
          x="14"
          y="15"
          width="30"
          height="5"
          rx="2.5"
          fill="#0f3b66"
          opacity=".34"/>

        <rect
          x="14"
          y="27"
          width="${w - 28}"
          height="4"
          rx="2"
          fill="#0f3b66"
          opacity=".22"/>

        <rect
          x="14"
          y="37"
          width="${Math.max(
            30,
            w - 54
          )}"
          height="4"
          rx="2"
          fill="#0f3b66"
          opacity=".18"/>
      `;
    }

    nodeMarkup(n) {

      const labelY =
        n.height + 18;

      const rule =
        NODE_RULES[n.type] ||
        NODE_RULES.task;

      return `
        <g
          class="mwe-node${
            this.selectedNodeId === n.id
              ? " selected"
              : ""
          }"
          data-id="${escapeHtml(n.id)}"
          transform="
            translate(${n.x} ${n.y})">

          ${this.shapeMarkup(n)}

          ${
            rule.maxIncoming !== 0
              ? `
                <circle
                  class="mwe-port"
                  cx="0"
                  cy="${n.height / 2}"
                  r="4"/>
              `
              : ""
          }

          ${
            rule.maxPositiveOutgoing !== 0 ||
            rule.maxNegativeOutgoing !== 0
              ? `
                <circle
                  class="mwe-port"
                  cx="${n.width}"
                  cy="${n.height / 2}"
                  r="4"/>
              `
              : ""
          }

          <text
            x="${n.width / 2}"
            y="${labelY}"
            text-anchor="middle">
            ${escapeHtml(n.label)}
          </text>

        </g>
      `;
    }

    edgePath(s, t) {

      const sx =
        s.x + s.width;

      const sy =
        s.y + s.height / 2;

      const tx =
        t.x;

      const ty =
        t.y + t.height / 2;

      const gap =
        Math.max(
          36,
          Math.abs(tx - sx) / 2
        );

      const d =
        tx >= sx + 30
          ? `
            M${sx},${sy}
            C${sx + gap},${sy}
             ${tx - gap},${ty}
             ${tx},${ty}
          `
          : `
            M${sx},${sy}
            L${sx + 28},${sy}
            L${sx + 28},${Math.min(
              s.y,
              t.y
            ) - 54}
            L${tx - 28},${Math.min(
              s.y,
              t.y
            ) - 54}
            L${tx - 28},${ty}
            L${tx},${ty}
          `;

      return {
        d,
        sx,
        sy,
        tx,
        ty
      };
    }

    edgeMarkup(r) {

      const s =
        this.nodes.find(
          n => n.id === r.source
        );

      const t =
        this.nodes.find(
          n => n.id === r.target
        );

      if (!s || !t) {
        return "";
      }

      const p =
        this.edgePath(s, t);

      const marker =
        r.kind === "negative"
          ? "url(#mwe-arrow-neg)"
          : "url(#mwe-arrow-pos)";

      return `
        <g
          data-edge-id="${escapeHtml(r.id)}">

          <path
            class="mwe-edge-hit"
            d="${p.d}"/>

          <path
            class="mwe-edge ${r.kind}${
              this.selectedRelationshipId === r.id
                ? " selected"
                : ""
            }"
            d="${p.d}"
            marker-end="${marker}"/>

          ${
            r.label
              ? `
                <text
                  class="mwe-edge-label"
                  x="${(p.sx + p.tx) / 2}"
                  y="${(p.sy + p.ty) / 2 - 7}"
                  text-anchor="middle">
                  ${escapeHtml(r.label)}
                </text>
              `
              : ""
          }

        </g>
      `;
    }

    render() {

      if (this.destroyed) {
        return;
      }

      this.viewport.setAttribute(
        "transform",
        `
          translate(
            ${this.transform.x}
            ${this.transform.y}
          )
          scale(${this.transform.scale})
        `
      );

      this.edgesLayer.innerHTML =
        this.relationships
          .map(
            r => this.edgeMarkup(r)
          )
          .join("");

      this.nodesLayer.innerHTML =
        this.nodes
          .map(
            n => this.nodeMarkup(n)
          )
          .join("");

      this.svg.classList.toggle(
        "mwe-linking",
        !!this.linkMode
      );

      this.updateButtons();
    }

    onPointerDown(e) {

      if (e.button !== 0) {
        return;
      }

      this.hideMenu();

      const relationshipGroup =
        e.target.closest(
          "g[data-edge-id]"
        );

      if (relationshipGroup) {

        const relationshipId =
          relationshipGroup.dataset.edgeId;

        const relationship =
          this.relationships.find(
            r => r.id === relationshipId
          );

        const now = Date.now();

        if (
          this.lastClick &&
          this.lastClick.type ===
            "relationship" &&
          this.lastClick.id ===
            relationshipId &&
          now -
            this.lastClick.timestamp <
            250
        ) {

          this.lastClick = null;

          if (
            this._selectRelationshipTimer
          ) {
            clearTimeout(
              this._selectRelationshipTimer
            );

            this._selectRelationshipTimer =
              null;
          }

          this.selectRelationship(
            relationshipId,
            false
          );

          this.emit(
            "relationship.dblclick",
            {
              relationship:
                relationship
                  ? this.serializeRelationship(
                      relationship
                    )
                  : {
                      id: relationshipId
                    }
            }
          );

        } else {

          this.lastClick = {
            type: "relationship",
            id: relationshipId,
            timestamp: now
          };

          this._selectRelationshipTimer =
            setTimeout(
              () => {
                this.selectRelationship(
                  relationshipId
                );
              },
              250
            );
        }

        e.preventDefault();
        e.stopPropagation();

        return;
      }

      const nodeElement =
        e.target.closest(
          ".mwe-node"
        );

      if (nodeElement) {

        const nodeId =
          nodeElement.dataset.id;

        const node =
          this.nodes.find(
            n => n.id === nodeId
          );

        const now = Date.now();

        if (
          this.lastClick &&
          this.lastClick.type ===
            "node" &&
          this.lastClick.id ===
            nodeId &&
          now -
            this.lastClick.timestamp <
            250
        ) {

          this.lastClick = null;

          if (this._selectNodeTimer) {
            clearTimeout(
              this._selectNodeTimer
            );

            this._selectNodeTimer =
              null;
          }

          this.emit(
            "node.dblclick",
            {
              node: node
                ? this.serializeNode(node)
                : {
                    id: nodeId
                  }
            }
          );

        } else {

          this.lastClick = {
            type: "node",
            id: nodeId,
            timestamp: now
          };

          this._selectNodeTimer =
            setTimeout(
              () => {
                this.selectNode(nodeId);
              },
              250
            );
        }

        if (this.linkMode) {

          if (
            nodeId !==
            this.linkMode.source
          ) {

            this.createRelationship(
              this.linkMode.source,
              nodeId,
              this.linkMode.kind
            );

          } else {

            this.cancelLink();
          }

          return;
        }

        if (!this.options.readOnly) {

          const p =
            this.clientToWorld(
              e.clientX,
              e.clientY
            );

          this.dragState = {
            id: nodeId,

            startX: p.x,
            startY: p.y,

            originalX:
              node.x,

            originalY:
              node.y,

            moved: false
          };
        }

        return;
      }

      this.lastClick = null;

      this.panState = {
        clientX: e.clientX,
        clientY: e.clientY,
        x: this.transform.x,
        y: this.transform.y
      };

      this.svg.classList.add(
        "mwe-panning"
      );
    }

    onPointerMove(e) {

      if (this.dragState) {

        const n =
          this.nodes.find(
            x =>
              x.id ===
              this.dragState.id
          );

        if (!n) {
          return;
        }

        const p =
          this.clientToWorld(
            e.clientX,
            e.clientY
          );

        let x =
          this.dragState.originalX +
          p.x -
          this.dragState.startX;

        let y =
          this.dragState.originalY +
          p.y -
          this.dragState.startY;

        if (this.options.snapToGrid) {

          x =
            Math.round(
              x /
                this.options.grid
            ) *
            this.options.grid;

          y =
            Math.round(
              y /
                this.options.grid
            ) *
            this.options.grid;
        }

        n.x =
          Math.max(0, x);

        n.y =
          Math.max(0, y);

        this.dragState.moved =
          n.x !==
            this.dragState.originalX ||
          n.y !==
            this.dragState.originalY;

        /*
         * Update the coordinate overlay
         * using exactly the same conversion
         * that will later be sent to Maximo.
         */
        this.updateCoordinateOverlay(
          n
        );

        this.render();

      } else if (this.panState) {

        this.transform.x =
          this.panState.x +
          e.clientX -
          this.panState.clientX;

        this.transform.y =
          this.panState.y +
          e.clientY -
          this.panState.clientY;

        this.render();

      } else if (this.linkMode) {

        const n =
          this.nodes.find(
            x =>
              x.id ===
              this.linkMode.source
          );

        const p =
          this.clientToWorld(
            e.clientX,
            e.clientY
          );

        if (n) {

          const sx =
            n.x + n.width;

          const sy =
            n.y + n.height / 2;

          this.previewEdge.setAttribute(
            "d",
            `
              M${sx},${sy}
              C${sx + 60},${sy}
               ${p.x - 60},${p.y}
               ${p.x},${p.y}
            `
          );

          this.previewEdge.style.display =
            "";
        }
      }
    }

    onPointerUp() {

      if (this.dragState) {

        const n =
          this.nodes.find(
            x =>
              x.id ===
              this.dragState.id
          );

        if (
          n &&
          this.dragState.moved &&
          (
            n.x !==
              this.dragState.originalX ||
            n.y !==
              this.dragState.originalY
          )
        ) {

          this.emit(
            "node.updated",
            {
              node:
                this.serializeNode(n),

              changes: {
                x: n.x,
                y: n.y
              }
            }
          );
        }
      }

      /*
       * Hide the coordinate overlay once
       * the drag operation is finished.
       */
      this.hideCoordinateOverlay();

      this.dragState = null;
      this.panState = null;

      this.svg.classList.remove(
        "mwe-panning"
      );
    }

    onWheel(e) {

      e.preventDefault();

      const r =
        this.svg.getBoundingClientRect();

      const px =
        e.clientX - r.left;

      const py =
        e.clientY - r.top;

      const old =
        this.transform.scale;

      const next =
        Math.min(
          2.5,
          Math.max(
            0.3,
            old *
              (
                e.deltaY < 0
                  ? 1.08
                  : 0.95
              )
          )
        );

      this.transform.x =
        px -
        (
          (px -
            this.transform.x) /
          old
        ) *
        next;

      this.transform.y =
        py -
        (
          (py -
            this.transform.y) /
          old
        ) *
        next;

      this.transform.scale =
        next;

      this.render();
    }

    onContextMenu(e) {

      e.preventDefault();

      const el =
        e.target.closest(
          ".mwe-node"
        );

      if (!el) {
        return;
      }

      this.selectNode(
        el.dataset.id
      );

      const node =
        this.nodes.find(
          n =>
            n.id ===
            el.dataset.id
        );

      this.menu.querySelector(
        '[data-menu="positive"]'
      ).disabled =
        !this.canBeginLink(
          node,
          "positive"
        );

      this.menu.querySelector(
        '[data-menu="negative"]'
      ).disabled =
        !this.canBeginLink(
          node,
          "negative"
        );

      this.menu.querySelector(
        '[data-menu="delete"]'
      ).disabled =
        this.options.readOnly ||
        node.type === "start";

      const r =
        this.wrap.getBoundingClientRect();

      this.menu.style.left =
        e.clientX -
        r.left +
        "px";

      this.menu.style.top =
        e.clientY -
        r.top +
        "px";

      this.menu.style.display =
        "block";
    }

    onKeyDown(e) {

      if (!this.root.isConnected) {
        return;
      }

      if (e.key === "Escape") {
        this.cancelLink();
        this.hideMenu();
      }

      if (
        !this.options.readOnly &&
        (
          e.key === "Delete" ||
          e.key === "Backspace"
        ) &&
        !/input|textarea/i.test(
          document.activeElement?.tagName ||
            ""
        )
      ) {
        this.deleteSelection();
      }

      if (
        !this.options.readOnly &&
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z"
      ) {

        e.preventDefault();

        e.shiftKey
          ? this.redo()
          : this.undo();
      }

      if (
        !this.options.readOnly &&
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "y"
      ) {

        e.preventDefault();

        this.redo();
      }
    }

    clientToWorld(x, y) {

      const r =
        this.svg.getBoundingClientRect();

      return {
        x:
          (
            x -
            r.left -
            this.transform.x
          ) /
          this.transform.scale,

        y:
          (
            y -
            r.top -
            this.transform.y
          ) /
          this.transform.scale
      };
    }

    createNodeAtCenter(type) {

      const r =
        this.svg.getBoundingClientRect();

      const p =
        this.clientToWorld(
          r.left +
            r.width / 2,
          r.top +
            r.height / 2
        );

      this.createNode(
        type,
        p.x -
          this.options.nodeWidth / 2,
        p.y -
          this.options.nodeHeight / 2
      );
    }

    createNode(type, x, y) {

      if (this.options.readOnly) {
        return;
      }

      if (
        type === "start" &&
        this.nodes.some(
          n => n.type === "start"
        )
      ) {

        this.toast(
          LABELS.startAlreadyPresent,
          true
        );

        return;
      }

      this.pushHistory();

      const n =
        normalizeNode(
          {
            id: uid("node"),
            type,
            label:
              this.typeLabel(
                type
              ).toUpperCase(),
            x,
            y,
            width:
              this.options.nodeWidth,
            height:
              this.options.nodeHeight
          },
          this.nodes.length
        );

      this.nodes.push(n);

      this.selectNode(n.id);

      this.emit(
        "node.created",
        {
          node:
            this.serializeNode(n)
        }
      );

      this.toast(
        this.typeLabel(type) +
          " créé"
      );
    }

    createRelationship(
      source,
      target,
      kind
    ) {

      if (this.options.readOnly) {
        return;
      }

      kind =
        kind === "negative"
          ? "negative"
          : "positive";

      const sourceNode =
        this.nodes.find(
          n => n.id === source
        );

      const targetNode =
        this.nodes.find(
          n => n.id === target
        );

      const constraint =
        this.relationshipConstraint(
          sourceNode,
          targetNode,
          kind
        );

      if (constraint) {

        this.toast(
          constraint,
          true
        );

        this.cancelLink();

        return;
      }

      if (
        this.relationships.some(
          r =>
            r.source === source &&
            r.target === target &&
            r.kind === kind
        )
      ) {

        this.toast(
          "Ce lien existe déjà",
          true
        );

        this.cancelLink();

        return;
      }

      this.pushHistory();

      const rel = {
        id: uid("rel"),
        source,
        target,
        kind,
        label: "",
        raw: {}
      };

      this.relationships.push(
        rel
      );

      this.cancelLink();

      this.selectRelationship(
        rel.id
      );

      this.emit(
        "relationship.created",
        {
          relationship:
            this.serializeRelationship(
              rel
            )
        }
      );
    }

    beginLink(source, kind) {

      kind =
        kind === "negative"
          ? "negative"
          : "positive";

      const sourceNode =
        this.nodes.find(
          n => n.id === source
        );

      if (!sourceNode) {

        this.toast(
          "Le noeud source est introuvable",
          true
        );

        return;
      }

      if (
        !this.canBeginLink(
          sourceNode,
          kind
        )
      ) {

        const linkLabel =
          kind === "negative"
            ? "négatif"
            : "positif";

        this.toast(
          `${this.typeLabel(
            sourceNode.type
          )} ne peut pas créer de nouveau lien ${linkLabel} sortant`,
          true
        );

        this.cancelLink();

        return;
      }

      this.linkMode = {
        source,
        kind
      };

      this.setStatus(
        `Sélectionnez la cible du lien ${
          kind === "negative"
            ? "négatif"
            : "positif"
        }`
      );

      this.render();
    }

    cancelLink() {

      this.linkMode = null;

      this.previewEdge.style.display =
        "none";

      this.setStatus(
        `${this.nodes.length} élément(s), ` +
        `${this.relationships.length} lien(s)`
      );

      this.render();
    }

    selectNode(id) {

      if (
        this.selectedNodeId === id
      ) {
        return;
      }

      this.selectedNodeId = id;
      this.selectedRelationshipId =
        null;

      const node =
        this.nodes.find(
          n => n.id === id
        );

      this.emit(
        "node.selected",
        {
          node:
            node
              ? this.serializeNode(node)
              : { id }
        }
      );

      this.render();
    }

    selectRelationship(
      id,
      emitEvent = true
    ) {

      const changed =
        this.selectedRelationshipId !==
          id ||
        this.selectedNodeId !==
          null;

      this.selectedRelationshipId =
        id;

      this.selectedNodeId =
        null;

      if (changed) {

        const relationship =
          this.relationships.find(
            r => r.id === id
          );

        if (emitEvent) {

          this.emit(
            "relationship.selected",
            {
              relationship:
                relationship
                  ? this.serializeRelationship(
                      relationship
                    )
                  : { id },

              raw:
                relationship
                  ? relationship.raw
                  : null
            }
          );
        }
      }

      this.render();
    }

    clearSelection() {

      this.selectedNodeId =
        null;

      this.selectedRelationshipId =
        null;

      this.render();
    }

    deleteSelection() {

      if (this.options.readOnly) {
        return;
      }

      if (this.selectedNodeId) {

        const selected =
          this.nodes.find(
            x =>
              x.id ===
              this.selectedNodeId
          );

        if (
          selected &&
          selected.type === "start"
        ) {

          this.toast(
            "Le point de départ est obligatoire et ne peut pas être supprimé",
            true
          );

          return;
        }

        this.pushHistory();

        const n =
          this.nodes.find(
            x =>
              x.id ===
              this.selectedNodeId
          );

        const rels =
          this.relationships.filter(
            r =>
              r.source === n.id ||
              r.target === n.id
          );

        this.nodes =
          this.nodes.filter(
            x =>
              x.id !== n.id
          );

        this.relationships =
          this.relationships.filter(
            r =>
              r.source !== n.id &&
              r.target !== n.id
          );

        this.selectedNodeId =
          null;

        this.render();

        this.emit(
          "node.deleted",
          {
            node:
              this.serializeNode(n),

            relationships:
              rels.map(
                r =>
                  this.serializeRelationship(
                    r
                  )
              )
          }
        );

      } else if (
        this.selectedRelationshipId
      ) {

        this.pushHistory();

        const r =
          this.relationships.find(
            x =>
              x.id ===
              this.selectedRelationshipId
          );

        this.relationships =
          this.relationships.filter(
            x =>
              x.id !== r.id
          );

        this.selectedRelationshipId =
          null;

        this.render();

        this.emit(
          "relationship.deleted",
          {
            relationship:
              this.serializeRelationship(
                r
              )
          }
        );
      }
    }

    openNode(id) {

      const n =
        this.nodes.find(
          x => x.id === id
        );

      if (!n) {
        return;
      }

      if (
        typeof this.options.openElement ===
        "function"
      ) {

        this.options.openElement.call(
          this.component,
          this.serializeNode(n),
          n.raw
        );

      } else {

        this.emit(
          "node.open",
          {
            node:
              this.serializeNode(n),
            raw: n.raw
          }
        );
      }
    }

    fitToContent() {

      if (!this.nodes.length) {

        this.transform = {
          x: 0,
          y: 0,
          scale: 1
        };

        return this.render();
      }

      const r =
        this.svg.getBoundingClientRect();

      const minX =
        Math.min(
          ...this.nodes.map(
            n => n.x
          )
        );

      const minY =
        Math.min(
          ...this.nodes.map(
            n => n.y
          )
        );

      const maxX =
        Math.max(
          ...this.nodes.map(
            n =>
              n.x + n.width
          )
        );

      const maxY =
        Math.max(
          ...this.nodes.map(
            n =>
              n.y +
              n.height +
              26
          )
        );

      const scale =
        Math.min(
          1.25,
          Math.max(
            0.3,
            Math.min(
              (r.width - 100) /
                (maxX - minX || 1),

              (r.height - 100) /
                (maxY - minY || 1)
            )
          )
        );

      this.transform = {
        scale,

        x:
          (
            r.width -
            (maxX - minX) *
              scale
          ) /
            2 -
          minX * scale,

        y:
          (
            r.height -
            (maxY - minY) *
              scale
          ) /
            2 -
          minY * scale
      };

      this.render();
    }

    handleAction(action) {

      if (
        action ===
        "zoom-in"
      ) {
        this.zoom(1.08);
      }

      if (
        action ===
        "zoom-out"
      ) {
        this.zoom(0.95);
      }

      if (
        action ===
        "zoom-reset"
      ) {
        this.fitToContent();
      }

      if (
        action ===
        "refresh"
      ) {
        this.load();
      }

      if (this.options.readOnly) {
        return;
      }

      if (
        action ===
        "delete"
      ) {
        this.deleteSelection();
      }

      if (
        action ===
          "link-positive" ||
        action ===
          "link-negative"
      ) {

        this.beginLink(
          this.selectedNodeId,

          action ===
            "link-negative"
            ? "negative"
            : "positive"
        );
      }
    }

    zoom(factor) {

      this.transform.scale =
        Math.min(
          2.5,
          Math.max(
            0.3,
            this.transform.scale *
              factor
          )
        );

      this.render();
    }

    pushHistory() {

      this.undoStack.push(
        JSON.stringify(
          this.getData()
        )
      );

      if (
        this.undoStack.length >
        50
      ) {
        this.undoStack.shift();
      }

      this.redoStack = [];
    }

    restore(snapshot) {

      const s =
        JSON.parse(snapshot);

      this.nodes =
        s.nodes.map(
          normalizeNode
        );

      this.relationships =
        s.relationships.map(
          normalizeRelationship
        );

      this.clearSelection();

      this.emit(
        "workflow.restored",
        s
      );
    }

    undo() {

      if (
        this.options.readOnly ||
        !this.undoStack.length
      ) {
        return;
      }

      this.redoStack.push(
        JSON.stringify(
          this.getData()
        )
      );

      this.restore(
        this.undoStack.pop()
      );
    }

    redo() {

      if (
        this.options.readOnly ||
        !this.redoStack.length
      ) {
        return;
      }

      this.undoStack.push(
        JSON.stringify(
          this.getData()
        )
      );

      this.restore(
        this.redoStack.pop()
      );
    }

    /*
     * Convert canvas coordinates to
     * Maximo workflow coordinates.
     */
    worldToMaximoX(x) {

      return Math.floor(
        x /
          this.coordinateScale.x +
        this.coordinateOffset.x
      );
    }

    worldToMaximoY(y) {

      return Math.floor(
        y /
          this.coordinateScale.y +
        this.coordinateOffset.y
      );
    }

    /*
     * Update the coordinate overlay.
     *
     * IMPORTANT:
     * These are the exact coordinates
     * that will be sent to Maximo.
     */
    updateCoordinateOverlay(node) {

      if (
        !this.coordinateOverlay ||
        !node
      ) {
        return;
      }

      const xcoordinate =
        this.worldToMaximoX(
          node.x
        );

      const ycoordinate =
        this.worldToMaximoY(
          node.y
        );

      this.coordinateX.textContent =
        xcoordinate;

      this.coordinateY.textContent =
        ycoordinate;

      this.coordinateOverlay.classList.add(
        "show"
      );
    }

    hideCoordinateOverlay() {

      if (
        this.coordinateOverlay
      ) {
        this.coordinateOverlay.classList.remove(
          "show"
        );
      }
    }

    serializeNode(n) {

      return {
        id: n.id,
        type: n.type,
        label: n.label,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,

        /*
         * Include the Maximo coordinates
         * as well, so consumers can directly
         * use the same values displayed
         * during dragging.
         */
        xcoordinate:
          this.worldToMaximoX(
            n.x
          ),

        ycoordinate:
          this.worldToMaximoY(
            n.y
          )
      };
    }

    serializeRelationship(r) {

      return {
        id: r.id,
        source: r.source,
        target: r.target,
        kind: r.kind,
        label: r.label
      };
    }

    getData() {

      return {
        nodes:
          this.nodes.map(
            n =>
              this.serializeNode(n)
          ),

        relationships:
          this.relationships.map(
            r =>
              this.serializeRelationship(
                r
              )
          )
      };
    }

    setData(
      nodes,
      relationships
    ) {

      this.nodes =
        asArray(nodes).map(
          normalizeNode
        );

      this.relationships =
        asArray(
          relationships
        )
          .map(
            normalizeRelationship
          )
          .map(
            relationship =>
              this.resolveRelationshipEndpoints(
                relationship
              )
          )
          .filter(
            relationship =>
              relationship.source &&
              relationship.target
          );

      this.render();

      this.fitToContent();
    }

    isReadOnly() {
      return (
        this.options.readOnly ===
        true
      );
    }

    setReadOnly(readOnly) {

      const nextValue =
        readOnly === true;

      if (
        this.options.readOnly ===
        nextValue
      ) {
        return;
      }

      this.options.readOnly =
        nextValue;

      this.cancelLink();

      this.dragState =
        null;

      this.panState =
        null;

      this.hideCoordinateOverlay();

      this.hideMenu();

      this.applyEditorMode();

      this.render();
    }

    setEditable(editable) {

      this.setReadOnly(
        editable !== true
      );
    }

    applyEditorMode() {

      if (
        !this.root ||
        !this.toolbar
      ) {
        return;
      }

      this.root.classList.toggle(
        "mwe-readonly",
        this.options.readOnly
      );

      this.root.classList.toggle(
        "mwe-editable",
        !this.options.readOnly
      );

      this.root.setAttribute(
        "data-mode",
        this.options.readOnly
          ? "readonly"
          : "editable"
      );

      this.toolbar
        .querySelectorAll(".mwe-tool")
        .forEach(button => {

          button.disabled =
            this.options.readOnly ||
            (
              button.dataset.type ===
                "start" &&
              this.nodes.some(
                node =>
                  node.type === "start"
              )
            );

          button.draggable =
            !this.options.readOnly &&
            !button.disabled;

          button.setAttribute(
            "aria-disabled",
            String(
              button.disabled
            )
          );
        });

      if (this.modeIndicator) {

        this.modeIndicator.textContent =
          this.options.readOnly
            ? LABELS.readOnlyMode
            : LABELS.editableMode;

        this.modeIndicator.setAttribute(
          "title",
          this.modeIndicator.textContent
        );
      }

      if (this.menu) {

        this.menu.querySelector(
          '[data-menu="positive"]'
        ).disabled =
          this.options.readOnly;

        this.menu.querySelector(
          '[data-menu="negative"]'
        ).disabled =
          this.options.readOnly;

        this.menu.querySelector(
          '[data-menu="delete"]'
        ).disabled =
          this.options.readOnly;
      }

      this.updateButtons();
    }

    setStatus(text) {

      this.status.textContent =
        text;
    }

    hideMenu() {

      this.menu.style.display =
        "none";
    }

    toast(text, error) {

      clearTimeout(
        this.toastTimer
      );

      this.toastEl.textContent =
        text;

      this.toastEl.className =
        "mwe-toast show" +
        (
          error
            ? " error"
            : ""
        );

      this.toastTimer =
        setTimeout(
          () =>
            this.toastEl.classList.remove(
              "show"
            ),
          2400
        );
    }

    fail(message, err) {

      console.error(
        message,
        err
      );

      this.setStatus(
        message
      );

      this.toast(
        message,
        true
      );

      if (
        typeof this.options.onError ===
        "function"
      ) {
        this.options.onError(
          err,
          message
        );
      }
    }

    updateButtons() {

      const set =
        (
          action,
          disabled
        ) => {

          const button =
            this.toolbar.querySelector(
              `[data-action="${action}"]`
            );

          if (button) {

            button.disabled =
              disabled;

            button.setAttribute(
              "aria-disabled",
              String(disabled)
            );
          }
        };

      const node =
        this.nodes.find(
          n =>
            n.id ===
            this.selectedNodeId
        );

      const startSelected =
        !!node &&
        node.type === "start";

      const readOnly =
        this.options.readOnly;

      this.toolbar
        .querySelectorAll(".mwe-tool")
        .forEach(button => {

          const startAlreadyExists =
            button.dataset.type ===
              "start" &&
            this.nodes.some(
              n =>
                n.type === "start"
            );

          button.disabled =
            readOnly ||
            startAlreadyExists;

          button.draggable =
            !button.disabled;

          button.setAttribute(
            "aria-disabled",
            String(
              button.disabled
            )
          );
        });

      set(
        "undo",
        readOnly ||
          !this.undoStack.length
      );

      set(
        "redo",
        readOnly ||
          !this.redoStack.length
      );

      set(
        "delete",
        readOnly ||
          (
            !this.selectedNodeId &&
            !this.selectedRelationshipId
          ) ||
          startSelected
      );

      set(
        "link-positive",
        readOnly ||
          !this.canBeginLink(
            node,
            "positive"
          )
      );

      set(
        "link-negative",
        readOnly ||
          !this.canBeginLink(
            node,
            "negative"
          )
      );

      set(
        "layout",
        readOnly
      );

      set(
        "zoom-reset",
        false
      );

      set(
        "zoom-in",
        false
      );

      set(
        "zoom-out",
        false
      );

      set(
        "refresh",
        false
      );
    }

    destroy() {

      this.destroyed = true;

      document.removeEventListener(
        "pointermove",
        this.boundMove
      );

      document.removeEventListener(
        "pointerup",
        this.boundUp
      );

      document.removeEventListener(
        "keydown",
        this.boundKey
      );

      this.globalEventsBound =
        false;

      this.root.innerHTML =
        "";
    }
  }

  global.MaximoWorkflowEditor =
    MaximoWorkflowEditor;

  global.createMaximoWorkflowEditor =
    function (
      component,
      options
    ) {

      const mwfe =
        new MaximoWorkflowEditor(
          component,
          options
        );

      mwfe.addEventListener(
        "node.open",
        async e => {

          console.log(
            "node.open",
            e
          );

          component.sendEvent({
            eventType:
              "openPropertiesForNode",

            targetId:
              APPID,

            eventValue:
              e.node.id
          });
        }
      );

      mwfe.addEventListener(
        "node.selected",
        async e => {

          console.log(
            "node.selected",
            e
          );

          component.sendEvent({
            eventType:
              "selectNode",

            targetId:
              APPID,

            eventValue:
              e.node.id
          });
        }
      );

      mwfe.addEventListener(
        "node.dblclick",
        async e => {

          console.log(
            "node.dblclick",
            e
          );

          component.sendEvent({
            eventType:
              "openPropertiesForNode",

            targetId:
              APPID,

            eventValue:
              e.node.id
          });
        }
      );

      mwfe.addEventListener(
        "relationship.selected",
        async e => {

          console.log(
            "relationship.selected",
            e
          );
        }
      );

      mwfe.addEventListener(
        "relationship.dblclick",
        async e => {

          console.log(
            "relationship.dblclick",
            e
          );

          component.sendEvent({
            eventType:
              "openPropertiesForAction",

            targetId:
              APPID,

            eventValue:
              JSON.stringify(
                e.relationship
              )
          });
        }
      );

      mwfe.addEventListener(
        "node.created",
        async e => {

          console.log(
            "node.created",
            e
          );

          component.sendEvent({
            eventType:
              "createNode",

            targetId:
              APPID,

            eventValue:
              e.node.type
          });

          await mwfe.load(
            false
          );
        }
      );

      mwfe.addEventListener(
        "node.updated",
        async e => {

          console.log(
            "node.updated",
            e
          );

          /*
           * The xcoordinate/ycoordinate
           * values here are calculated by
           * exactly the same methods used
           * by the coordinate overlay.
           */
          e.node.xcoordinate =
            mwfe.worldToMaximoX(
              e.node.x
            );

          e.node.ycoordinate =
            mwfe.worldToMaximoY(
              e.node.y
            );

          component.sendEvent({
            eventType:
              "updateNode",

            targetId:
              APPID,

            eventValue:
              JSON.stringify(
                e.node
              )
          });

          setTimeout(
            () => mwfe.load(),
            300
          );
        }
      );

      mwfe.addEventListener(
        "node.deleted",
        async e => {

          console.log(
            "node.deleted",
            e
          );

          component.sendEvent({
            eventType:
              "deleteNode",

            targetId:
              APPID,

            eventValue:
              e.node.id
          });

          await mwfe.load(
            false
          );
        }
      );

      mwfe.addEventListener(
        "relationship.created",
        async e => {

          console.log(
            "relationship.created",
            e
          );

          const relation =
            e.relationship;

          component.sendEvent({
            eventType:
              "createRelationship",

            targetId:
              APPID,

            eventValue:
              JSON.stringify(
                relation
              )
          });

          await mwfe.load(
            false
          );
        }
      );

      mwfe.addEventListener(
        "relationship.updated",
        async e => {

          console.log(
            "relationship.updated",
            e
          );

          await mwfe.load(
            false
          );
        }
      );

      mwfe.addEventListener(
        "relationship.deleted",
        async e => {

          console.log(
            "relationship.deleted",
            e
          );

          await mwfe.load(
            false
          );
        }
      );

      mwfe.addEventListener(
        "workflow.layout",
        async e => {

          console.log(
            "workflow.layout",
            e
          );
        }
      );

      mwfe.addEventListener(
        "workflow.restored",
        async e => {

          console.log(
            "workflow.restored",
            e
          );
        }
      );

      return mwfe;
    };

})(window);


/*
 * ============================================================
 * MAXIMO COMPONENT INITIALIZATION
 * ============================================================
 */

const sectionId =
  "section_canvas";

const mapping =
  (await this.getComponentsMapping())[
    sectionId
  ];

const wfCanvasId =
  "#" +
  mapping[
    sectionId + "-se"
  ].renderId;


/*
 * ============================================================
 * GET NODES
 * ============================================================
 */

this.getNodes = async () => {

  const res =
    await this.sendAsyncEvent({
      eventType:
        "getAllNodes",

      targetId:
        window.APPID
    });

  /*
   * IMPORTANT:
   *
   * Maximo coordinates are grid indices,
   * not pixels.
   *
   * X:
   *     1 index = 200 px
   *
   * Y:
   *     1 index = 150 px
   *
   * Negative coordinates are shifted so
   * that the SVG starts at X/Y = 0.
   */

  const xCoordinates =
    res
      .map(
        e =>
          Number(
            e.xcoordinate
          )
      )
      .filter(
        Number.isFinite
      );

  const yCoordinates =
    res
      .map(
        e =>
          Number(
            e.ycoordinate
          )
      )
      .filter(
        Number.isFinite
      );

  const minX =
    xCoordinates.length
      ? Math.min(
          ...xCoordinates
        )
      : 0;

  const minY =
    yCoordinates.length
      ? Math.min(
          ...yCoordinates
        )
      : 0;

  /*
   * Convert Maximo coordinates
   * into SVG/world coordinates.
   */
  res.forEach(e => {

    e.x =
      (
        Number(e.xcoordinate) -
        Math.min(0, minX)
      ) *
      200;

    e.y =
      (
        Number(e.ycoordinate) -
        Math.min(0, minY)
      ) *
      150;
  });

  return res;
};


/*
 * ============================================================
 * GET ACTIONS
 * ============================================================
 */

this.getActions = async () => {

  return this.sendAsyncEvent({
    eventType:
      "getAllActions",

    targetId:
      window.APPID
  });
};


/*
 * ============================================================
 * MAIN RECORD
 * ============================================================
 */

const data =
  await this.getData(
    "mainrecord",
    [
      "processname",
      "active",
      "enabled"
    ],
    undefined,
    undefined,
    0,
    1
  );


/*
 * ============================================================
 * CREATE EDITOR
 * ============================================================
 */

this.wfcanvas =
  createMaximoWorkflowEditor(
    this,
    {
      mount:
        wfCanvasId,

      height:
        "560px",

      getNodes:
        this.getNodes,

      getActions:
        this.getActions,

      readOnly:
        data.data[0].active == 1 ||
        data.data[0].enabled == 1
    }
  );


/*
 * ============================================================
 * NOTIFICATION CALLBACK
 * ============================================================
 */

this.registerNotificationCallBack(
  async event => {

    const currentMapping =
      (
        await this.getComponentsMapping()
      )[sectionId];

    const data =
      await this.getData(
        "mainrecord",
        [
          "processname",
          "active",
          "enabled"
        ],
        undefined,
        undefined,
        0,
        1
      );

    const currentCanvasId =
      "#" +
      currentMapping[
        sectionId + "-se"
      ].renderId;

    const currentElement =
      document.querySelector(
        currentCanvasId
      );

    if (!currentElement) {

      console.warn(
        "Conteneur du workflow introuvable",
        currentCanvasId
      );

      return;
    }

    const readOnly =
      data.data[0].active == 1 ||
      data.data[0].enabled == 1;

    if (
      this.wfcanvas &&
      this.wfcanvas.root ===
        currentElement
    ) {

      this.wfcanvas.setReadOnly(
        readOnly
      );

      await this.wfcanvas.load();

      return;
    }

    if (this.wfcanvas) {
      this.wfcanvas.destroy();
    }

    this.wfcanvas =
      createMaximoWorkflowEditor(
        this,
        {
          mount:
            currentCanvasId,

          height:
            "560px",

          getNodes:
            this.getNodes,

          getActions:
            this.getActions,

          readOnly:
            readOnly
        }
      );
  }
);