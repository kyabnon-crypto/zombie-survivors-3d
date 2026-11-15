export interface StageDef {
  id: string;
  index: number;
  name: string;
  subtitle: string;
  description: string;
  skyColor: number;
  fogColor: number;
  floorBaseColor: string;
  floorPatchColors: string[];
  borderColor: number;
  bossKind: 'boss_patch' | 'boss_chef' | 'boss_prof';
  bossName: string;
  bossHp: number;
  bossSpawnTime: number; // seconds into stage
  enemyHpMult: number;
  bgmUrl: string;
  bossBgmUrl: string;
  feverBgmUrl: string;
  rewardButtons: number;
}

export const STAGES: StageDef[] = [
  {
    id: 'graveyard',
    index: 1,
    name: 'STAGE 1：月夜の墓場',
    subtitle: 'MOONLIT GRAVEYARD',
    description: 'キートリオが目覚めた月夜のフェルト墓地。まずはここから！',
    skyColor: 0x0c162b,
    fogColor: 0x0f1c36,
    floorBaseColor: '#1f3b32',
    floorPatchColors: ['#24463b', '#1b332b', '#2b5244', '#182d27'],
    borderColor: 0x3d3247,
    bossKind: 'boss_patch',
    bossName: '暴走キャプテン・パッチ',
    bossHp: 1350,
    bossSpawnTime: 65,
    enemyHpMult: 1.0,
    bgmUrl: './assets/audio/theme_main.mp3',
    bossBgmUrl: './assets/audio/theme_fever.mp3',
    feverBgmUrl: './assets/audio/theme_fever.mp3',
    rewardButtons: 20,
  },
  {
    id: 'kitchen',
    index: 2,
    name: 'STAGE 2：怪奇キッチン中庭',
    subtitle: 'SPOOKY KITCHEN COURTYARD',
    description: 'チェッカー模様の布タイルと巨大パンが並ぶ魔女の厨房！',
    skyColor: 0x1b1128,
    fogColor: 0x261638,
    floorBaseColor: '#3a2b3d',
    floorPatchColors: ['#4c3850', '#312335', '#5a4358', '#2a1e2e'],
    borderColor: 0x704352,
    bossKind: 'boss_chef',
    bossName: '巨大モグリオ・ザ・マッドシェフ',
    bossHp: 1950,
    bossSpawnTime: 70,
    enemyHpMult: 1.35,
    bgmUrl: './assets/audio/theme_main.mp3',
    bossBgmUrl: './assets/audio/theme_fever.mp3',
    feverBgmUrl: './assets/audio/theme_fever.mp3',
    rewardButtons: 35,
  },
  {
    id: 'lab',
    index: 3,
    name: 'STAGE 3：呪いの研究所',
    subtitle: 'ALCHEMIST LAB',
    description: '怪しい緑のフラスコと蛍光結晶が光り輝く最終決戦場！',
    skyColor: 0x081d1b,
    fogColor: 0x0d2b27,
    floorBaseColor: '#193136',
    floorPatchColors: ['#214147', '#13262b', '#274d46', '#112226'],
    borderColor: 0x2f695b,
    bossKind: 'boss_prof',
    bossName: '暴走グリーン・プロフェッサーΩ',
    bossHp: 2700,
    bossSpawnTime: 75,
    enemyHpMult: 1.75,
    bgmUrl: './assets/audio/theme_main.mp3',
    bossBgmUrl: './assets/audio/theme_fever.mp3',
    feverBgmUrl: './assets/audio/theme_fever.mp3',
    rewardButtons: 60,
  },
];
