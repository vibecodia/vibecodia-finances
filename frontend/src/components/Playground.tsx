import React, { useState, useMemo, useRef } from 'react';
import { Transaction } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { 
  formatCurrency, 
  EXPENSE_CATEGORIES, 
  INCOME_CATEGORIES, 
  PAYMENT_METHODS,
  parseLocalDate,
  formatBrazilDate,
  getCurrentBrazilDate
} from '../utils/helpers';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  Filter, 
  Search, 
  CreditCard,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Table as TableIcon,
  Minus,
  Maximize2,
  Printer,
  X,
  RotateCcw
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  PointElement, 
  LineElement,
  LineController,
  BarController,
  DoughnutController,
  PieController
} from 'chart.js';
import { Doughnut, Pie, Line } from 'react-chartjs-2';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
// import { ptBR } from 'date-fns/locale';
import { useLocalStorage } from '../hooks/trello/useLocalStorage';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  PointElement, 
  LineElement,
  LineController,
  BarController,
  DoughnutController,
  PieController
);

interface PlaygroundProps {
  transactions: Transaction[];
}

interface LayoutItem {
  id: string;
  label: string;
  collapsed: boolean;
}

const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: 'categories', label: 'Distribuição por Categoria', collapsed: false },
  { id: 'payments', label: 'Distribuição por Pagamento', collapsed: false },
  { id: 'table', label: 'Planilha de Transações', collapsed: false },
  { id: 'price_evolution', label: 'Evolução de Preços', collapsed: false },
];

const Playground: React.FC<PlaygroundProps> = ({ transactions }) => {
  const { theme } = useTheme();
  // Using a new version key to reset layout to the simplified structure
  const [layout, setLayout] = useLocalStorage<LayoutItem[]>('playground_layout_v4', DEFAULT_LAYOUT);
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Filters State
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(getCurrentBrazilDate()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(getCurrentBrazilDate()), 'yyyy-MM-dd'));
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  // Removed Transactions State
  const [removedTransactionIds, setRemovedTransactionIds] = useState<string[]>([]);

  // Sort State
  const [sortBy, setSortBy] = useState<'date' | 'description' | 'category' | 'paymentMethod' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Print Dialog State
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    title: 'Planilha de Transações',
    subtitle: '',
  });

  // Price Comparison State
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const categories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Skip removed transactions
      if (removedTransactionIds.includes(t.id)) return false;

      const date = parseLocalDate(t.date);
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      
      const isInDateRange = isWithinInterval(date, { start, end });
      const isInCategory = selectedCategories.length === 0 || selectedCategories.includes(t.category);
      const isInPaymentMethod = selectedPaymentMethods.length === 0 || 
        (t.paymentMethod && selectedPaymentMethods.includes(t.paymentMethod));
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || 
        (t.type === 'expense' && (statusFilter === 'paid' ? t.isPaid : !t.isPaid)) ||
        (t.type === 'income' && statusFilter === 'paid');

      return isInDateRange && isInCategory && isInPaymentMethod && matchesSearch && matchesType && matchesStatus;
    });
  }, [transactions, startDate, endDate, selectedCategories, selectedPaymentMethods, searchTerm, typeFilter, statusFilter, removedTransactionIds]);

  // Chart Data: Category Distribution
  const categoryChartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', 
      '#8BC34A', '#E91E63', '#00BCD4', '#FFEB3B', '#795548', '#607D8B'
    ];

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: theme.cardBackground,
        borderWidth: 2,
      }]
    };
  }, [filteredTransactions, theme.cardBackground]);

  // Chart Data: Payment Method Distribution
  const paymentChartData = useMemo(() => {
    const paymentTotals: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.paymentMethod) {
        const label = PAYMENT_METHODS.find(m => m.id === t.paymentMethod)?.label || t.paymentMethod;
        paymentTotals[label] = (paymentTotals[label] || 0) + t.amount;
      }
    });

    const labels = Object.keys(paymentTotals);
    const data = Object.values(paymentTotals);
    const colors = [
      '#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#F44336', '#009688', 
      '#3F51B5', '#FF5722', '#CDDC39', '#00BCD4', '#673AB7', '#795548'
    ];

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: theme.cardBackground,
        borderWidth: 2,
      }]
    };
  }, [filteredTransactions, theme.cardBackground]);

  // Extract Items from Notes for Price Comparison
  const allItems = useMemo(() => {
    const itemsMap: Record<string, { date: string, price: number }[]> = {};
    
    transactions.forEach(t => {
      let items: any[] = [];
      if (t.notes) {
        if (typeof t.notes === 'object' && Array.isArray(t.notes.items)) {
          items = t.notes.items;
        } else if (typeof t.notes === 'string') {
          try {
            const parsed = JSON.parse(t.notes);
            if (Array.isArray(parsed.items)) {
              items = parsed.items;
            }
          } catch (e) {
            // Not JSON
          }
        }
      }

      items.forEach(item => {
        const name = item.description || item.name;
        const price = item.unitPrice || item.price;
        if (name && typeof price === 'number') {
          if (!itemsMap[name]) itemsMap[name] = [];
          itemsMap[name].push({ date: t.date, price });
        }
      });
    });

    return itemsMap;
  }, [transactions]);

  const sortedItemNames = useMemo(() => {
    return Object.keys(allItems).sort();
  }, [allItems]);

  // Price Evolution Chart Data
  const priceChartData = useMemo(() => {
    if (!selectedItem || !allItems[selectedItem]) return null;

    const dataPoints = allItems[selectedItem].sort((a, b) => 
      parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
    );

    return {
      labels: dataPoints.map(dp => formatBrazilDate(dp.date, 'dd/MM/yy')),
      datasets: [{
        label: `Preço de ${selectedItem}`,
        data: dataPoints.map(dp => dp.price),
        borderColor: theme.primary,
        backgroundColor: theme.primary + '33',
        fill: true,
        tension: 0.4,
      }]
    };
  }, [selectedItem, allItems, theme.primary]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const togglePaymentMethod = (pm: string) => {
    setSelectedPaymentMethods(prev => 
      prev.includes(pm) ? prev.filter(p => p !== pm) : [...prev, pm]
    );
  };

  const toggleCollapse = (id: string) => {
    setLayout(prev => prev.map(item => 
      item.id === id ? { ...item, collapsed: !item.collapsed } : item
    ));
  };

  const removeTransaction = (transactionId: string) => {
    setRemovedTransactionIds(prev => [...prev, transactionId]);
  };

  const resetRemovedTransactions = () => {
    setRemovedTransactionIds([]);
  };

  const handleSort = (column: 'date' | 'description' | 'category' | 'paymentMethod' | 'amount') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const getSortedTransactions = () => {
    return [...filteredTransactions].sort((a, b) => {
      let aVal: any = a[sortBy as keyof Transaction];
      let bVal: any = b[sortBy as keyof Transaction];

      if (sortBy === 'date') {
        aVal = parseLocalDate(a.date).getTime();
        bVal = parseLocalDate(b.date).getTime();
      } else if (sortBy === 'amount') {
        aVal = a.amount;
        bVal = b.amount;
      } else if (sortBy === 'paymentMethod') {
        aVal = a.paymentMethod || '';
        bVal = b.paymentMethod || '';
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newLayout = [...layout];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newLayout.length) {
      [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
      setLayout(newLayout);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (tableRef.current) {
        // Scroll to the table card
        tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Optional: briefly pulse or flash the card to indicate focus
        tableRef.current.style.transition = 'box-shadow 0.3s';
        tableRef.current.style.boxShadow = `0 0 15px ${theme.primary}`;
        setTimeout(() => {
          if (tableRef.current) tableRef.current.style.boxShadow = '';
        }, 1000);
      }
    }
  };

  const handlePrintTable = () => {
    setShowPrintDialog(true);
  };

  const executePrint = () => {
    if (!tableRef.current) return;

    // Create a new window for printing
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    // Get table HTML
    const tableElement = tableRef.current.querySelector('table');
    if (!tableElement) return;

    // Clone the table to avoid modifying the original
    const clonedTable = tableElement.cloneNode(true) as HTMLElement;
    
    // Remove all remove buttons from the cloned table
    const removeButtons = clonedTable.querySelectorAll('button');
    removeButtons.forEach(button => {
      button.remove();
    });

    // Create print-friendly HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Planilha de Transações</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              padding: 20px;
              background-color: #fff;
            }
            .print-header {
              margin-bottom: 30px;
              border-bottom: 2px solid #e0e0e0;
              padding-bottom: 15px;
            }
            .print-header h1 {
              font-size: 24px;
              margin-bottom: 5px;
              color: #000;
            }
            .print-header p {
              font-size: 12px;
              color: #666;
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            thead {
              background-color: #f5f5f5;
            }
            th {
              padding: 12px;
              text-align: left;
              font-weight: 600;
              border: 1px solid #ddd;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              padding: 10px 12px;
              border: 1px solid #ddd;
              font-size: 13px;
            }
            tbody tr:nth-child(even) {
              background-color: #fafafa;
            }
            td:last-child {
              text-align: right;
              font-weight: 600;
            }
            .positive {
              color: #10b981;
            }
            .negative {
              color: #ef4444;
            }
            .badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              background-color: #e0e0e0;
            }
            .payment-badge {
              background-color: #dbeafe;
              color: #0369a1;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #e0e0e0;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${printSettings.title}</h1>
            ${printSettings.subtitle ? `<p style="font-size: 14px; color: #555; margin-top: 5px;">${printSettings.subtitle}</p>` : ''}
            <div style="margin-top: 15px; padding: 12px; background-color: #f0f0f0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; color: #666;"><strong>${filteredTransactions.length} itens</strong> • Período: ${startDate} até ${endDate}</span>
              <span style="font-size: 14px; color: #000; font-weight: bold;">Total Despesas: ${formatCurrency(filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0))}</span>
            </div>
          </div>
          
          ${clonedTable.outerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-300 text-black px-0.5 rounded">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const renderCardHeader = (id: string, label: string, icon: React.ReactNode, index: number, isCollapsed: boolean) => (
    <div className="p-4 border-b font-semibold text-text flex items-center justify-between group" style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBorder + '33' }}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm lg:text-base">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <button 
          onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }}
          disabled={index === 0}
          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-0 group-hover:opacity-100 disabled:opacity-0"
          title="Mover para Cima"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }}
          disabled={index === layout.length - 1}
          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-0 group-hover:opacity-100 disabled:opacity-0"
          title="Mover para Baixo"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 mx-1 bg-cardBorder opacity-0 group-hover:opacity-100" />
        <button 
          onClick={() => toggleCollapse(id)}
          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-50 hover:opacity-100"
          title={isCollapsed ? "Expandir" : "Minimizar"}
        >
          {isCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10 max-w-full overflow-x-hidden relative">
      <div className="flex flex-col md:flex-row items-center justify-between py-8 gap-4 border-b" style={{ borderColor: theme.cardBorder }}>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl lg:text-5xl font-bold text-text mb-2">
            Playground Financeiro
          </h1>
          <p className="text-text opacity-70 text-base">
            Organize e analise seus dados com total liberdade
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start mt-4">
        {/* Sidebar Filters - Sticky on desktop */}
        <div className="w-full lg:w-80 lg:sticky lg:top-24 space-y-4 flex-shrink-0">
          <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
            <div className="p-4 font-semibold text-text flex items-center gap-2 border-b" style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBorder + '33' }}>
              <Filter className="w-5 h-5" />
              <span>Filtros Rápidos</span>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text opacity-70 mb-2">Tipo de Lançamento</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['all', 'income', 'expense'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`py-1.5 rounded-md text-[10px] transition-all border font-bold uppercase ${
                        typeFilter === type 
                          ? 'bg-primary text-white border-primary shadow-sm' 
                          : 'bg-transparent text-text opacity-70 border-cardBorder hover:bg-cardBorder/30'
                      }`}
                      style={{ 
                        backgroundColor: typeFilter === type ? theme.primary : 'transparent',
                        color: typeFilter === type ? '#fff' : theme.text 
                      }}
                    >
                      {type === 'all' ? 'Todas' : type === 'income' ? 'Receitas' : 'Gastos'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text opacity-70 mb-2">Status (Gastos)</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['all', 'paid', 'pending'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`py-1.5 rounded-md text-[10px] transition-all border font-bold uppercase ${
                        statusFilter === status 
                          ? 'bg-primary text-white border-primary shadow-sm' 
                          : 'bg-transparent text-text opacity-70 border-cardBorder hover:bg-cardBorder/30'
                      }`}
                      style={{ 
                        backgroundColor: statusFilter === status ? theme.primary : 'transparent',
                        color: statusFilter === status ? '#fff' : theme.text 
                      }}
                    >
                      {status === 'all' ? 'Todos' : status === 'paid' ? 'Pagos' : 'Pendentes'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text opacity-70 mb-1">Período de Análise</label>
                <div className="space-y-2">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border text-sm"
                    style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                  />
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border text-sm"
                    style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text opacity-70 mb-1">Buscar na Planilha (Enter para focar)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text opacity-50" />
                  <input 
                    type="text" 
                    placeholder="Ex: Supermercado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text opacity-70 mb-2">Categorias</label>
                <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-2.5 py-1.5 rounded-md text-[10px] transition-all border font-medium ${
                        selectedCategories.includes(cat) 
                          ? 'bg-primary text-white border-primary shadow-sm scale-105' 
                          : 'bg-transparent text-text opacity-70 border-cardBorder'
                      }`}
                      style={{ 
                        backgroundColor: selectedCategories.includes(cat) ? theme.primary : 'transparent',
                        color: selectedCategories.includes(cat) ? '#fff' : theme.text 
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text opacity-70 mb-2">Cartões</label>
                <div className="flex flex-wrap gap-1">
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => togglePaymentMethod(pm.id)}
                      className={`px-2.5 py-1.5 rounded-md text-[10px] transition-all border font-medium ${
                        selectedPaymentMethods.includes(pm.id) 
                          ? 'bg-primary text-white border-primary shadow-sm scale-105' 
                          : 'bg-transparent text-text opacity-70 border-cardBorder'
                      }`}
                      style={{ 
                        backgroundColor: selectedPaymentMethods.includes(pm.id) ? theme.primary : 'transparent',
                        color: selectedPaymentMethods.includes(pm.id) ? '#fff' : theme.text 
                      }}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedPaymentMethods([]);
                  setSearchTerm('');
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setStartDate(format(startOfMonth(getCurrentBrazilDate()), 'yyyy-MM-dd'));
                  setEndDate(format(endOfMonth(getCurrentBrazilDate()), 'yyyy-MM-dd'));
                }}
                className="w-full py-2.5 text-xs text-primary font-bold border border-primary rounded-xl hover:bg-primary hover:text-white transition-all mt-2 shadow-sm"
              >
                LIMPAR TODOS OS FILTROS
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-8 w-full">
          {/* Summary Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
              <p className="text-xs font-bold text-text opacity-60 uppercase tracking-widest mb-1">Total Receitas</p>
              <p className="text-2xl font-black text-primary">
                {formatCurrency(filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0))}
              </p>
            </div>
            <div className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
              <p className="text-xs font-bold text-text opacity-60 uppercase tracking-widest mb-1">Total Despesas</p>
              <p className="text-2xl font-black text-accent">
                {formatCurrency(filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0))}
              </p>
            </div>
            <div className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
              <p className="text-xs font-bold text-text opacity-60 uppercase tracking-widest mb-1">Saldo do Período</p>
              <p className={`text-2xl font-black ${
                filteredTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0) >= 0 
                ? 'text-primary' : 'text-accent'
              }`}>
                {formatCurrency(filteredTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0))}
              </p>
            </div>
          </div>

          {layout.map((item, index) => {
            switch (item.id) {
              case 'categories':
                return (
                  <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
                    {renderCardHeader(item.id, item.label, <PieChartIcon className="w-5 h-5 text-primary" />, index, item.collapsed)}
                    {!item.collapsed && (
                      <div className="p-8 h-80">
                        {filteredTransactions.length > 0 ? (
                          <Doughnut data={categoryChartData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: theme.text, font: { size: 12 } } } } }} />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-text opacity-40 text-sm italic gap-2">
                            <BarChart3 className="w-12 h-12 opacity-10" />
                            <span>Nenhum dado para os filtros selecionados</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              
              case 'payments':
                return (
                  <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
                    {renderCardHeader(item.id, item.label, <CreditCard className="w-5 h-5 text-primary" />, index, item.collapsed)}
                    {!item.collapsed && (
                      <div className="p-8 h-80">
                        {filteredTransactions.filter(t => t.paymentMethod).length > 0 ? (
                          <Pie data={paymentChartData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: theme.text, font: { size: 12 } } } } }} />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-text opacity-40 text-sm italic gap-2">
                            <CreditCard className="w-12 h-12 opacity-10" />
                            <span>Nenhum dado de pagamento encontrado</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );

              case 'price_evolution':
                return (
                  <div key={item.id} className="rounded-2xl border p-0 overflow-hidden shadow-md transition-all hover:shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
                    <div className="p-4 border-b font-semibold text-text flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBorder + '33' }}>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <span className="text-sm lg:text-base">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {!item.collapsed && (
                          <select 
                            className="p-2 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                            style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                            value={selectedItem || ''}
                            onChange={(e) => setSelectedItem(e.target.value)}
                          >
                            <option value="">Filtrar Item Específico...</option>
                            {sortedItemNames.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        )}
                        <div className="flex items-center gap-1 border-l pl-3" style={{ borderColor: theme.cardBorder }}>
                          <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="p-1.5 hover:bg-cardBorder rounded-md disabled:opacity-0 transition-all"><ArrowUp className="w-4 h-4" /></button>
                          <button onClick={() => moveItem(index, 'down')} disabled={index === layout.length - 1} className="p-1.5 hover:bg-cardBorder rounded-md disabled:opacity-0 transition-all"><ArrowDown className="w-4 h-4" /></button>
                          <button onClick={() => toggleCollapse(item.id)} className="p-1.5 hover:bg-cardBorder rounded-md transition-all ml-1">
                            {item.collapsed ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    {!item.collapsed && (
                      <div className="p-8 h-96">
                        {priceChartData ? (
                          <Line data={priceChartData} options={{ 
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              y: { ticks: { color: theme.text }, grid: { color: theme.cardBorder } },
                              x: { ticks: { color: theme.text }, grid: { color: theme.cardBorder } }
                            }
                          }} />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-text opacity-40 text-center gap-4 border-2 border-dashed rounded-3xl" style={{ borderColor: theme.cardBorder }}>
                            <TrendingUp className="w-16 h-16 opacity-10" />
                            <div className="max-w-xs">
                              <p className="text-base font-bold mb-1">Histórico de Preços</p>
                              <p className="text-xs italic">{sortedItemNames.length > 0 
                                ? "Escolha um produto no menu acima para visualizar a evolução do preço ao longo dos meses." 
                                : "Você ainda não possui itens itemizados em suas notas (Use o QR Code no mercado!)."}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );

              case 'table':
                return (
                  <div key={item.id} ref={tableRef} className="rounded-2xl border overflow-hidden shadow-md transition-all hover:shadow-lg scroll-mt-24" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
                    <div className="p-4 border-b font-semibold text-text flex items-center justify-between group" style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBorder + '33' }}>
                      <div className="flex items-center gap-3">
                        <TableIcon className="w-5 h-5 text-primary" />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm lg:text-base">{item.label}</span>
                          <div className="flex items-center gap-2 text-xs opacity-70">
                            <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full font-bold">{filteredTransactions.length} itens</span>
                            <span className="text-text">•</span>
                            <span className="font-bold text-primary">{formatCurrency(filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0))}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handlePrintTable(); }}
                          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text"
                          title="Imprimir Tabela"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {removedTransactionIds.length > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); resetRemovedTransactions(); }}
                            className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 rounded-full transition-all text-accent flex items-center gap-2 font-bold animate-pulse border border-accent/50 shadow-md text-xs"
                            title={`Reset - ${removedTransactionIds.length} removidos`}
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>{removedTransactionIds.length} removidos</span>
                          </button>
                        )}
                        <div className="w-[1px] h-4 mx-1 bg-cardBorder opacity-0 group-hover:opacity-100" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-0 group-hover:opacity-100 disabled:opacity-0"
                          title="Mover para Cima"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }}
                          disabled={index === layout.length - 1}
                          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-0 group-hover:opacity-100 disabled:opacity-0"
                          title="Mover para Baixo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleCollapse(item.id)}
                          className="p-1.5 hover:bg-cardBorder rounded-md transition-colors text-text opacity-50 hover:opacity-100"
                          title={item.collapsed ? "Expandir" : "Minimizar"}
                        >
                          {item.collapsed ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {!item.collapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-cardBorder bg-opacity-40" style={{ color: theme.text }}>
                              <th onClick={() => handleSort('date')} className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider cursor-pointer hover:bg-cardBorder/50 transition-colors" style={{ borderColor: theme.cardBorder }}>Data {sortBy === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                              <th onClick={() => handleSort('description')} className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider cursor-pointer hover:bg-cardBorder/50 transition-colors" style={{ borderColor: theme.cardBorder }}>Descrição {sortBy === 'description' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                              <th onClick={() => handleSort('category')} className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider cursor-pointer hover:bg-cardBorder/50 transition-colors" style={{ borderColor: theme.cardBorder }}>Categoria {sortBy === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                              <th onClick={() => handleSort('paymentMethod')} className="p-4 border-r border-b font-bold uppercase text-[10px] tracking-wider cursor-pointer hover:bg-cardBorder/50 transition-colors" style={{ borderColor: theme.cardBorder }}>Pagamento {sortBy === 'paymentMethod' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                              <th onClick={() => handleSort('amount')} className="p-4 border-b font-bold uppercase text-[10px] tracking-wider text-right cursor-pointer hover:bg-cardBorder/50 transition-colors" style={{ borderColor: theme.cardBorder }}>Valor {sortBy === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: theme.cardBorder }}>
                            {getSortedTransactions().map(t => (
                              <tr key={t.id} className="text-text hover:bg-primary/5 transition-colors group">
                                <td className="p-4 whitespace-nowrap border-r font-mono text-xs opacity-70" style={{ borderColor: theme.cardBorder }}>
                                  {formatBrazilDate(t.date, 'dd/MM/yyyy')}
                                </td>
                                <td className="p-4 font-bold border-r" style={{ borderColor: theme.cardBorder }}>
                                  <div className="flex items-center gap-2">
                                    {highlightText(t.description, searchTerm)}
                                    <button
                                      onClick={() => removeTransaction(t.id)}
                                      className="p-1 hover:bg-accent/10 rounded transition-colors text-accent flex-shrink-0"
                                      title="Remover da Visualização"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                                <td className="p-4 border-r" style={{ borderColor: theme.cardBorder }}>
                                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-cardBorder/50" style={{ color: theme.text }}>
                                    {t.category}
                                  </span>
                                </td>
                                <td className="p-4 border-r" style={{ borderColor: theme.cardBorder }}>
                                  {t.paymentMethod ? (
                                    <span className="text-[10px] opacity-80 uppercase font-black bg-primary/10 px-2 py-1 rounded text-primary">
                                      {PAYMENT_METHODS.find(m => m.id === t.paymentMethod)?.label || t.paymentMethod}
                                    </span>
                                  ) : <span className="opacity-20">-</span>}
                                </td>
                                <td className={`p-4 text-right font-black text-base ${t.type === 'income' ? 'text-primary' : 'text-accent'}`}>
                                  {formatCurrency(t.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredTransactions.length === 0 && (
                          <div className="p-32 text-center text-text opacity-40 flex flex-col items-center gap-4">
                            <Search className="w-16 h-16 opacity-10" />
                            <div className="max-w-xs">
                              <p className="text-base font-bold mb-1">Planilha Vazia</p>
                              <p className="text-xs italic">Nenhuma transação corresponde aos filtros atuais. Tente expandir o período ou limpar as categorias.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              
              default:
                return null;
            }
          })}
        </div>
      </div>

      {/* Print Dialog Modal */}
      {showPrintDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-cardBackground rounded-2xl shadow-2xl max-w-md w-full border" style={{ borderColor: theme.cardBorder }}>
            <div className="p-6 border-b" style={{ borderColor: theme.cardBorder, backgroundColor: theme.cardBorder + '33' }}>
              <h2 className="text-xl font-bold text-text">Personalizar Impressão</h2>
              <p className="text-xs text-text opacity-70 mt-1">Customize os detalhes do seu relatório</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Título do Relatório</label>
                <input
                  type="text"
                  value={printSettings.title}
                  onChange={(e) => setPrintSettings({ ...printSettings, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-2">Subtítulo (Opcional)</label>
                <input
                  type="text"
                  value={printSettings.subtitle}
                  onChange={(e) => setPrintSettings({ ...printSettings, subtitle: e.target.value })}
                  placeholder="Ex: Relatório de Setembro de 2025"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder, color: theme.text }}
                />
              </div>
            </div>

            <div className="p-6 border-t flex gap-3" style={{ borderColor: theme.cardBorder }}>
              <button
                onClick={() => setShowPrintDialog(false)}
                className="flex-1 px-4 py-2 text-text border rounded-lg font-semibold hover:bg-cardBorder/30 transition-colors"
                style={{ borderColor: theme.cardBorder }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { executePrint(); setShowPrintDialog(false); }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Playground;
