const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'لم يتم استلام صورة' });
        }

        const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // تنظيف التوكن من أي مسافات زائدة قد تكون نسخت بالخطأ
        const token = process.env.HUGGINGFACE_TOKEN ? process.env.HUGGINGFACE_TOKEN.trim() : '';

        const response = await fetch("https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large", {
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/octet-stream"
            },
            method: "POST",
            body: buffer,
        });

        const result = await response.json();
        
        // إذا كان النموذج يحتاج بضع ثوانٍ ليستيقظ
        if (result.error && JSON.stringify(result.error).includes("loading")) {
            return res.status(200).json({ description: "الذكاء الاصطناعي يستيقظ الآن.. انتظر 5 ثوانٍ ثم اضغط مجدداً" });
        }

        if (result.error) {
            return res.status(200).json({ description: "مشكلة في المفتاح السري: " + JSON.stringify(result.error) });
        }

        if (!result || !result[0] || !result[0].generated_text) {
            return res.status(200).json({ description: "يرجى المحاولة مرة أخرى: " + JSON.stringify(result) });
        }

        let englishDescription = result[0].generated_text;

        // الترجمة الفورية للعربية مجاناً
        const translateRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(englishDescription)}`);
        const translateJson = await translateRes.json();
        const arabicDescription = translateJson[0][0][0];

        return res.status(200).json({ description: arabicDescription });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "خطأ داخلي: " + error.message });
    }
};
