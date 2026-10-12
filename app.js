(function () {
  'use strict';

  /* ---------- data ---------- */
  var D = window.HR_DATA;
  var C = {};
  var BLANK = '(Blank)', BLANK_LABEL = 'Unassigned'; D.cols.forEach(function (c, i) { C[c] = i; });
  var rows = D.rows;

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var PALETTE = ['#5E20B5','#2F3A4F','#B39DDB','#7B2CBF','#17233C','#6B7280','#4AC5BB','#FB8281','#F4D25A','#A4DDEE','#FDAB89','#B687AC','#28738A'];
  var GENDER = { f: { label: 'Female', color: '#5E20B5' }, m: { label: 'Male', color: '#17233C' } };
  var GEN = { X: { label: 'Generation X (≤1980)', color: '#2F3A4F' }, M: { label: 'Generation M (1981–2000)', color: '#5E20B5' }, Z: { label: 'Generation Z (≥2001)', color: '#B39DDB' } };
  var TYPES = [
    ['D','Direct'], ['I','Indirect'], ['A','Staff'], ['W','W'], ['V','V'], ['E','E']
  ];
  var SEN_COLOR = { 'Less than 6 months':'#EDE7F6','6 months - 1 year':'#B39DDB','1 - 2 years':'#7B2CBF','More than 2 years':'#5E20B5' };
  var SEN_ORDER = ['Less than 6 months','6 months - 1 year','1 - 2 years','More than 2 years'];

  var YEARS = [2025, 2026];
  var DEFAULTS = function () {
    return { year: 2026, gender: new Set(), type: new Set(), project: '' };
  };
  var S = DEFAULTS();
  var showAll = { region: false, tregion: false };
  var TOP_N = 8;

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function sortedEntries(map) { return Object.keys(map).map(function (k) { return [k, map[k]]; }).sort(function (a, b) { return b[1] - a[1]; }); }
  function add(map, k, n) { map[k] = (map[k] || 0) + n; }

  function filtered() {
    return rows.filter(function (r) {
      if (S.gender.size && !S.gender.has(r[C.g])) return false;
      if (S.type.size && !S.type.has(r[C.t])) return false;
      if (S.project && r[C.p] !== S.project) return false;
      return true;
    });
  }
  // in the workforce on 31 Dec of the selected year
  function isActive(r) { return r[C.hy] <= S.year && (r[C.ey] === 0 || r[C.ey] > S.year); }
  function hiredInYear(r) { return r[C.hy] === S.year; }
  function leftInYear(r) { return r[C.ey] === S.year; }

  /* ---------- filter UI ---------- */
  function buildFilters() {
    var y = $('f-year');
    y.innerHTML = '';
    YEARS.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = v; b.dataset.v = v;
      b.addEventListener('click', function () { S.year = v; update(); });
      y.appendChild(b);
    });

    var g = $('f-gender'); g.innerHTML = '';
    ['f', 'm'].forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = GENDER[k].label; b.dataset.v = k;
      b.addEventListener('click', function () { toggle(S.gender, k); });
      g.appendChild(b);
    });

    var t = $('f-type'); t.innerHTML = '';
    TYPES.forEach(function (x) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = x[1]; b.dataset.v = x[0];
      b.title = 'Employee type ' + x[0];
      b.addEventListener('click', function () { toggle(S.type, x[0]); });
      t.appendChild(b);
    });

    var projects = {};
    rows.forEach(function (r) { add(projects, r[C.p], r[C.n]); });
    var sel = $('f-project');
    sel.innerHTML = '<option value="">All projects</option>';
    Object.keys(projects).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (p) {
      var o = document.createElement('option'); o.value = p; o.textContent = p === BLANK ? BLANK_LABEL : p; sel.appendChild(o);
    });
    sel.addEventListener('change', function () { S.project = sel.value; update(); });

    $('reset').addEventListener('click', function () { S = DEFAULTS(); sel.value = ''; update(); });

    document.querySelectorAll('.toggle').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.t; showAll[k] = !showAll[k]; update();
      });
    });
  }
  function toggle(set, v) { if (set.has(v)) set.delete(v); else set.add(v); update(); }

  function syncFilterUI() {
    document.querySelectorAll('#f-year button').forEach(function (b) { b.classList.toggle('on', +b.dataset.v === S.year); });
    document.querySelectorAll('#f-gender button').forEach(function (b) { b.classList.toggle('on', S.gender.has(b.dataset.v)); });
    document.querySelectorAll('#f-type button').forEach(function (b) { b.classList.toggle('on', S.type.has(b.dataset.v)); });
  }

  /* ---------- chart defaults ---------- */
  Chart.defaults.font.family = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif';
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#2F3A4F';
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.responsive = true;
  Chart.defaults.animation.duration = 350;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '700' };

  // simple value labels for bars
  var valueLabels = {
    id: 'valueLabels',
    afterDatasetsDraw: function (chart, args, opts) {
      if (!opts || !opts.show) return;
      var ctx = chart.ctx, horiz = chart.options.indexAxis === 'y';
      ctx.save();
      ctx.font = '600 11px -apple-system,Segoe UI,Arial,sans-serif';
      ctx.fillStyle = '#17233C';
      chart.data.datasets.forEach(function (ds, di) {
        chart.getDatasetMeta(di).data.forEach(function (el, i) {
          var v = ds.data[i]; if (!v) return;
          if (horiz) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(fmt(v), el.x + 5, el.y); }
          else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(fmt(v), el.x, el.y - 4); }
        });
      });
      ctx.restore();
    }
  };
  Chart.register(valueLabels);

  var charts = {};
  function draw(id, config) {
    if (charts[id]) {
      charts[id].data = config.data;
      charts[id].options = config.options;
      charts[id].update();
    } else {
      charts[id] = new Chart($(id), config);
    }
  }

  var gridLight = { color: '#EEEAF6' };
  function barOpts(horizontal, legend) {
    var o = {
      indexAxis: horizontal ? 'y' : 'x',
      layout: { padding: horizontal ? { right: 34 } : { top: 18 } },
      plugins: { legend: { display: !!legend }, valueLabels: { show: true } },
      scales: {
        x: { grid: horizontal ? gridLight : { display: false }, ticks: { maxRotation: horizontal ? 0 : 45, autoSkip: false } },
        y: { grid: horizontal ? { display: false } : gridLight, beginAtZero: true }
      }
    };
    return o;
  }
  function pieOpts() {
    return {
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12 } },
        tooltip: {
          callbacks: {
            label: function (c) {
              var tot = c.dataset.data.reduce(function (a, b) { return a + b; }, 0);
              var p = tot ? (c.parsed / tot * 100).toFixed(1) : '0.0';
              return ' ' + c.label + ': ' + fmt(c.parsed) + ' (' + p + '%)';
            }
          }
        }
      }
    };
  }
  // % labels inside pie/donut slices
  var pieLabels = {
    id: 'pieLabels',
    afterDatasetsDraw: function (chart) {
      if (chart.config.type !== 'doughnut' && chart.config.type !== 'pie') return;
      var ds = chart.data.datasets[0], tot = ds.data.reduce(function (a, b) { return a + b; }, 0);
      if (!tot) return;
      var ctx = chart.ctx; ctx.save();
      ctx.font = '700 12px -apple-system,Segoe UI,Arial,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      chart.getDatasetMeta(0).data.forEach(function (arc, i) {
        var v = ds.data[i]; var pct = v / tot * 100; if (pct < 4) return;
        var p = arc.tooltipPosition();
        var bg = ds.backgroundColor[i];
        ctx.fillStyle = (bg === '#B39DDB') ? '#17233C' : '#fff';
        ctx.fillText(pct.toFixed(0) + '%', p.x, p.y);
      });
      ctx.restore();
    }
  };
  Chart.register(pieLabels);

  /* ---------- update ---------- */
  function update() {
    syncFilterUI();
    var data = filtered();

    var head = 0, byType = {}, hires = 0;
    var gender = {}, gen = {}, region = {}, tregion = {}, project = {}, tproject = {}, sen = {};
    var hireM = { f: new Array(12).fill(0), m: new Array(12).fill(0) };
    var exitM = new Array(12).fill(0);

    data.forEach(function (r) {
      var n = r[C.n];
      add(sen, r[C.sen], n); // snapshot, independent of year
      if (isActive(r)) {
        head += n; add(byType, r[C.t], n);
        add(gender, r[C.g], n); add(gen, r[C.gen], n);
        add(region, r[C.s], n); add(project, r[C.p], n);
      }
      if (hiredInYear(r)) {
        if (r[C.t] === 'D') hires += n;
        if (r[C.hm] >= 1 && hireM[r[C.g]]) hireM[r[C.g]][r[C.hm] - 1] += n;
      }
      if (leftInYear(r)) {
        add(tregion, r[C.s], n); add(tproject, r[C.p], n);
        if (r[C.em] >= 1) exitM[r[C.em] - 1] += n;
      }
    });

    /* KPIs */
    function pct(n) { return head ? (n / head * 100).toFixed(1) + '% of headcount' : '\u00a0'; }
    $('k-head').textContent = fmt(head);
    $('k-head-s').textContent = 'on 31 Dec ' + S.year;
    $('k-staff').textContent = fmt(byType.A || 0); $('k-staff-s').textContent = pct(byType.A || 0);
    $('k-ind').textContent = fmt(byType.I || 0);   $('k-ind-s').textContent = pct(byType.I || 0);
    $('k-dir').textContent = fmt(byType.D || 0);   $('k-dir-s').textContent = pct(byType.D || 0);
    $('k-hires').textContent = fmt(hires);         $('k-hires-s').textContent = 'hired in ' + S.year;

    /* Monthly hiring – stacked area by gender */
    draw('ch-hiring', {
      type: 'line',
      data: {
        labels: MONTHS,
        datasets: ['f', 'm'].map(function (k) {
          return {
            label: GENDER[k].label, data: hireM[k], fill: true, tension: .35,
            borderColor: GENDER[k].color, backgroundColor: GENDER[k].color + (k === 'f' ? 'CC' : '99'),
            pointRadius: 3, pointHoverRadius: 6, borderWidth: 2
          };
        })
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', align: 'end' } },
        scales: { x: { grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: gridLight } }
      }
    });

    /* Monthly turnover */
    draw('ch-exits', {
      type: 'bar',
      data: { labels: MONTHS, datasets: [{ label: 'Exits', data: exitM, backgroundColor: '#5E20B5', borderRadius: 6, maxBarThickness: 36 }] },
      options: barOpts(false, false)
    });

    /* Gender donut */
    var gk = ['f', 'm'].filter(function (k) { return gender[k]; });
    draw('ch-gender', {
      type: 'doughnut',
      data: { labels: gk.map(function (k) { return GENDER[k].label; }), datasets: [{ data: gk.map(function (k) { return gender[k]; }), backgroundColor: gk.map(function (k) { return GENDER[k].color; }), borderWidth: 2, borderColor: '#fff' }] },
      options: Object.assign(pieOpts(), { cutout: '58%' })
    });

    /* Generations pie */
    var genk = ['X', 'M', 'Z'].filter(function (k) { return gen[k]; });
    draw('ch-gen', {
      type: 'pie',
      data: { labels: genk.map(function (k) { return GEN[k].label; }), datasets: [{ data: genk.map(function (k) { return gen[k]; }), backgroundColor: genk.map(function (k) { return GEN[k].color; }), borderWidth: 2, borderColor: '#fff' }] },
      options: pieOpts()
    });

    /* region bars */
    function barChart(id, map, color, horizontal, limit, showN) {
      var e = sortedEntries(map);
      var total = e.length;
      if (limit && !showAll[limit] && e.length > TOP_N) e = e.slice(0, TOP_N);
      var cv = $(id), wrap = cv.parentNode;
      if (horizontal) {
        wrap.style.height = Math.max(240, e.length * 26 + 40) + 'px';
      }
      draw(id, {
        type: 'bar',
        data: { labels: e.map(function (x) { return x[0] === BLANK ? BLANK_LABEL : x[0]; }), datasets: [{ data: e.map(function (x) { return x[1]; }), backgroundColor: color, borderRadius: 5, maxBarThickness: horizontal ? 20 : 44 }] },
        options: barOpts(horizontal, false)
      });
      if (limit) {
        var btn = document.querySelector('.toggle[data-t="' + limit + '"]');
        btn.style.display = total > TOP_N ? '' : 'none';
        btn.textContent = showAll[limit] ? 'Top ' + TOP_N : 'All (' + total + ')';
      }
    }
    barChart('ch-region', region, '#5E20B5', true, 'region');
    barChart('ch-tregion', tregion, '#7B2CBF', true, 'tregion');
    barChart('ch-project', project, '#5E20B5', false);
    barChart('ch-tproject', tproject, '#2F3A4F', true);

    /* seniority */
    var sk = SEN_ORDER.filter(function (k) { return sen[k]; });
    draw('ch-sen', {
      type: 'bar',
      data: { labels: sk, datasets: [{ data: sk.map(function (k) { return sen[k]; }), backgroundColor: sk.map(function (k) { return SEN_COLOR[k]; }), borderColor: '#5E20B5', borderWidth: 1, borderRadius: 6, maxBarThickness: 56 }] },
      options: barOpts(false, false)
    });
  }

  buildFilters();
  update();

  // keep charts crisp when the iPad rotates
  var rt; window.addEventListener('orientationchange', function () {
    clearTimeout(rt); rt = setTimeout(function () { Object.keys(charts).forEach(function (k) { charts[k].resize(); }); }, 250);
  });
})();
