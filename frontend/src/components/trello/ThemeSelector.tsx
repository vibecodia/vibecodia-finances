import { useState } from 'react';
import { FolderKanban, Layout, Plus, Crown, AlertCircle } from 'lucide-react';
import { BoardTheme, Task } from '../../types/trello/task';
import { Button } from '../ui/Button';
import { useVerification } from '../../contexts/VerificationContext';
import { cn } from '../../lib/utils';

interface ThemeSelectorProps {
  themes: BoardTheme[];
  tasks: Task[];
  onSelectTheme: (themeId: string) => void;
  onAddTheme: (name: string) => void;
}

export function ThemeSelector({ themes, tasks, onSelectTheme, onAddTheme }: ThemeSelectorProps) {
  const { isGuest } = useVerification();
  const [isNewThemeModalOpen, setIsNewThemeModalOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');

  const isLimitReached = isGuest && themes.length >= 2;

  const handleCreateTheme = () => {
    if (newThemeName.trim() && !isLimitReached) {
      onAddTheme(newThemeName.trim());
      setNewThemeName('');
      setIsNewThemeModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 flex flex-col items-center justify-center space-y-12">
      <div className="text-center space-y-4">
        <div className="p-6 rounded-[2.5rem] bg-primary/10 text-primary w-fit mx-auto mb-6">
          <FolderKanban className="w-16 h-16" />
        </div>
        <h1 className="text-5xl font-black text-foreground uppercase tracking-tighter">Escolha seu Tema</h1>
        <p className="text-muted-foreground font-bold uppercase tracking-widest">Selecione um espaço de trabalho para continuar</p>
        
        {isGuest && (
          <div className="flex items-center justify-center gap-2 mt-4 py-2 px-4 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
              Modo Visitante: Limite de 2 Temas • <span className="underline opacity-60">Seja Premium para Ilimitado</span>
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {themes.map(theme => (
          <button
            key={theme.id}
            onClick={() => onSelectTheme(theme.id)}
            className="group relative p-8 rounded-[2rem] border-2 border-border bg-card hover:border-primary hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 text-left flex flex-col gap-4 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <Layout className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">{theme.name}</h3>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
                {tasks.filter(t => t.themeId === theme.id).length} Tarefas
              </p>
            </div>
          </button>
        ))}
        
        <button
          onClick={() => {
            if (isLimitReached) {
              alert('Limite de temas atingido para o modo visitante. Verifique seu PIN para ter temas ilimitados!');
            } else {
              setIsNewThemeModalOpen(true);
            }
          }}
          className={cn(
            "p-8 rounded-[2rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 group",
            isLimitReached 
              ? "border-muted-foreground/20 bg-muted/5 opacity-50 cursor-not-allowed" 
              : "border-border hover:border-primary hover:bg-primary/5"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
            isLimitReached 
              ? "bg-muted-foreground/10 text-muted-foreground/30" 
              : "bg-foreground/5 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
          )}>
            <Plus className="w-6 h-6" />
          </div>
          <span className={cn(
            "text-sm font-black uppercase tracking-widest transition-colors",
            isLimitReached 
              ? "text-muted-foreground/30" 
              : "text-muted-foreground group-hover:text-primary"
          )}>
            {isLimitReached ? "Limite Atingido" : "Criar Novo Tema"}
          </span>
        </button>
      </div>

      {isNewThemeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card border-2 border-border p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2">Novo Espaço de Trabalho</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-6 opacity-60 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              {isGuest ? "Temas são salvos localmente no seu navegador." : "Temas premium são salvos de forma segura."}
            </p>
            <input
              autoFocus
              type="text"
              placeholder="Nome do tema..."
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              className="w-full bg-foreground/5 border-2 border-border rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-primary transition-colors mb-6"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTheme()}
            />
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setIsNewThemeModalOpen(false)}>Cancelar</Button>
              <Button 
                className="flex-1" 
                disabled={!newThemeName.trim() || isLimitReached}
                onClick={handleCreateTheme}
              >
                Criar Tema
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
