import { useState, useEffect } from "react";
import { 
  Activity, 
  Clock, 
  Wrench, 
  AlertTriangle, 
  Database, 
  Terminal, 
  RotateCcw, 
  CheckCircle,
  X,
  Gauge,
  Sliders,
  Cpu,
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SparePart, WorkOrder, DashboardStats } from "./types";
import MetricCard from "./components/MetricCard";
import PartsTable from "./components/PartsTable";
import WorkOrderForm from "./components/WorkOrderForm";
import WorkOrdersList from "./components/WorkOrdersList";
import OEEForecastChart from "./components/OEEForecastChart";

export default function App() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ oee: 92.4, abnormalDowntimes: 5, pendingWorkOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'auto' | 'desktop' | 'tablet' | 'mobile'>('auto');

  // AI Feature States
  const [diagnoseOrder, setDiagnoseOrder] = useState<WorkOrder | null>(null);
  const [diagnoseData, setDiagnoseData] = useState<any>(null);
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const [plantReportData, setPlantReportData] = useState<any>(null);
  const [plantReportLoading, setPlantReportLoading] = useState(false);
  const [showPlantReport, setShowPlantReport] = useState(false);
  
  // Banner notifications
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Auto clean notifications after 6 seconds
  useEffect(() => {
    if (errorBanner) {
      const timer = setTimeout(() => setErrorBanner(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorBanner]);

  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  const fetchData = async () => {
    try {
      const [partsRes, ordersRes, statsRes] = await Promise.all([
        fetch("/api/parts"),
        fetch("/api/workorders"),
        fetch("/api/stats")
      ]);

      if (partsRes.ok && ordersRes.ok && statsRes.ok) {
        const partsData = await partsRes.json();
        const ordersData = await ordersRes.json();
        const statsData = await statsRes.json();
        
        setParts(partsData);
        setOrders(ordersData);
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 10 seconds for real-time equipment log sync
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenDiagnose = async (order: WorkOrder) => {
    setDiagnoseOrder(order);
    setDiagnoseLoading(true);
    setDiagnoseData(null);
    setCheckedSteps({});
    try {
      const res = await fetch("/api/gemini/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderId: order.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiagnoseData(data);
      } else {
        setErrorBanner("AI 診斷核心服務瞬斷，請稍後再試。");
      }
    } catch (err) {
      setErrorBanner("無法連線至 AI 終端分析迴路。");
    } finally {
      setDiagnoseLoading(false);
    }
  };

  const handleGeneratePlantReport = async () => {
    setShowPlantReport(true);
    setPlantReportLoading(true);
    setPlantReportData(null);
    try {
      const res = await fetch("/api/gemini/plant-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setPlantReportData(data);
      } else {
        setErrorBanner("智慧全廠巡報分析生成失敗。");
      }
    } catch (err) {
      setErrorBanner("通訊層阻斷，無法取得 OEE 廠區分析。");
    } finally {
      setPlantReportLoading(false);
    }
  };

  const handleCheckoutPart = async (partId: string, qtyNeeded: number) => {
    const targetPart = parts.find(p => p.id === partId);
    if (!targetPart) return;
    if (targetPart.currentStock < qtyNeeded) {
      setErrorBanner(`零件「${targetPart.name}」剩餘庫存為 ${targetPart.currentStock} 件，不足以核扣 ${qtyNeeded} 件！`);
      return;
    }
    const nextStock = targetPart.currentStock - qtyNeeded;
    // Perform standard stock adjustment
    await handleAdjustStock(partId, nextStock);
    setSuccessBanner(`料庫核扣指令成功：現場對齊 ${qtyNeeded} 個 "${targetPart.name}" 已成功領出。`);
  };

  const toggleStepCheck = (index: number) => {
    setCheckedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleAdjustStock = async (partId: string, newStock: number) => {
    try {
      const res = await fetch(`/api/parts/${partId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStock: newStock })
      });
      if (res.ok) {
        // Refetch to ensure stats and warning rows update
        await fetchData();
      } else {
        const data = await res.json();
        setErrorBanner(data.error || "調整庫存失敗");
      }
    } catch (err) {
      setErrorBanner("系統庫存通訊異常");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: any) => {
    try {
      const res = await fetch(`/api/workorders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        setErrorBanner(data.error || "更新工單狀態失敗");
      }
    } catch (err) {
      setErrorBanner("伺服器更新工單狀態失敗");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/workorders/${orderId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchData();
        setSuccessBanner("工單已被成功刪除");
      } else {
        const data = await res.json();
        setErrorBanner(data.error || "刪除工單失敗");
      }
    } catch (err) {
      setErrorBanner("通訊錯誤，無法刪除工單");
    }
  };

  const handleResetData = async () => {
    if (!confirm("確定要重置系統嗎？所有新增的工單及庫存數值將回復至原廠設定。")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSuccessBanner(data.message);
        await fetchData();
      } else {
        setErrorBanner("重新設定失敗");
      }
    } catch (err) {
      setErrorBanner("無法連接至備品伺服器");
    } finally {
      setLoading(false);
    }
  };

  // Count low stock parts
  const lowStockCount = parts.filter(p => p.currentStock < p.safetyStock).length;

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 selection:bg-cyan-500/30 selection:text-white pb-16">
      
      {/* Decorative tech grid backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-rose-500/5 blur-[140px] rounded-full pointer-events-none" />

      {/* Header Panel */}
      <header className="relative border-b border-slate-900 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-lg shadow-cyan-500/20 border border-cyan-400/20 shrink-0">
              <Cpu className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white font-display">
                  設備維護與備品安全庫存追蹤系統
                </h1>
                <span className="text-[10px] bg-cyan-950 border border-cyan-500/30 text-cyan-400 py-0.5 px-2 rounded-full font-mono font-semibold">
                  Live Terminal
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                自動化安全庫存平衡與故障通報分析平台 • Automated Factory Suite
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t border-slate-900 pt-3 md:pt-0 md:border-t-0">
            {/* Soft background synchronization indicator */}
            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 border border-slate-800/80 bg-slate-900/40 py-1.5 px-3 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">系統連線正常 (10s 輪詢)</span>
            </div>

            {/* Interactive Layout Switcher */}
            <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800/80 p-1 rounded-lg">
              <button
                onClick={() => setLayoutMode('auto')}
                title="自動響應版型"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition duration-150 ${
                  layoutMode === 'auto'
                    ? 'bg-cyan-600/30 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">智能 RWD</span>
              </button>
              <button
                onClick={() => setLayoutMode('desktop')}
                title="強制電腦版視圖"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition duration-150 ${
                  layoutMode === 'desktop'
                    ? 'bg-blue-600/30 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">電腦版</span>
              </button>
              <button
                onClick={() => setLayoutMode('tablet')}
                title="強制平板版視圖"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition duration-150 ${
                  layoutMode === 'tablet'
                    ? 'bg-purple-600/30 text-purple-400 border border-purple-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Tablet className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">平板版</span>
              </button>
              <button
                onClick={() => setLayoutMode('mobile')}
                title="強制手機版視圖"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold transition duration-150 ${
                  layoutMode === 'mobile'
                    ? 'bg-rose-600/30 text-rose-400 border border-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">手機版</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                title="強制整理資料"
                className="p-2.5 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-900/60 rounded-lg hover:bg-slate-900 transition flex items-center gap-1.5 text-xs font-semibold active:scale-95"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                <span className="hidden lg:inline">整理</span>
              </button>

              <button
                onClick={handleResetData}
                className="p-2.5 text-slate-400 hover:text-rose-400 border border-slate-850 hover:border-rose-955 bg-slate-900/30 rounded-lg hover:bg-rose-950/20 transition flex items-center gap-1.5 text-xs font-semibold active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">重置</span>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Floating Smart Anchor Jumps for Mobile Quick Navigation - Elevates UX UX significantly on phones */}
      <div className="sticky top-[73px] sm:top-[81px] z-30 bg-[#070a13]/90 backdrop-blur-md border-b border-slate-900/80 py-2.5 px-4 scrollbar-none overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-2 text-xs whitespace-nowrap">
          <span className="text-slate-500 py-1.5 px-1 font-semibold text-[11px] uppercase tracking-wider font-display">
            快速跳盤：
          </span>
          <a
            href="#metric-dashboard-section"
            className="rounded-full bg-slate-900/80 hover:bg-cyan-950/40 hover:text-cyan-400 border border-slate-800 px-3.5 py-1.5 font-medium transition text-slate-300 text-[11px]"
          >
            📊 數據指標
          </a>
          <a
            href="#parts-tracker-table"
            className="rounded-full bg-slate-900/80 hover:bg-cyan-950/40 hover:text-cyan-400 border border-slate-800 px-3.5 py-1.5 font-medium transition text-slate-300 text-[11px]"
          >
            ⚙️ 備件安全庫存 {lowStockCount > 0 && <span className="text-rose-400 font-bold">({lowStockCount})</span>}
          </a>
          <a
            href="#dispatch-form"
            className="rounded-full bg-slate-900/80 hover:bg-cyan-950/40 hover:text-cyan-400 border border-slate-800 px-3.5 py-1.5 font-medium transition text-slate-300 text-[11px]"
          >
            📝 快速申報表
          </a>
          <a
            href="#orders-workflow-manager"
            className="rounded-full bg-slate-900/80 hover:bg-cyan-950/40 hover:text-cyan-400 border border-slate-800 px-3.5 py-1.5 font-medium transition text-slate-300 text-[11px]"
          >
            📋 異常派遣日誌
          </a>
        </div>
      </div>

      {/* Notification Banners */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
        <AnimatePresence mode="popLayout">
          {errorBanner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-200 shadow-lg shadow-rose-950/20"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
                <span><strong>控制系統錯誤回報：</strong> {errorBanner}</span>
              </div>
              <button onClick={() => setErrorBanner(null)} className="text-rose-400 hover:text-rose-200 transition p-1">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {successBanner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-sm text-emerald-200 shadow-lg shadow-emerald-950/20"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                <span><strong>系統作業成功：</strong> {successBanner}</span>
              </div>
              <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-emerald-200 transition p-1">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Grid Content */}
      <main className={
        layoutMode === "mobile"
          ? "max-w-[420px] mx-auto px-4 mt-6 space-y-6 border border-slate-800 rounded-3xl p-4 bg-[#050811] shadow-2xl relative transition-all duration-300 animate-fade-in"
          : layoutMode === "tablet"
          ? "max-w-[820px] mx-auto px-5 mt-6 space-y-6 border border-slate-800 rounded-2xl p-6 bg-[#050811] shadow-2xl relative transition-all duration-300 animate-fade-in"
          : "max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6 transition-all duration-300"
      }>
        
        {/* Mockup simulation status header */}
        {(layoutMode === "mobile" || layoutMode === "tablet") && (
          <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-1 text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {layoutMode === "mobile" ? "📱 微型巡檢視圖模擬 (Smartphone View W:420px)" : "📟 工業平板調度視圖模擬 (Tablet View W:820px)"}
            </span>
            <button 
              onClick={() => setLayoutMode("auto")} 
              className="text-cyan-400 hover:underline hover:text-cyan-300 font-semibold"
            >
              回復預設 RWD
            </button>
          </div>
        )}
        
        {/* Metric Cards Row */}
        <section id="metric-dashboard-section" className="space-y-4">
          <div className={
            layoutMode === "mobile"
              ? "grid grid-cols-1 gap-4"
              : layoutMode === "tablet"
              ? "grid grid-cols-2 gap-4"
              : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          }>
            
            <MetricCard
              id="metric-oee"
              title="目前機台稼動率 (OEE)"
              value={stats.oee}
              unit="%"
              subtitle="正常標準：> 85%"
              trend={stats.oee >= 85 ? "🟢 廠房效能正常" : "⚠️ 警戒狀態 (機台待修或停圈)"}
              trendType={stats.oee >= 85 ? "positive" : "negative"}
              icon={<Gauge className="h-5 w-5" />}
              color={stats.oee >= 85 ? "cyan" : stats.oee >= 75 ? "amber" : "rose"}
            />
 
            <MetricCard
              id="metric-downtime"
              title="累計異常停機次數"
              value={stats.abnormalDowntimes}
              unit="次"
              subtitle="包含待排程與高優先級故障"
              trend={stats.abnormalDowntimes > 6 ? "🔴 故障頻率稍高" : "🟢 符合停機控制目標"}
              trendType={stats.abnormalDowntimes > 6 ? "negative" : "positive"}
              icon={<Activity className="h-5 w-5" />}
              color={stats.abnormalDowntimes > 6 ? "rose" : "amber"}
            />
 
            <MetricCard
              id="metric-pending-orders"
              title="尚待處理維護工單"
              value={stats.pendingWorkOrders}
              unit="張"
              subtitle="已分派與未檢修之警報單"
              trend={lowStockCount > 1 ? `${lowStockCount} 種備品急需進貨` : "原物料備料充足"}
              trendType={lowStockCount > 2 ? "negative" : "neutral"}
              icon={<Wrench className="h-5 w-5" />}
              color={stats.pendingWorkOrders > 2 ? "amber" : "emerald"}
            />
 
          </div>
 
          {/* Plant Telemetry Aesthetic Visualization Card */}
          <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-5 shadow-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono font-bold">SCADA Live Stream</span>
                <h3 className="text-sm font-bold text-slate-200 mt-0.5">全廠機台稼動趨勢 (24H 滾動監控)</h3>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={handleGeneratePlantReport}
                  className="flex items-center gap-1.5 text-xs font-bold text-purple-400 border border-purple-500/25 bg-purple-950/20 hover:bg-purple-950/50 px-3 py-2 rounded-lg transition active:scale-95 shadow-md shadow-purple-950/20 focus:outline-none"
                  id="btn-ai-plant-report"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                  <span>生成 AI 全廠預測預警與點檢建議</span>
                </button>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> 機台稼動 (OEE)</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> 警報降維區間</span>
                </div>
              </div>
            </div>
 
            {/* Simulated Live SCADA Telemetry Chart */}
            <div className="h-24 w-full bg-slate-950/80 rounded-lg p-2 border border-slate-900/50 flex items-end">
              <svg className="h-full w-full opacity-90" viewBox="0 0 100 30" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="oeeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid Lines */}
                <line x1="0" y1="5" x2="100" y2="5" stroke="#1e293b" strokeWidth="0.1" strokeDasharray="1,1" />
                <line x1="0" y1="15" x2="100" y2="15" stroke="#1e293b" strokeWidth="0.1" strokeDasharray="1,1" />
                <line x1="0" y1="25" x2="100" y2="25" stroke="#1e293b" strokeWidth="0.1" strokeDasharray="1,1" />
                
                {/* Area path */}
                <path
                  d={`M 0,30 L 0,16 L 10,14 L 20,19 L 30,12 L 40,11 L 50,15 L 60,10 L 70,11 L 80,${30 - (stats.oee / 3.4)} L 90,${30 - (stats.oee / 3.3)} L 100,${30 - (stats.oee / 3.5)} L 100,30 Z`}
                  fill="url(#oeeGradient)"
                />
                
                {/* Line path */}
                <path
                  d={`M 0,16 L 10,14 L 20,19 L 30,12 L 40,11 L 50,15 L 60,10 L 70,11 L 80,${30 - (stats.oee / 3.4)} L 90,${30 - (stats.oee / 3.3)} L 100,${30 - (stats.oee / 3.5)}`}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="0.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
 
                {/* Pulsing endpoint dot for live status */}
                <circle cx="100" cy={30 - (stats.oee / 3.5)} r="1" fill="#fff" />
                <circle cx="100" cy={30 - (stats.oee / 3.5)} r="2" fill="#22d3ee" fillOpacity="0.6" className="animate-ping" />
              </svg>
            </div>
            
            <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-mono">
              <span>08:00 (大夜班)</span>
              <span>12:00 (早班)</span>
              <span>16:00 (中班)</span>
              <span>20:00 (常日班)</span>
              <span>現在 (Live 更新值: {stats.oee}%)</span>
            </div>
          </div>

          {/* Real-time 7 Days OEE History (Bar Chart) & Next Week AI Trend Projection */}
          <OEEForecastChart
            pendingWorkOrdersCount={stats.pendingWorkOrders}
            onRefreshTrigger={fetchData}
          />
        </section>
 
        {/* Dynamic Warning Alert Bar when spare parts are critical */}
        {lowStockCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-rose-500/20 bg-rose-950/15 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-300"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span>
                <strong>安全庫存紅色防護預警：</strong> 偵測到有 <strong>{lowStockCount} 項</strong> 核心備件存量已低於設定的安全警戒線，請儘速核對供應商採購單！
              </span>
            </div>
            <a href="#parts-tracker-table" className="text-rose-400 hover:text-rose-200 underline font-semibold shrink-0">
              檢視缺料品項 →
            </a>
          </motion.div>
        )}
 
        {/* Work Order Submission & Inventory list split view */}
        <section className={
          layoutMode === "mobile"
            ? "grid grid-cols-1 gap-6"
            : layoutMode === "tablet"
            ? "grid grid-cols-1 md:grid-cols-3 gap-6"
            : "grid grid-cols-1 md:grid-cols-3 gap-6"
        }>
          
          {/* Column 1: Submit Work Order Input */}
          <div className={
            layoutMode === "mobile"
              ? "col-span-1"
              : "md:col-span-1"
          }>
            <WorkOrderForm
              id="dispatch-form"
              onOrderCreated={fetchData}
              setErrorBanner={setErrorBanner}
              setSuccessBanner={setSuccessBanner}
            />
            
            {/* Quick System Legend Card */}
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/20 p-5 text-xs text-slate-400 space-y-2.5">
              <h3 className="font-semibold text-slate-300 flex items-center gap-2 font-display">
                <Terminal className="h-4 w-4 text-cyan-400" />
                維護保養防呆規範
              </h3>
              <p>1. 申報故障之機台編號，後端採用嚴格正規化驗證，必須以 <code>MC-</code> 前綴做開置，如：MC-001、MC-200 等。</p>
              <p>2. 當申報「高 (High)」優先權之故障單時，系統將自動調整當前機台稼動率 (OEE) 指標，並即刻加總異常停機計數。</p>
              <p>3. 備品清單下方包含即時存量增減機制，可用於巡檢人員現場領料時當場做資料對齊同步。</p>
            </div>
          </div>
 
          {/* Column 2: Spare Parts Table */}
          <div className={
            layoutMode === "mobile"
              ? "col-span-1 space-y-6"
              : "md:col-span-2 space-y-6"
          }>
            <PartsTable
              id="parts-tracker-table"
              parts={parts}
              loading={loading}
              onAdjustStock={handleAdjustStock}
              viewMode={layoutMode}
            />
          </div>
 
        </section>
 
        {/* Large Row: Work Orders Workflow Track Grid */}
        <section>
          <WorkOrdersList
            id="orders-workflow-manager"
            orders={orders}
            loading={loading}
            onUpdateStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            viewMode={layoutMode}
            onDiagnoseOrder={handleOpenDiagnose}
          />
        </section>
 
      </main>

      {/* UI Sub-Footer */}
      <footer className="max-w-7xl mx-auto px-6 mt-12 text-center text-xs text-slate-500 border-t border-slate-900/60 pt-6">
        <p>© 2026 設備維護與備品在庫系統 • 智慧倉儲及派工調度儀表面板</p>
        <p className="mt-1 text-slate-600">
          前端：React + Tailwind CSS + Lucide Icons • 後端：Node.js Express 快速核心
        </p>
      </footer>

      {/* 1. AI Intelligent Individual Diagnosis Slide-over Drawer / Modal */}
      <AnimatePresence>
        {diagnoseOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!diagnoseLoading) setDiagnoseOrder(null); }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Container */}
            <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-[#070b16] shadow-2xl relative"
                id="modal-ai-diagnosis"
              >
                {/* Modal Header */}
                <div className="border-b border-slate-900 bg-slate-950/50 p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-950/80 border border-indigo-500/20 text-indigo-400">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 font-display">
                        智慧 AI 巡檢診斷與現場點檢單
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        機台編號: <span className="font-mono text-cyan-400 font-semibold">{diagnoseOrder.machineId}</span> • 申報缺陷: {diagnoseOrder.issue.substring(0, 30)}...
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDiagnoseOrder(null)}
                    disabled={diagnoseLoading}
                    className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition active:scale-90"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-slate-900">
                  {diagnoseLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center">
                      <div className="relative flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full border-t-2 border-r-2 border-indigo-500 animate-spin"></div>
                        <Sparkles className="h-5 w-5 text-indigo-400 absolute animate-pulse" />
                      </div>
                      <p className="text-xs text-indigo-300 font-semibold mt-4 text-center tracking-wide">
                        智慧 AI 核心正在分析故障歷史及實體電路特性...
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1.5 text-center max-w-sm">
                        對接現場零件安全水位基準，比對當前在庫數值...
                      </p>
                    </div>
                  ) : diagnoseData ? (
                    <div className="space-y-6">
                      
                      {/* Section 1: Failure Diagnosis Reason */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                          <Activity className="h-3.5 w-3.5 text-indigo-400" />
                          故障根因科學分析 (Root Cause Analysis)
                        </h4>
                        <div className="rounded-xl border border-indigo-500/10 bg-indigo-950/15 p-4 text-sm leading-relaxed text-indigo-200">
                          {diagnoseData.rootCauseAnalysis}
                        </div>
                      </div>

                      {/* Section 2: Real-time Actionable Part Checkout */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                          <Database className="h-3.5 w-3.5 text-cyan-400" />
                          現場維護推薦零件領用一鍵配對
                        </h4>
                        
                        <div className="space-y-2.5">
                          {diagnoseData.sparePartsNeeded && diagnoseData.sparePartsNeeded.length > 0 ? (
                            diagnoseData.sparePartsNeeded.map((item: any, idx: number) => {
                              // Cross-match with real inventory database
                              const dbPart = parts.find(p => p.id === item.partId || p.name.includes(item.partNameOfIdentified));
                              const qtyNeeded = item.qtyNeeded || 1;
                              const hasEnough = dbPart ? dbPart.currentStock >= qtyNeeded : false;

                              return (
                                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-bold text-slate-200">
                                        {item.partNameOfIdentified}
                                      </span>
                                      {dbPart ? (
                                        <span className={`text-[10px] rounded px-1.5 py-0.5 border font-semibold ${
                                          hasEnough
                                            ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400"
                                            : "bg-rose-950/40 border-rose-500/20 text-rose-400"
                                        }`}>
                                          {hasEnough 
                                            ? `在庫充足 (剩餘: ${dbPart.currentStock} 個 / 安全基準: ${dbPart.safetyStock})` 
                                            : `在庫告急！(現存: ${dbPart.currentStock} 個 / 需求量: ${qtyNeeded})`
                                          }
                                        </span>
                                      ) : (
                                        <span className="text-[10px] rounded px-1.5 py-0.5 border bg-slate-900 border-slate-800 text-slate-400 font-semibold">
                                          非本庫標準件 (建議外部調度)
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                      <span className="text-indigo-400 font-semibold">領用原因：</span>{item.reason}
                                    </p>
                                  </div>

                                  {dbPart && (
                                    <div className="shrink-0">
                                      <button
                                        onClick={() => handleCheckoutPart(dbPart.id, qtyNeeded)}
                                        disabled={!hasEnough}
                                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-lg border transition active:scale-95 ${
                                          hasEnough
                                            ? "bg-emerald-950/40 hover:bg-emerald-950/80 text-emerald-300 border-emerald-500/30 cursor-pointer"
                                            : "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed"
                                        }`}
                                      >
                                        <Wrench className="h-3.5 w-3.5" />
                                        一鍵領用此備件
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-xs text-slate-500 italic p-3 text-center rounded border border-slate-900">
                              此項維護操作分析不需額外替換常用零件零組件。
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 3: Interactive Field Checklist Steps */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                          現場實體點檢作業核對 (Interactive Field Checklist)
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          * 現場維護工程師實地排除故障時，請依序勾選每項實施成果，以完備標準 SOP 的驗證記錄：
                        </p>
                        
                        <div className="divide-y divide-slate-900/60 rounded-xl border border-slate-850 bg-slate-950/30 overflow-hidden">
                          {diagnoseData.inspectionSteps && diagnoseData.inspectionSteps.map((step: string, index: number) => {
                            const isChecked = !!checkedSteps[index];
                            return (
                              <label
                                key={index}
                                className={`flex items-start gap-3 p-3.5 transition select-none cursor-pointer hover:bg-slate-900/20 ${
                                  isChecked ? "bg-slate-900/10 text-slate-400" : "text-slate-200"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleStepCheck(index)}
                                  className="mt-1 h-3.5 w-3.5 text-emerald-500 bg-slate-950 border-slate-800 rounded focus:ring-emerald-500/40 focus:ring-offset-0 cursor-pointer"
                                />
                                <span className={`text-xs leading-relaxed ${isChecked ? "line-through text-slate-500" : ""}`}>
                                  {step}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section 4: Safety & Timing */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-rose-500/10 bg-rose-950/10 p-4 space-y-1.5">
                          <h5 className="text-[11px] font-bold text-rose-400 flex items-center gap-1 uppercase tracking-wide">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            高壓與電氣防護指令 (LOTO)
                          </h5>
                          <ul className="text-[11px] text-rose-300/90 leading-relaxed list-disc list-inside space-y-1">
                            {diagnoseData.safetyPrecautions && diagnoseData.safetyPrecautions.map((p: string, i: number) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-4 flex flex-col justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                              預計維護排除時長
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-extrabold text-cyan-400 font-mono">
                                {diagnoseData.repairDurationMinutes || 30}
                              </span>
                              <span className="text-xs text-slate-400">分鐘 (Mins)</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed mt-2 border-t border-slate-900/80 pt-2">
                            分析係依據該機台目前缺陷複雜程度做最優工時預算。
                          </p>
                        </div>
                      </div>

                      {/* Notice of Simulation */}
                      {diagnoseData.isSimulated && (
                        <div className="rounded-lg border border-slate-850 bg-slate-900/20 p-3 text-[10px] text-slate-500 leading-relaxed flex items-start gap-1.5">
                          <span className="inline-flex rounded bg-slate-800 text-[9px] px-1 font-bold text-slate-400 py-0.5 shrink-0 uppercase tracking-widest font-mono">
                            DEMO MODE
                          </span>
                          <span>
                            目前廠區偵測到尚未設定 GEMINI_API_KEY，系統已自備高精度巡檢知識庫以維護一致的高端示範成效。您可以添加 Secrets 後啟用與 ChatGPT 匹敵的 Gemini live 核心！
                          </span>
                        </div>
                      )}

                    </div>
                  ) : null}
                </div>

                {/* Modal Footer */}
                <div className="border-t border-slate-900 bg-slate-950/50 p-4 flex items-center justify-between">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    診斷資訊由系統常駐端智慧巡檢核心維護
                  </div>
                  <button
                    onClick={() => setDiagnoseOrder(null)}
                    disabled={diagnoseLoading}
                    className="px-4 py-2 bg-slate-900 text-slate-300 font-semibold text-xs rounded-lg hover:bg-slate-850 hover:text-white transition active:scale-95"
                  >
                    關閉點檢單
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. AI Intelligent Plant-wide Health OEE & Stock Forecast Report */}
      <AnimatePresence>
        {showPlantReport && (
          <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!plantReportLoading) setShowPlantReport(false); }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Container */}
            <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-800 bg-[#070b16] shadow-2xl relative"
                id="modal-ai-plant-report"
              >
                {/* Modal Header */}
                <div className="border-b border-slate-900 bg-slate-950/50 p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-950/80 border border-purple-500/20 text-purple-400">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 font-display">
                        AI 廠區營運稼動 (OEE) 與備耗平衡風險預報
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        工業巡檢大腦即時大數據判讀及風險回溯分析
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPlantReport(false)}
                    disabled={plantReportLoading}
                    className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition active:scale-90"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-slate-900">
                  {plantReportLoading ? (
                    <div className="py-16 flex flex-col items-center justify-center">
                      <div className="relative flex items-center justify-center">
                        <div className="h-14 w-14 rounded-full border-t-2 border-r-2 border-purple-500 animate-spin"></div>
                        <Sparkles className="h-6 w-6 text-purple-400 absolute animate-pulse" />
                      </div>
                      <p className="text-sm text-purple-300 font-bold mt-5 text-center tracking-wide">
                        全廠綜合效率大腦運算整合中...
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1.5 text-center max-w-md">
                        正遍歷現下所有的維護缺陷，並與當前所有的備件安全警戒值進行差值回歸演算...
                      </p>
                    </div>
                  ) : plantReportData ? (
                    <div className="space-y-6">
                      
                      {/* oee analysis text */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                          <Activity className="h-3.5 w-3.5 text-purple-400" />
                          全廠區綜合效率 (OEE) 與良率預測分析
                        </h4>
                        <div className="rounded-xl border border-purple-500/10 bg-purple-950/10 p-4 text-xs sm:text-sm leading-relaxed text-purple-200">
                          {plantReportData.oeeTrendAnalysis}
                        </div>
                      </div>

                      {/* Active Risk Factors Cards */}
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                          機器停運與稼動風險控制因子
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {plantReportData.activeRiskFactors && plantReportData.activeRiskFactors.map((rf: any, index: number) => {
                            const isHigh = rf.riskLevel === "high";
                            const isMed = rf.riskLevel === "medium";
                            return (
                              <div key={index} className="rounded-xl border border-slate-850 bg-slate-950/40 p-4 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 py-0.5 px-2 rounded">
                                    {rf.machineId}
                                  </span>
                                  <span className={`text-[10px] uppercase font-bold tracking-wider py-0.5 px-2 rounded-full border ${
                                    isHigh 
                                      ? "bg-rose-950/40 border-rose-500/20 text-rose-400"
                                      : isMed
                                      ? "bg-amber-950/40 border-amber-500/20 text-amber-400"
                                      : "bg-slate-900 border-slate-800 text-slate-400"
                                  }`}>
                                    {isHigh ? "CRITICAL RISK" : "MED WARNING"}
                                  </span>
                                </div>
                                <div className="text-xs space-y-1">
                                  <p className="text-slate-300 leading-relaxed">
                                    <strong className="text-red-400">OEE 衝擊：</strong> {rf.impactOnOee}
                                  </p>
                                  <p className="text-slate-400 leading-relaxed pt-1.5 border-t border-slate-900/60 mt-1">
                                    <strong className="text-cyan-400">現場排險方案：</strong> {rf.mitigationAction}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Preventive Maintenance steps */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                          <CheckCircle className="h-3.5 w-3.5 text-cyan-400" />
                          廠長推薦：防範性保養及排配重點計畫 (Next 7 Days)
                        </h4>
                        <div className="rounded-xl border border-slate-850 bg-slate-950/20 p-3.5 space-y-2">
                          {plantReportData.preventiveMaintenancePlan && plantReportData.preventiveMaintenancePlan.map((p: string, idx: number) => (
                            <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-300">
                              <span className="font-mono text-[10px] font-bold text-purple-400 bg-purple-950/40 border border-purple-500/10 px-1.5 py-0.5 rounded leading-none mt-0.5 shrink-0">
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed">{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reorder and stock check prioritize list */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                          <Database className="h-3.5 w-3.5 text-amber-400" />
                          急需補庫及採購優先指派序列
                        </h4>
                        <div className="rounded-xl border border-slate-850 bg-slate-950/20 divide-y divide-slate-900/60 overflow-hidden">
                          {plantReportData.reorderStockPriority && plantReportData.reorderStockPriority.map((item: any, idx: number) => {
                            const isCrit = item.priority === "critical";
                            return (
                              <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <strong className="text-slate-200">{item.partName}</strong>
                                    <span className="text-[10px] font-mono text-slate-500">
                                      ({item.currentLevel})
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 leading-relaxed">{item.action}</p>
                                </div>
                                <span className={`self-start sm:self-center shrink-0 font-mono font-bold tracking-wider rounded px-2 py-1 text-[10px] border ${
                                  isCrit 
                                    ? "bg-rose-950/40 border-rose-500/25 text-rose-400"
                                    : "bg-slate-900 border-slate-800 text-amber-400"
                                }`}>
                                  {isCrit ? "CRITICAL PURCHASE" : "MONITOR STOCK"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* simulated notice */}
                      {plantReportData.isSimulated && (
                        <div className="rounded-lg border border-slate-850 bg-slate-900/20 p-3 text-[10px] text-slate-500 leading-relaxed">
                          提示：此報告依據現場物料庫存、運行中的工單狀態與預備巡檢規則模擬生成，已啟動完整功能展示快取，提供完美的視覺與互動體感。
                        </div>
                      )}

                    </div>
                  ) : null}
                </div>

                {/* Modal Footer */}
                <div className="border-t border-slate-900 bg-slate-950/50 p-4 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    廠區效率數據核心實時維推數據組
                  </span>
                  <button
                    onClick={() => setShowPlantReport(false)}
                    className="px-4 py-2 bg-slate-900 text-slate-300 font-semibold text-xs rounded-lg hover:bg-slate-850 hover:text-white transition active:scale-95 text-center"
                  >
                    關閉全廠分析書
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
