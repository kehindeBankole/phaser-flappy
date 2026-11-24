import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, GROUND_HEIGHT, PILLAR_WIDTH } from "../constants";

/**
 * Draws every texture in code, so the project needs no image files.
 * Swap any of these for real sprites later by loading them in a Preloader.
 */
export class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    this.makeSky();
    this.makeHills();
    this.makeGround();
    this.makePillar();
    this.makeEmber();
    this.makeSpark();
    this.scene.start("Game");
  }

  private draw(key: string, w: number, h: number, paint: (g: Phaser.GameObjects.Graphics) => void) {
    const g = this.add.graphics();
    paint(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeSky() {
    this.draw("sky", GAME_WIDTH, GAME_HEIGHT, (g) => {
      g.fillGradientStyle(0x1b1534, 0x1b1534, 0xe07a5f, 0xe07a5f, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      // Scattered stars in the upper half.
      const rng = new Phaser.Math.RandomDataGenerator(["ember"]);
      for (let i = 0; i < 40; i++) {
        g.fillStyle(0xfff4d6, rng.realInRange(0.3, 0.9));
        g.fillCircle(rng.between(0, GAME_WIDTH), rng.between(0, GAME_HEIGHT * 0.45), rng.realInRange(0.6, 1.6));
      }
    });
  }

  private makeHills() {
    const h = 140;
    this.draw("hills", GAME_WIDTH, h, (g) => {
      g.fillStyle(0x3d2c5e, 1);
      // Wave whose period divides the width, so the tile repeats seamlessly.
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= GAME_WIDTH; x += 4) {
        const y = 60 + Math.sin((x / GAME_WIDTH) * Math.PI * 4) * 22 + Math.sin((x / GAME_WIDTH) * Math.PI * 6) * 10;
        g.lineTo(x, y);
      }
      g.lineTo(GAME_WIDTH, h);
      g.closePath();
      g.fillPath();
    });
  }

  private makeGround() {
    this.draw("ground", 48, GROUND_HEIGHT, (g) => {
      g.fillStyle(0x2a1f3d, 1);
      g.fillRect(0, 0, 48, GROUND_HEIGHT);
      g.fillStyle(0x6b8f71, 1);
      g.fillRect(0, 0, 48, 10);
      g.fillStyle(0x4f6b55, 1);
      g.fillRect(0, 10, 48, 4);
      // Diagonal stripe gives the scroll a visible sense of speed.
      g.fillStyle(0x342749, 1);
      g.fillTriangle(0, 14, 24, 14, 0, 38);
      g.fillTriangle(24, 14, 48, 14, 24, 38);
    });
  }

  private makePillar() {
    const h = GAME_HEIGHT;
    this.draw("pillar", PILLAR_WIDTH, h, (g) => {
      // Shaft.
      g.fillStyle(0x7a7f9a, 1);
      g.fillRect(6, 0, PILLAR_WIDTH - 12, h);
      g.fillStyle(0x9aa0bd, 1);
      g.fillRect(10, 0, 8, h);
      g.fillStyle(0x5c607a, 1);
      g.fillRect(PILLAR_WIDTH - 18, 0, 6, h);
      // Stone block seams.
      g.fillStyle(0x5c607a, 1);
      for (let y = 60; y < h; y += 56) g.fillRect(6, y, PILLAR_WIDTH - 12, 3);
      // Capital at the top end (the end that faces the gap).
      g.fillStyle(0x8c91ad, 1);
      g.fillRect(0, 0, PILLAR_WIDTH, 26);
      g.fillStyle(0x6b8f71, 1);
      g.fillRect(0, 0, PILLAR_WIDTH, 6);
      g.fillStyle(0x5c607a, 1);
      g.fillRect(0, 22, PILLAR_WIDTH, 4);
    });
  }

  private makeEmber() {
    const s = 40;
    this.draw("ember", s, s, (g) => {
      const c = s / 2;
      // Outer glow.
      g.fillStyle(0xffb347, 0.25);
      g.fillCircle(c, c + 2, 18);
      // Flame tip.
      g.fillStyle(0xff7b39, 1);
      g.fillTriangle(c - 8, c - 4, c + 8, c - 4, c + 2, 2);
      // Body.
      g.fillStyle(0xffb347, 1);
      g.fillCircle(c, c + 3, 13);
      g.fillStyle(0xffe08a, 1);
      g.fillCircle(c - 3, c, 6);
      // Eyes.
      g.fillStyle(0x2a1f3d, 1);
      g.fillCircle(c + 3, c + 2, 2.4);
      g.fillCircle(c + 9, c + 2, 2.4);
    });
  }

  private makeSpark() {
    this.draw("spark", 8, 8, (g) => {
      g.fillStyle(0xffd27a, 1);
      g.fillCircle(4, 4, 3);
    });
  }
}
