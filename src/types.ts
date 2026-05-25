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
}
