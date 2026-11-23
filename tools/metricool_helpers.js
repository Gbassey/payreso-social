// PayReso Metricool helpers. Paste this whole file into the built-in browser's
// javascript_tool on app.metricool.com (planner page, with the "Create new post"
// editor open). Rebuilt 23 Nov 2026 and tested on the live editor.
//
//   await prLoad('2026-11-30')      -> loads the calendar entry into window.prPost
//   await prDrop(urls)              -> adds images (fetched from raw.githubusercontent.com) to the Template
//   await prNet('facebook', text)   -> unlocks that network tab ("Edit content") and sets its caption
//   await prDate('2026-11-30', 10, 0, 'AM') -> sets the date/time (date picker must be OPEN first)
//   prImages(post)                  -> the raw GitHub URLs for a post's slides
//   await prExists('2026-11-30')    -> checks the calendar grid for posts already on that date (see RUNBOOK)
//
// Never press Escape or click Cancel/Close in the editor: it discards the post.

window.prSleep = ms => new Promise(r => setTimeout(r, ms));
window.PR_RAW = 'https://raw.githubusercontent.com/Gbassey/payreso-social/main/';

window.prLoad = async function (iso) {
  const cal = await (await fetch(PR_RAW + 'tools/calendar.json', { cache: 'no-store' })).json();
  window.prPost = cal.posts.find(p => p.date === iso);
  if (!window.prPost) throw new Error('no calendar entry for ' + iso);
  return prPost.topic + ' (' + prPost.type + ', ' + prPost.slides.length + ' slides)';
};

window.prImages = function (post) {
  const kind = post.type === 'carousel' ? 'carousel' : 'static';
  return post.slides.map((_, i) => `${PR_RAW}posts/${post.date}_${kind}_${String(i + 1).padStart(2, '0')}.jpg`);
};

// Select-all + insertText keeps Metricool's editor state in sync (plain innerHTML does not).
window.prText = function (el, text) {
  el.focus();
  const sel = window.getSelection(); const r = document.createRange();
  r.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(r);
  document.execCommand('delete');
  const lines = text.split('\n');
  lines.forEach((ln, i) => {
    if (ln) document.execCommand('insertText', false, ln);
    if (i < lines.length - 1) document.execCommand('insertParagraph');
  });
  return el.innerText.length;
};

// Drops image files onto the Template editor (no file input exists; drag-and-drop works).
window.prDrop = async function (urls) {
  const dt = new DataTransfer();
  for (const u of urls) {
    const b = await (await fetch(u, { cache: 'no-store' })).blob();
    if (!b.type.startsWith('image')) throw new Error('not an image: ' + u + ' (' + b.type + ')');
    dt.items.add(new File([b], u.split('/').pop(), { type: b.type }));
  }
  const t = [...document.querySelectorAll('.editor-box')].find(e => e.offsetParent);
  for (const ev of ['dragenter', 'dragover', 'drop'])
    t.dispatchEvent(new DragEvent(ev, { bubbles: true, cancelable: true, dataTransfer: dt }));
  return dt.files.length;
};

// Needs "EDIT BY NETWORK" to be on (tabs Template / FB / IG / LI visible).
window.prNet = async function (net, text) {
  const icon = document.querySelector('.tab i.fa-' + net);
  if (!icon) throw new Error('no tab for ' + net + ' (is Edit by network on?)');
  icon.closest('.tab').click(); await prSleep(800);
  const ec = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Edit content' && b.offsetParent);
  if (ec) { ec.click(); await prSleep(800); }
  const ed = [...document.querySelectorAll('.editor-box')].find(e => e.offsetParent);
  prText(ed, text); await prSleep(300);
  return net + ': ' + ed.innerText.length + ' chars';
};

// Date picker must already be open (click the date button at the bottom of the editor).
window.prDate = async function (iso, hour12, minute, ampm) {
  const pop = () => [...document.querySelectorAll('div')].filter(e => e.offsetParent && e.innerText && e.innerText.includes('Europe/London') && e.querySelector('select')).pop();
  if (!pop()) throw new Error('date picker is not open');
  for (let i = 0; i < 13 && !pop().querySelector('.vc-day.id-' + iso); i++) {
    const n = pop().querySelector('.vc-next, .vc-arrow.is-right, button.vc-arrow:last-of-type');
    if (!n) throw new Error('no next-month arrow'); n.click(); await prSleep(600);
  }
  const cell = pop().querySelector('.vc-day.id-' + iso + ' .vc-day-content');
  if (!cell) throw new Error('no day cell for ' + iso); cell.click(); await prSleep(500);
  const [hs, ms] = pop().querySelectorAll('select');
  for (const [s, v] of [[hs, hour12], [ms, minute]]) { s.value = String(v); s.dispatchEvent(new Event('change', { bubbles: true })); await prSleep(200); }
  const ap = [...pop().querySelectorAll('div')].find(e => e.childElementCount === 0 && e.textContent.trim() === ampm);
  ap.click(); await prSleep(500);
  const btn = [...document.querySelectorAll('button')].find(b => /\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2} [AP]M/.test(b.textContent));
  return btn ? btn.textContent.trim() : 'date button not found';
};

// Opens the "Create new post" editor from the planner.
window.prCreate = async function () {
  const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && (x.getAttribute('aria-label') === 'Create post' || x.textContent.trim() === 'Create post'));
  if (!b) throw new Error('Create post button not found'); b.click(); await prSleep(2500);
  return !!document.querySelector('.editor-box');
};

// Turns on "EDIT BY NETWORK" (Template + one tab per network).
window.prEditByNetwork = async function () {
  if (document.querySelector('.tab i.fa-facebook')) return 'already on';
  const b = [...document.querySelectorAll('.v-chip')].find(x => x.offsetParent && /^edit by network$/i.test(x.textContent.trim()));
  if (!b) throw new Error('Edit by network chip not found'); b.click(); await prSleep(1000);
  return !!document.querySelector('.tab i.fa-facebook') ? 'on' : 'failed';
};

// Opens the date picker (the button at the bottom showing e.g. "Nov 23, 2026 3:58 PM").
window.prOpenDate = async function () {
  const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && /\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2} [AP]M/.test(x.textContent));
  if (!b) throw new Error('date button not found'); b.click();
  for (let i = 0; i < 20; i++) {
    await prSleep(300);
    if ([...document.querySelectorAll('.vc-day-content')].some(e => e.offsetParent)) return 'open';
  }
  throw new Error('date picker did not open');
};

// Closes an open picker/menu by clicking the editor title (never Escape).
window.prBlur = async function () {
  const h = [...document.querySelectorAll('*')].find(x => x.childElementCount === 0 && x.textContent.trim() === 'Create new post');
  const el = h || document.body; const rc = el.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, clientX: rc.left + 5, clientY: rc.top + 5, view: window };
  for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'])
    el.dispatchEvent(new (t.startsWith('pointer') ? PointerEvent : MouseEvent)(t, o));
  await prSleep(600); return 'ok';
};

// Clicks "Schedule N" (live, Auto publish on). Returns the button label it clicked.
window.prSchedule = async function (expectN) {
  const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && /^Schedule\s*\d*$/.test(x.textContent.trim()));
  if (!b) throw new Error('Schedule button not found');
  const label = b.textContent.trim().replace(/\s+/g, ' ');
  if (expectN && label !== 'Schedule ' + expectN) throw new Error('unexpected button label: ' + label);
  b.click(); return 'clicked ' + label;
};

// Lists posts on a date in the planner's week view (navigate to that week first).
// Scheduled posts read "10:00 AM <caption>", drafts read "10:00 AM Draft <caption>".
window.prExists = function (iso) {
  const col = document.querySelector('td.fc-timegrid-col[data-date="' + iso + '"]');
  if (!col) return 'week not shown';
  return [...col.querySelectorAll('.fc-event')].map(e => e.innerText.replace(/\s+/g, ' ').trim())
    .filter(t => /\d{1,2}:\d{2} [AP]M/.test(t)).map(t => t.slice(0, 70));
};

// Moves the planner week view forward until the week containing iso is shown.
window.prGoWeek = async function (iso) {
  for (let i = 0; i < 8 && !document.querySelector('td.fc-timegrid-col[data-date="' + iso + '"]'); i++) {
    // The week navigator is [<] [calendar-week button] [>]; take the button after the middle one.
    const wk = [...document.querySelectorAll('button')].find(b => b.querySelector('i.fa-calendar-week') && b.offsetParent);
    const wr = wk && wk.getBoundingClientRect();
    const next = wk && [...document.querySelectorAll('button')]
      .filter(b => b.offsetParent && Math.abs(b.getBoundingClientRect().top - wr.top) < 6 && b.getBoundingClientRect().left >= wr.right - 2)
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)[0];
    if (!next) throw new Error('next-week button not found'); next.click(); await prSleep(1500);
  }
  return !!document.querySelector('td.fc-timegrid-col[data-date="' + iso + '"]');
};

// Removes the Adobe Express overlay if it was opened by mistake (safe; the post stays).
window.prKillAdobe = function () {
  [...document.body.children].filter(e => e.tagName.startsWith('CC-EVERYWHERE')).forEach(e => e.remove());
  return 'ok';
};
