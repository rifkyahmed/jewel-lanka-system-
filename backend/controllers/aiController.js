const GoldRate = require('../models/GoldRate');

exports.chatWithJewelBot = async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;
        
        // 1. Fetch live gold rates to inject context
        let currentRates = { gold_24k: 0, gold_22k: 0, gold_20k: 0, gold_18k: 0 };
        try {
            const rateDoc = await GoldRate.findOne().sort({ createdAt: -1 });
            if (rateDoc) currentRates = rateDoc.rates;
        } catch (err) {
            console.error("Error fetching rates for AI context:", err);
        }

        // 2. Build the System Prompt
        const systemPrompt = `You are JewelBot, an expert jewelry business assistant for "Jewel Lanka", a high-end jewelry shop. 
Your role is to help the shop admin calculate prices, write descriptions, and give business advice.

CURRENT LIVE MARKET DATA:
- 24K Gold Rate: Rs. ${currentRates.gold_24k} per gram
- 22K Gold Rate: Rs. ${currentRates.gold_22k} per gram
- 20K Gold Rate: Rs. ${currentRates.gold_20k} per gram
- 18K Gold Rate: Rs. ${currentRates.gold_18k} per gram

GUIDELINES:
1. Always use the provided live gold rates for any calculations.
2. If asked to quote a price, calculate: (Gold Weight * Gold Rate) + Making Charges. Always clarify if making charges are assumed or provided by the user.
3. If asked to write a product description, write elegantly and luxuriously.
4. Keep your responses concise, professional, and formatted cleanly with markdown (use bolding for final prices).
5. You are talking to the shop admin/owner, not the customer.`;

        // 3. Format messages for NVIDIA API
        const messages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
            { role: "user", content: message }
        ];

        // 4. Call NVIDIA NIM API (Llama 3 70B Instruct)
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.NVIDIA_API_KEY?.trim()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta/llama-3.3-70b-instruct",
                messages: messages,
                temperature: 0.5,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NVIDIA API Error: ${errorText}`);
        }

        const data = await response.json();
        const aiMessage = data.choices[0].message.content;

        res.json({ reply: aiMessage });

    } catch (error) {
        console.error("JewelBot Error:", error);
        res.status(500).json({ message: "Failed to communicate with AI.", error: error.message });
    }
};

exports.generateDescription = async (req, res) => {
    try {
        const { prompt } = req.body;
        
        const systemPrompt = `You are an expert luxury jewelry copywriter. The user will give you a rough idea or keywords for a jewelry piece. You must generate a highly professional, luxurious, and elegant product description suitable for a high-end receipt, catalog, or e-commerce store. Keep it to 2-3 sentences.`;

        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.NVIDIA_API_KEY?.trim()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta/llama-3.3-70b-instruct",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 150
            })
        });

        if (!response.ok) throw new Error("API Error");
        const data = await response.json();
        res.json({ description: data.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ message: "Failed to generate description", error: error.message });
    }
};

exports.generateInsights = async (req, res) => {
    try {
        const { dashboardData } = req.body;
        
        const systemPrompt = `You are an elite Business Intelligence AI for 'Jewel Lanka', a jewelry store. You will receive a JSON dump of their current dashboard data (sales, dead stock, top products, etc.). Analyze this data and provide a concise, actionable, 3-paragraph executive summary highlighting: 1. Current financial health & trends. 2. Dead stock exposure and what to do with it. 3. Which products to push right now. Do NOT output raw JSON or code, only natural language advice formatted beautifully in Markdown.`;

        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.NVIDIA_API_KEY?.trim()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta/llama-3.3-70b-instruct",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: JSON.stringify(dashboardData) }
                ],
                temperature: 0.5,
                max_tokens: 500
            })
        });

        if (!response.ok) throw new Error("API Error");
        const data = await response.json();
        res.json({ insights: data.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ message: "Failed to generate insights", error: error.message });
    }
};

exports.generateCustomerProfile = async (req, res) => {
    try {
        const { customerData, orderHistory } = req.body;
        const systemPrompt = `You are an expert CRM AI for Jewel Lanka. Analyze the customer's purchase history and profile. Give a 3-point summary: 1. Buying Habits, 2. Value Tier (e.g. VIP), 3. Recommended approach to sell to them next. Keep it short and actionable.`;

        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${process.env.NVIDIA_API_KEY?.trim()}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "meta/llama-3.3-70b-instruct",
                messages: [ { role: "system", content: systemPrompt }, { role: "user", content: JSON.stringify({customerData, orderHistory}) } ],
                temperature: 0.6, max_tokens: 300
            })
        });
        if (!response.ok) throw new Error("API Error");
        const data = await response.json();
        res.json({ profile: data.choices[0].message.content });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.estimateRepairCost = async (req, res) => {
    try {
        const { description, estimatedWeight } = req.body;
        const systemPrompt = `You are a Master Jeweler AI. The user will provide a repair description and rough weight. Estimate a reasonable repair cost in LKR (Sri Lankan Rupees). Also give a brief 1-sentence reason. Provide only a short, professional response.`;

        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${process.env.NVIDIA_API_KEY?.trim()}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "meta/llama-3.3-70b-instruct",
                messages: [ { role: "system", content: systemPrompt }, { role: "user", content: `Damage: ${description}, Weight: ${estimatedWeight}g` } ],
                temperature: 0.4, max_tokens: 150
            })
        });
        if (!response.ok) throw new Error("API Error");
        const data = await response.json();
        res.json({ estimate: data.choices[0].message.content });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.generateMarketingCampaign = async (req, res) => {
    try {
        const { prompt } = req.body;
        const systemPrompt = `You are a luxury jewelry marketing expert. Create a short, persuasive SMS or Email campaign based on the user's prompt. Make it elegant and compelling to high-net-worth customers.`;

        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${process.env.NVIDIA_API_KEY?.trim()}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "meta/llama-3.3-70b-instruct",
                messages: [ { role: "system", content: systemPrompt }, { role: "user", content: prompt } ],
                temperature: 0.7, max_tokens: 200
            })
        });
        if (!response.ok) throw new Error("API Error");
        const data = await response.json();
        res.json({ campaign: data.choices[0].message.content });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.predictMarket = async (req, res) => {
    try {
        const rates = await GoldRate.find().sort({ createdAt: -1 }).limit(30);
        const systemPrompt = `You are a Global Commodities & Gold Market Analyst AI. Analyze the provided historical gold rates for the last 30 days. Consider global macro-economic trends (inflation, US dollar strength, geopolitical tensions) and provide a professional 3-paragraph prediction: 1. Current trend analysis. 2. Short-term forecast (will it increase/decrease?). 3. Business advice for the jeweler (Should they buy wholesale now or wait? Should they sell?).`;

        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${process.env.NVIDIA_API_KEY?.trim()}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "meta/llama-3.3-70b-instruct",
                messages: [ { role: "system", content: systemPrompt }, { role: "user", content: JSON.stringify(rates) } ],
                temperature: 0.5, max_tokens: 500
            })
        });
        if (!response.ok) throw new Error("API Error");
        const data = await response.json();
        res.json({ prediction: data.choices[0].message.content });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
