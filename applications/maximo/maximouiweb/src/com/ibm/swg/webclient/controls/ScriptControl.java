package com.ibm.swg.webclient.controls;

import java.lang.reflect.InvocationTargetException;

import psdi.mbo.*;
import psdi.webclient.system.controller.*;

import java.rmi.RemoteException;
import psdi.webclient.system.beans.DataBean;
import psdi.webclient.system.beans.DataBeanListener;
import psdi.util.HTML;
import psdi.util.MXException;

import com.ibm.json.java.*;

import java.util.*;
import java.util.function.Function;

import javax.servlet.http.HttpServletResponse;
import psdi.webclient.system.beans.WebClientBean;

import java.io.IOException;

public class ScriptControl extends ControlInstance {
    
    public static enum ScriptType {
        JAVASCRIPT,
        CSS
    }

    private MboRemote script = null;

    @Override
    public void initialize() {
        super.initialize();
        DataBean db = getDataBean();
        if ( db != null && this.getDescriptor().getProperty("datasrc") != null ) {
            db.addListener(new DataBeanListener() {

                @Override
                public void dataChangedEvent(DataBean arg0) {
                    //ScriptControl.this.setNeedsRender(true);
                    setChangedFlag();
                }

                @Override
                public void structureChangedEvent(DataBean arg0) {
                    //ScriptControl.this.setNeedsRender(true);
                    setChangedFlag();
                }
                
            });
        }
    }

    // @Override
    // public boolean hasChanged() {
    //     return needsToUpdate || super.hasChanged();
    // }

    protected MboRemote getScript() {
        if (script == null || getWebClientSession().getDebug() ) {
            try {
                if ( script != null ) script.getThisMboSet().close();

                MboSetRemote scriptsSet = getWebClientSession().getMXSession().getMboSet("SWG_UISCRIPTS");
                String scriptNum = getProperty("scriptnum");
                if ( scriptNum != null ) {
                    scriptNum = scriptNum.toUpperCase();
                }
                scriptsSet.setWhere("SCRIPTNUM = '" + scriptNum + "' and active = 1");
                script = scriptsSet.getMbo(0);
            } catch (MXException | RemoteException e) {
                e.printStackTrace();
            }
        }
        return script;
    }

    public ScriptType getScriptType() {
        MboRemote script = getScript();
        if (script != null) {
            try {

                String type = script.getString("TYPE");
                if (type.equalsIgnoreCase("CSS")) {
                    return ScriptType.CSS;
                } else if ( type.equalsIgnoreCase("JAVASCRIPT")) {
                    return ScriptType.JAVASCRIPT;
                }
            } catch (MXException | RemoteException e) {
                e.printStackTrace();
            }
        }
        return null;
    }

    public String getContent() {
        MboRemote script = getScript();
        if (script != null) {
            try {
                return script.getString("SCRIPTCONTENT");
            } catch (MXException | RemoteException e) {
                e.printStackTrace();
            }
        }
        return null;
    }

    @Override
    public int render() throws NoSuchMethodException, IllegalAccessException, InvocationTargetException {
        if ( needsRender() ) {
            if ( script != null ) {
                try {
                    script.getThisMboSet().reset();
                } catch (RemoteException | MXException e) {
                    e.printStackTrace();
                }
                script = null;
            }
        }
        return super.render();
    }

    public int getPropertiesFromControlsOrComponents() {
        try {
            WebClientEvent event = getWebClientSession().getCurrentEvent();
            JSONObject eventData = JSONObject.parse(HTML.decode((String)event.getValue()));
            HttpServletResponse response = getWebClientSession().getResponse();
            JSONObject result = new JSONObject();
            
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            
            JSONArtifact requestedControls = (JSONArtifact)eventData.get("controls");
            if ( !(requestedControls instanceof JSONArray) ) {
                requestedControls = new JSONArray();
                ((JSONArray)requestedControls).add(eventData.get("controls").toString());
            }
            Object properties = eventData.get("properties");
            boolean allProperties = false;
            if ( !(properties instanceof JSONArray)) {
                if ( "*".equals(properties.toString())) {
                    properties = new JSONArray();
                    allProperties = true;
                } else {
                    properties = new JSONArray();
                    ((JSONArray)properties).add(eventData.get("properties").toString());
                }
            }

            for(Object id : ((JSONArray)requestedControls)) {
                BaseInstance inst = getPage().getComponentInstance((String)id);
                if ( inst == null ) inst = getPage().getControlInstance((String)id);

                if ( inst != null ) {
                    JSONObject instProperties = new JSONObject();
                    result.put(inst.getId(), instProperties);
                    if ( allProperties ) {
                        properties = new JSONArray();
                        ((JSONArray)properties).addAll(Arrays.asList(inst.getPropertyNames()));
                    }
                    for(Object prop : ((JSONArray)properties)) {
                        instProperties.put(prop.toString(), inst.getProperty(prop.toString()));
                    }
                }
            }
            response.getWriter().write(result.toString());
        } catch (IOException e) {
            e.printStackTrace();
            return WebClientBean.EVENT_STOP_ALL;
        }
            
        return WebClientBean.EVENT_HANDLED;
    }

    public int getControlStructure() {
        try {
            WebClientEvent event = getWebClientSession().getCurrentEvent();
            JSONArray eventData;
            if ( event.getValue()  instanceof String ) {
                eventData = new JSONArray();
                ((JSONArray)eventData).add(event.getValue().toString());
            } else {
                eventData = JSONArray.parse(HTML.decode((String)event.getValue()));
            }
              
            HttpServletResponse response = getWebClientSession().getResponse();
            JSONObject result = new JSONObject();
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");

            java.util.function.Function<BaseInstance,JSONObject> f = new Function<BaseInstance,JSONObject>() {

                @Override
                public JSONObject apply(BaseInstance instance) {
                    JSONObject result = new JSONObject();
                    JSONArray components = new JSONArray();
                    JSONArray children = new JSONArray();

                    result.put("type", instance.getDescriptor().getName());
                    result.put("id", instance.getId());
                    result.put("renderId", instance.getRenderId());
                    result.put("descriptorId", instance.getDescriptor().getProperty("id"));

                    JSONObject properties = new JSONObject();
                    instance.getDescriptor().getProperties().forEach( (String propName, Property p) -> {
                        properties.put(propName, p.getValue());
                    });
                    for(String prop : instance.getPropertyNames()) {
                        properties.put(prop, instance.getProperty(prop));
                    }
                    result.put("properties", properties);
                    result.put("components", components);
                    result.put("children", children);
                    for(BaseInstance inst : instance.getChildren()) {
                        children.add(apply(inst));
                    }
                    if ( instance instanceof ControlInstance) {
                        for(BaseInstance inst : ((ControlInstance)instance).getComponents()) {
                            components.add(apply(inst));
                        }
                    }

                    return result;
                }
                
            };

            for(Object controlId : eventData) {
                ControlInstance inst = getPage().getControlInstance((String)controlId);
                if ( inst != null ) {
                    result.put(inst.getId(), f.apply(inst));
                }
            }
            response.getWriter().write(result.toString());
        } catch (IOException e) {
            e.printStackTrace();
            return WebClientBean.EVENT_STOP_ALL;
        }
            
        return WebClientBean.EVENT_HANDLED;
    }

    public int getComponentsMapping(){
        HttpServletResponse response = getWebClientSession().getResponse();
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");


        JSONObject scriptControlMapping = new JSONObject();//(JSONObject)page.get("__scriptControlMapping");
        PageInstance page = getPage();
        // if ( scriptControlMapping != null ) {
        //     try {
        //         scriptControlMapping = (JSONObject)scriptControlMapping.clone();
        //         response.getWriter().write(scriptControlMapping.toString());
        //     } catch (IOException e) {
        //         e.printStackTrace();
        //         return WebClientBean.EVENT_STOP_ALL;
        //     }
            
        //     return WebClientBean.EVENT_HANDLED;    
        // }

        scriptControlMapping = new JSONObject();
        // page.put("__scriptControlMapping", scriptControlMapping);    
        List<ControlInstance> controls = new ArrayList<ControlInstance>();
        List<BaseInstance> components = new ArrayList<BaseInstance>();
        controls.add(page);
        
        while( controls.size() > 0 ) {
            ControlInstance control = controls.remove(0);
            JSONObject comps = new JSONObject();
            scriptControlMapping.put(control.getId(), comps);


            components.addAll(control.getComponents());
            while( components.size() > 0 ) {
                BaseInstance component = components.remove(0);
                JSONObject desc = new JSONObject();
                desc.put("renderId", component.getRenderId());
                desc.put("type", component.getDescriptor().getName());
                comps.put( component.getId(), desc);// new JSONObject().put );
                
                // desc.put( component.getId(),  );
                // comps.add(desc);
                components.addAll(component.getChildren());
            }

            control.getChildren().forEach( child -> {
                if ( child instanceof ControlInstance ) {
                    controls.add((ControlInstance) child);
                }
            });   
        }

        try {
            response.getWriter().write(scriptControlMapping.toString());
        } catch (IOException e) {
            e.printStackTrace();
            return WebClientBean.EVENT_STOP_ALL;
        }
            
        return WebClientBean.EVENT_HANDLED;
    }

    public int getData() {
        WebClientEvent event = getWebClientSession().getCurrentEvent();
        JSONObject result = new JSONObject();
            

        try {
            JSONObject eventData = JSONObject.parse(HTML.decode((String)event.getValue()));
            String dataSourceID = eventData.get("datasource").toString();
            JSONObject filters = (JSONObject)eventData.get("filters");
            JSONArray fields = (JSONArray)eventData.get("fields");
            JSONObject sort = (JSONObject)eventData.get("sort");
            int count = eventData.get("count") == null ? -1 : Integer.parseInt(eventData.get("count").toString());
            int start = eventData.get("start") == null ? 0 : Integer.parseInt(eventData.get("start").toString());
            
            DataBean dataSource = dataSourceID == null ? null : getWebClientSession().getDataBean(dataSourceID);

            if ( dataSource == null ) {
                result.put("status", "error");
                result.put("error", "Data source not found: " + dataSourceID);

            } else if ( dataSourceID != null && !dataSourceID.isBlank() && dataSource != null) {
                if ( count == -1 ) count = dataSource.getMboSet().count();
                String[] attributes = (String[])fields.stream()
                                        .map(Object::toString)
                                        .toArray(String[]::new);

                
                if ( sort != null ) {
                    StringBuilder sb = new StringBuilder();
                    for(Object field: sort.keySet()) {
                        sb.append(field);
                        sb.append(" ");
                        sb.append( ((boolean)sort.get(field))? "desc": "asc");
                        sb.append(",");
                    }
                    if ( sb.length() > 0 ) {
                        sb.deleteCharAt(sb.length() - 1);
                        dataSource.setOrderBy(sb.toString());
                        dataSource.reset();
                    }
                }

                if ( filters != null ) {
                    filters = uppercaseKeys(filters);
                    if ( !filtersAreIdenticals(filters, dataSource.getQbeAttributes())) {
                        dataSource.resetQbe();
                        for(Object key: filters.keySet()) {
                            dataSource.setQbe(key.toString(), filters.get(key).toString());
                        }
                        dataSource.reset();
                    }
                }
                MboSetData mboSetData = dataSource.getMboSetData(start, count, attributes);
                if ( mboSetData != null ) {

                    JSONArray finalData = new JSONArray();
                    for(MboData data : mboSetData.getMboData()) {
                        JSONObject row = new JSONObject();
                        JSONObject flags = new JSONObject();
                        row.put("_flags", flags);
                        flags.put("_toBeAdded", data.toBeAdded());
                        flags.put("_toBeUpdated", data.toBeUpdated());
                        flags.put("_toBeDeleted", data.toBeDeleted());
                        flags.put("_modified", data.isModified());
                        for(String attribute : attributes) {
                            MboValueData mvd = data.getMboValueData(attribute);
                            if ( mvd == null ) {
                                row.put(attribute, null);
                                flags.put(attribute, 0b1); // readonly as null value
                            } else {
                                if ( mvd.getDataAsObject() instanceof java.sql.Timestamp ) {
                                    java.sql.Timestamp ts = (java.sql.Timestamp) mvd.getDataAsObject();
                                    row.put(attribute, ts.toInstant().toString());
                                } else {
                                    row.put(attribute, mvd.getDataAsObject());
                                }
                                flags.put(attribute, (mvd.isReadOnly() ? 0b1 : 0) | (mvd.isRequired() ? 0b10 : 0) );
                            }
                        }
    
                        finalData.add(row);
                    }
                    result.put("data", finalData);
                }
                JSONObject f = new JSONObject();
                if ( dataSource != null && dataSource.getQbeAttributes() != null ) { 
                    f.putAll(dataSource.getQbeAttributes());
                }
                if ( dataSource.getCurrentRow() == -1 ) 
                    dataSource.getMbo(0);

                result.put("currentFilter", f);
                result.put("count", dataSource.count());
                result.put("currentRow", dataSource.getCurrentRow());
                result.put("status", "ok");

            }

            try {
                HttpServletResponse response = getWebClientSession().getResponse();
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write(result.toString());
            } catch (IOException e) {
                e.printStackTrace();
                return WebClientBean.EVENT_STOP_ALL;
            }
        } catch(MXException | IOException e) {
            e.printStackTrace();
            result.put("status", "error");
            result.put("error", e.getMessage());
            try {
                HttpServletResponse response = getWebClientSession().getResponse();
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write(result.toString());
            } catch (IOException e2) {
                e2.printStackTrace();
                return WebClientBean.EVENT_STOP_ALL;
            }
            return WebClientBean.EVENT_STOP_ALL;
        }

        return WebClientBean.EVENT_HANDLED;

    }

    protected JSONObject uppercaseKeys(JSONObject filters) {
        if (filters == null) {
            return null;
        }

        JSONObject result = new JSONObject();
        for (Object key : filters.keySet()) {
            result.put(((String)key).toUpperCase(), filters.get(key));
        }

        return result;
    }

    protected boolean filtersAreIdenticals(JSONObject filters, Map<String, String> qbeAttributes) {
        if (filters == null || qbeAttributes == null || filters.isEmpty() ) {
            return true;
        }

        if (filters.size() != qbeAttributes.size()) {
            return false;
        }

        for (Map.Entry<String, String> entry : qbeAttributes.entrySet()) {
            String key = entry.getKey();
            String qbeValue = entry.getValue();
            if (!filters.containsKey(key)) {
                return false;
            }

            String filterValue = (String)filters.get(key);
            // Dans filters, les valeurs sont uniquement des String
            if (filterValue == null && qbeValue != null || filterValue != null && qbeValue == null || !filterValue.equals(qbeValue)) {
                return false;
            }

        }

        return true;
    }

    public int setData() {

        try {
            WebClientEvent event = getWebClientSession().getCurrentEvent();
            JSONObject eventData = JSONObject.parse(HTML.decode((String)event.getValue()));

            String dataSourceId = (String)eventData.get("datasource");
            JSONObject data = (JSONObject)eventData.get("data");
            DataBean ds = getPage().getAppInstance().getDataBean(dataSourceId);

            if ( dataSourceId == null || data == null || ds == null ) return WebClientBean.EVENT_STOP_ALL;

            boolean hasNonNumericKey = data.keySet().stream().anyMatch( (Object key) -> !(key.toString().trim().matches("\\d+")) );

            if ( hasNonNumericKey ) {
                JSONObject rowData = new JSONObject();
                int currentRow = ds.getCurrentRow();
                rowData.put("" + currentRow, data);
                data = rowData;
            }

            for(Object key: data.keySet()) {
                JSONObject record = (JSONObject)data.get(key);
                for(Object attribute: record.keySet()) {
                    ds.setValue(Integer.parseInt(key.toString()), (String)attribute, record.get(attribute).toString());
                }
            }
            
        } catch(MXException e) {
            e.printStackTrace();
            return WebClientBean.EVENT_STOP_ALL;
        } catch(IOException e) {
            e.printStackTrace();
            return WebClientBean.EVENT_STOP_ALL;
        }

        return WebClientBean.EVENT_HANDLED;

    }

    public int selectRow() {
        try {
            WebClientEvent event = getWebClientSession().getCurrentEvent();
            JSONObject eventData = JSONObject.parse(HTML.decode((String)event.getValue()));
        
            String dataSourceId = (String)eventData.get("datasource");
            Integer rowNum = (Integer)eventData.get("rownum");
            DataBean ds = getPage().getAppInstance().getDataBean(dataSourceId);
        
            if ( dataSourceId == null || rowNum == null || ds == null ) return WebClientBean.EVENT_STOP_ALL;

            DataBean dataBean = getWebClientSession().getDataBean(dataSourceId);
            if ( dataBean != null ) {
                dataBean.highlightrow(rowNum);
            }
        } catch(IOException | MXException e) {
            e.printStackTrace();
            return WebClientBean.EVENT_STOP_ALL;    
        }
        return WebClientBean.EVENT_HANDLED;
    }
}
