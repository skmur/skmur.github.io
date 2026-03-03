/**
 * Scroll Realm — Luminous Drift
 *
 * A weightless cosmic particle constellation with sacred wireframe geometry.
 * Uses p5.js (P2D) with simulated 3D rotation/projection and additive
 * blending for natural glow.  Only runs when the scroll realm is active.
 */
(function () {
  'use strict';

  /* ── shared state ── */
  var mouseNX = 0, mouseNY = 0;
  var p5inst = null;
  var looping = false;

  /* ── colour palette (matches site) ── */
  var PAL = [
    [200, 180, 255],   // light purple
    [65,  186, 238],   // site link blue
    [255, 100, 200],   // soft pink
    [255, 255, 255],   // white
    [150, 130, 255],   // medium purple
    [130, 210, 255],   // sky blue
    [220, 160, 255],   // lavender
  ];

  /* ── 3-D math ── */
  function rY(v, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: v.x * c - v.z * s, y: v.y, z: v.x * s + v.z * c };
  }
  function rX(v, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
  }
  function proj(v) {
    var f = 500 / (600 + v.z);
    return { x: v.x * f, y: v.y * f, s: f };
  }

  /* ── sacred geometry factories ── */
  function octahedron(s) {
    return {
      v: [
        {x:0,y:-s,z:0},{x:s,y:0,z:0},{x:0,y:0,z:s},
        {x:-s,y:0,z:0},{x:0,y:0,z:-s},{x:0,y:s,z:0}
      ],
      e: [[0,1],[0,2],[0,3],[0,4],[5,1],[5,2],[5,3],[5,4],[1,2],[2,3],[3,4],[4,1]]
    };
  }
  function cube(s) {
    var h = s * 0.6;
    return {
      v: [
        {x:-h,y:-h,z:-h},{x:h,y:-h,z:-h},{x:h,y:h,z:-h},{x:-h,y:h,z:-h},
        {x:-h,y:-h,z:h},{x:h,y:-h,z:h},{x:h,y:h,z:h},{x:-h,y:h,z:h}
      ],
      e: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]
    };
  }
  function tetra(s) {
    var a = s * 0.7;
    return {
      v: [{x:a,y:a,z:a},{x:a,y:-a,z:-a},{x:-a,y:a,z:-a},{x:-a,y:-a,z:a}],
      e: [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]]
    };
  }
  function ring(s) {
    var n = 20, v = [], e = [];
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2;
      v.push({ x: s * Math.cos(ang), y: 0, z: s * Math.sin(ang) });
      e.push([i, (i + 1) % n]);
    }
    return { v: v, e: e };
  }
  function icosa(s) {
    var phi = (1 + Math.sqrt(5)) / 2, a = s * 0.45;
    return {
      v: [
        {x:-a,y:a*phi,z:0},{x:a,y:a*phi,z:0},
        {x:-a,y:-a*phi,z:0},{x:a,y:-a*phi,z:0},
        {x:0,y:-a,z:a*phi},{x:0,y:a,z:a*phi},
        {x:0,y:-a,z:-a*phi},{x:0,y:a,z:-a*phi},
        {x:a*phi,y:0,z:-a},{x:a*phi,y:0,z:a},
        {x:-a*phi,y:0,z:-a},{x:-a*phi,y:0,z:a}
      ],
      e: [
        [0,1],[0,5],[0,7],[0,10],[0,11],[1,5],[1,7],[1,8],[1,9],
        [2,3],[2,4],[2,6],[2,10],[2,11],[3,4],[3,6],[3,8],[3,9],
        [4,5],[4,9],[4,11],[5,9],[5,11],[6,7],[6,8],[6,10],[7,8],[7,10],[8,9],[10,11]
      ]
    };
  }

  /* ═══════════════════════════════════════════
     p5 sketch (instance mode, P2D canvas)
     ═══════════════════════════════════════════ */
  var sketch = function (p) {
    var particles = [];
    var forms     = [];
    var nebulae   = [];
    var t = 0;

    var BOUND  = 500;
    var BOUNDY = 350;

    /* ── particle helpers ── */
    function mkParticle(orb) {
      var col = PAL[Math.floor(p.random(PAL.length))];
      return {
        x: p.random(-BOUND, BOUND),
        y: p.random(-BOUNDY, BOUNDY),
        z: p.random(-BOUND, BOUND),
        nx: p.random(1000), ny: p.random(2000), nz: p.random(3000),
        spd: orb ? p.random(0.0008, 0.002) : p.random(0.002, 0.005),
        sz: orb ? p.random(8, 18) : p.random(1.5, 4),
        r: col[0], g: col[1], b: col[2],
        a: orb ? p.random(50, 100) : p.random(100, 200),
        ps: p.random(0.01, 0.03),
        po: p.random(p.TWO_PI),
        orb: orb
      };
    }

    function updParticle(pt) {
      pt.x += (p.noise(pt.nx) - 0.5) * 2;
      pt.y += (p.noise(pt.ny) - 0.5) * 2;
      pt.z += (p.noise(pt.nz) - 0.5) * 1.5;
      pt.nx += pt.spd; pt.ny += pt.spd; pt.nz += pt.spd;
      if (pt.x >  BOUND)  pt.x -= BOUND * 2;
      if (pt.x < -BOUND)  pt.x += BOUND * 2;
      if (pt.y >  BOUNDY) pt.y -= BOUNDY * 2;
      if (pt.y < -BOUNDY) pt.y += BOUNDY * 2;
      if (pt.z >  BOUND)  pt.z -= BOUND * 2;
      if (pt.z < -BOUND)  pt.z += BOUND * 2;
    }

    function drawParticle(pt, sry, srx, prog) {
      var pos = rY({ x: pt.x, y: pt.y, z: pt.z }, sry);
      pos = rX(pos, srx);
      var pr = proj(pos);
      var depth = p.constrain(p.map(pos.z, -BOUND, BOUND, 1.3, 0.2), 0.1, 1.5);
      var pulse = 0.65 + 0.35 * Math.sin(t * 60 * pt.ps + pt.po);
      var alpha = pt.a * depth * pulse * prog;
      var sz    = pt.sz * pr.s;
      if (sz < 0.3 || alpha < 3) return;

      p.noStroke();
      if (pt.orb) {
        // multi-layered glow
        p.fill(pt.r, pt.g, pt.b, alpha * 0.05);
        p.circle(pr.x, pr.y, sz * 8);
        p.fill(pt.r, pt.g, pt.b, alpha * 0.1);
        p.circle(pr.x, pr.y, sz * 4.5);
        p.fill(pt.r, pt.g, pt.b, alpha * 0.25);
        p.circle(pr.x, pr.y, sz * 2.2);
        p.fill(pt.r, pt.g, pt.b, alpha * 0.7);
        p.circle(pr.x, pr.y, sz * 0.6);
      } else {
        p.fill(pt.r, pt.g, pt.b, alpha * 0.1);
        p.circle(pr.x, pr.y, sz * 3.5);
        p.fill(pt.r, pt.g, pt.b, alpha);
        p.circle(pr.x, pr.y, sz);
      }
    }

    /* ── wireframe form helpers ── */
    function mkForm(geomFn) {
      var sz  = p.random(30, 65);
      var col = PAL[Math.floor(p.random(PAL.length))];
      return {
        geom: geomFn(sz),
        x: p.random(-300, 300),
        y: p.random(-200, 200),
        z: p.random(-350, 350),
        lrx: p.random(p.TWO_PI),
        lry: p.random(p.TWO_PI),
        lsx: p.random(-0.006, 0.006),
        lsy: p.random(-0.006, 0.006),
        nx: p.random(5000), ny: p.random(6000), nz: p.random(7000),
        ds: p.random(0.001, 0.003),
        r: col[0], g: col[1], b: col[2],
        a: p.random(25, 55)
      };
    }

    function updForm(f) {
      f.x += (p.noise(f.nx) - 0.5) * 0.8;
      f.y += (p.noise(f.ny) - 0.5) * 0.8;
      f.z += (p.noise(f.nz) - 0.5) * 0.6;
      f.nx += f.ds; f.ny += f.ds; f.nz += f.ds;
      f.lrx += f.lsx; f.lry += f.lsy;
      if (Math.abs(f.x) > 420) f.x *= 0.97;
      if (Math.abs(f.y) > 320) f.y *= 0.97;
      if (Math.abs(f.z) > 450) f.z *= 0.97;
    }

    function drawForm(f, sry, srx, prog) {
      var alpha = f.a * prog;
      if (alpha < 2) return;

      var pts = [];
      for (var i = 0; i < f.geom.v.length; i++) {
        var v = f.geom.v[i];
        var pt = rY(v, f.lry);
        pt = rX(pt, f.lrx);
        pt = { x: pt.x + f.x, y: pt.y + f.y, z: pt.z + f.z };
        pt = rY(pt, sry);
        pt = rX(pt, srx);
        pts.push(proj(pt));
      }

      // edges
      p.stroke(f.r, f.g, f.b, alpha);
      p.strokeWeight(0.7);
      for (var j = 0; j < f.geom.e.length; j++) {
        var a = f.geom.e[j][0], b = f.geom.e[j][1];
        if (pts[a].s > 0.05 && pts[b].s > 0.05) {
          p.line(pts[a].x, pts[a].y, pts[b].x, pts[b].y);
        }
      }

      // vertex glows
      p.noStroke();
      for (var k = 0; k < pts.length; k++) {
        if (pts[k].s > 0.05) {
          var gs = 2.5 * pts[k].s;
          p.fill(f.r, f.g, f.b, alpha * 0.2);
          p.circle(pts[k].x, pts[k].y, gs * 4);
          p.fill(f.r, f.g, f.b, alpha * 0.5);
          p.circle(pts[k].x, pts[k].y, gs);
        }
      }
    }

    /* ── nebula patches (subtle colour fog) ── */
    function mkNebula() {
      var col = PAL[Math.floor(p.random(PAL.length))];
      return {
        x: p.random(-250, 250),
        y: p.random(-180, 180),
        z: p.random(-200, 200),
        sz: p.random(250, 450),
        r: col[0], g: col[1], b: col[2],
        a: p.random(2, 5),
        nx: p.random(8000), ny: p.random(9000), nz: p.random(10000),
        spd: p.random(0.0004, 0.001)
      };
    }

    function updNebula(n) {
      n.x += (p.noise(n.nx) - 0.5) * 0.4;
      n.y += (p.noise(n.ny) - 0.5) * 0.4;
      n.z += (p.noise(n.nz) - 0.5) * 0.3;
      n.nx += n.spd; n.ny += n.spd; n.nz += n.spd;
    }

    function drawNebula(n, sry, srx, prog) {
      var pos = rY({ x: n.x, y: n.y, z: n.z }, sry);
      pos = rX(pos, srx);
      var pr = proj(pos);
      var alpha = n.a * prog;
      if (alpha < 0.5) return;
      var sz = n.sz * pr.s;
      p.noStroke();
      p.fill(n.r, n.g, n.b, alpha);
      p.circle(pr.x, pr.y, sz);
    }

    /* ═══ setup ═══ */
    p.setup = function () {
      var cnv = p.createCanvas(p.windowWidth, p.windowHeight);
      cnv.parent('scroll-realm-canvas');

      // particles
      for (var i = 0; i < 90; i++) particles.push(mkParticle(false));
      for (var j = 0; j < 8; j++)  particles.push(mkParticle(true));

      // sacred geometry forms
      var gfns = [octahedron, cube, tetra, ring, icosa, ring];
      for (var k = 0; k < gfns.length; k++) forms.push(mkForm(gfns[k]));

      // nebulae
      for (var n = 0; n < 4; n++) nebulae.push(mkNebula());

      p.frameRate(window.portalMode ? 60 : 30);
      if (!window.portalMode) p.noLoop();
    };

    /* ═══ draw ═══ */
    p.draw = function () {
      var raw = window.realmProgress || 0;
      // smooth ramp — barely visible at threshold, full at 1
      var prog = raw * raw;
      if (prog <= 0) return;

      p.blendMode(p.BLEND);
      p.clear();
      p.translate(p.width / 2, p.height / 2);
      p.blendMode(p.ADD);

      t += 0.005;

      // gentle scene rotation + mouse influence
      var sry = t * 0.12 + mouseNX * 0.25;
      var srx = Math.sin(t * 0.3) * 0.08 + mouseNY * 0.12;

      // draw layers: nebulae → forms → particles
      var i;
      for (i = 0; i < nebulae.length; i++) {
        updNebula(nebulae[i]);
        drawNebula(nebulae[i], sry, srx, prog);
      }
      for (i = 0; i < forms.length; i++) {
        updForm(forms[i]);
        drawForm(forms[i], sry, srx, prog);
      }
      for (i = 0; i < particles.length; i++) {
        updParticle(particles[i]);
        drawParticle(particles[i], sry, srx, prog);
      }
    };

    p.windowResized = function () {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
  };

  /* ═══ bootstrap ═══ */
  function init() {
    p5inst = new p5(sketch);

    if (!window.portalMode) {
      // Main page: toggle loop based on scroll-realm-active class
      new MutationObserver(function () {
        var a = document.body.classList.contains('scroll-realm-active');
        if (a && !looping) {
          looping = true;
          p5inst.loop();
        } else if (!a && looping) {
          looping = false;
          p5inst.noLoop();
          var c = document.querySelector('#scroll-realm-canvas canvas');
          if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
        }
      }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    // Portal page: sketch loops from setup, realmProgress already set to 1
  }

  // mouse tracking (global, since canvas has pointer-events:none)
  document.addEventListener('mousemove', function (e) {
    mouseNX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseNY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
