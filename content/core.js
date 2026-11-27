const dctzqsd = {
  pages: [],

  register(page) {
    dctzqsd.pages.push(page);
  },

  path() {
    const path = location.pathname
      .split(';')[0]
      .replace(/\/+$/, '')
      .toLowerCase();
    return path || '/';
  },

  clean(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  },

  text(root, selector) {
    const found = root.querySelector(selector);
    return found ? dctzqsd.clean(found.textContent) : '';
  },

  el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  },

  showOriginal(on) {
    document.documentElement.classList.toggle('dctzqsd-fallback', on);
  },
};
