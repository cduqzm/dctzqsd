const power = document.getElementById('power');
const where = document.getElementById('where');
const state = document.getElementById('state');
const shortcut = document.getElementById('shortcut');

function render(on) {
  power.setAttribute('aria-checked', String(on));
  state.textContent = on ? 'dctzqsd view' : 'original view';
  state.classList.toggle('off', !on);
}

chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
  render(enabled);
  requestAnimationFrame(() => requestAnimationFrame(() => power.classList.add('ready')));
});

power.addEventListener('click', () => {
  const on = power.getAttribute('aria-checked') !== 'true';
  render(on);
  chrome.storage.local.set({ enabled: on });
});

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, 'dctzqsd:page', (page) => {
    if (chrome.runtime.lastError) where.textContent = 'open or reload eduarte';
    else where.textContent = page || 'not styled yet';
  });
});
