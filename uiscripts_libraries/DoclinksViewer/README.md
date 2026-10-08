<tab id="ext_documentation" label="Documentation" tabbodycss="tabBodyTableStretch">
    <section beanclass="psdi.webclient.beans.common.AssetLocDojoTreeBean" id="ext_documentation_s1" relationship="EXTDRILLDOWN">
        <sectionrow id="ext_documentation_s1_r1">
            <sectioncol id="ext_documentation_s1_c1" width="50%">
                <dojotree datasrc="ext_documentation_s1" height="310" id="ext_documentation_s1_dt1" loadmorelabel="Charger plus (%1)">
                    <dojotreenode id="ext_documentation_s1_dt1_n1">
                        <dojotreenodeattribute dataattribute="wonum" id="ext_documentation_s1_dt1_n1_wonum"/>
                        <dojotreenodeattribute dataattribute="description" id="ext_documentation_s1_dt1_n1_desc"/>
                        <dojotreenoderelation id="ext_documentation_s1_dt1_n1_rel_doclinks" relation="EXT_DOCLINKS"/>
                        <dojotreenoderelation id="ext_documentation_s1_dt1_n1_rel_pda" relation="PARENT"/>
                        <dojotreenoderelation id="ext_documentation_s1_dt1_n1_rel_asset" relation="ASSET"/>
                        <dojotreenoderelation id="ext_documentation_s1_dt1_n1_rel_location" relation="LOCATION"/>
                        <dojotreenoderelation id="ext_documentation_s1_dt1_n1_rel_dt" relation="EXT_DTPDA"/>
                        <dojotreenoderelation id="ext_documentation_s1_dt1_n1_rel_dmsr" relation="EXT_DMSR"/>
                    </dojotreenode>
                    <dojotreenode id="ext_documentation_s1_dt1_n2" objectname="DOCLINKS">
                        <dojotreenodeattribute dataattribute="document" id="ext_documentation_s1_dt1_n2_doc"/>
                    </dojotreenode>
                    <dojotreenode id="ext_documentation_s1_dt1_n3" objectname="ASSET">
                        <dojotreenodeattribute dataattribute="assetnum" id="ext_documentation_s1_dt1_n3_assetnum"/>
                        <dojotreenodeattribute dataattribute="description" id="ext_documentation_s1_dt1_n3_desc"/>
                        <dojotreenoderelation id="ext_documentation_s1_dt1_n3_rel_doclinks" relation="EXT_DOCLINKS"/>
                    </dojotreenode>
                    <dojotreenode id="ext_documentation_s1_dt1_n4" objectname="LOCATION">
                        <dojotreenodeattribute dataattribute="location" id="ext_documentation_s1_dt1_n4_location"/>
                        <dojotreenodeattribute dataattribute="description" id="ext_documentation_s1_dt1_n4_desc"/>
                        <dojotreenoderelation id="ext_documentation_s1_dt1_n4_rel_doclinks" relation="EXT_DOCLINKS"/>
                    </dojotreenode>
                    <dojotreenode id="ext_documentation_s1_dt1_n5" objectname="PM">
                        <dojotreenodeattribute dataattribute="pmnum" id="ext_documentation_s1_dt1_n5_pmnum"/>
                        <dojotreenodeattribute dataattribute="description" id="ext_documentation_s1_dt1_n5_description"/>
                        <dojotreenoderelation id="ext_documentation_s1_dt1_n5_rel_doclinks" relation="EXT_DOCLINKS"/>
                    </dojotreenode>
                    <dojotreenode id="ext_documentation_s1_dt1_n6" objectname="WORKORDER">
                        <dojotreenodeattribute dataattribute="wonum" id="ext_documentation_s1_dt1_n6_wonum"/>
                        <dojotreenodeattribute dataattribute="description" id="ext_documentation_s1_dt1_n6_desc"/>
                        <dojotreenoderelation id="ext_documentation_s1_dt1_n6_rel_doclinks" relation="EXT_DOCLINKS"/>
                    </dojotreenode>
                    <dojotreenode id="ext_documentation_s1_dt1_n7" objectname="SR">
                        <dojotreenodeattribute dataattribute="ticketid" id="ext_documentation_s1_dt1_n7_ticketid"/>
                        <dojotreenodeattribute dataattribute="description" id="ext_documentation_s1_dt1_n7_desc"/>
                        <dojotreenoderelation id="ext_documentation_s1_dt1_n7_rel_doclinks" relation="EXT_DOCLINKS"/>
                    </dojotreenode>
                    <dojotreenode id="ext_documentation_s1_dt1_n8" objectname="PLUSPERMIT">
                        <dojotreenodeattribute dataattribute="wonum" id="ext_documentation_s1_dt1_n8_ticketid"/>
                        <dojotreenodeattribute dataattribute="description" id="ext_documentation_s1_dt1_n8_desc"/>
                        <dojotreenoderelation id="ext_documentation_s1_dt1_n8_rel_doclinks" relation="EXT_DOCLINKS"/>
                    </dojotreenode>
                </dojotree>
            </sectioncol>
            <sectioncol id="ext_documentation_s1_c2" width="50%">
                <section id="ext_documentation_s1_c2_s1" inputmode="readonly" parentdatasrc="ext_documentation_s1" relationship="EXT_DOCLINK">
                    <multiparttextbox dataattribute="document" descdataattribute="docinfo.description" id="ext_documentation_s1_c2_s1_tb1"/>
                    <textbox dataattribute="description" id="ext_documentation_s1_c2_s1_tb4"/>
                    <textbox dataattribute="docversion" id="ext_documentation_s1_c2_s1_tb2"/>
                    <textbox dataattribute="doctype" id="ext_documentation_s1_c2_s1_tb3"/>
                </section>
            </sectioncol>
        </sectionrow>
    </section>
    <script datasrc="ext_documentation_s1_c2_s1" id="ext_documentation_s2_preview_js" scriptnum="DOCLINKS_PREVIEW" />
    <section id="ext_documentation_s2_preview" />
</tab>