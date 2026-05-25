import { createApp, ref, computed, watch, onMounted } from 'vue';
import {
  getInitialTasks,
  getInitialCosts,
  calculateCosts,
  encodeSyncData,
  decodeSyncData
} from './utils';
import type { Task, CostItem, TaskStatus, SyncData } from './types';

const app = createApp({
  setup() {
    // 状態管理
    const tasks = ref<Task[]>([]);
    const costs = ref<CostItem[]>([]);
    const globalRatioAi = ref<number>(50); // デフォルト 50%
    const activeTab = ref<'dashboard' | 'tasks' | 'costs' | 'guide' | 'settings'>('dashboard');
    
    // タスク管理タブ用の検索・フィルタ状態
    const searchQuery = ref('');
    const filterCategory = ref('all');
    const filterStatus = ref<'all' | TaskStatus>('all');
    const filterAssignee = ref<'all' | 'ai' | 'shunsuke'>('all');
    const taskCategoryOpen = ref<Record<string, boolean>>({});

    // 同期システム用の状態
    const syncInputCode = ref('');
    const syncNotification = ref<{ type: 'success' | 'error' | null; message: string }>({
      type: null,
      message: ''
    });

    // ローカルストレージキー
    const STORAGE_KEY = 'hikkoshi_dashboard_data';

    // データの読み込み
    const loadFromLocalStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.costs)) {
            tasks.value = parsed.tasks;
            costs.value = parsed.costs;
            globalRatioAi.value = parsed.globalRatioAi ?? 50;
            return;
          }
        }
      } catch (e) {
        console.error('LocalStorage load failed, using default data.', e);
      }
      
      // デフォルトデータのロード
      tasks.value = getInitialTasks();
      costs.value = getInitialCosts();
      globalRatioAi.value = 50;
    };

    // データの保存
    const saveToLocalStorage = () => {
      const data = {
        tasks: tasks.value,
        costs: costs.value,
        globalRatioAi: globalRatioAi.value
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    };

    // 状態変更を監視して自動保存
    watch([tasks, costs, globalRatioAi], () => {
      saveToLocalStorage();
    }, { deep: true });

    onMounted(() => {
      loadFromLocalStorage();
      
      // アコーディオンカテゴリの初期開閉状態を設定（すべて開く）
      const categories = [...new Set(tasks.value.map(t => t.category))];
      categories.forEach(cat => {
        if (taskCategoryOpen.value[cat] === undefined) {
          taskCategoryOpen.value[cat] = true;
        }
      });
    });

    // --- 計算プロパティ ---

    // 各自・全体のタスク統計
    const totalTaskCount = computed(() => tasks.value.length);
    
    const taskStats = computed(() => {
      let doneCount = 0;
      let totalCount = 0; // 「やらない」を除いた有効なタスクの数（完了率計算用）

      let aiDone = 0;
      let aiTotal = 0;
      let shunsukeDone = 0;
      let shunsukeTotal = 0;

      tasks.value.forEach(t => {
        // 全体の完了率は各自のタスクの平均で出すか、または両者が「済」のものを全体の完了とするか。
        // ここでは「各自の完了タスク数の合計 / 全体のタスク数」または「全員が完了したタスクの割合」など。
        // 分かりやすく、各自それぞれの完了率を表示し、全体の完了率は「両者が済の割合」または「各自の進捗の平均値」とする。
        // ここでは「各自の進捗の平均値」とする。
        
        if (t.statusAi !== 'やらない') {
          aiTotal++;
          if (t.statusAi === '済') aiDone++;
        }
        if (t.statusShunsuke !== 'やらない') {
          shunsukeTotal++;
          if (t.statusShunsuke === '済') shunsukeDone++;
        }

        // 全体の完了タスク（両者が済、または「やらない」）
        const isAiDone = t.statusAi === '済' || t.statusAi === 'やらない';
        const isShunsukeDone = t.statusShunsuke === '済' || t.statusShunsuke === 'やらない';
        
        if (t.statusAi !== 'やらない' || t.statusShunsuke !== 'やらない') {
          totalCount++;
          if (isAiDone && isShunsukeDone) {
            doneCount++;
          }
        }
      });

      const overallProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
      const aiProgress = aiTotal > 0 ? Math.round((aiDone / aiTotal) * 100) : 0;
      const shunsukeProgress = shunsukeTotal > 0 ? Math.round((shunsukeDone / shunsukeTotal) * 100) : 0;

      return {
        overallProgress,
        aiDone,
        aiTotal,
        aiProgress,
        shunsukeDone,
        shunsukeTotal,
        shunsukeProgress
      };
    });

    // 優先的に対応すべきタスク (各自が未対応かつ、やらないではないものから上位5件)
    const priorityTasks = computed(() => {
      return tasks.value
        .filter(t => (t.statusAi === '未対応' || t.statusShunsuke === '未対応') && t.statusAi !== 'やらない' && t.statusShunsuke !== 'やらない')
        .slice(0, 5);
    });

    // タスクカテゴリ一覧
    const categories = computed(() => {
      return [...new Set(tasks.value.map(t => t.category))];
    });

    // フィルタリングされたタスクリスト
    const filteredTasksByCategory = computed(() => {
      const query = searchQuery.value.trim().toLowerCase();
      
      const filtered = tasks.value.filter(t => {
        // 検索クエリマッチ
        const matchQuery = !query || t.title.toLowerCase().includes(query) || t.note.toLowerCase().includes(query);
        
        // カテゴリマッチ
        const matchCategory = filterCategory.value === 'all' || t.category === filterCategory.value;
        
        // ステータスマッチ
        let matchStatus = true;
        if (filterStatus.value !== 'all') {
          if (filterAssignee.value === 'ai') {
            matchStatus = t.statusAi === filterStatus.value;
          } else if (filterAssignee.value === 'shunsuke') {
            matchStatus = t.statusShunsuke === filterStatus.value;
          } else {
            matchStatus = t.statusAi === filterStatus.value || t.statusShunsuke === filterStatus.value;
          }
        }

        // 担当マッチ (未対応などの抽出用)
        let matchAssignee = true;
        if (filterAssignee.value !== 'all' && filterStatus.value === 'all') {
          if (filterAssignee.value === 'ai') {
            matchAssignee = t.statusAi !== 'やらない' && t.statusAi !== '済';
          } else {
            matchAssignee = t.statusShunsuke !== 'やらない' && t.statusShunsuke !== '済';
          }
        }

        return matchQuery && matchCategory && matchStatus && matchAssignee;
      });

      // カテゴリごとにグループ化
      const groups: Record<string, Task[]> = {};
      filtered.forEach(t => {
        if (!groups[t.category]) {
          groups[t.category] = [];
        }
        groups[t.category].push(t);
      });

      return groups;
    });

    // お金シミュレーションの計算結果
    const costSummary = computed(() => {
      return calculateCosts(costs.value);
    });

    // --- アクション/メソッド ---

    // タスクのステータス更新
    const toggleTaskStatus = (task: Task, person: 'ai' | 'shunsuke') => {
      const statuses: TaskStatus[] = ['未対応', '進行中', '済', 'やらない'];
      const current = person === 'ai' ? task.statusAi : task.statusShunsuke;
      const nextIndex = (statuses.indexOf(current) + 1) % statuses.length;
      const next = statuses[nextIndex];

      if (person === 'ai') {
        task.statusAi = next;
      } else {
        task.statusShunsuke = next;
      }
    };

    const setTaskStatus = (task: Task, person: 'ai' | 'shunsuke', status: TaskStatus) => {
      if (person === 'ai') {
        task.statusAi = status;
      } else {
        task.statusShunsuke = status;
      }
    };

    // アコーディオン開閉
    const toggleCategoryAccordion = (category: string) => {
      taskCategoryOpen.value[category] = !taskCategoryOpen.value[category];
    };

    // 全体の一括負担割合を設定
    const applyGlobalRatio = (val: number) => {
      globalRatioAi.value = val;
      costs.value.forEach(c => {
        c.ratioAi = val;
      });
    };

    // 金額の更新
    const updateCostAmount = (costId: string, amount: number) => {
      const item = costs.value.find(c => c.id === costId);
      if (item) {
        item.amount = Math.max(0, amount);
      }
    };

    // 個別比率の更新
    const updateCostRatio = (costId: string, ratio: number) => {
      const item = costs.value.find(c => c.id === costId);
      if (item) {
        item.ratioAi = Math.min(100, Math.max(0, ratio));
      }
    };

    // 簡単LINE同期: データエクスポート
    const exportSyncCode = () => {
      const syncData: SyncData = {
        tasks: tasks.value.map(t => ({ id: t.id, a: t.statusAi, s: t.statusShunsuke })),
        costs: costs.value.map(c => ({ id: c.id, amount: c.amount, ratio: c.ratioAi })),
        globalRatioAi: globalRatioAi.value
      };

      const code = encodeSyncData(syncData);
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          showNotification('success', '同期コードをコピーしました！LINE等で相手に送ってください。');
        }).catch(err => {
          console.error('Clipboard copy failed:', err);
          showNotification('error', 'クリップボードへのコピーに失敗しました。下のコードを手動でコピーしてください。');
          syncInputCode.value = code; // 失敗時はテキストエリアにコードを表示
        });
      } else {
        showNotification('error', '同期コードの生成に失敗しました。');
      }
    };

    // 簡単LINE同期: データインポート
    const importSyncCode = () => {
      const code = syncInputCode.value.trim();
      if (!code) {
        showNotification('error', '同期コードを入力してください。');
        return;
      }

      const decoded = decodeSyncData(code);
      if (decoded) {
        // タスク状態の復元
        decoded.tasks.forEach(dt => {
          const task = tasks.value.find(t => t.id === dt.id);
          if (task) {
            task.statusAi = dt.a;
            task.statusShunsuke = dt.s;
          }
        });

        // 費用状態の復元
        decoded.costs.forEach(dc => {
          const cost = costs.value.find(c => c.id === dc.id);
          if (cost) {
            cost.amount = dc.amount;
            cost.ratioAi = dc.ratio;
          }
        });

        globalRatioAi.value = decoded.globalRatioAi;
        
        syncInputCode.value = '';
        showNotification('success', '同期に成功しました！最新のデータが反映されました。');
      } else {
        showNotification('error', '無効な同期コードです。コピーされたコードが正しいか確認してください。');
      }
    };

    // 通知の表示
    const showNotification = (type: 'success' | 'error', message: string) => {
      syncNotification.value = { type, message };
      setTimeout(() => {
        syncNotification.value.type = null;
      }, 5000);
    };

    // すべてのデータを初期化
    const resetAllData = () => {
      if (confirm('すべての設定とタスクを初期状態に戻しますか？（localStorageも消去されます）')) {
        tasks.value = getInitialTasks();
        costs.value = getInitialCosts();
        globalRatioAi.value = 50;
        localStorage.removeItem(STORAGE_KEY);
        showNotification('success', 'データを初期化しました。');
      }
    };

    return {
      tasks,
      costs,
      globalRatioAi,
      activeTab,
      searchQuery,
      filterCategory,
      filterStatus,
      filterAssignee,
      taskCategoryOpen,
      syncInputCode,
      syncNotification,
      totalTaskCount,
      taskStats,
      priorityTasks,
      categories,
      filteredTasksByCategory,
      costSummary,
      toggleTaskStatus,
      setTaskStatus,
      toggleCategoryAccordion,
      applyGlobalRatio,
      updateCostAmount,
      updateCostRatio,
      exportSyncCode,
      importSyncCode,
      resetAllData
    };
  }
});

app.mount('#app');
