import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts(onOpenHelp?: () => void) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Atalhos apenas para desktop (largura > 1024px)
      if (window.innerWidth <= 1024) return;

      // Ignorar se teclas modificadoras estiverem pressionadas (exceto Shift que pode ser necessário para '?')
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // Don't trigger if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'k') {
        e.preventDefault();
        navigate('/expenses/new');
      } else if (key === 'i') {
        e.preventDefault();
        navigate('/income/new');
      } else if (key === 'd') {
        e.preventDefault();
        navigate('/');
      } else if (key === 't') {
        e.preventDefault();
        navigate('/tasks');
      } else if (key === 'c') {
        e.preventDefault();
        navigate('/calendar');
      } else if (key === 'r') {
        e.preventDefault();
        navigate('/reports');
      } else if (key === 'g') {
        e.preventDefault();
        navigate('/goals');
      } else if (key === 'p') {
        e.preventDefault();
        navigate('/playground');
      } else if (e.key === '?' && onOpenHelp) {
        e.preventDefault();
        onOpenHelp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onOpenHelp]);
}
