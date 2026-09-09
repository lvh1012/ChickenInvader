import "./styles.css";
import { Game, type GameState } from "./core/Game";
import { SafeStorage, type Settings } from "./core/Storage";

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required UI element: ${selector}`);
  return element;
}

const canvas = required<HTMLCanvasElement>("#game-canvas");
const menu = required<HTMLElement>("#menu");
const pauseMenu = required<HTMLElement>("#pause-menu");
const gameOver = required<HTMLElement>("#game-over");
const pauseButton = required<HTMLButtonElement>("#pause-button");
const dialog = required<HTMLDialogElement>("#info-dialog");
const dialogTitle = required<HTMLElement>("#dialog-title");
const dialogContent = required<HTMLElement>("#dialog-content");
const status = required<HTMLElement>("#game-status");
const waveBanner = required<HTMLElement>("#wave-banner");
const bossHud = required<HTMLElement>("#boss-hud");
const bossHealth = required<HTMLProgressElement>("#boss-health");
const debugOverlay = required<HTMLOutputElement>("#debug-overlay");
const scoreLabel = required<HTMLElement>("#score");
const waveLabel = required<HTMLElement>("#wave");
const weaponLabel = required<HTMLElement>("#weapon");
const healthLabel = required<HTMLElement>("#health");
const healthWrap = required<HTMLElement>("#health-wrap");
const storage = new SafeStorage();
let settings = storage.loadSettings();
let bannerTimer = 0;

const game = new Game(canvas, settings, {
  hud: (score, wave, hp, weapon) => {
    scoreLabel.textContent = String(score).padStart(6, "0");
    waveLabel.textContent = String(wave).padStart(2, "0");
    weaponLabel.textContent = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ"][weapon - 1] ?? "Ⅳ";
    healthLabel.textContent = hp > 0 ? `${"♥ ".repeat(hp).trim()}${hp === 1 ? " ⚠" : ""}` : "✕ BREACH";
    healthWrap.classList.toggle("danger", hp <= 1);
  },
  state: (state) => updateState(state),
  boss: (visible, hp, maxHp) => {
    bossHud.hidden = !visible;
    bossHealth.max = maxHp;
    bossHealth.value = Math.max(0, hp);
    bossHealth.textContent = `${Math.max(0, Math.round((hp / maxHp) * 100))}%`;
  },
  waveBanner: (message) => {
    waveBanner.textContent = message;
    window.clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => { waveBanner.textContent = ""; }, 1600);
  },
  debug: (text) => {
    debugOverlay.hidden = false;
    debugOverlay.value = text;
  },
});

required<HTMLElement>("#best-score").textContent = String(storage.getBestScore()).padStart(6, "0");
required<HTMLButtonElement>("#play-button").addEventListener("click", () => game.start());
required<HTMLButtonElement>("#how-button").addEventListener("click", showHowToPlay);
required<HTMLButtonElement>("#settings-button").addEventListener("click", showSettings);
required<HTMLButtonElement>("#resume-button").addEventListener("click", () => game.resume());
pauseButton.addEventListener("click", () => game.pause());

document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.action === "restart") game.restart();
    else if (button.dataset.action === "quit") game.quit();
    else if (button.dataset.action === "settings") showSettings();
  });
});

dialog.addEventListener("close", () => {
  if (!pauseMenu.hidden) required<HTMLButtonElement>("#resume-button").focus();
});

function updateState(stateValue: GameState): void {
  menu.hidden = stateValue !== "MENU";
  pauseMenu.hidden = stateValue !== "PAUSED";
  gameOver.hidden = stateValue !== "GAME_OVER";
  pauseButton.hidden = stateValue !== "PLAYING" && stateValue !== "WAVE_COMPLETE";
  status.textContent = stateValue.toLowerCase().replace("_", " ");

  if (stateValue === "MENU") {
    required<HTMLElement>("#best-score").textContent = String(storage.getBestScore()).padStart(6, "0");
    queueMicrotask(() => required<HTMLButtonElement>("#play-button").focus());
  } else if (stateValue === "PAUSED") {
    queueMicrotask(() => required<HTMLButtonElement>("#resume-button").focus());
  } else if (stateValue === "GAME_OVER") {
    const score = Number.parseInt(scoreLabel.textContent ?? "0", 10);
    storage.saveBestScore(score);
    required<HTMLElement>("#final-score").textContent = String(score).padStart(6, "0");
    required<HTMLElement>("#final-best").textContent = String(storage.getBestScore()).padStart(6, "0");
    queueMicrotask(() => gameOver.querySelector<HTMLButtonElement>("button")?.focus());
  }
}

function showHowToPlay(): void {
  dialogTitle.textContent = "HOW TO PLAY";
  dialogContent.innerHTML = `
    <ul>
      <li><strong>Move:</strong> Arrow keys / WASD, or drag the ship.</li>
      <li><strong>Fire:</strong> Hold Space. Touch uses auto-fire while dragging.</li>
      <li><strong>Pause:</strong> P, Escape, or the Ⅱ button.</li>
      <li><strong>Collect:</strong> W upgrades ink, R increases fire rate, S adds a shield.</li>
      <li>Enemy eggs hurt your hull. A blinking ship is temporarily invulnerable.</li>
    </ul>`;
  dialog.showModal();
}

function showSettings(): void {
  dialogTitle.textContent = "SETTINGS";
  dialogContent.innerHTML = `
    <label>SFX <input id="setting-sfx" type="checkbox" ${settings.sfx ? "checked" : ""}></label>
    <label>MUSIC <input id="setting-music" type="checkbox" ${settings.music ? "checked" : ""}></label>
    <label>REDUCED EFFECTS <input id="setting-reduced" type="checkbox" ${settings.reducedEffects ? "checked" : ""}></label>
    <label>GRAPHICS
      <select id="setting-quality">
        ${["auto", "high", "medium", "low"].map((quality) => `<option value="${quality}" ${settings.quality === quality ? "selected" : ""}>${quality.toUpperCase()}</option>`).join("")}
      </select>
    </label>
    <p>Reduced effects limits shake and particle density. The system preference is also respected by the interface.</p>`;

  const persist = (): void => {
    settings = {
      sfx: required<HTMLInputElement>("#setting-sfx").checked,
      music: required<HTMLInputElement>("#setting-music").checked,
      reducedEffects: required<HTMLInputElement>("#setting-reduced").checked,
      quality: required<HTMLSelectElement>("#setting-quality").value as Settings["quality"],
    };
    storage.saveSettings(settings);
    game.applySettings(settings);
  };
  dialogContent.querySelectorAll("input, select").forEach((control) => control.addEventListener("change", persist));
  dialog.showModal();
}
