const sectionId = "ext_documentation_s2_preview";

const mapping = (await this.getComponentsMapping())[sectionId];
const tableContainerId = mapping[sectionId + "-se"].renderId;

this.iframe = document.createElement("iframe");
this.iframe.style.width = "100%";

this.iframe.addEventListener("load", (ev) => {
    if ( ev.target.src === "" ) return;
    
    this.iframe.style.height = document.documentElement.scrollHeight + "px";

    
});


document.getElementById(tableContainerId).appendChild(this.iframe);

this.refreshPreview = async () => {
    this.iframe.src = "";
    const data = await this.getData("ext_documentation_s1_c2_s1",["weburl"], undefined, undefined, 0, 1);
    if ( data && data.status === "ok" ) {
        if ( data.count == 0 ) return;
        
        const f = await this.sendAsyncEvent({
            eventType: "encodeFile",
            eventValue : data.data[0].weburl,
            targetId: "ext_documentation_s1"
        })

        const encodedFile = f.url;
        const params = new URLSearchParams(window.location.search);
        const uiSessionId = params.get("uisessionid");
        this.iframe.src = `/maximo/servlet/secureprovider?file=${encodedFile}&uisessionid=${uiSessionId}` ;//+ data.data[0].weburl;
    }  
}

this.refreshPreview();


this.registerNotificationCallBack( async (event) => {
    if ( event === "render" || event === "refresh" ) {
        document.getElementById(tableContainerId).appendChild(this.iframe);
    }
    if ( event == "update" || event === "refresh" ) {
        this.refreshPreview();
    }
});