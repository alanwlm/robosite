import { Avatar, AvatarFallback } from './ui/avatar';
import { User, Bot } from 'lucide-react';

export interface MessageType {
  id: string;
  sender: 'scientist' | 'robot';
  content: string;
  timestamp: Date;
}

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isScientist = message.sender === 'scientist';
  
  return (
    <div className={`flex gap-3 ${isScientist ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className={isScientist ? 'bg-blue-600' : 'bg-gray-700'}>
          {isScientist ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col ${isScientist ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div
          className={`px-4 py-2 rounded-2xl ${
            isScientist
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-gray-200 text-gray-900 rounded-tl-sm'
          }`}
        >
          <p>{message.content}</p>
        </div>
        <span className="text-xs text-gray-500 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
