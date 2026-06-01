const fetch = require('node-fetch');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body;
        if (!image) return res.status(200).json({ description: "الرجاء التقاط صورة أولاً" });

        const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        // التوكن المباشر الخاص بكِ
        const token = "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";

        const response = await fetch("https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large", {
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/octet-stream"
            },
            method: "POST",
            body: buffer
        });

        const result = await response.json();
        
        if (result.error && JSON.stringify(result.error).includes("loading")) {
            return res.status(200).json({ description: "الذكاء الاصطناعي يستعد.. انتظر 5 ثوانٍ واضغط مجدداً" });
        }

        if (!result || !result[0] || !result[0].generated_text) {
            return res.status(200).json({ description: "لم يتم التعرف على الصورة، جرب زاوية أخرى" });
        }

        let englishDescription = result[0].generated_text;

        // الترجمة للعربية
        const translateRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(englishDescription)}`);
        const translateJson = await translateRes.json();
        const arabicDescription = translateJson[0][0][0];

        return res.status(200).json({ description: arabicDescription });

    } catch (error) {
        return res.status(200).json({ description: "خطأ في السيرفر: " + error.message });
    }
};
