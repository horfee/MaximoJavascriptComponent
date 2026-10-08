/* ══════════════════════════════════════════════════════════════════ */
/*  Maximo ScriptControl integration boilerplate                     */
/*                                                                    */
/*  This section is the Maximo UI Script entry-point.                 */
/*  It is executed by ScriptControl when the page renders.            */
/*  Adapt the datasource names and field names to your Maximo schema. */
/* ══════════════════════════════════════════════════════════════════ */

// ── Guard: avoid re-instantiating on every minor DOM update ──────

const sectionId = "linearviewer_section";

const mapping = (await this.getComponentsMapping())[sectionId];
const renderedSectionId = "#" + mapping[sectionId + "-se"].renderId;

const _formatDate = (d) => {
    if ( d == undefined || d == "" ) return "";
    return new Date(d).toLocaleString();
}

// ── Create host div ──────────────────────────────────────────────
const _la_hostId = 'la-host-' + renderedSectionId;
this._la_host = document.getElementById(_la_hostId);
if (!this._la_host) {
  this._la_host = document.createElement('div');
  this._la_host.id = _la_hostId;
  this._la_host.style.cssText = 'width:100%;';

  // Inject into a known Maximo container (adapt selector to your app)
  const _la_anchor = document.querySelector(renderedSectionId);
  _la_anchor.appendChild(this._la_host);
}


// ── Instantiate the component with placeholder data ──────────────
this.linearViewer = new LinearAsset(this._la_host, {
  title:      'Linear Asset Viewer',
  startPoint: 0,
  endPoint:   0,
  unit:       '',
  showWindow: true,
  categories: [],   // Will be populated after data fetch
  loadCategory: async (d) => {
      return d.loadCategory(d);
  }
});

// ── Helper: transform Maximo data rows into LinearAsset categories ─
async function _la_loadData(scriptCtx) {
  // ─── Adapt these datasource / field names to your Maximo schema ───
  const LINEASSET_DS        = 'mainrecord';              // main asset datasource
  const LINFEATURE_DS       = 'features_datasrc';        // linear features datasource
  const LINEFEATURESPEC_DS  = 'features_spec_datasrc';
  const LINSPEC_DS          = 'specifications_datasrc';  // linear specs datasource
  const LINWORK_DS          = 'workorders_datasrc';      // work orders on segment
  const LINTICKET_DS        = 'tickets_datasrc';         // tickets/service requests
  const LINRELATION_DS      = 'relationships_datasrc';   // relationships

  try {
      // ── Fetch asset span ─────────────────────────────────────────
    const assetData = await scriptCtx.getData(LINEASSET_DS, [
      'assetnum', 'description', 'startmeasure', 'endmeasure', 'linearrefmethod.measureunitid'
    ]);
    if (!assetData || !assetData.data || assetData.data.length === 0) return;

    const asset     = assetData.data[0];
    const spanStart = parseFloat(asset.startmeasure) || 0;
    const spanEnd   = parseFloat(asset.endmeasure)   || 100;
    const unit      = asset["linearrefmethod.measureunitid"] || '';

    scriptCtx.linearViewer.setTitle(`${asset.assetnum} — ${asset.description || ''}`);
    scriptCtx.linearViewer.setSpan(spanStart, spanEnd);
    scriptCtx.linearViewer._opt.unit = unit;
    scriptCtx.linearViewer._updateWindowValues();

    const hasLinearData = await scriptCtx.sendAsyncEvent({eventType: "hasLinearData", targetId: APPID});
    const categories = [
        {
            id: "features", label: "Fonctions", icon: "feature", color: "#0f62fe",
            hasChildren: hasLinearData.hasFeatures || false,
            loadCategory: async (d) => { 
                console.log("Loading features : " + d);
                //const featData = await scriptCtx.getData(LINFEATURE_DS, ['feature', 'feature.description', 'startmeasure', 'endmeasure', 'label', 'featuretype']);
                const featData = await scriptCtx.sendAsyncEvent({
                    eventType: "fetchLinearData",
                    targetId: APPID,
                    eventValue: {
                        dataSourceId: LINFEATURE_DS,
                        includeCountFor: LINEFEATURESPEC_DS,
                        fields: ["feature", "feature.description", "feature.featuretype", "label", "startmeasure", "endmeasure"]
                    }
                });

                const result = featData.map((r, i) => ({
                    id:           `feat-${r.feature || i}`,
                    label:        `${r.feature} ${r["feature.description"]}`,
                    startMeasure: parseFloat(r.startmeasure) || spanStart,
                    endMeasure:   r.endmeasure != null ? parseFloat(r.endmeasure) : spanEnd,
                    color:        '#0f62fe',
                    icon:         r.endmeasure != null && r.endmeasure != r.startmeause ? 'segment' : 'point',
                    tooltip:      `${r.description || ''}\n${scriptCtx.linearViewer._la_fmt(r.startmeasure, unit)}${r.endmeasure != null ? ' → ' + scriptCtx.linearViewer._la_fmt(r.endmeasure, unit) : ''}`,
                    hasChildren:  r[LINEFEATURESPEC_DS] > 0,
                    loadCategory: async(ev) => {
                        const featSpecData = await scriptCtx.sendAsyncEvent({
                            eventType: "fetchSpecsForFeature",
                            targetId: APPID,
                            eventValue: {
                                featuresDataSourceId: LINFEATURE_DS,
                                featureSpecsDataSourceId: LINEFEATURESPEC_DS,
                                fields: ["assetattrid", 'assetattribute.description', 'startmeasure', 'endmeasure', "alnvalue", "datevalue", "numvalue", "measureunitid"]
                            }
                        });
                        
                        const r = featSpecData.map( (spec, i2) => ({
                            hasChildren  : false,
                            color        : '#0f62fe',
                            id           : `featspec-${spec.assetattrid || i2}`,
                            label        : `${spec["assetattrid"]} - ${spec["assetattribute.description"]}\n${spec["alnvalue"] || spec["numvalue"] || _formatDate(spec["datevalue"]) || ""} ${spec["measureunitid"] || ""}`,
                            startMeasure : parseFloat(spec.startmeasure) || spanStart,
                            endMeasure   : spec.endmeasure != null ? parseFloat(spec.endmeasure) : spanEnd,
                            value        : `${spec["alnvalue"] || spec["numvalue"] || _formatDate(spec["datevalue"]) || ""} ${spec["measureunitid"] || ""}`

                        }));
                        return r;
                        
                    }
                }));
                return result;
            
            }
        },
        {
            id: "specifications", label: "Spécifications", icon: "spec", color: "#8a3ffc",
            hasChildren: hasLinearData.hasSpecifications || false,
            loadCategory: async (d) => { 
                console.log("Loading specs : " + d);
                const specData = await scriptCtx.sendAsyncEvent({
                    eventType: "fetchLinearData",
                    targetId: APPID,
                    eventValue: {
                        dataSourceId: LINSPEC_DS,
                        fields: ["assetattrid", 'assetattribute.description', 'startmeasure', 'endmeasure', "alnvalue", "datevalue", "numvalue", "measureunitid"]
                    }
                });
                const r = specData.map((spec, i2) => ({
                    hasChildren  : false,
                    color        : "#8a3ffc",
                    id           : `spec-${spec.assetattrid || i2}`,
                    label        : `${spec["assetattrid"]} - ${spec["assetattribute.description"]}\n${spec["alnvalue"] || spec["numvalue"] || _formatDate(spec["datevalue"]) || ""} ${spec["measureunitid"] || ""}`,
                    startMeasure : parseFloat(spec.startmeasure) || spanStart,
                    endMeasure   : spec.endmeasure != null ? parseFloat(spec.endmeasure) : spanEnd,
                    value        : `${spec["alnvalue"] || spec["numvalue"] || _formatDate(spec["datevalue"]) || ""} ${spec["measureunitid"] || ""}`
                }));
                return r;
                
            }
        },
        {
            id: "work", label: "Travaux", icon: "work", color: "#198038",
            hasChildren: hasLinearData.hasWorks || false,
            loadCategory: async (d) => { 
                console.log("Loading work : " + d);
                const woData = await scriptCtx.sendAsyncEvent({
                    eventType: "fetchLinearData",
                    targetId: APPID,
                    eventValue: {
                        dataSourceId: LINWORK_DS,
                        //includeCountFor: LINEFEATURESPEC_DS,
                        fields: ["workorder.wonum", 'workorder.description', 'workorder.status', 'workorder.statusdate', 'startmeasure', 'endmeasure']
                    }
                });
                const r = woData.map((wo, i2) => ({
                    hasChildren  : false,
                    color        : '#198038',
                    id           : `wo-${wo["workorder.wonum"] || i2}`,
                    label        : `${wo["workorder.wonum"]} - ${wo["workorder.description"] || ""}`,
                    tooltip      : `${wo["workorder.wonum"]} - ${wo["workorder.description"] || ""}\n${wo["workorder.status"]} - ${_formatDate(wo["workorder.statusdate"])}`,
                    startMeasure : parseFloat(wo.startmeasure) || spanStart,
                    endMeasure   : wo.endmeasure != null ? parseFloat(wo.endmeasure) : spanEnd,
                    value        : `${wo["workorder.wonum"]} - ${wo["workorder.description"] || ""}\n${wo["workorder.status"]}`,
                }));
                return r;
            }
        },
        {
            id: "tickets", label: "Tickets", icon: "ticket", color: "#f1620a",
            hasChildren: hasLinearData.hasTickets || false,
            loadCategory: async (d) => { 
                console.log("Loading tickets : " + d)
                const ticketData = await scriptCtx.sendAsyncEvent({
                    eventType: "fetchLinearData",
                    targetId: APPID,
                    eventValue: {
                        dataSourceId: LINTICKET_DS,
                        //includeCountFor: LINEFEATURESPEC_DS,
                        fields: ["ticket.ticketid", 'ticket.description', 'ticket.status', 'ticket.statusdate', 'startmeasure', 'endmeasure']
                    }
                });
                const r = ticketData.map((ticket, i2) => ({
                    hasChildren  : false,
                    color        : "#f1620a",
                    id           : `ticket-${ticket["ticket.ticketid"] || i2}`,
                    label        : `${ticket["ticket.ticketid"]} - ${ticket["ticket.description"] || ""}`,
                    tooltip      : `${ticket["ticket.ticketid"]} - ${ticket["ticket.description"] || ""}\n${ticket["ticket.status"]} - ${_formatDate(ticket["ticket.statusdate"])}`,
                    startMeasure : parseFloat(ticket.startmeasure) || spanStart,
                    endMeasure   : ticket.endmeasure != null ? parseFloat(ticket.endmeasure) : spanEnd,
                    value        : `${ticket["ticket.ticketid"]} - ${ticket["ticket.description"] || ""} - ${ticket["ticket.status"]}`
                }));
                return r;
            }
        },
        {
            id: "relations", label: "Relations", icon: "relation", color: "#a0261f",
            hasChildren: hasLinearData.hasRelations || false,
            loadCategory: async (d) => {
                console.log("Loading relations : " + d);
                const relData = await scriptCtx.sendAsyncEvent({
                    eventType: "fetchLinearData",
                    targetId: APPID,
                    eventValue: {
                        dataSourceId: LINRELATION_DS,
                        fields: ["sourceassetnum", 'targetassetnum', 'assetrelationnum', 'relation.description', 'sourcestartmeasure', 'sourceendmeasure', 'targetstartmeasure', 'targetendmeasure']
                    }
                });
                const r = relData.map((rel, i2) => ({
                    hasChildren  : false,
                    color        : '#a0261f',
                    id           : `rel-${i2}`,
                    label        : `${rel.assetrelationnum} - ${rel["relation.description"] || ""}`,
                    tooltip      : `${rel.sourceassetnum === asset.assetnum ? rel.targetassetnum : rel.sourceassetnum }`,
                    startMeasure : parseFloat(rel.sourceassetnum === asset.assetnum ? (rel.sourcestartmeasure || spanStart ): (rel.targetstartmeasure || spanStart)) ,
                    endMeasure   : parseFloat(rel.sourceassetnum === asset.assetnum ? (rel.sourceendmeasure || spanEnd ): (rel.targetendmeasure || spanEnd)) ,
                    value        : `${rel.sourceassetnum === asset.assetnum ? rel.targetassetnum : rel.sourceassetnum }`,
                }));
                return r;
            }
        }
        
    ];
    
    scriptCtx.linearViewer.setData(categories);

  } catch(err) {
    console.error('LinearAsset: error loading data', err);
  }
}

// ── Register ScriptControl notification callback ─────────────────
const _la_scriptCtx = this;
this.registerNotificationCallBack(async (ev) => {
    if ( ev == "render" || ev === "refresh" ) {
        const elt = document.querySelector(renderedSectionId);
        elt.appendChild(this._la_host);
    }
  // ev is one of: 'render' | 'update' | 'refresh'
  // In all cases we reload the data from Maximo
  if ( ev !== "render" ) {
    await _la_loadData(_la_scriptCtx);
  }
});

// ── Initial load ──────────────────────────────────────────────────
_la_loadData(_la_scriptCtx);