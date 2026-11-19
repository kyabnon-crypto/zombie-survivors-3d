export type DifficultyId = 'easy' | 'normal' | 'hard';

export interface DifficultyDef {
  id: DifficultyId;
  label: string;
  jpLabel: string;
  icon: string;
  color: string;
  summary: string;
  enemyHpMult: number;
  bossHpMult: number;
  enemyDamageMult: number;
  enemySpeedMult: number;
  spawnIntervalMult: number;
  maxEnemiesMult: number;
  bossActionIntervalMult: number;
  bossBulletSpeedMult: number;
  bossRingBulletCount: number;
  rewardMult: number;
}

export const DEFAULT_DIFFICULTY: DifficultyId = 'normal';

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: 'easy',
    label: 'EASY',
    jpLabel: 'やさしい',
    icon: '🌱',
    color: '#5eb83c',
    summary: '敵よわめ • 報酬 0.85x',
    enemyHpMult: 0.72,
    bossHpMult: 0.75,
    enemyDamageMult: 0.7,
    enemySpeedMult: 0.9,
    spawnIntervalMult: 1.22,
    maxEnemiesMult: 0.8,
    bossActionIntervalMult: 1.25,
    bossBulletSpeedMult: 0.85,
    bossRingBulletCount: 8,
    rewardMult: 0.85,
  },
  {
    id: 'normal',
    label: 'NORMAL',
    jpLabel: 'ふつう',
    icon: '⚔️',
    color: '#3ac7e8',
    summary: '標準バランス • 報酬 1.0x',
    enemyHpMult: 1.0,
    bossHpMult: 1.0,
    enemyDamageMult: 1.0,
    enemySpeedMult: 1.0,
    spawnIntervalMult: 1.0,
    maxEnemiesMult: 1.0,
    bossActionIntervalMult: 1.0,
    bossBulletSpeedMult: 1.0,
    bossRingBulletCount: 12,
    rewardMult: 1.0,
  },
  {
    id: 'hard',
    label: 'HARD',
    jpLabel: 'むずかしい',
    icon: '🔥',
    color: '#ff5268',
    summary: '敵つよめ • 報酬 1.5x',
    enemyHpMult: 1.45,
    bossHpMult: 1.5,
    enemyDamageMult: 1.4,
    enemySpeedMult: 1.14,
    spawnIntervalMult: 0.78,
    maxEnemiesMult: 1.3,
    bossActionIntervalMult: 0.78,
    bossBulletSpeedMult: 1.18,
    bossRingBulletCount: 16,
    rewardMult: 1.5,
  },
];

export function isDifficultyId(value: unknown): value is DifficultyId {
  return value === 'easy' || value === 'normal' || value === 'hard';
}

export function getDifficultyDef(id?: string): DifficultyDef {
  return DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[1];
}
