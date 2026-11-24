import Phaser from "phaser";
import {
  BEST_KEY,
  FLAP_VELOCITY,
  GAME_HEIGHT,
  GAME_WIDTH,
  GAP_MARGIN,
  GROUND_HEIGHT,
  GROUND_Y,
  PILLAR_GAP,
  PILLAR_SPACING_MS,
  PILLAR_WIDTH,
  SCROLL_SPEED,
} from "../constants";
import { Sfx } from "../sfx";

type State = "ready" | "playing" | "dead";

interface PillarPair {
  top: Phaser.Physics.Arcade.Image;
  bottom: Phaser.Physics.Arcade.Image;
  scored: boolean;
}

export class Game extends Phaser.Scene {
  private state: State = "ready";
  private score = 0;
  private best = 0;

  private player!: Phaser.Physics.Arcade.Image;
  private pillars!: Phaser.Physics.Arcade.Group;
  private pairs: PillarPair[] = [];
  private hills!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;
  private scoreText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private canRestart = false;
  private sfx!: Sfx;
  private muteText!: Phaser.GameObjects.Text;

  constructor() {
    super("Game");
  }

  create() {
    this.state = "ready";
    this.score = 0;
    this.pairs = [];
    this.canRestart = false;
    this.best = readBest();
    this.sfx = new Sfx(this);

    this.add.image(0, 0, "sky").setOrigin(0);
    this.hills = this.add.tileSprite(0, GROUND_Y - 120, GAME_WIDTH, 140, "hills").setOrigin(0);

    this.pillars = this.physics.add.group({ allowGravity: false, immovable: true });

    this.trail = this.add.particles(0, 0, "spark", {
      speed: { min: 10, max: 40 },
      angle: { min: 160, max: 200 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 450,
      frequency: 45,
      emitting: false,
    });

    this.player = this.physics.add.image(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.42, "ember");
    this.player.setCircle(13, 7, 10);
    (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.trail.startFollow(this.player, -10, 4);

    this.ground = this.add.tileSprite(0, GROUND_Y, GAME_WIDTH, GROUND_HEIGHT, "ground").setOrigin(0).setDepth(5);

    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 56, "0", textStyle(48))
      .setOrigin(0.5)
      .setDepth(10);

    this.hintText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.62, "EMBER\n\nTap or press Space to fly", textStyle(18))
      .setOrigin(0.5)
      .setAlign("center")
      .setDepth(10);

    // Gentle bob while waiting to start.
    this.tweens.add({
      targets: this.player,
      y: this.player.y - 10,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.physics.add.overlap(this.player, this.pillars, () => this.die());

    this.muteText = this.add
      .text(GAME_WIDTH - 20, 20, "", textStyle(16))
      .setOrigin(1, 0)
      .setDepth(30)
      .setPadding(10)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleMute());
    this.refreshMuteText();

    // Taps on the mute button shouldn't also flap.
    this.input.on("pointerdown", (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.handleInput();
    });
    this.input.keyboard?.on("keydown-M", () => this.toggleMute());
    this.input.keyboard?.on("keydown-SPACE", () => this.handleInput());
    this.input.keyboard?.on("keydown-UP", () => this.handleInput());
  }

  update(_time: number, delta: number) {
    if (this.state === "dead") return;

    const dx = (SCROLL_SPEED * delta) / 1000;
    this.ground.tilePositionX += dx;
    this.hills.tilePositionX += dx * 0.3;

    if (this.state !== "playing") return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Tilt with vertical speed: nose up on a flap, nose down when falling.
    this.player.angle = Phaser.Math.Clamp(body.velocity.y * 0.08, -25, 80);

    // Ceiling: stop at the top instead of flying over the pillars.
    if (this.player.y < 16) {
      this.player.y = 16;
      body.setVelocityY(0);
    }

    if (this.player.y + 13 >= GROUND_Y) {
      this.player.y = GROUND_Y - 13;
      this.die();
      return;
    }

    for (const pair of this.pairs) {
      if (!pair.scored && pair.top.x + PILLAR_WIDTH / 2 < this.player.x) {
        pair.scored = true;
        this.addPoint();
      }
    }

    // Recycle pillars that have left the screen.
    this.pairs = this.pairs.filter((pair) => {
      if (pair.top.x < -PILLAR_WIDTH) {
        pair.top.destroy();
        pair.bottom.destroy();
        return false;
      }
      return true;
    });
  }

  private handleInput() {
    if (this.state === "ready") this.startRun();
    if (this.state === "playing") this.flap();
    else if (this.state === "dead" && this.canRestart) this.scene.restart();
  }

  private toggleMute() {
    this.sfx.toggleMute();
    this.refreshMuteText();
  }

  private refreshMuteText() {
    this.muteText.setText(this.sfx.muted ? "SOUND OFF" : "SOUND ON").setAlpha(this.sfx.muted ? 0.6 : 0.9);
  }

  private startRun() {
    this.state = "playing";
    this.tweens.killTweensOf(this.player);
    this.hintText.setVisible(false);
    (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
    this.trail.start();

    this.spawnPillars();
    this.spawnTimer = this.time.addEvent({
      delay: PILLAR_SPACING_MS,
      loop: true,
      callback: () => this.spawnPillars(),
    });
  }

  private flap() {
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocityY(FLAP_VELOCITY);
    this.sfx.flap();
    this.tweens.add({
      targets: this.player,
      scaleX: { from: 1.15, to: 1 },
      scaleY: { from: 0.85, to: 1 },
      duration: 140,
      ease: "Quad.easeOut",
    });
  }

  private spawnPillars() {
    const minCenter = GAP_MARGIN + PILLAR_GAP / 2;
    const maxCenter = GROUND_Y - GAP_MARGIN - PILLAR_GAP / 2;
    const center = Phaser.Math.Between(minCenter, maxCenter);
    const x = GAME_WIDTH + PILLAR_WIDTH;

    // The texture's capital is at its top edge, so the bottom pillar uses it as-is
    // and the top pillar is flipped so its capital faces down into the gap.
    const bottom = this.pillars.create(x, center + PILLAR_GAP / 2, "pillar") as Phaser.Physics.Arcade.Image;
    bottom.setOrigin(0.5, 0);

    const top = this.pillars.create(x, center - PILLAR_GAP / 2, "pillar") as Phaser.Physics.Arcade.Image;
    top.setOrigin(0.5, 1).setFlipY(true);

    for (const p of [top, bottom]) {
      const body = p.body as Phaser.Physics.Arcade.Body;
      body.updateFromGameObject();
      body.setVelocityX(-SCROLL_SPEED);
    }

    this.pairs.push({ top, bottom, scored: false });
  }

  private addPoint() {
    this.score += 1;
    this.sfx.point();
    this.scoreText.setText(String(this.score));
    this.tweens.add({
      targets: this.scoreText,
      scale: { from: 1.25, to: 1 },
      duration: 160,
      ease: "Quad.easeOut",
    });
  }

  private die() {
    if (this.state === "dead") return;
    this.state = "dead";

    this.spawnTimer?.remove();
    this.trail.stop();
    for (const p of this.pillars.getChildren()) {
      (p.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    this.player.setTint(0xff6b6b);

    this.sfx.hit();
    this.sfx.fade();
    this.cameras.main.shake(180, 0.012);
    this.cameras.main.flash(120, 255, 240, 220);

    if (this.score > this.best) {
      this.best = this.score;
      writeBest(this.best);
    }

    this.showGameOver();
  }

  private showGameOver() {
    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.42).setDepth(20).setAlpha(0);

    const bg = this.add.rectangle(0, 0, 240, 190, 0x1b1534, 0.88).setStrokeStyle(3, 0xffb347);
    const title = this.add.text(0, -60, "THE LIGHT FADES", textStyle(20)).setOrigin(0.5);
    const score = this.add.text(0, -10, `Score  ${this.score}`, textStyle(22)).setOrigin(0.5);
    const best = this.add.text(0, 24, `Best   ${this.best}`, textStyle(22)).setOrigin(0.5);
    const hint = this.add.text(0, 66, "Tap to try again", textStyle(14)).setOrigin(0.5).setAlpha(0.8);
    panel.add([bg, title, score, best, hint]);

    this.scoreText.setVisible(false);

    this.tweens.add({
      targets: panel,
      alpha: 1,
      y: panel.y - 12,
      delay: 350,
      duration: 260,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.canRestart = true;
      },
    });
  }
}

function textStyle(size: number): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: "monospace",
    fontSize: `${size}px`,
    fontStyle: "bold",
    color: "#fff4d6",
    stroke: "#2a1f3d",
    strokeThickness: Math.max(3, Math.round(size / 8)),
  };
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(value: number) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage blocked (private mode etc.): best score just won't persist.
  }
}
