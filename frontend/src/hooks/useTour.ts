import { driver } from "driver.js";
import { useEffect, useCallback, useState } from "react";
import "driver.js/dist/driver.css";

const TOUR_SKIPPED_KEY = "tour_skipped";
const TOUR_EVENT_NAME = "vibecodia_start_tour_confirm";

export const useTour = () => {
  const [showConfirm, setShowConfirm] = useState(false);

  // Listener para eventos globais de tour
  useEffect(() => {
    const handleTourEvent = () => {
      setShowConfirm(true);
    };
    window.addEventListener(TOUR_EVENT_NAME, handleTourEvent);
    return () => window.removeEventListener(TOUR_EVENT_NAME, handleTourEvent);
  }, []);

  const startTour = useCallback((withConfirmation = false) => {
    if (withConfirmation) {
      // Dispara evento global para que todas as instâncias do hook saibam
      window.dispatchEvent(new CustomEvent(TOUR_EVENT_NAME));
      return;
    }

    const driverObj = driver({
      showProgress: true,
      nextBtnText: "Próximo",
      prevBtnText: "Anterior",
      doneBtnText: "Finalizar",
      allowClose: true,
      overlayColor: "rgba(0, 0, 0, 0.85)",
      stagePadding: 4,
      popoverClass: "vibecodia-tour-popover",
      steps: [
        {
          element: "#tour-balance-card",
          popover: {
            title: "💳 SEU CARTÃO VIBECODIA",
            description:
              "Aqui você controla seu saldo. No modo convidado, você pode personalizar o nome e a foto!",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#tour-month-selector",
          popover: {
            title: "📅 NAVEGAÇÃO TEMPORAL",
            description:
              "Navegue entre os meses para planejar seu futuro financeiro.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: "#tour-income-expense-bar",
          popover: {
            title: "📊 FLUXO DE CAIXA",
            description:
              "Acompanhe visualmente a relação entre suas receitas e despesas.",
            side: "top",
            align: "center",
          },
        },
        {
          element: ".lg\\:hidden.fixed.top-4.left-4",
          popover: {
            title: "📱 MENU DE ACESSO",
            description:
              "Clique aqui para acessar Gastos, Receitas, Agenda e Metas.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#tour-header-actions",
          popover: {
            title: "⚡ ATALHOS RÁPIDOS",
            description:
              "Mude o tema ou acesse sua lista de compras rapidamente.",
            side: "bottom",
            align: "end",
          },
        },
      ],
      onDestroyed: () => {
        localStorage.setItem(TOUR_SKIPPED_KEY, "true");
      },
    });

    driverObj.drive();
  }, []);

  useEffect(() => {
    // Injeta estilos customizados para o popover do Driver.js
    const style = document.createElement("style");
    style.innerHTML = `
      .vibecodia-tour-popover {
        background: rgba(30, 41, 59, 0.9) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 2rem !important;
        padding: 1.5rem !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
        max-width: 280px !important;
      }
      .driver-popover-title {
        font-family: inherit !important;
        font-size: 1.1rem !important;
        font-weight: 900 !important;
        letter-spacing: -0.05em !important;
        text-transform: uppercase !important;
        color: #4ade80 !important;
        margin-bottom: 0.75rem !important;
      }
      .driver-popover-description {
        font-size: 0.85rem !important;
        line-height: 1.6 !important;
        font-weight: 500 !important;
        color: rgba(255, 255, 255, 0.7) !important;
      }
      .driver-popover-progress-text {
        color: rgba(255, 255, 255, 0.3) !important;
        font-size: 0.7rem !important;
        font-weight: 900 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.1em !important;
      }
      .driver-popover-navigation-btns {
        margin-top: 1.5rem !important;
        gap: 0.5rem !important;
        display: flex !important;
      }
      .driver-popover-navigation-btns button {
        flex: 1 !important;
        background: rgba(255, 255, 255, 0.05) !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        text-shadow: none !important;
        font-size: 0.65rem !important;
        font-weight: 900 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.15em !important;
        padding: 0.75rem 0.5rem !important;
        border-radius: 1rem !important;
        transition: all 0.2s !important;
      }
      .driver-popover-next-btn {
        background: #4ade80 !important;
        color: #064e3b !important;
        border: none !important;
      }
      .driver-popover-next-btn:hover {
        background: #22c55e !important;
        transform: scale(1.05) !important;
      }
      .driver-popover-prev-btn:hover {
        background: rgba(255, 255, 255, 0.15) !important;
      }
      .driver-popover-close-btn {
        color: rgba(255, 255, 255, 0.4) !important;
        transition: all 0.2s !important;
        background: rgba(255, 255, 255, 0.05) !important;
        width: 24px !important;
        height: 24px !important;
        border-radius: 8px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
        top: 12px !important;
        right: 12px !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
      }
      .driver-popover-close-btn:hover {
        color: white !important;
        background: rgba(255, 71, 71, 0.2) !important;
        border-color: rgba(255, 71, 71, 0.3) !important;
      }
      .driver-popover-close-btn:active {
        transform: scale(0.9) !important;
      }
      .driver-popover-arrow {
        display: none !important; /* Arrows usually look bad with glassmorphism */
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return { startTour, showConfirm, setShowConfirm };
};
