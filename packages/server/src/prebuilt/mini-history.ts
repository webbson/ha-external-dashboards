import type { PrebuiltComponent } from "./types.js";

export const miniHistory: PrebuiltComponent = {
  name: "Mini History",
  template: `<div class="mini-history"
  data-entity="{{param "entity"}}"
  data-hours="{{param "hours"}}"
  data-height="{{param "height"}}"
  data-color="{{param "color"}}"
  data-line-width="{{param "lineWidth"}}"
  data-fill="{{param "fill"}}"
  data-script-once>
  <div class="mini-history-chart"></div>
  <div class="mini-history-status">Loading…</div>
</div>
<script>
(function() {
  var root = comp.querySelector('.mini-history');
  if (!root) return;
  var entityId = root.getAttribute('data-entity');
  var hours = parseFloat(root.getAttribute('data-hours')) || 24;
  var height = parseInt(root.getAttribute('data-height'), 10) || 60;
  var color = root.getAttribute('data-color') || 'currentColor';
  var lineWidth = parseFloat(root.getAttribute('data-line-width')) || 1.5;
  var fillEnabled = root.getAttribute('data-fill') === 'true';
  var chartEl = root.querySelector('.mini-history-chart');
  var statusEl = root.querySelector('.mini-history-status');
  chartEl.style.height = height + 'px';

  if (!entityId) {
    statusEl.textContent = 'No entity selected';
    return;
  }

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.style.display = text ? '' : 'none';
  }

  function resolvedColor() {
    if (color && color !== 'currentColor') return color;
    // Resolve currentColor against the chart element
    try {
      var c = getComputedStyle(chartEl).color;
      return c || '#4fc3f7';
    } catch (e) {
      return '#4fc3f7';
    }
  }

  function hexToRgba(c, alpha) {
    if (!c) return 'rgba(79,195,247,' + alpha + ')';
    if (c.indexOf('rgb') === 0) {
      // rgb() or rgba() — inject alpha
      return c.replace(/rgba?\\(([^)]+)\\)/, function(_, inner) {
        var parts = inner.split(',').map(function(s) { return s.trim(); });
        return 'rgba(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ',' + alpha + ')';
      });
    }
    if (c[0] === '#' && (c.length === 7 || c.length === 4)) {
      var h = c.length === 4 ? ('#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]) : c;
      var r = parseInt(h.slice(1, 3), 16);
      var g = parseInt(h.slice(3, 5), 16);
      var b = parseInt(h.slice(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }
    return c;
  }

  function render(history) {
    if (!window.uPlot) {
      setStatus('Chart library not loaded');
      return;
    }
    var points = (history || []).map(function(s) {
      var v = parseFloat(s.state);
      return { t: Math.floor(new Date(s.last_changed || s.last_updated).getTime() / 1000), v: isNaN(v) ? null : v };
    }).filter(function(p) { return p.v != null && !isNaN(p.t); });

    if (points.length < 2) {
      chartEl.innerHTML = '';
      setStatus('No data');
      return;
    }

    setStatus('');
    chartEl.innerHTML = '';

    var ts = points.map(function(p) { return p.t; });
    var vs = points.map(function(p) { return p.v; });
    var stroke = resolvedColor();
    var fill = fillEnabled ? hexToRgba(stroke, 0.18) : undefined;

    var rect = chartEl.getBoundingClientRect();
    var width = Math.max(80, Math.floor(rect.width));

    var opts = {
      width: width,
      height: height,
      cursor: { show: false },
      legend: { show: false },
      scales: { x: { time: true } },
      axes: [
        { show: false },
        { show: false },
      ],
      series: [
        {},
        {
          stroke: stroke,
          width: lineWidth,
          fill: fill,
          points: { show: false },
        },
      ],
    };
    // eslint-disable-next-line no-new
    new window.uPlot(opts, [ts, vs], chartEl);

    // Keep chart responsive to container resize
    if (window.ResizeObserver && !root.__mh_ro) {
      var ro = new ResizeObserver(function() {
        var r = chartEl.getBoundingClientRect();
        if (chartEl.firstChild && chartEl.firstChild._uplot) return; // uPlot handles own canvas
      });
      ro.observe(chartEl);
      root.__mh_ro = ro;
    }
  }

  function fetchAndRender() {
    var end = new Date();
    var start = new Date(end.getTime() - hours * 3600000);
    var url = '/api/history/' + encodeURIComponent(entityId) +
      '?start=' + encodeURIComponent(start.toISOString()) +
      '&end=' + encodeURIComponent(end.toISOString());
    fetch(url, { credentials: 'same-origin' })
      .then(function(r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
      .then(function(data) {
        var history = Array.isArray(data) && data.length > 0 ? data[0] : [];
        render(history);
      })
      .catch(function(err) {
        console.warn('[Mini History] fetch failed', err);
        setStatus('Error loading history');
      });
  }

  setStatus('Loading…');
  fetchAndRender();
  // Refresh every 5 min (server cache is 30s; this keeps the sparkline reasonably fresh)
  var intervalId = setInterval(fetchAndRender, 5 * 60 * 1000);

  root.__mapCleanup = function() {
    clearInterval(intervalId);
    if (root.__mh_ro) { try { root.__mh_ro.disconnect(); } catch (e) {} root.__mh_ro = null; }
  };
})();
</script>`,
  styles: `.mini-history { position: relative; padding: 8px; }
.mini-history-chart { width: 100%; color: var(--db-accent-color, #4fc3f7); }
.mini-history-chart .u-legend { display: none; }
.mini-history-status { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.8em; color: var(--db-font-color-secondary, #aaa); pointer-events: none; }`,
  parameterDefs: [
    { name: "hours", label: "Hours", type: "number", default: 24 },
    { name: "height", label: "Height (px)", type: "number", default: 60 },
    { name: "color", label: "Color", type: "color", default: "#4fc3f7" },
    { name: "lineWidth", label: "Line Width", type: "number", default: 1.5 },
    { name: "fill", label: "Fill Area", type: "boolean", default: true },
  ],
  entitySelectorDefs: [
    { name: "entity", label: "Entity", mode: "single" },
  ],
  isContainer: false,
  containerConfig: null,
};
