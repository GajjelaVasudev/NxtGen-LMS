import React from 'react';
import { Star } from 'lucide-react';

type Props = {
  message: any;
  selected?: boolean;
  onClick?: (m: any) => void;
  onToggleStar?: (id: string, starred: boolean) => void;
};

export default function InboxMessageItem({ message, selected = false, onClick, onToggleStar }: Props) {
  const isUnread = !message.read;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick && onClick(message)}
      onKeyPress={(e) => { if (e.key === 'Enter') onClick && onClick(message); }}
      className={`px-4 py-3 cursor-pointer transition-all flex items-center justify-between ${selected ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-indigo-50'} `}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-3">
          {isUnread && <span className="bg-yellow-400 w-2 h-2 rounded-full" aria-hidden />}
        </div>
        <div className="min-w-0">
          <div className={`truncate ${isUnread ? 'text-base font-semibold text-indigo-600' : 'text-base font-semibold text-gray-900'}`}>{message.fromName}</div>
          <div className="truncate text-sm text-gray-700 mt-0.5">{message.subject}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-3">
        <div className="text-xs text-gray-400">{new Date(message.timestamp).toLocaleDateString()}</div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStar && onToggleStar(message.id, !message.starred); }}
          aria-label={message.starred ? 'Unstar' : 'Star'}
          className="p-1 rounded hover:bg-gray-100"
        >
          <Star className={message.starred ? 'text-yellow-400' : 'text-gray-400'} size={14} />
        </button>
      </div>
    </div>
  );
}
