(() => {
  'use strict';

  const PATHS = ['/studie', '/account', '/personalia', '/school'];

  dctzqsd.register({
    name: 'portal',
    matches: (path) => path === '/' || PATHS.some((p) => path === p || path.startsWith(p + '/')),
    start() {},
    stop() {},
  });
})();
