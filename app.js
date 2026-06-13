const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 المتغيرات حطها هنا مباشرة (ما تحتاج Environment Variables)
const CLIENT_ID = '1515293075889586286';
const CLIENT_SECRET = '0rk6vvtVp26Asgn9yw-98I2uWdN7BPJ5';  // حط السر الصحيح هنا
const REDIRECT_URI = 'https://dashboard-token.onrender.com/callback';
const ADMIN_PASSWORD = 'MySecretPass123';

const TOKENS_FILE = path.join(__dirname, 'stock.txt');

app.get('/', (req, res) => {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
    
    res.send(`
        <div style="text-align: center; margin-top: 100px; font-family: sans-serif; background: #23272a; color: white; padding: 40px; border-radius: 10px;">
            <h2>🚀 تسجيل الدخول عبر ديسكورد</h2>
            <p>اضغط على الزر أدناه لبدء عملية المصادقة</p>
            <br>
            <a href="${authUrl}" style="background: #5865F2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">تسجيل الدخول</a>
        </div>
    `);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send('تم إلغاء العملية.');

    try {
        const response = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = response.data.access_token;

        fs.appendFile(TOKENS_FILE, accessToken + '\n', (err) => {
            if (err) console.log('خطأ في حفظ الملف:', err);
        });

        res.send(`
            <div style="text-align: center; font-family: sans-serif; margin-top: 100px;">
                <h2 style="color: #43b581;">🎉 تمت العملية بنجاح!</h2>
                <p>تم استلام التوكن وحفظه.</p>
                <br>
                <a href="/admin-dashboard?password=${ADMIN_PASSWORD}" style="color: #5865F2;">عرض التوكنات</a>
            </div>
        `);
    } catch (error) {
        res.send('حدث خطأ أثناء معالجة الطلب.');
    }
});

app.get('/admin-dashboard', (req, res) => {
    const password = req.query.password;

    if (!password || password !== ADMIN_PASSWORD) {
        return res.status(403).send(`
            <div style="text-align: center; margin-top: 100px; font-family: sans-serif;">
                <h2 style="color: red;">⚠️ غير مصرح بالدخول</h2>
                <p>يرجى إدخال كلمة المرور الصحيحة في الرابط.</p>
            </div>
        `);
    }

    fs.readFile(TOKENS_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.send('<h2>⚠️ لا توجد بيانات حالياً.</h2>');
        }

        const tokensList = data.split('\n')
            .filter(line => line.trim() !== '')
            .map(token => `
                <div style="background: #f4f4f4; padding: 10px; margin: 5px 0; border-radius: 5px; font-family: monospace; cursor: pointer;" 
                     onclick="navigator.clipboard.writeText('${token.replace(/'/g, "\\'")}'); alert('✅ تم النسخ!')">
                    ${token}
                </div>
            `).join('');

        res.send(`
            <div style="max-width: 600px; margin: 40px auto; font-family: sans-serif;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <h2>🔐 لوحة الإدارة والمراقبة</h2>
                <p>📋 اضغط على أي توكن لنسخه:</p>
                <hr>
                ${tokensList || '<p>الملف فارغ حالياً.</p>'}
                <hr>
                <p style="color: gray;">📦 عدد التوكنات: ${tokensList.split('</div>').length - 1}</p>
            </div>
        `);
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ السيرفر شغال على بورت: ${PORT}`);
});
