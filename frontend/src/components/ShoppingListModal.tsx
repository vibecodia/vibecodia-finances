import React, { useState, useRef, useEffect } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { X, Check, Trash2, PlusCircle, Star } from 'lucide-react';
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
    addItem(newItemName);
    setNewItemName('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-card-background p-6 rounded-lg shadow-xl w-11/12 max-w-md relative"
        style={{
          backgroundColor: theme.cardBackground,
          color: theme.text,
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-text-light hover:text-text"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center">Lista de Afazeres / Compras</h2>

        <div className="flex mb-4">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddItem();
              }
            }}
            placeholder="Adicionar novo item..."
            className="flex-grow p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary"
            style={{
              backgroundColor: theme.background,
              color: theme.text,
              borderColor: theme.cardBorder,
            }}
          />
          <button
            onClick={handleAddItem}
            className="bg-primary text-white p-2 rounded-r-md hover:bg-primary-dark flex items-center justify-center"
          >
            <PlusCircle size={20} />
          </button>
        </div>

        {Array.isArray(shoppingList) && shoppingList.length > 0 ? (
          <TransitionGroup component="ul" className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {shoppingList.map((item) => {
              const nodeRef = itemRefs.current.get(item.id);
              return (
                <CSSTransition
                  key={item.id}
                  timeout={500}
                  classNames="shopping-list-item"
                  nodeRef={nodeRef}
                >
                  <li
                    ref={nodeRef}
                    className={`flex items-center justify-between p-3 rounded-md transition-all duration-300 ${item.purchased ? 'bg-green-100 dark:bg-green-900 line-through opacity-70' : 'bg-background'}`}
                    style={{
                      backgroundColor: item.purchased ? (isDarkMode ? '#10B98133' : '#D1FAE5') : theme.background,
                      color: theme.text,
                    }}
                  >
                    <span className="flex-grow cursor-pointer" onClick={() => togglePurchased(item.id)}>
                      {item.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => togglePriority(item.id)}
                        className={`p-1 rounded-full ${item.isPriority ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-300 hover:bg-gray-400'} text-white`}
                      >
                        <Star size={18} />
                      </button>
                      <button
                        onClick={() => togglePurchased(item.id)}
                        className={`p-1 rounded-full ${item.purchased ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 hover:bg-gray-400'} text-white`}
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded-full bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </li>
                </CSSTransition>
              );
            })}
          </TransitionGroup>
        ) : (
          <p className="text-center text-text-light">Sua lista está vazia.</p>
        )}

        {shoppingList.some(item => item.purchased) && (
          <button
            onClick={clearPurchased}
            className="mt-4 w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
          >
            Limpar Itens Feitos
          </button>
        )}
      </div>
    </div>
  );
};

export default ShoppingListModal;
