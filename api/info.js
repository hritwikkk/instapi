const { MongoClient } = require('mongodb');
const axios = require('axios');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function getInstaName(username) {
    try {
        const url = `https://www.instagram.com/${username}/`;
        // Added a common User-Agent and a timeout
        const { data } = await axios({
            method: 'get',
            url: url,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0 Safari/537.36' },
            timeout: 5000
        });
        const nameMatch = data.match(/<meta property="og:title" content="(.*?) \(@/);
        return nameMatch ? nameMatch[1] : username;
    } catch (e) {
        return username;
    }
}

module.exports = async (req, res) => {
    // Standard Vercel Headers for CORS (allows you to use this API anywhere)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { key, username } = req.query;

    if (!username || !key) {
        return res.status(400).json({ error: "Missing key or username" });
    }

    try {
        await client.connect();
        const db = client.db("insta_data");
        const collection = db.collection("users");

        const cachedUser = await collection.findOne({ "result.username": username });
        if (cachedUser) {
            const { _id, ...cleanData } = cachedUser;
            return res.status(200).json(cleanData);
        }

        const [keysRes, citiesRes] = await Promise.all([
            axios.get(process.env.PASTEBIN_URL),
            axios.get(process.env.CITIES_JSON_URL)
        ]);

        const keys = keysRes.data.split('\n').map(k => k.trim());
        if (!keys.includes(key)) {
            return res.status(401).json({ error: "Invalid API Key" });
        }

        const realName = await getInstaName(username);
        const cityData = citiesRes.data;
        const randomCity = cityData[Math.floor(Math.random() * cityData.length)];
        
        const firstDigit = ["6", "7", "8", "9"][Math.floor(Math.random() * 4)];
        const remaining = Math.floor(100000000 + Math.random() * 899999999).toString();
        
        const responseData = {
            "API BY": "@oguwave",
            "result": {
                "country": "India",
                "city": randomCity.city || "Delhi",
                "telephone": "+91" + firstDigit + remaining,
                "username": username,
                "email": `${username}@gmail.com`,
                "account_id": Math.floor(100000000 + Math.random() * 900000000).toString(),
                "account_name": realName
            },
            "Owner": "@oguwave"
        };

        await collection.insertOne({ ...responseData });
        return res.status(200).json(responseData);

    } catch (error) {
        return res.status(500).json({ error: "Server Error", message: error.message });
    }
};
    
