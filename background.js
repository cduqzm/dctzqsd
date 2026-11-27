chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-view') return;

  chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
    chrome.storage.local.set({ enabled: !enabled });
  });
});
