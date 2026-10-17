import React from 'react';
import { X, Phone, MessageSquare, AlertCircle, ExternalLink } from 'lucide-react';

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CrisisModal({ isOpen, onClose }: CrisisModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close crisis resources"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-serif font-semibold text-slate-900">Urgent Support & Care</h3>
            <p className="text-xs text-slate-500">You are not alone. Immediate help is always available.</p>
          </div>
        </div>

        {/* Disclaimer Note */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 leading-relaxed mb-6">
          <strong>Important:</strong> Hope offers AI-guided wellbeing support and cognitive self-reflection, not emergency medical or crisis psychiatric care. If you are in immediate danger, please reach out to one of the trusted resources below.
        </div>

        {/* Resource List */}
        <div className="space-y-3 mb-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800">988 Suicide & Crisis Lifeline</div>
              <div className="text-xs text-slate-500">Free, confidential 24/7 support (US & Canada)</div>
            </div>
            <a
              href="tel:988"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              Call 988
            </a>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800">Crisis Text Line</div>
              <div className="text-xs text-slate-500">Text HOME to 741741 (US, UK, Canada)</div>
            </div>
            <a
              href="sms:741741?body=HOME"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-white text-xs font-medium hover:bg-slate-900 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Text 741741
            </a>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800">International Resources</div>
              <div className="text-xs text-slate-500">Find confidential helplines in your country</div>
            </div>
            <a
              href="https://findahelpline.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 font-medium"
            >
              <span>Find helpline</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-full border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Return to Hope
        </button>
      </div>
    </div>
  );
}
