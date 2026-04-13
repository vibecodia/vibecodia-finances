import Cookies from "js-cookie";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

const VERIFICATION_COOKIE_NAME: string =
  import.meta.env.VITE_VERIFICATION_COOKIE_NAME || "user_verified";
const PIN_COOKIE_NAME: string = "pin_code";

const VERIFICATION_TIMEOUT: number =
  Number(import.meta.env.VITE_VERIFICATION_TIMEOUT_MS) || 15 * 60 * 1000; // Default: 15 min

interface VerificationContextType {
  isVerified: boolean;
  isSettingsVerified: boolean;
  pin: string | null;
  verify: (code: string) => Promise<boolean>;
  logout: () => void;
  showVerificationModal: boolean;
  setShowVerificationModal: (show: boolean) => void;
  setSettingsVerified: (verified: boolean) => void;
  checkVerification: () => void;
  isInitializing: boolean;
}

const VerificationContext = createContext<VerificationContextType | undefined>(undefined);

export const useVerification = (): VerificationContextType => {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error("useVerification must be used within a VerificationProvider");
  }
  return context;
};

interface VerificationProviderProps {
  children: ReactNode;
}

export const VerificationProvider: React.FC<VerificationProviderProps> = ({ children }) => {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isSettingsVerified, setIsSettingsVerified] = useState<boolean>(false);
  const [pin, setPin] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const checkVerification = (): void => {
    const lastVerification = Cookies.get(VERIFICATION_COOKIE_NAME);
    const storedPin = Cookies.get(PIN_COOKIE_NAME);

    if (lastVerification && storedPin) {
      const lastVerificationTime = new Date(lastVerification).getTime();
      if (Date.now() - lastVerificationTime < VERIFICATION_TIMEOUT) {
        setIsVerified(true);
        setPin(storedPin);
        // On initial check, we don't automatically verify settings
      } else {
        logout(); // Se o tempo expirou, faça logout
      }
    } else {
      setShowVerificationModal(true);
    }
    setIsInitializing(false);
  };

  useEffect(() => {
    checkVerification();
    const interval = setInterval(checkVerification, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const verify = async (code: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: code }),
      });

      if (response.ok) {
        const cookieOptions = { expires: 3 }; // 3 dias
        Cookies.set(VERIFICATION_COOKIE_NAME, new Date().toISOString(), cookieOptions);
        Cookies.set(PIN_COOKIE_NAME, code, cookieOptions);
        setIsVerified(true);
        setIsSettingsVerified(true); // Verifying PIN also verifies settings
        setPin(code);
        setShowVerificationModal(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Verification request failed:", error);
      return false;
    }
  };

  const logout = () => {
    Cookies.remove(VERIFICATION_COOKIE_NAME);
    Cookies.remove(PIN_COOKIE_NAME);
    setIsVerified(false);
    setIsSettingsVerified(false);
    setPin(null);
    setShowVerificationModal(true);
  };

  return (
    <VerificationContext.Provider
      value={{ 
        isVerified, 
        isSettingsVerified, 
        pin, 
        verify, 
        logout, 
        showVerificationModal, 
        setShowVerificationModal, 
        setSettingsVerified: setIsSettingsVerified,
        checkVerification, 
        isInitializing 
      }}
    >
      {children}
    </VerificationContext.Provider>
  );
};
