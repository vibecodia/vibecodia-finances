import React, { useState } from 'react';
import { Transaction, SavingsGoal } from '../types';
import { exportFinancialData, validateImportData, getCurrentBrazilDate, formatBrazilDate } from '../utils/helpers';
import { Settings as SettingsIcon, Download, Upload, Trash2, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsProps {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  onImportData: (transactions: Transaction[], savingsGoals: SavingsGoal[]) => void;
  onClearAllData: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  transactions, 
  savingsGoals, 
  onImportData, 
  onClearAllData 
}) => {
  const { theme } = useTheme();
  const [importText, setImportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  const handleExport = () => {
    const exportData = exportFinancialData(transactions, savingsGoals);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financeiro-backup-${formatBrazilDate(getCurrentBrazilDate(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!importText.trim()) {
      setImportStatus('error');
      setImportMessage('Por favor, cole os dados JSON para importar.');
      return;
    }

    const validatedData = validateImportData(importText);
    
    if (!validatedData) {
      setImportStatus('error');
      setImportMessage('Dados inválidos. Verifique se o arquivo JSON está correto.');
      return;
    }

    onImportData(validatedData.transactions, validatedData.savingsGoals);
    setImportStatus('success');
    setImportMessage(`Importação realizada com sucesso! ${validatedData.transactions.length} transações e ${validatedData.savingsGoals.length} metas importadas.`);
    
    setTimeout(() => {
      setShowImportModal(false);
      setImportText('');
      setImportStatus('idle');
      setImportMessage('');
    }, 2000);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportText(content);
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    onClearAllData();
    setShowClearModal(false);
  };

  const totalTransactions = transactions.length;
  const totalGoals = savingsGoals.length;

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-text mb-2">
          Configurações
        </h1>
        <p className="text-text opacity-90">
          Gerencie seus dados e configurações
        </p>
      </div>

      {/* Data Management */}
      <div className="rounded-2xl border p-6" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{ backgroundColor: theme.primary, opacity: 0.2 }}>
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-text">
            Gerenciamento de Dados
          </h2>
        </div>

        <div className="space-y-4">
          {/* Export */}
          <div className="flex items-center justify-between p-4 rounded-lg" style={{ border: `1px solid ${theme.cardBorder}` }}>
            <div>
              <h3 className="font-medium text-text mb-1">
                Exportar Dados
              </h3>
              <p className="text-sm text-text opacity-90">
                Baixe um backup de todas as suas transações e metas
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors bg-primary hover:bg-secondary"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>

          {/* Import */}
          <div className="flex items-center justify-between p-4 rounded-lg" style={{ border: `1px solid ${theme.cardBorder}` }}>
            <div>
              <h3 className="font-medium text-text mb-1">
                Importar Dados
              </h3>
              <p className="text-sm text-text opacity-90">
                Restaure seus dados de um backup anterior
              </p>
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors bg-primary hover:bg-secondary"
            >
              <Upload className="w-4 h-4" />
              Importar
            </button>
          </div>

          {/* Clear All Data */}
          <div className="flex items-center justify-between p-4 rounded-lg" style={{ border: `1px solid ${theme.accent}`, backgroundColor: theme.cardBackground }}>
            <div>
              <h3 className="font-medium text-accent mb-1">
                Limpar Todos os Dados
              </h3>
              <p className="text-sm text-accent opacity-90">
                Remove permanentemente todas as transações e metas
              </p>
            </div>
            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors bg-accent hover:bg-primary"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Tudo
            </button>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="rounded-2xl border p-6" style={{ backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: theme.cardBorder }}>
            <SettingsIcon className="w-5 h-5 text-text opacity-90" />
          </div>
          <h2 className="text-lg font-semibold text-text">
            Sobre o App
          </h2>
        </div>
        
        <div className="space-y-3 text-sm text-text opacity-90">
          <p>
            <strong>Controle Financeiro</strong> - Versão {import.meta.env.APP_VERSION}
          </p>
          <p>
            Os dados são armazenados localmente no seu navegador e não são enviados para nenhum servidor externo.
          </p>
          <p>
            Para não perder seus dados, faça backups regulares usando a função de exportar.
          </p>
          <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.primary}` }}>
            <p className="text-primary font-medium mb-1">💡 Nova Funcionalidade: Recorrência Inteligente</p>
            <p className="text-primary text-xs">
              Transações marcadas como recorrentes (semanal, mensal, anual) são automaticamente calculadas no calendário e relatórios.
            </p>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.cardBackground }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-text">
                Importar Dados
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setImportStatus('idle');
                  setImportMessage('');
                }}
                className="p-2 rounded-full transition-colors hover:bg-cardBorder"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Selecionar arquivo de backup
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                />
              </div>

              <div className="text-center text-text opacity-70">ou</div>

              {/* Text Import */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Cole os dados JSON aqui
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Cole o conteúdo do arquivo JSON aqui..."
                  className="w-full h-40 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                />
              </div>

              {/* Status Message */}
              {importMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-lg`}
                  style={{ 
                    backgroundColor: theme.cardBackground,
                    borderColor: importStatus === 'success' ? theme.primary : theme.accent,
                    color: importStatus === 'success' ? theme.primary : theme.accent,
                    border: `1px solid ${importStatus === 'success' ? theme.primary : theme.accent}`
                  }}>
                  {importStatus === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                  <span className="text-sm">{importMessage}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportText('');
                    setImportStatus('idle');
                    setImportMessage('');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl transition-colors hover:bg-cardBorder" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importText.trim() || importStatus === 'success'}
                  className="flex-1 px-4 py-3 text-white rounded-xl font-medium transition-colors bg-primary hover:bg-secondary"
                >
                  Importar Dados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl w-full max-w-md p-6" style={{ backgroundColor: theme.cardBackground }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: theme.accent, opacity: 0.2 }}>
                <AlertTriangle className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-text">
                Confirmar Exclusão
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-text opacity-90 mb-4">
                Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.
              </p>
              <div className="rounded-lg p-3" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.accent}` }}>
                <p className="text-sm text-accent font-medium mb-1">
                  <strong>Serão removidos:</strong>
                </p>
                <ul className="text-sm text-accent opacity-90 mt-1 list-disc list-inside">
                  <li>{totalTransactions} transações</li>
                  <li>{totalGoals} metas de economia</li>
                  <li>Todos os dados salvos</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-4 py-3 rounded-xl transition-colors hover:bg-cardBorder" style={{ border: `1px solid ${theme.cardBorder}`, color: theme.text, backgroundColor: theme.cardBackground }}
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAllData}
                className="flex-1 px-4 py-3 text-white rounded-xl font-medium transition-colors bg-accent hover:bg-primary"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;