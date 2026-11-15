import './style.css';
import { ZOMBIE_CHARACTERS } from './data/characters';
import type { PatchDef } from './data/patches';
import { STAGES } from './data/stages';
import { getUpgradeCost, loadSave, SHOP_UPGRADES, writeSave } from './data/save';
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
            <div class="logo-sub">全12体プレイアブル • 3ステージ墓場無双</div>
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
          <button id="btn-mode-toggle" class="mode-toggle">
            <span id="mode-dot" class="mode-dot"></span>
            <span id="mode-label">片手オート攻撃: ON</span>
          </button>
          <button id="btn-play" class="play-btn">PLAY!</button>
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
          <button id="tab-chars" class="shop-tab">🧸 全12キャラ解放</button>
        </div>
        <div id="shop-grid" class="shop-grid"></div>
      </div>
    </div>
  </div>
`;

const sound = new SoundEngine();
let save = loadSave();
let selectedCharId = ZOMBIE_CHARACTERS[0].id;
let selectedStageId = STAGES[0].id;
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

function renderLobby(): void {
  document.getElementById('lobby-btn-count')!.textContent = `${save.buttons}`;

  // Stage strip
  const stageStrip = document.getElementById('stage-strip')!;
  stageStrip.innerHTML = '';
  for (const st of STAGES) {
    const unlocked = st.index <= save.unlockedStageIndex;
    const btn = document.createElement('button');
    btn.className = `stage-chip ${st.id === selectedStageId ? 'active' : ''} ${unlocked ? '' : 'locked'}`;
    btn.textContent = unlocked ? st.name : `🔒 ${st.name}`;
    btn.onclick = () => {
      if (!unlocked) return;
      selectedStageId = st.id;
      engine.setLobbyStage(st.id);
      renderLobby();
    };
    stageStrip.appendChild(btn);
  }

  // Character Info
  const charDef = ZOMBIE_CHARACTERS.find((c) => c.id === selectedCharId) || ZOMBIE_CHARACTERS[0];
  const isUnlocked = save.unlockedChars.includes(charDef.id);
  const infoCard = document.getElementById('char-info-card')!;
  infoCard.innerHTML = `
    <img class="char-info-portrait" src="${charDef.portrait}" alt="${charDef.name}" />
    <div class="char-info-text">
      <h2>${charDef.name} ${isUnlocked ? '' : `🔒 (${charDef.unlockCost} 🟡)`}</h2>
      <span class="char-role-tag">${charDef.role}</span>
      <p>${charDef.tagline}</p>
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
    const btn = document.createElement('button');
    btn.className = `char-avatar-btn ${c.id === selectedCharId ? 'active' : ''} ${unlocked ? '' : 'locked'}`;
    btn.innerHTML = `
      <img src="${c.portrait}" alt="${c.name}" />
      ${unlocked ? '' : `<span class="char-lock-badge">${c.unlockCost}🟡</span>`}
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
      const canBuy = !unlocked && save.buttons >= c.unlockCost;
      const card = document.createElement('div');
      card.className = 'shop-item';
      card.innerHTML = `
        <div class="shop-item-head">
          <img src="${c.portrait}" alt="${c.name}" />
          <div>
            <div style="font-weight:900; font-size:13px;">${c.name}</div>
            <div style="font-size:10px; color:#ffd875;">${c.role}</div>
          </div>
        </div>
        <div style="font-size:11px; color:#d7e0f2;">${c.tagline}</div>
        <button class="shop-buy-btn" ${unlocked || !canBuy ? 'disabled' : ''}>
          ${unlocked ? '解放済み ✓' : `アンロック (${c.unlockCost} 🟡)`}
        </button>
      `;
      card.querySelector('button')!.onclick = () => {
        if (!canBuy) return;
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
  document.getElementById('hud-wave')!.textContent = `ST${hud.stageIndex} • WAVE ${hud.wave} • ${formatTime(hud.elapsed)}`;
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
  // Save earned yellow buttons & stage unlocks!
  save.buttons += summary.buttons;
  save.bestKills = Math.max(save.bestKills, summary.kills);
  if (victory) {
    save.totalClears += 1;
    if (summary.stageIndex >= save.unlockedStageIndex && summary.stageIndex < STAGES.length) {
      save.unlockedStageIndex = summary.stageIndex + 1;
    }
  }
  writeSave(save);

  document.getElementById('result-title')!.textContent = victory ? 'STAGE CLEAR!!' : 'ワタが尽きた…';
  document.getElementById('result-sub')!.textContent = victory
    ? `${summary.stageName} 制覇！`
    : '集めたボタンで強化してリベンジだ！';
  document.getElementById('res-time')!.textContent = formatTime(summary.elapsed);
  document.getElementById('res-kills')!.textContent = `${summary.kills}`;
  document.getElementById('res-level')!.textContent = `LV.${summary.level}`;
  document.getElementById('res-buttons')!.textContent = `+${summary.buttons} 🟡`;

  const nextBtn = document.getElementById('btn-next-stage')!;
  if (victory && summary.hasNextStage) {
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
  engine.startRun(selectedCharId, selectedStageId, autoAttackMode, save);
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
  if (nextStageIdx < STAGES.length) {
    selectedStageId = STAGES[nextStageIdx].id;
  }
  engine.advanceToNextStage();
};
document.getElementById('btn-to-lobby')!.onclick = () => {
  resultModal.classList.add('hidden');
  hudOverlay.classList.add('hidden');
  lobbyOverlay.classList.remove('hidden');
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

renderLobby();
syncMuteButtons();
