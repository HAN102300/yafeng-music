
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
(async () => {
  const cRes = await fetch('https://music.163.com/api/login/qrcode/unikey?type=1&noCheckToken=true', {
    method: 'POST',
    headers: { 'User-Agent': UA, Referer: 'https://music.163.com' },
  });
  const cJ = await cRes.json();
  console.log('[create type1 api POST]', cRes.status, '| code:', cJ.code, '| unikey:', cJ.unikey?.slice(0, 16));
  if (!cJ.unikey) return;
  const res = await fetch('https://music.163.com/api/login/qrcode/client/login?key=' + cJ.unikey + '&type=1', {
    method: 'POST',
    headers: { 'User-Agent': UA, Referer: 'https://music.163.com' },
  });
  const raw = await res.text();
  console.log('[check type1 api POST]', res.status, '|', raw.slice(0, 120));
})().catch(e => console.error('ERR:', e.message));
