import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateCosts, encodeSyncData, decodeSyncData, getInitialTasks, getInitialCosts } from '../src/utils';
import type { Task, CostItem, SyncData } from '../src/types';

describe('同棲準備・引越し 統合ダッシュボード ロジックテスト', () => {
  
  describe('費用計算ロジック (calculateCosts)', () => {
    it('各費用の負担比率に基づいて各自の合計負担額を正しく計算できること', () => {
      const costs: CostItem[] = [
        { id: 'rent', name: '家賃', amount: 159000, ratioAi: 60 }, // 愛翔60%, 竣介40%
        { id: 'deposit', name: '敷金', amount: 159000, ratioAi: 50 }, // 愛翔50%, 竣介50%
      ];
      
      const result = calculateCosts(costs);
      
      // 家賃: 愛翔 = 159000 * 0.6 = 95400, 竣介 = 159000 * 0.4 = 63600
      // 敷金: 愛翔 = 159000 * 0.5 = 79500, 竣介 = 159000 * 0.5 = 79500
      // 合計: 愛翔 = 174900, 竣介 = 143100
      expect(result.total).toBe(318000);
      expect(result.totalAi).toBe(174900);
      expect(result.totalShunsuke).toBe(143100);
    });

    it('費用リストが空の場合に合計が0になること', () => {
      const result = calculateCosts([]);
      expect(result.total).toBe(0);
      expect(result.totalAi).toBe(0);
      expect(result.totalShunsuke).toBe(0);
    });
  });

  describe('データ同期ロジック (encode/decode)', () => {
    const sampleSyncData: SyncData = {
      tasks: [
        { id: 1, a: '済', s: '済' },
        { id: 2, a: '未対応', s: '進行中' },
        { id: 3, a: 'やらない', s: '未対応' }
      ],
      costs: [
        { id: 'rent', amount: 160000, ratio: 55 },
        { id: 'deposit', amount: 150000, ratio: 50 }
      ],
      globalRatioAi: 50
    };

    it('データをBase64文字列にエンコードし、デコードして元に戻せること', () => {
      const encoded = encodeSyncData(sampleSyncData);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);

      const decoded = decodeSyncData(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded?.globalRatioAi).toBe(50);
      expect(decoded?.tasks).toHaveLength(3);
      expect(decoded?.tasks[1].s).toBe('進行中');
      expect(decoded?.costs[0].amount).toBe(160000);
    });

    it('不正な同期文字列が入力された場合に null を返し、例外をスローしないこと', () => {
      const result1 = decodeSyncData('invalid_base64_string!!!');
      expect(result1).toBeNull();

      const result2 = decodeSyncData('');
      expect(result2).toBeNull();

      const result3 = decodeSyncData(btoa('{"invalid":"json"'));
      expect(result3).toBeNull();
    });
  });

  describe('初期データ生成', () => {
    it('初期タスクリストが正しく生成され、必要な件数であること', () => {
      const tasks = getInitialTasks();
      expect(tasks.length).toBe(51); // CSVにある全51タスク
      expect(tasks[0].category).toBe('金銭管理のルール');
      expect(tasks[0].title).toBe('初期費用（敷金・礼金・仲手）の負担割合の決定');
      expect(tasks[0].statusAi).toBe('済');
      expect(tasks[0].statusShunsuke).toBe('済');
    });

    it('初期費用リストが正しく生成されること', () => {
      const costs = getInitialCosts();
      expect(costs.length).toBe(8);
      expect(costs.find(c => c.id === 'rent')?.amount).toBe(159000);
      expect(costs.find(c => c.id === 'agency')?.amount).toBe(174900);
    });
  });
});
