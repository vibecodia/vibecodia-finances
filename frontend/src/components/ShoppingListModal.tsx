import { X, Check, Trash2, PlusCircle, Star, ShoppingBasket } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '../lib/utils';

import { ColorPalette } from '../contexts/ThemeContext';

interface ShoppingItem {
  id: string;
  name: string;
  purchased: boolean;
  isPriority: boolean;
  createdAt: string;
}

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoppingList: ShoppingItem[];
  addItem: (name: string) => void;
  togglePurchased: (id: string) => void;
  removeItem: (id: string) => void;
  clearPurchased: () => void;
  togglePriority: (id: string) => void;
  theme: ColorPalette;
  isDarkMode: boolean;
}

const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  isOpen,
  onClose,
  shoppingList,
  addItem,
  togglePurchased,
  removeItem,
  clearPurchased,
  togglePriority,
  theme,
  isDarkMode,
}) => {
  const [newItemName, setNewItemName] = useState('');
  const itemRefs = useRef(new Map<string, React.RefObject<HTMLLIElement>>());

  useEffect(() => {
    // Clean up refs for items that are no longer in the shopping list
    const currentRefs = itemRefs.current;
    shoppingList.forEach(item => {
      if (!currentRefs.has(item.id)) {
        currentRefs.set(item.id, React.createRef());
      }
    });
    // Remove refs that are no longer needed
    currentRefs.forEach((_value, key) => {
      if (!shoppingList.some(item => item.id === key)) {
        currentRefs.delete(key);
      }
    });
  }, [shoppingList]);

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    addItem(newItemName.trim());
    setNewItemName('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
        <div 
          className="p-6 transition-colors duration-300"
          style={{ 
            backgroundColor: theme.cardBackground,
            color: theme.text 
          }}
        >
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div 
                className="p-2 rounded-xl"
                style={{ backgroundColor: `${theme.primary}15` }}
              >
                <ShoppingBasket className="w-6 h-6" style={{ color: theme.primary }} />
              </div>
              <DialogTitle 
                className="text-2xl font-black tracking-tight uppercase italic"
                style={{ color: theme.text }}
              >
                Lista de Compras
              </DialogTitle>
            </div>
            <p className="text-sm text-center opacity-60 font-medium">
              Gerencie seus itens e afazeres
            </p>
          </DialogHeader>

          <div className="flex gap-2 mb-6">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="O que você precisa comprar?"
              className="flex-grow transition-all"
              style={{ 
                backgroundColor: theme.background,
                borderColor: theme.cardBorder,
                color: theme.text
              }}
            />
            <Button
              onClick={handleAddItem}
              className="px-4 shrink-0 shadow-lg"
              style={{ 
                backgroundColor: theme.primary,
                color: '#fff'
              }}
            >
              <PlusCircle className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            {Array.isArray(shoppingList) && shoppingList.length > 0 ? (
              <TransitionGroup component="ul" className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {shoppingList.map((item) => {
                  const nodeRef = itemRefs.current.get(item.id);
                  return (
                    <CSSTransition
                      key={item.id}
                      timeout={300}
                      classNames="shopping-list-item"
                      nodeRef={nodeRef}
                    >
                      <li
                        ref={nodeRef}
                        className={cn(
                          "group flex items-center justify-between p-3 rounded-xl transition-all duration-300 border",
                          item.purchased 
                            ? "opacity-60" 
                            : "shadow-sm"
                        )}
                        style={{
                          backgroundColor: item.purchased ? `${theme.primary}10` : theme.background,
                          borderColor: item.purchased ? `${theme.primary}20` : theme.cardBorder,
                        }}
                      >
                        <div 
                          className="flex-grow flex items-center gap-3 cursor-pointer select-none"
                          onClick={() => togglePurchased(item.id)}
                        >
                          <div 
                            className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                              item.purchased && "scale-110"
                            )}
                            style={{
                              backgroundColor: item.purchased ? theme.primary : 'transparent',
                              borderColor: item.purchased ? theme.primary : `${theme.text}20`
                            }}
                          >
                            {item.purchased && <Check className="w-3 h-3 text-white stroke-[4]" />}
                          </div>
                          <span className={cn(
                            "font-medium transition-all",
                            item.purchased && "line-through opacity-50"
                          )}>
                            {item.name}
                          </span>
                          {item.isPriority && !item.purchased && (
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 animate-pulse" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePriority(item.id)}
                            className={cn(
                              "h-10 w-10 rounded-xl transition-all",
                              item.isPriority ? "text-yellow-500 bg-yellow-500/10 shadow-inner" : "opacity-60 hover:opacity-100 hover:text-yellow-500 hover:bg-yellow-500/10"
                            )}
                          >
                            <Star className={cn("w-5 h-5", item.isPriority && "fill-yellow-500")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePurchased(item.id)}
                            className={cn(
                              "h-10 w-10 rounded-xl transition-all",
                              item.purchased ? "text-green-500 bg-green-500/10 shadow-inner" : "opacity-60 hover:opacity-100 hover:text-green-500 hover:bg-green-500/10"
                            )}
                          >
                            <Check className={cn("w-5 h-5", item.purchased && "stroke-[3]")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="h-10 w-10 rounded-xl opacity-60 hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </li>
                    </CSSTransition>
                  );
                })}
              </TransitionGroup>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                <ShoppingBasket className="w-12 h-12 mb-3" />
                <p className="font-medium uppercase tracking-widest text-[10px]">Sua lista está vazia</p>
              </div>
            )}
          </div>

          {shoppingList.some(item => item.purchased) && (
            <Button
              variant="outline"
              onClick={clearPurchased}
              className="mt-6 w-full transition-all uppercase tracking-widest text-[10px] font-bold h-10"
              style={{
                borderColor: `${theme.text}20`,
                color: theme.text
              }}
            >
              Limpar Itens Concluídos
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShoppingListModal;
