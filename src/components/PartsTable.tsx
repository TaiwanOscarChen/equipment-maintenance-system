import { useState } from "react";
import { SparePart } from "../types";
import { Search, AlertTriangle, ShieldCheck, Plus, Minus, Loader } from "lucide-react";
import { motion } from "motion/react";

interface PartsTableProps {
  id: string;
  parts: SparePart[];
  loading: boolean;
  onAdjustStock: (id: string, newStock: number) => Promise<void>;
  viewMode?: 'auto' | 'desktop' | 'tablet' | 'mobile';
}

export default function PartsTable({
  id,
  parts,
  loading,
  onAdjustStock,
  viewMode = 'auto',
}: PartsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filter parts based on search term and condition
  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.specification.toLowerCase().includes(searchTerm.toLowerCase());
    const isLowStock = part.currentStock < part.safetyStock;
    return matchesSearch && (!showLowStockOnly || isLowStock);
  });

  const handleAdjust = async (partId: string, current: number, direction: "inc" | "dec") => {
    const val = direction === "inc" ? current + 1 : Math.max(0, current - 1);
    setUpdatingId(partId);
    try {
      await onAdjustStock(partId, val);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const showCards = viewMode !== "desktop";
  const showTable = viewMode === "desktop" || viewMode === "auto";

  let cardContainerClass = "gap-4";
  if (viewMode === "auto") {
    cardContainerClass = "grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden animate-fade-in";
  } else if (viewMode === "tablet") {
    cardContainerClass = "grid grid-cols-2 gap-4 animate-fade-in";
  } else {
    cardContainerClass = "grid grid-cols-1 gap-4 animate-fade-in";
  }

  let tableContainerClass = "";
  if (viewMode === "auto") {
    tableContainerClass = "hidden lg:block overflow-x-auto rounded-lg border border-slate-950 animate-fade-in";
  } else {
    tableContainerClass = "block overflow-x-auto rounded-lg border border-slate-950 animate-fade-in";
  }

  return (
    <div id={id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6 shadow-xl backdrop-blur-md">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-display">
            備品在庫與安全水位追蹤
            <span className="text-xs bg-slate-800 text-slate-400 py-0.5 px-2.5 rounded-full font-mono">
              {filteredParts.length} / {parts.length} 項
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">即時監控自動化產線零件庫存，自動預警低於安全水位項目</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="搜尋名稱或規格..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-950 transition duration-200">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500/30 bg-slate-950 h-4 w-4"
            />
            <span className="text-rose-400 font-semibold flex items-center gap-1.5 selection:bg-transparent flex-row">
              <AlertTriangle className="h-3.5 w-3.5" />
              僅顯示低水位
            </span>
          </label>
        </div>
      </div>

      {/* Mobile/Tablet Card List View */}
      {showCards && (
        <div className={cardContainerClass}>
          {loading ? (
            <div className="py-12 text-center text-slate-500 col-span-full">
              <div className="flex flex-col items-center justify-center gap-2">
                <Loader className="h-6 w-6 animate-spin text-cyan-400" />
                <span>網頁數據載入中...</span>
              </div>
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg bg-slate-950/20 col-span-full">
              無符合篩選條件的備品項目。
            </div>
          ) : (
            filteredParts.map((part) => {
              const isUnderStock = part.currentStock < part.safetyStock;
              const percentage = Math.min(100, Math.round((part.currentStock / part.safetyStock) * 100));

              return (
                <div
                  key={part.id}
                  className={`rounded-xl border p-4 transition-all duration-200 ${
                    isUnderStock
                      ? "bg-rose-950/25 border-rose-500/30 text-rose-100 shadow-md shadow-rose-950/15"
                      : "bg-slate-950/40 border-slate-800 text-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-white text-sm tracking-tight leading-snug">{part.name}</h4>
                      <span className="inline-block font-mono text-[10px] text-slate-400 mt-1 bg-slate-950/60 py-0.5 px-2 rounded border border-slate-900 uppercase">
                        {part.specification}
                      </span>
                    </div>
                    
                    {isUnderStock ? (
                      <span className="shrink-0 text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        低水位
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        儲件充足
                      </span>
                    )}
                  </div>

                  {/* Stock bar diagram */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400 font-mono">
                      <span>即時水位：{percentage}%</span>
                      <span>
                        <strong className={isUnderStock ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                          {part.currentStock}
                        </strong>{" "}
                        / {part.safetyStock} <span className="text-[10px] text-slate-500">安全值</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                      <div
                        style={{ width: `${percentage}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          isUnderStock ? "bg-gradient-to-r from-rose-650 to-rose-500" : "bg-gradient-to-r from-cyan-600 to-cyan-400"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Touch friendly inventory modifier */}
                  <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">現場人員快捷庫存領用：</span>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => handleAdjust(part.id, part.currentStock, "dec")}
                        disabled={updatingId === part.id || part.currentStock <= 0}
                        className="h-10 w-12 rounded-md text-slate-400 hover:text-white active:bg-slate-800 active:scale-95 disabled:opacity-20 transition duration-100 flex items-center justify-center border border-slate-900 select-none"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center text-xs font-mono font-bold text-slate-200">
                        {updatingId === part.id ? (
                          <Loader className="h-4 w-4 animate-spin mx-auto text-cyan-400" />
                        ) : (
                          part.currentStock
                        )}
                      </span>
                      <button
                        onClick={() => handleAdjust(part.id, part.currentStock, "inc")}
                        disabled={updatingId === part.id}
                        className="h-10 w-12 rounded-md text-slate-400 hover:text-white active:bg-slate-800 active:scale-95 disabled:opacity-20 transition duration-100 flex items-center justify-center border border-slate-900 select-none"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Desktop Table Section */}
      {showTable && (
        <div className={tableContainerClass}>
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-xs text-slate-400 uppercase tracking-widest font-display">
            <tr>
              <th scope="col" className="px-5 py-3.5">備品名稱</th>
              <th scope="col" className="px-5 py-3.5">硬體規格 / 型號</th>
              <th scope="col" className="px-5 py-3.5 text-center">當前庫存</th>
              <th scope="col" className="px-5 py-3.5 text-center">安全庫存</th>
              <th scope="col" className="px-5 py-3.5 text-center">預警狀態</th>
              <th scope="col" className="px-5 py-3.5 text-right">庫存增減</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader className="h-6 w-6 animate-spin text-cyan-400" />
                    <span>數據載入中...</span>
                  </div>
                </td>
              </tr>
            ) : filteredParts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                  無符合篩選條件的備品項目。
                </td>
              </tr>
            ) : (
              filteredParts.map((part) => {
                const isUnderStock = part.currentStock < part.safetyStock;
                // Below safety stock: row gets light-red background warning
                const rowClass = isUnderStock
                  ? "bg-rose-950/20 hover:bg-rose-950/30 text-rose-100 transition duration-150 border-l-2 border-rose-500/60"
                  : "bg-slate-900/10 hover:bg-slate-950/30 text-slate-200 transition duration-150";

                return (
                  <tr key={part.id} className={rowClass}>
                    <td className="px-5 py-4 font-medium max-w-[200px] truncate">
                      <div className="font-semibold text-white text-sm">{part.name}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs bg-slate-950/50 py-0.5 px-2 rounded text-slate-300 border border-slate-800">
                        {part.specification}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`text-sm font-bold font-mono px-2.5 py-0.5 rounded ${
                          isUnderStock ? "text-rose-400 bg-rose-950/40" : "text-emerald-400 bg-emerald-950/20"
                        }`}
                      >
                        {part.currentStock}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-mono text-slate-400">
                      {part.safetyStock}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {isUnderStock ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/30">
                          <AlertTriangle className="h-3 w-3" />
                          低於安全庫存
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                          <ShieldCheck className="h-3 w-3" />
                          庫存充足
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1 rounded-lg border border-slate-850 bg-slate-950 p-1">
                        <button
                          onClick={() => handleAdjust(part.id, part.currentStock, "dec")}
                          disabled={updatingId === part.id || part.currentStock <= 0}
                          title="減少 1 個備品"
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-35 transition duration-150"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-mono font-bold text-slate-300">
                          {updatingId === part.id ? (
                            <Loader className="h-3 w-3 animate-spin mx-auto text-cyan-400" />
                          ) : (
                            part.currentStock
                          )}
                        </span>
                        <button
                          onClick={() => handleAdjust(part.id, part.currentStock, "inc")}
                          disabled={updatingId === part.id}
                          title="增加 1 個備品"
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-35 transition duration-150"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
