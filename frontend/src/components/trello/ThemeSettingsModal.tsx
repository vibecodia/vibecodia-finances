import { useState, useEffect } from 'react';
import { X, Palette, Image as ImageIcon, Trash2, Save, AlertTriangle } from 'lucide-react';
import { BoardTheme } from '../../types/trello/task';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: BoardTheme;
  onUpdate: (updates: Partial<BoardTheme>) => void;
  onDelete: () => void;
  isOnlyTheme: boolean;
}

export function ThemeSettingsModal({ 
  isOpen, 
  onClose, 
  theme, 
  onUpdate, 
  onDelete,
  isOnlyTheme 
}: ThemeSettingsModalProps) {
  const [name, setName] = useState(theme.name);
  const [subtitle, setSubtitle] = useState(theme.subtitle || '');
  const [color, setColor] = useState(theme.color || '#3b82f6');
  const [backgroundImage, setBackgroundImage] = useState(theme.backgroundImage || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(theme.name);
      setSubtitle(theme.subtitle || '');
      setColor(theme.color || '#3b82f6');
      setBackgroundImage(theme.backgroundImage || '');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, theme]);

  const handleSave = () => {
    onUpdate({
      name: name.trim(),
      subtitle: subtitle.trim() || undefined,
      color,
      backgroundImage: backgroundImage.trim() || undefined
    });
    onClose();
  };

  const presetColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#000000'
  ];

  const presetImages = [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=60',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 p-0 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Configurações do Espaço
          </h2>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <Input
            label="Nome do Espaço"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Trabalho, Pessoal..."
          />

          <Input
            label="Subtítulo (opcional)"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Breve descrição do espaço..."
          />

          <div className="space-y-3">
            <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Cor do Tema
            </label>
            <div className="flex flex-wrap gap-2">
              {presetColors.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                    color === c ? "border-primary scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input 
                type="color" 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-full border-none p-0 cursor-pointer overflow-hidden"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Imagem de Fundo (URL)
            </label>
            <Input
              value={backgroundImage}
              onChange={(e) => setBackgroundImage(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
            />
            <div className="grid grid-cols-4 gap-2">
              {presetImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setBackgroundImage(img)}
                  className={cn(
                    "h-12 rounded-lg bg-cover bg-center border-2 transition-all hover:scale-105",
                    backgroundImage === img ? "border-primary" : "border-transparent"
                  )}
                  style={{ backgroundImage: `url(${img})` }}
                />
              ))}
              <button
                onClick={() => setBackgroundImage('')}
                className={cn(
                  "h-12 rounded-lg bg-foreground/5 border-2 border-dashed flex items-center justify-center text-[10px] font-black uppercase tracking-tighter text-muted-foreground",
                  !backgroundImage ? "border-primary text-primary" : "border-border"
                )}
              >
                Limpar
              </button>
            </div>
          </div>

          {!isOnlyTheme && (
            <div className="pt-4 border-t border-border">
              {showDeleteConfirm ? (
                <div className="bg-destructive/10 p-4 rounded-2xl border border-destructive/20 space-y-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-tight">Confirmar Exclusão?</span>
                  </div>
                  <p className="text-[10px] text-destructive/70 font-bold uppercase leading-tight">
                    Isso apagará permanentemente este espaço, todas as suas colunas e tarefas.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="danger" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        onDelete();
                        onClose();
                      }}
                    >
                      Sim, Excluir
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  className="w-full text-destructive hover:bg-destructive/10 flex items-center justify-center gap-2"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Espaço
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-foreground/5 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 flex items-center justify-center gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" />
            Salvar
          </Button>
        </div>
      </Card>
    </div>
  );
}
