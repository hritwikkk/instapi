import { MongoClient } from 'mongodb';
import axios from 'axios';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function getInstaName(username) {
    try {
        const url = `https://www.instagram.com/${username}/`;
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0 Safari/537.36' }
        });
        const nameMatch = data.match(/<meta property="og:title" content="(.*?) \(@/);
        return nameMatch ? nameMatch[1] : username;
    } catch (e) {
        return username;
    }
}

export default async function handler(req, res) {
    const { key, username } = req.query;

    if (!username) return res.status(400).json({ error: "Username required" });

    try {
        await client.connect();
        const db = client.db("insta_data");
        const collection = db.collection("users");

        // 1. Check if username was already generated and saved
        const cachedUser = await collection.findOne({ "result.username": username });
        if (cachedUser) {
            const { _id, ...dataWithoutId } = cachedUser;
            return res.status(200).json(dataWithoutId);
        }

        // 2. Fetch Keys and City JSON from your Pastebins
        const [keysRes, citiesRes] = await Promise.all([
            axios.get(process.env.PASTEBIN_URL),
            axios.get(process.env.CITIES_JSON_URL)
        ]);

        // 3. Key Validation
        const keys = keysRes.data.split('\n').map(k => k.trim());
        if (!keys.includes(key)) return res.status(401).json({ error: "Invalid API Key" });

        // 4. Generate Random Data
        const realName = await getInstaName(username);
        const cityData = citiesRes.data; 
        const randomCity = cityData[Math.floor(Math.random() * cityData.length)];
        
        // Random Phone (Starts with 6, 7, 8, or 9)
        const firstDigit = ["6", "7", "8", "9"][Math.floor(Math.random() * 4)];
        const remaining = Math.floor(100000000 + Math.random() * 899999999).toString();
        const randomPhone = "+91" + firstDigit + remaining;

        const responseData = {
            "API BY": "@oguwave",
            "result": {
                "country": "India",
                "city": randomCity.city,
                "telephone": randomPhone,
                "username": username,
                "email": `${username}@gmail.com`,
                "account_id": Math.floor(100000000 + Math.random() * 900000000).toString(),
                "account_name": realName
            },
            "Owner": "@oguwave"
        };

        // 5. Save to MongoDB so next time it's instant
        await collection.insertOne({ ...responseData });

        return res.status(200).json(responseData);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
            }
        
