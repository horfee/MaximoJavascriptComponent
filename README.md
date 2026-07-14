
# MaximoJavascriptComponent

  

This repository is used to create a new controls in Maximo, usable in standard user interface (not in RBA).

It is meant to be used as customization archive to push in your MAS Manage deployment.

  

Once done you will be able to define the scripts you want to include in your applications (Javascript or CSS). Javascript scripts are differents from Automation Scripts : automation scripts run on maximo server side, while this new control add javascript and css in the webbrowser client side.

  

The new control can be used in the application designer with drag'n'drop feature.

To install it, go in the workspace configuration for MAS Manage, update the configuration and add a new customization artifact, pointing to [Release artifact (be careful and change the desired version)](https://github.com/horfee/MaximoJavascriptComponent/releases/download/v1.0/MaximoJavaScriptControl-1.0.0.zip)
Be aware that you should never download compiled code from internet but clone the repository, compiled and build the artifact yourself. To do it just use the maven phase "package" to get the zip file to push to MAS Manage.


I will publish soon a library of scripts, to give some examples of what is possible, but if you deployed DEMO DATA you will get some example.



##How to use the new script control

No matter the order, you must : 
- update through the application designer the application you want to include css/javascript into
    - Open the ASSET app for example
    - Open the Control Palette popup
    - Drag'n'drop the script control in page section, to make this script globally available in the asset page
    - Select the newly created script control
    - Open the properties dialog
    - In the script number field, enter "TABLE_ORGANIZER"
    - Replay these step to create a new script control, that you will bind to script number "TABLE_ORGANIZER_CSS"
    - Drag'n'drop a new script control just below the results_showlist table, in the list tab
    - Set the script number to "ASSET_ORGANIZE_RS"
    - Save the record

    - Open the new "User Interface Scripts" application
    - Make sure TABLE_ORGANIZER, TABLE_ORGANIZER_CSS, and ASSET_ORGANIZE_RS are all active

##How does it work
The script control fetch the script from the maximo database that you define, and execute it within the webbrowser side. The first time the component is displayed, it is rendered (i.e the javascript is injected in the DOM). If you bound the script control to a datasource, and the current record change, the script control will send a notification to the script, stating "updated", because the record has changed. If the script is rendered again, a notification "render" will be sent. if both the record changed and the script is rendered again, a notification "refresh" will be sent. Eg : 
    Eg n°1:
        - you open the ASSET application : the asset_organize_rs script will be rendered /injected in the DOM
        - you select the main tab : the script and all changes in the dom are gone !
        - you change the record (click on the NEXT button in the toolbar)
        - you go back to the list view : the script is then rendered again, but notified with a "refresh" event
    Eg n°2:
        - you open the ASSET application : the asset_organize_rs script will be rendered /injected in the DOM
        - you change the record (click on the NEXT button in the toolbar) : the script gets a notification "update"

It is only true for javascript. for CSS, everytime the render is performed, the script will create a new style in the document.head DOM node. if a dom related to the script already exists, it will first remove it and reapply.

How to listen to these notifications ?
In the script you will have access to all Maximo basics javascripts, plus ScriptControl related functions. ScriptControls related methods are : 
- this.registerNotificationCallBack( async (ev) => {
    // Do your stuff here ...
    // context this will be bound to ScriptControl closure. if you want to access to the global context, use window....
});

- this.sendAsyncEvent = async function(params);
    params.eventType : string
    params.targetId: string (may be null : the scriptcontrol will be the target), 
    params.eventValue: Object (may be JSON or anything, even undefined), 
    params.requestType: one of REQUESTTYPE_ASYNC|REQUESTTYPE_HIGHASYNC|..., 
    params.handleAs: string (optional: one of xml|json ; by default json), 
    params.responseType: string (optional ; by default "text/json")
    ==> You will obtain a promise with the response

- this.sendEvent = function(params);
    params.eventType : string
    params.targetId: string (may be null : the scriptcontrol will be the target), 
    params.eventValue: String necessarly
    ==> You will obtain a promise with the response, but no result from the call

- this.getControlStructure = async function(controls)
    controls : a controlid or an array of controlid (string)
    ==> You will obtain a promise with the response, with JSON structured data

- this.getPropertiesFromControl = async function(controls, properties)
    controls : a controlid or an array of controlid (string)
    properties: a list of properties you want to get, or "*" to get all of them
    ==> You will obtain a promise with the response, with JSON structured data

- this.getComponentsMapping = async function()
    ==> You will obtain a promise with the response, with JSON structured data showing the current rendered controls and components, with their ids

- this.getData = async function(dataSourceId, attributes, filters, sort, count);
    dataSourceId: string (required)
    attributes: array of string (required)
    filters: map of strings (optional)
    sort : map of strings (optional)
    count: number (optional)
    ==> You will obtain a promise with the response, with JSON structured data

- this.setData = async function(dataSource, data);
    dataSource: string (required)
    data: JSON Object (required). you can pass a JSONObject with "0", "1", etc if you want to alter multiple rows (and not sequentials rows : can be {"0": {...}, "2": {...}, "10": {...}})
    ==> The page may be altered (ex : table wll display additional rows, or changed controls)

- this.addRecord = async function(dataSource, data);
    dataSource: string (required)
    data: JSONObject (optional)
    ==> The page may be altered (ex : table wll display additional rows, or changed controls)
TODO : create a documentation for this new UI Control.

- this.deleteRecord = async function(dataSource, rowNum);
    dataSource: string (required)
    rowNum: number (optional) : if not provided the current row of the datasource will be deleted
    ==> The page may be altered (ex : table wll display additional rows, or changed controls)
