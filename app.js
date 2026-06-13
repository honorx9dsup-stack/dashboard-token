const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// متغيرات التطبيق
const CLIENT_ID = '1515293075889586286';
const CLIENT_SECRET = 'FYOLy7auE9c9qPoblvVmnepZMFHR1pjL';
const REDIRECT_URI = 'https://dashboard-token.onrender.com/callback';
const ADMIN_PASSWORD = 'MySecretPass123';

const TOKENS_FILE = path.join(__dirname, 'stock.txt');

// التأكد من وجود الملف
if (!fs.existsSync(TOKENS_FILE)) {
    fs.writeFileSync(TOKENS_FILE, '', 'utf8');
}

// الصفحة الرئيسية
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

// معالجة الـ Callback
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

// الداشبورد + زر الحذف
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

        const lines = data.split('\n').filter(line => line.trim() !== '');
        
        const tokensList = lines.map((token, index) => `
            <div style="background: #f4f4f4; padding: 10px; margin: 5px 0; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; font-family: monospace;">
                <span style="word-break: break-all; flex: 1;">${token}</span>
                <button onclick="deleteToken(${index})" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-left: 10px;">🗑️</button>
            </div>
        `).join('');

        res.send(`
            <div style="max-width: 700px; margin: 40px auto; font-family: sans-serif;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <h2>🔐 لوحة الإدارة والمراقبة</h2>
                <p>📋 اضغط على أي توكن لنسخه، أو اضغط 🗑️ لحذفه:</p>
                <hr>
                ${tokensList || '<p>الملف فارغ حالياً.</p>'}
                <hr>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button onclick="deleteAllTokens()" style="background: #c0392b; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">🗑️ حذف كل التوكنات</button>
                    <button onclick="location.reload()" style="background: #3498db; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">🔄 تحديث</button>
                </div>
                <p style="color: gray; margin-top: 20px;">📦 عدد التوكنات: ${lines.length}</p>
            </div>
            <script>
                function copyToken(token) {
                    navigator.clipboard.writeText(token);
                    alert('✅ تم نسخ التوكن!');
                }
                
                async function deleteToken(index) {
                    if (confirm('هل تريد حذف هذا التوكن؟')) {
                        const response = await fetch('/delete-token?password=${ADMIN_PASSWORD}&index=' + index);
                        const result = await response.text();
                        alert(result);
                        location.reload();
                    }
                }
                
                async function deleteAllTokens() {
                    if (confirm('⚠️ هل تريد حذف كل التوكنات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
                        const response = await fetch('/delete-all-tokens?password=${ADMIN_PASSWORD}');
                        const result = await response.text();
                        alert(result);
                        location.reload();
                    }
                }
            </script>
        `);
    });
});

// API لحذف توكن معين
app.get('/delete-token', (req, res) => {
    const password = req.query.password;
    const index = parseInt(req.query.index);

    if (password !== ADMIN_PASSWORD) {
        return res.status(403).send('Unauthorized');
    }

    if (isNaN(index)) {
        return res.status(400).send('Invalid index');
    }

    fs.readFile(TOKENS_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Error reading file');
        
        const lines = data.split('\n').filter(line => line.trim() !== '');
        
        if (index >= lines.length) {
            return res.status(400).send('Invalid index');
        }
        
        lines.splice(index, 1);
        
        fs.writeFile(TOKENS_FILE, lines.join('\n') + (lines.length ? '\n' : ''), (err) => {
            if (err) return res.status(500).send('Error writing file');
            res.send('✅ تم حذف التوكن بنجاح');
        });
    });
});

// API لحذف كل التوكنات
app.get('/delete-all-tokens', (req, res) => {
    const password = req.query.password;

    if (password !== ADMIN_PASSWORD) {
        return res.status(403).send('Unauthorized');
    }

    fs.writeFile(TOKENS_FILE, '', (err) => {
        if (err) return res.status(500).send('Error clearing file');
        res.send('✅ تم حذف كل التوكنات بنجاح');
    });
});

// API لإضافة توكن (قديم)
app.get('/add-token', (req, res) => {
    const token = req.query.token;
    const password = req.query.password;

    if (password !== ADMIN_PASSWORD) {
        return res.status(403).send('Unauthorized');
    }

    if (!token) {
        return res.status(400).send('Token is required');
    }

    fs.appendFile(TOKENS_FILE, token + '\n', (err) => {
        if (err) return res.status(500).send('Error saving token');
        res.send('✅ Token saved successfully!');
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ السيرفر شغال على بورت: ${PORT}`);
});
