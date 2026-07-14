
/*
 * Decompiled with CFR 0.152.
 */
package psdi.scriptcontrol.en;

import java.io.*;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

//import org.apache.log4j.Logger;
import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import psdi.webclient.upgrade.MXApplyTransactions;

public class V9100_03
extends psdi.script.AutoUpgradeTemplate {

    public V9100_03(java.sql.Connection con, java.util.HashMap params, java.io.PrintStream ps) throws java.lang.Exception {
        super(con, params, ps);
    }

    @java.lang.Override
    protected void init() throws java.lang.Exception {
        this.scriptFileName = "V9100_03";
    }

    @java.lang.Override
    protected void process() throws java.lang.Exception {
        //MXApplyTransactions applyTransactions = new MXApplyTransactions();

        String toolboxFile = MXApplyTransactions.getMaximoRoot()
			+ File.separator + "resources" + File.separator + "presentations"
			+ File.separator + "system" + File.separator + "toolbox.xml";

        

		DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
		dbf.setValidating(false);

		java.io.FileReader f = new FileReader(toolboxFile);
		org.xml.sax.InputSource source = new org.xml.sax.InputSource(f);
		source.setEncoding(f.getEncoding());
        Document originalDocument = dbf.newDocumentBuilder().parse(source);
		// appName = "TOOLBOX";



        Element root = originalDocument.getDocumentElement();
        // Check if the script already exists
        boolean exists = false;

        for (int i = 0; i < root.getElementsByTagName("script").getLength(); i++) {
            Element script = (Element) root.getElementsByTagName("script").item(i);
            if (script != null && "ctrl_scriptcontrol".equalsIgnoreCase(script.getAttribute("id"))) {
                exists = true;
                break;
            }
        }

        if (!exists) {
            Element script = originalDocument.createElement("script");
            script.setAttribute("id", "ctrl_scriptcontrol");
            root.appendChild(script);
        } else {
            return;
        }

        // Save XML
        TransformerFactory tf = TransformerFactory.newInstance();
        Transformer transformer = tf.newTransformer();
        transformer.setOutputProperty(
            OutputKeys.INDENT, "yes"
        );

        transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "4");
        transformer.transform( new DOMSource(originalDocument), new StreamResult(toolboxFile) );
        
		// saveApplicationDocument(originalDocument.getDocumentElement());

		// // delete the toolbox entries in MAXLABEL
		// SQLUtility.doSql(dbCon, "delete from maxlabels where app= 'TOOLBOX'");
        // try {
        //     java.util.ArrayList<java.lang.String> updates = new java.util.ArrayList<java.lang.String>();
        //     java.sql.Statement stmt = this.con.createStatement();
        //     java.sql.ResultSet rs = stmt.executeQuery("select presentation from maxpresentation where app='TOOLBOX'");
        //     while (rs.next()) {
        //         java.lang.String presentationString = rs.getString("presentation");
        //         if (presentationString.indexOf("<richtexteditor") > -1) {
        //             return;
        //         }
        //         presentationString = this.replaceString(presentationString, "<section id=\"ctrl_section\">", " <richtexteditor id=\"ctrl_richtexteditor\"/> <section id=\"ctrl_section\">");
        //         int presentationLen = presentationString.length() + 1;
        //         int startchunk = 0;
        //         int endchunk = (presentationLen > 2000 ? 2000 : presentationLen) - 1;
        //         java.lang.String updatesql = "";
        //         if (this.util.dbIn == 2) {
        //             updatesql = "update maxpresentation set presentation='" + this.doubleUpQuotes(presentationString) + "' where app='TOOLBOX'";
        //             updates.add(updatesql);
        //             continue;
        //         }
        //         updatesql = "update maxpresentation set presentation=";
        //         updatesql = updatesql + "'" + this.doubleUpQuotes(presentationString.substring(startchunk, endchunk)) + "' where app='TOOLBOX'";
        //         updates.add(updatesql);
        //         startchunk = endchunk;
        //         while (startchunk < presentationLen - 1) {
        //             updatesql = "";
        //             if ((endchunk += 2000) > presentationLen) {
        //                 endchunk = presentationLen;
        //             }
        //             --endchunk;
        //             if (startchunk != 0) {
        //                 if (this.util.dbIn == 1 || this.util.dbIn == 3) {
        //                     updatesql = "update maxpresentation set presentation=presentation || ";
        //                 }
        //             } else {
        //                 updatesql = "update maxpresentation set presentation=";
        //             }
        //             updatesql = updatesql + "'" + this.doubleUpQuotes(presentationString.substring(startchunk, endchunk)) + "' where app='TOOLBOX'";
        //             startchunk = endchunk;
        //             updates.add(updatesql);
        //         }
        //     }
        //     rs.close();
        //     stmt.close();
        //     int len = updates.size();
        //     for (int i = 0; i < len; ++i) {
        //         this.executeSql(updates.get(i).toString());
        //     }
        //     this.executeSql("commit");
        // }
        // catch (java.lang.Exception e) {
        //     e.printStackTrace();
        // }
    }

    private java.lang.String replaceString(java.lang.String str, java.lang.String pattern, java.lang.String replacement) {
        int i = -1;
        int j = 0;
        if (str != null && replacement != null && pattern != null) {
            while ((i = str.indexOf(pattern, j)) >= 0) {
                java.lang.String t;
                str = t = str.substring(0, i) + replacement + str.substring(i + pattern.length());
                j = i + replacement.length();
            }
        }
        return str;
    }

    public java.lang.String doubleUpQuotes(java.lang.String inputData) {
        return this.replaceString(inputData, "'", "''");
    }

    private java.util.List<org.jdom2.Element> getMatchingContents(java.lang.String pattern, org.jdom2.Document presentation) throws java.lang.Exception {
        psdi.common.xpath.XPathEvaluator evaluator = new psdi.common.xpath.XPathEvaluator(pattern, null);
        return evaluator.getMatchingContents(presentation);
    }
}