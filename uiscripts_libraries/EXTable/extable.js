/**
 * MaximoTable — Maximo-style data table component
 * Pure vanilla JS + CSS (no external libraries)
 *
 * Usage:
 *   const t = new MaximoTable('#container', {
 *     title: 'Work Orders',
 *     storageKey: 'wo-table-layout',
 *     pageSize: 25,
 *     columns: [ { key:'wonum', label:'WO #', width:120, type:'text' }, ... ],
 *     actions: [ { label:'New', variant:'primary', icon:'plus', onClick(sel){ ... } }, ... ]
 *   });
 *   t.setData(rows);
 *
 * Column definition options:
 *   key        {string}   — data property name
 *   label      {string}   — header label
 *   width      {number}   — initial width in px
 *   visible    {boolean}  — shown by default
 *   sortable   {boolean}  — sortable (default true)
 *   type       {string}   — cell type (see below)
 *   format     {object}   — optional format options per type (see below)
 *
 * Column types & format options:
 *   'text'      — plain string; no format options
 *   'integer'   — integer number
 *                 format: { locale, grouping }  (Intl.NumberFormat options)
 *   'float'     — floating-point number
 *                 format: { locale, minimumFractionDigits, maximumFractionDigits, ... }
 *   'boolean'   — true/false; shown as ✓ / ✗ (or '' when blank)
 *                 format: { trueLabel:'✓', falseLabel:'✗', blankLabel:'' }
 *   'date'      — date only (value: Date | ISO string | timestamp)
 *                 format: Intl.DateTimeFormat options  e.g. { locale:'en-US', dateStyle:'medium' }
 *   'datetime'  — date + time
 *                 format: Intl.DateTimeFormat options  e.g. { locale:'en-US', dateStyle:'short', timeStyle:'short' }
 *   'time'      — time only
 *                 format: Intl.DateTimeFormat options  e.g. { locale:'en-US', timeStyle:'short' }
 *   'duration'  — numeric seconds → H:MM:SS (or custom)
 *                 format: { style:'hms' | 'hm' | 'ms' | 'custom', separator:':',
 *                           showHours:true, showSeconds:true }
 *   'image'     — value is an image URL → <img>
 *                 format: { width, height, alt }
 *   'button'    — single action button
 *                 col.label     — button text
 *                 col.onclick   — function(row, rowIndex, col)
 *                 format: { variant:'primary'|'secondary'|'danger' }
 *   'actions'   — multiple action buttons per cell
 *                 col.actions: [ { label, icon, onclick(row, rowIndex, col), variant, tooltip } ]
 *
 * Events (dispatched on the host element):
 *   data-changed   → detail: { data }
 *   row-selected   → detail: { row, selected, allSelected }
 *   filter-toggled → detail: { open }
 */

/* ── SVG icon library ──────────────────────────────────────── */
const ICONS = {
  filter:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M18 28L14 24.6V18L4 6.2V4H28v2.2L18 18zM6.6 6L16 17.4V23.4L18 25V17.4L27.4 6z"/></svg>`,
  collapse: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M24 12L16 20 8 12 9.4 10.6 16 17.2 22.6 10.6z"/></svg>`,
  expand:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M8 20L16 12 24 20 22.6 21.4 16 14.8 9.4 21.4z"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M26 24v4H6v-4H4v4a2 2 0 002 2h20a2 2 0 002-2v-4zM26 14l-1.4-1.4L17 20.2V4h-2v16.2L7.4 12.6 6 14l10 10z"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M27 16.8V15.2l1.9-2.1-2-3.5-2.7.8-1.2-.7-.8-2.7H19l-.8 2.7-1.2.7-2.7-.8-2 3.5 1.9 2.1v1.6l-1.9 2.1 2 3.5 2.7-.8 1.2.7.8 2.7h3.2l.8-2.7 1.2-.7 2.7.8 2-3.5zM20.6 20a4 4 0 110-8 4 4 0 010 8z"/><path d="M9.3 7.4l.8-2.4H7.8L7 7.4l-1 .6-2.4-.7-1.6 2.8 1.6 1.8v1.4L1.9 15l1.7 2.8 2.4-.7 1 .6.7 2.3h2.3l.7-2.3 1-.6 2.4.7 1.6-2.8-1.6-1.8v-1.4l1.6-1.8-1.6-2.8-2.4.7zm-.8 8a3.4 3.4 0 110-6.8 3.4 3.4 0 010 6.8z"/></svg>`,
  sortUp:   `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 32 32" fill="currentColor"><path d="M8 20L16 12 24 20z"/></svg>`,
  sortDown: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 32 32" fill="currentColor"><path d="M8 12L16 20 24 12z"/></svg>`,
  sortBoth: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 32 32" fill="currentColor"><path d="M16 4L8 12h16zM16 28l8-8H8z"/></svg>`,
  dragH:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><circle cx="12" cy="8" r="2"/><circle cx="20" cy="8" r="2"/><circle cx="12" cy="16" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="12" cy="24" r="2"/><circle cx="20" cy="24" r="2"/></svg>`,
  eye:      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M16 6C6 6 2 16 2 16s4 10 14 10 14-10 14-10S26 6 16 6zm0 16a6 6 0 110-12 6 6 0 010 12z"/><circle cx="16" cy="16" r="3"/></svg>`,
  eyeOff:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M5.7 4.3L3.3 6.7 8.5 12A14.4 14.4 0 002 16s4 10 14 10a13.8 13.8 0 007.4-2.2l3.9 3.9 2.4-2.4zM16 24a6 6 0 01-4.6-9.8l2 2A3 3 0 0016 22a3 3 0 001-.2l2.2 2.2A6 6 0 0116 24zM30 16s-4-10-14-10a13.8 13.8 0 00-5.6 1.2l2.2 2.2A6 6 0 0122 16a6 6 0 01-.6 2.6l2.2 2.2A14.3 14.3 0 0030 16z"/></svg>`,
  chevL:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M20 24L11.4 16 20 8l-1.4-1.4L8.6 16 18.6 25.4z"/></svg>`,
  chevR:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M12 8l8.6 8L12 24l1.4 1.4L23.4 16 13.4 6.6z"/></svg>`,
  chevLL:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M14 16l7-7-1.4-1.4L11.2 16l8.4 8.4L21 23zM6 8v16h2V8z"/></svg>`,
  chevRR:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M18 16L11 9l1.4-1.4L20.8 16l-8.4 8.4L11 23zM24 8v16h2V8z"/></svg>`,
  plus:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M17 15V8h-2v7H8v2h7v7h2v-7h7v-2z"/></svg>`,
  trash:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M12 12h2v12h-2zm6 0h2v12h-2zM4 6v2h2l2 20h16l2-20h2V6zm5.8 20L10 8h12l.2 18zM12 2h8v2h-8z"/></svg>`,
  close:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6z"/></svg>`,
};

/* ── Utility helpers ───────────────────────────────────────── 
Create an element "tag", set the attributes
*/
function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') e.className = v;
    else if (k === 'style') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v);
  });
  children.flat().forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}

function iconBtn(iconName, tooltip, onClick, extraClass = '') {
  const btn = el('button', {
    class: `mx-icon-btn${extraClass ? ' ' + extraClass : ''}`,
    type: 'button',
    'data-tooltip': tooltip,
    'aria-label': tooltip,
    html: ICONS[iconName],
    onclick: onClick,
  });
  return btn;
}

/*function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
*/

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepClone);
  }

  const clone = {};
  Object.keys(obj).forEach(key => {
    clone[key] = deepClone(obj[key]);
  });
  return clone;
}


function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── Default column definition ─────────────────────────────── */
const DEFAULT_COLUMNS = [
  { key: 'id',       label: 'ID',          width: 80,  type: 'text',     visible: true,  sortable: true },
  { key: 'name',     label: 'Name',         width: 180, type: 'text',     visible: true,  sortable: true },
  { key: 'status',   label: 'Status',       width: 120, type: 'text',     visible: true,  sortable: true },
  { key: 'priority', label: 'Priority',     width: 100, type: 'text',     visible: true,  sortable: true },
  { key: 'active',   label: 'Active',       width: 80,  type: 'boolean',  visible: true,  sortable: true },
  { key: 'date',     label: 'Date',         width: 130, type: 'text',     visible: true,  sortable: true },
  { key: 'owner',    label: 'Owner',        width: 150, type: 'text',     visible: true,  sortable: true },
  { key: 'location', label: 'Location',     width: 150, type: 'text',     visible: false, sortable: true },
  { key: 'cost',     label: 'Cost',         width: 100, type: 'text',     visible: false, sortable: true },
  { key: 'notes',    label: 'Notes',        width: 200, type: 'text',     visible: false, sortable: true },
];

const scriptContext = this;
/* ── MaximoTable class ──────────────────────────────────────── */
class MaximoTable {
  /**
   * @param {string|HTMLElement} container  CSS selector or DOM element
   * @param {object}            options
   * @param {string}            options.title
   * @param {string}            [options.storageKey]   localStorage key for column layout
   * @param {Array}             [options.columns]      column definitions
   * @param {number}            [options.pageSize]     rows per page (default 25)
   * @param {number[]}          [options.pageSizes]    page size options
   * @param {Array}             [options.actions]      toolbar action buttons
   * @param {boolean}           [options.multiSelect]  allow multi-row select
   */
  constructor(container, options = {}) {
    this._root = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    if (!this._root) throw new Error('MaximoTable: container not found');

    this._opts = Object.assign({
      title: 'Table',
      storageKey: null,
      columns: DEFAULT_COLUMNS,
      pageSize: 25,
      pageSizes: [10, 25, 50, 100],
      actions: [],
      multiSelect: true,
    }, options);

    /* State */
    this._allData     = [];       // full dataset
    this._filtered    = [];       // after filter
    this._page        = 1;
    this._pageSize    = this._opts.pageSize;
    this._sortKey     = null;
    this._sortDir     = 'asc';    // 'asc' | 'desc'
    this._filterOpen  = true;
    this._collapsed   = false;
    this._filterValues= {};       // { colKey: value }
    this._selected    = new Set();// selected row indices in _allData
    this._columns     = [];       // active column layout

    /* Column resize state */
    this._resizing    = null;

    /* Column drag state */
    this._dragSrcIdx  = null;

    this._loadColumns();
    this._build();
  }

  addEventListener(type, cb) {
      this._root.addEventListener(type, cb);
  }

  removeEventListener(type, cb) {
     this._root.removeEventListener(type, cb);
  }
  
  getPageSize() {
      return this._pageSize;
  }

  /* ── Column layout (localStorage) ────────────────────────── */
  _loadColumns() {
    const key = this._opts.storageKey;
    if (key) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const layout = JSON.parse(saved);
          // Merge with default definitions (to pick up any new columns added to defaults)
          const defaults = deepClone(this._opts.columns);
          this._columns = layout.map(l => {
            const def = defaults.find(d => d.key === l.key);
            return def ? Object.assign(def, l) : null;
          }).filter(Boolean);
          // Append any default columns not present in saved layout
          defaults.forEach(d => {
            if (!this._columns.find(c => c.key === d.key)) this._columns.push(d);
          });
          return;
        }
      } catch (_) { /* ignore corrupt storage */ }
    }
    this._columns = deepClone(this._opts.columns);
  }

  _saveColumns() {
    const key = this._opts.storageKey;
    if (!key) return;
    const layout = this._columns.map(c => ({ key: c.key, visible: c.visible, width: c.width }));
    localStorage.setItem(key, JSON.stringify(layout));
  }

  _resetColumns() {
    const key = this._opts.storageKey;
    if (key) localStorage.removeItem(key);
    this._columns = deepClone(this._opts.columns);
    this._saveColumns();
    this._rebuildTable();
  }

  /* ── Build DOM ────────────────────────────────────────────── */
  _build() {
    this._root.innerHTML = '';
    this._root.classList.add('mx-table-host');

    /* Toolbar */
    this._toolbarEl = this._buildToolbar();
    this._root.appendChild(this._toolbarEl);

    /* Action bar */
    this._actionBarEl = this._buildActionBar();
    if (this._actionBarEl) this._root.appendChild(this._actionBarEl);

    /* Table scroll wrapper */
    this._wrapEl = el('div', { class: 'mx-table-wrap' });
    this._tableEl = el('table', { class: 'mx-table', role: 'grid' });
    this._theadEl = el('thead');
    this._tbodyEl = el('tbody');
    this._tableEl.appendChild(this._theadEl);
    this._tableEl.appendChild(this._tbodyEl);
    this._wrapEl.appendChild(this._tableEl);
    this._root.appendChild(this._wrapEl);

    /* Footer */
    this._footerEl = this._buildFooter();
    this._root.appendChild(this._footerEl);

    this._renderHead();
    this._renderBody();
    this._renderFooter();

    this._building = true;
    this.retrieveData();
    this._building = false;
  }

  /* ── Toolbar ──────────────────────────────────────────────── */
  _buildToolbar() {
    const toolbar = el('div', { class: 'mx-toolbar', role: 'toolbar' });

    const title = el('span', { class: 'mx-toolbar-title' }, this._opts.title);
    toolbar.appendChild(title);

    const actions = el('div', { class: 'mx-toolbar-actions' });

    this._btnFilter = iconBtn('filter', 'Toggle filters', () => this._toggleFilter());
    this._btnCollapse = iconBtn('collapse', 'Collapse', () => this._toggleCollapse());
    const btnDownload = iconBtn('download', 'Download CSV', () => this._downloadCSV());
    this._btnLayout = iconBtn('settings', 'Edit layout', () => this._openColumnManager());

    actions.appendChild(this._btnFilter);
    actions.appendChild(el('div', { class: 'mx-toolbar-divider' }));
    actions.appendChild(this._btnCollapse);
    actions.appendChild(el('div', { class: 'mx-toolbar-divider' }));
    actions.appendChild(btnDownload);
    actions.appendChild(this._btnLayout);

    toolbar.appendChild(actions);
    return toolbar;
  }

  /* ── Action bar ───────────────────────────────────────────── */
  _buildActionBar() {
    if (!this._opts.actions || !this._opts.actions.length) return null;
    const bar = el('div', { class: 'mx-action-bar', role: 'toolbar' });
    this._opts.actions.forEach(action => {
      const variant = action.variant || 'secondary';
      const btn = el('button', {
        class: `mx-btn mx-btn--${variant}`,
        type: 'button',
        html: (action.icon ? ICONS[action.icon] || '' : '') +
              `<span>${action.label}</span>`,
        onclick: () => {
          const selected = [...this._selected].map(i => this._allData[i]);
          if (action.onClick) action.onClick(selected, this);
        },
      });
      bar.appendChild(btn);
    });
    return bar;
  }

  getColumns() {
    return this._columns.filter(c => c.visible);
  }
  
  getDataKeys() {
      return this._columns.filter(c => c.visible).map( c => c.key).filter( k => k != undefined);
  }
  
  setFilters(filters) {
      this._filterValues = Object.fromEntries( Object.entries(filters).map(([key, value]) => [key.toLowerCase(), value]));
      this._renderHead();
  }

  async retrieveData() {
    const count = this.getPageSize();
    let filter = this._filterValues;
    let sort = undefined;
    if ( this._sortKey ) {
        sort = {};
        sort[this._sortKey] = (this._sortDir === "desc");
    }
    if ( Object.keys(filter).length == 0 ) {
        filter = undefined;
    }
    const data = await scriptContext.getData(this._opts.dataSourceId, this.getDataKeys(), filter, sort, (this._page - 1) * count, count);
    if ( data && data.status === "ok" ) {
        debugger;
        this.setFilters(data.currentFilter);
        this._totalCount = data.count;
        this.setSelected(data.currentRow);
        this.setData(data.data, data.currentRow);   
    } else {
        this.setData([]);
        console.log(data);
    }
  }
  
  setSelected(rownums) {
      if ( typeof(rownums) != Array) rownums = [rownums];
      this._selected = new Set(rownums);
      this._renderBody();
  }
  
  /* ── Column header + filter row ───────────────────────────── */
  _renderHead() {
    this._theadEl.innerHTML = '';
    const visibleCols = this._columns.filter(c => c.visible);

    /* ── Header row ── */
    const hRow = el('tr', { class: 'mx-col-headers', role: 'row' });

    // Checkbox col
    /*const thCheck = el('th', { class: 'mx-th-check', role: 'columnheader' });
    this._selectAllChk = el('input', {
      type: 'checkbox',
      class: 'mx-row-checkbox',
      'aria-label': 'Select all',
      onchange: e => this._selectAll(e.target.checked),
    });
    thCheck.appendChild(this._selectAllChk);
    hRow.appendChild(thCheck);*/

    visibleCols.forEach((col, i) => {
      const th = el('th', {
        role: 'columnheader',
        'data-key': col.key,
        style: { width: col.width + 'px', minWidth: '60px' },
      });
      this._attachColumnDrag(th, i);

      const inner = el('div', { class: 'mx-th-inner' });
      const label = el('span', { class: 'mx-th-label' }, col.label);
      inner.appendChild(label);

      if (col.sortable !== false) {
        let iconName = 'sortBoth';
        let iconClass = 'mx-sort-icon';
        if (this._sortKey === col.key) {
          iconName = this._sortDir === 'asc' ? 'sortUp' : 'sortDown';
          iconClass += this._sortDir === 'asc' ? ' mx-sort-icon--asc' : ' mx-sort-icon--desc';
        }
        const sortIcon = el('span', { class: iconClass, html: ICONS[iconName] });
        inner.appendChild(sortIcon);
        inner.addEventListener('click', () => this._sort(col.key));
      }

      th.appendChild(inner);

      // Resize handle
      const rHandle = el('div', { class: 'mx-resize-handle' });
      this._attachResize(rHandle, col, th);
      th.appendChild(rHandle);

      hRow.appendChild(th);
    });

    this._theadEl.appendChild(hRow);

    /* ── Filter row ── */
    const fRow = el('tr', {
      class: 'mx-filter-row' + (this._filterOpen ? '' : ' mx-hidden'),
      role: 'row',
    });
    this._filterRowEl = fRow;

    // Empty cell for checkbox column
    //fRow.appendChild(el('th'));

    visibleCols.forEach(col => {
      const fTh = el('th');
      const type = col.type || 'text';

      if (type === 'boolean') {
        // Three-state checkbox: indeterminate=no filter, checked=true, unchecked=false
        const wrap = el('div', { class: 'mx-filter-check-wrap' });
        const chk = el('input', {
          type: 'checkbox',
          class: 'mx-filter-checkbox',
          'aria-label': 'Filter ' + col.label,
          'data-key': col.key,
        });
        chk.indeterminate = true;
        chk._state = 0; // 0=none, 1=true, 2=false
        chk.addEventListener('click', e => {
          e.preventDefault();
          chk._state = (chk._state + 1) % 3;
          if (chk._state === 0) { chk.indeterminate = true; chk.checked = false; }
          else if (chk._state === 1) { chk.indeterminate = false; chk.checked = true; }
          else { chk.indeterminate = false; chk.checked = false; }
          this._filterValues[col.key] = chk._state;
          this._applyFiltersDebounced();
        });
        wrap.appendChild(chk);
        fTh.appendChild(wrap);
      } else if (type === 'image' || type === 'button' || type === 'actions') {
        // No filter for purely visual / interactive columns
      } else {
        // Determine the best native input type for the column
        const inputType =
          type === 'date'     ? 'date'           :
          type === 'datetime' ? 'datetime-local'  :
          type === 'time'     ? 'time'            :
          (type === 'integer' || type === 'float' || type === 'duration') ? 'number' :
          'text';

        const inp = el('input', {
          type: inputType,
          class: 'mx-filter-input',
          placeholder: inputType === 'text' ? col.label : '',
          'aria-label': 'Filter ' + col.label,
          'data-key': col.key,
          value: this._filterValues[col.key] || '',
        });
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            this._filterValues[col.key] = e.target.value;
            this._applyFilters();
          }
        });
        // date / time / datetime-local fire 'change' on picker selection — commit immediately
        if (inputType !== 'text' && inputType !== 'number') {
          inp.addEventListener('change', e => {
            this._filterValues[col.key] = e.target.value;
            this._applyFilters();
          });
        }
        fTh.appendChild(inp);
      }
      fRow.appendChild(fTh);
    });

    this._theadEl.appendChild(fRow);
  }

    _handleRowClick(e, row, globalIdx, tr) {
      // Ignore clicks coming from interactive elements.
      if (e.target.closest('button, input, select, textarea, a')) {
        return;
    
      }
    
      // If another click is already waiting, this is a double click.
      if (tr._clickTimer) {
        clearTimeout(tr._clickTimer);
        tr._clickTimer = null;
    
        this.setSelected(globalIdx);
        // Also expose it as a DOM event.
        this._emit('row-double-click', {
          table: this,
          row: row,
          selectedIndex: (this._page - 1) * this._pageSize + globalIdx,
          event: e
        });
        return;
      }
    
      // Wait briefly before treating the click as a single click.
      tr._clickTimer = setTimeout(() => {
        tr._clickTimer = null;
        this._toggleSelect(globalIdx, tr);
      }, 250);
    }
    
  /* ── Cell formatter ───────────────────────────────────────── */
  /**
   * Returns either a plain string (for text-based cells) or an HTMLElement
   * (for image / button / actions cells).
   * `_isCellElement(result)` distinguishes the two cases.
   */
  _formatCell(col, val, row, globalIdx) {
    const fmt = col.format || {};
    const type = col.type || 'text';

    switch (type) {

      /* ── integer ── */
      case 'integer': {
        if (val == null || val === '') return '';
        const n = Number(val);
        if (isNaN(n)) return String(val);
        const opts = Object.assign({ maximumFractionDigits: 0 }, fmt);
        const locale = opts.locale; delete opts.locale;
        return new Intl.NumberFormat(locale, opts).format(Math.round(n));
      }

      /* ── float ── */
      case 'float': {
        if (val == null || val === '') return '';
        const n = Number(val);
        if (isNaN(n)) return String(val);
        const opts = Object.assign({ minimumFractionDigits: 2, maximumFractionDigits: 2 }, fmt);
        const locale = opts.locale; delete opts.locale;
        return new Intl.NumberFormat(locale, opts).format(n);
      }

      /* ── boolean ── */
      case 'boolean': {
        if (val == null || val === '') return fmt.blankLabel != null ? fmt.blankLabel : '';
        return val ? (fmt.trueLabel  != null ? fmt.trueLabel  : '✓')
                   : (fmt.falseLabel != null ? fmt.falseLabel : '✗');
      }

      /* ── date ── */
      case 'date': {
        if (val == null || val === '') return '';
        const d = val instanceof Date ? val : new Date(val);
        if (isNaN(d)) return String(val);
        const opts = Object.assign({ dateStyle: 'medium' }, fmt);
        const locale = opts.locale; delete opts.locale;
        return new Intl.DateTimeFormat(locale, opts).format(d);
      }

      /* ── datetime ── */
      case 'datetime': {
        if (val == null || val === '') return '';
        const d = val instanceof Date ? val : new Date(val);
        if (isNaN(d)) return String(val);
        const opts = Object.assign({ dateStyle: 'medium', timeStyle: 'short' }, fmt);
        const locale = opts.locale; delete opts.locale;
        return new Intl.DateTimeFormat(locale, opts).format(d);
      }

      /* ── time ── */
      case 'time': {
        if (val == null || val === '') return '';
        // val may be a Date, ISO string, or "HH:MM:SS" string
        if (typeof val === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(val)) return val;
        const d = val instanceof Date ? val : new Date(val);
        if (isNaN(d)) return String(val);
        const opts = Object.assign({ timeStyle: 'short' }, fmt);
        const locale = opts.locale; delete opts.locale;
        return new Intl.DateTimeFormat(locale, opts).format(d);
      }

      /* ── duration ── */
      case 'duration': {
        if (val == null || val === '') return '';
        const totalSec = Math.round(Number(val));
        if (isNaN(totalSec)) return String(val);
        const h   = Math.floor(totalSec / 3600);
        const m   = Math.floor((totalSec % 3600) / 60);
        const s   = totalSec % 60;
        const sep = fmt.separator != null ? fmt.separator : ':';
        const style = fmt.style || 'hms';
        const pad = n => String(n).padStart(2, '0');
        if (style === 'hm')  return `${h}${sep}${pad(m)}`;
        if (style === 'ms')  return `${m}${sep}${pad(s)}`;
        return `${h}${sep}${pad(m)}${sep}${pad(s)}`;
      }

      /* ── image ── */
      case 'image': {
        const attrs = { src: val || '', class: 'mx-cell-img' };
        if (fmt.width)  attrs.width  = String(fmt.width);
        if (fmt.height) attrs.height = String(fmt.height);
        if (fmt.alt)    attrs.alt    = fmt.alt;
        return el('img', attrs);
      }

      /* ── button ── */
      case 'button': {
        const variant = (fmt && fmt.variant) || 'secondary';
        const btn = el('button', {
          class: `mx-btn mx-btn--${variant} mx-cell-btn`,
          type: 'button',
          title: fmt.tooltip || col.label || '',
          onclick: e => { e.stopPropagation(); col.onclick && col.onclick(row, globalIdx, col); },
        }, col.label || '');
        return btn;
      }

      /* ── actions (multiple buttons) ── */
      case 'actions': {
        const wrap = el('div', { class: 'mx-cell-actions' });
        (col.actions || []).forEach(action => {
          const variant = action.variant || 'secondary';
          const btnEl = el('button', {
            class: `mx-btn mx-btn--${variant} mx-cell-btn`,
            type: 'button',
            title: action.tooltip || action.label || '',
            html: (action.icon ? (ICONS[action.icon] || '') : '') +
                  (action.label ? `<span>${action.label}</span>` : ''),
            onclick: e => { e.stopPropagation(); action.onclick && action.onclick(row, globalIdx, action); },
          });
          wrap.appendChild(btnEl);
        });
        return wrap;
      }

      /* ── text (default) ── */
      default:
        return val == null ? '' : String(val);
    }
  }

  /* ── Body ─────────────────────────────────────────────────── */
  _renderBody() {
    this._tbodyEl.innerHTML = '';
    const visibleCols = this._columns.filter(c => c.visible);
    const pageData = this._getPageData();

    if (pageData.length === 0) {
      const colspan = visibleCols.length + 1;
      this._tbodyEl.appendChild(
        el('tr', { class: 'mx-empty-row' },
          el('td', { colspan: String(colspan) }, 'No records found.')
        )
      );
      return;
    }

    pageData.forEach(({ row, globalIdx }) => {
      const tr = el('tr', {
        class: this._selected.has(globalIdx + (this._pageSize*(this._page-1))) ? 'mx-row--selected' : '',
        'data-idx': String(globalIdx),
        role: 'row',
        onclick: e => {
            this._handleRowClick(e, row, globalIdx, tr);
        },
      });

      visibleCols.forEach(col => {
        const val = row[col.key];
        const result = this._formatCell(col, val, row, globalIdx);
        if (result instanceof HTMLElement) {
          const td = el('td', { class: 'mx-td-widget' });
          td.appendChild(result);
          tr.appendChild(td);
        } else {
          tr.appendChild(el('td', { title: result }, result));
        }
      });

      this._tbodyEl.appendChild(tr);
    });
  }

  /* ── Footer ───────────────────────────────────────────────── */
  _buildFooter() {
    const footer = el('div', { class: 'mx-footer', role: 'navigation', 'aria-label': 'Pagination' });

    this._summaryEl = el('span', { class: 'mx-footer-summary' });

    // Page size selector
    const sizeWrap = el('div', { class: 'mx-page-size-wrap' });
    sizeWrap.appendChild(document.createTextNode('Rows per page:'));
    this._pageSizeSelect = el('select', {
      class: 'mx-page-size-select',
      'aria-label': 'Rows per page',
      onchange: e => {
        this._pageSize = parseInt(e.target.value, 10);
        this.retrieveData();
      },
    });
    this._opts.pageSizes.forEach(s => {
      const opt = el('option', { value: String(s) }, String(s));
      if (s == this._pageSize) opt.selected = true;
      this._pageSizeSelect.appendChild(opt);
    });
    sizeWrap.appendChild(this._pageSizeSelect);

    this._paginationEl = el('div', { class: 'mx-pagination' });

    footer.appendChild(this._summaryEl);
    footer.appendChild(sizeWrap);
    footer.appendChild(this._paginationEl);

    return footer;
  }

  _renderFooter() {
    const total = this._totalCount || 0;
    const totalPages = Math.max(1, Math.ceil(total / this._pageSize));
    if (this._page > totalPages) this._page = totalPages;

    const start = total === 0 ? 0 : (this._page - 1) * this._pageSize + 1;
    const end   = Math.min(this._page * this._pageSize, total);
    this._summaryEl.textContent = `${start}–${end} / ${total}`;

    // Pagination buttons
    this._paginationEl.innerHTML = '';

    const addPageBtn = (html, title, page, disabled, active) => {
      const btn = el('button', {
        class: 'mx-page-btn' + (active ? ' mx-page-btn--active' : ''),
        type: 'button',
        'aria-label': title,
        'aria-current': active ? 'page' : undefined,
        html,
      });
      if (disabled) btn.disabled = true;
      else btn.addEventListener('click', () => {
        this._page = page;
        this.retrieveData();
        /*this._renderBody();
        this._renderFooter();*/
      });
      this._paginationEl.appendChild(btn);
    };

    addPageBtn(ICONS.chevLL, 'First page',    1,           this._page === 1, false);
    addPageBtn(ICONS.chevL,  'Previous page', this._page - 1, this._page === 1, false);

    // Page number buttons — show at most 5 pages
    const maxButtons = 5;
    let startPage = Math.max(1, this._page - Math.floor(maxButtons / 2));
    let endPage   = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);

    for (let p = startPage; p <= endPage; p++) {
      addPageBtn(String(p), `Page ${p}`, p, false, p === this._page);
    }

    addPageBtn(ICONS.chevR,  'Next page',     this._page + 1, this._page === totalPages, false);
    addPageBtn(ICONS.chevRR, 'Last page',     totalPages,     this._page === totalPages, false);
  }

  /* ── Data & filtering ─────────────────────────────────────── */
  /**
   * Set the table data.
   * @param {Array<object>} data
   */
  setData(data, currentRow) {
    this._allData  = Array.isArray(data) ? data : [];
    
    if ( this._building ) {
        this._page = Math.floor(currentRow / this._pageSize) + 1;
    }
    
    if ( typeof(currentRow) != Array) currentRow = [currentRow];
     this._selected = new Set(currentRow);
     
    this._renderBody();
    this._renderFooter();
    
    this._emit('data-changed', { data: this._allData });
  }

  _applyFilters() {
      this._emit('filter-changed', { filter: this._filterValues});
  }

  _applyFiltersDebounced = debounce(() => this._applyFilters(), 200);

  _sortData() {
    if (!this._sortKey) return;
    const key = this._sortKey;
    const dir = this._sortDir === 'asc' ? 1 : -1;
    this._filtered.sort((a, b) => {
      const va = a[key] ?? '';
      const vb = b[key] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  _getPageData() {
    return this._allData.map(row => ({
      row,
      globalIdx: this._allData.indexOf(row),
    }));
  }

  /* ── Sort ─────────────────────────────────────────────────── */
  _sort(key) {
    if (this._sortKey === key) {
      this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this._sortKey = key;
      this._sortDir = 'asc';
    }
    this._emit("sort-changed", {sort: {[this._sortKey]: this._sortDir}});

  }

  /* ── Selection ────────────────────────────────────────────── */
  _toggleSelect(idx, tr, forceValue) {
    const isSelected = forceValue !== undefined ? forceValue : !this._selected.has(idx);

    if (!this._opts.multiSelect) this._selected.clear();

    if (isSelected) this._selected.add(idx);
    else this._selected.delete(idx);

    // Update row classes and checkboxes
    this._tbodyEl.querySelectorAll('tr[data-idx]').forEach(row => {
      const i = parseInt(row.dataset.idx, 10);
      const sel = this._selected.has(i);
      row.classList.toggle('mx-row--selected', sel);
      const chk = row.querySelector('.mx-row-checkbox');
      if (chk) chk.checked = sel;
    });

    // Update select-all checkbox
    const allVisible = this._allData.every(({ globalIdx }) => this._selected.has(globalIdx));
    if (this._selectAllChk) this._selectAllChk.checked = allVisible && this._allData.length > 0;

    this._emit('row-selected', {
      row: this._allData[idx],
      selected: this._selected.has(idx),
      selectedIndex: (this._page - 1) * this._pageSize + idx,
      allSelected: [...this._selected].map(i => this._allData[i]),
    });
  }

  _selectAll(checked) {
    this._allData.forEach(({ globalIdx }) => {
      if (checked) this._selected.add(globalIdx);
      else this._selected.delete(globalIdx);
    });
    this._renderBody();
    this._renderFooter();
  }

  /* ── Filter toggle ────────────────────────────────────────── */
  _toggleFilter() {
    this._filterOpen = !this._filterOpen;
    this._filterRowEl.classList.toggle('mx-hidden', !this._filterOpen);
    this._btnFilter.classList.toggle('mx-icon-btn--active', this._filterOpen);
    this._emit('filter-toggled', { open: this._filterOpen });
  }

  /* ── Collapse/expand ──────────────────────────────────────── */
  _toggleCollapse() {
    this._collapsed = !this._collapsed;
    this._root.classList.toggle('mx-collapsed', this._collapsed);
    this._btnCollapse.innerHTML = ICONS[this._collapsed ? 'expand' : 'collapse'];
    this._btnCollapse.setAttribute('data-tooltip', this._collapsed ? 'Expand' : 'Collapse');
    this._btnCollapse.setAttribute('aria-label', this._collapsed ? 'Expand' : 'Collapse');
  }

  /* ── CSV download ─────────────────────────────────────────── */
  _downloadCSV() {
    // Columns that produce DOM elements (image/button/actions) are excluded from CSV
    const NO_CSV_TYPES = new Set(['image', 'button', 'actions']);
    const visibleCols = this._columns.filter(c => c.visible && !NO_CSV_TYPES.has(c.type));
    const header = visibleCols.map(c => `"${c.label}"`).join(',');
    const rows = this._filtered.map(row =>
      visibleCols.map(col => {
        const val = row[col.key] ?? '';
        const formatted = this._formatCell(col, val, row, -1);
        const text = formatted instanceof HTMLElement ? '' : formatted;
        return `"${text.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [header, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = el('a', { href: url, download: `${this._opts.title}.csv` });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
  }

  /* ── Column resize ────────────────────────────────────────── */
  _attachResize(handle, col, th) {
    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = col.width;

      handle.classList.add('mx-resize-handle--active');

      const onMove = mv => {
        const delta = mv.clientX - startX;
        col.width = Math.max(60, startW + delta);
        th.style.width = col.width + 'px';
      };

      const onUp = () => {
        handle.classList.remove('mx-resize-handle--active');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        this._saveColumns();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  /* ── Column drag reorder (header) ─────────────────────────── */
  _attachColumnDrag(th, visIdx) {
    th.draggable = true;
    th.addEventListener('dragstart', e => {
      this._dragSrcIdx = visIdx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(visIdx));
      th.style.opacity = '0.5';
    });
    th.addEventListener('dragend', () => { th.style.opacity = ''; this._clearDragOver(); });
    th.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this._clearDragOver();
      th.classList.add('mx-th--drag-over');
    });
    th.addEventListener('dragleave', () => th.classList.remove('mx-th--drag-over'));
    th.addEventListener('drop', e => {
      e.preventDefault();
      th.classList.remove('mx-th--drag-over');
      if (this._dragSrcIdx === null || this._dragSrcIdx === visIdx) return;
      this._moveColumn(this._dragSrcIdx, visIdx);
    });
  }

  _clearDragOver() {
    this._theadEl.querySelectorAll('.mx-th--drag-over')
      .forEach(t => t.classList.remove('mx-th--drag-over'));
  }

  _moveColumn(fromVisIdx, toVisIdx) {
    const visibleCols = this._columns.filter(c => c.visible);
    const fromCol = visibleCols[fromVisIdx];
    const toCol   = visibleCols[toVisIdx];
    const fromIdx = this._columns.indexOf(fromCol);
    const toIdx   = this._columns.indexOf(toCol);
    this._columns.splice(fromIdx, 1);
    const newTo = this._columns.indexOf(toCol);
    this._columns.splice(newTo, 0, fromCol);
    this._saveColumns();
    this._rebuildTable();
  }

  /* ── Column Manager modal ─────────────────────────────────── */
  _openColumnManager() {
    const backdrop = el('div', { class: 'mx-modal-backdrop' });
    const modal    = el('div', { class: 'mx-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Edit layout' });

    /* Header */
    const mHeader = el('div', { class: 'mx-modal-header' });
    mHeader.appendChild(document.createTextNode('Edit Column Layout'));
    const closeBtn = el('button', {
      class: 'mx-modal-header-close',
      type: 'button',
      'aria-label': 'Close',
      html: ICONS.close,
      onclick: () => backdrop.remove(),
    });
    mHeader.appendChild(closeBtn);
    modal.appendChild(mHeader);

    /* Body: two-panel — all columns list */
    const body = el('div', { class: 'mx-modal-body' });
    const panel = el('div', { class: 'mx-col-list-panel' });

    panel.appendChild(el('div', { class: 'mx-col-list-label' }, 'Columns — drag to reorder, click eye to show/hide'));

    const list = el('div', { class: 'mx-col-list' });
    panel.appendChild(list);
    body.appendChild(panel);
    modal.appendChild(body);

    // Work on a temporary copy so user can Cancel
    let tmpCols = deepClone(this._columns);

    const renderList = () => {
      list.innerHTML = '';
      tmpCols.forEach((col, idx) => {
        const item = el('div', {
          class: 'mx-col-item',
          draggable: 'true',
          'data-idx': String(idx),
        });

        item.appendChild(el('span', { class: 'mx-col-item-drag', html: ICONS.dragH }));
        item.appendChild(el('span', { class: 'mx-col-item-name' }, col.label));

        const eyeBtn = el('button', {
          class: 'mx-col-item-vis',
          type: 'button',
          'aria-label': col.visible ? 'Hide column' : 'Show column',
          'data-tooltip': col.visible ? 'Hide' : 'Show',
          html: col.visible ? ICONS.eye : ICONS.eyeOff,
          onclick: () => {
            tmpCols[idx].visible = !tmpCols[idx].visible;
            renderList();
          },
        });
        item.appendChild(eyeBtn);

        // Drag events inside modal list
        item.addEventListener('dragstart', e => {
          item._dragIdx = idx;
          e.dataTransfer.effectAllowed = 'move';
          item.classList.add('mx-dragging');
        });
        item.addEventListener('dragend', () => item.classList.remove('mx-dragging'));
        item.addEventListener('dragover', e => {
          e.preventDefault();
          list.querySelectorAll('.mx-drag-over').forEach(x => x.classList.remove('mx-drag-over'));
          item.classList.add('mx-drag-over');
        });
        item.addEventListener('dragleave', () => item.classList.remove('mx-drag-over'));
        item.addEventListener('drop', e => {
          e.preventDefault();
          item.classList.remove('mx-drag-over');
          const src = parseInt(e.dataTransfer.getData('text/plain') || item._dragIdx, 10);
          if (isNaN(src) || src === idx) return;
          const moved = tmpCols.splice(src, 1)[0];
          const newIdx = tmpCols.indexOf(tmpCols[idx > src ? idx - 1 : idx]);
          tmpCols.splice(idx > src ? idx - 1 : idx, 0, moved);
          renderList();
        });
        item.addEventListener('dragstart', e => {
          e.dataTransfer.setData('text/plain', String(idx));
        });

        list.appendChild(item);
      });
    };

    renderList();

    /* Footer */
    const mFooter = el('div', { class: 'mx-modal-footer' });

    const resetBtn = el('button', {
      class: 'mx-btn mx-btn--ghost',
      type: 'button',
      html: '<span>Reset to default</span>',
      onclick: () => {
        backdrop.remove();
        this._resetColumns();
      },
    });

    const cancelBtn = el('button', {
      class: 'mx-btn mx-btn--secondary',
      type: 'button',
      html: '<span>Cancel</span>',
      onclick: () => backdrop.remove(),
    });

    const applyBtn = el('button', {
      class: 'mx-btn mx-btn--primary',
      type: 'button',
      html: '<span>Apply</span>',
      onclick: () => {
        this._columns = tmpCols;
        this._saveColumns();
        this._rebuildTable();
        backdrop.remove();
      },
    });

    mFooter.appendChild(resetBtn);
    mFooter.appendChild(cancelBtn);
    mFooter.appendChild(applyBtn);
    modal.appendChild(mFooter);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Close on backdrop click
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });

    // Trap focus
    closeBtn.focus();
  }

  /* ── Rebuild (after column changes) ──────────────────────── */
  _rebuildTable() {
    this._renderHead();
    this._renderBody();
    this._renderFooter();
  }

  /* ── Event emitter ────────────────────────────────────────── */
  _emit(name, detail) {
    this._root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }

  /* ── Public API ───────────────────────────────────────────── */

  /**
   * Get current selected rows.
   * @returns {Array<object>}
   */
  getSelected() {
    return [...this._selected].map(i => this._allData[i]);
  }

  /**
   * Get all (filtered) data rows.
   * @returns {Array<object>}
   */
  getData() {
    return this._filtered.slice();
  }

  /**
   * Programmatically open or close the filter row.
   * @param {boolean} open
   */
  setFilterOpen(open) {
    if (open !== this._filterOpen) this._toggleFilter();
  }

  /**
   * Set the table title.
   * @param {string} title
   */
  setTitle(title) {
    this._opts.title = title;
    this._toolbarEl.querySelector('.mx-toolbar-title').textContent = title;
  }

  /**
   * Refresh the display (e.g. after external data mutation).
   */
  refresh() {
    this._applyFilters();
  }
}

/* ── Export ─────────────────────────────────────────────────── */
// Works both as ES module and plain <script>
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MaximoTable;
} else {
  window.MaximoTable = MaximoTable;
}