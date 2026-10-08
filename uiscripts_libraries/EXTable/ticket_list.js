const sectionId = "results_showlist_section";

const mapping = (await this.getComponentsMapping())[sectionId];
const tableContainerId = "#" + mapping[sectionId + "-se"].renderId;

const defaultColumns = [
    //{ key:'wonum',       label:'WO #',      width:100, type:'text',    visible:true,  sortable:true },
    { key: 'ticketid',                             label: 'Ticket', width:240, displaytype:"link", type:'text',    visible:true,  sortable:true },
    { key: 'description',                       label: 'Description',width:240, type:'text',    visible:true,  sortable:true },
    { key: 'ext_revision',                       label: 'Révision',width:120, type:'number',    visible:true,  sortable:true },
    { key: 'status',                            label: 'Statut', width: 100, type: 'text', visible: true, sortable: true},
    { key: 'assetnum',                          label: 'Équipement',  width:110, type:'text',    visible:true, sortable:true },
    { key: 'asset.description',                          label: 'desc. équipement',  width:110, type:'text',    visible:true, sortable:true },
    { key: 'siteid',                            label: 'Site',  width:110, type:'text',    visible:true, sortable:true }
    
  ];
  
//let currentWorkOrder = await this.getData("mainrecord", ["wonum", "description"], undefined, undefined, 0, 1);
//if ( currentWorkOrder && currentWorkOrder.status === "ok" ) currentWorkOrder = currentWorkOrder.data[0];


/* ── Instantiate table ─────────────────────────────── */
const table = new MaximoTable(tableContainerId, {
    title:      `Tickets`,
    dataSourceId: "results_showlist",
    storageKey: APPID + sectionId + "-table",
    columns:    defaultColumns,
    pageSize:   25,
    pageSizes:  [10, 25, 50, 100],
    multiSelect: false,
    actions: []
});


table.addEventListener("filter-changed", table.retrieveData.bind(table));
table.addEventListener("sort-changed", table.retrieveData.bind(table));
table.addEventListener("row-selected", (ev) => {

    if ( ev.detail.rowIndex === undefined ) {
        return;
    }
    
    const value = {
        datasourceId: table._opts.dataSourceId, 
        rownum: ev.detail.rowIndex
        
    };
    this.sendEvent({eventType:"selectRow", eventValue:JSON.stringify(value), targetId: APPID});
});

_l = (ev) => {
    const value = {
        datasourceId: table._opts.dataSourceId, 
        rownum: ev.detail.selectedIndex
        
    };
    this.sendEvent({eventType:"gotoRecord", eventValue:ev.detail.selectedIndex, targetId: APPID});    
}
table.addEventListener("row-double-click", _l);
table.addEventListener("link-click", _l);

this.registerNotificationCallBack( async (event) => {
    if ( event === "render" || event === "refresh" ) {
        const container = document.querySelector(tableContainerId);
        container.appendChild(table._root);
    }
    if ( event == "update" || event === "refresh" ) {
        table.retrieveData();
    }
});