import { useState } from "react";
import { WorkOrder, Priority, WorkOrderStatus } from "../types";
import { Clock, CheckCircle2, Play, AlertCircle, Trash2, Calendar, User, Search, RefreshCw, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WorkOrdersListProps {
  id: string;
  orders: WorkOrder[];
  loading: boolean;
  onUpdateStatus: (id: string, nextStatus: WorkOrderStatus) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  viewMode?: 'auto' | 'desktop' | 'tablet' | 'mobile';
  onDiagnoseOrder?: (order: WorkOrder) => void;
}

export default function WorkOrdersList({
  id,
  orders,
  loading,
  onUpdateStatus,
  onDeleteOrder,
  viewMode = 'auto',
  onDiagnoseOrder,
}: WorkOrdersListProps) {
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active"); // default is active (pending + in_progress)
  const [query, setQuery] = useState("");

  const filteredOrders = orders.filter((order) => {
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;
    
    let matchesStatus = true;
    if (statusFilter === "active") {
      matchesStatus = order.status !== "completed";
    } else if (statusFilter !== "all") {
      matchesStatus = order.status === statusFilter;
    }

    const matchesQuery = 
      order.machineId.toLowerCase().includes(query.toLowerCase()) ||
      order.issue.toLowerCase().includes(query.toLowerCase()) ||
      order.reporter.toLowerCase().includes(query.toLowerCase());

    return matchesPriority && matchesStatus && matchesQuery;
  });

  const getPriorityBadgeAndLabel = (priority: Priority) => {
    switch (priority) {
      case "high":
        return {
          label: "高 (High)",
          color: "border-rose-500/30 bg-rose-500/10 text-rose-400 font-bold",
          dot: "bg-rose-500 animate-pulse",
        };
      case "medium":
        return {
          label: "中 (Medium)",
          color: "border-amber-500/30 bg-amber-500/10 text-amber-400 font-semibold",
          dot: "bg-amber-500",
        };
      case "low":
        return {
          label: "低 (Low)",
          color: "border-slate-700 bg-slate-800/40 text-slate-300",
          dot: "bg-slate-500",
        };
    }
  };

  const getStatusInfo = (status: WorkOrderStatus) => {
    switch (status) {
      case "pending":
        return {
          label: "待處理",
          color: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
          desc: "設備已發出缺陷警報，等待班長派工修復"
        };
      case "in_progress":
        return {
          label: "維護中",
          color: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
          desc: "維護工程師已攜帶備品到達現場檢修"
        };
      case "completed":
        return {
          label: "已完成",
          color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          desc: "異常排除，機台功能測試正常，已重啟生產"
        };
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("zh-TW", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div id={id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6 shadow-xl backdrop-blur-md">
      {/* Search and Filters Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-display">
            工單運作狀態日誌
            <span className="text-xs bg-slate-800 text-slate-400 py-0.5 px-2.5 rounded-full font-mono">
              {filteredOrders.length} 筆
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">即時派遣管理、故障排除生命週期監測</p>
        </div>

        {/* Filters panel */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          {/* Text search */}
          <div className="relative w-full sm:w-48">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="搜尋編號、問題及通報人..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          {/* Status Segmented control */}
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-1 text-xs justify-between gap-1 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter("active")}
              className={`rounded px-3 py-2 font-medium transition duration-155 flex-1 sm:flex-initial text-center ${
                statusFilter === "active" ? "bg-slate-800 text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              未完成
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`rounded px-3 py-2 font-medium transition duration-155 flex-1 sm:flex-initial text-center ${
                statusFilter === "completed" ? "bg-slate-800 text-emerald-400 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              已完修
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded px-3 py-2 font-medium transition duration-155 flex-1 sm:flex-initial text-center ${
                statusFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              全選
            </button>
          </div>

          {/* Priority dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-xs text-slate-300 focus:border-cyan-500/50 focus:outline-none w-full sm:w-auto"
          >
            <option value="all">所有優先級</option>
            <option value="high">高優先 (High)</option>
            <option value="medium">中優先 (Medium)</option>
            <option value="low">低優先 (Low)</option>
          </select>
        </div>
      </div>

      {/* Orders container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
          <span>工單日誌讀取中...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/20 p-8 text-center text-xs text-slate-500">
          目前無任何符合條件的設備異常申報單。
        </div>
      ) : (
        <div className={
          viewMode === "mobile"
            ? "grid grid-cols-1 gap-4"
            : viewMode === "tablet"
            ? "grid grid-cols-2 gap-4"
            : viewMode === "desktop"
            ? "grid grid-cols-3 gap-6"
            : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        }>
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => {
              const priorityInfo = getPriorityBadgeAndLabel(order.priority);
              const statusInfo = getStatusInfo(order.status);

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div>
                    {/* Card Top: Machine Id + Priority badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold tracking-wider text-cyan-400 px-2 py-1 bg-cyan-950/25 rounded border border-cyan-500/25">
                          {order.machineId}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] border ${priorityInfo.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${priorityInfo.dot}`} />
                          {priorityInfo.label}
                        </span>
                      </div>

                      {/* Status select icon/text */}
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Trouble Description */}
                    <p className="text-sm text-slate-200 mb-3 leading-relaxed bg-slate-900/20 p-3 rounded-lg border border-slate-900/60 break-words">
                      {order.issue}
                    </p>

                    {/* AI Diagnosis Action */}
                    {onDiagnoseOrder && (
                      <button
                        onClick={() => onDiagnoseOrder(order)}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-950/40 hover:bg-indigo-950/70 border border-indigo-500/25 hover:border-indigo-400/40 text-indigo-300 hover:text-indigo-100 py-2.5 px-3 text-xs font-semibold select-none transition cursor-pointer active:scale-[0.98] mb-1"
                        id={`btn-ai-diagnose-${order.id}`}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                        <span>智慧 AI 診斷與安全巡檢建議</span>
                      </button>
                    )}
                  </div>

                  {/* Card Bottom: Metadata & Actions */}
                  <div className="border-t border-slate-900/60 pt-4 mt-2 flex flex-col gap-4">
                    {/* Metadata line */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <User className="h-4.5 w-4.5 text-slate-500" />
                        通報人員: <span className="text-slate-300 font-medium">{order.reporter}</span>
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-slate-400">
                        <Calendar className="h-4.5 w-4.5 text-slate-500" />
                        {formatTime(order.createdAt)}
                      </span>
                    </div>

                    {/* State workflow update actions */}
                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-900/50">
                      <div className="flex items-center gap-2 flex-grow sm:flex-normal">
                        {order.status === "pending" && (
                          <button
                            onClick={() => onUpdateStatus(order.id, "in_progress")}
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/40 hover:bg-cyan-950/80 active:scale-95 border border-cyan-500/30 px-4 py-2.5 rounded-lg transition min-h-[40px] flex-grow sm:flex-initial"
                          >
                            <Play className="h-3.5 w-3.5 fill-cyan-400 text-cyan-400" />
                            開始檢修
                          </button>
                        )}
                        {order.status === "in_progress" && (
                          <button
                            onClick={() => onUpdateStatus(order.id, "completed")}
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/80 active:scale-95 border border-emerald-500/30 px-4 py-2.5 rounded-lg transition min-h-[40px] flex-grow sm:flex-initial"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            排除完工
                          </button>
                        )}
                        {order.status === "completed" && (
                          <button
                            onClick={() => onUpdateStatus(order.id, "pending")}
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-950/20 hover:bg-rose-950/40 active:scale-95 border border-rose-500/20 px-3 py-2 rounded-lg transition min-h-[40px]"
                          >
                            重啟追蹤
                          </button>
                        )}
                        <span className="hidden sm:inline text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                          流程調度
                        </span>
                      </div>

                      {/* Delete option */}
                      <button
                        onClick={() => onDeleteOrder(order.id)}
                        className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-950/30 transition duration-150 active:scale-90 border border-transparent hover:border-rose-500/10"
                        title="刪除異常工單"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
