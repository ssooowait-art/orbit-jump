// 궤도 점프 스프라이트 — 전부 코드로 그림 (Codixel core/pixel.js 사용)
// Node: require('./art.js')(P)   브라우저: OJArt(P)
(function (root, factory) {
  if (typeof module !== 'undefined') module.exports = factory;
  else root.OJArt = factory;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (P) {
  // 빛: 왼쪽 위 앞쪽
  const L = (() => { const v = [-0.55, -0.65, 0.52], m = Math.hypot(...v); return v.map(x => x / m); })();
  const ramp = (hue, light = [0.16, 0.78], sat = 0.6, shift = 40) => P.hueRamp(7, { hue, sat, light, shift, satDrop: 0.3 });

  const R = {
    rock: ramp(28, [0.17, 0.74], 0.38),
    ice: ramp(195, [0.22, 0.9], 0.5, 30),
    gasA: ramp(28, [0.2, 0.78], 0.7),
    gasB: ramp(40, [0.3, 0.88], 0.45),
    lava: ramp(5, [0.12, 0.38], 0.4),
    glow: ramp(25, [0.5, 0.82], 0.95, 25),
    sea: ramp(212, [0.18, 0.7], 0.6),
    land: ramp(115, [0.18, 0.66], 0.55),
    ring: ramp(275, [0.2, 0.78], 0.45),
    ringBand: ramp(40, [0.35, 0.85], 0.5),
    dough: ramp(32, [0.2, 0.74], 0.6),
    icing: ramp(335, [0.35, 0.86], 0.7, 30),
    hotteok: ramp(34, [0.18, 0.72], 0.65),
    sugar: ramp(20, [0.12, 0.42], 0.6),
    melon: ramp(110, [0.2, 0.62], 0.55),
    melonDark: ramp(135, [0.1, 0.34], 0.55),
  };
  const SPRINKLES = [P.col([255, 255, 255]), P.col([110, 200, 255]), P.col([255, 220, 90]), P.col([140, 230, 150])];

  function pick(rmp, v, x, y) { return rmp[P.band(v, rmp.length, x, y, 0.3)]; }

  // 구 하나를 그림. surf(nx,ny,nz,lat,lon,lam,x,y) → {v, ramp} | null(투명) | {c}(고정색)
  function sphere(b, cx, cy, r, surf, squash = 1) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d2 = dx * dx + dy * dy;
        if (d2 >= 0.985) continue;   // 꼭대기 한 픽셀 혹 방지
        const nz0 = Math.sqrt(1 - d2) * squash, m = Math.hypot(dx, dy, nz0);
        const nx = dx / m, ny = dy / m, nz = nz0 / m;
        const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        const lat = Math.asin(dy), lon = Math.atan2(dx, Math.sqrt(Math.max(0, 1 - d2)));
        const s = surf(nx, ny, nz, lat, lon, lam, x, y);
        if (!s) continue;
        b.pset(x, y, s.c != null ? s.c : pick(s.ramp, s.v, x, y));
      }
  }
  const shade = (lam, k = 0.85) => 0.08 + lam * k;

  const TYPES = {
    rock(b, c, r, seed) {
      const rnd = P.rng(seed), craters = Array.from({ length: 4 }, () => [rnd() * 1.6 - 0.8, rnd() * 1.4 - 0.7, 0.18 + rnd() * 0.18]);
      sphere(b, c, c, r, (nx, ny, nz, lat, lon, lam) => {
        let off = (P.fbm(lon * 2 + seed, lat * 2, 3, seed) - 0.5) * 0.15;
        for (const [a, bb, cr] of craters) {
          const d = Math.hypot(lon - a, lat - bb) / cr;
          if (d < 1) off += d < 0.72 ? -0.2 : 0.12;   // 움푹한 안쪽 / 밝은 테두리
        }
        return { v: shade(lam) + off, ramp: R.rock };
      });
    },
    ice(b, c, r, seed) {
      sphere(b, c, c, r, (nx, ny, nz, lat, lon, lam) => {
        const cap = Math.abs(lat) > 0.95 + (P.noise(lon * 3, 0, seed) - 0.5) * 0.3 ? 0.22 : 0;
        const crack = Math.abs(P.noise(lon * 3 + 9, lat * 3, seed) - 0.5) < 0.035 ? -0.18 : 0;
        return { v: shade(lam, 0.8) + 0.08 + cap + crack, ramp: R.ice };
      });
    },
    gas(b, c, r, seed) {
      sphere(b, c, c, r, (nx, ny, nz, lat, lon, lam) => {
        const w = Math.sin(lat * 6 + P.fbm(lon * 1.5, lat * 4, 2, seed) * 2.2);
        return { v: shade(lam) + (w > 0.45 ? 0.04 : 0), ramp: w > 0.1 ? R.gasB : R.gasA };
      });
    },
    lava(b, c, r, seed) {
      sphere(b, c, c, r, (nx, ny, nz, lat, lon, lam) => {
        const n = Math.abs(P.fbm(lon * 1.5, lat * 1.5, 2, seed) - 0.5);
        if (n < 0.03) return { v: 0.55 + (0.03 - n) * 10 + lam * 0.2, ramp: R.glow };   // 스스로 빛나는 틈
        return { v: shade(lam, 0.9), ramp: R.lava };
      });
    },
    earth(b, c, r, seed) {
      sphere(b, c, c, r, (nx, ny, nz, lat, lon, lam) => {
        const h = P.fbm(lon * 1.6 + 3, lat * 1.6, 4, seed);
        if (h > 0.53) return { v: shade(lam) + (h - 0.53) * 0.8, ramp: R.land };
        return { v: shade(lam) + 0.05, ramp: R.sea };
      });
    },
    ringed(b, c, r, seed) {
      // 고리: 뒤쪽 반 → 행성 → 앞쪽 반
      const tilt = 0.32, R0 = r * 1.35, R1 = r * 1.75;
      const ringPx = (front) => {
        for (let y = Math.floor(c - R1); y <= c + R1; y++)
          for (let x = Math.floor(c - R1); x <= c + R1; x++) {
            const dx = x + 0.5 - c, dy = (y + 0.5 - c) / tilt, d = Math.hypot(dx, dy);
            if (d < R0 || d > R1) continue;
            if ((dy > 0) !== front) continue;
            const t = (d - R0) / (R1 - R0);
            const band = t > 0.38 && t < 0.52;
            if (band) continue;                                   // 고리 사이 틈
            b.pset(x, y, pick(R.ringBand, 0.35 + 0.4 * (1 - Math.abs(dx) / R1) + (dy < 0 ? -0.1 : 0.1), x, y));
          }
      };
      ringPx(false);
      sphere(b, c, c, r, (nx, ny, nz, lat, lon, lam) => {
        const w = Math.sin(lat * 4 + P.noise(lon * 2, lat * 3, seed) * 1.2);
        return { v: shade(lam) + (w > 0.3 ? 0.1 : 0), ramp: R.ring };
      });
      ringPx(true);
    },
    donut(b, c, r, seed) {
      const rnd = P.rng(seed);
      const Rm = r * 0.62, rt = r * 0.38;            // 도넛 중심 반지름 / 튜브 반지름
      for (let y = Math.floor(c - r - 1); y <= c + r + 1; y++)
        for (let x = Math.floor(c - r - 1); x <= c + r + 1; x++) {
          const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy), q = d - Rm;
          if (Math.abs(q) >= rt * 0.97) continue;
          const hz = Math.sqrt(rt * rt - q * q);
          const nx = (q / rt) * (dx / (d || 1)), ny = (q / rt) * (dy / (d || 1)), nz = hz / rt;
          const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
          const ang = Math.atan2(dy, dx);
          const edge = 0.62 + Math.sin(ang * 7 + seed) * 0.12;   // 물결 모양 아이싱 가장자리
          if (nz > 1 - edge) {
            if (rnd() < 0.09 && nz > 0.55) { b.pset(x, y, SPRINKLES[(rnd() * SPRINKLES.length) | 0]); continue; }
            b.pset(x, y, pick(R.icing, shade(lam, 0.8) + 0.1, x, y));
          } else b.pset(x, y, pick(R.dough, shade(lam), x, y));
        }
    },
    hotteok(b, c, r, seed) {
      sphere(b, c, c, r, (nx, ny, nz, lat, lon, lam, x, y) => {
        const dx = (x + 0.5 - c) / r, dy = (y + 0.5 - c) / r, d = Math.hypot(dx, dy);
        const blot = d + (P.noise(dx * 3 + 5, dy * 3, seed) - 0.5) * 0.5;
        if (blot < 0.42) return { v: 0.3 + lam * 0.5 + (blot < 0.2 && dx < 0 && dy < 0 ? 0.25 : 0), ramp: R.sugar };   // 가운데 흑설탕 (윤기)
        const crisp = (P.fbm(dx * 3, dy * 3, 2, seed + 3) - 0.5) * 0.2;            // 노릇하게 구운 얼룩
        return { v: 0.3 + lam * 0.55 + crisp + (d > 0.86 ? -0.12 : 0), ramp: R.hotteok };
      }, 0.3);   // 납작한 원반
    },
    melon(b, c, r, seed) {
      sphere(b, c, c, r, (nx, ny, nz, lat, lon, lam) => {
        const s = Math.sin(lon * 5.5 + Math.sin(lat * 6 + seed) * 0.45);
        return { v: shade(lam) + 0.04, ramp: s > 0.25 ? R.melonDark : R.melon };
      });
    },
  };
  const KINDS = Object.keys(TYPES);

  function planet(kind, r, seed = 1) {
    const pad = kind === 'ringed' ? Math.ceil(r * 0.8) : 1;
    const S = 2 * (r + pad) + 1, c = r + pad + 0.5;
    const b = new P.Buf(S, S);
    TYPES[kind](b, c, r, seed);
    const o = b;
    o.cx = c; o.cy = c;
    return o;
  }

  // 우주선: 위(-y)를 보는 모양을 각도만큼 돌려서 픽셀마다 다시 샘플링
  const SHIP = {
    white: [P.col([248, 246, 255]), P.col([196, 200, 228]), P.col([128, 132, 176])],
    red: [P.col([255, 112, 112]), P.col([214, 64, 92])],
    glass: [P.col([130, 220, 255]), P.col([60, 120, 210])],
    flame: [P.col([255, 250, 200]), P.col([255, 200, 80]), P.col([255, 120, 60])],
  };
  function ship(angle, flame = 0) {
    const S = 15, c = S / 2, b = new P.Buf(S, S);
    const ca = Math.cos(angle), sa = Math.sin(angle);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const px = x + 0.5 - c, py = y + 0.5 - c;
        // 화면 → 우주선 좌표 (우주선 앞 = -y)
        const u = px * ca + py * sa, v = -px * sa + py * ca;
        const lit = (-px * 0.7 - py * 0.7) > 0 ? 0 : 1;   // 화면 기준 왼쪽 위가 밝음
        let col = 0;
        const body = (u / 2.3) ** 2 + ((v - 0.3) / 4.4) ** 2 <= 1;
        const finL = v > 1.6 && v < 4.6 && u < -1.2 && u > -3.6 && (u + 3.6) > (v - 1.6) * 0.9;
        const finR = v > 1.6 && v < 4.6 && u > 1.2 && u < 3.6 && (3.6 - u) > (v - 1.6) * 0.9;
        if (finL || finR) col = SHIP.red[1];
        if (body) {
          col = v < -2.2 ? SHIP.red[lit] : SHIP.white[lit];
          if (Math.hypot(u, v + 0.2) < 1.25) col = Math.hypot(u + 0.4, v + 0.6) < 0.6 ? SHIP.glass[0] : SHIP.glass[1];
        }
        if (!col && flame && Math.abs(u) < 1.3 - (v - 4.5) * 0.25 && v > 4.3 && v < 4.3 + flame) {
          col = SHIP.flame[Math.min(2, Math.floor((v - 4.3) / flame * 3))];
        }
        if (col) b.pset(x, y, col);
      }
    return b;
  }

  return { planet, ship, KINDS, R };
});
