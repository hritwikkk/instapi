const { MongoClient } = require('mongodb');
const fetch = require('node-fetch');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function getInstaName(username) {
    try {
        const url = `https://www.instagram.com/${username}/`;
        const res = await fetch(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 2500 
        });
        if (!res.ok) return username;
        const data = await res.text();
        const nameMatch = data.match(/<meta property="og:title" content="(.*?) \(@/);
        return nameMatch ? nameMatch[1] : username;
    } catch (e) {
        return username;
    }
}

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const { key, username } = req.query;

    // 1. Immediate Parameter Check
    if (!username || !key) {
        return res.status(400).json({ error: "Missing parameters: key and username are required" });
    }

    try {
        // 2. FIRST STEP: Check the Key from Pastebin
        const keysText = await fetch(process.env.PASTEBIN_URL).then(r => r.text());
        const keys = keysText.split('\n').map(k => k.trim());
        
        if (!keys.includes(key)) {
            return res.status(401).json({ error: "Invalid API Key. Access Denied." });
        }

        // 3. SECOND STEP: Connect to MongoDB only AFTER key is verified
        await client.connect();
        const db = client.db("insta_data");
        const collection = db.collection("users");

        // 4. Check Cache
        const cachedUser = await collection.findOne({ "result.username": username });
        if (cachedUser) {
            const { _id, createdAt, ...cleanData } = cachedUser;
            return res.status(200).json(cleanData);
        }

        // 5. Generate New Data (If not in cache)
        const cityData = await fetch(process.env.CITIES_JSON_URL).then(r => r.json());
        const realName = await getInstaName(username);
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
            "Owner": "@oguwave",
            "createdAt": new Date() 
        };

        // 6. Save and Set TTL Index (15 days)
        await collection.insertOne(responseData);
        await collection.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 1296000 });

        const { _id, createdAt, ...finalResponse } = responseData;
        return res.status(200).json(finalResponse);

    } catch (error) {
        return res.status(500).json({ error: "Server Error", message: error.message });
    }
};
                   
