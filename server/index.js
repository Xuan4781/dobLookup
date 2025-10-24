import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { execFile } from 'child_process';

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
        // const workbook = xlsx.readFile('final_merged.xlsx');
        const workbook = xlsx.readFile('final_merged.xlsx');
        const sheetName = workbook.SheetNames[0];
        buildingData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {cellDates: true});
        console.log(`✅ Data loaded/reloaded. ${buildingData.length} records in memory.`);
        return true;
    } catch (error) {
        console.error("Could not load 'final_merged.xlsx'.", error.message);
        // if file doesnt load, server doesnt run
        if (buildingData.length === 0) process.exit(1); 
        return false;
    }
}

function mapExcel(excelData){
    return {
        'Address': excelData['Address'],
        'Building_OwnerManager': excelData['Building Owner/Manager'],
        'Use Type': excelData['Use Type'],
        'Block': excelData['Block'],
        'BIN': excelData['BIN'],
        'Borough': excelData['Borough'],
        'Year Built': excelData['Year Built'],
        'M Floors': excelData['M Floors'],
        'Approx_Sq_Ft': excelData['Approx Sq Ft'],
        'Landmark': excelData['Landmark'],
        'Parking Garage (Yes/No)': excelData['Parking Garage'],
        //'FISP Compliance Status': excelData['FISP Compliance Status'],
        'Sub': excelData['Sub'],
        'FISP Filing Due': excelData['FISP Filing Due'],
        'FISP Last Filing Status': excelData['FISP Last Filing Status'],
        'FISP Cycle Filing Window': excelData['FISP Cycle Filing Window'],
        'LL126 Compliance Status': excelData['LL126 Compliance Status'],
        'LL126 Cycle': excelData['LL126 Cycle'],
        'LL126 Previous Filing Status': excelData['LL126 Previous Filing Status'],
        'LL126 SREM Recommended Date': excelData['LL126 SREM Recommended Date'],
        'LL126 Filing Window': excelData['LL126 Filing Window'],
        'LL126 Next Steps': excelData['LL126 Next Steps'],
        'LL126 Parapet Compliance Status': excelData['LL126 Parapet Compliance Status'],
        'LL84 Compliance Status': excelData['LL84 Compliance Status'],
        'LL84 Filing Due': excelData['LL84 Filing Due'],
        'LL84 Next Steps': excelData['LL84 Next Steps'],
        'LL87 Compliance Status': excelData['LL87 Compliance Status'],
        'LL87 Filing Due': excelData['LL87 Filing Due'],
        'LL87 Compliance Year': excelData['LL87 Compliance Year'],
        'LL87 Next Steps': excelData['LL87 Next Steps'],
        'LL88 Compliance Status': excelData['LL88 Compliance Status'],
        'LL88 Filing Due': excelData['LL88 Filing Due'],
        'LL88 Notes': excelData['LL88 Notes'],
        'LL97 Compliance Status': excelData['LL97 Compliance Status'],
        'LL97 Filing Due': excelData['LL97 Filing Due'],
        'LL97 Next Steps': excelData['LL97 Next Steps'],
        'Contact Email': excelData['Contact Email'],
        'Contact Phone': excelData['Contact Phone']
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

    
    const mappedData = mapExcel(reportData);
    
    
    const processedData = {};
    for (const [key, value] of Object.entries(mappedData)) {
        let processedValue = value;
        const stringValue = String(value).trim().toLowerCase();
        
        if (value === undefined || 
            value === null || 
            value === '' ||
            stringValue === '' ||
            stringValue === 'undefined' ||
            stringValue === 'null' ||
            stringValue === 'nan' ||
            Number.isNaN(value)) {
            processedValue = 'N/A';
        }    
        processedData[key] = processedValue;
    }
    
    try {
        const templatePath = path.resolve("./Building Report Card_Word Template.docx");
        const content = fs.readFileSync(templatePath, "binary");

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '«', end: '»' }, 
        });

        doc.render(processedData);

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




