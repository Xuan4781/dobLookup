// import express from 'express';
// import dotenv from 'dotenv';
// import cors from 'cors';
// import { query } from './db.js';
// import fetch from 'node-fetch';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5001;

// app.use(cors());
// app.use(express.json());


// //api routes
// app.post('/api/lookup', async (req, res) => {
//     let { address} = req.body;
//     if(!address) {
//         return res.status(400).json({ error: 'Address is required' })
//     }   
//     address = address.toUpperCase();

//     let responded = false;

//     try {
//         //check if it exist in DB
//         const existing = await query(
//             'SELECT * FROM buildings WHERE address = $1',
//             [address]
//         );

//         if(existing.rows.length){
//             return res.status(200).json(existing.rows[0]);
//         }

//         console.log(`Recieved address for lookup: ${address}`);

//         const [houseNumber, ...streetParts] = address.split(' ');
//         const streetName = streetParts.join(' ');

//         //NYC DOB NOW: Safety – Facades Compliance Filings API URL 
//         const apiUrl = `https://data.cityofnewyork.us/resource/xubg-57si.json?$where=house_no='${encodeURIComponent(
//             houseNumber)}' AND street_name='${encodeURIComponent(streetName)}'`;

//         const response = await fetch(apiUrl);
//         const data = await response.json();

//         if(!data.length){
//             return res.status(404).json({error: 'No DOB filings found for this address'});
//         }

//         const dobData = {
//             owner: data[0].owner_name || data[0].owner_bus_name,
//             borough: data[0].borough || borough,
//             filingType: data[0].filing_type,
//             currentStatus: data[0].current_status,
//             filingDate: data[0].filing_date,
//             comments: data[0].comments,
//             contactEmail: data[0].qewi_bus_email,
//             contactPhone: data[0].qewi_bus_phone,
//         };


//         //save to postgress
//         const newBuilding = await query(
//             "INSERT INTO buildings (address, dob_data, last_checked) VALUES ($1, $2, $3) RETURNING *",
//             [address, dobData, new Date()]
//         );

//         console.log(`Saved to database:`, newBuilding.rows[0]);
//         if(!responded){
//             res.status(200).json(newBuilding.rows[0]);
//             responded = true;
//         }

//     }  catch (err){
//         console.error(err.message);
//         if(!responded){
//             res.status(500).send('Server Error');
//             responded = true;
//         }
//     }
// });


// app.listen(PORT, () => {
//     console.log(`Server is listening on port ${PORT}`);
// });


import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fetch from 'node-fetch';
import { query } from './db.js';

// --- SETUP ---
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;
app.use(cors());
app.use(express.json());

// --- API ROUTE ---
app.post('/api/lookup', async (req, res) => {
    let { address } = req.body;
    if (!address) {
        return res.status(400).json({ error: 'Address is required' });
    }
    address = address.toUpperCase();

    try {
        let dobData;
        const existing = await query('SELECT * FROM buildings WHERE address = $1', [address]);

        if (existing.rows.length) {
            console.log(`Found address in database: ${address}`);
            // If data exists in the DB, use it.
            dobData = existing.rows[0].dob_data;
        } else {
            console.log(`Fetching new data for: ${address}`);
            const [houseNumber, ...streetParts] = address.split(' ');
            const streetName = streetParts.join(' ');
            const apiUrl = `https://data.cityofnewyork.us/resource/xubg-57si.json?$where=house_no='${encodeURIComponent(houseNumber)}' AND street_name='${encodeURIComponent(streetName)}'`;
            
            const response = await fetch(apiUrl);
            const data = await response.json();

            // FIX: This object contains all possible keys that correctly match your template.
            const fullTemplateData = {
                Address: address,
                Building_OwnerManager: 'N/A', Use_Type: 'N/A', Block: 'N/A', BIN: 'N/A',
                Borough: 'N/A', Year_Built: 'N/A', M__Floors: 'N/A', Approx_Sq_Ft: 'N/A',
                Landmark: 'N/A', Parking_Garage_YesNo: 'N/A', FISP_Compliance_Status: 'N/A',
                FISP_Cycle: 'N/A', FISP_Last_Filing_Status: 'N/A', FISP_SWARMP_Recommended_Date: 'N/A',
                FISP_Cycle_Filing_Window: 'N/A', FISP_Next_Steps: 'N/A', FISP_Notes__Budget_Request: 'N/A',
                LL84_Compliance_Status: 'N/A', LL87_Filing_Due: 'N/A', LL84_Next_Steps: 'N/A',
                LL87_Compliance_Status: 'N/A', LL87_Compliance_Year: 'N/A', LL87_Next_Steps: 'N/A',
                LL126_Compliance_Status: 'N/A', LL126_Cycle: 'N/A', LL126_Previous_Filing_Status: 'N/A',
                LL126_SREM_Recommended_Date: 'N/A', LL126_Filing_Window: 'N/A', LL126_Next_Steps: 'N/A',
                LL126_Notes__Budget_Request: 'N/A', LL88_Compliance_Status: 'N/A', LL88_Filing_Due: 'N/A',
                LL88_Notes: 'N/A', LL97_Compliance_Status: 'N/A', LL97_Filing_Due: 'N/A',
                LL97_Next_Steps: 'N/A', LL126_Parapet_Compliance_Status: 'N/A', LL126_Parapet_Notes: 'N/A',
                'Picture of Asset': 'N/A',
            };

            // FIX: This logic populates the template even if the API finds nothing.
            if (data.length > 0) {
                const apiResult = data[0];
                dobData = {
                    ...fullTemplateData,
                    Building_OwnerManager: apiResult.owner_name || apiResult.owner_bus_name || 'N/A',
                    Borough: apiResult.borough || 'N/A',
                    FISP_Compliance_Status: apiResult.current_status || 'N/A',
                    FISP_Notes__Budget_Request: apiResult.comments || 'N/A',
                    Block: apiResult.block || 'N/A',
                    BIN: apiResult.bin || 'N/A'
                };
            } else {
                console.log('No data found from API, using default placeholders.');
                dobData = fullTemplateData;
            }
            
            // Save the newly created data for next time.
            await query(
                "INSERT INTO buildings (address, dob_data, last_checked) VALUES ($1, $2, $3)",
                [address, dobData, new Date()]
            );
        }

        // --- WORD DOCUMENT GENERATION ---
        // FIX: This section now runs for both existing and new addresses.
        const templatePath = path.resolve("./temp.docx"); 
        const content = fs.readFileSync(templatePath, "binary");

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '«', end: '»' }, 
        });
        
        doc.render(dobData);

        const buf = doc.getZip().generate({ type: "nodebuffer" });

        // FIX: The final response is always the Word document.
        res.setHeader("Content-Disposition", "attachment; filename=Compliance_Report.docx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.send(buf);

    } catch (err) {
        console.error('Server Error:', err.message);
        res.status(500).json({ error: 'Server Error: ' + err.message });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});