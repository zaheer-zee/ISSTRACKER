import { useState, useEffect, useRef } from 'react';
import { HfInference } from '@huggingface/inference';
import axios from 'axios';
import { MessageSquare, X, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Chatbot({ dashboardData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('chat_history');
    if (saved) {
      setMessages(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat_history', JSON.stringify(messages.slice(-30)));
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('chat_history');
    toast.success('Chat cleared');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { text: input, isUser: true };
    setMessages((prev) => [...prev, userMessage].slice(-30));
    setInput('');
    setIsTyping(true);

    try {
      // Format Dashboard Data Context
      const context = `You are a helpful dashboard AI assistant. You must ONLY answer questions based on the following dashboard data. DO NOT use outside knowledge. If the answer is not in the data, say "I don't have that information in my current dashboard data."
      
      Dashboard Data:
      ISS Location: Latitude ${dashboardData.iss?.lat?.toFixed(4)}, Longitude ${dashboardData.iss?.lng?.toFixed(4)}
      ISS Speed: ${dashboardData.speed > 0 ? dashboardData.speed.toFixed(2) : 'Unknown'} km/h
      Nearest Location: ${dashboardData.locationName || 'Unknown'}
      People in Space: ${dashboardData.people?.length || 0} (${dashboardData.people?.map(p => p.name).join(', ') || 'None'})
      
      Latest News Articles (${dashboardData.news?.length || 0} total):
      ${dashboardData.news?.map((n, i) => `${i+1}. Title: ${n.title} (Source: ${n.source?.name}) - ${n.description}`).join('\n')}
      `;

      const token = import.meta.env.VITE_AI_TOKEN;
      if (!token) throw new Error("Missing AI Token");

      const hf = new HfInference(token);

      const out = await hf.chatCompletion({
        model: "Qwen/Qwen2.5-72B-Instruct",
        messages: [
          { role: "system", content: context },
          { role: "user", content: userMessage.text }
        ],
        max_tokens: 150
      });

      const botMessage = { 
        text: out.choices[0]?.message?.content || "I couldn't generate a response.", 
        isUser: false 
      };
      
      setMessages((prev) => [...prev, botMessage].slice(-30));

    } catch (error) {
      console.error(error);
      const errorMsg = { text: "Error connecting to AI service. Please try again later.", isUser: false };
      setMessages((prev) => [...prev, errorMsg].slice(-30));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 transition-transform ${isOpen ? 'scale-0' : 'scale-100'} z-50`}
      >
        <MessageSquare size={28} />
      </button>

      <div className={`fixed bottom-6 right-6 w-80 md:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700 transition-all origin-bottom-right z-50 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'} overflow-hidden`} style={{ height: '500px', maxHeight: '80vh' }}>
        
        {/* Header */}
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} />
            <h3 className="font-bold">Dashboard AI</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={clearChat} title="Clear Chat" className="p-1 hover:bg-blue-700 rounded transition-colors">
              <Trash2 size={18} />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-blue-700 rounded transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
          {messages.length === 0 && (
            <div className="text-center text-slate-500 dark:text-slate-400 mt-10 text-sm">
              Ask me anything about the ISS or the latest news!
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                msg.isUser 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-bl-none shadow-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-3 rounded-2xl rounded-bl-none shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about ISS or News..."
              className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
            />
            <button 
              type="submit"
              disabled={isTyping || !input.trim()}
              className="absolute right-2 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
