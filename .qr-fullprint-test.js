
const crypto = require('crypto');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
function dllEncodeId(id) {
  const key = '3go8&$8*3*3h0k(2)2';
  let x = '';
  for (let i = 0; i < id.length; i++) x += String.fromCharCode(id.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  return crypto.createHash('md5').update(x, 'utf8').digest('base64');
}
const hex = () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)];
const deviceId = Array.from({ length: 52 }, hex).join('');
const now = Date.now().toString().substr(0, 10);
const csrf = deviceId.slice(0, 32).toLowerCase();

(async () => {
  // 1. 匿名注册（完整指纹 cookie）
  const deviceCookie = `osver=Windows%2010%3B%20%3B%3B%3B31d0d3b8-4a2c-4a4d-a2b8-1a9b8f1e1234; deviceId=${deviceId}; os=pc; appver=3.0.2; versioncode=300; resolution=1920x1080; __csrf=${csrf}; channel=netease; buildver=${now}`;
  const encodedId = Buffer.from(deviceId + ' ' + dllEncodeId(deviceId), 'utf-8').toString('base64');
  const regRes = await fetch('https://music.163.com/api/register/anonimous', {
    method: 'POST',
    headers: { 'User-Agent': UA, Referer: 'https://music.163.com', 'Content-Type': 'application/x-www-form-urlencoded', Cookie: deviceCookie },
    body: new URLSearchParams({ username: encodedId }),
  });
  const regSetCookie = regRes.headers.getSetCookie ? regRes.headers.getSetCookie().join(';') : '';
  const musicA = /MUSIC_A=([^;\s"']+)/.exec(regSetCookie)?.[1] ?? /MUSIC_A=([^;\s"']+)/.exec(await regRes.text())?.[1];
  console.log('[register]', regRes.status, '| MUSIC_A:', musicA ? '✅' : '❌');

  // 2. 完整指纹 + MUSIC_A 的 QR create
  const fullCookie = deviceCookie + (musicA ? '; MUSIC_A=' + musicA : '');
  const cRes = await fetch('https://music.163.com/api/login/qrcode/unikey?type=3&noCheckToken=true', {
    method: 'POST',
    headers: { 'User-Agent': UA, Referer: 'https://music.163.com', Cookie: fullCookie },
  });
  const cJ = await cRes.json();
  console.log('[qr create]', cJ.code, '| unikey:', cJ.unikey?.slice(0, 16) ?? JSON.stringify(cJ).slice(0, 80));
  if (!cJ.unikey) return;

  // 3. check 轮询 3 次
  for (let i = 1; i <= 3; i++) {
    const chk = await fetch('https://music.163.com/api/login/qrcode/client/login?key=' + cJ.unikey + '&type=3', {
      method: 'POST',
      headers: { 'User-Agent': UA, Referer: 'https://music.163.com', Cookie: fullCookie },
    });
    console.log(`[check #${i}]`, (await chk.text()).slice(0, 80));
    await new Promise(r => setTimeout(r, 2500));
  }
})().catch(e => console.error('ERR:', e.message));
