(() => {
  'use strict';

  const { el, text, clean } = dctzqsd;

  const built = new WeakMap();
  let observer = null;
  let warned = false;

  dctzqsd.register({
    name: 'attendance',
    matches: (path) => path === '/presentie' || path.startsWith('/presentie/'),
    start,
    stop,
  });

  function start() {
    update();
    observer = new MutationObserver(onMutations);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('click', onClick);
  }

  function stop() {
    if (observer) observer.disconnect();
    observer = null;
    document.removeEventListener('click', onClick);
    document.querySelectorAll('.dz-att').forEach((view) => view.remove());
  }

  function onMutations(mutations) {
    const ours = (node) => {
      const element = node.nodeType === 1 ? node : node.parentElement;
      return element && element.closest('.dz-att');
    };
    if (mutations.every((m) => ours(m.target))) return;
    update();
  }

  function update() {
    try {
      document.querySelectorAll('.presence-total-view').forEach((box) => sync(box, 'dz-att-totals', parseTotals(box), renderTotals));
      document.querySelectorAll('.student-absence').forEach((list) => sync(list, 'dz-att-week', parseWeek(list), renderWeek));
      document.querySelectorAll('.chart--donut').forEach((box) => sync(box, 'dz-att-charts', parseCharts(box), renderCharts));
      document.querySelectorAll('.dz-att').forEach((view) => {
        if (!view.nextElementSibling || !view.nextElementSibling.matches('.presence-total-view, .student-absence, .chart--donut')) view.remove();
      });
      dctzqsd.showOriginal(false);
    } catch (error) {
      if (!warned) console.info('[dctzqsd] attendance layout not recognised, showing the original', error);
      warned = true;
      document.querySelectorAll('.dz-att').forEach((view) => view.remove());
      dctzqsd.showOriginal(true);
    }
  }

  function sync(original, kind, data, render) {
    let view = original.previousElementSibling;
    if (!view || !view.classList.contains(kind)) {
      view = el('section', `dz-view dz-att ${kind}`);
      original.before(view);
    }
    const json = JSON.stringify(data);
    if (built.get(view) !== json) {
      built.set(view, json);
      view.replaceChildren(...render(data));
    }
  }

  function parseTotals(box) {
    const totals = [...box.querySelectorAll('.presence-total')].map((total) => {
      const values = [...total.querySelectorAll('.presence-total--content-text')];
      const hours = values[values.length - 1];
      return {
        title: text(total, '.presence-total--title'),
        hours: hours ? text(hours, 'label') : '',
        alert: Boolean(hours && hours.classList.contains('red')),
      };
    });
    if (!totals.length || totals.some((total) => !total.title)) throw new Error('totals');
    return totals;
  }

  function renderTotals(totals) {
    const list = el('ul', 'dz-totals');
    for (const total of totals) {
      const item = el('li', total.alert ? 'dz-alert' : '');
      item.append(el('span', 'dz-total-name', total.title), el('span', 'dz-total-value', total.hours ? `${total.hours} h` : '–'));
      list.append(item);
    }
    return [list];
  }

  function parseWeek(list) {
    const courses = [...list.querySelectorAll('.student-absence--course')];
    const days = [...list.querySelectorAll('.student-absence--day')].map((dayElement) => {
      const day = { title: text(dayElement, '.student-absence--day-title'), items: [] };
      for (const course of dayElement.querySelectorAll('.student-absence--course')) {
        const status = text(course, 'strong') || text(course, 'p');
        const reported = text(course, '.student-absence--reported');
        const lesson = clean([...course.querySelectorAll('small:not(.student-absence--reported)')].map((small) => small.textContent).join(' '));
        const kind = status.replace(/\s*\([^)]*\)\s*$/, '');
        const range = status.match(/\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)/);
        const last = day.items[day.items.length - 1];

        if (last && last.lesson === lesson && last.kind === kind && last.reported === reported) {
          if (range) last.until = range[2];
          continue;
        }
        day.items.push({
          lesson,
          kind,
          reported,
          from: range ? range[1] : '',
          until: range ? range[2] : '',
          course: courses.indexOf(course),
        });
      }
      return day;
    });
    if (!days.length) return { empty: clean(list.textContent) || 'nothing this week' };
    return { days };
  }

  function renderWeek(week) {
    if (week.empty) return [el('p', 'dz-note', week.empty)];

    return week.days.map((day) => {
      const section = el('section', 'dz-day');
      const lessons = el('ol', 'dz-lessons');
      for (const item of day.items) lessons.append(renderCourse(item));
      if (!day.items.length) lessons.append(el('li', 'dz-note', 'no lessons'));
      section.append(el('h2', 'dz-day-title', day.title), lessons);
      return section;
    });
  }

  function renderCourse(item) {
    const match = item.lesson.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s+(.*)$/);
    const time = match ? `${pad(match[1])}–${pad(match[2])}` : '';
    const rest = match ? match[3] : item.lesson;
    const split = rest.lastIndexOf(' - ');
    const subject = split === -1 ? rest : rest.slice(0, split);
    const teacher = split === -1 ? '' : rest.slice(split + 3);

    const absent = /absent|afwezig/i.test(item.kind) && !/permitted|geoorloofd/i.test(item.kind);
    const partial = item.from && match && (pad(item.from) !== pad(match[1]) || pad(item.until) !== pad(match[2]));
    const status = item.kind.toLowerCase() + (partial ? ` ${pad(item.from)}–${pad(item.until)}` : '');

    const button = el('button', 'dz-lesson');
    button.type = 'button';
    button.dataset.course = item.course;

    const name = el('span', 'dz-subject');
    name.append(el('span', 'dz-name', subject));

    button.append(el('span', 'dz-time', time), name, el('span', absent ? 'dz-side dz-alert' : 'dz-side', status));
    const extra = [teacher, item.reported].filter(Boolean).join(' · ');
    if (extra) button.append(el('span', 'dz-extra', extra));

    const li = el('li');
    li.append(button);
    return li;
  }

  function parseCharts(box) {
    const charts = [...box.querySelectorAll('.chart--multiple')].map((chart) => {
      const canvas = chart.querySelector('canvas');
      return {
        title: text(chart, '.chartTitel'),
        number: canvas ? (canvas.getAttribute('number') || '').replace(/\.0$/, '') : '',
        label: canvas ? canvas.getAttribute('centertext') || '' : '',
        legend: [...chart.querySelectorAll('.legend li')].map((li) => clean(li.textContent)),
      };
    });
    if (!charts.length) throw new Error('charts');
    return charts;
  }

  function renderCharts(charts) {
    return charts.map((chart) => {
      const section = el('section', 'dz-day');
      const figure = el('p', 'dz-figure');
      figure.append(el('span', 'dz-figure-number', chart.number || '–'), el('span', 'dz-figure-label', chart.label));

      const list = el('ul', 'dz-totals');
      for (const entry of chart.legend) {
        const match = entry.match(/^(.*?)\s*\(([^)]*)\)$/);
        const item = el('li');
        item.append(el('span', 'dz-total-name', match ? match[1] : entry), el('span', 'dz-total-value', match ? match[2] : ''));
        list.append(item);
      }

      section.append(el('h2', 'dz-day-title', chart.title), figure, list);
      return section;
    });
  }

  function pad(time) {
    return /^\d:\d{2}$/.test(time) ? '0' + time : time;
  }

  function onClick(event) {
    const button = event.target.closest('.dz-att .dz-lesson');
    if (!button) return;
    const original = button.closest('.dz-att').nextElementSibling;
    const target = original && original.querySelectorAll('.student-absence--course')[Number(button.dataset.course)];
    if (target) target.click();
  }
})();
