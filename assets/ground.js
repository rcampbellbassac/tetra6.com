/* ---------- Tactical ground: terrain contours + air tracks ----------
   Terrain is real iso-lines (marching squares) through a ridged fractal
   height field, so contours close around peaks and crowd on steep ground.
   Track symbology follows MIL-STD-2525 conventions: air frames are open at
   the bottom, friendly domed, hostile peaked. Track numbers are Link 16
   five-digit octal (no 8s or 9s). Readouts use real DTG and MGRS formats. */
(function () {
  "use strict";
  var cv = document.getElementById("terrain");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var w = 0, h = 0, dpr = 1, t = 0, drift = 0, rafId = null;
  var MONO = '11px ui-monospace, Menlo, Consolas, monospace';

  function hash(i, j, k) {
    var n = (i * 374761393 + j * 668265263 + k * 1274126177) | 0;
    n = (n ^ (n >>> 13)) * 1274126177 | 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }
  function sm(x) { return x * x * (3 - 2 * x); }
  function lerp(a, b, m) { return a + (b - a) * m; }
  function vnoise(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var u = sm(x - xi), v = sm(y - yi), s2 = sm(z - zi);
    var a = lerp(lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), u),
                 lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v);
    var b = lerp(lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u),
                 lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v);
    return lerp(a, b, s2);
  }
  function height(x, y, z) {
    var sum = 0, amp = 0.5, f = 1;
    for (var o = 0; o < 5; o++) {
      var n = vnoise(x * f, y * f, z * f);
      n = 1 - Math.abs(n * 2 - 1);
      sum += n * n * amp;
      amp *= 0.5; f *= 2.03;
    }
    return sum;
  }

  var CELL = 12, cols = 0, rows = 0, field = null, paths = [], LEVELS = 22;

  function buildPaths(z) {
    var scale = 0.0055, i, j;
    for (j = 0; j <= rows; j++)
      for (i = 0; i <= cols; i++)
        field[j * (cols + 1) + i] = height(i * CELL * scale, j * CELL * scale, z);

    paths = [];
    var lo = 0.18, hi = 0.92;
    for (var L = 0; L < LEVELS; L++) {
      var lvl = lo + (hi - lo) * (L / (LEVELS - 1));
      var p = new Path2D();
      for (j = 0; j < rows; j++) {
        for (i = 0; i < cols; i++) {
          var x0 = i * CELL, y0 = j * CELL;
          var a = field[j * (cols + 1) + i];
          var b = field[j * (cols + 1) + i + 1];
          var c = field[(j + 1) * (cols + 1) + i + 1];
          var d = field[(j + 1) * (cols + 1) + i];
          var idx = (a > lvl ? 8 : 0) | (b > lvl ? 4 : 0) | (c > lvl ? 2 : 0) | (d > lvl ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          var T = [x0 + CELL * (lvl - a) / (b - a), y0];
          var R = [x0 + CELL, y0 + CELL * (lvl - b) / (c - b)];
          var B = [x0 + CELL * (lvl - d) / (c - d), y0 + CELL];
          var Lf = [x0, y0 + CELL * (lvl - a) / (d - a)];
          var seg = function (p1, p2) { p.moveTo(p1[0], p1[1]); p.lineTo(p2[0], p2[1]); };
          switch (idx) {
            case 1: case 14: seg(Lf, B); break;
            case 2: case 13: seg(B, R); break;
            case 3: case 12: seg(Lf, R); break;
            case 4: case 11: seg(T, R); break;
            case 6: case 9:  seg(T, B); break;
            case 7: case 8:  seg(Lf, T); break;
            case 5: seg(Lf, T); seg(B, R); break;
            case 10: seg(Lf, B); seg(T, R); break;
          }
        }
      }
      paths.push({ path: p, level: L });
    }
  }

  function drawContours() {
    for (var k = 0; k < paths.length; k++) {
      var isIndex = (paths[k].level % 5 === 0);
      var elev = paths[k].level / (LEVELS - 1);
      ctx.strokeStyle = isIndex
        ? "rgba(140,152,164," + (0.12 + elev * 0.15) + ")"
        : "rgba(116,128,141," + (0.05 + elev * 0.07) + ")";
      ctx.lineWidth = isIndex ? 1.15 : 0.75;
      ctx.stroke(paths[k].path);
    }
  }

  var TYPES_F = ["MQ-9", "RQ-4", "MQ-1C", "RQ-7B"];
  var TYPES_H = ["UAS GRP3", "UAS GRP2", "UAS GRP3"];
  var tracks = [];

  function octal5() {
    var s2 = "";
    for (var i = 0; i < 5; i++) s2 += Math.floor(Math.random() * 8);
    return s2;
  }
  function makeTrack(aff) {
    var spd = aff === "F" ? 0.14 + Math.random() * 0.09 : 0.10 + Math.random() * 0.07;
    var hdg = Math.random() * Math.PI * 2;
    return {
      aff: aff, x: Math.random() * w, y: Math.random() * h,
      vx: Math.cos(hdg) * spd, vy: Math.sin(hdg) * spd,
      tn: octal5(),
      type: aff === "F" ? TYPES_F[(Math.random() * TYPES_F.length) | 0]
                        : TYPES_H[(Math.random() * TYPES_H.length) | 0],
      fl: 80 + Math.floor(Math.random() * 22) * 10,
      kts: 70 + Math.floor(Math.random() * 190),
      hist: [], turn: (Math.random() - 0.5) * 0.00016
    };
  }
  function seedTracks() {
    tracks = [];
    var n = w < 640 ? 3 : 5;
    for (var i = 0; i < n; i++) tracks.push(makeTrack(i % 3 === 2 ? "H" : "F"));
  }
  function updateTracks() {
    for (var i = 0; i < tracks.length; i++) {
      var k = tracks[i];
      var ang = Math.atan2(k.vy, k.vx) + k.turn * 16;
      var sp = Math.sqrt(k.vx * k.vx + k.vy * k.vy);
      k.vx = Math.cos(ang) * sp; k.vy = Math.sin(ang) * sp;
      k.x += k.vx; k.y += k.vy;
      if (t % 320 < 17) { k.hist.push([k.x, k.y]); if (k.hist.length > 7) k.hist.shift(); }
      var m = 90;
      if (k.x < -m) { k.x = w + m; k.hist = []; }
      if (k.x > w + m) { k.x = -m; k.hist = []; }
      if (k.y < -m) { k.y = h + m; k.hist = []; }
      if (k.y > h + m) { k.y = -m; k.hist = []; }
    }
  }
  function drawTracks() {
    ctx.font = MONO; ctx.textBaseline = "top";
    for (var i = 0; i < tracks.length; i++) {
      var k = tracks[i];
      var hostile = k.aff === "H";
      var col = hostile ? "226,27,45" : "74,144,164";
      var base = hostile ? 0.42 : 0.36;
      for (var j = 0; j < k.hist.length; j++) {
        var f = (j + 1) / k.hist.length;
        ctx.fillStyle = "rgba(" + col + "," + (base * f * 0.36) + ")";
        ctx.fillRect(k.hist[j][0] - 1, k.hist[j][1] - 1, 2, 2);
      }
      var ang = Math.atan2(k.vy, k.vx);
      var lead = 20 + (k.kts / 260) * 22;
      ctx.strokeStyle = "rgba(" + col + "," + (base * 0.55) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(k.x, k.y);
      ctx.lineTo(k.x + Math.cos(ang) * lead, k.y + Math.sin(ang) * lead);
      ctx.stroke();
      ctx.strokeStyle = "rgba(" + col + "," + base + ")";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      if (hostile) {
        ctx.moveTo(k.x - 7, k.y + 5); ctx.lineTo(k.x - 7, k.y - 1);
        ctx.lineTo(k.x, k.y - 8); ctx.lineTo(k.x + 7, k.y - 1);
        ctx.lineTo(k.x + 7, k.y + 5);
      } else {
        ctx.moveTo(k.x - 7, k.y + 5); ctx.lineTo(k.x - 7, k.y);
        ctx.arc(k.x, k.y, 7, Math.PI, 0);
        ctx.lineTo(k.x + 7, k.y + 5);
      }
      ctx.stroke();
      var lx = k.x + 12, ly = k.y - 8;
      var hdgDeg = ((ang * 180 / Math.PI) + 450) % 360;
      ctx.fillStyle = "rgba(" + col + "," + (base * 0.92) + ")";
      ctx.fillText(k.tn, lx, ly);
      ctx.fillStyle = "rgba(184,192,200," + (base * 0.6) + ")";
      ctx.fillText(k.type + "  FL" + k.fl, lx, ly + 12);
      ctx.fillText(("00" + Math.round(hdgDeg)).slice(-3) + "/" + ("00" + k.kts).slice(-3), lx, ly + 24);
    }
  }

  var MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  function pad(n, l) { return ("0000" + n).slice(-l); }
  function dtg() {
    var d = new Date();
    return pad(d.getUTCDate(), 2) + pad(d.getUTCHours(), 2) + pad(d.getUTCMinutes(), 2) +
           "Z" + MONTHS[d.getUTCMonth()] + String(d.getUTCFullYear()).slice(2);
  }
  function drawReadouts() {
    ctx.font = MONO; ctx.textBaseline = "top";
    var dim = "rgba(116,128,141,0.26)", p1 = 18;
    ctx.fillStyle = "rgba(116,128,141,0.30)";
    ctx.textAlign = "center";
    ctx.fillText("UNCLASSIFIED", w / 2, 10);
    ctx.textAlign = "left";
    ctx.fillStyle = dim;
    ctx.fillText(dtg(), p1, h - 46);
    ctx.fillText("16TDL 84213 09772", p1, h - 32);
    ctx.textAlign = "right";
    ctx.fillText("TRK " + pad(tracks.length, 2) + "  LINK 16", w - p1, h - 46);
    ctx.fillText("GEODETIC WGS-84", w - p1, h - 32);
    ctx.textAlign = "left";
  }

  var lastBuild = -1e9;
  function render() {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(Math.sin(drift * 0.00008) * 16, Math.cos(drift * 0.00006) * 11);
    drawContours();
    ctx.restore();
    drawTracks();
    drawReadouts();
  }
  function frame() {
    t += 16; drift += 16;
    /* Marching squares is expensive, so the height field rebuilds ~1.6s
       apart and cached paths are panned between rebuilds. The morph is far
       too slow for the stepping to be visible. */
    if (t - lastBuild > 1600) { lastBuild = t; buildPaths(t * 0.000012); }
    updateTracks();
    render();
    rafId = requestAnimationFrame(frame);
  }
  function start() { if (rafId === null && !reduced) rafId = requestAnimationFrame(frame); }
  function stop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CELL = w < 640 ? 15 : 12;
    LEVELS = w < 640 ? 16 : 22;
    cols = Math.ceil(w / CELL) + 2;
    rows = Math.ceil(h / CELL) + 2;
    field = new Float32Array((cols + 1) * (rows + 1));
    buildPaths(t * 0.000012);
    seedTracks();
    render();
  }

  var rt = null;
  window.addEventListener("resize", function () {
    clearTimeout(rt); rt = setTimeout(resize, 180);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  resize();
  if (!reduced) start();
})();
