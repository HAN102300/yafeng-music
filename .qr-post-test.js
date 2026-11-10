
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
(async () => {
  // create POST（对齐 NCM：POST 到 api 端点）
  const cRes = await fetch('https://music.163.com/api/login/qrcode/unikey?type=3&noCheckToken=true', {
    method: 'POST',
    headers: { 'User-Agent': UA, Referer: 'https://music.163.com' },
  });
  const cJ = await cRes.json();
  console.log('[create POST]', cRes.status, '| code:', cJ.code, '| unikey:', cJ.unikey?.slice(0, 16));
  if (!cJ.unikey) return;

  // check 轮询 3 次：POST + form body
  for (let i = 1; i <= 3; i++) {
    const res = await fetch('https://music.163.com/api/login/qrcode/client/login?key=' + cJ.unikey + '&type=3', {
      method: 'POST',
      headers: { 'User-Agent': UA, Referer: 'https://music.163.com', 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const raw = await res.text();
    console.log(`[check POST #${i}] ${res.status} ${raw.slice(0, 100)}`);
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log('✅ 若全 801 = POST 通道稳定');
})().catch(e => console.error('ERR:', e.message));
