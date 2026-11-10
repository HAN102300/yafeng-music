
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
(async () => {
  // NCM 的 register_anonimous 实现：POST /api/register/anonimous
  const res = await fetch('https://music.163.com/api/register/anonimous', {
    method: 'POST',
    headers: { 'User-Agent': UA, Referer: 'https://music.163.com' },
  });
  const raw = await res.text();
  console.log('register:', res.status, '| body:', raw.slice(0, 300));
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie().join(';') : '';
  const mu = /MUSIC_A=([^;\s"']+)/.exec(setCookie)?.[1] ?? /MUSIC_A=([^;\s"']+)/.exec(raw)?.[1];
  console.log('MUSIC_A:', mu ? mu.slice(0, 60) + '... (长度' + (mu?.length || 0) + ')' : '未拿到');
})().catch(e => console.error('ERR:', e.message));
