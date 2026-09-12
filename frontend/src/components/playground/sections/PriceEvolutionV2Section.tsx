import { ChartData } from "chart.js";
import {
  ArrowDown,
  ArrowUp,
  BarChart2,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  Layers,
  Maximize2,
  Minus,
  Scale,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Table as TableIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

import {
  GroupedProductCluster,
  RawItemPurchase,
} from "../../../utils/productMatcher";
import { formatBrazilDate, formatCurrency } from "../../../utils/helpers";

export interface PriceEvolutionV2SectionProps {
  id: string;
  label: string;
  index: number;
  collapsed: boolean;
  clusters: GroupedProductCluster[];
  selectedClusterId: string | null;
  onSelectedClusterChange: (clusterId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  chartRefCallback: (instance: unknown) => void;
  textColor: string;
  cardBackground: string;
  cardBorder: string;
  primaryColor: string;
  onToggleAll?: () => void;
  onMoveItem: (index: number, direction: "up" | "down") => void;
  onMaximize: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

export const PriceEvolutionV2Section: React.FC<PriceEvolutionV2SectionProps> = ({
  id,
  label,
  index,
  collapsed,
  clusters,
  selectedClusterId,
  onSelectedClusterChange,
  searchQuery,
  onSearchQueryChange,
  chartRefCallback,
  textColor,
  cardBackground,
  cardBorder,
  primaryColor,
  onToggleAll,
  onMoveItem,
  onMaximize,
  onToggleCollapse,
  isFirst,
  isLast,
}) => {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [filterType, setFilterType] = useState<
    "all" | "merged" | "fluctuating" | "weighed"
  >("all");
  const [expandedClusterIds, setExpandedClusterIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleClusterExpand = (clusterId: string) => {
    setExpandedClusterIds((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return next;
    });
  };

  // Filter clusters based on search query and quick filter
  const filteredClusters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return clusters.filter((c) => {
      if (filterType === "merged" && c.variantCount <= 1) return false;
      if (filterType === "weighed" && !c.isWeighed) return false;
      if (filterType === "fluctuating" && c.stats.min === c.stats.max)
        return false;

      if (!q) return true;

      // Match displayName
      if (c.displayName.toLowerCase().includes(q)) return true;
      // Match size
      if (c.size?.toLowerCase().includes(q)) return true;
      // Match any nested variant originalName
      if (c.variants.some((v) => v.originalName.toLowerCase().includes(q)))
        return true;
      // Match any store in purchases
      if (
        c.allPurchases.some((p) =>
          p.transactionDescription.toLowerCase().includes(q),
        )
      )
        return true;

      return false;
    });
  }, [clusters, searchQuery, filterType]);

  // Selected cluster
  const selectedCluster = useMemo(() => {
    if (!selectedClusterId) {
      return filteredClusters[0] || clusters[0] || null;
    }
    return (
      clusters.find((c) => c.id === selectedClusterId) ||
      filteredClusters[0] ||
      null
    );
  }, [clusters, filteredClusters, selectedClusterId]);

  // Chart data for selected cluster
  const priceChartData: ChartData<"line"> | null = useMemo(() => {
    if (!selectedCluster || selectedCluster.allPurchases.length === 0)
      return null;

    const dataPoints = selectedCluster.allPurchases;

    return {
      labels: dataPoints.map((dp) => formatBrazilDate(dp.date, "dd/MM/yyyy")),
      datasets: [
        {
          label: `Preço de ${selectedCluster.displayName}`,
          data: dataPoints.map((dp) => dp.price),
          borderColor: primaryColor,
          backgroundColor: primaryColor + "25",
          fill: true,
          tension: 0.35,
          pointRadius: 6,
          pointHoverRadius: 9,
          pointHitRadius: 25,
          pointBackgroundColor: primaryColor,
          pointBorderColor: cardBackground,
          pointBorderWidth: 2,
          // Attach purchases directly to dataset for tooltip extraction
          dataPoints,
        } as unknown as {
          label: string;
          data: number[];
          dataPoints: RawItemPurchase[];
        },
      ],
    };
  }, [selectedCluster, primaryColor, cardBackground]);

  // General summary numbers
  const totalMergedVariants = useMemo(() => {
    return clusters.reduce(
      (acc, c) => (c.variantCount > 1 ? acc + c.variantCount : acc),
      0,
    );
  }, [clusters]);

  return (
    <div
      className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg"
      style={{
        backgroundColor: cardBackground,
        borderColor: cardBorder,
      }}
    >
      {/* Card Header */}
      <div
        className="p-4 border-b font-semibold text-foreground flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{
          borderColor: cardBorder,
          backgroundColor: cardBorder + "25",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/15 text-primary">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm lg:text-base font-bold">{label}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary">
                Smart Match
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-normal">
              {clusters.length} produtos mapeados • {totalMergedVariants} nomes
              mesclados
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          {!collapsed && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 md:w-56">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar produto ou loja..."
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl border text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all w-full"
                  style={{
                    backgroundColor: cardBackground,
                    borderColor: cardBorder,
                    color: textColor,
                  }}
                />
              </div>

              {/* View Toggle */}
              <div
                className="flex items-center p-0.5 rounded-xl border text-xs bg-muted/30"
                style={{ borderColor: cardBorder }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("chart")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                    viewMode === "chart"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Gráfico</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                    viewMode === "table"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Tabela</span>
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div
            className="flex items-center gap-1 border-l pl-3"
            style={{ borderColor: cardBorder }}
          >
            {!collapsed && onToggleAll && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAll();
                }}
                className="p-1.5 hover:bg-muted rounded-md transition-all text-muted-foreground hover:text-foreground"
                title="Alternar Todos"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onMoveItem(index, "up")}
              disabled={isFirst}
              className="p-1.5 hover:bg-muted rounded-md disabled:opacity-20 transition-all text-muted-foreground hover:text-foreground"
              title="Mover para cima"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onMoveItem(index, "down")}
              disabled={isLast}
              className="p-1.5 hover:bg-muted rounded-md disabled:opacity-20 transition-all text-muted-foreground hover:text-foreground"
              title="Mover para baixo"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onMaximize(id)}
              className="p-1.5 hover:bg-muted rounded-md transition-all ml-1 text-muted-foreground hover:text-foreground"
              title="Maximizar"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleCollapse(id)}
              className="p-1.5 hover:bg-muted rounded-md transition-all ml-1 text-muted-foreground hover:text-foreground"
              title={collapsed ? "Expandir" : "Minimizar"}
            >
              {collapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="p-6 space-y-6">
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground font-semibold flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5" /> Filtrar:
            </span>
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-full border transition-all ${
                filterType === "all"
                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                  : "bg-muted/20 hover:bg-muted/40 text-foreground border-border/50"
              }`}
            >
              Todos ({clusters.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("merged")}
              className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                filterType === "merged"
                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                  : "bg-muted/20 hover:bg-muted/40 text-foreground border-border/50"
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              Mesclados / Multi-nomes (
              {clusters.filter((c) => c.variantCount > 1).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("fluctuating")}
              className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                filterType === "fluctuating"
                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                  : "bg-muted/20 hover:bg-muted/40 text-foreground border-border/50"
              }`}
            >
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              Com Variação de Preço (
              {clusters.filter((c) => c.stats.min !== c.stats.max).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("weighed")}
              className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                filterType === "weighed"
                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                  : "bg-muted/20 hover:bg-muted/40 text-foreground border-border/50"
              }`}
            >
              <Scale className="w-3 h-3 text-blue-500" />
              Produtos Pesados / Hortifruti (
              {clusters.filter((c) => c.isWeighed).length})
            </button>
          </div>

          {clusters.length === 0 ? (
            <div
              className="h-72 flex flex-col items-center justify-center text-foreground opacity-50 text-center gap-3 border-2 border-dashed rounded-3xl"
              style={{ borderColor: cardBorder }}
            >
              <ShoppingBag className="w-14 h-14 opacity-20" />
              <div className="max-w-md">
                <p className="text-base font-bold mb-1">
                  Nenhum item com nota identificado
                </p>
                <p className="text-xs">
                  Faça o upload de recibos ou QR Codes de notas fiscais SEFAZ
                  para acompanhar a evolução inteligente dos preços.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Product Selector Dropdown for quick switching */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-muted/20 border" style={{ borderColor: cardBorder }}>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                    Produto em Foco:
                  </span>
                  <select
                    className="flex-1 p-2 rounded-xl border text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none transition-all truncate"
                    style={{
                      backgroundColor: cardBackground,
                      borderColor: cardBorder,
                      color: textColor,
                    }}
                    value={selectedCluster?.id || ""}
                    onChange={(e) => onSelectedClusterChange(e.target.value)}
                  >
                    {filteredClusters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.variantCount > 1 ? "✨ " : ""}
                        {c.displayName} ({c.totalPurchases}x
                        {c.variantCount > 1 ? ` • ${c.variantCount} variantes` : ""})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCluster && (
                  <div className="flex items-center gap-2 text-xs">
                    {selectedCluster.variantCount > 1 && (
                      <span className="px-2.5 py-1 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {selectedCluster.variantCount} nomes mesclados
                      </span>
                    )}
                    {selectedCluster.isWeighed && (
                      <span className="px-2.5 py-1 rounded-full font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        Preço por kg
                      </span>
                    )}
                  </div>
                )}
              </div>

              {selectedCluster && (
                <>
                  {/* Stats Cards for Selected Product */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Preço Mínimo */}
                    <div
                      className="p-3.5 rounded-2xl border bg-muted/15 relative overflow-hidden"
                      style={{ borderColor: cardBorder }}
                    >
                      <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">
                        Menor Preço
                      </p>
                      <p className="text-xl font-black text-emerald-600">
                        {formatCurrency(selectedCluster.stats.min)}
                      </p>
                      {selectedCluster.stats.minPurchase && (
                        <p className="text-[11px] text-muted-foreground truncate mt-1">
                          {selectedCluster.stats.minPurchase.transactionDescription} •{" "}
                          {formatBrazilDate(
                            selectedCluster.stats.minPurchase.date,
                            "dd/MM/yy",
                          )}
                        </p>
                      )}
                    </div>

                    {/* Preço Máximo */}
                    <div
                      className="p-3.5 rounded-2xl border bg-muted/15 relative overflow-hidden"
                      style={{ borderColor: cardBorder }}
                    >
                      <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">
                        Maior Preço
                      </p>
                      <p className="text-xl font-black text-red-500">
                        {formatCurrency(selectedCluster.stats.max)}
                      </p>
                      {selectedCluster.stats.maxPurchase && (
                        <p className="text-[11px] text-muted-foreground truncate mt-1">
                          {selectedCluster.stats.maxPurchase.transactionDescription} •{" "}
                          {formatBrazilDate(
                            selectedCluster.stats.maxPurchase.date,
                            "dd/MM/yy",
                          )}
                        </p>
                      )}
                    </div>

                    {/* Preço Médio */}
                    <div
                      className="p-3.5 rounded-2xl border bg-muted/15 relative overflow-hidden"
                      style={{ borderColor: cardBorder }}
                    >
                      <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">
                        Preço Médio
                      </p>
                      <p className="text-xl font-black text-primary">
                        {formatCurrency(selectedCluster.stats.avg)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {selectedCluster.totalPurchases} compra(s) registrada(s)
                      </p>
                    </div>

                    {/* Último Preço & Tendência */}
                    <div
                      className="p-3.5 rounded-2xl border bg-muted/15 relative overflow-hidden"
                      style={{ borderColor: cardBorder }}
                    >
                      <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mb-1">
                        Último Preço
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-xl font-black text-foreground">
                          {formatCurrency(selectedCluster.stats.latestPrice)}
                        </p>
                        {selectedCluster.stats.priceTrend === "up" && (
                          <span className="text-[11px] font-bold text-red-500 flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" /> +
                            {Math.abs(selectedCluster.stats.priceChangePct).toFixed(0)}%
                          </span>
                        )}
                        {selectedCluster.stats.priceTrend === "down" && (
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" /> -
                            {Math.abs(selectedCluster.stats.priceChangePct).toFixed(0)}%
                          </span>
                        )}
                        {selectedCluster.stats.priceTrend === "stable" && (
                          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-0.5">
                            <Minus className="w-3 h-3" /> Estável
                          </span>
                        )}
                      </div>
                      {selectedCluster.stats.latestPurchase && (
                        <p className="text-[11px] text-muted-foreground truncate mt-1">
                          {selectedCluster.stats.latestPurchase.transactionDescription} •{" "}
                          {formatBrazilDate(
                            selectedCluster.stats.latestPurchase.date,
                            "dd/MM/yy",
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Chart View */}
                  {viewMode === "chart" && priceChartData && (
                    <div className="space-y-4">
                      <div className="h-80 w-full">
                        <Line
                          ref={chartRefCallback}
                          data={priceChartData}
                          options={{
                            maintainAspectRatio: false,
                            interaction: {
                              mode: "nearest",
                              axis: "x",
                              intersect: false,
                            },
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  label: (context) => {
                                    const rawPoint = (
                                      context.dataset as unknown as {
                                        dataPoints?: RawItemPurchase[];
                                      }
                                    )?.dataPoints?.[context.dataIndex];
                                    const lines = [
                                      `Preço: ${formatCurrency(context.parsed.y)}`,
                                    ];
                                    if (rawPoint?.transactionDescription) {
                                      lines.push(
                                        `Transação: ${rawPoint.transactionDescription}`,
                                      );
                                    }
                                    if (rawPoint?.originalName) {
                                      lines.push(
                                        `Item na nota: ${rawPoint.originalName}`,
                                      );
                                    }
                                    if (
                                      rawPoint?.quantity &&
                                      rawPoint.quantity !== 1
                                    ) {
                                      lines.push(
                                        `Quantidade: ${rawPoint.quantity}${selectedCluster.isWeighed ? " kg" : " un"}`,
                                      );
                                    }
                                    if (
                                      rawPoint?.totalPrice &&
                                      rawPoint.totalPrice !== context.parsed.y
                                    ) {
                                      lines.push(
                                        `Total pago: ${formatCurrency(rawPoint.totalPrice)}`,
                                      );
                                    }
                                    return lines;
                                  },
                                },
                              },
                            },
                            scales: {
                              y: {
                                ticks: {
                                  color: textColor,
                                  callback: (val) =>
                                    formatCurrency(val as number),
                                },
                                grid: { color: cardBorder },
                              },
                              x: {
                                ticks: { color: textColor },
                                grid: { color: cardBorder },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Nested Variants Breakdown Accordion */}
                  <div
                    className="rounded-2xl border overflow-hidden"
                    style={{ borderColor: cardBorder }}
                  >
                    <div
                      className="p-3.5 bg-muted/20 border-b flex items-center justify-between"
                      style={{ borderColor: cardBorder }}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-xs md:text-sm font-bold">
                          Variantes e Nomes Mesclados deste Produto (
                          {selectedCluster.variants.length})
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Clique em cada variante para ver o histórico individual
                      </span>
                    </div>

                    <div className="divide-y" style={{ borderColor: cardBorder }}>
                      {selectedCluster.variants.map((variant) => {
                        const isExpanded = expandedClusterIds.has(
                          variant.originalName,
                        );
                        return (
                          <div
                            key={variant.originalName}
                            className="bg-card transition-colors hover:bg-muted/10"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toggleClusterExpand(variant.originalName)
                              }
                              className="w-full p-3.5 flex items-center justify-between gap-3 text-left"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-1 rounded bg-muted/40 text-muted-foreground">
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <div className="truncate">
                                  <p className="text-xs md:text-sm font-semibold text-foreground truncate">
                                    {variant.originalName}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {variant.count} compra(s) com este nome
                                    exato na nota
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 shrink-0 text-right">
                                <div>
                                  <p className="text-xs font-bold text-foreground">
                                    {formatCurrency(variant.latestPrice)}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    Média: {formatCurrency(variant.avgPrice)}
                                  </p>
                                </div>
                              </div>
                            </button>

                            {/* Nested Purchases Details Table */}
                            {isExpanded && (
                              <div
                                className="px-4 pb-4 pt-1 bg-muted/5 border-t"
                                style={{ borderColor: cardBorder }}
                              >
                                <div className="overflow-x-auto rounded-xl border bg-background/60" style={{ borderColor: cardBorder }}>
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/30 text-muted-foreground font-semibold border-b" style={{ borderColor: cardBorder }}>
                                      <tr>
                                        <th className="p-2.5">Data</th>
                                        <th className="p-2.5">Estabelecimento / Transação</th>
                                        <th className="p-2.5 text-center">Quantidade</th>
                                        <th className="p-2.5 text-right">Preço Unitário</th>
                                        <th className="p-2.5 text-right">Total Pago</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: cardBorder }}>
                                      {variant.purchases.map((p, pIdx) => (
                                        <tr key={pIdx} className="hover:bg-muted/20">
                                          <td className="p-2.5 font-medium whitespace-nowrap">
                                            <span className="flex items-center gap-1.5">
                                              <Calendar className="w-3 h-3 text-muted-foreground" />
                                              {formatBrazilDate(p.date, "dd/MM/yyyy")}
                                            </span>
                                          </td>
                                          <td className="p-2.5 font-medium text-foreground truncate max-w-xs">
                                            <span className="flex items-center gap-1.5">
                                              <Store className="w-3 h-3 text-muted-foreground" />
                                              {p.transactionDescription}
                                            </span>
                                          </td>
                                          <td className="p-2.5 text-center text-muted-foreground">
                                            {p.quantity}{selectedCluster.isWeighed ? " kg" : " un"}
                                          </td>
                                          <td className="p-2.5 text-right font-bold text-foreground">
                                            {formatCurrency(p.price)}
                                          </td>
                                          <td className="p-2.5 text-right font-semibold text-muted-foreground">
                                            {formatCurrency(p.totalPrice)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* All Products Master Table View */}
              {viewMode === "table" && (
                <div
                  className="rounded-2xl border overflow-hidden mt-6"
                  style={{ borderColor: cardBorder }}
                >
                  <div
                    className="p-3.5 bg-muted/20 border-b flex items-center justify-between"
                    style={{ borderColor: cardBorder }}
                  >
                    <div className="flex items-center gap-2">
                      <TableIcon className="w-4 h-4 text-primary" />
                      <span className="text-xs md:text-sm font-bold">
                        Tabela Comparativa de Produtos ({filteredClusters.length})
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Clique no produto para ver seu gráfico e aninhamento
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead
                        className="bg-muted/30 text-muted-foreground font-semibold border-b"
                        style={{ borderColor: cardBorder }}
                      >
                        <tr>
                          <th className="p-3">Produto</th>
                          <th className="p-3 text-center">Nomes Mesclados</th>
                          <th className="p-3 text-center">Compras</th>
                          <th className="p-3 text-right">Menor</th>
                          <th className="p-3 text-right">Maior</th>
                          <th className="p-3 text-right">Médio</th>
                          <th className="p-3 text-right">Último</th>
                          <th className="p-3 text-center">Tendência</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: cardBorder }}>
                        {filteredClusters.map((cluster) => {
                          const isSelected = selectedCluster?.id === cluster.id;
                          return (
                            <tr
                              key={cluster.id}
                              onClick={() => {
                                onSelectedClusterChange(cluster.id);
                              }}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-primary/10 font-medium"
                                  : "hover:bg-muted/15"
                              }`}
                            >
                              <td className="p-3 font-semibold text-foreground">
                                <div className="flex items-center gap-2">
                                  {cluster.variantCount > 1 && (
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  )}
                                  <span className="truncate max-w-xs md:max-w-md">
                                    {cluster.displayName}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                {cluster.variantCount > 1 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    {cluster.variantCount} variantes
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">
                                    1 nome
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-foreground">
                                {cluster.totalPurchases}
                              </td>
                              <td className="p-3 text-right font-semibold text-emerald-600">
                                {formatCurrency(cluster.stats.min)}
                              </td>
                              <td className="p-3 text-right font-semibold text-red-500">
                                {formatCurrency(cluster.stats.max)}
                              </td>
                              <td className="p-3 text-right font-bold text-primary">
                                {formatCurrency(cluster.stats.avg)}
                              </td>
                              <td className="p-3 text-right font-bold text-foreground">
                                {formatCurrency(cluster.stats.latestPrice)}
                              </td>
                              <td className="p-3 text-center">
                                {cluster.stats.priceTrend === "up" && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-red-500 bg-red-500/10">
                                    ↗ +{Math.abs(cluster.stats.priceChangePct).toFixed(0)}%
                                  </span>
                                )}
                                {cluster.stats.priceTrend === "down" && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-600 bg-emerald-500/10">
                                    ↘ -{Math.abs(cluster.stats.priceChangePct).toFixed(0)}%
                                  </span>
                                )}
                                {cluster.stats.priceTrend === "stable" && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground bg-muted/40">
                                    → Estável
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
