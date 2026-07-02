import { useNotifications } from '../context/NotificationContext';

type ActionType = 'transaction' | 'cofre' | 'negocio' | 'patrimonio';

const prefKey: Record<ActionType, 'on_transaction' | 'on_cofre' | 'on_negocio' | 'on_patrimonio'> = {
  transaction: 'on_transaction',
  cofre: 'on_cofre',
  negocio: 'on_negocio',
  patrimonio: 'on_patrimonio',
};

export function useNotifyAction() {
  const { sendNotification, prefs } = useNotifications();

  return async (type: ActionType, titulo: string, corpo: string) => {
    const key = prefKey[type];
    if (prefs && !prefs[key]) return;
    await sendNotification(titulo, corpo, type);
  };
}
