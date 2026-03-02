'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowUpRight, X, Send, Loader2 } from 'lucide-react';
import emailjs from '@emailjs/browser';

export default function ContactSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;

    setStatus('loading');

    try {
      await emailjs.sendForm(
        'YOUR_SERVICE_ID',   // ganti ini
        'YOUR_TEMPLATE_ID',  // ganti ini
        formRef.current,
        'YOUR_PUBLIC_KEY'    // ganti ini
      );
      setStatus('success');
      formRef.current.reset();
      setTimeout(() => {
        setIsOpen(false);
        setStatus('idle');
      }, 2000);
    } catch {
      setStatus('error');
    }
  };

  return (
    <section id="contact" className="scroll-mt-24 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative border border-white/10 p-8 sm:p-16 text-center space-y-10 hover:border-white/30 transition-all duration-500"
      >
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/20" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/20" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/20" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/20" />

        <div className="space-y-6">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight font-outfit">
            LET'S WORK <span className="text-white/30">TOGETHER</span>
          </h2>
          <p className="text-white/40 max-w-md mx-auto">
            Have a project in mind? Let's discuss how we can bring your ideas to life.
          </p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-4 px-10 py-5 font-mono text-sm group transition-all duration-300"
          style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.5)' }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = 'rgba(255,102,0,0.85)';
            el.style.borderColor = 'rgba(255,128,0,0.9)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = 'rgba(0,0,0,0.5)';
            el.style.borderColor = 'rgba(255,255,255,0.3)';
          }}
        >
          <Mail className="w-4 h-4" />
          GET IN TOUCH
          <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
            >
              <div
                className="relative p-8 space-y-6"
                style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/30" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/30" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/30" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/30" />

                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-sm tracking-widest text-white/60">SEND MESSAGE</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-mono text-xs text-white/40 tracking-widest">NAME</label>
                    <input
                      type="text"
                      name="from_name"
                      required
                      placeholder="Your name"
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/30 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-xs text-white/40 tracking-widest">EMAIL</label>
                    <input
                      type="email"
                      name="from_email"
                      required
                      placeholder="your@email.com"
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/30 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-xs text-white/40 tracking-widest">MESSAGE</label>
                    <textarea
                      name="message"
                      required
                      rows={4}
                      placeholder="Tell me about your project..."
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/30 transition-colors resize-none"
                    />
                  </div>

                  {/* Status messages */}
                  {status === 'success' && (
                    <p className="font-mono text-xs text-green-400 tracking-widest">
                      ✓ MESSAGE SENT SUCCESSFULLY
                    </p>
                  )}
                  {status === 'error' && (
                    <p className="font-mono text-xs text-red-400 tracking-widest">
                      ✗ FAILED TO SEND. TRY AGAIN.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading' || status === 'success'}
                    className="w-full flex items-center justify-center gap-3 py-4 font-mono text-sm tracking-widest transition-all duration-300 disabled:opacity-50"
                    style={{ background: 'rgba(255,102,0,0.85)', border: '1px solid rgba(255,128,0,0.9)' }}
                  >
                    {status === 'loading' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> SENDING...</>
                    ) : (
                      <><Send className="w-4 h-4" /> SEND MESSAGE</>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
