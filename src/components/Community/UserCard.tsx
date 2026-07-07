import React from 'react';
export default function UserCard({ user, compact }: { user: any; compact?: boolean }) {
  return (
    <div onClick={() => window.dispatchEvent(new CustomEvent('openUserProfile', { detail: { id: user.user_id || user.id } }))} className={`cursor-pointer flex items-center gap-3 p-3 rounded-lg ${compact ? '' : 'bg-gray-900 border border-gray-800'}`}>
      <img src={user.avatar_url || '/public/default-avatar.png'} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium truncate">{user.full_name || user.name || 'Usuário'}</div>
          {user.verified && <div className="text-amber-400 text-xs">● Verificado</div>}
        </div>
        <div className="text-xs text-gray-400 truncate">{user.city && `${user.city}, `}{user.country}</div>
        <div className="text-xs text-gray-400">{user.profession || user.company || ''}</div>
      </div>
    </div>
  );
}
