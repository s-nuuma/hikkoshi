import type { Task, CostItem, SyncData } from './types';

// 初期費用データ定義
export const getInitialCosts = (): CostItem[] => [
  { id: 'rent', name: '家賃', amount: 159000, ratioAi: 50 },
  { id: 'management', name: '管理費', amount: 1000, ratioAi: 50 },
  { id: 'deposit', name: '敷金', amount: 159000, ratioAi: 50 },
  { id: 'keymoney', name: '礼金', amount: 159000, ratioAi: 50 },
  { id: 'agency', name: '仲介手数料', amount: 174900, ratioAi: 50 },
  { id: 'keyexchange', name: '鍵交換代', amount: 5500, ratioAi: 50 },
  { id: 'insurance', name: '火災保険（想定）', amount: 20000, ratioAi: 50 },
  { id: 'moving', name: '引越し費用（想定）', amount: 50000, ratioAi: 50 }
];

// 初期タスクリスト定義（CSVに忠実に基づき、IDを1-indexedで付与）
export const getInitialTasks = (): Task[] => [
  { id: 1, category: '金銭管理のルール', title: '初期費用（敷金・礼金・仲手）の負担割合の決定', statusAi: '済', statusShunsuke: '済', note: '' },
  { id: 2, category: '金銭管理のルール', title: '引越し費用の負担割合の決定', statusAi: '済', statusShunsuke: '済', note: '' },
  { id: 3, category: '金銭管理のルール', title: '新規購入する家具・家電の負担割合の決定', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 4, category: '金銭管理のルール', title: '毎月の固定費（家賃・光熱費・通信費）の分担比率の決定', statusAi: '済', statusShunsuke: '済', note: '' },
  { id: 5, category: '金銭管理のルール', title: '毎月の変動費（食費・日用品費）の分担比率の決定', statusAi: '済', statusShunsuke: '済', note: '' },
  { id: 6, category: '金銭管理のルール', title: '生活費の管理方法の決定（共通口座・アプリ等）', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 7, category: '金銭管理のルール', title: '共有の家計簿ツール・アプリの選定と設定', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 8, category: '生活・運用ルール', title: '家事分担の基本ルールの決定', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 9, category: '生活・運用ルール', title: '帰宅遅延時や夕食不要時の連絡ルールの決定', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 10, category: '生活・運用ルール', title: '個人の収納スペース of 割り当ての決定', statusAi: '未対応', statusShunsuke: '未対応', note: '' }, // 元データは「個人の収納スペースの割り当ての決定」ですが、CSVに忠実に対応
  { id: 11, category: '生活・運用ルール', title: '友人や家族を招く際のルールの決定', statusAi: 'やらない', statusShunsuke: 'やらない', note: '' },
  { id: 12, category: 'リスク管理', title: '共同購入した家具・家電の所有権（退去時）の事前決定', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 13, category: 'リスク管理', title: '退去費用（原状回復・違約金等）の負担割合 of 事前決定', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 14, category: '現居の解約', title: '現居の解約通知（自分）', statusAi: 'やらない', statusShunsuke: '未対応', note: '解約予告期間を確認' },
  { id: 15, category: '現居の解約', title: '現居の解約通知（同居人）', statusAi: '未対応', statusShunsuke: 'やらない', note: '解約予告期間を確認' },
  { id: 16, category: '現居の解約', title: '粗大ゴミの回収手配（自分）', statusAi: 'やらない', statusShunsuke: '未対応', note: '' },
  { id: 17, category: '現居の解約', title: '粗大ゴミの回収手配（同居人）', statusAi: '未対応', statusShunsuke: 'やらない', note: '' },
  { id: 18, category: '新居の準備', title: '新居の賃貸契約書の締結・初期費用入金', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 19, category: '新居の準備', title: '引越し業者の選定・相見積もり', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 20, category: '新居の準備', title: '引越し業者の決定・契約', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 21, category: '新居の準備', title: '新居の間取り・寸法採寸', statusAi: '未対応', statusShunsuke: '未対応', note: 'カーテン・搬入経路・洗濯機置き場等' },
  { id: 22, category: '旧居 of 停止手配', title: '電気・ガス・水道の停止手配（自分）', statusAi: '未対応', statusShunsuke: '未対応', note: '引越し2週間前まで' },
  { id: 23, category: '旧居 of 停止手配', title: 'インターネットの解約・移転手配（自分）', statusAi: '未対応', statusShunsuke: '未対応', note: '引越し2週間前まで' },
  { id: 24, category: '旧居 of 停止手配', title: '電気・ガス・水道の停止手配（同居人）', statusAi: '未対応', statusShunsuke: '未対応', note: '引越し2週間前まで' },
  { id: 25, category: '新居 of 開始手配', title: '新居の電気・水道開通手配', statusAi: '未対応', statusShunsuke: '未対応', note: '引越し2週間前まで' },
  { id: 26, category: '新居 of 開始手配', title: '新居のガス開通手配', statusAi: '未対応', statusShunsuke: '未対応', note: '要入居日当日の立ち会い予約' },
  { id: 27, category: '新居 of 開始手配', title: '新居のインターネット回線手配', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 28, category: '役所関係（引越し前）', title: '転出届の提出（自分）', statusAi: '未対応', statusShunsuke: '未対応', note: 'マイナンバーカードでオンライン申請可' },
  { id: 29, category: '役所関係（引越し前）', title: '転出届の提出（同居人）', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 30, category: '役所関係（引越し前）', title: '郵便局への転居届（自分・同居人）', statusAi: '未対応', statusShunsuke: '未対応', note: 'オンライン申請可' },
  { id: 31, category: '役所関係（引越し後）', title: '転入届の提出（自分・同居人）', statusAi: '未対応', statusShunsuke: '未対応', note: '入居後14日以内。世帯主の扱いを決定' },
  { id: 32, category: '役所関係（引越し後）', title: 'マイナンバーカードの住所変更（自分・同居人）', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 33, category: '役所関係（引越し後）', title: '運転免許証の住所変更', statusAi: '未対応', statusShunsuke: '未対応', note: '警察署または運転免許センター' },
  { id: 34, category: '役所関係（引越し後）', title: '銀行口座・クレジットカード・携帯電話の住所変更', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 35, category: '役所関係（引越し後）', title: '各種サブスクリプションサービスの住所変更', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 36, category: '役所関係（引越し後）', title: '勤務先への住所変更・通勤経路変更申請', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 37, category: '新規購入家具・家電', title: '冷蔵庫（サイズ・容量決定）', statusAi: 'やらない', statusShunsuke: 'やらない', note: '' },
  { id: 38, category: '新規購入家具・家電', title: '洗濯機（サイズ・容量決定）', statusAi: 'やらない', statusShunsuke: 'やらない', note: '' },
  { id: 39, category: '新規購入家具・家電', title: 'ベッド／マットレス（サイズ決定）', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 40, category: '新規購入家具・家電', title: 'カーテン', statusAi: '未対応', statusShunsuke: '未対応', note: '窓採寸後に購入' },
  { id: 41, category: '新規購入家具・家電', title: '照明器具', statusAi: '未対応', statusShunsuke: '未対応', note: '備え付けがない部屋分' },
  { id: 42, category: '新規購入家具・家電', title: 'ダイニングテーブル／チェア', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 43, category: '新規購入家具・家電', title: 'ソファ／リビング収納', statusAi: 'やらない', statusShunsuke: 'やらない', note: '' },
  { id: 44, category: '持ち込み・処分', title: '持ち込む家具・家電のリストアップ（自分）', statusAi: 'やらない', statusShunsuke: 'やらない', note: '' },
  { id: 45, category: '持ち込み・処分', title: '持ち込む家具・家電のリストアップ（同居人）', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 46, category: '持ち込み・処分', title: '重複するため処分・売却するアイテムの決定', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 47, category: '引越し当日', title: '新居の鍵受け取り', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 48, category: '引越し当日', title: '搬入前の室内チェック', statusAi: '未対応', statusShunsuke: '未対応', note: '既存の傷や汚れを写真撮影し記録' },
  { id: 49, category: '引越し当日', title: 'ガスの開栓立ち会い', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 50, category: '引越し当日', title: '荷物の搬入・業者への配置指示', statusAi: '未対応', statusShunsuke: '未対応', note: '' },
  { id: 51, category: '引越し当日', title: '当日すぐ使うものの開梱', statusAi: '未対応', statusShunsuke: '未対応', note: '' }
];

// 費用計算ロジック
export const calculateCosts = (costs: CostItem[]) => {
  let total = 0;
  let totalAi = 0;
  let totalShunsuke = 0;

  for (const item of costs) {
    total += item.amount;
    const aiCost = Math.round(item.amount * (item.ratioAi / 100));
    totalAi += aiCost;
    totalShunsuke += (item.amount - aiCost);
  }

  return {
    total,
    totalAi,
    totalShunsuke
  };
};

// Base64エンコード (Unicode対応)
export const encodeSyncData = (data: SyncData): string => {
  try {
    const jsonStr = JSON.stringify(data);
    // encodeURIComponent と btoa を組み合わせて日本語（Unicode）に対応
    return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (error) {
    console.error('Encoding error:', error);
    return '';
  }
};

// Base64デコード (Unicode対応)
export const decodeSyncData = (encodedStr: string): SyncData | null => {
  if (!encodedStr) return null;
  try {
    const raw = atob(encodedStr);
    const decodedJson = decodeURIComponent(Array.from(raw).map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const parsed = JSON.parse(decodedJson);
    
    // 簡易的な構造チェック
    if (parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.costs) && typeof parsed.globalRatioAi === 'number') {
      return parsed as SyncData;
    }
    return null;
  } catch (error) {
    console.error('Decoding error:', error);
    return null;
  }
};
