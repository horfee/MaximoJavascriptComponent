/**
 * LinearAsset — Maximo Linear Asset Viewer
 * Pure vanilla JS (no external libraries)
 *
 * Usage (as a Maximo UI Script):
 *
 *   const la = new LinearAsset('#container', {
 *     title:      'Asset Route A1-B3',
 *     startPoint: 0,
 *     endPoint:   12.5,
 *     unit:       'km',
 *     categories: [
 *       {
 *         id:    'specs',
 *         label: 'Linear Specifications',
 *         icon:  'spec',           // optional built-in icon name
 *         items: [
 *           {
 *             id:          'spec-1',
 *             label:       'Asphalt surface',
 *             startMeasure: 0,
 *             endMeasure:   5.2,
 *             color:        '#0f62fe',
 *             icon:         null,
 *             tooltip:      'Asphalt surface — 0 to 5.2 km',
 *             children: [                        // optional sub-items (deeper nesting)
 *               { id:'sub-1', label:'Sub-spec A', startMeasure:1, endMeasure:3, color:'#8a3ffc' }
 *             ]
 *           },
 *           {
 *             id:          'spec-2',
 *             label:       'Pothole marker',
 *             startMeasure: 7.1,
 *             endMeasure:   null,   // null → point feature (circle)
 *             color:        '#da1e28',
 *             icon:         null,
 *             tooltip:      'Pothole at 7.1 km'
 *           }
 *         ]
 *       }
 *     ]
 *   });
 *
 * ─── Category / item shape ───────────────────────────────────────────
 *   category.id        {string}          unique id
 *   category.label     {string}          display label
 *   category.icon      {string}          optional icon name (built-in SVG keys)
 *   category.color     {string}          optional accent color
 *   category.items     {Array}           array of items (see below)
 *
 *   item.id            {string}
 *   item.label         {string}
 *   item.startMeasure  {number}          coordinate on the asset
 *   item.endMeasure    {number|null}     null → point; number → rectangle
 *   item.color         {string}          fill colour of the block
 *   item.icon          {string|null}     optional icon name
 *   item.tooltip       {string}          tooltip text (auto-generated if absent)
 *   item.children      {Array}           optional nested items
 *
 * ─── Public API ──────────────────────────────────────────────────────
 *   la.setData(categories)               replace all data & re-render
 *   la.setCategoryItems(id, items)       dynamically set items for a category
 *   la.setWindow(start, end)             programmatically set the window span
 *   la.getWindow()                       → { start, end }
 *   la.setTitle(title)                   update the header title
 *   la.setSpan(startPoint, endPoint)     change the full asset span
 *   la.destroy()                         clean up DOM & events
 *
 * ─── Events (dispatched on the host element) ────────────────────────
 *   la-window-change   → detail: { start, end }
 *   la-item-click      → detail: { item, category }
 *   la-category-toggle → detail: { category, expanded }
 *
 * ─── Maximo ScriptControl integration ───────────────────────────────
 *   The last lines of this file contain the boilerplate to wire the
 *   component into the ScriptControl lifecycle (render / update / refresh).
 *   Copy the relevant section and adapt datasource / attribute names.
 */

/* ══════════════════════════════════════════════════════════════════ */
/*  SVG icon library                                                  */
/* ══════════════════════════════════════════════════════════════════ */
const LA_ICONS = {
  chevDown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M8 11L3 6h10z"/></svg>`,
  chevRight:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M6 3l5 5-5 5z"/></svg>`,
  spinner:  `<svg class="la-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="12" height="12"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/></svg>`,
  spec:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="13" height="13"><path d="M2 2h12v2H2zm0 4h8v2H2zm0 4h10v2H2z"/></svg>`,
  work:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="13" height="13"><path d="M14 4h-3V2a1 1 0 00-1-1H6a1 1 0 00-1 1v2H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1zM7 2h2v2H7zm6 10H3V6h10z"/></svg>`,
  feature:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="13" height="13"><path d="M8 1a5 5 0 100 10A5 5 0 008 1zm0 8a3 3 0 110-6 3 3 0 010 6zM7 12h2v3H7z"/></svg>`,
  ticket:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="13" height="13"><path d="M13 2H3a1 1 0 00-1 1v2.5a1.5 1.5 0 010 3V11a1 1 0 001 1h10a1 1 0 001-1V8.5a1.5 1.5 0 010-3V3a1 1 0 00-1-1z"/></svg>`,
  relation: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="13" height="13"><circle cx="3" cy="8" r="2"/><circle cx="13" cy="8" r="2"/><path d="M5 8h6"/><path d="M3 4V3h10v1M3 12v1h10v-1"/></svg>`,
  point:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="11" height="11"><circle cx="8" cy="8" r="5"/></svg>`,
  segment:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="11" height="11"><rect x="2" y="6" width="12" height="4" rx="1"/></svg>`,
};

/* ══════════════════════════════════════════════════════════════════ */
/*  Utility helpers                                                   */
/* ══════════════════════════════════════════════════════════════════ */
function _la_el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') e.className = v;
      else if (k === 'style') Object.assign(e.style, v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'html') e.innerHTML = v;
      else e.setAttribute(k, v);
    });
  }
  children.flat(Infinity).forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}

function _la_clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}


/* ══════════════════════════════════════════════════════════════════ */
/*  LinearAsset class                                                 */
/* ══════════════════════════════════════════════════════════════════ */
class LinearAsset {
  /**
   * @param {string|HTMLElement} container
   * @param {object} options
   * @param {string}  [options.title]
   * @param {number}  [options.startPoint=0]
   * @param {number}  [options.endPoint=100]
   * @param {string}  [options.unit='']
   * @param {Array}   [options.categories=[]]
   * @param {number}  [options.rulerTicks=10]   approx. number of ruler ticks
   * @param {number}  [options.rowHeight=28]    px height of each data row
   * @param {boolean} [options.showWindow=true] show the window-span slider
   */
  constructor(container, options = {}) {
    this._host = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this._host) throw new Error('LinearAsset: container not found');

    this._opt = Object.assign({
      title:           'Linear Asset',
      startPoint:      0,
      endPoint:        100,
      unit:            '',
      categories:      [],
      rulerTicks:      10,
      rowHeight:       48,
      showWindow:      true,
      defaultExpanded: false,
      loadCategory:    null, // async fn(category): returns items or updates category
    }, options);

    this._span      = { start: this._opt.startPoint, end: this._opt.endPoint };
    this._window    = { start: this._opt.startPoint, end: this._opt.endPoint };
    this._expanded  = {};   // categoryId → boolean
    this._loading   = {};   // categoryId → boolean
    this._listeners = {};
    this._rows      = [];   // flat list: { type:'category'|'item', depth, data, categoryRef }
    this._tooltip   = null;
    this._dragState = null;

    this._injectCSS();
    this._build();
    this._setData(this._opt.categories);
  }

  /* ── CSS injection ─────────────────────────────────────────────── */
  _injectCSS() {
    const id = 'la-styles';
    if (document.getElementById(id)) return;
    // CSS is expected to be loaded separately as a Maximo CSS script.
    // If it is not found in the document, emit a soft warning only.
    if (!document.querySelector('style[data-la]') && !document.querySelector('link[href*="linearasset"]')) {
      console.warn('LinearAsset: stylesheet not detected. Make sure linearasset.css is loaded as a CSS script.');
    }
  }
  
  _la_fmt(v, unit) {
    if (v == null) return '—';
    const n = parseFloat(v);
    return Number.isInteger(n) ? `${n}${unit ? ' ' + unit : ''}` : `${n.toFixed(3)}${unit ? ' ' + unit : ''}`;
  }

  /* ── Build DOM skeleton ────────────────────────────────────────── */
  _build() {
    this._root = _la_el('div', { class: 'la-root' });

    // Header
    this._headerTitle = _la_el('span', { class: 'la-header-title' }, this._opt.title);
    this._headerMeta  = _la_el('span', { class: 'la-header-meta' });
    this._root.appendChild(_la_el('div', { class: 'la-header' },
      this._headerTitle, this._headerMeta
    ));

    // Window-span selector
    if (this._opt.showWindow) {
      this._root.appendChild(this._buildWindowBar());
    }

    // Body: tree panel + canvas panel
    this._body = _la_el('div', { class: 'la-body' });
    this._treePanel   = _la_el('div', { class: 'la-tree-panel' });
    this._canvasPanel = _la_el('div', { class: 'la-canvas-panel' });
    this._body.appendChild(this._treePanel);
    this._body.appendChild(this._canvasPanel);
    this._root.appendChild(this._body);

    // Tooltip
    this._tooltip = _la_el('div', { class: 'la-tooltip' });
    document.body.appendChild(this._tooltip);

    // Sync scroll between panels
    this._treePanel.addEventListener('scroll', () => {
      this._canvasPanel.scrollTop = this._treePanel.scrollTop;
    });
    this._canvasPanel.addEventListener('scroll', () => {
      this._treePanel.scrollTop = this._canvasPanel.scrollTop;
    });

    this._host.appendChild(this._root);
  }

  /* ── Window-span slider ────────────────────────────────────────── */
  _buildWindowBar() {
    this._winLabel  = _la_el('span', {});
    this._winValues = _la_el('span', { class: 'la-window-values' });
    const labelRow  = _la_el('div', { class: 'la-window-label' },
      _la_el('span', {}, 'Visible window'), this._winValues
    );
    this._updateWindowValues();

    this._track = _la_el('div', { class: 'la-range-track' });
    this._fill  = _la_el('div', { class: 'la-range-fill' });
    this._thumbL = _la_el('div', { class: 'la-range-thumb', 'data-thumb': 'start' });
    this._thumbR = _la_el('div', { class: 'la-range-thumb', 'data-thumb': 'end' });

    this._track.appendChild(this._fill);
    this._track.appendChild(this._thumbL);
    this._track.appendChild(this._thumbR);

    const wrap = _la_el('div', { class: 'la-range-track-wrap' }, this._track);

    // Drag logic
    const onMouseDown = (e) => {
      const thumb = e.target.closest('.la-range-thumb');
      if (!thumb) return;
      e.preventDefault();
      const which = thumb.dataset.thumb;
      this._dragState = { which };
      thumb.classList.add('la-dragging');
      const onMove = (ev) => this._onThumbMove(ev);
      const onUp   = () => {
        this._dragState = null;
        document.querySelectorAll('.la-range-thumb').forEach(t => t.classList.remove('la-dragging'));
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    };

    this._track.addEventListener('mousedown', onMouseDown);
    this._track.addEventListener('touchstart', onMouseDown, { passive: false });

    // Also allow clicking on the track itself to set the nearest thumb
    this._track.addEventListener('click', (e) => {
      if (e.target.closest('.la-range-thumb')) return;
      const rect = this._track.getBoundingClientRect();
      const ratio = _la_clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const val = this._span.start + ratio * (this._span.end - this._span.start);
      const distStart = Math.abs(val - this._window.start);
      const distEnd   = Math.abs(val - this._window.end);
      if (distStart <= distEnd) {
        this._window.start = _la_clamp(val, this._span.start, this._window.end - 0.001);
      } else {
        this._window.end = _la_clamp(val, this._window.start + 0.001, this._span.end);
      }
      this._updateWindowBar();
      this._renderCanvas();
      this._emit('la-window-change', { start: this._window.start, end: this._window.end });
    });

    this._winBar = _la_el('div', { class: 'la-window-bar' }, labelRow, wrap);
    return this._winBar;
  }

  _onThumbMove(e) {
    if (!this._dragState) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const rect = this._track.getBoundingClientRect();
    const ratio = _la_clamp((clientX - rect.left) / rect.width, 0, 1);
    const val = this._span.start + ratio * (this._span.end - this._span.start);
    const MIN_WIN = (this._span.end - this._span.start) * 0.005;  // 0.5% minimum window

    if (this._dragState.which === 'start') {
      this._window.start = _la_clamp(val, this._span.start, this._window.end - MIN_WIN);
    } else {
      this._window.end = _la_clamp(val, this._window.start + MIN_WIN, this._span.end);
    }
    this._updateWindowBar();
    this._renderCanvas();
    this._emit('la-window-change', { start: this._window.start, end: this._window.end });
  }

  _updateWindowBar() {
    if (!this._track) return;
    const totalSpan = this._span.end - this._span.start || 1;
    const leftPct  = ((this._window.start - this._span.start) / totalSpan) * 100;
    const rightPct = ((this._window.end   - this._span.start) / totalSpan) * 100;
    this._fill.style.left  = `${leftPct}%`;
    this._fill.style.width = `${rightPct - leftPct}%`;
    this._thumbL.style.left = `${leftPct}%`;
    this._thumbR.style.left = `${rightPct}%`;
    this._updateWindowValues();
  }

  _updateWindowValues() {
    if (!this._winValues) return;
    const u = this._opt.unit;
    this._winValues.textContent =
      `${this._la_fmt(this._window.start, u)} → ${this._la_fmt(this._window.end, u)}`;
    // Also update header meta
    if (this._headerMeta) {
      this._headerMeta.textContent =
        `${this._la_fmt(this._span.start, u)} – ${this._la_fmt(this._span.end, u)}`;
    }
  }

  /* ── Data ──────────────────────────────────────────────────────── */
  _setData(categories) {
    // Default categories expansion state according to defaultExpanded
    (categories || []).forEach(cat => {
      if (this._expanded[cat.id] === undefined) {
        this._expanded[cat.id] = !!this._opt.defaultExpanded;
      }
    });
    this._categories = categories || [];
    this._flattenRows();
    this._render();
  }

  /**
   * Dynamically update items for a specific category (useful for lazy loading)
   * @param {string} categoryId
   * @param {Array} items
   */
  setCategoryItems(categoryId, items) {
    const cat = (this._categories || []).find(c => c.id === categoryId);
    if (cat) {
      cat.items = items;
      this._loading[categoryId] = false;
      this._flattenRows();
      this._render();
    }
  }

  _flattenRows() {
    this._rows = [];
    for (const cat of this._categories) {
      // Category header row
      this._rows.push({ type: 'category', depth: 0, data: cat, categoryRef: cat });

      if (this._expanded[cat.id]) {
        this._pushItems(cat.items || [], cat, 1);
      }
    }
  }

  _pushItems(items, categoryRef, depth) {
    // Regrouper les items partageant la même clé logique (feature, id, ou label)
    const grouped = [];
    const keyMap = new Map();

    for (const item of items) {
      const groupKey = item.id;
      if (groupKey && keyMap.has(groupKey)) {
        keyMap.get(groupKey).segments.push(item);
      } else {
        const entry = {
          representative: item,
          segments: [item],
          children: item.children || item.items
        };
        if (groupKey) {
          keyMap.set(groupKey, entry);
        }
        grouped.push(entry);
      }
    }

    for (const entry of grouped) {
      const rep = entry.representative;
      const children = rep.children || rep.items || entry.children;
      this._rows.push({
        type: 'item',
        depth,
        data: rep,
        segments: entry.segments,
        categoryRef
      });

      const expandId = rep.id || rep.feature || rep.label;
      if (this._expanded[expandId] && children && children.length > 0) {
        this._pushItems(children, categoryRef, depth + 1);
      }
    }
  }

  /* ── Render ────────────────────────────────────────────────────── */
  _render() {
    this._renderTree();
    this._renderCanvas();
  }

  /* ── Tree panel ────────────────────────────────────────────────── */
  _renderTree() {
    this._treePanel.innerHTML = '';
    // Spacer row matching the ruler height
    this._treePanel.appendChild(
      _la_el('div', { class: 'la-ruler-row', style: { background: 'var(--la-ruler-bg)' } })
    );

    for (const row of this._rows) {
      this._treePanel.appendChild(this._buildTreeRow(row));
    }
  }

  _buildTreeRow(row) {
    const { type, depth, data, categoryRef } = row;
    const isCategory = type === 'category';
    const hasChildren = isCategory
      ? true
      : (data.hasChildren || data.children && data.children.length > 0);

    const rowEl = _la_el('div', {
      class: `la-row ${isCategory ? 'la-row-category' : ''}`,
      style: { minHeight: `${this._opt.rowHeight}px` }
    });

    // Indent spacer
    const indent = _la_el('span', {
      class: 'la-indent',
      style: { width: `${depth * 16 + 8}px` }
    });

    // Toggle button
    let toggle;
    if (hasChildren) {
      const toggleId = data.id || data.feature || data.label;
      const expanded = this._expanded[toggleId] === true;
      const isLoading = Boolean(this._loading[toggleId]);

      let iconHtml = expanded ? LA_ICONS.chevDown : LA_ICONS.chevRight;
      if (isLoading) iconHtml = LA_ICONS.spinner;

      toggle = _la_el('span', {
        class: `la-toggle${isLoading ? ' la-is-loading' : ''}`,
        html: iconHtml,
        onclick: async (e) => {
          e.stopPropagation();
          if (isLoading) return;

          const willExpand = !this._expanded[toggleId];
          this._expanded[toggleId] = willExpand;

          const existingChildren = data.children || data.items;
          const loader = typeof data.loadCategory === 'function'
            ? data.loadCategory
            : (isCategory && typeof this._opt.loadCategory === 'function' ? this._opt.loadCategory : null);

          // Si on déplie un nœud sans enfants déjà chargés et qu'un loader est configuré
          if (willExpand && (!existingChildren || existingChildren.length === 0) && loader) {
            this._loading[toggleId] = true;
            this._flattenRows();
            this._render();
            try {
              const children = await loader(data);
              if (Array.isArray(children)) {
                if (isCategory) {
                  data.items = children;
                } else {
                  data.children = children;
                }
              }
            } catch (err) {
              console.error('LinearAsset: error loading children data', err);
            } finally {
              this._loading[toggleId] = false;
            }
          }

          this._flattenRows();
          this._render();
          this._emit(isCategory ? 'la-category-toggle' : 'la-item-toggle', { item: data, expanded: this._expanded[toggleId] });
        }
      });
    } else {
      toggle = _la_el('span', { class: 'la-toggle', style: { visibility: 'hidden' } });
    }

    // Icon
    let iconEl = null;
    const iconName = data.icon || (isCategory ? 'feature' : null);
    if (iconName && LA_ICONS[iconName]) {
      iconEl = _la_el('span', {
        class: 'la-tree-icon',
        html: LA_ICONS[iconName],
        style: data.color ? { color: data.color } : {}
      });
    }

    // Label
    const label = _la_el('span', { class: 'la-tree-label' }, data.label || data.id || '');

    const cell = _la_el('div', { class: 'la-tree-cell' },
      indent, toggle, ...(iconEl ? [iconEl] : []), label
    );

    if (!isCategory) {
      cell.style.cursor = 'pointer';
      rowEl.addEventListener('click', () => {
        this._emit('la-item-click', { item: data, category: categoryRef });
      });
    }

    rowEl.appendChild(cell);
    return rowEl;
  }

  /* ── Canvas panel ──────────────────────────────────────────────── */
  _renderCanvas() {
    this._canvasPanel.innerHTML = '';

    const winStart = this._window.start;
    const winEnd   = this._window.end;
    const winSpan  = winEnd - winStart || 1;

    // Ruler
    this._canvasPanel.appendChild(this._buildRuler(winStart, winEnd, winSpan));

    // Full-span window overlay
    const overlayLeft  = 0;
    const overlayRight = 0;

    // Data rows
    for (const row of this._rows) {
      const rowEl = _la_el('div', {
        class: `la-row ${row.type === 'category' ? 'la-row-category' : ''}`,
        style: { minHeight: `${this._opt.rowHeight}px`, position: 'relative' }
      });

      const cellEl = _la_el('div', { class: 'la-canvas-cell' });

      if (row.type === 'item') {
        const segments = row.segments || [row.data];
        for (const seg of segments) {
          const isPoint = seg.endMeasure == null;

          if (isPoint) {
            // Point feature — positioned relative to window span
            const relPos = (seg.startMeasure - winStart) / winSpan;
            if (relPos >= -0.02 && relPos <= 1.02) {
              cellEl.appendChild(this._buildPoint(seg, relPos));
            }
          } else {
            // Rectangle feature — clip to window
            const s = Math.max(seg.startMeasure, winStart);
            const e = Math.min(seg.endMeasure,   winEnd);
            if (s < e) {
              const leftPct  = ((s - winStart) / winSpan) * 100;
              const widthPct = ((e - s) / winSpan) * 100;
              cellEl.appendChild(this._buildRect(seg, leftPct, widthPct));
            }
          }
        }
      }

      rowEl.appendChild(cellEl);
      this._canvasPanel.appendChild(rowEl);
    }
  }

  /* ── Ruler ──────────────────────────────────────────────────────── */
  _buildRuler(winStart, winEnd, winSpan) {
    const ruler = _la_el('div', { class: 'la-ruler-row' });
    const canvas = _la_el('div', { class: 'la-ruler-canvas' });
    ruler.appendChild(canvas);

    const n = this._opt.rulerTicks;
    // Choose a "nice" step
    const rawStep = winSpan / n;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const niceSteps = [1, 2, 2.5, 5, 10];
    let step = magnitude * niceSteps.find(s => magnitude * s >= rawStep) || magnitude;
    if (step === 0) step = 1;

    // Find first tick >= winStart
    const firstTick = Math.ceil(winStart / step) * step;

    for (let v = firstTick; v <= winEnd + step * 0.001; v += step) {
      const pct = ((v - winStart) / winSpan) * 100;
      if (pct < 0 || pct > 100.1) continue;
      const tick = _la_el('div', {
        class: 'la-ruler-tick',
        style: { left: `${pct}%` }
      });
      tick.appendChild(_la_el('span', { class: 'la-ruler-tick-label' },
        this._la_fmt(v, this._opt.unit)
      ));
      canvas.appendChild(tick);
    }

    return ruler;
  }

  /* ── Rectangle block ───────────────────────────────────────────── */
  _buildRect(item, leftPct, widthPct) {
    const color   = item.color || '#0f62fe';
    const feature = _la_el('div', {
      class: 'la-feature la-feature-rect',
      style: {
        left:       `${leftPct}%`,
        width:      `${Math.max(widthPct, 0.3)}%`,
        background: color,
        color:      '#fff',
      }
    });

    if (item.icon && LA_ICONS[item.icon]) {
      feature.appendChild(_la_el('span', { class: 'la-feature-icon', html: LA_ICONS[item.icon] }));
    }
    if (item.value) {
        feature.appendChild(_la_el('span', {class: 'la-feature-value', html: item.value}));
    }

    this._attachTooltip(feature, item);
    feature.addEventListener('click', () => {
      this._emit('la-item-click', { item, category: null });
    });

    return feature;
  }

  /* ── Point/circle feature ─────────────────────────────────────── */
  _buildPoint(item, relPos) {
    const color   = item.color || '#da1e28';
    const hasIcon = item.icon && LA_ICONS[item.icon];
    const feature = _la_el('div', {
      class: `la-feature la-feature-point${hasIcon ? ' la-has-icon' : ''}`,
      style: {
        left:       `${relPos * 100}%`,
        background: color,
        color:      '#fff',
      }
    });

    if (hasIcon) {
      feature.appendChild(_la_el('span', { html: LA_ICONS[item.icon], style: { lineHeight: '1' } }));
    }

    if (item.value) {
        feature.appendChild(_la_el('span', { class: 'la-feature-value', html: item.value}));
    }
    this._attachTooltip(feature, item);
    feature.addEventListener('click', () => {
      this._emit('la-item-click', { item, category: null });
    });

    return feature;
  }

  /* ── Tooltip ────────────────────────────────────────────────────── */
  _attachTooltip(el, item) {
    const text = item.tooltip || this._defaultTooltip(item);
    el.addEventListener('mouseenter', (e) => {
      this._tooltip.textContent = text;
      this._tooltip.classList.add('la-visible');
      this._positionTooltip(e);
    });
    el.addEventListener('mousemove', (e) => this._positionTooltip(e));
    el.addEventListener('mouseleave', () => {
      this._tooltip.classList.remove('la-visible');
    });
  }

  _positionTooltip(e) {
    const tip = this._tooltip;
    const margin = 10;
    let x = e.clientX + margin;
    let y = e.clientY - tip.offsetHeight - margin;
    if (x + tip.offsetWidth > window.innerWidth) {
      x = e.clientX - tip.offsetWidth - margin;
    }
    if (y < 0) y = e.clientY + margin;
    tip.style.left = `${x}px`;
    tip.style.top  = `${y}px`;
  }

  _defaultTooltip(item) {
    const u = this._opt.unit;
    const label = item.label || item.id || '';
    if (item.endMeasure == null) {
      return `${label}\nAt: ${this._la_fmt(item.startMeasure, u)}`;
    }
    return `${label}\n${this._la_fmt(item.startMeasure, u)} → ${this._la_fmt(item.endMeasure, u)}`;
  }

  /* ── Events ─────────────────────────────────────────────────────── */
  _emit(name, detail) {
    this._host.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }

  addEventListener(type, cb) {
    this._host.addEventListener(type, cb);
  }

  removeEventListener(type, cb) {
    this._host.removeEventListener(type, cb);
  }

  /* ── Public API ──────────────────────────────────────────────────── */

  /**
   * Replace all categories & items, then re-render.
   * @param {Array} categories
   */
  setData(categories) {
    this._setData(categories);
  }

  /**
   * Programmatically set the visible window span.
   * @param {number} start
   * @param {number} end
   */
  setWindow(start, end) {
    const totalSpan = this._span.end - this._span.start;
    const MIN_WIN = totalSpan * 0.005 || 0.001;
    this._window.start = _la_clamp(start, this._span.start, this._span.end - MIN_WIN);
    this._window.end   = _la_clamp(end,   this._window.start + MIN_WIN, this._span.end);
    this._updateWindowBar();
    this._renderCanvas();
  }

  /** @returns {{ start: number, end: number }} */
  getWindow() {
    return { ...this._window };
  }

  /**
   * Update the header title.
   * @param {string} title
   */
  setTitle(title) {
    this._opt.title = title;
    if (this._headerTitle) this._headerTitle.textContent = title;
  }

  /**
   * Change the full asset span (start/end measurement).
   * Resets the window to the full span.
   * @param {number} startPoint
   * @param {number} endPoint
   */
  setSpan(startPoint, endPoint) {
    this._span   = { start: startPoint, end: endPoint };
    this._window = { start: startPoint, end: endPoint };
    this._updateWindowBar();
    this._renderCanvas();
  }

  /** Remove the component from the DOM and clean up. */
  destroy() {
    if (this._tooltip && this._tooltip.parentNode) {
      this._tooltip.parentNode.removeChild(this._tooltip);
    }
    if (this._root && this._root.parentNode) {
      this._root.parentNode.removeChild(this._root);
    }
  }
}

window.LinearAsset = LinearAsset;