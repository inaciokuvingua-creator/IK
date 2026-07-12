import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase, VAPID_PUBLIC_KEY, type NotificationLog, type NotificationPreferences } from '../lib/supabase';
import { useAuth } from './AuthContext';

const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
const swBasePath = (env.BASE_URL ?? '/').endsWith('/') ? (env.BASE_URL ?? '/') : `${env.BASE_URL}/`;
const swPath = `${swBasePath}sw.js`;
 
/** Tier 1: Full Web Push (SW + PushManager + Notification) — Chrome/Edge/Firefox desktop & Android */
/** Tier 2: Local Notification API only (no PushManager) — Safari desktop, some mobile */
/** Tier 3: In-app only via Supabase realtime — always works everywhere */

type NotifContextType = {
  pushSupported: boolean;          // Tier 1: full web push
  localNotifSupported: boolean;    // Tier 2: Notification API without push
  pushPermission: NotificationPermission;
  pushSubscribed: boolean;
  prefs: NotificationPreferences | null;
  notifications: NotificationLog[];
  unreadCount: number;
  requestPushPermission: () => Promise<boolean>;
  requestLocalPermission: () => Promise<boolean>;  // Tier 2 activate
  unsubscribePush: () => Promise<void>;
  updatePrefs: (patch: Partial<NotificationPreferences>) => Promise<void>;
  sendNotification: (titulo: string, corpo: string, tipo?: string, options?: { userId?: string; url?: string }) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearLog: () => Promise<void>;
};

const NotifContext = createContext<NotifContextType | null>(null);

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function toBase64(buffer: ArrayBuffer | null) {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary);
}

async function ensureServiceWorkerRegistration() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration(swBasePath);
    if (existing) return existing;
    return navigator.serviceWorker.register(swPath, { scope: swBasePath });
  } catch (error) {
    console.error('[Push] service worker registration failed:', error);
    return null;
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();

  // Tier 1: Full Web Push
  const [pushSupported] = useState(() =>
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
  // Tier 2: Notification API without ServiceWorker/PushManager
  const [localNotifSupported] = useState(() =>
    typeof window !== 'undefined' &&
    'Notification' in window &&
    !('PushManager' in window)
  );

  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load prefs + notification log + check current push subscription status
  useEffect(() => {
    if (!user) { setPrefs(null); setNotifications([]); return; }

    (async () => {
      // Load prefs (upsert defaults)
      const { data: existingPrefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingPrefs) {
        setPrefs(existingPrefs);
      } else {
        const { data: newPrefs } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();
        setPrefs(newPrefs);
      }

      // Load notification log
      const { data: logs } = await supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setNotifications(logs ?? []);

      // Check if already subscribed
      if (pushSupported && Notification.permission === 'granted') {
        const reg = await ensureServiceWorkerRegistration();
        if (reg) {
          const existing = await reg.pushManager.getSubscription();
          setPushSubscribed(!!existing);
        }
      }
    })();

    // Realtime: new notifications appear instantly + show local notif if permission granted
    const ch = supabase
      .channel('notif-log-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_log', filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as NotificationLog;
        setNotifications((prev) => [n, ...prev].slice(0, 50));
        // Tier 2 fallback: show OS notification via Notification API if push not subscribed
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && !document.hasFocus()) {
          try {
            new Notification(n.titulo ?? 'IK Finance', {
              body: n.corpo ?? '',
              icon: '/icon-192x192.png',
            });
          } catch { /* ignore */ }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notification_log', filter: `user_id=eq.${user.id}` }, () => {
        supabase.from('notification_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
          .then(({ data }) => setNotifications(data ?? []));
      })
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [pushSupported, user]);

  const requestPushPermission = async (): Promise<boolean> => {
    if (!pushSupported) return false;

    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission !== 'granted') return false;

    try {
      const reg = await ensureServiceWorkerRegistration();
      if (!reg) return false;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const key = sub.getKey('p256dh');
      const auth = sub.getKey('auth');

      await supabase.from('push_subscriptions').upsert({
        user_id: user!.id,
        endpoint: sub.endpoint,
        p256dh: toBase64(key) ?? '',
        auth_key: toBase64(auth) ?? '',
        user_agent: navigator.userAgent.substring(0, 200),
      }, { onConflict: 'user_id,endpoint' });

      setPushSubscribed(true);

      // Send a test notification
      new Notification('IK Finance ativado!', {
        body: 'As notificações push estão configuradas e funcionando.',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
      });

      return true;
    } catch (err) {
      console.error('[Push] subscription failed:', err);
      return false;
    }
  };

  const unsubscribePush = async () => {
    const reg = await ensureServiceWorkerRegistration();
    if (!reg) {
      setPushSubscribed(false);
      return;
    }
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    }
    setPushSubscribed(false);
  };

  /** Tier 2: request Notification API permission without ServiceWorker/PushManager */
  const requestLocalPermission = async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;
    try {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm === 'granted') {
        new Notification('IK Finance ativado!', {
          body: 'Notificações locais ativas. Receberá alertas quando o app estiver aberto.',
          icon: '/icon-192x192.png',
        });
        await updatePrefs({ push_enabled: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updatePrefs = async (patch: Partial<NotificationPreferences>) => {
    if (!user) return;
    const { data } = await supabase
      .from('notification_preferences')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single();
    if (data) setPrefs(data);
  };

  const sendNotification = async (titulo: string, corpo: string, tipo?: string, options?: { userId?: string; url?: string }) => {
    if (!user || !session) return;
    try {
      const supabaseUrl = env.VITE_SUPABASE_URL as string;
      const anonKey = env.VITE_SUPABASE_ANON_KEY as string;
      await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: anonKey,
        },
        body: JSON.stringify({ titulo, corpo, tipo, url: options?.url, userId: options?.userId }),
      });
    } catch (err) {
      console.error('[Notification] send failed:', err);
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notification_log').update({ lida: true }).eq('user_id', user.id).eq('lida', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const clearLog = async () => {
    if (!user) return;
    await supabase.from('notification_log').delete().eq('user_id', user.id);
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.lida).length;

  return (
    <NotifContext.Provider value={{ pushSupported, localNotifSupported, pushPermission, pushSubscribed, prefs, notifications, unreadCount, requestPushPermission, requestLocalPermission, unsubscribePush, updatePrefs, sendNotification, markAllRead, clearLog }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
