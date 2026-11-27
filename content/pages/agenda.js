(() => {
  'use strict';

  const { el, text, clean } = dctzqsd;

  const SHOW_SLOTS = false;

  let view = null;
  let rows = [];
  let rendered = '';
  let observer = null;
  let timer = null;
  let warned = false;

  dctzqsd.register({
    name: 'agenda',
    matches: (path) => path === '/agenda' || path.startsWith('/agenda/'),
    start,
    stop,
  });

  function start() {
    view = el('section', 'dz-view');
    view.id = 'dctzqsd-view';
    view.setAttribute('aria-label', 'agenda');
    view.addEventListener('click', onClick);

    update();

    observer = new MutationObserver(onMutations);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    timer = setInterval(markNow, 30 * 1000);
    document.addEventListener('visibilitychange', markNow);
  }

  function stop() {
    if (observer) observer.disconnect();
    clearInterval(timer);
    document.removeEventListener('visibilitychange', markNow);
    if (view) view.remove();
    view = null;
    observer = null;
    rows = [];
    rendered = '';
  }

  function onMutations(mutations) {
    if (!view) return;

    if (mutations.every((m) => view.contains(m.target))) return;

    update();
  }

  function update() {
    if (!view) return;

    const list = document.querySelector('.agenda-list');
    if (!list) {
      view.remove();
      rendered = '';
      return;
    }

    let data = null;
    try {
      data = parse(list);
    } catch (error) {
      console.error('[dctzqsd]', error);
    }

    if (!data) {
      if (!warned) console.info('[dctzqsd] agenda layout not recognised, showing the original');
      warned = true;
      dctzqsd.showOriginal(true);
      view.remove();
      rendered = '';
      return;
    }
    dctzqsd.showOriginal(false);

    rows = data.rows;

    if (list.firstElementChild !== view) list.prepend(view);

    const json = JSON.stringify(data.days);
    if (json !== rendered) {
      rendered = json;
      render(data.days);
    }
    markNow();
  }

  function parse(list) {
    const days = [];
    const rows = [];
    let day = null;

    for (const node of list.querySelectorAll('.agenda-title, tr')) {
      if (node.matches('.agenda-title')) {
        const title = clean(node.textContent);
        day = { title, date: parseDate(title), items: [] };
        days.push(day);
        continue;
      }

      if (node.closest('thead')) continue;

      const outer = node.parentElement.closest('tr');
      if (outer && list.contains(outer)) continue;

      if (!day) return null;

      if (node.matches('.clickable-row')) {
        const lesson = parseLesson(node, day.date);
        if (!lesson) return null;
        lesson.row = rows.length;
        rows.push(node);
        day.items.push(lesson);
      } else {
        const note = clean(node.textContent);
        if (note) day.items.push({ note });
      }
    }

    return { days, rows };
  }

  function parseLesson(row, date) {
    const subject = text(row, '.agenda-class');
    const from = padTime(text(row, '.agenda-time.top'));
    const to = padTime(text(row, '.agenda-time.bottom'));
    if (!subject && !from) return null;

    return {
      from,
      to,
      subject,
      teacher: text(row, '.agenda-teacher'),
      slot: text(row, '.agenda-item'),
      extra: otherText(row),
      homework: hasHomework(row.querySelector('.agenda-homework-icon')),
      presence: presence(row),
      cancelled: looksCancelled(row),
      start: atTime(date, from),
      end: atTime(date, to),
    };
  }

  function otherText(row) {
    const copy = row.cloneNode(true);
    copy
      .querySelectorAll('.agenda-item, .agenda-time, .agenda-class, .agenda-teacher, .agenda-homework-icon, .agenda-presence-icon, script, style')
      .forEach((node) => node.remove());
    return clean(copy.textContent);
  }

  function presence(row) {
    const icon = row.querySelector('.agenda-presence-icon svg');
    const classes = icon ? icon.getAttribute('class') || '' : '';
    if (/danger/.test(classes)) return 'absent';
    if (/success/.test(classes)) return 'present';
    return '';
  }

  const HIDDEN = '[hidden], [data-wicket-placeholder], [style*="display:none"], [style*="display: none"], .d-none, .hidden';

  function hasHomework(cell) {
    if (!cell || cell.matches(HIDDEN)) return false;
    if (clean(cell.textContent)) return true;
    return [...cell.querySelectorAll('*')].some((node) => {
      const hidden = node.closest(HIDDEN);
      return !hidden || !cell.contains(hidden);
    });
  }

  function looksCancelled(row) {
    const classes = [row, ...row.querySelectorAll('[class]')]
      .map((node) => node.getAttribute('class') || '')
      .join(' ');
    return /cancel|vervall|uitval|geannuleerd/i.test(classes);
  }

  const MONTHS = [
    ['january', 'januari', 'jan'],
    ['february', 'februari', 'feb'],
    ['march', 'maart', 'mar', 'mrt'],
    ['april', 'apr'],
    ['may', 'mei'],
    ['june', 'juni', 'jun'],
    ['july', 'juli', 'jul'],
    ['august', 'augustus', 'aug'],
    ['september', 'sept', 'sep'],
    ['october', 'oktober', 'oct', 'okt'],
    ['november', 'nov'],
    ['december', 'dec'],
  ];

  function parseDate(title) {
    const lower = title.toLowerCase();
    let day = null;
    let month = null;
    let year = null;

    const iso = lower.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    const numeric = lower.match(/(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{4}))?/);

    if (iso) {
      [year, month, day] = [Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])];
    } else if (numeric) {
      [day, month] = [Number(numeric[1]), Number(numeric[2]) - 1];
      if (numeric[3]) year = Number(numeric[3]);
    } else {
      for (const word of lower.match(/[a-z]+|\d+/g) || []) {
        const index = MONTHS.findIndex((names) => names.includes(word));
        if (index !== -1) month = index;
        else if (/^\d{4}$/.test(word)) year = Number(word);
        else if (/^\d{1,2}$/.test(word) && day === null) day = Number(word);
      }
    }
    if (day === null || month === null) return null;

    if (year === null) {
      const now = new Date();
      const distance = (y) => Math.abs(new Date(y, month, day) - now);
      year = now.getFullYear();
      if (distance(year + 1) < distance(year)) year += 1;
      else if (distance(year - 1) < distance(year)) year -= 1;
    }

    const date = new Date(year, month, day);

    return date.getMonth() === month && date.getDate() === day ? date.getTime() : null;
  }

  function atTime(date, time) {
    const match = /^(\d{1,2})[:.](\d{2})$/.exec(time);
    if (date === null || !match) return null;
    const result = new Date(date);
    result.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return result.getTime();
  }

  function padTime(time) {
    return /^\d:\d{2}$/.test(time) ? '0' + time : time;
  }

  function weekLabel(days) {
    const dates = days.map((day) => day.date).filter((date) => date !== null);
    if (!dates.length) return '';
    const first = isoWeek(Math.min(...dates));
    const last = isoWeek(Math.max(...dates));
    return first === last ? `week ${first}` : `week ${first}–${last}`;
  }

  function isoWeek(time) {
    const date = new Date(time);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }

  function render(days) {
    const parts = [];

    const week = weekLabel(days);
    if (week) parts.push(el('p', 'dz-label dz-week', week));

    for (const day of days) {
      const section = el('section', 'dz-day');
      if (day.date !== null) section.dataset.date = day.date;

      const lessons = el('ol', 'dz-lessons');
      for (const item of day.items) {
        lessons.append(item.note ? el('li', 'dz-note', item.note) : renderLesson(item));
      }
      if (!day.items.length) lessons.append(el('li', 'dz-note', 'no lessons'));

      section.append(el('h2', 'dz-day-title', day.title), lessons);
      parts.push(section);
    }

    view.replaceChildren(...parts);
    view.hidden = days.length === 0;
  }

  function renderLesson(lesson) {
    const button = el('button', 'dz-lesson');
    button.type = 'button';
    button.dataset.row = lesson.row;
    if (lesson.start !== null) button.dataset.start = lesson.start;
    if (lesson.end !== null) button.dataset.end = lesson.end;
    if (lesson.cancelled) button.classList.add('dz-cancelled');

    const subject = el('span', 'dz-subject');
    subject.append(el('span', 'dz-name', lesson.subject));
    if (lesson.homework) subject.append(el('span', 'dz-hw', 'homework'));
    if (lesson.presence === 'absent') subject.append(el('span', 'dz-flag', 'absent'));

    const teacher = el('span', 'dz-side dz-teacher', lesson.teacher);
    if (SHOW_SLOTS && lesson.slot) teacher.append(el('span', 'dz-slot', lesson.slot));

    button.append(
      el('span', 'dz-time', lesson.to ? `${lesson.from}–${lesson.to}` : lesson.from),
      subject,
      teacher,
    );
    if (lesson.extra) button.append(el('span', 'dz-extra', lesson.extra));

    const item = el('li');
    item.append(button);
    return item;
  }

  function markNow() {
    if (!view) return;
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);

    for (const day of view.querySelectorAll('.dz-day')) {
      day.classList.toggle('dz-today', Number(day.dataset.date) === today);
    }

    const lessons = [...view.querySelectorAll('.dz-lesson')];
    let next = null;

    for (const lesson of lessons) {
      const start = Number(lesson.dataset.start) || null;
      const end = Number(lesson.dataset.end) || start;
      const cancelled = lesson.classList.contains('dz-cancelled');

      lesson.classList.toggle('dz-past', start !== null && end <= now);
      lesson.classList.toggle('dz-now', start !== null && start <= now && now < end && !cancelled);

      const upcoming = start !== null && start > now && !cancelled;
      if (upcoming && (!next || start < Number(next.dataset.start))) next = lesson;
    }

    const somethingNow = lessons.some((lesson) => lesson.classList.contains('dz-now'));
    for (const lesson of lessons) {
      lesson.classList.toggle('dz-next', lesson === next && !somethingNow);
    }
  }

  function onClick(event) {
    const button = event.target.closest('.dz-lesson');
    if (!button) return;
    const row = rows[Number(button.dataset.row)];
    if (row && row.isConnected) row.click();
  }
})();
