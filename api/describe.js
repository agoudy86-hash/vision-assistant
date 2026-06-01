module.exports = async (req, res) => {
    // إعدادات الأمان والسماح بالاتصال من الجوال
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body;
        if (!image) return res.status(200).json({ description: "الرجاء التقاط صورة أولاً" });

        // تنظيف كل أنواع صيغ الـ Base64 (jpeg, png, webp) بشكل مرن وصحيح
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        // التوكن السري المباشر الخاص بكِ
        const token = "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";

        // الاتصال بـ Hugging Face باستخدام الـ fetch المدمج تلقائياً في السيرفر
        const response = await fetch("https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large", {
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/octet-stream"
            },
            method: "POST",
            body: buffer
        });

        const result = await response.json();
        
        // التعامل الذكي مع فترات استيقاظ النموذج (Cold Start)
        if (result.error && JSON.stringify(result.error).includes("loading")) {
            return res.status(200).json({ description: "الذكاء الاصطناعي يستعد.. انتظر 5 ثوانٍ واضغط مجدداً" });
        }

        if (result.error) {
            return res.status(200).json({ description: "الموديل مشغول حالياً، جرب مجدداً خلال لحظات" });
        }

        if (!result || !result[0] || !result[0].generated_text) {
            return res.status(200).json({ description: "لم يتم التعرف على تفاصيل الصورة، جرب زاوية أخرى" });
        }

        const englishDescription = result[0].generated_text;

        // نظام ترجمة احتياطي مرن لتجنب حظر السيرفرات
        let arabicDescription = "لم تنجح الترجمة: " + englishDescription;
        try {
            const translateRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(englishDescription)}`);
            const translateJson = await translateRes.json();
            if(translateJson && translateJson[0] && translateJson[0][0]) {
                arabicDescription = translateJson[0][0][0];
            }
        } catch(e) {
            // إذا فشل مترجم جوجل لسبب ما، يعود بالوصف الإنجليزي لكي لا يتوقف السيرفر
            arabicDescription = "الوصف بالإنجليزية: " + englishDescription;
        }

        return res.status(200).json({ description: arabicDescription });

    } catch (error) {
        // طباعة تفاصيل الخطأ بدقة لمعرفته بدلاً من الكلمة المبهمة
        return res.status(200).json({ description: "تنبيه من السيرفر: " + error.message });
    }
};
