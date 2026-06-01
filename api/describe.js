const https = require('https');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body;
        if (!image) return res.status(200).json({ description: "الرجاء التقاط صورة أولاً" });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        const token = "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";

        // هنا تم تصحيح الرابط بدقة حاسمة إلى huggingface
        const huggingFacePromise = new Promise((resolve, reject) => {
            const options = {
                hostname: 'api-inference.huggingface.co',
                path: '/models/Salesforce/blip-image-captioning-large',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': buffer.length
                }
            };

            const reqHf = https.request(options, (resHf) => {
                let data = '';
                resHf.on('data', (chunk) => data += chunk);
                resHf.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch(e) {
                        reject(new Error("استجابة غير صالحة من الموديل"));
                    }
                });
            });

            reqHf.on('error', (e) => reject(e));
            reqHf.write(buffer);
            reqHf.end();
        });

        const result = await huggingFacePromise;

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

        const translatePromise = new Promise((resolve) => {
            https.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(englishDescription)}`, (resTr) => {
                let data = '';
                resTr.on('data', (chunk) => data += chunk);
                resTr.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json[0][0][0]);
                    } catch(e) {
                        resolve("الوصف بالإنجليزية: " + englishDescription);
                    }
                });
            }).on('error', () => resolve("الوصف بالإنجليزية: " + englishDescription));
        });

        const arabicDescription = await translatePromise;
        return res.status(200).json({ description: arabicDescription });

    } catch (error) {
        return res.status(200).json({ description: "تنبيه من السيرفر: " + error.message });
    }
};
