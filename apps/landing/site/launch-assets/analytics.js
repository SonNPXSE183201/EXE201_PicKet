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
// First visit: a modal choice is required before using the page. Both answers keep the page and
// the APK download fully available (consent must be voluntary). A browser privacy signal counts as
// a refusal and is never asked again.
const backdrop = document.createElement('div');
backdrop.className = 'analytics-backdrop';
const panel = document.createElement('section');
panel.className = 'analytics-choice';
panel.setAttribute('role', 'dialog');
panel.setAttribute('aria-modal', 'true');
panel.setAttribute('aria-labelledby', 'analytics-choice-title');
panel.innerHTML = '<p class="analytics-stamp">Quyền riêng tư</p>'
  + '<h2 id="analytics-choice-title">Cho phép <em>thống kê</em> truy cập?</h2>'
  + '<p>Picket muốn đếm lượt xem trang và lượt bấm tải để làm trang tốt hơn. Bạn cần chọn một trong hai để tiếp tục.</p>'
  + '<ul><li><i>✓</i><span>Chỉ đếm lượt xem trang và lượt bấm tải ứng dụng.</span></li>'
  + '<li><i>✕</i><span>Không thu thập nội dung tài chính, email, địa chỉ IP hay vị trí; không dùng cho quảng cáo.</span></li>'
  + '<li><i>↺</i><span>Chọn "Không đồng ý" vẫn xem trang và tải ứng dụng bình thường. Đổi lựa chọn ở cuối trang bất cứ lúc nào.</span></li></ul>'
  + '<a class="analytics-link" href="/privacy.html">Đọc Chính sách quyền riêng tư</a>'
  + '<div class="analytics-actions"><button type="button" data-decline>Không đồng ý</button><button type="button" data-accept>Đồng ý</button></div>';
function closeChoice() { panel.remove(); backdrop.remove(); document.documentElement.classList.remove('analytics-locked'); }
function openChoice() {
  if (panel.isConnected) return;
  document.body.append(backdrop, panel);
  document.documentElement.classList.add('analytics-locked');
  panel.querySelector('button').focus();
}
// Keep keyboard focus inside the dialog while it is open.
panel.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const buttons = [...panel.querySelectorAll('a, button')];
  const first = buttons[0], last = buttons[buttons.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
panel.querySelector('[data-accept]').addEventListener('click', () => { storage.set(consentKey, 'yes'); closeChoice(); send('landing_view'); });
panel.querySelector('[data-decline]').addEventListener('click', () => { storage.set(consentKey, 'no'); closeChoice(); });
if (!privacySignal && !storage.get(consentKey)) openChoice();
const footer = document.querySelector('.footer-meta') ?? document.querySelector('.footer-bottom');
if (footer && !privacySignal) {
  const settings = document.createElement('button'); settings.type = 'button'; settings.className = 'analytics-settings'; settings.textContent = 'Lựa chọn thống kê';
  settings.addEventListener('click', openChoice);
  // Keep the copyright last in the footer bar.
  footer.insertBefore(settings, footer.querySelector('small'));
}
send('landing_view');
