// Chat types and helpers
export type Profile = {
  user_id: string;
  nome: string;
  avatar_url: string | null;
  verified: boolean;
  plan: string;
};

export type Conversation = {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined from participants + profiles:
  participants?: ConvParticipant[];
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
};

export type ConvParticipant = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  left_at: string | null;
  last_read_at: string;
  profile?: Profile;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'sticker' | 'call_log' | 'deleted';
  content: string | null;
  media_url: string | null;
  media_mime: string | null;
  media_name: string | null;
  media_size: number | null;
  media_duration: number | null;
  sticker_id: string | null;
  reply_to_id: string | null;
  call_type: string | null;
  call_duration: number | null;
  call_status: string | null;
  edited: boolean;
  deleted_at: string | null;
  created_at: string;
  // joined:
  sender?: Profile;
  reactions?: ChatReaction[];
  reply_to?: ChatMessage | null;
};

export type ChatReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type ChatStory = {
  id: string;
  user_id: string;
  type: 'image' | 'video' | 'text';
  media_url: string | null;
  content: string | null;
  bg_color: string;
  font_size: number;
  expires_at: string;
  created_at: string;
  profile?: Profile;
  view_count?: number;
  viewed?: boolean;
};

export type ChatCall = {
  id: string;
  conversation_id: string | null;
  caller_id: string;
  call_type: 'voice' | 'video' | 'group_voice' | 'group_video';
  status: 'calling' | 'answered' | 'missed' | 'declined' | 'ended' | 'busy';
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  participants: string[];
};

export type TypingUser = {
  user_id: string;
  conversation_id: string;
  updated_at: string;
};

export const STICKERS = [
  { id: 's1',  emoji: '😀' }, { id: 's2',  emoji: '😂' }, { id: 's3',  emoji: '😍' },
  { id: 's4',  emoji: '🥰' }, { id: 's5',  emoji: '😎' }, { id: 's6',  emoji: '🤔' },
  { id: 's7',  emoji: '😭' }, { id: 's8',  emoji: '🎉' }, { id: 's9',  emoji: '🔥' },
  { id: 's10', emoji: '💯' }, { id: 's11', emoji: '👍' }, { id: 's12', emoji: '❤️' },
  { id: 's13', emoji: '💪' }, { id: 's14', emoji: '🙌' }, { id: 's15', emoji: '👋' },
  { id: 's16', emoji: '🤝' }, { id: 's17', emoji: '😊' }, { id: 's18', emoji: '🥳' },
  { id: 's19', emoji: '😴' }, { id: 's20', emoji: '🤣' }, { id: 's21', emoji: '😢' },
  { id: 's22', emoji: '🌟' }, { id: 's23', emoji: '💰' }, { id: 's24', emoji: '📈' },
  { id: 's25', emoji: '💸' }, { id: 's26', emoji: '🏦' }, { id: 's27', emoji: '💼' },
  { id: 's28', emoji: '🏠' }, { id: 's29', emoji: '🚗' }, { id: 's30', emoji: '✈️' },
];

export const QUICK_REACTIONS = ['👍','❤️','😂','😮','😢','🔥'];

export function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}
