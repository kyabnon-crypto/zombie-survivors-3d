import './style.css';
import { computeCharacterStats, ZOMBIE_CHARACTERS } from './data/characters';
import { DIFFICULTIES, getDifficultyDef, type DifficultyId } from './data/difficulty';
import { PATCH_CATALOG, type PatchDef } from './data/patches';
import { STAGES } from './data/stages';
import {
  getCharLevelUpCost,
  getCharProgress,
  getCharXpForNextLevel,
  getUpgradeCost,
  grantCharXp,
  loadSave,
  MAX_CHAR_LEVEL,
  SHOP_UPGRADES,
  writeSave,
} from './data/save';
import { SoundEngine } from './audio/SoundEngine';
import { GameEngine, type HudSnapshot } from './game/GameEngine';

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

const app = document.getElementById('app')!;

app.innerHTML = `
  <div id="game-root">
    <div id="canvas-wrap"></div>
    <div id="floating-layer"></div>

    <!-- LOBBY / TITLE OVERLAY -->
    <div id="lobby-overlay">
      <div>
        <div class="lobby-top">
          <div class="game-logo">
            <div class="logo-title">ZOMBIE SURVIVORS 3D</div>
            <div class="logo-sub">全12体プレイアブル • 12ステージ＋特別ボス総進撃</div>
          </div>
          <div class="lobby-top-actions">
            <button id="btn-shop" class="pill-btn gold">🛒 ショップ (<span id="lobby-btn-count">0</span> 🟡)</button>
            <button id="btn-lobby-mute" class="pill-btn">🔊 BGM ON</button>
          </div>
        </div>
        <div id="stage-strip" class="stage-strip"></div>
      </div>

      <div class="lobby-bottom">
        <div class="char-picker-area">
          <div id="char-info-card" class="felt-panel char-info-card"></div>
          <div id="char-row" class="char-row"></div>
        </div>
        <div class="lobby-cta-col">
          <div class="felt-panel difficulty-panel">
            <div class="difficulty-head">
              <span class="difficulty-title">難易度</span>
              <span id="difficulty-desc" class="difficulty-desc">標準バランス • 報酬 1.0x</span>
            </div>
            <div id="difficulty-picker" class="difficulty-picker"></div>
          </div>
          <div class="lobby-action-row">
            <button id="btn-mode-toggle" class="mode-toggle">
              <span id="mode-dot" class="mode-dot"></span>
              <span id="mode-label">片手オート攻撃: ON</span>
            </button>
            <button id="btn-play" class="play-btn">PLAY!</button>
          </div>
        </div>
      </div>
    </div>

    <!-- IN-GAME HUD OVERLAY -->
    <div id="hud-overlay" class="hidden">
      <div class="hud-top">
        <div class="hud-top-row">
          <div class="hud-player-box">
            <img id="hud-avatar" class="hud-avatar" src="./assets/chars/red_hatter.png" alt="avatar" />
            <div class="hp-wrap">
              <div class="hp-text">
                <span>HP</span>
                <span id="hud-hp-num">100 / 100</span>
              </div>
              <div class="bar-track"><div id="hud-hp-fill" class="hp-fill" style="width:100%"></div></div>
            </div>
          </div>

          <div class="hud-center-stats">
            <div id="hud-wave" class="wave-label">ST1 • WAVE 1 • 00:00</div>
            <div id="hud-kills" class="kill-label">撃破 0 • 🟡 0</div>
          </div>

          <div class="hud-top-btns">
            <button id="btn-hud-auto" class="icon-btn" title="オート攻撃切替">⚡</button>
            <button id="btn-hud-mute" class="icon-btn" title="サウンド切替">🔊</button>
            <button id="btn-hud-pause" class="icon-btn" title="ポーズ">⏸</button>
          </div>
        </div>

        <div class="xp-bar-row">
          <div id="hud-lv" class="lv-pill">LV.1</div>
          <div class="xp-track"><div id="hud-xp-fill" class="xp-fill" style="width:0%"></div></div>
        </div>

        <div id="combo-pill" class="combo-pill hidden">
          <div id="combo-num" class="combo-num">0 COMBO!</div>
          <div class="combo-bar"><div id="combo-bar-fill" class="combo-bar-fill" style="width:100%"></div></div>
        </div>

        <div id="boss-bar-wrap" class="boss-bar-wrap hidden">
          <div class="boss-title">
            <span id="boss-name">暴走キャプテン・パッチ</span>
            <span id="boss-hp-num">1350</span>
          </div>
          <div class="bar-track"><div id="boss-hp-fill" class="boss-fill" style="width:100%"></div></div>
        </div>
      </div>

      <div class="hud-controls">
        <div id="joystick-zone" class="joystick-zone">
          <div class="joystick-base">
            <div id="joystick-knob" class="joystick-knob"></div>
          </div>
        </div>

        <div class="action-cluster">
          <button id="btn-dash" class="action-btn btn-dash">
            <span class="btn-emoji">💨</span>
            <span>DASH</span>
          </button>
          <button id="btn-attack" class="action-btn btn-attack">
            <span class="btn-emoji">👟</span>
            <span>ATTACK</span>
          </button>
          <button id="btn-fever" class="action-btn btn-fever">
            <span class="btn-emoji">🔥</span>
            <span id="fever-pct">0%</span>
          </button>
        </div>
      </div>

      <div class="desktop-hint">PC操作: WASD移動 / Spaceダッシュ / J攻撃 / Eフィーバー</div>
    </div>

    <!-- LEVEL UP PATCH MODAL -->
    <div id="levelup-modal" class="modal-backdrop hidden">
      <div class="felt-panel levelup-box">
        <div class="banner-ribbon">
          <h2>LEVEL UP! パッチを選ぼう</h2>
          <p>タップでゾンビに新しい能力を縫い付けよう！</p>
        </div>
        <div id="patch-cards" class="patch-cards"></div>
      </div>
    </div>

    <!-- PAUSE MODAL -->
    <div id="pause-modal" class="modal-backdrop hidden">
      <div class="felt-panel result-box">
        <h2 style="margin:0">PAUSE</h2>
        <p style="margin:0; font-size:13px; color:#d7e0f2;">ちょっと一息（縫い直し中...）</p>
        <div class="result-actions">
          <button id="btn-resume" class="play-btn" style="padding:12px 28px; font-size:16px;">つづける</button>
          <button id="btn-quit" class="pill-btn" style="padding:12px 20px;">ロビーへ戻る</button>
        </div>
      </div>
    </div>

    <!-- RESULT MODAL -->
    <div id="result-modal" class="modal-backdrop hidden">
      <div class="felt-panel result-box">
        <div class="banner-ribbon">
          <h2 id="result-title">STAGE CLEAR!</h2>
          <p id="result-sub">ボスを正気に戻した！</p>
        </div>
        <div class="result-stats">
          <div class="stat-tile"><div id="res-time" class="val">00:00</div><div class="lbl">生存タイム</div></div>
          <div class="stat-tile"><div id="res-kills" class="val">0</div><div class="lbl">撃破数</div></div>
          <div class="stat-tile"><div id="res-level" class="val">LV.1</div><div class="lbl">到達レベル</div></div>
          <div class="stat-tile"><div id="res-buttons" class="val">+0 🟡</div><div class="lbl">獲得ボタン(保存済)</div></div>
        </div>
        <div id="res-char-growth" class="result-char-growth"></div>
        <div class="result-actions">
          <button id="btn-next-stage" class="play-btn hidden" style="padding:12px 24px; font-size:16px;">次のステージへ！</button>
          <button id="btn-retry" class="play-btn" style="padding:12px 24px; font-size:16px;">もう一度</button>
          <button id="btn-to-lobby" class="pill-btn" style="padding:12px 18px;">ロビー・ショップへ</button>
        </div>
      </div>
    </div>

    <!-- SHOP & CHARACTER UNLOCK MODAL -->
    <div id="shop-modal" class="modal-backdrop hidden">
      <div class="felt-panel shop-box">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <h2 style="margin:0; font-size:18px;">🛒 パッチワークショップ • <span id="shop-btn-total" style="color:#ffd166;">0 🟡</span></h2>
          <button id="btn-close-shop" class="pill-btn">✕ とじる</button>
        </div>
        <div class="shop-tabs">
          <button id="tab-upgrades" class="shop-tab active">💪 初期ステータス強化</button>
          <button id="tab-chars" class="shop-tab">🧸 キャラ解放・育成</button>
        </div>
        <div id="shop-grid" class="shop-grid"></div>
      </div>
    </div>
  </div>
`;

const sound = new SoundEngine();
let save = loadSave();
let selectedCharId = ZOMBIE_CHARACTERS[0].id;
const initialStage = STAGES.find((s) => s.index === save.unlockedStageIndex) || STAGES[0];
let selectedStageId = initialStage.id;
let selectedDifficulty: DifficultyId = save.difficulty;
let autoAttackMode = true;
let shopTab: 'upgrades' | 'chars' = 'upgrades';

const lobbyOverlay = document.getElementById('lobby-overlay')!;
const hudOverlay = document.getElementById('hud-overlay')!;
const levelupModal = document.getElementById('levelup-modal')!;
const pauseModal = document.getElementById('pause-modal')!;
const resultModal = document.getElementById('result-modal')!;
const shopModal = document.getElementById('shop-modal')!;
const floatingLayer = document.getElementById('floating-layer')!;

const engine = new GameEngine(document.getElementById('canvas-wrap')!, sound, {
  onHudUpdate: updateHud,
  onLevelUp: showLevelUpChoices,
  onGameOver: showResultModal,
  onFloatingText: spawnFloatingText,
});

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function statPct(value: number, max: number): number {
  return Math.max(8, Math.min(100, Math.round((value / max) * 100)));
}

function renderLobby(): void {
  document.getElementById('lobby-btn-count')!.textContent = `${save.buttons}`;

  // Stage strip
  const stageStrip = document.getElementById('stage-strip')!;
  stageStrip.innerHTML = '';
  for (const st of STAGES) {
    // Special Stage (index 13) is only shown/unlocked after Stage 12 is cleared (unlockedStageIndex >= 13 or specialStageCleared)
    const unlocked = save.specialStageCleared || st.index <= save.unlockedStageIndex;
    const isCleared = save.specialStageCleared || st.index < save.unlockedStageIndex;
    const btn = document.createElement('button');
    btn.className = `stage-chip ${st.id === selectedStageId ? 'active' : ''} ${unlocked ? '' : 'locked'} ${st.isSpecialStage ? 'special' : ''}`;
    if (unlocked) {
      btn.textContent = `${isCleared ? '✓ ' : ''}${st.name}`;
    } else {
      btn.textContent = st.isSpecialStage ? '🔒 ★特別ステージ (全12ステージ制覇で開放)' : `🔒 ${st.name}`;
    }
    btn.title = unlocked
      ? `${st.description} (BOSS: ${st.bossName})`
      : st.isSpecialStage
        ? 'STAGE 1〜12をすべてクリアすると開放されます！'
        : `前のステージをクリアすると開放されます！`;
    btn.onclick = () => {
      if (!unlocked) return;
      selectedStageId = st.id;
      engine.setLobbyStage(st.id);
      renderLobby();
    };
    stageStrip.appendChild(btn);
  }

  // Difficulty selector (3 tiers)
  const diffDef = getDifficultyDef(selectedDifficulty);
  document.getElementById('difficulty-desc')!.textContent = diffDef.summary;
  const diffPicker = document.getElementById('difficulty-picker')!;
  diffPicker.innerHTML = '';
  for (const d of DIFFICULTIES) {
    const btn = document.createElement('button');
    btn.className = `diff-btn diff-${d.id} ${d.id === selectedDifficulty ? 'active' : ''}`;
    btn.innerHTML = `
      <span class="diff-btn-top">${d.icon} ${d.label}</span>
      <span class="diff-btn-sub">${d.jpLabel}</span>
    `;
    btn.title = `${d.label} (${d.jpLabel}): ${d.summary}`;
    btn.onclick = () => {
      sound.unlock();
      selectedDifficulty = d.id;
      save.difficulty = d.id;
      writeSave(save);
      renderLobby();
    };
    diffPicker.appendChild(btn);
  }

  // Character Info, Level & Stats
  const charDef = ZOMBIE_CHARACTERS.find((c) => c.id === selectedCharId) || ZOMBIE_CHARACTERS[0];
  const isUnlocked = save.unlockedChars.includes(charDef.id);
  const charProg = getCharProgress(save, charDef.id);
  const charXpNext = getCharXpForNextLevel(charProg.level);
  const isMaxLv = charProg.level >= MAX_CHAR_LEVEL;
  const stats = computeCharacterStats(charDef, charProg.level, save.upgrades);
  const startPatch = PATCH_CATALOG.find((p) => p.id === charDef.startingPatch);
  const expPct = isMaxLv ? 100 : Math.min(100, Math.round((charProg.xp / charXpNext) * 100));

  const infoCard = document.getElementById('char-info-card')!;
  infoCard.innerHTML = `
    <div class="char-info-top">
      <img class="char-info-portrait" src="${charDef.portrait}" alt="${charDef.name}" />
      <div class="char-info-text">
        <div class="char-name-row">
          <h2>${charDef.name}</h2>
          <span class="char-lv-badge ${isMaxLv ? 'max' : ''}">LV.${charProg.level}</span>
          ${isUnlocked ? '' : `<span class="char-lock-pill">🔒 ${charDef.unlockCost} 🟡</span>`}
        </div>
        <div class="char-tags-row">
          <span class="char-role-tag">${charDef.role}</span>
          ${startPatch ? `<span class="char-patch-tag">${startPatch.icon} ${startPatch.name}</span>` : ''}
        </div>
        ${
          isUnlocked
            ? `<div class="char-exp-row">
                <div class="char-exp-track"><div class="char-exp-fill" style="width:${expPct}%"></div></div>
                <span class="char-exp-label">${isMaxLv ? 'MAX LV' : `EXP ${charProg.xp}/${charXpNext}`}</span>
              </div>`
            : ''
        }
        <p>${charDef.tagline}</p>
      </div>
    </div>
    <div class="char-stats-grid">
      <div class="char-stat-item">
        <div class="char-stat-head">
          <span class="char-stat-lbl">❤️ HP</span>
          <span class="char-stat-val">${stats.hp}${stats.hpBonus > 0 ? `<em class="stat-bonus">+${stats.hpBonus}</em>` : ''}</span>
        </div>
        <div class="char-stat-bar"><div class="char-stat-fill fill-hp" style="width:${statPct(stats.hp, 280)}%"></div></div>
      </div>
      <div class="char-stat-item">
        <div class="char-stat-head">
          <span class="char-stat-lbl">⚔️ 攻撃</span>
          <span class="char-stat-val">${stats.attack}${stats.attackBonus > 0 ? `<em class="stat-bonus">+${stats.attackBonus}</em>` : ''}</span>
        </div>
        <div class="char-stat-bar"><div class="char-stat-fill fill-atk" style="width:${statPct(stats.attack, 70)}%"></div></div>
      </div>
      <div class="char-stat-item">
        <div class="char-stat-head">
          <span class="char-stat-lbl">👟 速度</span>
          <span class="char-stat-val">${stats.speed.toFixed(1)}${stats.speedBonus > 0 ? `<em class="stat-bonus">+${stats.speedBonus.toFixed(1)}</em>` : ''}</span>
        </div>
        <div class="char-stat-bar"><div class="char-stat-fill fill-spd" style="width:${statPct(stats.speed, 13.5)}%"></div></div>
      </div>
      <div class="char-stat-item">
        <div class="char-stat-head">
          <span class="char-stat-lbl">⚡ 連射</span>
          <span class="char-stat-val">${stats.attackRate.toFixed(1)}/s</span>
        </div>
        <div class="char-stat-bar"><div class="char-stat-fill fill-rate" style="width:${statPct(stats.attackRate, 4.0)}%"></div></div>
      </div>
      <div class="char-stat-item">
        <div class="char-stat-head">
          <span class="char-stat-lbl">🎯 射程</span>
          <span class="char-stat-val">${stats.attackRange.toFixed(1)}</span>
        </div>
        <div class="char-stat-bar"><div class="char-stat-fill fill-rng" style="width:${statPct(stats.attackRange, 10.5)}%"></div></div>
      </div>
    </div>
  `;

  // Play Button state
  const playBtn = document.getElementById('btn-play') as HTMLButtonElement;
  playBtn.textContent = isUnlocked ? 'PLAY!' : `🔓 ${charDef.unlockCost}🟡で解放`;

  // Character Avatar Row (All 12!)
  const charRow = document.getElementById('char-row')!;
  charRow.innerHTML = '';
  for (const c of ZOMBIE_CHARACTERS) {
    const unlocked = save.unlockedChars.includes(c.id);
    const prog = getCharProgress(save, c.id);
    const btn = document.createElement('button');
    btn.className = `char-avatar-btn ${c.id === selectedCharId ? 'active' : ''} ${unlocked ? '' : 'locked'}`;
    btn.innerHTML = `
      <img src="${c.portrait}" alt="${c.name}" />
      ${unlocked ? `<span class="char-lv-chip">LV.${prog.level}</span>` : `<span class="char-lock-badge">${c.unlockCost}🟡</span>`}
    `;
    btn.onclick = () => {
      sound.unlock();
      selectedCharId = c.id;
      engine.setLobbyCharacter(c.id);
      renderLobby();
    };
    charRow.appendChild(btn);
  }
}

function renderShop(): void {
  document.getElementById('shop-btn-total')!.textContent = `${save.buttons} 🟡`;
  document.getElementById('tab-upgrades')!.classList.toggle('active', shopTab === 'upgrades');
  document.getElementById('tab-chars')!.classList.toggle('active', shopTab === 'chars');

  const grid = document.getElementById('shop-grid')!;
  grid.innerHTML = '';

  if (shopTab === 'upgrades') {
    for (const up of SHOP_UPGRADES) {
      const lv = save.upgrades[up.id] || 0;
      const maxed = lv >= up.maxLevel;
      const cost = getUpgradeCost(up, lv);
      const canBuy = !maxed && save.buttons >= cost;

      const card = document.createElement('div');
      card.className = 'shop-item';
      card.innerHTML = `
        <div class="shop-item-head">
          <span style="font-size:28px">${up.icon}</span>
          <div>
            <div style="font-weight:900; font-size:14px;">${up.name}</div>
            <div style="font-size:11px; color:#ffd875;">LV.${lv} / ${up.maxLevel}</div>
          </div>
        </div>
        <div style="font-size:12px; color:#d7e0f2;">${up.desc}</div>
        <button class="shop-buy-btn" ${canBuy ? '' : 'disabled'}>
          ${maxed ? 'MAX!' : `強化する (${cost} 🟡)`}
        </button>
      `;
      card.querySelector('button')!.onclick = () => {
        if (!canBuy) return;
        save.buttons -= cost;
        save.upgrades[up.id] = lv + 1;
        writeSave(save);
        sound.playLevelUp();
        renderShop();
        renderLobby();
      };
      grid.appendChild(card);
    }
  } else {
    for (const c of ZOMBIE_CHARACTERS) {
      const unlocked = save.unlockedChars.includes(c.id);
      const prog = getCharProgress(save, c.id);
      const isMaxLv = prog.level >= MAX_CHAR_LEVEL;
      const lvCost = getCharLevelUpCost(prog.level);
      const canUnlock = !unlocked && save.buttons >= c.unlockCost;
      const canLevelUp = unlocked && !isMaxLv && save.buttons >= lvCost;
      const stats = computeCharacterStats(c, prog.level, save.upgrades);
      const card = document.createElement('div');
      card.className = 'shop-item';
      card.innerHTML = `
        <div class="shop-item-head">
          <img src="${c.portrait}" alt="${c.name}" />
          <div>
            <div style="font-weight:900; font-size:13px;">${c.name} ${unlocked ? `<span class="shop-char-lv">LV.${prog.level}</span>` : ''}</div>
            <div style="font-size:10px; color:#ffd875;">${c.role}</div>
          </div>
        </div>
        <div class="shop-char-mini-stats">❤️${stats.hp} • ⚔️${stats.attack} • 👟${stats.speed.toFixed(1)}</div>
        <div style="font-size:11px; color:#d7e0f2;">${c.tagline}</div>
        <button class="shop-buy-btn" ${(unlocked ? !canLevelUp : !canUnlock) ? 'disabled' : ''}>
          ${
            unlocked
              ? isMaxLv
                ? 'MAX LV ✓'
                : `LV.${prog.level + 1}に育成 (${lvCost} 🟡)`
              : `アンロック (${c.unlockCost} 🟡)`
          }
        </button>
      `;
      card.querySelector('button')!.onclick = () => {
        if (unlocked) {
          if (!canLevelUp) return;
          save.buttons -= lvCost;
          const nextLv = Math.min(MAX_CHAR_LEVEL, prog.level + 1);
          const nextXpCap = getCharXpForNextLevel(nextLv);
          save.charProgress[c.id] = {
            level: nextLv,
            xp: nextLv >= MAX_CHAR_LEVEL ? 0 : Math.min(prog.xp, nextXpCap - 1),
          };
          selectedCharId = c.id;
          engine.setLobbyCharacter(c.id);
          writeSave(save);
          sound.playLevelUp();
          renderShop();
          renderLobby();
          return;
        }
        if (!canUnlock) return;
        save.buttons -= c.unlockCost;
        save.unlockedChars.push(c.id);
        selectedCharId = c.id;
        engine.setLobbyCharacter(c.id);
        writeSave(save);
        sound.playLevelUp();
        renderShop();
        renderLobby();
      };
      grid.appendChild(card);
    }
  }
}

function updateHud(hud: HudSnapshot): void {
  document.getElementById('hud-hp-num')!.textContent = `${hud.hp} / ${hud.maxHp}`;
  document.getElementById('hud-hp-fill')!.style.width = `${Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100))}%`;
  const stLabel = hud.stageIndex > 12 ? 'ST-EX' : `ST${hud.stageIndex}`;
  document.getElementById('hud-wave')!.innerHTML =
    `<span class="hud-diff-tag diff-${hud.difficultyId}">${hud.difficultyLabel}</span> ${stLabel} • WAVE ${hud.wave} • ${formatTime(hud.elapsed)}`;
  document.getElementById('hud-kills')!.textContent = `撃破 ${hud.kills} • 🟡 ${hud.buttons}`;
  document.getElementById('hud-lv')!.textContent = `LV.${hud.level}`;
  document.getElementById('hud-xp-fill')!.style.width = `${Math.min(100, (hud.xp / hud.xpNext) * 100)}%`;

  const comboPill = document.getElementById('combo-pill')!;
  if (hud.combo >= 3) {
    comboPill.classList.remove('hidden');
    document.getElementById('combo-num')!.textContent = `${hud.combo} COMBO!`;
    document.getElementById('combo-bar-fill')!.style.width = `${hud.comboTimerRatio * 100}%`;
  } else {
    comboPill.classList.add('hidden');
  }

  const feverBtn = document.getElementById('btn-fever')!;
  const feverPct = document.getElementById('fever-pct')!;
  if (hud.feverActive) {
    feverBtn.classList.add('ready');
    feverPct.textContent = `${hud.feverTimeLeft.toFixed(1)}s`;
  } else if (hud.fever >= 100) {
    feverBtn.classList.add('ready');
    feverPct.textContent = 'FEVER!';
  } else {
    feverBtn.classList.remove('ready');
    feverPct.textContent = `${hud.fever}%`;
  }

  const dashBtn = document.getElementById('btn-dash') as HTMLButtonElement;
  dashBtn.style.opacity = hud.dashCooldownRatio > 0 ? '0.48' : '1';

  const bossWrap = document.getElementById('boss-bar-wrap')!;
  if (hud.bossName) {
    bossWrap.classList.remove('hidden');
    document.getElementById('boss-name')!.textContent = hud.bossName;
    document.getElementById('boss-hp-num')!.textContent = `${hud.bossHp}`;
    document.getElementById('boss-hp-fill')!.style.width = `${(hud.bossHp / hud.bossMaxHp) * 100}%`;
  } else {
    bossWrap.classList.add('hidden');
  }
}

function showLevelUpChoices(choices: Array<{ patch: PatchDef; nextLevel: number }>): void {
  const wrap = document.getElementById('patch-cards')!;
  wrap.innerHTML = '';
  for (const item of choices) {
    const card = document.createElement('button');
    card.className = 'patch-card';
    card.style.borderColor = item.patch.color;
    const stars = '★'.repeat(item.nextLevel) + '☆'.repeat(item.patch.maxLevel - item.nextLevel);
    card.innerHTML = `
      ${item.nextLevel === 1 ? '<span class="patch-new-tag">NEW!</span>' : ''}
      <div class="patch-icon">${item.patch.icon}</div>
      <div>
        <h3>${item.patch.name}</h3>
        <div class="patch-sub">${item.patch.subtitle} • LV.${item.nextLevel}</div>
        <p class="patch-desc">${item.patch.description}</p>
      </div>
      <div class="patch-stars">${stars}</div>
    `;
    card.onclick = () => {
      levelupModal.classList.add('hidden');
      engine.applyPatch(item.patch.id);
    };
    wrap.appendChild(card);
  }
  levelupModal.classList.remove('hidden');
}

function showResultModal(victory: boolean, summary: HudSnapshot): void {
  // Save earned yellow buttons, character EXP & stage unlocks!
  save.buttons += summary.buttons;
  save.bestKills = Math.max(save.bestKills, summary.kills);

  const diffDef = getDifficultyDef(summary.difficultyId);
  const baseCharXp = Math.round(
    summary.kills * 1.2 + summary.level * 12 + (victory ? 45 + summary.stageIndex * 10 : 10)
  );
  const earnedCharXp = Math.max(10, Math.round(baseCharXp * diffDef.rewardMult));
  const charXpRes = grantCharXp(save, summary.charId, earnedCharXp);
  const playedChar = ZOMBIE_CHARACTERS.find((c) => c.id === summary.charId) || ZOMBIE_CHARACTERS[0];

  const curStage = STAGES.find((s) => s.index === summary.stageIndex);
  let newlyUnlockedStage: (typeof STAGES)[number] | null = null;
  let justClearedSpecial = false;

  if (victory) {
    save.totalClears += 1;
    if (curStage?.isSpecialStage) {
      save.specialStageCleared = true;
      save.unlockedStageIndex = STAGES.length;
      justClearedSpecial = true;
    } else if (summary.stageIndex >= save.unlockedStageIndex && summary.stageIndex < STAGES.length) {
      save.unlockedStageIndex = summary.stageIndex + 1;
      newlyUnlockedStage = STAGES.find((s) => s.index === save.unlockedStageIndex) || null;
    }
  }
  writeSave(save);

  const nextStageDef = STAGES.find((s) => s.index === summary.stageIndex + 1) || null;
  const diffPrefix = `[${diffDef.label}] `;

  if (victory && justClearedSpecial) {
    document.getElementById('result-title')!.textContent = '🎉 ALL STAGES COMPLETE!!';
    document.getElementById('result-sub')!.textContent =
      `${diffPrefix}特別ステージ完全制覇！今後すべてのステージを自由に選んで遊べます！`;
  } else if (victory && newlyUnlockedStage?.isSpecialStage) {
    document.getElementById('result-title')!.textContent = '🌟 全12ステージ制覇!!';
    document.getElementById('result-sub')!.textContent =
      `${diffPrefix}すべてのボスが現れる「★特別ステージ：全12大ボス総進撃」が開放されました！`;
  } else if (victory && newlyUnlockedStage) {
    document.getElementById('result-title')!.textContent = 'STAGE CLEAR!!';
    document.getElementById('result-sub')!.textContent =
      `${diffPrefix}${summary.stageName} 制覇！ → 「${newlyUnlockedStage.name}」が開放されました！`;
  } else {
    document.getElementById('result-title')!.textContent = victory ? 'STAGE CLEAR!!' : 'ワタが尽きた…';
    document.getElementById('result-sub')!.textContent = victory
      ? `${diffPrefix}${summary.stageName} 制覇！`
      : `${diffPrefix}集めたボタンやキャラ経験値で強化してリベンジだ！`;
  }

  document.getElementById('res-time')!.textContent = formatTime(summary.elapsed);
  document.getElementById('res-kills')!.textContent = `${summary.kills}`;
  document.getElementById('res-level')!.textContent = `LV.${summary.level}`;
  document.getElementById('res-buttons')!.textContent = `+${summary.buttons} 🟡`;

  const growthEl = document.getElementById('res-char-growth')!;
  const isMaxLv = charXpRes.newLevel >= MAX_CHAR_LEVEL;
  const expPct = isMaxLv ? 100 : Math.min(100, Math.round((charXpRes.xp / charXpRes.xpNext) * 100));
  growthEl.innerHTML = `
    <div class="growth-head">
      <div class="growth-char">
        <img src="${playedChar.portrait}" alt="${playedChar.name}" />
        <span>${playedChar.name}</span>
      </div>
      <div class="growth-lv">
        ${
          charXpRes.leveledUp
            ? `<span class="growth-lvup-tag">LEVEL UP!</span> LV.${charXpRes.prevLevel} → <strong>LV.${charXpRes.newLevel}</strong>`
            : `<strong>LV.${charXpRes.newLevel}</strong>`
        }
        <span class="growth-xp-gain">+${charXpRes.gainedXp} EXP</span>
      </div>
    </div>
    <div class="char-exp-row">
      <div class="char-exp-track"><div class="char-exp-fill" style="width:${expPct}%"></div></div>
      <span class="char-exp-label">${isMaxLv ? 'MAX LV' : `${charXpRes.xp}/${charXpRes.xpNext}`}</span>
    </div>
  `;

  const nextBtn = document.getElementById('btn-next-stage')!;
  if (victory && nextStageDef) {
    nextBtn.textContent = nextStageDef.isSpecialStage
      ? '🔥 特別ステージ（全ボス戦）へ挑む！'
      : `次のステージへ (${nextStageDef.name.split('：')[0]})`;
    nextBtn.classList.remove('hidden');
  } else {
    nextBtn.classList.add('hidden');
  }

  resultModal.classList.remove('hidden');
}

function spawnFloatingText(x: number, y: number, text: string, color: string, isCrit = false): void {
  if (floatingLayer.childElementCount > 26) return;
  const el = document.createElement('div');
  el.className = `float-dmg ${isCrit ? 'crit' : ''}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  el.textContent = text;
  floatingLayer.appendChild(el);
  setTimeout(() => el.remove(), 680);
}

function handlePlayButton(): void {
  sound.unlock();
  const charDef = ZOMBIE_CHARACTERS.find((c) => c.id === selectedCharId) || ZOMBIE_CHARACTERS[0];
  if (!save.unlockedChars.includes(charDef.id)) {
    if (save.buttons >= charDef.unlockCost) {
      save.buttons -= charDef.unlockCost;
      save.unlockedChars.push(charDef.id);
      writeSave(save);
      sound.playLevelUp();
      renderLobby();
    } else {
      shopTab = 'chars';
      renderShop();
      shopModal.classList.remove('hidden');
    }
    return;
  }
  startGame();
}

function startGame(): void {
  sound.unlock();
  const charDef = ZOMBIE_CHARACTERS.find((c) => c.id === selectedCharId) || ZOMBIE_CHARACTERS[0];
  (document.getElementById('hud-avatar') as HTMLImageElement).src = charDef.portrait;
  lobbyOverlay.classList.add('hidden');
  resultModal.classList.add('hidden');
  pauseModal.classList.add('hidden');
  levelupModal.classList.add('hidden');
  hudOverlay.classList.remove('hidden');
  updateAutoBtnVisual();
  engine.startRun(selectedCharId, selectedStageId, autoAttackMode, save, selectedDifficulty);
}

function updateAutoBtnVisual(): void {
  const dot = document.getElementById('mode-dot')!;
  const lbl = document.getElementById('mode-label')!;
  const hudAuto = document.getElementById('btn-hud-auto')!;
  if (autoAttackMode) {
    dot.classList.remove('manual');
    lbl.textContent = '片手オート攻撃: ON';
    hudAuto.textContent = '⚡';
  } else {
    dot.classList.add('manual');
    lbl.textContent = '本格手動アクション: ON';
    hudAuto.textContent = '✊';
  }
}

function syncMuteButtons(): void {
  const m = sound.isMuted();
  document.getElementById('btn-lobby-mute')!.textContent = m ? '🔇 BGM OFF' : '🔊 BGM ON';
  document.getElementById('btn-hud-mute')!.textContent = m ? '🔇' : '🔊';
}

// Button bindings
document.getElementById('btn-play')!.onclick = handlePlayButton;
document.getElementById('btn-retry')!.onclick = startGame;
document.getElementById('btn-next-stage')!.onclick = () => {
  resultModal.classList.add('hidden');
  const nextStageIdx = STAGES.findIndex((s) => s.id === selectedStageId) + 1;
  if (nextStageIdx >= 0 && nextStageIdx < STAGES.length) {
    selectedStageId = STAGES[nextStageIdx].id;
    engine.advanceToNextStage();
  } else {
    hudOverlay.classList.add('hidden');
    lobbyOverlay.classList.remove('hidden');
    engine.returnToLobby();
    renderLobby();
  }
};
document.getElementById('btn-to-lobby')!.onclick = () => {
  resultModal.classList.add('hidden');
  hudOverlay.classList.add('hidden');
  lobbyOverlay.classList.remove('hidden');
  // Automatically select the newly unlocked stage in lobby for convenience
  const latestStage = STAGES.find((s) => s.index === save.unlockedStageIndex);
  if (latestStage && !save.specialStageCleared) {
    selectedStageId = latestStage.id;
    engine.setLobbyStage(selectedStageId);
  }
  engine.returnToLobby();
  renderLobby();
};

document.getElementById('btn-mode-toggle')!.onclick = () => {
  autoAttackMode = !autoAttackMode;
  updateAutoBtnVisual();
};

document.getElementById('btn-hud-auto')!.onclick = () => {
  autoAttackMode = !autoAttackMode;
  engine.autoAttack = autoAttackMode;
  updateAutoBtnVisual();
};

const handleMute = () => {
  sound.toggleMute();
  syncMuteButtons();
};
document.getElementById('btn-lobby-mute')!.onclick = handleMute;
document.getElementById('btn-hud-mute')!.onclick = handleMute;

document.getElementById('btn-hud-pause')!.onclick = () => {
  engine.setPaused(true);
  pauseModal.classList.remove('hidden');
};
document.getElementById('btn-resume')!.onclick = () => {
  pauseModal.classList.add('hidden');
  engine.setPaused(false);
};
document.getElementById('btn-quit')!.onclick = () => {
  pauseModal.classList.add('hidden');
  hudOverlay.classList.add('hidden');
  lobbyOverlay.classList.remove('hidden');
  engine.returnToLobby();
  renderLobby();
};

document.getElementById('btn-shop')!.onclick = () => {
  renderShop();
  shopModal.classList.remove('hidden');
};
document.getElementById('btn-close-shop')!.onclick = () => {
  shopModal.classList.add('hidden');
};
document.getElementById('tab-upgrades')!.onclick = () => {
  shopTab = 'upgrades';
  renderShop();
};
document.getElementById('tab-chars')!.onclick = () => {
  shopTab = 'chars';
  renderShop();
};

// Action buttons
document.getElementById('btn-attack')!.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  sound.unlock();
  engine.triggerPrimaryAttack(true);
});
document.getElementById('btn-dash')!.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  sound.unlock();
  engine.triggerDash();
});
document.getElementById('btn-fever')!.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  sound.unlock();
  engine.triggerFever();
});

// Virtual Joystick
const joyZone = document.getElementById('joystick-zone')!;
const joyKnob = document.getElementById('joystick-knob')!;
let joyPointerId: number | null = null;
let joyCenterX = 0;
let joyCenterY = 0;
const MAX_JOY_R = 42;

joyZone.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  sound.unlock();
  joyPointerId = e.pointerId;
  joyZone.setPointerCapture(e.pointerId);
  const rect = joyZone.getBoundingClientRect();
  joyCenterX = rect.left + rect.width / 2;
  joyCenterY = rect.top + rect.height / 2;
  updateJoystick(e.clientX, e.clientY);
});

joyZone.addEventListener('pointermove', (e) => {
  if (e.pointerId !== joyPointerId) return;
  updateJoystick(e.clientX, e.clientY);
});

const resetJoystick = (e: PointerEvent) => {
  if (e.pointerId !== joyPointerId) return;
  joyPointerId = null;
  joyKnob.style.transform = 'translate(0px, 0px)';
  engine.setJoystick(0, 0);
};
joyZone.addEventListener('pointerup', resetJoystick);
joyZone.addEventListener('pointercancel', resetJoystick);

function updateJoystick(clientX: number, clientY: number): void {
  const dx = clientX - joyCenterX;
  const dy = clientY - joyCenterY;
  const dist = Math.hypot(dx, dy);
  const clamped = Math.min(MAX_JOY_R, dist);
  const angle = Math.atan2(dy, dx);
  const kx = Math.cos(angle) * clamped;
  const ky = Math.sin(angle) * clamped;
  joyKnob.style.transform = `translate(${kx}px, ${ky}px)`;
  engine.setJoystick(kx / MAX_JOY_R, ky / MAX_JOY_R);
}

engine.setLobbyStage(selectedStageId);
renderLobby();
syncMuteButtons();
