

if ( window.scriptcontrols === undefined ) {
    window.scriptcontrols = {};
}

function ScriptControl(cmpId) {
    this.id = cmpId;
    
    if ( window.scriptcontrols[this.id] != undefined ) {
        console.warn(`A script with id ${this.id} already exists. weird...`);
    }

    window.scriptcontrols[this.id] = this;
}

/* 
    params payload :
    - eventType: string (required)
    - eventValue: object (optional)
    - targetId: string (optional: will be set to the scriptcontrolid if not provided)
    - requestType: string (one of json, xml. optional : will be set the json by default)
    - responseType: string (one of text/json, text/xml)

    return will be a promised
*/
ScriptControl.prototype.sendAsyncEvent = async function(params) {
    if ( params.eventType == undefined ) {
        throw Error("eventType not provided");
    }

    return new Promise( (resolve, reject) => {
        sendXHREvent(
            params.eventType, 
            params.targetId || this.id, 
            params.eventValue, 
            params.requestType || REQUESTTYPE_HIGHASYNC, 
            params.handleAs || "json", 
            params.responseType || "text/json", 
            (resp, ioArgs) => { resolve(resp, ioArgs)}, 
            (error) => { reject(error)});
    });
}

ScriptControl.prototype.sendEvent = function(params) {
    if ( params.eventType == undefined ) {
        throw Error("eventType not provided");
    }
    
    return new Promise( (resolve, reject) => {
        sendEvent(
        params.eventType, 
        params.targetId || this.id, 
        params.eventValue);
    
        resolve();
    });

}
ScriptControl.prototype.getControlStructure = async function(controls) {
    return this.sendAsyncEvent({
        eventType: "getControlStructure",
        eventValue: controls
    });
}

ScriptControl.prototype.getPropertiesFromControl = async function(controls, properties) {
    return this.sendAsyncEvent({
        eventType: "getPropertiesFromControlsOrComponents",
        eventValue: {controls, properties}
    });
}

ScriptControl.prototype.getComponentsMapping = async function() {
    return this.sendAsyncEvent({
        eventType: "getComponentsMapping",
    });
}


ScriptControl.prototype.getData = async function(dataSourceId, attributes, filters, sort, start, count) {
    return this.sendAsyncEvent({
        eventType: "getData",
        eventValue: {
            datasource: dataSourceId || "mainrecord",
            fields: attributes,
            filters: filters,
            sort: sort,
            start: start,
            count: count
        }
    });
}

ScriptControl.prototype.setData = async function(dataSource, data) {
    return this.sendEvent({
        eventType: "setData",
        eventValue: JSON.stringify({datasource: dataSource, data: data})
    });
}

ScriptControl.prototype.addRecord = async function(dataSource, data) {

    const self = this;
    return new Promise( (resolve, reject) => {
        const _handler = function(resp, ioArgs) {   
            try {
                processXHR(resp, ioArgs);

                if ( data != undefined ) {
                    self.setData(dataSource, data)
                        .then( resp => resolve(resp))
                        .catch( error => reject(error));
                } else {
                    resolve();
                }
            } catch(error) {
                reject(error);
            }

        }

        sendXHREvent(
                "addrow", 
                dataSource, 
                undefined, 
                REQUESTTYPE_SYNC, 
                "xml", 
                "text/xml", 
                _handler, 
                (error) => { reject(error)});
    });
    

}

/* rowNum is optional */
ScriptControl.prototype.deleteRecord = async function(dataSource, rowNum) {
    return this.sendEvent({
        eventType: "toggledeleterow",
        targetId:  dataSource + (rowNum == undefined ? "" : `[R:${rowNum}]`)
    })
}

ScriptControl.prototype.registerNotificationCallBack = function(cb) {
    this.cb = cb;
}

ScriptControl.prototype.onScriptUpdate = function(event) {
    if ( this.cb ) {
        this.cb(event);
    }
}

ScriptControl.prototype.apply = function(script) {
    script.bind(this)();
}


function notifyScriptControl(compId, event, script) {
    const _s = window.scriptcontrols[compId];
    if ( _s ) {
        _s.onScriptUpdate(event);
    } else if ( script ) {
        new ScriptControl(compId).apply(script);
    }
}