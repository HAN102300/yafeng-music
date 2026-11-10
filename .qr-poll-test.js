
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
(async () => {
  const keyRes = await fetch('https://music.163.com/api/login/qrcode/unikey?type=3&noCheckToken=true', {
    headers: { 'User-Agent': UA, Referer: 'https://music.163.com' },
  });
  const { unikey } = await keyRes.json();
  console.log('unikey:', unikey.slice(0, 20));
  for (let i = 1; i <= 5; i++) {
    const checkRes = await fetch('https://music.163.com/api/login/qrcode/client/login?key=' + unikey + '&type=3', {
      headers: { 'User-Agent': UA, Referer: 'https://music.163.com' },
    });
    const raw = await checkRes.text();
    let code = '?';
    try { code = JSON.parse(raw).code; } catch {}
    console.log(`poll#${i}: ${checkRes.status} code=${code} body=${raw.slice(0, 90)}`);
    await new Promise(r => setTimeout(r, 3000));
  }
})().catch(e => console.error('ERR:', e.message));
