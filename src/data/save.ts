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

export interface SaveData {
  buttons: number;
  unlockedChars: string[];
  unlockedStageIndex: number; // 1..13 (1..12 normal stages, 13 = special all-bosses stage)
  specialStageCleared: boolean;
  upgrades: Record<string, number>;
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
  bestKills: 0,
  totalClears: 0,
};

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
