import { Search } from 'lucide-react';
import { Input } from '../ui/Input';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function SearchBar({ searchTerm, onSearchChange }: SearchBarProps) {
  return (
    <div className="relative w-full max-w-md group">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors w-4 h-4 z-10" />
      <Input
        type="text"
        placeholder="Buscar tarefas..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-12"
      />
    </div>
  );
}