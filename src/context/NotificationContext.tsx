import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase, VAPID_PUBLIC_KEY, type NotificationLog, type NotificationPreferences } from '../lib/supabase';
import { useAuth } from './AuthContext';

type NotifContextType = {
  pushSupported: boolean;
  pushPermission: NotificationPermission;
  pushSubscribed: boolean;
  prefs: NotificationPreferences | null;
  notifications: NotificationLog[];
  unreadCount: number;
  requestPushPermission: () => Promise<boolean>;
  unsubscribePush: () => Promise<void>;
  updatePrefs: (patch: Partial<NotificationPreferences>) => Promise<void>;
  sendNotification: (titulo: string, corpo: string, tipo?: string) => Promise<void>;
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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [pushSupported] = useState(() => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
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
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        setPushSubscribed(!!existing);
      }
    })();

    // Realtime: new notifications appear instantly
    const ch = supabase
      .channel('notif-log-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_log', filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications((prev) => [payload.new as NotificationLog, ...prev].slice(0, 50));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notification_log', filter: `user_id=eq.${user.id}` }, () => {
        supabase.from('notification_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
          .then(({ data }) => setNotifications(data ?? []));
      })
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const requestPushPermission = async (): Promise<boolean> => {
    if (!pushSupported) return false;

    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission !== 'granted') return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const key = sub.getKey('p256dh');
      const auth = sub.getKey('auth');

      await supabase.from('push_subscriptions').upsert({
        user_id: user!.id,
        endpoint: sub.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(key!))),
        auth_key: btoa(String.fromCharCode(...new Uint8Array(auth!))),
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
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    }
    setPushSubscribed(false);
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

  const sendNotification = async (titulo: string, corpo: string, tipo?: string) => {
    if (!user || !session) return;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: anonKey,
        },
        body: JSON.stringify({ titulo, corpo, tipo }),
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
    <NotifContext.Provider value={{ pushSupported, pushPermission, pushSubscribed, prefs, notifications, unreadCount, requestPushPermission, unsubscribePush, updatePrefs, sendNotification, markAllRead, clearLog }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
