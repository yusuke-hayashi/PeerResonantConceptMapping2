/**
 * Seed data for testing the comparison feature
 * Theme: Photosynthesis Process
 *
 * Concept Map Structure:
 * - Noun nodes and Verb nodes are both represented as nodes
 * - Links connect: [Noun] <--(何が)-- [Verb] --(何を)--> [Noun]
 * - A proposition is formed by: Subject(noun) → Action(verb) → Object(noun)
 *
 * Link Labels (based on docs/conceptmap/specification.md):
 * - 何が: Subject of action (動作の主体)
 * - 何を: Object of action (動作の対象)
 * - 何に: Recipient/destination (動作の相手・到達先)
 * - どこで: Location (場所)
 * - いつ: Time (時間)
 */

import type { NodeType, LinkLabel } from './firestore';

export interface SeedUser {
  email: string;
  password: string;
  displayName: string;
  role: 'teacher' | 'student';
}

export interface SeedTopic {
  name: string;
  description: string;
}

export interface SeedNode {
  label: string;
  type: NodeType;
  x: number;
  y: number;
}

export interface SeedLink {
  sourceLabel: string;
  targetLabel: string;
  label: LinkLabel;
  relationship: string;
}

export interface SeedMap {
  title: string;
  isReference: boolean;
  ownerEmail: string;
  nodes: SeedNode[];
  links: SeedLink[];
}

// Test users
export const seedUsers: SeedUser[] = [
  {
    email: 'teacher@example.com',
    password: 'teacher123',
    displayName: '田中先生',
    role: 'teacher',
  },
  {
    email: 'student1@example.com',
    password: 'student123',
    displayName: '佐藤太郎',
    role: 'student',
  },
  {
    email: 'student2@example.com',
    password: 'student123',
    displayName: '鈴木花子',
    role: 'student',
  },
  {
    email: 'student3@example.com',
    password: 'student123',
    displayName: '高橋一郎',
    role: 'student',
  },
];

// Test topic
export const seedTopic: SeedTopic = {
  name: '光合成のプロセス',
  description: '植物が光エネルギーを使って二酸化炭素と水からグルコースと酸素を生成するプロセス',
};

// Teacher's reference map
// Structure: [Noun] → [Verb] → [Noun]
// Propositions:
// - 光合成 → 必要とする → 光エネルギー
// - 光合成 → 吸収する → 二酸化炭素
// - 光合成 → 使用する → 水
// - 光合成 → 生成する → グルコース
// - 光合成 → 放出する → 酸素
// - 光合成 → で行われる → 葉緑体
// - 葉緑体 → 含む → クロロフィル
// - クロロフィル → 吸収する → 光エネルギー
export const teacherMap: SeedMap = {
  title: '光合成のプロセス（見本）',
  isReference: true,
  ownerEmail: 'teacher@example.com',
  nodes: [
    // Noun nodes
    { label: '光合成', type: 'noun', x: 400, y: 300 },
    { label: '光エネルギー', type: 'noun', x: 400, y: 50 },
    { label: '二酸化炭素', type: 'noun', x: 100, y: 300 },
    { label: '水', type: 'noun', x: 200, y: 500 },
    { label: 'グルコース', type: 'noun', x: 700, y: 300 },
    { label: '酸素', type: 'noun', x: 600, y: 500 },
    { label: '葉緑体', type: 'noun', x: 400, y: 550 },
    { label: 'クロロフィル', type: 'noun', x: 600, y: 100 },
    // Verb nodes
    { label: '必要とする', type: 'verb', x: 400, y: 175 },
    { label: '吸収する', type: 'verb', x: 250, y: 300 },
    { label: '使用する', type: 'verb', x: 300, y: 400 },
    { label: '生成する', type: 'verb', x: 550, y: 300 },
    { label: '放出する', type: 'verb', x: 500, y: 400 },
    { label: 'で行われる', type: 'verb', x: 400, y: 425 },
    { label: '含む', type: 'verb', x: 500, y: 550 },
    { label: '吸収する2', type: 'verb', x: 500, y: 75 },
  ],
  links: [
    // 光合成 → 必要とする → 光エネルギー
    { sourceLabel: '光合成', targetLabel: '必要とする', label: '何が', relationship: '' },
    { sourceLabel: '必要とする', targetLabel: '光エネルギー', label: '何を', relationship: '' },
    // 光合成 → 吸収する → 二酸化炭素
    { sourceLabel: '光合成', targetLabel: '吸収する', label: '何が', relationship: '' },
    { sourceLabel: '吸収する', targetLabel: '二酸化炭素', label: '何を', relationship: '' },
    // 光合成 → 使用する → 水
    { sourceLabel: '光合成', targetLabel: '使用する', label: '何が', relationship: '' },
    { sourceLabel: '使用する', targetLabel: '水', label: '何を', relationship: '' },
    // 光合成 → 生成する → グルコース
    { sourceLabel: '光合成', targetLabel: '生成する', label: '何が', relationship: '' },
    { sourceLabel: '生成する', targetLabel: 'グルコース', label: '何を', relationship: '' },
    // 光合成 → 放出する → 酸素
    { sourceLabel: '光合成', targetLabel: '放出する', label: '何が', relationship: '' },
    { sourceLabel: '放出する', targetLabel: '酸素', label: '何を', relationship: '' },
    // 光合成 → で行われる → 葉緑体
    { sourceLabel: '光合成', targetLabel: 'で行われる', label: '何が', relationship: '' },
    { sourceLabel: 'で行われる', targetLabel: '葉緑体', label: 'どこで', relationship: '' },
    // 葉緑体 → 含む → クロロフィル
    { sourceLabel: '葉緑体', targetLabel: '含む', label: '何が', relationship: '' },
    { sourceLabel: '含む', targetLabel: 'クロロフィル', label: '何を', relationship: '' },
    // クロロフィル → 吸収する2 → 光エネルギー
    { sourceLabel: 'クロロフィル', targetLabel: '吸収する2', label: '何が', relationship: '' },
    { sourceLabel: '吸収する2', targetLabel: '光エネルギー', label: '何を', relationship: '' },
  ],
};

// Student 1's map (Sato Taro) - uses different terminology
// Propositions:
// - 光合成 → 使う → 太陽光
// - 光合成 → 取り込む → CO2
// - 光合成 → 必要 → 水
// - 光合成 → 作る → 糖
// - 光合成 → 出す → O2
// - 光合成 → で起きる → 葉っぱ
export const student1Map: SeedMap = {
  title: '光合成について',
  isReference: false,
  ownerEmail: 'student1@example.com',
  nodes: [
    // Noun nodes
    { label: '光合成', type: 'noun', x: 400, y: 300 },
    { label: '太陽光', type: 'noun', x: 400, y: 50 },
    { label: 'CO2', type: 'noun', x: 100, y: 300 },
    { label: '水', type: 'noun', x: 200, y: 500 },
    { label: '糖', type: 'noun', x: 700, y: 300 },
    { label: 'O2', type: 'noun', x: 600, y: 500 },
    { label: '葉っぱ', type: 'noun', x: 400, y: 550 },
    // Verb nodes
    { label: '使う', type: 'verb', x: 400, y: 175 },
    { label: '取り込む', type: 'verb', x: 250, y: 300 },
    { label: '必要', type: 'verb', x: 300, y: 400 },
    { label: '作る', type: 'verb', x: 550, y: 300 },
    { label: '出す', type: 'verb', x: 500, y: 400 },
    { label: 'で起きる', type: 'verb', x: 400, y: 425 },
  ],
  links: [
    // 光合成 → 使う → 太陽光
    { sourceLabel: '光合成', targetLabel: '使う', label: '何が', relationship: '' },
    { sourceLabel: '使う', targetLabel: '太陽光', label: '何を', relationship: '' },
    // 光合成 → 取り込む → CO2
    { sourceLabel: '光合成', targetLabel: '取り込む', label: '何が', relationship: '' },
    { sourceLabel: '取り込む', targetLabel: 'CO2', label: '何を', relationship: '' },
    // 光合成 → 必要 → 水
    { sourceLabel: '光合成', targetLabel: '必要', label: '何が', relationship: '' },
    { sourceLabel: '必要', targetLabel: '水', label: '何を', relationship: '' },
    // 光合成 → 作る → 糖
    { sourceLabel: '光合成', targetLabel: '作る', label: '何が', relationship: '' },
    { sourceLabel: '作る', targetLabel: '糖', label: '何を', relationship: '' },
    // 光合成 → 出す → O2
    { sourceLabel: '光合成', targetLabel: '出す', label: '何が', relationship: '' },
    { sourceLabel: '出す', targetLabel: 'O2', label: '何を', relationship: '' },
    // 光合成 → で起きる → 葉っぱ
    { sourceLabel: '光合成', targetLabel: 'で起きる', label: '何が', relationship: '' },
    { sourceLabel: 'で起きる', targetLabel: '葉っぱ', label: 'どこで', relationship: '' },
  ],
};

// Student 2's map (Suzuki Hanako) - relatively accurate with some additions
// Propositions:
// - 光合成 → 利用する → 光
// - 光合成 → 吸収する → 二酸化炭素
// - 光合成 → 使用する → 水
// - 光合成 → 作り出す → ブドウ糖
// - 光合成 → 放出する → 酸素
// - 光合成 → で行われる → 葉緑体
// - 葉緑体 → 持つ → 葉緑素
// - 気孔 → 取り入れる → 二酸化炭素
// - 気孔 → 放出する → 酸素
export const student2Map: SeedMap = {
  title: '植物の光合成',
  isReference: false,
  ownerEmail: 'student2@example.com',
  nodes: [
    // Noun nodes
    { label: '光合成', type: 'noun', x: 400, y: 300 },
    { label: '光', type: 'noun', x: 400, y: 50 },
    { label: '二酸化炭素', type: 'noun', x: 100, y: 300 },
    { label: '水', type: 'noun', x: 200, y: 500 },
    { label: 'ブドウ糖', type: 'noun', x: 700, y: 300 },
    { label: '酸素', type: 'noun', x: 600, y: 500 },
    { label: '葉緑体', type: 'noun', x: 300, y: 550 },
    { label: '葉緑素', type: 'noun', x: 500, y: 550 },
    { label: '気孔', type: 'noun', x: 100, y: 450 },
    // Verb nodes
    { label: '利用する', type: 'verb', x: 400, y: 175 },
    { label: '吸収する', type: 'verb', x: 250, y: 300 },
    { label: '使用する', type: 'verb', x: 300, y: 400 },
    { label: '作り出す', type: 'verb', x: 550, y: 300 },
    { label: '放出する', type: 'verb', x: 500, y: 400 },
    { label: 'で行われる', type: 'verb', x: 350, y: 425 },
    { label: '持つ', type: 'verb', x: 400, y: 550 },
    { label: '取り入れる', type: 'verb', x: 100, y: 375 },
    { label: '放出する2', type: 'verb', x: 350, y: 475 },
  ],
  links: [
    // 光合成 → 利用する → 光
    { sourceLabel: '光合成', targetLabel: '利用する', label: '何が', relationship: '' },
    { sourceLabel: '利用する', targetLabel: '光', label: '何を', relationship: '' },
    // 光合成 → 吸収する → 二酸化炭素
    { sourceLabel: '光合成', targetLabel: '吸収する', label: '何が', relationship: '' },
    { sourceLabel: '吸収する', targetLabel: '二酸化炭素', label: '何を', relationship: '' },
    // 光合成 → 使用する → 水
    { sourceLabel: '光合成', targetLabel: '使用する', label: '何が', relationship: '' },
    { sourceLabel: '使用する', targetLabel: '水', label: '何を', relationship: '' },
    // 光合成 → 作り出す → ブドウ糖
    { sourceLabel: '光合成', targetLabel: '作り出す', label: '何が', relationship: '' },
    { sourceLabel: '作り出す', targetLabel: 'ブドウ糖', label: '何を', relationship: '' },
    // 光合成 → 放出する → 酸素
    { sourceLabel: '光合成', targetLabel: '放出する', label: '何が', relationship: '' },
    { sourceLabel: '放出する', targetLabel: '酸素', label: '何を', relationship: '' },
    // 光合成 → で行われる → 葉緑体
    { sourceLabel: '光合成', targetLabel: 'で行われる', label: '何が', relationship: '' },
    { sourceLabel: 'で行われる', targetLabel: '葉緑体', label: 'どこで', relationship: '' },
    // 葉緑体 → 持つ → 葉緑素
    { sourceLabel: '葉緑体', targetLabel: '持つ', label: '何が', relationship: '' },
    { sourceLabel: '持つ', targetLabel: '葉緑素', label: '何を', relationship: '' },
    // 気孔 → 取り入れる → 二酸化炭素
    { sourceLabel: '気孔', targetLabel: '取り入れる', label: 'どこで', relationship: '' },
    { sourceLabel: '取り入れる', targetLabel: '二酸化炭素', label: '何を', relationship: '' },
    // 気孔 → 放出する2 → 酸素
    { sourceLabel: '気孔', targetLabel: '放出する2', label: 'どこで', relationship: '' },
    { sourceLabel: '放出する2', targetLabel: '酸素', label: '何を', relationship: '' },
  ],
};

// Student 3's map (Takahashi Ichiro) - incomplete with some errors
// Propositions:
// - 光合成 → あたる → 日光
// - 光合成 → 吸う → 炭酸ガス
// - 光合成 → いる → 水分
// - 光合成 → できる → でんぷん
// - 光合成 → だす → 空気
export const student3Map: SeedMap = {
  title: '光合成のしくみ',
  isReference: false,
  ownerEmail: 'student3@example.com',
  nodes: [
    // Noun nodes
    { label: '光合成', type: 'noun', x: 400, y: 300 },
    { label: '日光', type: 'noun', x: 400, y: 50 },
    { label: '炭酸ガス', type: 'noun', x: 100, y: 300 },
    { label: '水分', type: 'noun', x: 200, y: 500 },
    { label: 'でんぷん', type: 'noun', x: 700, y: 300 },
    { label: '空気', type: 'noun', x: 600, y: 500 },
    // Verb nodes
    { label: 'あたる', type: 'verb', x: 400, y: 175 },
    { label: '吸う', type: 'verb', x: 250, y: 300 },
    { label: 'いる', type: 'verb', x: 300, y: 400 },
    { label: 'できる', type: 'verb', x: 550, y: 300 },
    { label: 'だす', type: 'verb', x: 500, y: 400 },
  ],
  links: [
    // 光合成 → あたる → 日光
    { sourceLabel: '光合成', targetLabel: 'あたる', label: '何が', relationship: '' },
    { sourceLabel: 'あたる', targetLabel: '日光', label: '何を', relationship: '' },
    // 光合成 → 吸う → 炭酸ガス
    { sourceLabel: '光合成', targetLabel: '吸う', label: '何が', relationship: '' },
    { sourceLabel: '吸う', targetLabel: '炭酸ガス', label: '何を', relationship: '' },
    // 光合成 → いる → 水分
    { sourceLabel: '光合成', targetLabel: 'いる', label: '何が', relationship: '' },
    { sourceLabel: 'いる', targetLabel: '水分', label: '何を', relationship: '' },
    // 光合成 → できる → でんぷん
    { sourceLabel: '光合成', targetLabel: 'できる', label: '何が', relationship: '' },
    { sourceLabel: 'できる', targetLabel: 'でんぷん', label: '何を', relationship: '' },
    // 光合成 → だす → 空気
    { sourceLabel: '光合成', targetLabel: 'だす', label: '何が', relationship: '' },
    { sourceLabel: 'だす', targetLabel: '空気', label: '何を', relationship: '' },
  ],
};

export const studentMaps: SeedMap[] = [student1Map, student2Map, student3Map];
