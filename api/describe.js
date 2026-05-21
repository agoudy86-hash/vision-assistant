const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image } = req.body;
        const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // إرسال الطلب برابط مدمج وصحيح 100% في سطر واحد
        const response = await fetch("https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large", {
            headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}` },
            method: "POST",
            body: buffer,
        });

        const result = await response.json();
        
        // إذا كان النموذج يستيقظ لأول مرة
        if (result.error && result.error.includes("loading")) {
            return res.status(200).json({ description: "الذكاء الاصطناعي يستيقظ الآن.. انتظر 5 ثوانٍ واضغط مجدداً" });
        }

        if (!result || !result[0] || !result[0].generated_text) {
            return res.status(500).json({ error: JSON.stringify(result) });
        }

        let englishDescription = result[0].generated_text;

        // ترجمة فورية ومجانية للعربية
        const translateRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(englishDescription)}`);
        const translateJson = await translateRes.json();
        const arabicDescription = translateJson[0][0][0];

        return res.status(200).json({ description: arabicDescription });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};
