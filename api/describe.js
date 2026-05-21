const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image } = req.body;
        if (!image) {
            return res.status(200).json({ description: "الرجاء التقاط صورة أولاً" });
        }

        const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const token = process.env.HUGGINGFACE_TOKEN ? process.env.HUGGINGFACE_TOKEN.trim() : '';

        // رابط مباشر مستقيم تماماً بدون أي علامات زائدة أو متغيرات مفرقة
        const response = await fetch("https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large", {
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/octet-stream"
            },
            method: "POST",
            body: buffer,
        });

        const result = await response.json();
        
        if (result.error && JSON.stringify(result.error).includes("loading")) {
            return res.status(200).json({ description: "الذكاء الاصطناعي يستيقظ.. انتظر 5 ثوانٍ واضغط مجدداً" });
        }

        if (result.error) {
            return res.status(200).json({ description: "تأكد من رمز الحساب: " + JSON.stringify(result.error) });
        }

        if (!result || !result[0] || !result[0].generated_text) {
            return res.status(200).json({ description: "حاول مرة أخرى: " + JSON.stringify(result) });
        }

        let englishDescription = result[0].generated_text;

        // الترجمة للعربية مجاناً
        const translateRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(englishDescription)}`);
        const translateJson = await translateRes.json();
        const arabicDescription = translateJson[0][0][0];

        return res.status(200).json({ description: arabicDescription });

    } catch (error) {
        return res.status(200).json({ description: "مشكلة اتصال: " + error.message });
    }
};
