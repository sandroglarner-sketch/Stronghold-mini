  // ---------- Hilfsfunktionen ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // Deterministische Mathematik: nur + - * / sqrt, damit der Online-Modus in jedem Browser exakt gleich rechnet
  var PI_ = 3.141592653589793;
  function hyp(a, b) { return Math.sqrt(a * a + b * b); }
  function dred(x) { return x - Math.floor(x / (2 * PI_) + 0.5) * (2 * PI_); }
  function dsin(x) { x = dred(x); var x2 = x * x, t = x, r = x; for (var n = 1; n < 14; n++) { t = -t * x2 / ((2 * n) * (2 * n + 1)); r += t; } return r; }
  function dcos(x) { x = dred(x); var x2 = x * x, t = 1, r = 1; for (var n = 1; n < 14; n++) { t = -t * x2 / ((2 * n - 1) * (2 * n)); r += t; } return r; }
  function datan(x) {
    var neg = x < 0; if (neg) x = -x;
    var inv = x > 1; if (inv) x = 1 / x;
    x = x / (1 + Math.sqrt(1 + x * x)); x = x / (1 + Math.sqrt(1 + x * x));
    var x2 = x * x, t = x, r = x;
    for (var n = 1; n < 10; n++) { t = -t * x2; r += t / (2 * n + 1); }
    r *= 4;
    if (inv) r = PI_ / 2 - r;
    return neg ? -r : r;
  }
  function datan2(y, x) {
    if (x > 0) return datan(y / x);
    if (x < 0) return y >= 0 ? datan(y / x) + PI_ : datan(y / x) - PI_;
    return y > 0 ? PI_ / 2 : y < 0 ? -PI_ / 2 : 0;
  }
  function dasin(v) { return v >= 1 ? PI_ / 2 : v <= -1 ? -PI_ / 2 : datan(v / Math.sqrt(1 - v * v)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

