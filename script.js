/* ذِكر | مواقيت الصلاة والأذكار
   - المواقيت: واجهة AlAdhan العامة (طريقة أم القرى method=4) لإحداثيات المدينة، بتوقيت Asia/Riyadh.
   - لا توجد أوقات ثابتة أو تجريبية: إن تعذر الجلب ولم توجد نسخة محفوظة سابقًا تظهر رسالة خطأ بلا أوقات.
   - الأذكار: مصفوفة ADHKAR في الأسفل؛ لإضافة قسم جديد أضف كائنًا جديدًا إليها فقط. */
(() => {
  'use strict';

  /* ============ ثوابت ============ */
  const TZ = 'Asia/Riyadh';
  const TZ_OFFSET = 3 * 3600 * 1000; // السعودية UTC+3 بلا توقيت صيفي
  const API_BASE = 'https://api.aladhan.com/v1/calendar';
  const CALC_METHOD = 4; // جامعة أم القرى، مكة المكرمة
  const KEYS = {
    settings: 'zikr:settings',
    cal: 'zikr:cal2:',
    counts: 'zikr:counts',
    fired: 'zikr:fired'
  };
  const PRAYERS = [
    { key: 'Fajr', name: 'الفجر' },
    { key: 'Dhuhr', name: 'الظهر' },
    { key: 'Asr', name: 'العصر' },
    { key: 'Maghrib', name: 'المغرب' },
    { key: 'Isha', name: 'العشاء' }
  ];

  /* ============ المدن والمحافظات (إحداثيات مركز المدينة التقريبية) ============ */
  const REGIONS = {
    'منطقة الرياض': [
      ['الرياض', 24.7136, 46.6753], ['الخرج', 24.1554, 47.3346], ['الدرعية', 24.7340, 46.5740],
      ['المجمعة', 25.9039, 45.3450], ['الزلفي', 26.2987, 44.8050], ['الدوادمي', 24.5077, 44.3924],
      ['عفيف', 23.9067, 42.9172], ['وادي الدواسر', 20.4930, 44.7870], ['شقراء', 25.2423, 45.2505],
      ['الغاط', 26.0267, 44.3611], ['السليل', 20.4630, 45.5780], ['حوطة بني تميم', 23.5240, 46.8420],
      ['الأفلاج (ليلى)', 22.2900, 46.7300], ['القويعية', 24.0700, 45.2800], ['ضرما', 24.6100, 46.1100]
    ],
    'منطقة مكة المكرمة': [
      ['مكة المكرمة', 21.3891, 39.8579], ['جدة', 21.4858, 39.1925], ['الطائف', 21.2703, 40.4158],
      ['رابغ', 22.7986, 39.0349], ['القنفذة', 19.1264, 41.0789], ['الليث', 20.1500, 40.2667],
      ['خليص', 22.1400, 39.3200], ['الجموم', 21.6150, 39.6960]
    ],
    'منطقة المدينة المنورة': [
      ['المدينة المنورة', 24.4672, 39.6112], ['ينبع', 24.0895, 38.0618], ['العلا', 26.6085, 37.9232],
      ['بدر', 23.7790, 38.7900], ['خيبر', 25.6970, 39.2920], ['المهد', 23.4850, 40.8760],
      ['الحناكية', 24.8590, 40.5000]
    ],
    'منطقة القصيم': [
      ['بريدة', 26.3260, 43.9750], ['عنيزة', 26.0840, 43.9930], ['الرس', 25.8694, 43.4973],
      ['المذنب', 25.8600, 44.2200], ['البكيرية', 26.1400, 43.6600], ['البدائع', 25.9890, 43.7160]
    ],
    'المنطقة الشرقية': [
      ['الدمام', 26.4207, 50.0888], ['الخبر', 26.2172, 50.1971], ['الظهران', 26.2361, 50.0393],
      ['الأحساء (الهفوف)', 25.3648, 49.5870], ['القطيف', 26.5565, 50.0089], ['سيهات', 26.4830, 50.0400],
      ['الجبيل', 27.0046, 49.6460], ['رأس تنورة', 26.6430, 50.1600], ['بقيق', 25.9330, 49.6670],
      ['حفر الباطن', 28.4328, 45.9708], ['الخفجي', 28.4390, 48.4910], ['النعيرية', 27.4690, 48.4890]
    ],
    'منطقة عسير': [
      ['أبها', 18.2164, 42.5053], ['خميس مشيط', 18.3000, 42.7333], ['بيشة', 19.9840, 42.6050],
      ['النماص', 19.1220, 42.1330], ['محايل عسير', 18.5380, 42.0510], ['سراة عبيدة', 18.1830, 43.0670],
      ['ظهران الجنوب', 17.6600, 43.5000]
    ],
    'منطقة تبوك': [
      ['تبوك', 28.3835, 36.5662], ['ضباء', 27.3500, 35.6900], ['الوجه', 26.2320, 36.4640],
      ['أملج', 25.0380, 37.2680], ['تيماء', 27.6300, 38.5400], ['حقل', 29.2860, 34.9370],
      ['البدع', 28.4810, 35.0140]
    ],
    'منطقة حائل': [
      ['حائل', 27.5114, 41.7208], ['بقعاء', 27.8900, 42.4200]
    ],
    'منطقة الحدود الشمالية': [
      ['عرعر', 30.9753, 41.0381], ['رفحاء', 29.6200, 43.5000], ['طريف', 31.6722, 38.6637]
    ],
    'منطقة جازان': [
      ['جازان', 16.8892, 42.5511], ['صبيا', 17.1500, 42.6250], ['أبو عريش', 16.9690, 42.8310],
      ['صامطة', 16.5970, 42.9440], ['بيش', 17.3700, 42.5300], ['فرسان', 16.7020, 42.1180],
      ['الدرب', 17.7200, 42.2500]
    ],
    'منطقة نجران': [
      ['نجران', 17.4917, 44.1322], ['شرورة', 17.4833, 47.1167]
    ],
    'منطقة الباحة': [
      ['الباحة', 20.0129, 41.4677], ['بلجرشي', 19.8500, 41.5700], ['المخواة', 19.7960, 41.4210]
    ],
    'منطقة الجوف': [
      ['سكاكا', 29.9697, 40.2064], ['دومة الجندل', 29.8110, 39.8670], ['القريات', 31.3317, 37.3428],
      ['طبرجل', 30.5000, 38.2167]
    ]
  };
  const CITIES = Object.entries(REGIONS).flatMap(([region, list]) =>
    list.map(([name, lat, lng]) => ({ id: region + '|' + name, name, region, lat, lng })));
  const DEFAULT_CITY = CITIES[0]; // الرياض

  /* ============ أدوات ============ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const pad = n => String(n).padStart(2, '0');
  const read = (k, d = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

  /* الوقت بتوقيت الرياض بغض النظر عن منطقة الجهاز */
  function nowParts(ms = Date.now()) {
    const t = new Date(ms + TZ_OFFSET);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds() };
  }
  const instant = (y, m, d, mins) => Date.UTC(y, m - 1, d, Math.floor(mins / 60), mins % 60) - TZ_OFFSET;
  function fmt12(mins, withSeconds) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${h % 12 || 12}:${pad(m)}${withSeconds || ''} ${h >= 12 ? 'م' : 'ص'}`;
  }
  const dayKey = (p = nowParts()) => `${p.y}-${pad(p.m)}-${pad(p.d)}`;

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  }

  /* ============ الإعدادات ============ */
  const defaults = {
    loc: { id: DEFAULT_CITY.id, name: DEFAULT_CITY.name, lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng },
    theme: null,
    notif: { enabled: false, prayers: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true }, lead: 0, sound: false }
  };
  function loadSettings() {
    const s = read(KEYS.settings, {}) || {};
    const n = s.notif || {};
    const loc = s.loc && isFinite(s.loc.lat) && isFinite(s.loc.lng) ? s.loc : defaults.loc;
    return {
      ...defaults, ...s, loc,
      notif: { ...defaults.notif, ...n, prayers: { ...defaults.notif.prayers, ...(n.prayers || {}) } }
    };
  }
  let settings = loadSettings();
  const save = () => write(KEYS.settings, settings);

  /* ============ المظهر ============ */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    const m = $('meta[name="theme-color"]');
    if (m) m.content = t === 'dark' ? '#0a1226' : '#0f2147';
  }
  $('#themeBtn').addEventListener('click', () => {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    settings.theme = t; save(); applyTheme(t);
  });

  /* ============ التاريخ ============ */
  function makeFmt(locale, opts) {
    try { return new Intl.DateTimeFormat(locale, { ...opts, timeZone: TZ }); } catch (e) { return null; }
  }
  const hijriFmt = makeFmt('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
  const gregFmt = makeFmt('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  function renderDates() {
    const d = new Date();
    $('#hijri').textContent = hijriFmt ? hijriFmt.format(d) : '—';
    $('#greg').textContent = gregFmt ? gregFmt.format(d) : '—';
  }

  /* ============ جلب المواقيت وتخزينها ============ */
  const store = new Map(); // مفتاح الشهر ← { days, origin }
  const locKey = l => `${Number(l.lat).toFixed(3)},${Number(l.lng).toFixed(3)}`;
  const mkey = (l, y, m) => `${locKey(l)}:${y}-${pad(m)}`;
  const parseT = s => {
    const m = /(\d{1,2}):(\d{2})/.exec(String(s));
    if (!m) throw new Error('صيغة وقت غير صالحة');
    return +m[1] * 60 + +m[2];
  };
  function timesFor(y, m, d) {
    const e = store.get(mkey(settings.loc, y, m));
    return e && e.days[d] ? e.days[d] : null;
  }

  async function fetchMonth(loc, y, m) {
    const url = `${API_BASE}/${y}/${m}?latitude=${loc.lat}&longitude=${loc.lng}&method=${CALC_METHOD}&timezonestring=${encodeURIComponent(TZ)}`;
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 15000);
    let json;
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      json = await r.json();
    } finally { clearTimeout(to); }
    if (!json || json.code !== 200 || !Array.isArray(json.data)) throw new Error('استجابة غير متوقعة من الخدمة');

    const expected = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (json.data.length !== expected) throw new Error('عدد أيام الشهر غير مطابق');
    const days = {};
    for (const it of json.data) {
      const day = parseInt(it.date.gregorian.day, 10);
      const t = it.timings;
      const row = {
        Fajr: parseT(t.Fajr), Sunrise: parseT(t.Sunrise), Dhuhr: parseT(t.Dhuhr),
        Asr: parseT(t.Asr), Maghrib: parseT(t.Maghrib), Isha: parseT(t.Isha)
      };
      // فحص منطقي: ترتيب الأوقات خلال اليوم
      if (!(row.Fajr < row.Sunrise && row.Sunrise < row.Dhuhr && row.Dhuhr < row.Asr && row.Asr < row.Maghrib && row.Maghrib < row.Isha)) {
        throw new Error('أوقات غير منطقية في بيانات الخدمة');
      }
      days[day] = row;
    }
    return days;
  }

  async function loadMonth(loc, y, m) {
    const key = mkey(loc, y, m);
    if (store.has(key)) return store.get(key);
    const cached = read(KEYS.cal + key);
    if (cached && cached.days) {
      const e = { days: cached.days, origin: 'cache' };
      store.set(key, e);
      return e;
    }
    const days = await fetchMonth(loc, y, m);
    write(KEYS.cal + key, { days, t: Date.now() });
    pruneCache();
    const e = { days, origin: 'network' };
    store.set(key, e);
    return e;
  }

  function pruneCache() {
    try {
      const p = nowParts();
      const cur = p.y * 12 + p.m;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(KEYS.cal)) continue;
        const mt = /:(\d{4})-(\d{2})$/.exec(k);
        if (!mt || Math.abs(+mt[1] * 12 + +mt[2] - cur) > 2) localStorage.removeItem(k);
      }
    } catch (e) { /* تجاهل */ }
  }

  let loading = false, retryAt = 0, lastError = null;
  async function ensureData(force) {
    if (loading) return;
    const now = Date.now();
    if (!force && now < retryAt) return;
    loading = true;
    retryAt = now + 30000;
    renderStatus();
    const p = nowParts();
    const tm = nowParts(now + 86400000);
    const needed = [[p.y, p.m]];
    if (tm.m !== p.m) needed.push([tm.y, tm.m]);
    else if (p.d >= 25) { const n = nowParts(now + 8 * 86400000); needed.push([n.y, n.m]); }

    let err = null;
    for (let i = 0; i < needed.length; i++) {
      try { await loadMonth(settings.loc, needed[i][0], needed[i][1]); }
      catch (e) { if (i === 0 || !timesFor(tm.y, tm.m, tm.d)) err = err || e; }
    }
    lastError = timesFor(p.y, p.m, p.d) ? null : (err || new Error('تعذر الجلب'));
    loading = false;
    renderAll();
  }

  /* ============ الصلاة القادمة ============ */
  let nextInfo = null;
  function computeNext(now) {
    const p = nowParts(now);
    const today = timesFor(p.y, p.m, p.d);
    if (!today) return null;
    for (const pr of PRAYERS) {
      const at = instant(p.y, p.m, p.d, today[pr.key]);
      if (at > now) return { key: pr.key, name: pr.name, at, tomorrow: false };
    }
    const q = nowParts(now + 86400000);
    const tm = timesFor(q.y, q.m, q.d);
    if (!tm) return { pending: true, key: 'Fajr', name: 'الفجر' };
    return { key: 'Fajr', name: 'الفجر', at: instant(q.y, q.m, q.d, tm.Fajr), tomorrow: true };
  }
  function phaseOf(now, t) {
    const p = nowParts(now);
    const mins = p.h * 60 + p.mi;
    if (mins < t.Fajr) return 'night';
    if (mins < t.Sunrise) return 'dawn';
    if (mins < t.Asr) return 'day';
    if (mins < t.Maghrib) return 'afternoon';
    if (mins < t.Isha) return 'dusk';
    return 'night';
  }

  /* ============ رسم واجهة المواقيت ============ */
  function renderStatus() {
    const box = $('#statusBox');
    const p = nowParts();
    const have = !!timesFor(p.y, p.m, p.d);
    if (loading && !have) {
      box.className = 'status'; box.hidden = false;
      box.innerHTML = '<span>جارٍ جلب مواقيت الصلاة…</span>';
    } else if (!have && lastError) {
      box.className = 'status error'; box.hidden = false;
      const offline = navigator.onLine === false;
      box.innerHTML = `<span>${offline ? 'لا يوجد اتصال بالإنترنت، ' : ''}تعذّر جلب مواقيت الصلاة لهذه المدينة، ولذلك لا تُعرض أي أوقات حتى لا تظهر بيانات غير صحيحة. تحقق من الاتصال ثم أعد المحاولة.</span><button class="btn small" type="button" data-act="retry">إعادة المحاولة</button>`;
    } else {
      box.hidden = true; box.innerHTML = '';
    }
  }

  let gridSig = '';
  function renderPrayers(now) {
    const p = nowParts(now);
    const t = timesFor(p.y, p.m, p.d);
    const nowMin = p.h * 60 + p.mi;
    const sig = [dayKey(p), t ? 1 : 0, nextInfo ? nextInfo.key + nextInfo.tomorrow : '', t ? PRAYERS.filter(x => t[x.key] <= nowMin).length : ''].join('|');
    if (sig === gridSig) return;
    gridSig = sig;
    $('#prayerGrid').innerHTML = PRAYERS.map(pr => {
      const isNext = nextInfo && !nextInfo.pending && nextInfo.key === pr.key;
      const past = t && !isNext && t[pr.key] <= nowMin;
      const tag = isNext ? (nextInfo.tomorrow ? 'غدًا' : 'القادمة') : '';
      return `<article class="prayer${isNext ? ' is-next' : ''}${past ? ' is-past' : ''}">
        <h3>${pr.name}</h3>
        <div class="time">${t ? fmt12(t[pr.key]) : '—'}</div>
        <span class="tag">${tag}</span>
      </article>`;
    }).join('');
    $('#sunriseTime').textContent = t ? fmt12(t.Sunrise) : '—';
    $('#hero').dataset.phase = t ? phaseOf(now, t) : 'night';

    const e = store.get(mkey(settings.loc, p.y, p.m));
    $('#sourceNote').textContent = e
      ? `الحساب بطريقة أم القرى عبر AlAdhan لإحداثيات «${settings.loc.name}»${e.origin === 'cache' ? ' — من نسخة محفوظة على جهازك' : ''}. قارنها بالتقويم الرسمي عند الحاجة.`
      : '';
  }

  function renderAll() {
    $('#cityName').textContent = settings.loc.name;
    gridSig = '';
    const now = Date.now();
    nextInfo = computeNext(now);
    renderStatus();
    renderPrayers(now);
    renderCountdown(now);
  }

  function renderCountdown(now) {
    if (!nextInfo || nextInfo.pending) {
      $('#nextName').textContent = nextInfo ? nextInfo.name : '—';
      $('#countdown').textContent = '--:--:--';
      $('#nextAt').textContent = '\u00a0';
      return;
    }
    const diff = Math.max(0, nextInfo.at - now);
    const h = Math.floor(diff / 3600000), m = Math.floor(diff % 3600000 / 60000), s = Math.floor(diff % 60000 / 1000);
    $('#nextName').textContent = nextInfo.name;
    $('#countdown').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    const q = nowParts(nextInfo.at);
    $('#nextAt').textContent = `${nextInfo.tomorrow ? 'غدًا ' : ''}الساعة ${fmt12(q.h * 60 + q.mi)}`;
  }

  /* ============ المؤقت الدوري ============ */
  let lastDay = '';
  function tick() {
    const now = Date.now();
    const p = nowParts(now);
    $('#clock').textContent = `${pad(p.h % 12 || 12)}:${pad(p.mi)}:${pad(p.s)} ${p.h >= 12 ? 'م' : 'ص'}`;

    const dk = dayKey(p);
    if (dk !== lastDay) { lastDay = dk; renderDates(); gridSig = ''; }

    if (!timesFor(p.y, p.m, p.d)) ensureData(false);

    const prev = nextInfo;
    if (!prev || prev.pending || now >= prev.at) nextInfo = computeNext(now);
    renderPrayers(now);
    renderCountdown(now);
    checkNotify(now, p);
  }

  /* ============ الإشعارات ============ */
  let firedSet = new Set(read(KEYS.fired, []));
  let audioCtx = null;
  function unlockAudio() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* غير مدعوم */ }
  }
  function beep() {
    if (!settings.notif.sound || !audioCtx || audioCtx.state !== 'running') return;
    try {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime;
      o.type = 'sine'; o.frequency.value = 660;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + 1.3);
    } catch (e) { /* تجاهل */ }
  }
  function notify(title, body, tag) {
    let shown = false;
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body, tag, lang: 'ar', dir: 'rtl' }); shown = true; } catch (e) { shown = false; }
    }
    if (!shown) toast(title);
    beep();
  }
  function checkNotify(now, p) {
    const n = settings.notif;
    if (!n.enabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    const t = timesFor(p.y, p.m, p.d);
    if (!t) return;
    for (const pr of PRAYERS) {
      if (!n.prayers[pr.key]) continue;
      const at = instant(p.y, p.m, p.d, t[pr.key]);
      const target = at - n.lead * 60000;
      const id = `${dayKey(p)}:${pr.key}:${n.lead}`;
      if (now >= target && now < target + 120000 && !firedSet.has(id)) {
        firedSet.add(id);
        write(KEYS.fired, Array.from(firedSet).filter(x => x.startsWith(dayKey(p))));
        const title = n.lead ? `بقي ${n.lead} دقائق على صلاة ${pr.name}` : `حان الآن وقت صلاة ${pr.name}`;
        notify(title, `${settings.loc.name} — ${fmt12(t[pr.key])}`, id);
      }
    }
  }
  async function enableNotifications() {
    if (!('Notification' in window)) { toast('متصفحك لا يدعم الإشعارات'); return; }
    let perm = Notification.permission;
    if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch (e) { perm = 'default'; } }
    settings.notif.enabled = perm === 'granted';
    save();
    if (perm === 'granted') toast('تم تفعيل الإشعارات');
    else toast(perm === 'denied' ? 'الإذن مرفوض؛ فعّله من إعدادات المتصفح للموقع' : 'لم يُمنح إذن الإشعارات');
    renderSettings();
  }

  /* ============ واجهة الإعدادات ============ */
  function renderSettings() {
    const n = settings.notif;
    const supported = 'Notification' in window;
    const perm = supported ? Notification.permission : 'unsupported';
    $('#notifState').textContent =
      !supported ? 'متصفحك لا يدعم الإشعارات.' :
      perm === 'denied' ? 'إذن الإشعارات مرفوض لهذا الموقع. غيّره من إعدادات المتصفح ثم أعد المحاولة.' :
      n.enabled && perm === 'granted' ? 'الإشعارات مفعّلة (تعمل ما دامت الصفحة مفتوحة).' :
      'الإشعارات متوقفة.';
    $('#notifToggle').textContent = n.enabled && perm === 'granted' ? 'إيقاف الإشعارات' : 'تفعيل الإشعارات';
    $('#notifToggle').disabled = !supported;
    $('#notifTest').disabled = !supported || perm !== 'granted';
    $$('[data-pk]').forEach(c => { c.checked = !!n.prayers[c.dataset.pk]; });
    $('#leadSel').value = String(n.lead);
    $('#soundChk').checked = !!n.sound;
  }
  $('#notifToggle').addEventListener('click', () => {
    if (settings.notif.enabled && 'Notification' in window && Notification.permission === 'granted') {
      settings.notif.enabled = false; save(); renderSettings(); toast('تم إيقاف الإشعارات');
    } else enableNotifications();
  });
  $('#notifTest').addEventListener('click', () => notify('ذِكر', 'هذا إشعار تجريبي', 'zikr-test'));
  $$('[data-pk]').forEach(c => c.addEventListener('change', () => { settings.notif.prayers[c.dataset.pk] = c.checked; save(); }));
  $('#leadSel').addEventListener('change', e => { settings.notif.lead = parseInt(e.target.value, 10) || 0; save(); });
  $('#soundChk').addEventListener('change', e => { settings.notif.sound = e.target.checked; save(); if (e.target.checked) unlockAudio(); });
  document.addEventListener('pointerdown', () => { if (settings.notif.sound) unlockAudio(); }, { once: true });
  $('#clearData').addEventListener('click', () => {
    if (!confirm('سيتم مسح المدينة والإعدادات والعدّادات المحفوظة على هذا الجهاز. متابعة؟')) return;
    try { Object.keys(localStorage).filter(k => k.startsWith('zikr:')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* تجاهل */ }
    location.hash = '#prayer';
    location.reload();
  });

  /* ============ اختيار المدينة والموقع ============ */
  const dlg = $('#cityDialog');
  function renderCityList(q) {
    const nq = norm(q.trim());
    const groups = {};
    CITIES.forEach(c => {
      if (nq && !norm(c.name).includes(nq) && !norm(c.region).includes(nq)) return;
      (groups[c.region] = groups[c.region] || []).push(c);
    });
    const html = Object.entries(groups).map(([region, list]) =>
      `<div class="city-group"><h3>${esc(region)}</h3>${list.map(c =>
        `<button type="button" class="city-item" data-id="${esc(c.id)}"${settings.loc.id === c.id ? ' aria-current="true"' : ''}>${esc(c.name)}</button>`).join('')}</div>`).join('');
    $('#cityList').innerHTML = html || '<p class="empty">لا توجد نتائج. جرّب «تحديد موقعي» للوصول إلى موقعك مباشرة.</p>';
  }
  function openCityDialog() {
    $('#citySearch').value = '';
    renderCityList('');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(() => $('#citySearch').focus(), 60);
  }
  function closeCityDialog() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  function setLocation(loc) {
    settings.loc = loc; save();
    lastError = null; retryAt = 0; nextInfo = null;
    renderAll();
    ensureData(true);
  }
  $('#cityBtn').addEventListener('click', openCityDialog);
  $('#cityClose').addEventListener('click', closeCityDialog);
  $('#citySearch').addEventListener('input', e => renderCityList(e.target.value));
  dlg.addEventListener('click', e => { if (e.target === dlg) closeCityDialog(); });
  $('#cityList').addEventListener('click', e => {
    const b = e.target.closest('.city-item');
    if (!b) return;
    const c = CITIES.find(x => x.id === b.dataset.id);
    if (!c) return;
    setLocation({ id: c.id, name: c.name, lat: c.lat, lng: c.lng });
    closeCityDialog();
    toast(`تم اختيار ${c.name}`);
  });

  const distKm = (a, b, c, d) => {
    const r = x => x * Math.PI / 180;
    const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };
  $('#geoBtn').addEventListener('click', () => {
    if (!navigator.geolocation) { toast('متصفحك لا يدعم تحديد الموقع'); return; }
    toast('جارٍ تحديد موقعك…');
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = +pos.coords.latitude.toFixed(3), lng = +pos.coords.longitude.toFixed(3);
      // نطاق تقريبي للمملكة؛ المواقيت هنا مخصصة للسعودية وبتوقيت الرياض
      if (lat < 15.5 || lat > 32.3 || lng < 34.4 || lng > 56) {
        toast('موقعك خارج المملكة العربية السعودية؛ اختر مدينة من القائمة.');
        return;
      }
      let best = CITIES[0], bd = Infinity;
      CITIES.forEach(c => { const d = distKm(lat, lng, c.lat, c.lng); if (d < bd) { bd = d; best = c; } });
      setLocation({ id: 'gps', name: `موقعي (قرب ${best.name})`, lat, lng });
      toast('تم تحديد موقعك');
    }, err => {
      toast(err.code === 1 ? 'لم يُمنح إذن الموقع. يمكنك اختيار المدينة يدويًا.' :
        err.code === 3 ? 'انتهت مهلة تحديد الموقع. حاول مرة أخرى.' : 'تعذّر تحديد موقعك.');
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-act="retry"]')) { lastError = null; ensureData(true); }
  });
  window.addEventListener('online', () => { retryAt = 0; ensureData(true); });
  window.addEventListener('offline', renderStatus);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

  /* ================================================================
     الأذكار
     لإضافة قسم جديد: أضف كائنًا إلى ADHKAR بالحقول:
       id, title, desc, icon (sun | moon | bed | star), items[]
     وكل ذكر: { id, text, count, source, grade, note?, virtue? }
     ================================================================ */
  const AYAT_KURSI = 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ';
  const IKHLAS = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nقُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ';
  const FALAQ = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nقُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ';
  const NAS = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nقُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ';
  const TAHLIL = 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ';

  const QUL_SRC = 'أبو داود والترمذي والنسائي';
  const QUL_VIRTUE = 'من قالها ثلاثًا حين يصبح وحين يمسي كفته من كل شيء.';

  const ADHKAR = [
    {
      id: 'morning', title: 'أذكار الصباح', icon: 'sun',
      desc: 'تُقال من بعد صلاة الفجر إلى طلوع الشمس، ويمتد وقتها إلى الضحى.',
      items: [
        { id: 'm1', text: AYAT_KURSI, count: 1, source: 'سورة البقرة (255) — وفضلها في الصباح عند الحاكم', grade: 'صحيح', virtue: 'من قالها حين يصبح أُجير من الجن حتى يمسي.' },
        { id: 'm2', text: IKHLAS, count: 3, source: QUL_SRC, grade: 'صحيح', virtue: QUL_VIRTUE },
        { id: 'm3', text: FALAQ, count: 3, source: QUL_SRC, grade: 'صحيح', virtue: QUL_VIRTUE },
        { id: 'm4', text: NAS, count: 3, source: QUL_SRC, grade: 'صحيح', virtue: QUL_VIRTUE },
        { id: 'm5', text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَٰذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَٰذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ', count: 1, source: 'رواه مسلم (2723)', grade: 'صحيح' },
        { id: 'm6', text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ', count: 1, source: 'رواه الترمذي، وصححه الألباني', grade: 'صحيح' },
        { id: 'm7', text: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ', count: 1, source: 'رواه البخاري (6306) — سيد الاستغفار', grade: 'صحيح', virtue: 'من قالها موقنًا بها نهارًا فمات قبل أن يمسي فهو من أهل الجنة.' },
        { id: 'm8', text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي', count: 1, source: 'رواه أبو داود وابن ماجه، وصححه الألباني', grade: 'صحيح' },
        { id: 'm9', text: 'اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَىٰ نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَىٰ مُسْلِمٍ', count: 1, source: 'رواه الترمذي وأبو داود، وصححه الألباني', grade: 'صحيح' },
        { id: 'm10', text: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', count: 3, source: 'رواه أبو داود والترمذي، وصححه الألباني', grade: 'صحيح', virtue: 'من قالها ثلاثًا حين يصبح وثلاثًا حين يمسي لم يضره شيء.' },
        { id: 'm11', text: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا', count: 3, source: 'رواه أحمد وأبو داود والترمذي، وحسّنه الألباني', grade: 'حسن', virtue: 'من قالها حين يصبح وحين يمسي كان حقًّا على الله أن يرضيه يوم القيامة.' },
        { id: 'm12', text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَىٰ نَفْسِي طَرْفَةَ عَيْنٍ', count: 1, source: 'رواه الحاكم، وحسّنه الألباني', grade: 'حسن' },
        { id: 'm13', text: 'أَصْبَحْنَا عَلَىٰ فِطْرَةِ الْإِسْلَامِ، وَعَلَىٰ كَلِمَةِ الْإِخْلَاصِ، وَعَلَىٰ دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَىٰ مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ', count: 1, source: 'رواه أحمد وابن السني، وصححه الألباني', grade: 'صحيح' },
        { id: 'm14', text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 100, source: 'رواه مسلم (2692)', grade: 'صحيح', virtue: 'من قالها مائة مرة حين يصبح وحين يمسي لم يأتِ أحد يوم القيامة بأفضل مما جاء به إلا من قال مثل ذلك أو زاد.' },
        { id: 'm15', text: TAHLIL, count: 100, source: 'رواه البخاري (3293) ومسلم (2691)', grade: 'صحيح — متفق عليه', note: 'ورد في فضلها قولها مائة مرة في اليوم.', virtue: 'كانت له عدل عشر رقاب، وكُتبت له مائة حسنة، ومُحيت عنه مائة سيئة، وكانت له حرزًا من الشيطان يومه ذلك.' },
        { id: 'm16', text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ وَرِضَا نَفْسِهِ وَزِنَةَ عَرْشِهِ وَمِدَادَ كَلِمَاتِهِ', count: 3, source: 'رواه مسلم (2726)', grade: 'صحيح', note: 'ورد في الحديث بعد صلاة الفجر.' },
        { id: 'm17', text: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', count: 100, source: 'رواه مسلم (2702) والبخاري (6307)', grade: 'صحيح', note: 'ورد أن النبي ﷺ يتوب إلى الله في اليوم مائة مرة (مسلم)، وفي البخاري «أكثر من سبعين مرة».' }
      ]
    },
    {
      id: 'evening', title: 'أذكار المساء', icon: 'moon',
      desc: 'تُقال من بعد صلاة العصر إلى غروب الشمس، ويمتد وقتها إلى منتصف الليل.',
      items: [
        { id: 'e1', text: AYAT_KURSI, count: 1, source: 'سورة البقرة (255) — وفضلها في المساء عند الحاكم', grade: 'صحيح', virtue: 'من قالها حين يمسي أُجير من الجن حتى يصبح.' },
        { id: 'e2', text: IKHLAS, count: 3, source: QUL_SRC, grade: 'صحيح', virtue: QUL_VIRTUE },
        { id: 'e3', text: FALAQ, count: 3, source: QUL_SRC, grade: 'صحيح', virtue: QUL_VIRTUE },
        { id: 'e4', text: NAS, count: 3, source: QUL_SRC, grade: 'صحيح', virtue: QUL_VIRTUE },
        { id: 'e5', text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَٰذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَٰذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ', count: 1, source: 'رواه مسلم (2723)', grade: 'صحيح' },
        { id: 'e6', text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ', count: 1, source: 'رواه الترمذي، وصححه الألباني', grade: 'صحيح' },
        { id: 'e7', text: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ', count: 1, source: 'رواه البخاري (6306) — سيد الاستغفار', grade: 'صحيح', virtue: 'من قالها موقنًا بها ليلًا فمات قبل أن يصبح فهو من أهل الجنة.' },
        { id: 'e8', text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي', count: 1, source: 'رواه أبو داود وابن ماجه، وصححه الألباني', grade: 'صحيح' },
        { id: 'e9', text: 'اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَىٰ نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَىٰ مُسْلِمٍ', count: 1, source: 'رواه الترمذي وأبو داود، وصححه الألباني', grade: 'صحيح' },
        { id: 'e10', text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', count: 3, source: 'رواه مسلم (2709)، وورد تقييده بالمساء ثلاثًا عند أحمد والترمذي', grade: 'صحيح', virtue: 'من قالها ثلاثًا حين يمسي لم تضره حُمَةٌ تلك الليلة.' },
        { id: 'e11', text: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', count: 3, source: 'رواه أبو داود والترمذي، وصححه الألباني', grade: 'صحيح', virtue: 'من قالها ثلاثًا حين يصبح وثلاثًا حين يمسي لم يضره شيء.' },
        { id: 'e12', text: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا', count: 3, source: 'رواه أحمد وأبو داود والترمذي، وحسّنه الألباني', grade: 'حسن', virtue: 'من قالها حين يصبح وحين يمسي كان حقًّا على الله أن يرضيه يوم القيامة.' },
        { id: 'e13', text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَىٰ نَفْسِي طَرْفَةَ عَيْنٍ', count: 1, source: 'رواه الحاكم، وحسّنه الألباني', grade: 'حسن' },
        { id: 'e14', text: 'أَمْسَيْنَا عَلَىٰ فِطْرَةِ الْإِسْلَامِ، وَعَلَىٰ كَلِمَةِ الْإِخْلَاصِ، وَعَلَىٰ دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَىٰ مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ', count: 1, source: 'رواه أحمد وابن السني، وصححه الألباني', grade: 'صحيح' },
        { id: 'e15', text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 100, source: 'رواه مسلم (2692)', grade: 'صحيح', virtue: 'من قالها مائة مرة حين يصبح وحين يمسي لم يأتِ أحد يوم القيامة بأفضل مما جاء به إلا من قال مثل ذلك أو زاد.' }
      ]
    },
    {
      id: 'sleep', title: 'أذكار النوم', icon: 'bed',
      desc: 'تُقال عند الاضطجاع على الفراش قبل النوم.',
      items: [
        { id: 's1', text: AYAT_KURSI, count: 1, source: 'رواه البخاري (2311)', grade: 'صحيح', virtue: 'من قرأها إذا أوى إلى فراشه لم يزل عليه من الله حافظ، ولا يقربه شيطان حتى يصبح.' },
        { id: 's2', text: 'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ۝ لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ', count: 1, source: 'سورة البقرة (285–286) — رواه البخاري (5009) ومسلم (807)', grade: 'صحيح — متفق عليه', virtue: 'من قرأ بالآيتين من آخر سورة البقرة في ليلة كفتاه.' },
        { id: 's3', text: IKHLAS + '\n' + FALAQ + '\n' + NAS, count: 3, source: 'رواه البخاري (5017)', grade: 'صحيح', note: 'كان النبي ﷺ إذا أوى إلى فراشه جمع كفيه ونفث فيهما وقرأ هذه السور، ثم مسح بهما ما استطاع من جسده، يبدأ برأسه ووجهه وما أقبل من جسده، يفعل ذلك ثلاث مرات.' },
        { id: 's4', text: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ', count: 1, source: 'رواه البخاري (6320) ومسلم (2714)', grade: 'صحيح — متفق عليه' },
        { id: 's5', text: 'اللَّهُمَّ إِنَّكَ خَلَقْتَ نَفْسِي وَأَنْتَ تَوَفَّاهَا، لَكَ مَمَاتُهَا وَمَحْيَاهَا، إِنْ أَحْيَيْتَهَا فَاحْفَظْهَا، وَإِنْ أَمَتَّهَا فَاغْفِرْ لَهَا، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ', count: 1, source: 'رواه مسلم (2712)', grade: 'صحيح' },
        { id: 's6', text: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', count: 3, source: 'رواه أبو داود والترمذي، وصححه الألباني', grade: 'صحيح', note: 'كان النبي ﷺ يضع يده اليمنى تحت خده ثم يقولها.' },
        { id: 's7', text: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', count: 1, source: 'رواه البخاري (6324)', grade: 'صحيح' },
        { id: 's8', text: 'سُبْحَانَ اللَّهِ', count: 33, source: 'رواه البخاري (3113) ومسلم (2727)', grade: 'صحيح — متفق عليه', note: 'التسبيح والتحميد والتكبير عند النوم خير من خادم، كما في حديث علي وفاطمة رضي الله عنهما.' },
        { id: 's9', text: 'الْحَمْدُ لِلَّهِ', count: 33, source: 'رواه البخاري (3113) ومسلم (2727)', grade: 'صحيح — متفق عليه' },
        { id: 's10', text: 'اللَّهُ أَكْبَرُ', count: 34, source: 'رواه البخاري (3113) ومسلم (2727)', grade: 'صحيح — متفق عليه' },
        { id: 's11', text: 'اللَّهُمَّ رَبَّ السَّمَاوَاتِ السَّبْعِ وَرَبَّ الْعَرْشِ الْعَظِيمِ، رَبَّنَا وَرَبَّ كُلِّ شَيْءٍ، فَالِقَ الْحَبِّ وَالنَّوَىٰ، وَمُنْزِلَ التَّوْرَاةِ وَالْإِنْجِيلِ وَالْفُرْقَانِ، أَعُوذُ بِكَ مِنْ شَرِّ كُلِّ شَيْءٍ أَنْتَ آخِذٌ بِنَاصِيَتِهِ، اللَّهُمَّ أَنْتَ الْأَوَّلُ فَلَيْسَ قَبْلَكَ شَيْءٌ، وَأَنْتَ الْآخِرُ فَلَيْسَ بَعْدَكَ شَيْءٌ، وَأَنْتَ الظَّاهِرُ فَلَيْسَ فَوْقَكَ شَيْءٌ، وَأَنْتَ الْبَاطِنُ فَلَيْسَ دُونَكَ شَيْءٌ، اقْضِ عَنَّا الدَّيْنَ وَأَغْنِنَا مِنَ الْفَقْرِ', count: 1, source: 'رواه مسلم (2713)', grade: 'صحيح' },
        { id: 's12', text: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَكَفَانَا وَآوَانَا، فَكَمْ مِمَّنْ لَا كَافِيَ لَهُ وَلَا مُؤْوِيَ', count: 1, source: 'رواه مسلم (2715)', grade: 'صحيح' },
        { id: 's13', text: 'قراءة سورة السجدة (الم تنزيل) وسورة الملك (تبارك)', count: 1, source: 'رواه الترمذي وأحمد، وصححه الألباني', grade: 'صحيح', note: 'كان النبي ﷺ لا ينام حتى يقرأهما. تُقرآن من المصحف كاملتين.' }
      ]
    },
    {
      id: 'after-prayer', title: 'أذكار بعد الصلاة', icon: 'star',
      desc: 'تُقال بعد السلام من الصلوات المفروضة.',
      items: [
        { id: 'p1', text: 'أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ\nاللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ', count: 1, source: 'رواه مسلم (591)', grade: 'صحيح', note: 'الاستغفار ثلاثًا ثم الدعاء بعده.' },
        { id: 'p2', text: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ', count: 1, source: 'رواه البخاري (844) ومسلم (593)', grade: 'صحيح — متفق عليه' },
        { id: 'p3', text: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ، لَا إِلَٰهَ إِلَّا اللَّهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ', count: 1, source: 'رواه مسلم (594)', grade: 'صحيح' },
        { id: 'p4', text: 'سُبْحَانَ اللَّهِ', count: 33, source: 'رواه مسلم (597)', grade: 'صحيح' },
        { id: 'p5', text: 'الْحَمْدُ لِلَّهِ', count: 33, source: 'رواه مسلم (597)', grade: 'صحيح' },
        { id: 'p6', text: 'اللَّهُ أَكْبَرُ', count: 33, source: 'رواه مسلم (597)', grade: 'صحيح' },
        { id: 'p7', text: TAHLIL, count: 1, source: 'رواه مسلم (597)', grade: 'صحيح', note: 'تمام المائة بعد التسبيح والتحميد والتكبير.', virtue: 'غُفرت خطاياه وإن كانت مثل زبد البحر.' },
        { id: 'p8', text: AYAT_KURSI, count: 1, source: 'رواه النسائي في السنن الكبرى، وصححه الألباني', grade: 'صحيح', virtue: 'من قرأها دبر كل صلاة مكتوبة لم يمنعه من دخول الجنة إلا الموت.' },
        { id: 'p9', text: IKHLAS + '\n' + FALAQ + '\n' + NAS, count: 1, source: 'رواه أبو داود والترمذي والنسائي، وصححه الألباني', grade: 'صحيح', note: 'أمر النبي ﷺ بقراءة المعوذات دبر كل صلاة.' },
        { id: 'p10', text: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، يُحْيِي وَيُمِيتُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', count: 10, source: 'رواه الترمذي وأحمد', grade: 'حسن', note: 'بعد صلاتي الفجر والمغرب، قبل أن يثني رجليه ويتكلم.' },
        { id: 'p11', text: 'اللَّهُمَّ أَعِنِّي عَلَىٰ ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', count: 1, source: 'رواه أبو داود والنسائي، وصححه الألباني', grade: 'صحيح', note: 'أوصى النبي ﷺ معاذًا رضي الله عنه ألا يدعها دبر كل صلاة.' }
      ]
    }
  ];

  const ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
    star: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>'
  };
  const svg = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ICONS.star}</svg>`;

  function countLabel(n) {
    if (n === 1) return 'مرة واحدة';
    if (n === 2) return 'مرتان';
    return n <= 10 ? `${n} مرات` : `${n} مرة`;
  }

  /* العدّادات: تُحفظ لليوم الحالي فقط ثم تُصفَّر تلقائيًا في اليوم التالي */
  function loadCounts() {
    const c = read(KEYS.counts, null);
    const today = dayKey();
    return c && c.date === today && c.c ? c : { date: today, c: {} };
  }
  let counts = loadCounts();
  const cKey = (sec, id) => `${sec}:${id}`;
  function getCount(sec, id) {
    if (counts.date !== dayKey()) counts = { date: dayKey(), c: {} };
    return counts.c[cKey(sec, id)] || 0;
  }
  function setCount(sec, id, v) {
    if (counts.date !== dayKey()) counts = { date: dayKey(), c: {} };
    if (v > 0) counts.c[cKey(sec, id)] = v; else delete counts.c[cKey(sec, id)];
    write(KEYS.counts, counts);
  }

  function renderAdhkarHome() {
    $('#adhkarCards').innerHTML = ADHKAR.map(s => `
      <a class="sec-card" href="#adhkar/${esc(s.id)}">
        <span class="sec-icon">${svg(s.icon)}</span>
        <span><h2>${esc(s.title)}</h2><p>${esc(s.desc)}</p></span>
      </a>`).join('');
  }

  function itemHTML(sec, it) {
    return `<article class="zikr" data-sec="${esc(sec.id)}" data-id="${esc(it.id)}">
      <div class="zikr-text">${esc(it.text)}</div>
      ${it.note ? `<p class="zikr-note">${esc(it.note)}</p>` : ''}
      ${it.virtue ? `<p class="zikr-virtue"><b>الفضل:</b> ${esc(it.virtue)}</p>` : ''}
      <div class="zikr-foot">
        <div class="meta">
          <span>التكرار: <span class="zikr-count">${countLabel(it.count)}</span></span>
          <span>المصدر: <b>${esc(it.source)}</b></span>
          <span>الدرجة: <span class="badge">${esc(it.grade)}</span></span>
        </div>
        <div class="counter-wrap">
          <button class="counter" type="button" data-act="inc" aria-label="عدّ مرة"><span>0</span></button>
          <small>من ${it.count}</small>
          <button class="reset-one" type="button" data-act="reset">إعادة</button>
        </div>
      </div>
    </article>`;
  }

  function paintItem(card, it) {
    const v = getCount(card.dataset.sec, it.id);
    const btn = $('.counter', card);
    btn.style.setProperty('--p', Math.min(100, v / it.count * 100));
    btn.firstElementChild.textContent = v >= it.count ? '✓' : v;
    btn.classList.toggle('complete', v >= it.count);
    btn.setAttribute('aria-label', `عدّ مرة، العدد الحالي ${v} من ${it.count}`);
    card.classList.toggle('done', v >= it.count);
  }
  let currentSec = null;
  function paintProgress() {
    if (!currentSec) return;
    const done = currentSec.items.filter(it => getCount(currentSec.id, it.id) >= it.count).length;
    $('#detailProgress').textContent = `أتممتَ ${done} من ${currentSec.items.length}`;
    return done === currentSec.items.length;
  }

  function showAdhkar(secId) {
    const sec = ADHKAR.find(s => s.id === secId);
    $('#adhkarHome').hidden = !!sec;
    $('#adhkarDetail').hidden = !sec;
    currentSec = sec || null;
    if (!sec) return;
    $('#detailTitle').textContent = sec.title;
    $('#detailDesc').textContent = sec.desc;
    $('#adhkarList').innerHTML = sec.items.map(it => itemHTML(sec, it)).join('');
    $$('.zikr', $('#adhkarList')).forEach((card, i) => paintItem(card, sec.items[i]));
    paintProgress();
  }

  $('#adhkarList').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn || !currentSec) return;
    const card = btn.closest('.zikr');
    const it = currentSec.items.find(x => x.id === card.dataset.id);
    const v = getCount(currentSec.id, it.id);
    if (btn.dataset.act === 'inc') {
      if (v >= it.count) return;
      setCount(currentSec.id, it.id, v + 1);
      if (navigator.vibrate) navigator.vibrate(v + 1 >= it.count ? [20, 40, 20] : 10);
    } else {
      setCount(currentSec.id, it.id, 0);
    }
    paintItem(card, it);
    if (paintProgress() && btn.dataset.act === 'inc') toast('تقبّل الله منك، أتممتَ أذكار هذا القسم');
  });
  $('#resetAll').addEventListener('click', () => {
    if (!currentSec) return;
    currentSec.items.forEach(it => setCount(currentSec.id, it.id, 0));
    showAdhkar(currentSec.id);
    toast('تمت إعادة ضبط العدّادات');
  });

  /* ============ التنقل ============ */
  function route() {
    const parts = (location.hash.replace(/^#/, '') || 'prayer').split('/');
    const view = ['prayer', 'adhkar', 'settings'].includes(parts[0]) ? parts[0] : 'prayer';
    $$('.view').forEach(s => { s.hidden = s.id !== 'view-' + view; });
    $$('.tab').forEach(a => {
      const on = a.dataset.view === view;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (view === 'adhkar') showAdhkar(parts[1]);
    if (view === 'settings') renderSettings();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ============ تسجيل الدخول عبر Google (اختياري) ============
     ضع معرّف العميل هنا (Client ID فقط، لا تضع Client Secret أبدًا).
     في Google Cloud ← Credentials ← OAuth client (Web) أضف في Authorized JavaScript origins
     عنوان موقعك مثل https://your-site.vercel.app و https://USER.github.io (بلا مسار) */
  const GOOGLE_CLIENT_ID = '8246593834-ru0ev2ui7dq0uh5547df20mcc7ek1hdq.apps.googleusercontent.com';

  function decodeJwt(t) {
    const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b + '==='.slice((b.length + 3) % 4));
    return JSON.parse(decodeURIComponent(Array.from(bin, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
  }
  let user = read('zikr:user', null);
  function renderAuth() {
    const av = $('#userAvatar');
    if (user && user.picture) { av.src = user.picture; av.alt = user.name || ''; av.hidden = false; } else av.hidden = true;
    $('#logoutBtn').hidden = !user;
    $('#gBtn').hidden = !!user;
    $('#authState').textContent = user ? `مسجّل الدخول: ${user.name || user.email || ''}` :
      GOOGLE_CLIENT_ID ? 'لم تسجّل الدخول. يمكنك المتابعة بدون حساب.' : 'لم يُضبط معرّف عميل Google بعد في script.js.';
  }
  function onCredential(res) {
    try {
      const c = decodeJwt(res.credential);
      if (c.aud !== GOOGLE_CLIENT_ID || c.exp * 1000 < Date.now()) throw new Error('bad token');
      user = { name: c.name, email: c.email, picture: c.picture };
      write('zikr:user', user); renderAuth(); toast('تم تسجيل الدخول');
    } catch (e) { toast('تعذّر تسجيل الدخول'); }
  }
  function initGoogle(tries = 0) {
    if (!GOOGLE_CLIENT_ID) return;
    if (!(window.google && google.accounts && google.accounts.id)) {
      if (tries < 20) setTimeout(() => initGoogle(tries + 1), 500);
      return;
    }
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onCredential });
    google.accounts.id.renderButton($('#gBtn'), { theme: 'outline', size: 'large', text: 'signin_with', locale: 'ar', shape: 'pill' });
  }
  $('#logoutBtn').addEventListener('click', () => {
    user = null; try { localStorage.removeItem('zikr:user'); } catch (e) { /* تجاهل */ }
    if (window.google && google.accounts) google.accounts.id.disableAutoSelect();
    renderAuth(); toast('تم تسجيل الخروج');
  });

  /* ============ التشغيل ============ */
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  renderAdhkarHome();
  renderAuth();
  initGoogle();
  route();
  renderSettings();
  renderDates();
  $('#cityName').textContent = settings.loc.name;
  pruneCache();
  ensureData(true);
  tick();
  setInterval(tick, 1000);
})();
