/**
 * Seed data for testing the comparison feature
 * Theme: Photosynthesis Process
 */

import type { NodeType } from './firestore';

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
export const teacherMap: SeedMap = {
  title: '光合成のプロセス（見本）',
  isReference: true,
  ownerEmail: 'teacher@example.com',
  nodes: [
    { label: '光合成', type: 'noun', x: 400, y: 300 },
    { label: '光エネルギー', type: 'noun', x: 400, y: 150 },
    { label: '二酸化炭素', type: 'noun', x: 200, y: 300 },
    { label: '水', type: 'noun', x: 300, y: 450 },
    { label: 'グルコース', type: 'noun', x: 600, y: 300 },
    { label: '酸素', type: 'noun', x: 500, y: 450 },
    { label: '葉緑体', type: 'noun', x: 300, y: 550 },
    { label: 'クロロフィル', type: 'noun', x: 500, y: 550 },
  ],
  links: [
    { sourceLabel: '光合成', targetLabel: '光エネルギー', relationship: '必要とする' },
    { sourceLabel: '光合成', targetLabel: '二酸化炭素', relationship: '吸収する' },
    { sourceLabel: '光合成', targetLabel: '水', relationship: '使用する' },
    { sourceLabel: '光合成', targetLabel: 'グルコース', relationship: '生成する' },
    { sourceLabel: '光合成', targetLabel: '酸素', relationship: '放出する' },
    { sourceLabel: '光合成', targetLabel: '葉緑体', relationship: 'で行われる' },
    { sourceLabel: '葉緑体', targetLabel: 'クロロフィル', relationship: '含む' },
    { sourceLabel: 'クロロフィル', targetLabel: '光エネルギー', relationship: '吸収する' },
  ],
};

// Student 1's map (Sato Taro) - uses different terminology
export const student1Map: SeedMap = {
  title: '光合成について',
  isReference: false,
  ownerEmail: 'student1@example.com',
  nodes: [
    { label: '光合成', type: 'noun', x: 400, y: 300 },
    { label: '太陽光', type: 'noun', x: 400, y: 150 },
    { label: 'CO2', type: 'noun', x: 200, y: 300 },
    { label: '水', type: 'noun', x: 300, y: 450 },
    { label: '糖', type: 'noun', x: 600, y: 300 },
    { label: 'O2', type: 'noun', x: 500, y: 450 },
    { label: '葉っぱ', type: 'noun', x: 400, y: 550 },
  ],
  links: [
    { sourceLabel: '光合成', targetLabel: '太陽光', relationship: '使う' },
    { sourceLabel: '光合成', targetLabel: 'CO2', relationship: '取り込む' },
    { sourceLabel: '光合成', targetLabel: '水', relationship: '必要' },
    { sourceLabel: '光合成', targetLabel: '糖', relationship: '作る' },
    { sourceLabel: '光合成', targetLabel: 'O2', relationship: '出す' },
    { sourceLabel: '光合成', targetLabel: '葉っぱ', relationship: 'で起きる' },
  ],
};

// Student 2's map (Suzuki Hanako) - relatively accurate with some additions
export const student2Map: SeedMap = {
  title: '植物の光合成',
  isReference: false,
  ownerEmail: 'student2@example.com',
  nodes: [
    { label: '光合成', type: 'noun', x: 400, y: 300 },
    { label: '光', type: 'noun', x: 400, y: 150 },
    { label: '二酸化炭素', type: 'noun', x: 200, y: 300 },
    { label: '水', type: 'noun', x: 300, y: 450 },
    { label: 'ブドウ糖', type: 'noun', x: 600, y: 300 },
    { label: '酸素', type: 'noun', x: 500, y: 450 },
    { label: '葉緑体', type: 'noun', x: 300, y: 550 },
    { label: '葉緑素', type: 'noun', x: 500, y: 550 },
    { label: '気孔', type: 'noun', x: 100, y: 400 },
  ],
  links: [
    { sourceLabel: '光合成', targetLabel: '光', relationship: '利用する' },
    { sourceLabel: '光合成', targetLabel: '二酸化炭素', relationship: '吸収する' },
    { sourceLabel: '光合成', targetLabel: '水', relationship: '使用する' },
    { sourceLabel: '光合成', targetLabel: 'ブドウ糖', relationship: '作り出す' },
    { sourceLabel: '光合成', targetLabel: '酸素', relationship: '放出する' },
    { sourceLabel: '光合成', targetLabel: '葉緑体', relationship: 'で行われる' },
    { sourceLabel: '葉緑体', targetLabel: '葉緑素', relationship: '持つ' },
    { sourceLabel: '気孔', targetLabel: '二酸化炭素', relationship: '取り入れる' },
    { sourceLabel: '気孔', targetLabel: '酸素', relationship: '放出する' },
  ],
};

// Student 3's map (Takahashi Ichiro) - incomplete with some errors
export const student3Map: SeedMap = {
  title: '光合成のしくみ',
  isReference: false,
  ownerEmail: 'student3@example.com',
  nodes: [
    { label: '光合成', type: 'noun', x: 400, y: 300 },
    { label: '日光', type: 'noun', x: 400, y: 150 },
    { label: '炭酸ガス', type: 'noun', x: 200, y: 300 },
    { label: '水分', type: 'noun', x: 300, y: 450 },
    { label: 'でんぷん', type: 'noun', x: 600, y: 300 },
    { label: '空気', type: 'noun', x: 500, y: 450 },
  ],
  links: [
    { sourceLabel: '光合成', targetLabel: '日光', relationship: 'あたる' },
    { sourceLabel: '光合成', targetLabel: '炭酸ガス', relationship: '吸う' },
    { sourceLabel: '光合成', targetLabel: '水分', relationship: 'いる' },
    { sourceLabel: '光合成', targetLabel: 'でんぷん', relationship: 'できる' },
    { sourceLabel: '光合成', targetLabel: '空気', relationship: 'だす' },
  ],
};

export const studentMaps: SeedMap[] = [student1Map, student2Map, student3Map];
