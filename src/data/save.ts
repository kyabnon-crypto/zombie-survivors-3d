import { DEFAULT_DIFFICULTY, isDifficultyId, type DifficultyId } from './difficulty';

export interface ShopUpgradeDef {
  id: 'atk' | 'hp' | 'spd' | 'magnet' | 'xpMult' | 'btnMult';
  name: string;
  icon: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
}

export const SHOP_UPGRADES: ShopUpgradeDef[] = [
  { id: 'atk', name: 'ワタパワー', icon: '💪', desc: '全攻撃ダメージ +10%/Lv', maxLevel: 5, baseCost: 8, costStep: 8 },
  { id: 'hp', name: 'ふかふか耐久', icon: '❤️', desc: '初期最大HP +20/Lv', maxLevel: 5, baseCost: 8, costStep: 8 },
  { id: 'spd', name: 'ステッチ足', icon: '👟', desc: '移動速度 +6%/Lv', maxLevel: 5, baseCost: 10, costStep: 10 },
  { id: 'magnet', name: 'ボタン磁石', icon: '🧲', desc: '回収範囲 +20%/Lv', maxLevel: 5, baseCost: 8, costStep: 8 },
  { id: 'xpMult', name: 'ひらめき糸', icon: '🌟', desc: '獲得XP +12%/Lv', maxLevel: 5, baseCost: 10, costStep: 10 },
  { id: 'btnMult', name: '黄金ボタン運', icon: '🟡', desc: '獲得ボタン +25%/Lv', maxLevel: 5, baseCost: 12, costStep: 12 },
];

export const MAX_CHAR_LEVEL = 20;

export interface CharProgress {
  level: number;
  xp: number;
}

export interface CharXpGrantResult {
  prevLevel: number;
  newLevel: number;
  xp: number;
  xpNext: number;
  gainedXp: number;
  leveledUp: boolean;
}

export interface SaveData {
  buttons: number;
  unlockedChars: string[];
  unlockedStageIndex: number; // 1..13 (1..12 normal stages, 13 = special all-bosses stage)
  specialStageCleared: boolean;
  upgrades: Record<string, number>;
  difficulty: DifficultyId;
  charProgress: Record<string, CharProgress>;
  bestKills: number;
  totalClears: number;
}

const STORAGE_KEY = 'zombie_survivors_3d_save_v1';

const DEFAULT_SAVE: SaveData = {
  buttons: 20, // Give a small starter pouch so players can try the Shop right away!
  unlockedChars: ['red_hatter', 'blue_partin', 'green_glassy', 'purple_chef'],
  unlockedStageIndex: 1,
  specialStageCleared: false,
  upgrades: { atk: 0, hp: 0, spd: 0, magnet: 0, xpMult: 0, btnMult: 0 },
  difficulty: DEFAULT_DIFFICULTY,
  charProgress: {},
  bestKills: 0,
  totalClears: 0,
};

function sanitizeCharProgress(raw: unknown): Record<string, CharProgress> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, CharProgress> = {};
  for (const [charId, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue;
    const rec = val as Partial<CharProgress>;
    const level = Math.max(1, Math.min(MAX_CHAR_LEVEL, Math.floor(typeof rec.level === 'number' ? rec.level : 1)));
    const xp = Math.max(0, Math.floor(typeof rec.xp === 'number' ? rec.xp : 0));
    result[charId] = { level, xp: level >= MAX_CHAR_LEVEL ? 0 : xp };
  }
  return result;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      buttons: typeof parsed.buttons === 'number' ? parsed.buttons : DEFAULT_SAVE.buttons,
      unlockedChars: Array.isArray(parsed.unlockedChars)
        ? Array.from(new Set([...DEFAULT_SAVE.unlockedChars, ...parsed.unlockedChars]))
        : [...DEFAULT_SAVE.unlockedChars],
      unlockedStageIndex: Math.max(1, Math.min(13, parsed.unlockedStageIndex || 1)),
      specialStageCleared: Boolean(parsed.specialStageCleared),
      upgrades: { ...DEFAULT_SAVE.upgrades, ...(parsed.upgrades || {}) },
      difficulty: isDifficultyId(parsed.difficulty) ? parsed.difficulty : DEFAULT_DIFFICULTY,
      charProgress: sanitizeCharProgress(parsed.charProgress),
      bestKills: parsed.bestKills || 0,
      totalClears: parsed.totalClears || 0,
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function getUpgradeCost(def: ShopUpgradeDef, curLevel: number): number {
  return def.baseCost + curLevel * def.costStep;
}

export function getCharXpForNextLevel(level: number): number {
  return Math.round(80 * Math.pow(1.25, Math.max(0, level - 1)));
}

export function getCharLevelUpCost(level: number): number {
  return 12 + Math.max(0, level - 1) * 8;
}

export function getCharProgress(save: SaveData, charId: string): CharProgress {
  const existing = save.charProgress[charId];
  if (existing) {
    return {
      level: Math.max(1, Math.min(MAX_CHAR_LEVEL, existing.level)),
      xp: existing.level >= MAX_CHAR_LEVEL ? 0 : Math.max(0, existing.xp),
    };
  }
  return { level: 1, xp: 0 };
}

export function grantCharXp(save: SaveData, charId: string, gainedXp: number): CharXpGrantResult {
  const cur = getCharProgress(save, charId);
  const prevLevel = cur.level;
  let level = cur.level;
  let xp = cur.xp + Math.max(0, Math.round(gainedXp));

  while (level < MAX_CHAR_LEVEL) {
    const needed = getCharXpForNextLevel(level);
    if (xp < needed) break;
    xp -= needed;
    level += 1;
  }

  if (level >= MAX_CHAR_LEVEL) {
    level = MAX_CHAR_LEVEL;
    xp = 0;
  }

  save.charProgress[charId] = { level, xp };
  return {
    prevLevel,
    newLevel: level,
    xp,
    xpNext: getCharXpForNextLevel(level),
    gainedXp: Math.max(0, Math.round(gainedXp)),
    leveledUp: level > prevLevel,
  };
}

