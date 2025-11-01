import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Message, MessageType } from './Message';
import { useSession } from '../contexts/SessionContext';
import { ApiService } from '../services/apiService';
import { videoStreamService } from '../services/videoStreamService';

const initialMessages: MessageType[] = [
  {
    id: '2',
    sender: 'scientist',
    content: 'Begin task: Pick up the red cube.',
    timestamp: new Date(Date.now() - 60000),
  },
];

export function MessageInterface() {
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const { session } = useSession();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const newMessage: MessageType = {
      id: Date.now().toString(),
      sender: 'scientist',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');

    // Send to backend if session exists
    if (session) {
      try {
        const frameId = videoStreamService.getCurrentFrameId();
        await ApiService.addMessage(
          session.id,
          'scientist',
          newMessage.content,
          frameId || undefined
        );

        // Notify video stream service
        videoStreamService.sendMessage(session.id, {
          sender: 'scientist',
          content: newMessage.content,
        });
      } catch (error) {
        console.error('Failed to send message to backend:', error);
      }
    }

    // Simulate robot response
    setTimeout(async () => {
      const robotResponse: MessageType = {
        id: (Date.now() + 1).toString(),
        sender: 'robot',
        content: 'Command received. Processing...',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, robotResponse]);

      // Send robot response to backend if session exists
      if (session) {
        try {
          const frameId = videoStreamService.getCurrentFrameId();
          await ApiService.addMessage(
            session.id,
            'robot',
            robotResponse.content,
            frameId || undefined
          );
        } catch (error) {
          console.error('Failed to send robot response to backend:', error);
        }
      }
    }, 1000);
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-t">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div ref={scrollRef} className="space-y-4 max-w-6xl mx-auto">
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t bg-gray-50 p-3">
        <div className="max-w-6xl mx-auto flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a command to the robot..."
            className="resize-none min-h-[44px] max-h-[120px]"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="self-end px-4"
            size="default"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
