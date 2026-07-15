
/*
 * Decompiled with CFR 0.152.
 */
package psdi.scriptcontrol.en;

import java.io.*;
import java.sql.PreparedStatement;

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

import com.ibm.tivoli.maximo.dbmanage.SQLUtility;
import psdi.webclient.upgrade.MXApplyTransactions;

public class V9100_03
extends psdi.script.AutoUpgradeTemplate {

    private static final int CHUNK_SIZE = 2000;

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
            if (script != null && "ctrl_script".equalsIgnoreCase(script.getAttribute("id"))) {
                exists = true;
                break;
            }
        }

        if (!exists) {
            Element script = originalDocument.createElement("script");
            script.setAttribute("id", "ctrl_script");
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
        
        /* Also commiting new file into the database */
        SQLUtility.doSql(con, "delete from maxlabels where app= 'TOOLBOX'");

        StringWriter writer = new StringWriter();
        transformer.transform(new DOMSource(originalDocument), new StreamResult(writer));

        this.out.println(commentFlag + " Modified file is ");
        this.out.println(writer.toString());
        this.out.println(commentFlag);

		// saveApplicationDocument(originalDocument.getDocumentElement());
        this.out.println(commentFlag + " Updating toolbox in database");
        java.sql.PreparedStatement stmt = this.con.prepareStatement("update maxpresentation set presentation = ? where app = ?");
        stmt.setString(1, writer.toString());
        stmt.setString(2, "TOOLBOX");
        stmt.executeUpdate();
        con.commit();
        this.out.println(commentFlag + " Toolbox updated in database");
        
        
    }
}