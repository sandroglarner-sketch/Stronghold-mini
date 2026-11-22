  // ---------- Landschaft (einmal gezeichnet) ----------
  var back = document.createElement('canvas');
  back.width = W * T;
  back.height = H * T;

  function buildBackdrop() {
    var c = back.getContext('2d'), rnd = mulberry32(11), x, y, i;
    c.fillStyle = P['grass-a'];
    c.fillRect(0, 0, back.width, back.height);
    for (x = 0; x < W; x++) {
      for (y = 0; y < H; y++) {
        if (rnd() < 0.5) { c.fillStyle = P['grass-b']; c.fillRect(x * T, y * T, T, T); }
      }
    }
    // Weg zwischen den Kasernen
    c.lineCap = 'round';
    c.lineJoin = 'round';
    var layers = [[T * 1.55, P['dirt-edge']], [T * 1.3, P.dirt]];
    for (var l = 0; l < layers.length; l++) {
      c.strokeStyle = layers[l][1];
      c.lineWidth = layers[l][0];
      c.beginPath();
      for (i = 0; i <= 40; i++) {
        var px = (0.5 + i * (W - 1) / 40) * T;
        var py = (5 + Math.sin(i * 0.3) * 0.55) * T;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.stroke();
    }
    // Grasbüschel
    c.strokeStyle = P.tuft;
    c.lineWidth = 2;
    for (i = 0; i < 170; i++) {
      var gx = rnd() * back.width, gy = rnd() * back.height;
      c.beginPath();
      c.moveTo(gx, gy); c.lineTo(gx - 3, gy - 7);
      c.moveTo(gx, gy); c.lineTo(gx + 3, gy - 7);
      c.stroke();
    }
    // Teich
    c.fillStyle = P['water'];
    c.beginPath(); c.ellipse(W / 2 * T, 1.45 * T, 2.7 * T, 0.8 * T, 0, 0, Math.PI * 2); c.fill(); // 22.11.: 1 Kachel pro Seite länger (vorher 1,7)
    c.strokeStyle = P['water-hi'];
    c.lineWidth = 3;
    c.beginPath(); c.ellipse(W / 2 * T, 1.45 * T, 2.7 * T, 0.8 * T, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse((W / 2 - 0.7) * T, 1.3 * T, 1.2 * T, 0.25 * T, 0, 0, Math.PI * 2); c.stroke();
    // Bäume: nicht mehr im Hintergrund, sondern als Ressource im Spiel (CONFIG.BAEUME, gezeichnet in zeichnen.js)
    // Steine
    for (i = 0; i < 9; i++) {
      var sx = (3.5 + rnd() * (W - 7)) * T;
      var sy = (rnd() < 0.5 ? 0.3 + rnd() * 2.4 : 7.4 + rnd() * 2.3) * T;
      c.fillStyle = P.stone;
      c.strokeStyle = P['stone-dark'];
      c.lineWidth = 2;
      c.beginPath(); c.ellipse(sx, sy, 9 + rnd() * 6, 6 + rnd() * 3, rnd(), 0, Math.PI * 2); c.fill(); c.stroke();
    }
  }

