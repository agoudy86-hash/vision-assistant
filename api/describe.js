const https = require('https');

module.exports = async (req, res) => {
    // إعدادات الـ CORS للسماح بالاتصال من واجهة الموقع
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body;
        if (!image) return res.status(200).json({ description: "الرجاء التقاط صورة أولاً" });

        // تنظيف وحفظ الصورة في بيئة السيرفر كـ Buffer
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        const token = "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";

        // إرسال طلب أمن ومباشر لحل أزمة الـ ENOTFOUND الناتجة عن الـ API الافتراضي
        const huggingFacePromise = new Promise((resolve, reject) => {
            const options = {
                hostname: 'api-inference.huggingface.co',
                path: '/models/Salesforce/blip-image-captioning-large',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': buffer.length
                },
                timeout: 10000 // مهلة اتصال 10 ثوانٍ لمنع التعليق
            };

            const reqHf = https.request(options, (resHf) => {
                let data = '';
                resHf.on('data', (chunk) => data += chunk);
                resHf.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch(e) {
                        reject(new Error("رد غير مفهوم من نموذج الذكاء الاصطناعي"));
                    }
                });
            });

            reqHf.on('error', (e) => reject(e));
            reqHf.on('timeout', () => { reqHf.destroy(); reject(new Error("انتهت مهلة الاتصال بالخادم الخارجي")); });
            reqHf.write(buffer);
            reqHf.end();
        });

        const result = await huggingFacePromise;

        // التحقق من فترات تحميل الموديل التلقائية
        if (result.error && JSON.stringify(result.error).includes("loading")) {
            return res.status(200).json({ description: "النموذج يستيقظ الآن.. انتظر 5 ثوانٍ ثم أعد المحاولة" });
        }

        if (result.error) {
            return res.status(200).json({ description: "الموديل مشغول حالياً، يرجى المحاولة بعد قليل" });
        }

        if (!result || !result[0] || !result[0].generated_text) {
            return res.status(200).json({ description: "لم يتم التقاط تفاصيل كافية، وجه الكاميرا بدقة وجرب مجدداً" });
        }

        const englishDescription = result[0].generated_text;

        // الترجمة الآمنة مباشرة من السيرفر لتخطي حظر المتصفحات
        const translatePromise = new Promise((resolve) => {
            https.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(englishDescription)}`, (resTr) => {
                let data = '';
                resTr.on('data', (chunk) => data += chunk);
                resTr.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json[0][0][0]);
                    } catch(e) {
                        resolve("الوصف: " + englishDescription);
                    }
                });
            }).on('error', () => resolve("الوصف: " + englishDescription));
        });

        const arabicDescription = await translatePromise;
        return res.status(200).json({ description: arabicDescription });

    } catch (error) {
        // طباعة رسالة واضحة للمستخدم في حال تكرار قيود شبكة Vercel
        return res.status(200).json({ description: "السيرفر يواجه ضغطاً في الاتصال بالشبكة الخارجيّة، أعد المحاولة فوراً." });
    }
};
