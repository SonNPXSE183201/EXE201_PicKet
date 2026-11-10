export const PLAY_STORE_URL = '#';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const root = document.documentElement;

const setPlayStoreLinks = () => {
  document.querySelectorAll('[data-play-link]').forEach(link => link.setAttribute('href', PLAY_STORE_URL));
};

const enableParallax = () => {
  const scene = document.querySelector('[data-parallax]');
  if (!scene || !finePointer.matches || reducedMotion.matches) return;
  let frame = 0;
  scene.addEventListener('pointermove', event => {
    if (frame) return;
    const bounds = scene.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    frame = requestAnimationFrame(() => {
      scene.style.transform = `translate3d(${x * 14}px,${y * 9}px,0) rotate(${x * 0.7}deg)`;
      frame = 0;
    });
  }, { passive: true });
  scene.addEventListener('pointerleave', () => { scene.style.transform = ''; });
};

const enableSteps = () => {
  const buttons = [...document.querySelectorAll('[data-step]')];
  const images = [...document.querySelectorAll('[data-step-image]')];
  buttons.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.step;
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    images.forEach(image => { image.hidden = image.dataset.stepImage !== selected; });
  }));
};

const enableStickers = () => {
  document.querySelectorAll('[data-sticker]').forEach(sticker => sticker.addEventListener('click', () => {
    const amount = document.createElement('span');
    amount.className = 'fly-amount';
    amount.textContent = '−45.000 ₫';
    amount.setAttribute('aria-hidden', 'true');
    sticker.append(amount);
    amount.addEventListener('animationend', () => amount.remove(), { once: true });
  }));
};

const enablePlayStoreLinks = () => {
  document.querySelectorAll('[data-play-link]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    if (PLAY_STORE_URL !== '#') location.assign(PLAY_STORE_URL);
  }));
};

const enablePhoneDemo = () => {
  const phone = document.querySelector('[data-phone-demo]');
  if (!phone || reducedMotion.matches) return;
  const values = [['3.245.000 ₫', '−45.000 ₫'], ['3.180.000 ₫', '−65.000 ₫'], ['3.115.000 ₫', '−35.000 ₫']];
  let index = 0;
  let timer = 0;
  const start = () => {
    if (timer || document.hidden || reducedMotion.matches) return;
    timer = window.setInterval(() => {
      index = (index + 1) % values.length;
      phone.querySelector('[data-balance]').textContent = values[index][0];
      phone.querySelector('[data-transaction]').textContent = values[index][1];
    }, 4000);
  };
  const stop = () => { clearInterval(timer); timer = 0; };
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  reducedMotion.addEventListener('change', event => event.matches ? stop() : start());
  start();
};

setPlayStoreLinks();
enableParallax();
enableSteps();
enableStickers();
enablePlayStoreLinks();
enablePhoneDemo();
requestAnimationFrame(() => root.classList.add('is-ready'));
