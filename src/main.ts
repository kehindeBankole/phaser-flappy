import Phaser from "phaser";
import { Boot } from "./scenes/Boot";
import { Game } from "./scenes/Game";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { setupRotatePrompt } from "./orientation";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#1b1534",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 1500 },
      debug: false,
    },
  },
  scene: [Boot, Game],
};

const game = new Phaser.Game(config);
setupRotatePrompt();

// Pause the game while a phone is held upright (the "turn your phone" overlay is showing).
const portrait = window.matchMedia("(orientation: portrait) and (pointer: coarse)");
const syncOrientation = () => (portrait.matches ? game.pause() : game.resume());
portrait.addEventListener("change", syncOrientation);
game.events.once(Phaser.Core.Events.READY, syncOrientation);

// Handy for poking at the game from the browser console during development.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;

export default game;
