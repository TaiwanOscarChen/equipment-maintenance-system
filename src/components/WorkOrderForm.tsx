import { useState, FormEvent } from "react";
import { AlertCircle, PenTool, CheckCircle, Send, HelpCircle } from "lucide-react";
import { Priority } from "../types";
import { motion } from "motion/react";

interface WorkOrderFormProps {
  id: string;
  onOrderCreated: () => void;
  setErrorBanner: (msg: string | null) => void;
  setSuccessBanner: (msg: string | null) => void;
}

const PRESETS = [
  {
    code: "ERR-101",
    label: "伺服馬達超載溫升",
    machineId: "MC-101",
    issue: "[ERR-101] 傳動伺服馬達溫度超出臨界值。現場伴有微弱異音，疑似皮帶老化阻抗升高。",
    priority: "high",
    pLabel: "機台停運"
  },
  {
    code: "ERR-204",
    label: "氣路吸嘴負壓不足",
    machineId: "MC-102",
    issue: "[ERR-204] 真空吸盤負壓值過低。無法正常吸附電路基板，請現場盤查吸嘴彈性是否劣化。",
    priority: "medium",
    pLabel: "降速預警"
  },
  {
    code: "ERR-309",
    label: "溫控器傳感開路",
    machineId: "MC-103",
    issue: "[ERR-309] 封口站加熱表面無正常升溫。PID 指示燈交替閃爍，疑似溫度控制器繼電器接點損耗老化。",
    priority: "high",
    pLabel: "生產警報"
  },
  {
    code: "ERR-505",
    label: "安全繼電器紅燈自鎖",
    machineId: "MC-104",
    issue: "[ERR-505] 機旁主控電盤光柵防護觸發中斷。重置後依然卡住，需要點檢並更換近接安全用開關感應器。",
    priority: "high",
    pLabel: "安全連鎖"
  }
];

export default function WorkOrderForm({
  id,
  onOrderCreated,
  setErrorBanner,
  setSuccessBanner,
}: WorkOrderFormProps) {
  const [machineId, setMachineId] = useState("");
  const [issue, setIssue] = useState("");
  const [reporter, setReporter] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setErrorBanner(null);

    // Front-end sanity verification
    const trimmedMachine = machineId.trim();
    if (!trimmedMachine) {
      const err = "機台編號不能為空！";
      setLocalError(err);
      setErrorBanner(err);
      return;
    }

    if (!trimmedMachine.startsWith("MC-")) {
      const err = "機台編號格式不符！必須以 'MC-' 開頭 (例如: MC-001)";
      setLocalError(err);
      setErrorBanner(err);
      return;
    }

    if (!issue.trim()) {
      const err = "異常現象描述不能為空！";
      setLocalError(err);
      setErrorBanner(err);
      return;
    }

    if (!reporter.trim()) {
      const err = "通報人欄位不能為空！";
      setLocalError(err);
      setErrorBanner(err);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/workorders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          machineId: trimmedMachine,
          issue: issue.trim(),
          reporter: reporter.trim(),
          priority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle server-side 400 validation error
        throw new Error(data.error || "傳送工單失敗");
      }

      // Success
      setSuccessBanner(data.message || "維護工單已成功建立並指派！");
      setMachineId("");
      setIssue("");
      setReporter("");
      setPriority("medium");
      onOrderCreated(); // Trigger reload of stats and table data
    } catch (err: any) {
      setLocalError(err.message);
      setErrorBanner(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id={id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3 mb-5">
        <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400 border border-cyan-500/20 shrink-0">
          <PenTool className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-display">新維護工單快速申報</h2>
          <p className="text-xs text-slate-400 mt-0.5">通報生產線異常停機或設備故障，即時派工排除</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Notification */}
        {localError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">故障申報驗證失敗</p>
              <p className="mt-0.5 leading-relaxed">{localError}</p>
            </div>
          </motion.div>
        )}

        {/* Alarm Presets Selector */}
        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-850/65">
          <span className="block text-[10px] text-cyan-400 uppercase tracking-widest font-mono font-bold mb-2">
            ⚡ 常用警報代碼快速載入範本
          </span>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.code}
                type="button"
                onClick={() => {
                  setMachineId(preset.machineId);
                  setIssue(preset.issue);
                  setPriority(preset.priority as Priority);
                  if (!reporter) {
                    setReporter("現場排班工程師");
                  }
                }}
                className="text-left bg-slate-900/40 hover:bg-slate-900/90 border border-slate-800 hover:border-cyan-500/35 p-2 rounded transition text-[11px] font-medium flex flex-col justify-between h-14 select-none cursor-pointer group active:scale-[0.97]"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="font-mono text-cyan-300 font-extrabold group-hover:text-cyan-200">
                    {preset.code}
                  </span>
                  <span className={`text-[8px] px-1 rounded font-semibold ${
                    preset.priority === "high"
                      ? "bg-rose-950/40 border border-rose-500/15 text-rose-400"
                      : "bg-amber-950/40 border border-amber-500/15 text-amber-400"
                  }`}>
                    {preset.pLabel}
                  </span>
                </div>
                <span className="text-slate-400 text-[10px] truncate w-full group-hover:text-slate-300 mt-1">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Machine ID Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-display flex justify-between items-center">
            <span>機台編號 (格式: MC-***) <span className="text-rose-400">*</span></span>
            <span className="text-[10px] text-slate-500 normal-case font-mono">例如 MC-101</span>
          </label>
          <input
            type="text"
            placeholder="請輸入例如 MC-001 或 MC-102"
            value={machineId}
            onChange={(e) => setMachineId(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 uppercase font-mono min-h-[44px]"
          />
        </div>

        {/* Helper layout: Tester and Priority */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Priority Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-display flex justify-between">
              <span>設備優先級</span>
              <span className="text-[10px] text-slate-500">影響OEE數據</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-white focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 min-h-[44px]"
            >
              <option value="high">高 (立即停機維護)</option>
              <option value="medium">中 (零件效率衰退)</option>
              <option value="low">低 (日常損耗點檢)</option>
            </select>
          </div>

          {/* Reporter Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-display">
              通報人簽名 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="請輸入工程師姓名"
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 min-h-[44px]"
            />
          </div>
        </div>

        {/* Issue Description Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-display">
            異常現象與故障描述 <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="請具體說明故障訊號、硬體漏氣/漏真空、溫度落差或零件斷裂現象..."
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 leading-relaxed min-h-[80px]"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-cyan-605 bg-gradient-to-r from-cyan-600 to-cyan-500 py-3 px-4 text-xs font-semibold text-white shadow-md shadow-cyan-950/20 hover:from-cyan-500 hover:to-cyan-400 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 transition-all duration-150 flex items-center justify-center gap-2 font-display uppercase tracking-wider min-h-[46px]"
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              正在傳送至控制系統...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 text-cyan-100" />
              送出新維護工單
            </>
          )}
        </button>
      </form>
    </div>
  );
}
