export type TaskStatus = '未対応' | '進行中' | '済' | 'やらない';

export interface Task {
  id: number;
  category: string;
  title: string;
  statusAi: TaskStatus;
  statusShunsuke: TaskStatus;
  note: string;
}

export interface CostItem {
  id: string;
  name: string;
  amount: number;
  ratioAi: number; // 愛翔の負担比率 (%)、竣介は 100 - ratioAi
}

export interface SyncData {
  tasks: Array<{
    id: number;
    a: TaskStatus; // 愛翔のステータス
    s: TaskStatus; // 竣介のステータス
  }>;
  costs: Array<{
    id: string;
    amount: number;
    ratio: number;
  }>;
  globalRatioAi: number; // 全体のデフォルト負担比率
}
