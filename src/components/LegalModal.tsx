/**
 * LegalModal Component
 * Provides genuine, transparent Privacy Policy and Terms & Conditions.
 */

import React from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  type: 'privacy' | 'terms';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, type, onClose }) => {
  if (!isOpen) return null;

  const isPrivacy = type === 'privacy';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-[#072416] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-[#04170E]">
          <div className="flex items-center gap-2">
            {isPrivacy ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <FileText className="w-5 h-5 text-amber-400" />
            )}
            <h3 className="font-serif font-bold text-amber-300 text-lg">
              {isPrivacy ? 'Privacy Policy' : 'Terms and Conditions'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300/70 hover:text-white hover:bg-emerald-900/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
          {isPrivacy ? (
            <>
              <p className="font-semibold text-white">
                Effective Date: October 15, 2026
              </p>
              <p>
                <strong>Bhabhi Thulla Multiplayer</strong> respects your privacy and is committed to protecting your personal data. This Privacy Policy describes how we handle information in connection with our web application.
              </p>
              <h4 className="font-bold text-amber-300 text-sm pt-2">
                1. Information We Collect
              </h4>
              <p>
                We only collect minimal technical data necessary to operate multiplayer card games:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Player display names (temporary, chosen by the player)</li>
                <li>Session tokens for game state re-synchronization</li>
                <li>In-game action logs and match statistics</li>
              </ul>
              <h4 className="font-bold text-amber-300 text-sm pt-2">
                2. No Tracking or Selling of Personal Data
              </h4>
              <p>
                We do not sell, rent, or trade your personal information to third parties. We do not use third-party behavioral advertising or tracking pixels.
              </p>
              <h4 className="font-bold text-amber-300 text-sm pt-2">
                3. Security
              </h4>
              <p>
                Game state is validated server-authoritatively to prevent unauthorized manipulation. Private card hands are isolated so opponents cannot inspect your cards.
              </p>
              <h4 className="font-bold text-amber-300 text-sm pt-2">
                4. Contact Information
              </h4>
              <p>
                For inquiries or questions regarding this policy, please reach out to: <span className="font-mono text-amber-200">[Entity/Operator Contact: malikkhubaib702@gmail.com]</span>.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-white">
                Effective Date: October 15, 2026
              </p>
              <h4 className="font-bold text-amber-300 text-sm">
                1. Acceptance of Terms
              </h4>
              <p>
                By accessing or playing Bhabhi Thulla, you agree to comply with and be bound by these Terms and Conditions.
              </p>
              <h4 className="font-bold text-amber-300 text-sm pt-2">
                2. Non-Gambling & Entertainment Only
              </h4>
              <p>
                This application is strictly for digital recreation, cultural appreciation, and casual entertainment. <strong>Real-money gambling, betting, or wagering of any kind is strictly prohibited</strong>.
              </p>
              <h4 className="font-bold text-amber-300 text-sm pt-2">
                3. Fair Play and Community Standards
              </h4>
              <p>
                Players agree not to exploit software bugs, execute denial-of-service attacks, or use offensive, abusive, or harmful usernames.
              </p>
              <h4 className="font-bold text-amber-300 text-sm pt-2">
                4. Disclaimer of Warranties
              </h4>
              <p>
                The game is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of uninterrupted availability.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-amber-500/20 bg-[#04170E] flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
