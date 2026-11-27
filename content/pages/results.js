(() => {
  'use strict';

  const PATHS = ['/resultaten', '/alleresultaten', '/studievoortgang'];

  dctzqsd.register({
    name: 'results',
    matches: (path) => PATHS.some((p) => path === p || path.startsWith(p + '/')),
    start() {},
    stop() {},
  });
})();
