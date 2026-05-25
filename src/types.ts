export type TaskStatus = '未対応' | '進行中' | '済' | 'やらない' | '対象外';

export interface Task {
  id: number;
  category: string;
  title: string;
  statusShunsuke: TaskStatus; // 本アカウント（竣介）
  statusAika: TaskStatus; // パートナー（愛翔）
  note: string;
}

export interface CostItem {
  id: string;
  name: string;
  amount: number;
  ratioShunsuke: number; // 竣介の負担比率 (%)、愛翔は 100 - ratioShunsuke
}

export interface MonthlyCostItem {
  id: string;
  name: string;
  amount: number;
}

export interface PropertyDimensions {
  entryWidth: string; // 玄関ドア 有効開口幅
  entryHeight: string; // 玄関ドア 高さ
  stairsWidth: string; // 階段・通路 最狭幅
  stairsHeight: string; // 階段・通路 踊り場天井高
  washerWidth: string; // 洗濯機置き場 防水パン内寸 横幅
  washerDepth: string; // 洗濯機置き場 防水パン内寸 奥行
  washerHeight: string; // 洗濯機置き場 水栓までの高さ
  fridgeWidth: string; // 冷蔵庫置き場 横幅
  fridgeDepth: string; // 冷蔵庫置き場 奥行
  curtainLdkWidth: string; // カーテンサイズ(LDK) 窓横幅
  curtainLdkHeight: string; // カーテンサイズ(LDK) レールから床までの高さ
  curtainRoomWidth: string; // カーテンサイズ(洋室) 窓横幅
  curtainRoomHeight: string; // カーテンサイズ(洋室) レールから床までの高さ
}

export interface PropertyNotes {
  gasCompany: string; // プロパンガス会社
  facilities: string; // 最寄りの生活施設（自由記入欄）
}

export interface SyncData {
  tasks: Array<{
    id: number;
    s: TaskStatus; // 竣介のステータス
    a: TaskStatus; // 愛翔のステータス
  }>;
  costs: Array<{
    id: string;
    amount: number;
    ratio: number; // 竣介の負担比率
  }>;
  monthlyCosts: Array<{
    id: string;
    amount: number;
  }>;
  globalRatioShunsuke: number; // 竣介のデフォルト負担比率
  globalMonthlyRatioShunsuke: number; // 竣介の生活費用の負担比率
  dimensions?: PropertyDimensions; // 新居の寸法データ
  propertyNotes?: PropertyNotes; // 新居の周辺メモ・ライフライン
}
