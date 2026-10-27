import { Application } from '@splinetool/runtime';

export const SCENE_URL = 'https://prod.spline.design/qCjxsTjIWAapU136/scene.splinecode';

// Exploded-view offsets in the watch's local space (dial faces +Z).
const EXPLODE = {
  'Part Crystal': [0, 0, 830],
  'Part Bezel': [0, 0, 660],
  'Seconds Hand': [0, 0, 540],
  'Minute Hand': [0, 0, 465],
  'Hour Hand': [0, 0, 390],
  'Part Markers': [0, 0, 290],
  'Part Dial': [0, 0, 175],
  'Part Case': [0, 0, 0],
  'Part Movement': [0, 0, -230],
  'Part Caseback': [0, 0, -420],
  'Part Crown': [320, 0, 0],
  'Part Pushers': [230, 0, 120],
  'Part Bracelet Top': [0, 250, -140],
  'Part Bracelet Bottom': [0, -250, -140],
  'Part Clasp': [0, 0, -360],
};

// Where each part starts before it flies in during the assembly intro.
const INTRO_FROM = {
  'Part Case': [0, -120, -1100],
};
const INTRO_SPREAD = 2.6;

// Hands are authored at 12 in the Spline file. The central hand is the chronograph,
// which rests at 12; running seconds sweep in the sub-dial at 9.
const TIME_HANDS = ['Hour Hand', 'Minute Hand', 'Small Seconds Hand'];

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const damp = (cur, tgt, k, dt) => cur + (tgt - cur) * (1 - Math.exp(-k * dt));
const DEG = Math.PI / 180;

export class Watch {
  constructor(canvas) {
    this.app = new Application(canvas);
    this.view = { explode: 0, rotY: 0.8, rotX: 0.08, x: 0, y: 0, zoom: 1, stageZoom: 1 };
    this.target = { ...this.view };
    this.spin = 0;
    this.spinOn = false;
    this.spinHome = false;
    this.intro = null;
    this.lastZoom = 1;
  }

  async load() {
    // Retry briefly: a dropped request should not leave visitors on the loader.
    for (let attempt = 1; ; attempt++) {
      try {
        await this.app.load(SCENE_URL);
        break;
      } catch (err) {
        if (attempt >= 3) throw err;
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
    this.root = this.app.findObjectByName('ASAD Watch');
    this.rootBase = {
      x: this.root.position.x,
      y: this.root.position.y,
      rx: this.root.rotation.x,
      ry: this.root.rotation.y,
    };

    this.parts = Object.entries(EXPLODE)
      .map(([name, ex]) => {
        const obj = this.app.findObjectByName(name);
        if (!obj) return null;
        return {
          name,
          obj,
          ex,
          from: INTRO_FROM[name] || ex.map((v) => v * INTRO_SPREAD),
          base: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
          scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
          reveal: 1,
          pop: 0,
          popTarget: 0,
          shown: true,
        };
      })
      .filter(Boolean);
    this.byName = Object.fromEntries(this.parts.map((p) => [p.name, p]));

    this.hands = TIME_HANDS.map((name) => {
      const obj = this.app.findObjectByName(name);
      return obj ? { name, obj, r0: obj.rotation.z } : null;
    }).filter(Boolean);

    this.camera = this.app.findObjectByName('Hero Camera');
    if (this.camera) {
      this.cameraBase = {
        p: { ...this.camera.position },
        r: { x: this.camera.rotation.x, y: this.camera.rotation.y, z: this.camera.rotation.z },
      };
    }
  }

  // Assembly intro: parts fly in step by step along their explode axis.
  startIntro(steps, { onStep, onDone }) {
    const stepDur = 0.62;
    const flight = 1.3;
    this.intro = { t: 0, steps, stepDur, flight, fired: -1, onStep, onDone };
    for (const p of this.parts) p.reveal = 0;
  }

  skipIntro() {
    if (!this.intro) return;
    const { steps, onStep, onDone } = this.intro;
    for (let i = this.intro.fired + 1; i < steps.length; i++) onStep?.(i);
    for (const p of this.parts) p.reveal = 1;
    this.intro = null;
    onDone?.();
  }

  get introRunning() {
    return !!this.intro;
  }

  setTarget(partial) {
    Object.assign(this.target, partial);
  }

  setActiveParts(names) {
    const set = new Set(names);
    for (const p of this.parts) p.popTarget = set.has(p.name) ? 1 : 0;
  }

  zoomBy(factor) {
    this.target.zoom = Math.min(2.4, Math.max(0.55, this.target.zoom * factor));
  }

  setSpin(on) {
    this.spinOn = on;
    if (on) this.spinHome = false;
  }

  reset() {
    this.target.zoom = 1;
    this.spinOn = false;
    this.spin = Math.atan2(Math.sin(this.spin), Math.cos(this.spin));
    this.spinHome = true;
    this.resetCamera();
  }

  // Undo any orbiting the visitor did with the mouse.
  resetCamera() {
    if (this.camera && this.cameraBase) {
      Object.assign(this.camera.position, this.cameraBase.p);
      this.camera.rotation.x = this.cameraBase.r.x;
      this.camera.rotation.y = this.cameraBase.r.y;
      this.camera.rotation.z = this.cameraBase.r.z;
    }
  }

  update(dt) {
    if (!this.root) return;
    this.stepIntro(dt);

    const v = this.view;
    const t = this.target;
    v.explode = damp(v.explode, t.explode, 2.4, dt);
    v.rotY = damp(v.rotY, t.rotY, 2.2, dt);
    v.rotX = damp(v.rotX, t.rotX, 2.2, dt);
    v.x = damp(v.x, t.x, 2.6, dt);
    v.y = damp(v.y, t.y, 2.6, dt);
    v.zoom = damp(v.zoom, t.zoom, 5, dt);
    v.stageZoom = damp(v.stageZoom, t.stageZoom, 2.4, dt);

    if (this.spinOn) this.spin += dt * 0.45;
    else if (this.spinHome) this.spin = damp(this.spin, 0, 3, dt);

    this.root.position.x = this.rootBase.x + v.x;
    this.root.position.y = this.rootBase.y + v.y;
    this.root.rotation.y = this.rootBase.ry + v.rotY + this.spin;
    this.root.rotation.x = this.rootBase.rx + v.rotX;

    for (const p of this.parts) {
      p.pop = damp(p.pop, p.popTarget, 6, dt);
      const e = v.explode * (1 + 0.38 * p.pop);
      const r = 1 - p.reveal;
      p.obj.position.x = p.base.x + p.ex[0] * e + p.from[0] * r;
      p.obj.position.y = p.base.y + p.ex[1] * e + p.from[1] * r;
      p.obj.position.z = p.base.z + p.ex[2] * e + p.from[2] * r;
      const s = 0.86 + 0.14 * p.reveal;
      p.obj.scale.x = p.scale.x * s;
      p.obj.scale.y = p.scale.y * s;
      p.obj.scale.z = p.scale.z * s;
      const show = p.reveal > 0.002;
      if (show !== p.shown) {
        p.obj.visible = show;
        p.shown = show;
      }
    }

    // Visitor zoom (dock, pinch) multiplies the per-section framing zoom.
    const zoom = v.zoom * v.stageZoom;
    if (Math.abs(zoom - this.lastZoom) > 0.0005) {
      this.app.setZoom(zoom);
      this.lastZoom = zoom;
    }

    this.updateHands();
  }

  stepIntro(dt) {
    const it = this.intro;
    if (!it) return;
    it.t += dt;
    const lead = 0.35;
    it.steps.forEach((step, i) => {
      const start = lead + i * it.stepDur;
      if (it.t >= start && i > it.fired) {
        it.fired = i;
        it.onStep?.(i);
      }
      const k = easeOutExpo(clamp01((it.t - start) / it.flight));
      for (const name of step.parts) {
        const p = this.byName[name];
        if (p) p.reveal = k;
      }
    });
    if (it.t > lead + (it.steps.length - 1) * it.stepDur + it.flight) {
      this.intro = null;
      it.onDone?.();
    }
  }

  // Hands show the visitor's local time; the seconds hand sweeps.
  updateHands() {
    const now = new Date();
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    const target = { 'Hour Hand': h * 30, 'Minute Hand': m * 6, 'Small Seconds Hand': s * 6 };
    for (const hand of this.hands) {
      hand.obj.rotation.z = hand.r0 - target[hand.name] * DEG;
    }
  }
}
