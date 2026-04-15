import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVerification } from '../contexts/VerificationContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ShieldCheck, UserCircle, ArrowRight, Info } from 'lucide-react';

const GuestEntry: React.FC = () => {
  const navigate = useNavigate();
  const { enterGuestMode, setShowVerificationModal } = useVerification();

  const handleEnterGuestMode = () => {
    enterGuestMode();
    navigate('/');
  };

  const handleEnterWithPin = () => {
    setShowVerificationModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4 backdrop-blur-2xl animate-in fade-in duration-500">
      <Card className="w-full max-w-md p-8 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300 text-center border-white/10 bg-card/40">
        <div className="flex flex-col items-center mb-8">
          <div className="p-5 rounded-full bg-primary/10 text-primary mb-4 shadow-[0_0_30px_rgba(var(--primary),0.2)] border border-primary/20">
            <UserCircle className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter mb-2">
            Bem-vindo à <span className="text-primary italic">Vibecodia</span>
          </h2>
          <p className="text-sm text-foreground/80 font-medium max-w-xs mx-auto">
            Escolha como deseja acessar suas finanças hoje.
          </p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={handleEnterWithPin}
            className="w-full py-6 text-lg font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
          >
            <ShieldCheck className="w-6 h-6" />
            Entrar com PIN
          </Button>

          <Button 
            variant="outline"
            onClick={handleEnterGuestMode}
            className="w-full py-6 text-lg font-bold flex items-center justify-center gap-3 border-white/20 bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserCircle className="w-6 h-6" />
            Explorar como Convidado
            <ArrowRight className="w-5 h-5 ml-auto opacity-50" />
          </Button>
        </div>

        <div className="mt-8 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex gap-3 text-left">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/90 leading-relaxed">
            <span className="text-primary font-black uppercase tracking-wider block mb-1">Modo Convidado:</span>
            Seus dados ficam salvos apenas neste navegador. Você pode criar um PIN depois para salvar tudo na nuvem com segurança.
          </p>
        </div>

        <div className="mt-8">
          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-30">
            Vibecodia Ecosystem • v1.0.0
          </p>
        </div>
      </Card>
    </div>
  );
};

export default GuestEntry;
