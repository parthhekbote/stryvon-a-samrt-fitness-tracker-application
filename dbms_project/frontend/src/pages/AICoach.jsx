import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

function renderCellContent(children) {
  if (typeof children === 'string') {
    const parts = children.split(/(<br\s*\/?>|\n)/gi);
    return parts.map((part, i) => {
      if (part.toLowerCase().startsWith('<br') || part === '\n') {
        return <br key={i} />;
      }
      return part;
    });
  }
  if (Array.isArray(children)) {
    return children.map((child, idx) => (
      <React.Fragment key={idx}>
        {renderCellContent(child)}
      </React.Fragment>
    ));
  }
  return children;
}

const markdownComponents = {
  h1: ({ children }) => <h1 className="font-display text-lg font-bold text-[#D4FF00] uppercase tracking-wider mt-3 mb-1.5 border-b border-[#474747]/40 pb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="font-display text-base font-bold text-[#D4FF00] uppercase tracking-wider mt-3 mb-1.5">{children}</h2>,
  h3: ({ children }) => <h3 className="font-display text-base font-bold text-[#D4FF00] uppercase tracking-wider mt-2.5 mb-1">{children}</h3>,
  h4: ({ children }) => <h4 className="font-display text-sm font-bold text-white uppercase tracking-wide mt-2 mb-1">{children}</h4>,
  p: ({ children }) => <p className="text-xs sm:text-sm text-[#E5E5E5] leading-relaxed mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-[#D4FF00]">{children}</strong>,
  b: ({ children }) => <b className="font-bold text-[#D4FF00]">{children}</b>,
  em: ({ children }) => <em className="italic text-[#E5E5E5]/90">{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-xs sm:text-sm text-[#E5E5E5]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-xs sm:text-sm text-[#E5E5E5]">{children}</ol>,
  li: ({ children }) => <li className="ml-2 mb-1 text-xs sm:text-sm text-[#E5E5E5] leading-relaxed">{children}</li>,
  code: ({ inline, children }) => inline 
    ? <code className="bg-[#0A0A0A] text-[#D4FF00] font-mono text-xs px-1.5 py-0.5 rounded border border-[#474747]/40">{children}</code>
    : <code className="block bg-[#0A0A0A] text-[#E5E5E5] font-mono text-xs p-3 rounded-xl border border-[#474747]/60 overflow-x-auto my-2">{children}</code>,
  pre: ({ children }) => <pre className="bg-[#0A0A0A] border border-[#474747]/60 p-3 rounded-xl overflow-x-auto my-2 font-mono text-xs text-[#E5E5E5]">{children}</pre>,
  table: ({ children }) => (
    <div className="chat-table-wrapper">
      <table className="chat-markdown-table">{children}</table>
    </div>
  ),
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{renderCellContent(children)}</td>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-[#D4FF00] pl-3 py-1 my-2 italic text-[#E5E5E5]/80 bg-[#0A0A0A]/50 rounded-r">{children}</blockquote>
};

export default function AICoach({ apiUrl, token, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    { text: 'Create a fat loss workout plan', label: 'Fat Loss Workout' },
    { text: 'Suggest a high protein Indian diet', label: 'Indian Protein Diet' },
    { text: 'Analyze my progress', label: 'Progress Review' },
    { text: 'How many calories should I eat?', label: 'Calorie Targets' }
  ];

  const fetchChatHistory = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${apiUrl}/ai/history`, { headers });
      const data = await response.json();
      if (response.ok) {
        const formatted = [];
        (data.history || []).forEach(chat => {
          formatted.push({ sender: 'user', text: chat.prompt });
          formatted.push({ sender: 'ai', text: chat.ai_response });
        });
        setMessages(formatted);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const promptText = textToSend || input;
    if (!promptText.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: promptText }]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: promptText })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, { sender: 'ai', text: data.response }]);
      } else {
        throw new Error(data.message || 'AI coach is offline.');
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: `Failed to connect with AI coach: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-[calc(100vh-165px)] md:h-[82vh] flex flex-col bg-[#1E1E1E] border border-[#474747]/40 rounded-3xl overflow-hidden shadow-2xl text-white"
    >
      {/* Coach Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#474747]/40 bg-[#0A0A0A] shrink-0">
        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-[#D4FF00] flex items-center justify-center text-black shadow-md shrink-0">
          <Bot size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2 uppercase tracking-wide truncate">
            STRYVON AI COACH
            <Sparkles size={16} className="text-[#D4FF00] animate-pulse shrink-0" />
          </h3>
          <span className="text-[9px] sm:text-[10px] font-display text-[#D4FF00] font-bold tracking-widest uppercase block truncate">Intelligent Personal Trainer & Dietician</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-4 scrollbar-thin bg-[#1E1E1E]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
            <div className="p-4 bg-[#0A0A0A] border border-[#474747]/40 rounded-full text-[#D4FF00]">
              <MessageSquare size={36} />
            </div>
            <div>
              <h4 className="font-display text-lg sm:text-xl font-bold text-white uppercase tracking-wide">Start Your AI Fitness Session</h4>
              <p className="text-xs text-[#E5E5E5]/60 mt-1.5 leading-relaxed">
                Speak directly with your STRYVON Coach! Get custom workouts, macro breakdowns, or progress reviews.
              </p>
            </div>
            {/* Quick Prompts */}
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.text)}
                  className="p-3 text-[11px] font-display font-bold uppercase tracking-wider text-[#E5E5E5] hover:text-[#D4FF00] bg-[#0A0A0A] border border-[#474747]/40 hover:border-[#D4FF00]/50 rounded-2xl transition-all text-center leading-tight cursor-pointer min-h-[44px] flex items-center justify-center"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex gap-2.5 sm:gap-3 max-w-[92%] sm:max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full shrink-0 flex items-center justify-center font-bold ${msg.sender === 'user' ? 'bg-white text-black' : 'bg-[#D4FF00] text-black'}`}>
                  {msg.sender === 'user' ? <User size={13} /> : <Bot size={13} />}
                </div>

                {/* Message Bubble */}
                <div className={`p-3.5 sm:p-4 rounded-3xl text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-[#D4FF00] text-black font-semibold rounded-tr-none shadow-md' 
                    : 'bg-[#0A0A0A] border border-[#474747]/50 text-[#E5E5E5] rounded-tl-none font-medium'
                }`}>
                  {msg.sender === 'user' ? (
                    <p className="whitespace-pre-line text-xs sm:text-sm font-semibold text-black leading-relaxed">
                      {msg.text}
                    </p>
                  ) : (
                    <div className="leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-2.5 sm:gap-3 mr-auto max-w-[92%] sm:max-w-[85%]">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#D4FF00] flex items-center justify-center text-black shrink-0">
                  <Bot size={13} />
                </div>
                <div className="bg-[#0A0A0A] border border-[#474747]/50 p-3.5 sm:p-4 rounded-3xl rounded-tl-none flex items-center gap-1.5">
                  <div className="h-2 w-2 bg-[#D4FF00] rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-[#D4FF00] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 bg-[#D4FF00] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Form */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
        className="p-3 sm:p-4 border-t border-[#474747]/40 bg-[#0A0A0A] flex gap-2.5 sm:gap-3 items-center shrink-0"
      >
        <input
          type="text"
          disabled={loading}
          placeholder="Ask STRYVON coach..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-[#1E1E1E] border border-[#474747] rounded-2xl py-2.5 sm:py-3 px-4 sm:px-5 text-xs sm:text-sm focus:outline-none focus:border-[#D4FF00] text-white placeholder:text-[#474747] min-h-[44px]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 bg-[#D4FF00] hover:bg-[#b8de00] text-black rounded-2xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
        >
          <Send size={18} />
        </button>
      </form>
    </motion.div>
  );
}
