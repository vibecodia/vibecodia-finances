import axios from "axios";
import { useEffect } from "react";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const usePushNotifications = (
  pin: string | null,
  isVerified: boolean,
) => {
  useEffect(() => {
    // Somente registra se estiver verificado e tiver um PIN (não funciona para convidados sem banco persistente)
    if (!isVerified || !pin) return;

    const registerPush = async () => {
      try {
        // 1. Garantir que o Service Worker está pronto
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          console.warn(
            "Push notifications não são suportadas neste navegador.",
          );
          return;
        }

        const registration = await navigator.serviceWorker.ready;

        // 2. Verificar se já existe uma inscrição
        let subscription = await registration.pushManager.getSubscription();

        // 3. Buscar a chave VAPID pública do backend
        const response = await axios.post("/api/verify-pin", { pin });
        const vapidPublicKey = response.data.vapidPublicKey;

        if (!vapidPublicKey) {
          console.error(
            "VAPID Public Key não encontrada na resposta do servidor.",
          );
          return;
        }

        // 4. Se não houver inscrição ou se a chave mudou, criar uma nova
        if (!subscription) {
          // Solicitar permissão se necessário
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            console.warn("Permissão para notificações negada pelo usuário.");
            return;
          }

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        // 5. Enviar/Atualizar no Backend
        await axios.post(
          "/api/notifications/subscribe",
          { subscription },
          { headers: { "x-pin": pin } },
        );

        console.log(
          "Push Notification registrada com sucesso para o PIN:",
          pin,
        );
      } catch (err) {
        console.error("Falha ao registrar Push Notification:", err);
      }
    };

    // Pequeno delay para garantir que tudo carregou
    const timer = setTimeout(registerPush, 3000);
    return () => clearTimeout(timer);
  }, [pin, isVerified]);
};
