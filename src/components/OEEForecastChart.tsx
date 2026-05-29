import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Cell,
} from "recharts";
import {
  TrendingUp,
  BarChart2,
  BrainCircuit,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HistoricalOeeItem {
  day: string;
  value: number;
}

interface PredictedOeeItem {
  day: string;
  value: number;
  priorityAction: string;
}

interface ForecastResponse {
  historicalData: HistoricalOeeItem[];
  predictedData: PredictedOeeItem[];
  aiAnalysis: string;
  predictiveScore: number;
  keyRiskFactor: string;
  isSimulated: boolean;
}

interface OEEForecastChartProps {
  pendingWorkOrdersCount: number;
  onRefreshTrigger?: () => void;
}

export default function OEEForecastChart({
  pendingWorkOrdersCount,
  onRefreshTrigger
}: OEEForecastChartProps) {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"history" | "forecast">("history");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchForecast = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/gemini/oee-forecast");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setErrorMsg("無法從智慧分析迴路取得預警數據。");
      }
    } catch (err) {
      setErrorMsg("通訊線路中斷，無法連接 OEE 分析大腦。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [pendingWorkOrdersCount]);

  const handleManualRefresh = () => {
    fetchForecast();
    if (onRefreshTrigger) {
      onRefreshTrigger();
    }
  };

  // Render Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isPrediction = activeTab === "forecast";
      return (
        <div className="rounded-lg border border-slate-800 bg-[#0c1224] p-3 shadow-xl max-w-xs ring-1 ring-cyan-500/20">
          <p className="font-mono text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3 text-cyan-400" />
            {label} 日期點檢
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-white font-mono">
              {payload[0].value}%
            </span>
            <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wide">
              稼動率 (OEE)
            </span>
          </div>
          {isPrediction && payload[0].payload?.priorityAction && (
            <div className="mt-2 pt-1.5 border-t border-slate-900 text-[10px] text-purple-300 leading-relaxed">
              <span className="font-bold text-slate-400 block mb-0.5">💡 重點防範排程：</span>
              {payload[0].payload.priorityAction}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-slate-900 bg-[#090e1a]/80 p-5 shadow-xl relative overflow-hidden" id="oee-trend-forecast-card">
      {/* Visual Background Decors */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900/80 pb-4 mb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-950/40 border border-cyan-500/35 px-2 py-0.5 text-[9px] font-mono font-extrabold text-cyan-400 uppercase tracking-widest animate-pulse">
              <BrainCircuit className="h-3 w-3" />
              Gemini 3.5 Flash Forecaster
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-100 mt-1 font-display flex items-center gap-1.5">
            全廠稼動效率 OEE：過去 7 天分析與 AI 下週回歸趨勢
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            融合申報缺陷工單及安全備件庫存，智慧預演並生成防範性保養 SOP 排配
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-400 hover:text-slate-100 transition disabled:opacity-50 select-none cursor-pointer active:scale-95"
            title="手動同步 AI 稼動預判"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          {/* Tab buttons */}
          <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-900/80">
            <button
              onClick={() => setActiveTab("history")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition select-none cursor-pointer ${
                activeTab === "history"
                  ? "bg-slate-900 text-cyan-400 font-bold border border-slate-800 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>實時歷史 7 天 (長條圖)</span>
            </button>
            <button
              onClick={() => setActiveTab("forecast")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition select-none cursor-pointer ${
                activeTab === "forecast"
                  ? "bg-purple-950/40 text-purple-300 font-bold border border-purple-500/20 shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>AI 下週趨勢 (預警線)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Side: Dynamic Chart */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          {loading ? (
            <div className="h-[260px] flex flex-col items-center justify-center rounded-lg border border-slate-900/60 bg-slate-950/40 p-10">
              <div className="h-8 w-8 rounded-full border-t-2 border-r-2 border-cyan-500 animate-spin"></div>
              <p className="text-xs text-slate-400 mt-4 tracking-wide">
                正在從邊緣網關拉取 SCADA 週例讀值並進行 AI 大腦預測...
              </p>
            </div>
          ) : errorMsg ? (
            <div className="h-[260px] flex flex-col items-center justify-center rounded-lg border border-rose-950/40 bg-rose-950/5 p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-rose-500 animate-bounce" />
              <p className="text-xs text-rose-300 font-semibold mt-3">{errorMsg}</p>
              <button
                onClick={fetchForecast}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-950/30 border border-rose-500/25 text-rose-300 hover:bg-rose-950/60 font-semibold text-xs px-3 py-1.5 cursor-pointer transition select-none"
              >
                重新載入分析迴路
              </button>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* OEE Rate Headline Banner inside Chart Container */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-slate-900 px-4 py-2.5 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${activeTab === 'history' ? 'bg-cyan-500 animate-pulse' : 'bg-purple-500 animate-pulse'}`} />
                  <span className="text-slate-400">
                    {activeTab === "history" ? "歷史平均稼動率" : "下週預測平均目標 (OEE)"}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className={`text-lg font-black ${activeTab === 'history' ? 'text-cyan-400' : 'text-purple-400'}`}>
                    {activeTab === "history"
                      ? `${Math.round((data.historicalData.reduce((acc, curr) => acc + curr.value, 0) / 7) * 10) / 10}%`
                      : `${data.predictiveScore}%`}
                  </span>
                  <span className="text-[10px] text-slate-500">標準值: 85%</span>
                </div>
              </div>

              {/* Chart Element Frame */}
              <div className="h-[260px] w-full rounded-lg bg-slate-950/80 p-3 pt-4 border border-slate-900/50 relative">
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === "history" ? (
                    <BarChart
                      data={data.historicalData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#111827" vertical={false} />
                      <XAxis
                        dataKey="day"
                        stroke="#475569"
                        fontSize={10}
                        fontFamily="monospace"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#475569"
                        fontSize={9}
                        fontFamily="monospace"
                        domain={[60, 100]}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1e293b", opacity: 0.3 }} />
                      <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={38}
                      >
                        {data.historicalData.map((entry, index) => {
                          // Standardize visual stress colors: Today gets custom cyan, other past days slightly dimmed cyan
                          const isToday = index === 6;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={isToday ? "#22d3ee" : "rgba(6, 182, 212, 0.45)"}
                              stroke={isToday ? "#22d3ee" : "rgba(6, 182, 212, 0.25)"}
                              strokeWidth={1}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  ) : (
                    <LineChart
                      data={data.predictedData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#111827" vertical={false} />
                      <XAxis
                        dataKey="day"
                        stroke="#475569"
                        fontSize={10}
                        fontFamily="monospace"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#475569"
                        fontSize={9}
                        fontFamily="monospace"
                        domain={[60, 100]}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#c084fc"
                        strokeWidth={2.5}
                        dot={{ r: 4, stroke: "#a855f7", strokeWidth: 1.5, fill: "#090e1a" }}
                        activeDot={{ r: 6, stroke: "#c084fc", strokeWidth: 2, fill: "#fff" }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Bottom Legend */}
              <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono">
                <div className="flex items-center gap-3">
                  {activeTab === "history" ? (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-4 rounded-sm bg-cyan-700/60" />
                        歷史滾動讀值
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-4 rounded-sm bg-cyan-400" />
                        現場瞬時值 (本日)
                      </span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-0.5 w-4 bg-purple-400" />
                      Gemini 趨勢線
                    </span>
                  )}
                </div>
                <span>* 點選圖柱可讀取時段點檢 SOP 重點</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Side: AI Analytical Breakdown card */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          {!loading && data ? (
            <div className="space-y-4 h-full flex flex-col justify-between">
              
              {/* OEE Predictive Intelligence Breakdown Cards */}
              <div className="space-y-3">
                {/* Score and Risk Flag */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-purple-500/10 bg-purple-950/15 p-3 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider font-mono">
                      良率回升目標 (AI 預測)
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-extrabold text-purple-200 font-mono">
                        {data.predictiveScore}%
                      </span>
                      <span className="text-[9px] text-slate-500">OEE 估值</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-rose-500/10 bg-rose-950/10 p-3 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider font-mono">
                      關鍵阻礙風險因子 (Bottleneck)
                    </span>
                    <p className="text-[10px] text-rose-300 font-bold truncate mt-1">
                      {data.keyRiskFactor}
                    </p>
                  </div>
                </div>

                {/* Main Text Content */}
                <div className="rounded-xl border border-slate-900 bg-slate-950/90 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                    <span>AI 專家稼動預警判讀建議</span>
                  </div>
                  <div className="text-[11px] leading-relaxed text-slate-300 whitespace-pre-line border-t border-slate-900/60 pt-2 shrink-0 max-h-[155px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-900">
                    {data.aiAnalysis}
                  </div>
                </div>
              </div>

              {/* Next Week Daily Checkup Quick Timeline */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-900 space-y-2 mt-2">
                <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">
                  📅 未來 7 天 AI 即時點檢防範預排 SOP 備忘
                </span>
                
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 gap-1.5 pt-1">
                  {data.predictedData.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/40 border border-slate-850 hover:border-purple-500/25 rounded p-1.5 text-center flex flex-col justify-between h-14 group transition cursor-help shrink-0"
                      title={`${item.day} 點檢建議：${item.priorityAction}`}
                    >
                      <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-400 block font-mono">
                        {item.day}
                      </span>
                      <span className="text-[11px] font-extrabold text-purple-400 font-mono block mt-1">
                        {item.value}%
                      </span>
                      <div className="h-1 w-full bg-slate-950 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{ width: `${Math.max(30, item.value - 40)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demo Notice */}
              {data.isSimulated && (
                <div className="flex items-start gap-1 pb-1 text-[9px] text-slate-500 leading-relaxed mt-2 pl-1 select-none">
                  <Info className="h-3 w-3 text-slate-600 shrink-0 mt-0.5" />
                  <span>
                    提示：目前系統以高擬真智慧數據對齊展示。在設定祕鑰後將自動啟用即時 Gemini A1 全廠智慧良率推演！
                  </span>
                </div>
              )}

            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-xs text-slate-500 italic">
              等待稼動資料同步中...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
