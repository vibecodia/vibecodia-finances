import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVerification } from '../contexts/VerificationContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ShieldCheck, UserCircle, ArrowRight, Info, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import PlansSection from './PlansSection';

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
    <div className="fixed inset-0 bg-black/95 z-[200] overflow-y-auto backdrop-blur-3xl animate-in fade-in duration-500">
      <div className="min-h-full w-full py-12 px-4 flex flex-col items-center gap-12">
        {/* Hero Section / Login Card */}
        <Card className="w-full max-w-md p-8 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300 text-center border-white/10 bg-card/40 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px]" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-[80px]" />
          
          <div className="flex flex-col items-center mb-8 relative z-10">
            <div className="p-5 rounded-full bg-primary/10 text-primary mb-4 shadow-[0_0_30px_rgba(var(--primary),0.2)] border border-primary/20">
              <UserCircle className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-black text-foreground uppercase tracking-tighter mb-2">
              <span className="text-primary italic">Vibecodia</span>
            </h2>          
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter mb-2">
              Olá! 👋
            </h3>
            <p className="text-sm text-foreground/60 font-medium max-w-xs mx-auto">
              Sua vida financeira organizada em um só lugar.
            </p>
          </div>

          <div className="space-y-4 relative z-10">
            <Button 
              onClick={handleEnterWithPin}
              className="w-full py-7 text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
            >
              <ShieldCheck className="w-6 h-6" />
              Entrar com PIN
            </Button>

            <Button 
              variant="outline"
              onClick={handleEnterGuestMode}
              className="w-full py-7 text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3 border-white/10 bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Globe className="w-6 h-6" />
              Modo Convidado
              <ArrowRight className="w-5 h-5 ml-auto opacity-30" />
            </Button>
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3 text-left relative z-10">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-foreground/60 leading-relaxed font-bold uppercase tracking-tight">
              <span className="text-primary font-black block mb-1">Atenção:</span>
              No modo convidado os dados ficam salvos apenas neste navegador.
            </p>
          </div>
        </Card>

        {/* Plans Section */}
        <PlansSection />

        {/* Footer */}
        <div className="mt-4 pb-12">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-30 flex items-center gap-4">
            Vibecodia Ecosystem 
            <span className="w-1 h-1 bg-muted-foreground rounded-full" />
            v1.2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuestEntry;
