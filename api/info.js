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

    if (!username || !key) {
        return res.status(400).json({ error: "Missing parameters" });
    }

    try {
        await client.connect();
        const db = client.db("insta_data");
        const collection = db.collection("users");

        // IMPORTANT: Create the Auto-Delete Index (Runs only once)
        // This deletes documents 15 days (1296000 seconds) after 'createdAt'
        await collection.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 1296000 });

        const cachedUser = await collection.findOne({ "result.username": username });
        if (cachedUser) {
            const { _id, createdAt, ...cleanData } = cachedUser;
            return res.status(200).json(cleanData);
        }

        const [keysText, cityData] = await Promise.all([
            fetch(process.env.PASTEBIN_URL).then(r => r.text()),
            fetch(process.env.CITIES_JSON_URL).then(r => r.json())
        ]);

        const keys = keysText.split('\n').map(k => k.trim());
        if (!keys.includes(key)) {
            return res.status(401).json({ error: "Invalid API Key" });
        }

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
            "createdAt": new Date() // This starts the 15-day timer
        };

        await collection.insertOne(responseData);
        
        // Remove internal fields before sending response
        const { _id, createdAt, ...finalResponse } = responseData;
        return res.status(200).json(finalResponse);

    } catch (error) {
        return res.status(500).json({ error: "Server Error" });
    }
};
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

        // Fetch Pastebin Data
        const [keysRes, citiesRes] = await Promise.all([
            fetch(process.env.PASTEBIN_URL).then(r => r.text()),
            fetch(process.env.CITIES_JSON_URL).then(r => r.json())
        ]);

        const keys = keysRes.split('\n').map(k => k.trim());
        if (!keys.includes(key)) {
            return res.status(401).json({ error: "Invalid API Key" });
        }

        // Get Real Name (will fallback to username if Instagram blocks Vercel)
        const realName = await getInstaName(username);
        
        const randomCity = citiesRes[Math.floor(Math.random() * citiesRes.length)];
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
        return res.status(500).json({ 
            error: "Server Error", 
            message: "Check your Environment Variables or MongoDB Access" 
        });
    }
};
    
