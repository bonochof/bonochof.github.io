(function () {
  // Today as fractional year (e.g. 2026.21 for mid-March 2026)
  var now = new Date();
  var yearStart = new Date(now.getFullYear(), 0, 1);
  var yearEnd = new Date(now.getFullYear() + 1, 0, 1);
  var NOW_FRAC = now.getFullYear() + (now - yearStart) / (yearEnd - yearStart);
  var THIS_YEAR = now.getFullYear();

  var gantts = document.querySelectorAll('.gantt');
  if (gantts.length === 0) return;

  // Find global min/max across ALL gantt charts on the page
  var globalMin = Infinity;
  var dataMax = -Infinity;

  gantts.forEach(function (gantt) {
    gantt.querySelectorAll('.gantt-row').forEach(function (row) {
      var s = parseInt(row.dataset.start);
      var e = row.dataset.end ? parseInt(row.dataset.end) : NOW_FRAC;
      if (s < globalMin) globalMin = s;
      if (e > dataMax) dataMax = e;
    });
  });

  var scaleMin = globalMin;
  var range = NOW_FRAC - scaleMin;
  if (range <= 0) return;

  var ticks = [];
  for (var y = scaleMin; y <= THIS_YEAR; y++) { ticks.push(y); }

  gantts.forEach(function (gantt) {
    var rows = gantt.querySelectorAll('.gantt-row');

    rows.forEach(function (row) {
      var s = parseInt(row.dataset.start);
      var e = row.dataset.end ? parseInt(row.dataset.end) : NOW_FRAC;
      var bar = row.querySelector('.gantt-bar');
      if (!bar) return;

      var leftPct = (s - scaleMin) / range * 100;
      var widthPct = (e - s) / range * 100;
      if (widthPct < 1.5) widthPct = 1.5;

      bar.style.left = leftPct + '%';
      bar.style.width = widthPct + '%';

      if (!row.dataset.end) {
        bar.classList.add('ongoing');
      }

      // Add year label inside bar
      var yearEl = document.createElement('span');
      yearEl.className = 'gantt-bar-year';
      yearEl.textContent = s + ' – ' + (row.dataset.end || '');
      bar.appendChild(yearEl);

      requestAnimationFrame(function () {
        if (bar.offsetWidth < yearEl.offsetWidth + 12) {
          yearEl.style.left = 'auto';
          yearEl.style.right = '-' + (yearEl.offsetWidth + 8) + 'px';
          yearEl.style.color = '#888';
        }
      });

      // Grid lines
      var track = row.querySelector('.gantt-track');
      if (!track) return;
      var grid = document.createElement('div');
      grid.className = 'gantt-grid';
      for (var t = 0; t < ticks.length; t++) {
        var line = document.createElement('span');
        line.style.left = ((ticks[t] - scaleMin) / range * 100) + '%';
        grid.appendChild(line);
      }
      track.insertBefore(grid, track.firstChild);
    });

    // Build scale
    var scale = gantt.querySelector('.gantt-scale');
    if (!scale) return;
    for (var t = 0; t < ticks.length; t++) {
      var span = document.createElement('span');
      span.textContent = ticks[t];
      span.style.left = ((ticks[t] - scaleMin) / range * 100) + '%';
      scale.appendChild(span);
    }
  });
})();
