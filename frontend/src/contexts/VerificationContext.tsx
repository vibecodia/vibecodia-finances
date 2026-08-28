// GUEST MODE STORAGE CONVENTION:
// When isGuest === true, components should read/write to localStorage
// using keys prefixed with "guest_" (e.g., "guest_tasks", "guest_notes", "guest_transactions", "guest_goals", "guest_shopping_list").
// On verify() success, migrateGuestData() will POST all "guest_*" keys
// to /api/migrate-guest-data and clear them from localStorage.

import Cookies from "js-cookie";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

const VERIFICATION_COOKIE_NAME: string =
  import.meta.env.VITE_VERIFICATION_COOKIE_NAME || "user_verified";
const PIN_COOKIE_NAME: string = "pin_code";
const GUEST_MODE_STORAGE_KEY: string = "guest_mode";

const VERIFICATION_TIMEOUT: number =
  Number(import.meta.env.VITE_VERIFICATION_TIMEOUT_MS) ||
  15 * 60 * 1000; // Default: 15 min

interface VerificationContextType {
  isVerified: boolean;
  isSettingsVerified: boolean;
  isGuest: boolean;
  pin: string | null;
  verify: (code: string) => Promise<boolean>;
  logout: () => void;
  showVerificationModal: boolean;
  setShowVerificationModal: (show: boolean) => void;
  setSettingsVerified: (verified: boolean) => void;
  checkVerification: () => void;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  migrateGuestData: (verifiedPin?: string) => Promise<void>;
  isInitializing: boolean;
}

const VerificationContext = createContext<VerificationContextType | undefined>(
  undefined,
);

export const useVerification = (): VerificationContextType => {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error(
      "useVerification must be used within a VerificationProvider",
    );
  }
  return context;
};

interface VerificationProviderProps {
  children: ReactNode;
}

export const VerificationProvider: React.FC<VerificationProviderProps> = ({
  children,
}) => {
  const location = useLocation();
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isSettingsVerified, setIsSettingsVerified] = useState<boolean>(false);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [pin, setPin] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] =
    useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const checkVerification = (): void => {
    const lastVerification = Cookies.get(VERIFICATION_COOKIE_NAME);
    const storedPin = Cookies.get(PIN_COOKIE_NAME);
    const isGuestMode = localStorage.getItem(GUEST_MODE_STORAGE_KEY) === "true";

    // Se estiver na rota /guest, não forçamos a verificação nem abrimos o modal
    if (location.pathname === "/guest") {
      setIsInitializing(false);
      return;
    }

    if (lastVerification && storedPin) {
      const lastVerificationTime = new Date(lastVerification).getTime();
      if (Date.now() - lastVerificationTime < VERIFICATION_TIMEOUT) {
        setIsVerified(true);
        setPin(storedPin);
        setIsGuest(false);
        // On initial check, we don't automatically verify settings
      } else {
        logout(); // Se o tempo expirou, faça logout
      }
    } else if (isGuestMode) {
      setIsGuest(true);
      setIsVerified(false);
      setShowVerificationModal(false);
    } else {
      // Don't auto-show modal if we are on the guest entry page
      if (location.pathname !== "/guest") {
        setShowVerificationModal(true);
      }
    }
    setIsInitializing(false);
  };

  useEffect(() => {
    checkVerification();
    const interval = setInterval(checkVerification, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const migrateGuestData = async (verifiedPin?: string) => {
    try {
      const guestKeys = Object.keys(localStorage).filter(
        (key) => key.startsWith("guest_") && key !== GUEST_MODE_STORAGE_KEY,
      );
      if (guestKeys.length === 0) return;

      const guestData: Record<string, unknown> = {};
      guestKeys.forEach((key) => {
        try {
          guestData[key] = JSON.parse(localStorage.getItem(key) || "");
        } catch {
          guestData[key] = localStorage.getItem(key);
        }
      });

      const currentPin = verifiedPin || pin;

      const response = await fetch("/api/migrate-guest-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentPin}`,
        },
        body: JSON.stringify({ guestData, pin: currentPin }),
      });

      if (response.ok) {
        guestKeys.forEach((key) => localStorage.removeItem(key));
      } else {
        console.error("Migration failed:", await response.text());
      }
    } catch (error) {
      console.error("Migration request failed:", error);
    }
  };

  const enterGuestMode = () => {
    setIsGuest(true);
    setIsVerified(false);
    setShowVerificationModal(false);
    localStorage.setItem(GUEST_MODE_STORAGE_KEY, "true");
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
    setShowVerificationModal(true);
  };

  const verify = async (code: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/verify-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin: code }),
      });

      if (response.ok) {
        // Calcula a expiração em dias com base no timeout definido (js-cookie usa dias no campo expires)
        const expirationInDays = VERIFICATION_TIMEOUT / (24 * 60 * 60 * 1000);
        const cookieOptions = { expires: expirationInDays };

        Cookies.set(
          VERIFICATION_COOKIE_NAME,
          new Date().toISOString(),
          cookieOptions,
        );
        Cookies.set(PIN_COOKIE_NAME, code, cookieOptions);

        // Seta o pin antes de migrar para que migrateGuestData tenha acesso ao PIN se necessário
        setPin(code);

        if (isGuest) {
          // Pass the code directly to avoid state race condition
          await migrateGuestData(code);
          setIsGuest(false);
        }

        setIsVerified(true);
        setIsSettingsVerified(true); // Verifying PIN also verifies settings
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
    localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
    setIsVerified(false);
    setIsSettingsVerified(false);
    setIsGuest(false);
    setPin(null);
    if (location.pathname !== "/guest") {
      setShowVerificationModal(true);
    }
  };

  return (
    <VerificationContext.Provider
      value={{
        isVerified,
        isSettingsVerified,
        isGuest,
        pin,
        verify,
        logout,
        showVerificationModal,
        setShowVerificationModal,
        setSettingsVerified: setIsSettingsVerified,
        checkVerification,
        enterGuestMode,
        exitGuestMode,
        migrateGuestData,
        isInitializing,
      }}
    >
      {children}
    </VerificationContext.Provider>
  );
};
