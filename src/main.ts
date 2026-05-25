import { createApp, ref, computed, watch, onMounted } from 'vue';
import {
  getInitialTasks,
  getInitialCosts,
  getInitialMonthlyCosts,
  getInitialDimensions,
  getInitialPropertyNotes,
  calculateCosts,
  calculateMonthlyCosts,
  encodeSyncData,
  decodeSyncData
} from './utils';
import type { Task, CostItem, MonthlyCostItem, PropertyDimensions, PropertyNotes, TaskStatus, SyncData } from './types';

// Firebase Global Type Declaration
declare global {
  interface Window {
    firebase?: any;
  }
}

// Firebase configuration
const firebaseConfig = {
  projectId: "hikkoshi-sync-52026",
  appId: "1:1067926629945:web:8df2e7798ef54b74bc67e8",
  storageBucket: "hikkoshi-sync-52026.firebasestorage.app",
  apiKey: "AIzaSyCNJ4haNFMk0QF-d6_EEKv1e4TEeEBruJg",
  authDomain: "hikkoshi-sync-52026.firebaseapp.com",
  messagingSenderId: "1067926629945"
};

let db: any = null;

if (typeof window !== 'undefined' && window.firebase) {
  try {
    window.firebase.initializeApp(firebaseConfig);
    db = window.firebase.firestore();
  } catch (e) {
    console.error('Firebase initialization failed:', e);
  }
}

const app = createApp({
  setup() {
    // 状態管理
    const tasks = ref<Task[]>([]);
    const costs = ref<CostItem[]>([]);
    const monthlyCosts = ref<MonthlyCostItem[]>([]);
    const globalRatioShunsuke = ref<number>(50); // 竣介基準の負担比率 (デフォルト 50%)
    const globalMonthlyRatioShunsuke = ref<number>(50); // 竣介基準の生活費負担比率 (デフォルト 50%)
    const dimensions = ref<PropertyDimensions>(getInitialDimensions()); // 新居寸法データ
    const propertyNotes = ref<PropertyNotes>(getInitialPropertyNotes()); // 周辺環境・ライフラインメモ
    const activeTab = ref<'dashboard' | 'tasks' | 'costs' | 'guide' | 'property' | 'settings'>('dashboard');
    
    // Firebase自動同期用の状態
    const roomId = ref<string>('');
    const syncStatus = ref<'connected' | 'offline' | 'connecting'>('offline');
    let isApplyingSync = false;
    
    // タスク管理タブ用の検索・フィルタ状態
    const searchQuery = ref('');
    const filterCategory = ref('all');
    const filterStatus = ref<'all' | TaskStatus>('all');
    const filterAssignee = ref<'all' | 'shunsuke' | 'aika'>('all');
    const taskCategoryOpen = ref<Record<string, boolean>>({});

    // 同期システム用の状態
    const syncInputCode = ref('');
    const syncNotification = ref<{ type: 'success' | 'error' | null; message: string }>({
      type: null,
      message: ''
    });

    // ローカルストレージキー
    const STORAGE_KEY = 'hikkoshi_dashboard_data_v2';

    // データの読み込み
    const loadFromLocalStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.costs)) {
            tasks.value = parsed.tasks;
            costs.value = parsed.costs;
            monthlyCosts.value = Array.isArray(parsed.monthlyCosts) ? parsed.monthlyCosts : getInitialMonthlyCosts();
            globalRatioShunsuke.value = parsed.globalRatioShunsuke ?? 50;
            globalMonthlyRatioShunsuke.value = parsed.globalMonthlyRatioShunsuke ?? parsed.globalRatioShunsuke ?? 50;
            // dimensions/propertyNotes の復元（古いデータとの互換性のため null チェック）
            dimensions.value = parsed.dimensions ?? getInitialDimensions();
            // 古いデータには electricityCompany, waterCompany が含まれていない場合があるためマージする
            const defaultNotes = getInitialPropertyNotes();
            propertyNotes.value = {
              ...defaultNotes,
              ...(parsed.propertyNotes ?? {})
            };
            return;
          }
        }
      } catch (e) {
        console.error('LocalStorage load failed, using default data.', e);
      }
      
      // デフォルトデータのロード
      tasks.value = getInitialTasks();
      costs.value = getInitialCosts();
      monthlyCosts.value = getInitialMonthlyCosts();
      globalRatioShunsuke.value = 50;
      globalMonthlyRatioShunsuke.value = 50;
    };

    // データの保存
    const saveToLocalStorage = () => {
      const data = {
        tasks: tasks.value,
        costs: costs.value,
        monthlyCosts: monthlyCosts.value,
        globalRatioShunsuke: globalRatioShunsuke.value,
        globalMonthlyRatioShunsuke: globalMonthlyRatioShunsuke.value,
        dimensions: dimensions.value,
        propertyNotes: propertyNotes.value
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    };

    // 状態変更を監視して自動保存＆クラウド同期
    watch([tasks, costs, monthlyCosts, globalRatioShunsuke, globalMonthlyRatioShunsuke, dimensions, propertyNotes], () => {
      saveToLocalStorage();
      
      // 自分が変更操作をした場合のみFirestoreに同期送信する
      if (!isApplyingSync && db && roomId.value) {
        db.collection('rooms').doc(roomId.value).set({
          tasks: tasks.value.map(t => ({ id: t.id, s: t.statusShunsuke, a: t.statusAika })),
          costs: costs.value.map(c => ({ id: c.id, amount: c.amount, ratio: c.ratioShunsuke })),
          monthlyCosts: monthlyCosts.value.map(c => ({ id: c.id, amount: c.amount })),
          globalRatioShunsuke: globalRatioShunsuke.value,
          globalMonthlyRatioShunsuke: globalMonthlyRatioShunsuke.value,
          dimensions: dimensions.value,
          propertyNotes: propertyNotes.value,
          updatedAt: new Date().toISOString()
        }).catch((err: any) => {
          console.error('Firestore auto-sync save failed:', err);
          syncStatus.value = 'offline';
        });
      }
    }, { deep: true });

    // ランダムな部屋ID生成 (8桁英数字)
    const generateRoomId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    onMounted(() => {
      loadFromLocalStorage();
      
      // アコーディオンカテゴリの初期開閉状態を設定（すべて開く）
      const categories = [...new Set(tasks.value.map(t => t.category))];
      categories.forEach(cat => {
        if (taskCategoryOpen.value[cat] === undefined) {
          taskCategoryOpen.value[cat] = true;
        }
      });

      // 部屋ID（ルームID）の初期化と自動同期の開始
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        let room = urlParams.get('room');
        
        if (!room) {
          room = generateRoomId();
          const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + room;
          window.history.replaceState({ path: newUrl }, '', newUrl);
        }
        roomId.value = room;

        // Firestoreのリアルタイム購読開始
        if (db) {
          syncStatus.value = 'connecting';
          db.collection('rooms').doc(room).onSnapshot((doc: any) => {
            if (doc.exists) {
              const data = doc.data();
              isApplyingSync = true;
              
              // 受信データの適用
              if (Array.isArray(data.tasks)) {
                data.tasks.forEach((dt: any) => {
                  const t = tasks.value.find(item => item.id === dt.id);
                  if (t) {
                    t.statusShunsuke = dt.s;
                    t.statusAika = dt.a;
                  }
                });
              }
              if (Array.isArray(data.costs)) {
                data.costs.forEach((dc: any) => {
                  const c = costs.value.find(item => item.id === dc.id);
                  if (c) {
                    c.amount = dc.amount;
                    c.ratioShunsuke = dc.ratio;
                  }
                });
              }
              if (Array.isArray(data.monthlyCosts)) {
                data.monthlyCosts.forEach((dmc: any) => {
                  const mc = monthlyCosts.value.find(item => item.id === dmc.id);
                  if (mc) {
                    mc.amount = dmc.amount;
                  }
                });
              }
              if (typeof data.globalRatioShunsuke === 'number') {
                globalRatioShunsuke.value = data.globalRatioShunsuke;
              }
              if (typeof data.globalMonthlyRatioShunsuke === 'number') {
                globalMonthlyRatioShunsuke.value = data.globalMonthlyRatioShunsuke;
              }
              // 新居寸法・メモの反映
              if (data.dimensions && typeof data.dimensions === 'object') {
                Object.assign(dimensions.value, data.dimensions);
              }
              if (data.propertyNotes && typeof data.propertyNotes === 'object') {
                Object.assign(propertyNotes.value, {
                  electricityCompany: '',
                  waterCompany: '',
                  gasCompany: '',
                  facilities: '',
                  ...data.propertyNotes
                });
              }

              isApplyingSync = false;
              syncStatus.value = 'connected';
            } else {
              // 部屋ドキュメントが存在しない場合は新規に作成（初期状態をアップロード）
              isApplyingSync = true;
              db.collection('rooms').doc(room).set({
                tasks: tasks.value.map(t => ({ id: t.id, s: t.statusShunsuke, a: t.statusAika })),
                costs: costs.value.map(c => ({ id: c.id, amount: c.amount, ratio: c.ratioShunsuke })),
                monthlyCosts: monthlyCosts.value.map(c => ({ id: c.id, amount: c.amount })),
                globalRatioShunsuke: globalRatioShunsuke.value,
                globalMonthlyRatioShunsuke: globalMonthlyRatioShunsuke.value,
                dimensions: dimensions.value,
                propertyNotes: propertyNotes.value,
                updatedAt: new Date().toISOString()
              }).then(() => {
                isApplyingSync = false;
                syncStatus.value = 'connected';
              }).catch((err: any) => {
                console.error('Initial Firestore set failed:', err);
                isApplyingSync = false;
                syncStatus.value = 'offline';
              });
            }
          }, (err: any) => {
            console.error('Firestore snapshot subscription failed:', err);
            syncStatus.value = 'offline';
          });
        } else {
          syncStatus.value = 'offline';
        }
      }
    });

    // --- 計算プロパティ ---

    const totalTaskCount = computed(() => tasks.value.length);
    
    // 進捗率の計算 (やらない・対象外は分母から除外する)
    const taskStats = computed(() => {
      let doneCount = 0;
      let totalCount = 0; // 全体の有効タスク数（分母）

      let shunsukeDone = 0;
      let shunsukeTotal = 0;
      let aikaDone = 0;
      let aikaTotal = 0;

      tasks.value.forEach(t => {
        // 竣介の個別進捗
        if (t.statusShunsuke !== 'やらない' && t.statusShunsuke !== '対象外') {
          shunsukeTotal++;
          if (t.statusShunsuke === '済') shunsukeDone++;
        }
        // 愛翔の個別進捗
        if (t.statusAika !== 'やらない' && t.statusAika !== '対象外') {
          aikaTotal++;
          if (t.statusAika === '済') aikaDone++;
        }

        // 全体の完了判定（両者が済・やらない・対象外のいずれか）
        const isShunsukeFinished = t.statusShunsuke === '済' || t.statusShunsuke === 'やらない' || t.statusShunsuke === '対象外';
        const isAikaFinished = t.statusAika === '済' || t.statusAika === 'やらない' || t.statusAika === '対象外';
        
        // どちらか一方でも有効な（やらない・対象外ではない）タスクである場合のみ、全体の分母に含める
        if ((t.statusShunsuke !== 'やらない' && t.statusShunsuke !== '対象外') || 
            (t.statusAika !== 'やらない' && t.statusAika !== '対象外')) {
          totalCount++;
          if (isShunsukeFinished && isAikaFinished) {
            doneCount++;
          }
        }
      });

      const overallProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
      const shunsukeProgress = shunsukeTotal > 0 ? Math.round((shunsukeDone / shunsukeTotal) * 100) : 0;
      const aikaProgress = aikaTotal > 0 ? Math.round((aikaDone / aikaTotal) * 100) : 0;

      return {
        overallProgress,
        shunsukeDone,
        shunsukeTotal,
        shunsukeProgress,
        aikaDone,
        aikaTotal,
        aikaProgress
      };
    });

    // 優先的に対応すべきタスク (竣介・愛翔のいずれかが未対応、かつ両者ともに「やらない/対象外」ではないもの上位5件)
    const priorityTasks = computed(() => {
      return tasks.value
        .filter(t => {
          const isShunsukeActive = t.statusShunsuke !== 'やらない' && t.statusShunsuke !== '対象外';
          const isAikaActive = t.statusAika !== 'やらない' && t.statusAika !== '対象外';
          const hasUnaddressed = t.statusShunsuke === '未対応' || t.statusAika === '未対応';
          return hasUnaddressed && (isShunsukeActive || isAikaActive);
        })
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
          if (filterAssignee.value === 'shunsuke') {
            matchStatus = t.statusShunsuke === filterStatus.value;
          } else if (filterAssignee.value === 'aika') {
            matchStatus = t.statusAika === filterStatus.value;
          } else {
            matchStatus = t.statusShunsuke === filterStatus.value || t.statusAika === filterStatus.value;
          }
        }

        // 担当者絞り込み (未完了の抽出用)
        let matchAssignee = true;
        if (filterAssignee.value !== 'all' && filterStatus.value === 'all') {
          if (filterAssignee.value === 'shunsuke') {
            matchAssignee = t.statusShunsuke !== 'やらない' && t.statusShunsuke !== '対象外' && t.statusShunsuke !== '済';
          } else {
            matchAssignee = t.statusAika !== 'やらない' && t.statusAika !== '対象外' && t.statusAika !== '済';
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

    // 初期費用の計算結果
    const costSummary = computed(() => {
      return calculateCosts(costs.value);
    });

    // 毎月の生活費の計算結果
    const monthlyCostSummary = computed(() => {
      return calculateMonthlyCosts(monthlyCosts.value, globalMonthlyRatioShunsuke.value);
    });

    // --- アクション/メソッド ---

    // タスクのステータス更新 (対象外を含めたローテーション)
    const toggleTaskStatus = (task: Task, person: 'shunsuke' | 'aika') => {
      const statuses: TaskStatus[] = ['未対応', '進行中', '済', 'やらない', '対象外'];
      const current = person === 'shunsuke' ? task.statusShunsuke : task.statusAika;
      const nextIndex = (statuses.indexOf(current) + 1) % statuses.length;
      const next = statuses[nextIndex];

      if (person === 'shunsuke') {
        task.statusShunsuke = next;
      } else {
        task.statusAika = next;
      }
    };

    const setTaskStatus = (task: Task, person: 'shunsuke' | 'aika', status: TaskStatus) => {
      if (person === 'shunsuke') {
        task.statusShunsuke = status;
      } else {
        task.statusAika = status;
      }
    };

    // アコーディオン開閉
    const toggleCategoryAccordion = (category: string) => {
      taskCategoryOpen.value[category] = !taskCategoryOpen.value[category];
    };

    // 全体の一括負担割合を設定 (初期費用に適用)
    const applyGlobalRatio = (val: number) => {
      globalRatioShunsuke.value = val;
      costs.value.forEach(c => {
        c.ratioShunsuke = val;
      });
    };

    // 生活費の一括負担割合を設定
    const applyGlobalMonthlyRatio = (val: number) => {
      globalMonthlyRatioShunsuke.value = val;
    };

    // 金額の更新
    const updateCostAmount = (costId: string, amount: number) => {
      const item = costs.value.find(c => c.id === costId);
      if (item) {
        item.amount = Math.max(0, amount);
      }
    };

    // 生活費の金額更新
    const updateMonthlyCostAmount = (costId: string, amount: number) => {
      const item = monthlyCosts.value.find(c => c.id === costId);
      if (item) {
        item.amount = Math.max(0, amount);
      }
    };

    // 個別比率の更新
    const updateCostRatio = (costId: string, ratio: number) => {
      const item = costs.value.find(c => c.id === costId);
      if (item) {
        item.ratioShunsuke = Math.min(100, Math.max(0, ratio));
      }
    };

    // 簡単LINE同期: データエクスポート
    const exportSyncCode = () => {
      const syncData: SyncData = {
        tasks: tasks.value.map(t => ({ id: t.id, s: t.statusShunsuke, a: t.statusAika })),
        costs: costs.value.map(c => ({ id: c.id, amount: c.amount, ratio: c.ratioShunsuke })),
        monthlyCosts: monthlyCosts.value.map(c => ({ id: c.id, amount: c.amount })),
        globalRatioShunsuke: globalRatioShunsuke.value,
        globalMonthlyRatioShunsuke: globalMonthlyRatioShunsuke.value
      };

      const code = encodeSyncData(syncData);
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          showNotification('success', '同期コードをコピーしました！LINE等でパートナーに送ってください。');
        }).catch(err => {
          console.error('Clipboard copy failed:', err);
          showNotification('error', 'コピーに失敗しました。下のコードを手動でコピーしてください。');
          syncInputCode.value = code;
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
            task.statusShunsuke = dt.s;
            task.statusAika = dt.a;
          }
        });

        // 初期費用状態の復元
        decoded.costs.forEach(dc => {
          const cost = costs.value.find(c => c.id === dc.id);
          if (cost) {
            cost.amount = dc.amount;
            cost.ratioShunsuke = dc.ratio;
          }
        });

        // 生活費状態の復元
        decoded.monthlyCosts.forEach(dmc => {
          const mCost = monthlyCosts.value.find(mc => mc.id === dmc.id);
          if (mCost) {
            mCost.amount = dmc.amount;
          }
        });

        globalRatioShunsuke.value = decoded.globalRatioShunsuke;
        globalMonthlyRatioShunsuke.value = decoded.globalMonthlyRatioShunsuke;
        
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
        monthlyCosts.value = getInitialMonthlyCosts();
        globalRatioShunsuke.value = 50;
        globalMonthlyRatioShunsuke.value = 50;
        dimensions.value = getInitialDimensions();
        propertyNotes.value = getInitialPropertyNotes();
        localStorage.removeItem(STORAGE_KEY);
        
        // 部屋IDを再生成してURL更新
        if (typeof window !== 'undefined') {
          const room = generateRoomId();
          const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + room;
          window.history.replaceState({ path: newUrl }, '', newUrl);
          roomId.value = room;
        }
        
        showNotification('success', 'データを初期化しました。');
      }
    };

    // 招待用URLのコピー
    const copyInviteUrl = () => {
      if (typeof window !== 'undefined' && roomId.value) {
        const inviteUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + roomId.value;
        navigator.clipboard.writeText(inviteUrl).then(() => {
          showNotification('success', '招待用URLをコピーしました！LINE等でパートナーに送ってください。');
        }).catch(err => {
          console.error('Invite URL copy failed:', err);
          showNotification('error', 'URLのコピーに失敗しました。手動でURLをコピーしてください。');
        });
      }
    };

    return {
      tasks,
      costs,
      monthlyCosts,
      dimensions,
      propertyNotes,
      globalRatioShunsuke,
      globalMonthlyRatioShunsuke,
      roomId,
      syncStatus,
      copyInviteUrl,
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
      monthlyCostSummary,
      toggleTaskStatus,
      setTaskStatus,
      toggleCategoryAccordion,
      applyGlobalRatio,
      applyGlobalMonthlyRatio,
      updateCostAmount,
      updateMonthlyCostAmount,
      updateCostRatio,
      exportSyncCode,
      importSyncCode,
      resetAllData
    };
  }
});

app.mount('#app');
