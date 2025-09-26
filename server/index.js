import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { query } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

//api routes
app.post('/api/lookup', async (req, res) => {
    const { address } = req.body;
    if(!address) {
        return res.status(400).json({ error: 'Address is required' })
    }
    let responded = false;

    try {
        //some fake data for now to fill in empty fields
        console.log(`Recieved address for lookup: ${address}`);

        const simulatedDobData = {
            violations: Math.floor(Math.random() * 10),
            permits: Math.floor(Math.random() * 5),
            lastUpdated: new Date().toISOString()
        };

        //save to postgress
        const newBuilding = await query(
            "INSERT INTO buildings (address, dob_data, last_checked) VALUES ($1, $2, $3) RETURNING *",
            [address, simulatedDobData, new Date()]
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