/**
 * HowToPlayModal Component
 * Cultural and rules guide for Bhabhi Thulla (Get Away) in English and Urdu.
 */

import React from 'react';
import { X, BookOpen, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#072416] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-[#04170E]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-serif font-bold text-amber-300 text-lg">
                Rules of Bhabhi Thulla (بھابھی ٹھلا)
              </h3>
              <p className="text-[11px] text-emerald-300/70">
                Traditional Pakistani Card Game &bull; Also known as Get Away
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300/70 hover:text-white hover:bg-emerald-900/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 text-sm">
          {/* Objective Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30">
            <h4 className="font-bold text-amber-300 flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4" /> Core Objective (مقصد)
            </h4>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 leading-relaxed">
              In Bhabhi Thulla, you <strong>do not want to collect cards</strong>. Your goal is to get rid of all your cards and "get away" (<strong>بچ جانا</strong>). The last remaining player with cards in their hand when everyone else has escaped is declared the <strong>BHABHI</strong>!
            </p>
          </div>

          {/* Rule 1: First Trick */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-800 text-amber-300 text-xs flex items-center justify-center font-bold">1</span>
              The First Trick: Ace of Spades (حکم کا اِکا)
            </h4>
            <p className="text-xs text-emerald-200/80 pl-7 leading-relaxed">
              Whoever is dealt the <strong>Ace of Spades (♠A)</strong> must lead the first trick by playing it onto the table. Everyone else must follow by playing a spade if they have one.
            </p>
          </div>

          {/* Rule 2: Following Suit */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-800 text-amber-300 text-xs flex items-center justify-center font-bold">2</span>
              Following Suit (رنگ کی پابندی)
            </h4>
            <p className="text-xs text-emerald-200/80 pl-7 leading-relaxed">
              When a player leads with any suit (e.g. Hearts ♥), all subsequent players <strong>must play a card of that same suit</strong> if they hold one in their hand.
            </p>
          </div>

          {/* Rule 3: The Thulla */}
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-1.5">
            <h4 className="font-bold text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> The Signature "THULLA" (ٹھلا لگنا)
            </h4>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              If you <strong>do NOT have any cards</strong> of the lead suit, you are free to throw any card from another suit. <strong>This is a THULLA!</strong>
            </p>
            <ul className="text-xs text-emerald-200/80 list-disc list-inside space-y-1 pt-1">
              <li>The player who played the <strong>HIGHEST card of the lead suit</strong> takes the penalty and collects all cards on the table!</li>
              <li>The player who threw the Thulla gets to lead the next trick.</li>
              <li>Tip: When giving a Thulla, throw your heaviest unwanted cards (e.g. Kings or Aces of other suits) onto your opponent!</li>
            </ul>
          </div>

          {/* Rule 4: Clean Trick */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-800 text-amber-300 text-xs flex items-center justify-center font-bold">4</span>
              Clean Trick (صاف ہاتھ)
            </h4>
            <p className="text-xs text-emerald-200/80 pl-7 leading-relaxed">
              If every eligible player follows suit, no Thulla happens. The player with the highest card of the lead suit wins the trick safely. Those cards are discarded into the waste pile, and the winner leads the next trick.
            </p>
          </div>

          {/* Rule 5: Escaping */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-800 text-amber-300 text-xs flex items-center justify-center font-bold">5</span>
              Escaping & The Bhabhi
            </h4>
            <p className="text-xs text-emerald-200/80 pl-7 leading-relaxed">
              When your hand becomes completely empty, you have escaped! You are safe and ranked in your escape order (1st, 2nd, 3rd). Play continues until only one unfortunate player is left holding cards—they become the <strong>Bhabhi</strong>!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-amber-500/20 bg-[#04170E] flex justify-end">
          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all"
          >
            Samajh Gaya (Got It!)
          </button>
        </div>
      </div>
    </div>
  );
};
