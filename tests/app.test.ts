import { describe, it, expect } from 'vitest';
import { 
  calculateCosts, 
  calculateMonthlyCosts, 
  encodeSyncData, 
  decodeSyncData, 
  getInitialTasks, 
  getInitialCosts,
  getInitialMonthlyCosts,
  getInitialDimensions,
  getInitialPropertyNotes
} from '../src/utils';
import type { Task, CostItem, MonthlyCostItem, SyncData } from '../src/types';

describe('同棲準備・引越し 統合ダッシュボード ロジックテスト（アップデート版）', () => {
  
  describe('初期費用計算ロジック (calculateCosts)', () => {
    it('竣介の負担比率に基づいて各自の合計負担額を正しく計算できること', () => {
      const costs: CostItem[] = [
        { id: 'rent', name: '家賃', amount: 159000, ratioShunsuke: 60 }, // 竣介60%, 愛翔40%
        { id: 'deposit', name: '敷金', amount: 159000, ratioShunsuke: 50 }, // 竣介50%, 愛翔50%
      ];
      
      const result = calculateCosts(costs);
      
      // 家賃: 竣介 = 159000 * 0.6 = 95400, 愛翔 = 63600
      // 敷金: 竣介 = 159000 * 0.5 = 79500, 愛翔 = 79500
      // 合計: 竣介 = 174900, 愛翔 = 143100
      expect(result.total).toBe(318000);
      expect(result.totalShunsuke).toBe(174900);
      expect(result.totalAika).toBe(143100);
    });

    it('費用リストが空の場合に合計が0になること', () => {
      const result = calculateCosts([]);
      expect(result.total).toBe(0);
      expect(result.totalShunsuke).toBe(0);
      expect(result.totalAika).toBe(0);
    });
  });

  describe('毎月の生活費計算ロジック (calculateMonthlyCosts)', () => {
    it('生活費の合計と竣介の負担割合に基づいて各自の振込額を正しく計算できること', () => {
      const monthlyCosts: MonthlyCostItem[] = [
        { id: 'rent_management', name: '家賃・管理費', amount: 160000 },
        { id: 'electricity', name: '電気代', amount: 11000 },
      ];
      
      const ratioShunsuke = 60; // 竣介60%, 愛翔40%
      const result = calculateMonthlyCosts(monthlyCosts, ratioShunsuke);
      
      // 合計 = 171000
      // 竣介 = 171000 * 0.6 = 102600
      // 愛翔 = 171000 * 0.4 = 68400
      expect(result.total).toBe(171000);
      expect(result.totalShunsuke).toBe(102600);
      expect(result.totalAika).toBe(68400);
    });
  });

  describe('データ同期ロジック (encode/decode)', () => {
    const sampleSyncData: SyncData = {
      tasks: [
        { id: 1, s: '済', a: '済' },
        { id: 2, s: '未対応', a: '進行中' },
        { id: 3, s: '対象外', a: '未対応' }
      ],
      costs: [
        { id: 'rent', amount: 160000, ratio: 55 },
        { id: 'deposit', amount: 150000, ratio: 50 }
      ],
      monthlyCosts: [
        { id: 'rent_management', amount: 160000 },
        { id: 'electricity', amount: 12000 }
      ],
      globalRatioShunsuke: 50,
      globalMonthlyRatioShunsuke: 60
    };

    it('データをBase64文字列にエンコードし、デコードして元に戻せること', () => {
      const encoded = encodeSyncData(sampleSyncData);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);

      const decoded = decodeSyncData(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded?.globalRatioShunsuke).toBe(50);
      expect(decoded?.globalMonthlyRatioShunsuke).toBe(60);
      expect(decoded?.tasks).toHaveLength(3);
      expect(decoded?.tasks[2].s).toBe('対象外');
      expect(decoded?.costs[0].amount).toBe(160000);
      expect(decoded?.monthlyCosts[1].amount).toBe(12000);
    });

    it('古いデータ形式（globalMonthlyRatioShunsuke未定義）でもフォールバックしてデコードできること', () => {
      const oldSyncData: any = {
        tasks: sampleSyncData.tasks,
        costs: sampleSyncData.costs,
        monthlyCosts: sampleSyncData.monthlyCosts,
        globalRatioShunsuke: 45
      };
      const encoded = encodeSyncData(oldSyncData);
      const decoded = decodeSyncData(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded?.globalRatioShunsuke).toBe(45);
      expect(decoded?.globalMonthlyRatioShunsuke).toBe(45); // globalRatioShunsukeの値が適用されること
    });

    it('不正な同期文字列が入力された場合に null を返し、例外をスローしないこと', () => {
      const result1 = decodeSyncData('invalid_base64_string!!!');
      expect(result1).toBeNull();

      const result2 = decodeSyncData('');
      expect(result2).toBeNull();
    });
  });

  describe('初期データ生成', () => {
    it('新規タスクが追加され、初期タスクリストが正しく生成されること', () => {
      const tasks = getInitialTasks();
      expect(tasks.length).toBe(53); // CSV51件 + 新規2件 = 53件
      
      // 更新タスクの確認 (ID 6)
      const task6 = tasks.find(t => t.id === 6);
      expect(task6?.title).toBe('生活費の管理方法の決定（共通口座・カードの選定）');
      expect(task6?.statusShunsuke).toBe('済');
      expect(task6?.statusAika).toBe('済');
      expect(task6?.note).toBe('三井住友口座＋楽天2枚目カードに決定');

      // 新規タスクの確認 (ID 52)
      const task52 = tasks.find(t => t.id === 52);
      expect(task52?.title).toBe('竣介：2枚目の楽天カードの新規申し込み');
      expect(task52?.statusShunsuke).toBe('未対応');
      expect(task52?.statusAika).toBe('対象外');
      
      // 備考更新タスクの確認 (ID 39)
      const task39 = tasks.find(t => t.id === 39);
      expect(task39?.note).toBe('木造物件のため分割フレーム/マットレス推奨');
    });

    it('初期費用リストおよび生活費リストが正しく生成されること', () => {
      const costs = getInitialCosts();
      expect(costs.length).toBe(8);
      expect(costs.find(c => c.id === 'rent')?.amount).toBe(159000);

      const monthlyCosts = getInitialMonthlyCosts();
      expect(monthlyCosts.length).toBe(8);
      expect(monthlyCosts.find(c => c.id === 'rent_management')?.amount).toBe(160000);
      expect(monthlyCosts.find(c => c.id === 'electricity')?.amount).toBe(11000);
      // 都市ガス基準に戻すため、ガス代初期値が 5,000円に補正されていることを検証
      expect(monthlyCosts.find(c => c.id === 'gas')?.amount).toBe(5000);
    });

    it('初期寸法データがすべて空文字で生成されること', () => {
      const dims = getInitialDimensions();
      expect(dims.entryWidth).toBe('');
      expect(dims.curtainLdkHeight).toBe('');
    });

    it('周辺メモ初期値が空文字で生成されること', () => {
      const notes = getInitialPropertyNotes();
      expect(notes.electricityCompany).toBe('');
      expect(notes.waterCompany).toBe('');
      expect(notes.gasCompany).toBe('');
      expect(notes.facilities).toBe('');
    });
  });
});
