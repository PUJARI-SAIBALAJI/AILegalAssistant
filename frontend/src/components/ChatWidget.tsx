import React, { useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5002';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: `m-${Date.now()}`,
      role: 'assistant',
      content: "Hello! I'm your AI legal assistant. How can I help you today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const historyPayload = useMemo(
    () =>
      messages.map(m => ({ role: m.role, content: m.content })).slice(-10),
    [messages]
  );

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { id: `m-${Date.now()}`, role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: historyPayload }),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch (_) {
        // ignore JSON parse errors
      }
      if (!res.ok) {
        const serverMsg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
        throw new Error(serverMsg);
      }
      const reply = (data?.reply || "Sorry, I couldn't generate a response.").toString();
      setMessages(prev => [...prev, { id: `m-${Date.now()}-a`, role: 'assistant', content: reply }]);
    } catch (e: any) {
      const errMsg = e?.message ? `Error: ${e.message}` : 'Error contacting the assistant. Please try again.';
      setMessages(prev => [...prev, { id: `m-${Date.now()}-e`, role: 'assistant', content: errMsg }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Open chat"
          type="button"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="w-[360px] max-w-[90vw] h-[520px] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
            <div className="font-semibold">LegalAI Assistant</div>
            <button
              className="p-1 rounded hover:bg-blue-500"
              aria-label="Close chat"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-auto px-3 py-3 space-y-3 bg-gray-50">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg whitespace-pre-wrap break-words ${
                    m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-sm text-gray-500">Assistant is typing…</div>
            )}
          </div>

          <div className="p-3 border-t bg-white flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about cases, contracts, forms…"
              className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}