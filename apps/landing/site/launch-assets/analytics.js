// First-party analytics are optional. No fingerprint, email, IP or full URL is
// sent. A random session expires after 30 minutes of inactivity.
const consentKey = 'picket_analytics_consent_v1';
const sessionKey = 'picket_analytics_session_v1';
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* no persistence */ } },
};
const privacySignal = navigator.globalPrivacyControl || navigator.doNotTrack === '1';
function send(event) {
  if (privacySignal || storage.get(consentKey) !== 'yes') return;
  try {
    let session;
    try { session = JSON.parse(sessionStorage.getItem(sessionKey)); } catch { /* new session */ }
    if (!session || Date.now() - session.at > 30 * 60 * 1000) session = { id: crypto.randomUUID() };
    session.at = Date.now();
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
    const source = new URLSearchParams(location.search).get('utm_source') || '';
    const campaign = /^[a-zA-Z0-9_-]{0,120}$/.test(source) ? source : '';
    void fetch('/events', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: crypto.randomUUID(), sessionId: session.id, event, channel: 'landing', campaign }) }).catch(() => {});
  } catch { /* analytics must not interrupt navigation/downloads */ }
}
document.querySelectorAll('a[download]').forEach(link => {
  if (new URL(link.href, location.href).pathname.endsWith('.apk')) link.addEventListener('click', () => send('apk_click'));
});
const panel = document.createElement('aside');
panel.className = 'analytics-choice';
panel.setAttribute('aria-label', 'Lựa chọn thống kê truy cập');
panel.innerHTML = '<p>Cho phép Picket thống kê lượt truy cập và nút tải để cải thiện trang? Không thu thập nội dung tài chính. <a href="/privacy.html">Tìm hiểu thêm</a></p><div><button type="button" data-accept>Cho phép thống kê</button><button type="button" data-decline>Không đồng ý</button></div>';
if (!privacySignal && !storage.get(consentKey)) document.body.append(panel);
panel.querySelector('[data-accept]').addEventListener('click', () => { storage.set(consentKey, 'yes'); panel.remove(); send('landing_view'); });
panel.querySelector('[data-decline]').addEventListener('click', () => { storage.set(consentKey, 'no'); panel.remove(); });
const footer = document.querySelector('.footer-bottom');
if (footer && !privacySignal) {
  const settings = document.createElement('button'); settings.type = 'button'; settings.className = 'analytics-settings'; settings.textContent = 'Lựa chọn thống kê';
  settings.addEventListener('click', () => { if (!panel.isConnected) document.body.append(panel); }); footer.append(settings);
}
send('landing_view');
