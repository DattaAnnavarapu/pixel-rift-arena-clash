import Phaser from "phaser";
import { arenas, type Effect } from "../server/game";
import { state, me, offset, input, touch } from "./runtime";
import { sound } from "./audio";
const teamColors = [0xff647f, 0x60d5ff];
export default class Arena extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics;
  bg!: Phaser.GameObjects.Graphics;
  keys: any;
  map = "";
  lastEvent = 0;
  roundEnd = 0;
  labels = new Map<string, Phaser.GameObjects.Text>();
  positions = new Map<string, { x: number; y: number }>();
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  create() {
    this.bg = this.add.graphics();
    this.g = this.add.graphics();
    this.keys = this.input.keyboard?.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,Q",
    );
    this.input.keyboard?.addCapture(["SPACE", "UP", "DOWN", "LEFT", "RIGHT"]);
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch && state) {
        const p = state.players.find((p) => p.id === me);
        if (p) input.angle = Math.atan2(pointer.y - p.y, pointer.x - p.x);
      }
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) input.fire = true;
    });
    this.input.on("pointerup", () => (input.fire = false));
    this.events.once("shutdown", () => {
      this.labels.clear();
      input.fire = false;
    });
  }
  drawMap() {
    if (!state) return;
    const a = arenas[state.arena ?? "astral"],
      g = this.bg;
    g.clear();
    g.fillStyle(a.floor);
    g.fillRect(0, 0, 960, 600);
    // Deterministic tile details remain still while animated effects draw separately.
    for (let row = 0; row < 19; row++)
      for (let col = 0; col < 30; col++) {
        const x = col * 32,
          y = row * 32,
          n = (col * 73 + row * 37) % 13;
        g.fillStyle(a.tile, n % 3 === 0 ? 0.75 : 0.35);
        g.fillRect(x + 1, y + 1, 30, 30);
        if (n === 0) {
          g.lineStyle(1, 0x9eb9bd, 0.13);
          g.lineBetween(x + 5, y + 9, x + 16, y + 12);
          g.lineBetween(x + 16, y + 12, x + 21, y + 5);
        }
      }
    for (let i = 0; i < 2; i++) {
      const x = i ? 820 : 0,
        c = teamColors[i];
      g.fillStyle(c, 0.07);
      g.fillRect(x, 170, 140, 260);
      g.lineStyle(2, c, 0.4);
      g.strokeRect(x + 8, 178, 124, 244);
      g.lineStyle(1, c, 0.15);
      for (let y = 205; y < 420; y += 35) g.lineBetween(x + 17, y, x + 122, y);
      g.fillStyle(c, 0.25);
      g.fillTriangle(x + 60, 280, x + 80, 300, x + 60, 320);
    }
    g.lineStyle(2, a.accent, 0.14);
    g.strokeCircle(480, 300, 105);
    g.strokeCircle(480, 300, 113);
    for (let i = 0; i < 8; i++) {
      const t = (i * Math.PI) / 4;
      g.fillStyle(a.accent, 0.4);
      g.fillRect(
        480 + Math.cos(t) * 110 - 3,
        300 + Math.sin(t) * 110 - 3,
        6,
        6,
      );
    }
    for (const w of a.walls) {
      g.fillStyle(0x000000, 0.3);
      g.fillRect(w.x + 6, w.y + 10, w.w, w.h);
      g.fillStyle(0x111727);
      g.fillRect(w.x, w.y, w.w, w.h + 7);
      g.fillStyle(a.stone);
      g.fillRect(w.x, w.y, w.w, w.h);
      g.fillStyle(0xffffff, 0.12);
      g.fillRect(w.x, w.y, w.w, 5);
      g.lineStyle(1, 0x131a27, 0.45);
      for (let y = w.y + 20; y < w.y + w.h; y += 20) {
        g.lineBetween(w.x, y, w.x + w.w, y);
        for (let x = w.x + ((y / 20) % 2) * 18; x < w.x + w.w; x += 36)
          g.lineBetween(x, y - 19, x, y);
      }
      g.fillStyle(a.accent, 0.6);
      g.fillRect(w.x + 8, w.y + 8, 5, 5);
      g.fillRect(w.x + w.w - 13, w.y + 8, 5, 5);
      if (state.arena === "grove") {
        g.fillStyle(0x8bb571, 0.6);
        g.fillRect(w.x + 2, w.y + 5, w.w / 2, 5);
        g.fillRect(w.x + 5, w.y + 5, 5, 17);
      }
    }
    g.lineStyle(4, a.accent, 0.22);
    g.strokeRect(2, 2, 956, 596);
  }
  flash(e: Effect) {
    const c = e.kind === "mend" ? 0x8dffc4 : teamColors[e.team];
    if (e.kind === "shot") {
      if (
        Math.hypot(
          e.x - (state?.players.find((p) => p.id === me)?.x ?? 0),
          e.y - (state?.players.find((p) => p.id === me)?.y ?? 0),
        ) < 400
      )
        sound("shot");
      return;
    }
    sound(e.kind);
    const ring = this.add
      .circle(e.x, e.y, 8, undefined)
      .setStrokeStyle(e.kind === "ko" ? 5 : 2, c, 0.9);
    this.tweens.add({
      targets: ring,
      radius: e.kind === "ko" ? 65 : 40,
      alpha: 0,
      duration: 450,
      onComplete: () => ring.destroy(),
    });
    for (let i = 0; i < (e.kind === "ko" ? 20 : 8); i++) {
      const angle = (i * Math.PI * 2) / (e.kind === "ko" ? 20 : 8),
        p = this.add.rectangle(e.x, e.y, 4, 4, c);
      this.tweens.add({
        targets: p,
        x: e.x + Math.cos(angle) * (e.kind === "ko" ? 60 : 30),
        y: e.y + Math.sin(angle) * (e.kind === "ko" ? 60 : 30),
        alpha: 0,
        angle: 90,
        duration: 500,
        onComplete: () => p.destroy(),
      });
    }
    if (e.value || e.kind === "crystal" || e.kind === "ko") {
      const text =
        e.kind === "hit"
          ? `−${e.value}`
          : e.kind === "mend"
            ? `+${e.value}`
            : e.kind === "ko"
              ? "K.O."
              : "+1";
      const t = this.add
        .text(e.x, e.y - 30, text, {
          fontFamily: "monospace",
          fontSize: "18px",
          fontStyle: "bold",
          color: e.kind === "mend" ? "#8dffc4" : "#fff1dd",
          stroke: "#111725",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      this.tweens.add({
        targets: t,
        y: e.y - 75,
        alpha: 0,
        duration: 750,
        onComplete: () => t.destroy(),
      });
    }
    if (
      e.kind === "hit" &&
      !this.reduced &&
      state?.players.some(
        (p) => p.id === me && Math.hypot(p.x - e.x, p.y - e.y) < 10,
      )
    )
      this.cameras.main.shake(90, 0.003);
  }
  update(_time: number, delta: number) {
    if (!state) return;
    const k = this.keys;
    if (k) {
      if (!touch.move) {
        input.x =
          Number(k.D.isDown || k.RIGHT.isDown) -
          Number(k.A.isDown || k.LEFT.isDown);
        input.y =
          Number(k.S.isDown || k.DOWN.isDown) -
          Number(k.W.isDown || k.UP.isDown);
      }
      input.dash = k.SPACE.isDown || touch.dash;
      input.shield = k.E.isDown || touch.shield;
      input.special = k.Q.isDown || touch.special;
    }
    const signature = `${state.arena}:${state.mode}`;
    if (this.map !== signature) {
      this.map = signature;
      this.drawMap();
    }
    if (this.roundEnd !== state.end) {
      this.roundEnd = state.end;
      this.positions.clear();
      this.lastEvent = state.eventId ?? 0;
    }
    const now = Date.now() + offset,
      g = this.g,
      a = arenas[state.arena ?? "astral"];
    g.clear();
    for (let i = 0; i < 24; i++) {
      const x = ((i * 137) % 940) + 10,
        y = 20 + ((i * 89 + now * 0.012) % 560);
      g.fillStyle(a.accent, 0.15 + 0.15 * Math.sin(now / 500 + i));
      g.fillRect(x, y, i % 3 === 0 ? 3 : 2, 2);
    }
    if (state.mode === "control") {
      const c =
        state.controlTeam === 0
          ? teamColors[0]
          : state.controlTeam === 1
            ? teamColors[1]
            : a.accent;
      g.fillStyle(c, 0.12);
      g.fillCircle(480, 300, 88);
      g.lineStyle(3, c, 0.6);
      g.strokeCircle(480, 300, 88);
      g.lineStyle(1, c, 0.3);
      g.strokeCircle(480, 300, 70 + Math.sin(now / 300) * 4);
    } else {
      g.lineStyle(1, a.accent, 0.25);
      g.strokeCircle(480, 300, 32 + Math.sin(now / 400) * 5);
    }
    for (const c of state.crystals) {
      const bob = this.reduced ? 0 : Math.sin(now / 300 + c.x) * 4;
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(c.x, c.y + 14, 22, 7);
      g.fillStyle(a.accent, 0.09);
      g.fillCircle(c.x, c.y, 25 + Math.sin(now / 250) * 3);
      g.fillStyle(a.accent);
      g.fillTriangle(
        c.x,
        c.y - 14 + bob,
        c.x - 9,
        c.y + bob,
        c.x + 9,
        c.y + bob,
      );
      g.fillStyle(0xf2eaff);
      g.fillTriangle(
        c.x,
        c.y - 14 + bob,
        c.x - 9,
        c.y + bob,
        c.x,
        c.y + 2 + bob,
      );
      g.fillStyle(a.accent, 0.8);
      g.fillTriangle(
        c.x,
        c.y + 13 + bob,
        c.x - 9,
        c.y + bob,
        c.x + 9,
        c.y + bob,
      );
    }
    for (const b of state.bolts) {
      const angle = Math.atan2(b.vy, b.vx),
        c = teamColors[b.team];
      g.lineStyle(7, c, 0.15);
      g.lineBetween(
        b.x,
        b.y,
        b.x - Math.cos(angle) * 24,
        b.y - Math.sin(angle) * 24,
      );
      g.lineStyle(3, c, 0.8);
      g.lineBetween(
        b.x,
        b.y,
        b.x - Math.cos(angle) * 16,
        b.y - Math.sin(angle) * 16,
      );
      g.fillStyle(0xf6f4ff);
      g.fillRect(b.x - 3, b.y - 3, 6, 6);
    }
    for (const [id, label] of this.labels) {
      if (!state.players.some((p) => p.id === id && p.online && !p.respawn)) {
        label.destroy();
        this.labels.delete(id);
        this.positions.delete(id);
      }
    }
    for (const p of state.players) {
      if (p.respawn || !p.online) continue;
      let pos = this.positions.get(p.id);
      if (!pos || Math.hypot(pos.x - p.x, pos.y - p.y) > 150)
        pos = { x: p.x, y: p.y };
      const smoothing = 1 - Math.exp(-delta / 45);
      pos.x += (p.x - pos.x) * smoothing;
      pos.y += (p.y - pos.y) * smoothing;
      this.positions.set(p.id, pos);
      const x = Math.round(pos.x),
        y = Math.round(pos.y),
        c = teamColors[p.team],
        moving = Math.hypot(p.input.x, p.input.y) > 0.1,
        step = moving && !this.reduced ? Math.round(Math.sin(now / 70) * 3) : 0;
      if (now < p.burst) {
        for (let j = 1; j < 4; j++) {
          g.fillStyle(c, 0.17 / j);
          g.fillRect(
            x - p.input.x * j * 12 - 12,
            y - p.input.y * j * 12 - 8,
            24,
            28,
          );
        }
      }
      g.fillStyle(0x000000, 0.35);
      g.fillEllipse(x, y + 20, 38, 12);
      // Layered pixel knight: cape, boots, armor, helmet and directional blaster.
      g.fillStyle(p.team ? 0x164478 : 0x7d263f);
      g.fillTriangle(x - 13, y - 4, x - 19 - step, y + 19, x + 13, y + 17);
      g.fillStyle(0x101728);
      g.fillRect(x - 11, y + 12 + step, 9, 11);
      g.fillRect(x + 3, y + 12 - step, 9, 11);
      g.fillStyle(c);
      g.fillRect(x - 12, y - 5, 25, 22);
      g.fillStyle(0xffffff, 0.2);
      g.fillRect(x - 12, y - 5, 5, 20);
      g.fillStyle(0x1b2439);
      g.fillRect(x - 12, y + 12, 25, 4);
      g.fillStyle(0xebd9b6);
      g.fillRect(x - 2, y + 12, 6, 4);
      g.fillStyle(c);
      g.fillRect(x - 16, y - 4, 7, 10);
      g.fillRect(x + 10, y - 4, 7, 10);
      g.fillStyle(0x202e46);
      g.fillRect(x - 12, y - 23, 24, 21);
      g.fillStyle(c);
      g.fillRect(x - 11, y - 22, 22, 7);
      g.fillRect(x - 13, y - 18, 5, 13);
      g.fillRect(x + 8, y - 18, 5, 13);
      g.fillStyle(0xf5d8b2);
      g.fillRect(x - 7, y - 14, 14, 10);
      g.fillStyle(0x111c30);
      g.fillRect(x - 7, y - 12, 14, 5);
      g.fillStyle(0xd4ffff);
      g.fillRect(x - 5, y - 11, 3, 2);
      g.fillRect(x + 3, y - 11, 3, 2);
      g.fillStyle(0xf6e1ac);
      g.fillRect(x - 2, y - 28, 5, 10);
      const gx = x + Math.cos(p.input.angle) * 20,
        gy = y + Math.sin(p.input.angle) * 20;
      g.lineStyle(7, 0x16233a);
      g.lineBetween(x, y, gx, gy);
      g.lineStyle(4, 0xc5d5e8);
      g.lineBetween(
        x + Math.cos(p.input.angle) * 12,
        y + Math.sin(p.input.angle) * 12,
        gx,
        gy,
      );
      g.fillStyle(c);
      g.fillRect(gx - 3, gy - 3, 6, 6);
      if (p.guard > now || p.immune > now) {
        g.fillStyle(p.guard > now ? 0xa9a3ff : 0xe8f5ff, 0.08);
        g.fillCircle(x, y, 28);
        g.lineStyle(
          2,
          p.guard > now ? 0xc8bbff : 0xffffff,
          0.6 + Math.sin(now / 90) * 0.25,
        );
        g.strokeCircle(x, y, 28);
      }
      const hit = (state.effects ?? []).some(
        (e) =>
          e.kind === "hit" &&
          now - e.at < 100 &&
          Math.hypot(e.x - p.x, e.y - p.y) < 35,
      );
      if (hit) {
        g.fillStyle(0xffffff, 0.6);
        g.fillRect(x - 12, y - 22, 24, 39);
      }
      if (p.id === me) {
        g.fillStyle(0xf1e7bb);
        g.fillTriangle(x - 5, y - 45, x + 5, y - 45, x, y - 39);
      }
      g.fillStyle(0x0a1220);
      g.fillRect(x - 20, y - 35, 40, 5);
      g.fillStyle(p.hp < 35 ? 0xffc966 : c);
      g.fillRect(x - 19, y - 34, (38 * p.hp) / 100, 3);
      let label = this.labels.get(p.id);
      if (!label) {
        label = this.add
          .text(x, y - 54, p.name, {
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#e7efff",
            stroke: "#111b2d",
            strokeThickness: 3,
          })
          .setOrigin(0.5);
        this.labels.set(p.id, label);
      }
      label.setPosition(x, y - 56);
      label.setText(p.name);
    }
    for (const e of state.effects ?? []) {
      if (e.id > this.lastEvent && now - e.at < 600) this.flash(e);
      this.lastEvent = Math.max(this.lastEvent, e.id);
    }
  }
}
