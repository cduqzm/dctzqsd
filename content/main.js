(() => {
  'use strict';

  const html = document.documentElement;
  const page = dctzqsd.pages.find((p) => p.matches(dctzqsd.path()));

  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message === 'dctzqsd:page') reply(page ? page.name : null);
  });

  if (!page) return;

  let enabled = true;
  let started = false;

  function update() {
    html.classList.toggle('dctzqsd', enabled);
    html.classList.toggle('dctzqsd-' + page.name, enabled);

    if (document.readyState === 'loading') return;

    if (enabled && !started) {
      started = true;
      try {
        page.start();
      } catch (error) {
        console.error('[dctzqsd]', error);
        dctzqsd.showOriginal(true);
      }
    } else if (!enabled && started) {
      started = false;
      page.stop();
      dctzqsd.showOriginal(false);
    }
  }

  update();
  document.addEventListener('DOMContentLoaded', update);

  chrome.storage.local.get({ enabled: true }, (settings) => {
    enabled = settings.enabled;
    update();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enabled) {
      enabled = changes.enabled.newValue !== false;
      update();
    }
  });
})();
