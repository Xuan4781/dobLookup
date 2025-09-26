import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { query } from './db.js';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());


//api routes
app.post('/api/lookup', async (req, res) => {
    const { address, borough = 'MANHATTAN'} = req.body;
    if(!address) {
        return res.status(400).json({ error: 'Address is required' })
    }   
    const upperAddress = address.toUpperCase();
    let responded = false;

    try {

        //check if it exist in DB
        const existing = await query(
            'SELECT * FROM buildings WHERE address = $1',
            [upperAddress]
        );

        if(existing.rows.length){
            return res.status(200).json(existing.rows[0]);
        }


        console.log(`Recieved address for lookup: ${address}`);

        const [houseNumber, ...streetParts] = address.split(' ');
        const streetName = streetParts.join(' ');

        //NYC DOB NOW: Safety – Facades Compliance Filings API URL 
        const apiUrl = `https://data.cityofnewyork.us/resource/xubg-57si.json?$where=house_no='${encodeURIComponent(
            houseNumber)}' AND street_name='${encodeURIComponent(streetName)}'`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        if(!data.length){
            return res.status(404).json({error: 'No DOB filings found for this address'});
        }

        const dobData = {
            owner: data[0].owner_name || data[0].owner_bus_name,
            filingType: data[0].filing_type,
            currentStatus: data[0].current_status,
            filingDate: data[0].filing_date,
            comments: data[0].comments,
            contactEmail: data[0].qewi_bus_email,
            contactPhone: data[0].qewi_bus_phone,
        };


        //save to postgress
        const newBuilding = await query(
            "INSERT INTO buildings (address, dob_data, last_checked) VALUES ($1, $2, $3) RETURNING *",
            [upperAddress, dobData, new Date()]
        );

        console.log(`Saved to database:`, newBuilding.rows[0]);
        if(!responded){
            res.status(200).json(newBuilding.rows[0]);
            responded = true;
        }

    }  catch (err){
        console.error(err.message);
        if(!responded){
            res.status(500).send('Server Error');
            responded = true;
        }
    }
});


app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});