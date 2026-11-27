(() => {
  'use strict';

  dctzqsd.register({
    name: 'internship',
    matches: (path) => path === '/stage' || path.startsWith('/stage/'),
    start() {},
    stop() {},
  });
})();
