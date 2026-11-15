export interface ZombieCharDef {
  id: string;
  name: string;
  role: string;
  tagline: string;
  portrait: string;
  primaryColor: string;
  accentColor: string;
  hp: number;
  speed: number;
  attackPower: number;
  attackCooldown: number;
  attackRange: number;
  startingPatch: string;
  specialName: string;
  specialDesc: string;
  playable: boolean;
}

export const ZOMBIE_CHARACTERS: ZombieCharDef[] = [
  {
    id: 'red_hatter',
    name: 'レッド・ハッター',
    role: 'スピード / ストライカー',
    tagline: '長靴キックと回転蹴りで群れを蹴散らす突撃隊長！',
    portrait: './assets/chars/red_hatter.png',
    primaryColor: '#d94848',
    accentColor: '#4c78b8',
    hp: 100,
    speed: 9.2,
    attackPower: 26,
    attackCooldown: 0.42,
    attackRange: 3.4,
    startingPatch: 'banana_slip',
    specialName: 'ブーツ・スピンラッシュ',
    specialDesc: '周囲を高速回転キックでなぎ払い、敵を吹き飛ばす！',
    playable: true,
  },
  {
    id: 'blue_partin',
    name: 'ブルーパーティン',
    role: 'パワー / タンク',
    tagline: '三角コーン突進と巨体スマッシュで敵陣を粉砕！',
    portrait: './assets/chars/blue_partin.png',
    primaryColor: '#2ea3dc',
    accentColor: '#f28c28',
    hp: 145,
    speed: 7.8,
    attackPower: 34,
    attackCooldown: 0.58,
    attackRange: 4.0,
    startingPatch: 'cotton_padding',
    specialName: 'コーン・メテオスマッシュ',
    specialDesc: '地面を叩き割る衝撃波で広範囲の敵をスタン＆撃破！',
    playable: true,
  },
  {
    id: 'green_glassy',
    name: 'グリーン博士・グラッシー',
    role: 'テック / 遠距離',
    tagline: 'ゾンビ図鑑の魔弾とびっくりチキンで戦場を制圧！',
    portrait: './assets/chars/green_glassy.png',
    primaryColor: '#7fb363',
    accentColor: '#f2c94c',
    hp: 95,
    speed: 8.4,
    attackPower: 22,
    attackCooldown: 0.48,
    attackRange: 8.5,
    startingPatch: 'chicken_honk',
    specialName: 'チキン・ソニックウェーブ',
    specialDesc: '図鑑魔弾連射＋ラバーチキンの音波で敵を吹き飛ばす！',
    playable: true,
  },
  {
    id: 'purple_chef',
    name: 'パープルシェフ・モグリオ',
    role: 'グラップル / トルネード',
    tagline: 'バネ腕の泡立て器トルネードと焼きたてパンで無双！',
    portrait: './assets/chars/purple_chef.png',
    primaryColor: '#7a48a6',
    accentColor: '#4e8f54',
    hp: 115,
    speed: 8.2,
    attackPower: 25,
    attackCooldown: 0.5,
    attackRange: 4.4,
    startingPatch: 'spring_whisk',
    specialName: 'バネ腕・ミキサーストーム',
    specialDesc: '巨大なバネ腕を振り回し周囲を巻き込み回復パンを生成！',
    playable: true,
  },
];

export const ALL_CAST_GALLERY = [
  { id: 'red_hatter', name: 'レッド・ハッター', role: 'スピード', portrait: './assets/chars/red_hatter.png' },
  { id: 'blue_partin', name: 'ブルーパーティン', role: 'パワー', portrait: './assets/chars/blue_partin.png' },
  { id: 'green_glassy', name: 'グリーン博士・グラッシー', role: 'テック', portrait: './assets/chars/green_glassy.png' },
  { id: 'purple_chef', name: 'パープルシェフ・モグリオ', role: 'バネ腕', portrait: './assets/chars/purple_chef.png' },
  { id: 'captain_patch', name: 'キャプテン・パッチ', role: 'ボス / 魔術師', portrait: './assets/chars/captain_patch.png' },
  { id: 'polka_pippin', name: 'ポルカ・ピピン', role: '目玉ジャグラー', portrait: './assets/chars/polka_pippin.png' },
  { id: 'orange_cheney', name: 'オレンジ・チェイニー', role: 'バット強打', portrait: './assets/chars/orange_cheney.png' },
  { id: 'yellow_stripes', name: 'イエロー・ストライプス', role: 'ドラム連打', portrait: './assets/chars/yellow_stripes.png' },
  { id: 'green_prof', name: 'グリーン・プロフェッサー', role: '毒フラスコ', portrait: './assets/chars/green_prof.png' },
  { id: 'mummy_wrapple', name: 'ミイラ・ラップル', role: '包帯＆ランタン', portrait: './assets/chars/mummy_wrapple.png' },
  { id: 'brains_blossom', name: 'ブレインズ・ブロッサム', role: '回復スイーツ', portrait: './assets/chars/brains_blossom.png' },
  { id: 'scarf_miina', name: 'スカーフのミイナ', role: 'クマ人形召喚', portrait: './assets/chars/scarf_miina.png' },
];
