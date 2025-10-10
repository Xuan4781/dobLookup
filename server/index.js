import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

// Setup
const app = express();
const PORT = process.env.PORT || 5001;
app.use(cors());
app.use(express.json());
app.use(express.static('public'));


let buildingData = []; // excel data

// loads data from acel into buildingdata
function loadExcelData() {
    try {
        const workbook = xlsx.readFile('master_sheet.xlsx');
        const sheetName = workbook.SheetNames[0];
        buildingData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {cellDates: true});
        console.log(`✅ Data loaded/reloaded. ${buildingData.length} records in memory.`);
        return true;
    } catch (error) {
        console.error("Could not load 'master_sheet.xlsx'.", error.message);
        // if file doesnt load, server doesnt run
        if (buildingData.length === 0) process.exit(1); 
        return false;
    }
}

// Team can refresh excel sheet by going here: http://localhost:5001/api/refresh-data

app.get('/api/refresh-data', (req, res) => {
    console.log("Request received to refresh data...");
    if (loadExcelData()) {
        res.status(200).send('Server data has been successfully refreshed from the Excel sheet.');
    } else {
        res.status(500).send('Failed to refresh data. Check server logs for errors.');
    }
});

// user search address in excel 
app.post('/api/search-address', (req, res) => {
    const { address } = req.body;
    if (!address) {
        return res.status(400).json({ error: 'Address is required.' });
    }

    const searchAddress = address.trim().toLowerCase();
    const foundBuilding = buildingData.find(
        row => row.Address && row.Address.toString().trim().toLowerCase() === searchAddress
    );

    if (foundBuilding) {
        console.log(`Preview data found for: ${address}`);
        res.status(200).json(foundBuilding); // Send all data for that row
    } else {
        console.log(`Address not found: ${address}`);
        res.status(404).json({ error: 'Address not found in master sheet.' });
    }
});

// generating report 
app.post('/api/generate-report', (req, res) => {
    const { address } = req.body;
    if (!address) {
        return res.status(400).json({ error: 'Address is required.' });
    }
    
    const searchAddress = address.trim().toLowerCase();
    const reportData = buildingData.find(
        row => row.Address && row.Address.toString().trim().toLowerCase() === searchAddress
    );

    if (!reportData) {
        return res.status(404).json({ error: 'Data not found for report generation.' });
    }
    
    try {
        const templatePath = path.resolve("./temp.docx");
        const content = fs.readFileSync(templatePath, "binary");

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '«', end: '»' }, 
        });

        doc.render(reportData); 

        const buf = doc.getZip().generate({ type: "nodebuffer" });

        res.setHeader("Content-Disposition", "attachment; filename=Compliance_Report.docx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.send(buf);
    } catch (err) {
        console.error('Error generating document:', err.message);
        res.status(500).json({ error: 'Failed to generate the report.' });
    }
});

// starting server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    loadExcelData(); 
});




