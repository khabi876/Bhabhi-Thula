/**
 * SettingsModal Component
 * Sound effects, speech commentary language, master volume, and motion preferences.
 */

import React, { useState } from 'react';
import { X, Volume2, VolumeX, MessageSquare, Sliders, Shield } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';
import { commentaryService } from '../services/commentary';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLegal: (type: 'privacy' | 'terms') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenLegal,
}) => {
  const [sfxMuted, setSfxMuted] = useState(soundEffects.getMuted());
  const [sfxVolume, setSfxVol] = useState(soundEffects.getVolume() * 100);
  const [commentaryEnabled, setCommentary] = useState(commentaryService.getEnabled());
  const [commentaryLang, setCommentaryLang] = useState<'URDU' | 'PUNJABI' | 'ENGLISH'>('URDU');

  if (!isOpen) return null;

  const handleToggleSfx = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    soundEffects.setMuted(next);
  };

  const handleVolumeChange = (val: number) => {
    setSfxVol(val);
    soundEffects.setVolume(val / 100);
  };

  const handleToggleCommentary = () => {
    const next = !commentaryEnabled;
    setCommentary(next);
    commentaryService.setEnabled(next);
  };

  const handleLangChange = (lang: 'URDU' | 'PUNJABI' | 'ENGLISH') => {
    setCommentaryLang(lang);
    commentaryService.setLanguage(lang);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#072416] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-[#04170E]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-amber-300 text-lg">
              Game Settings
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
        <div className="p-6 space-y-5 text-sm">
          {/* SFX Toggle & Volume */}
          <div className="p-4 rounded-2xl bg-black/30 border border-emerald-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sfxMuted ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                )}
                <div>
                  <span className="font-bold text-white block text-sm">
                    Sound Effects
                  </span>
                  <span className="text-[11px] text-emerald-300/60">
                    Card snaps, deals, and Thulla impact
                  </span>
                </div>
              </div>
              <button
                onClick={handleToggleSfx}
                className={`py-1 px-3 rounded-full text-xs font-semibold transition-all ${
                  !sfxMuted
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-zinc-700 text-zinc-300'
                }`}
              >
                {!sfxMuted ? 'ENABLED' : 'MUTED'}
              </button>
            </div>

            {!sfxMuted && (
              <div className="pt-2">
                <div className="flex justify-between text-xs text-emerald-300/70 mb-1">
                  <span>Volume</span>
                  <span>{Math.round(sfxVolume)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sfxVolume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Commentary & Language */}
          <div className="p-4 rounded-2xl bg-black/30 border border-emerald-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="font-bold text-white block text-sm">
                    Voice Commentary
                  </span>
                  <span className="text-[11px] text-emerald-300/60">
                    Playful match commentary speech & bubbles
                  </span>
                </div>
              </div>
              <button
                onClick={handleToggleCommentary}
                className={`py-1 px-3 rounded-full text-xs font-semibold transition-all ${
                  commentaryEnabled
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-700 text-zinc-300'
                }`}
              >
                {commentaryEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {commentaryEnabled && (
              <div className="pt-1">
                <span className="text-xs text-emerald-300/70 block mb-1.5">
                  Commentary Language Dialect
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['URDU', 'PUNJABI', 'ENGLISH'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLangChange(lang)}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        commentaryLang === lang
                          ? 'bg-amber-400 text-zinc-950 font-bold shadow'
                          : 'bg-emerald-950 border border-emerald-800 text-emerald-200 hover:bg-emerald-900'
                      }`}
                    >
                      {lang === 'URDU'
                        ? 'اردو (Urdu)'
                        : lang === 'PUNJABI'
                        ? 'پنجابی (Punjabi)'
                        : 'English'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Legal and Compliance Links */}
          <div className="pt-2 flex justify-center gap-4 text-xs text-emerald-300/70">
            <button
              onClick={() => onOpenLegal('privacy')}
              className="hover:text-amber-300 underline transition-colors"
            >
              Privacy Policy
            </button>
            <span>&bull;</span>
            <button
              onClick={() => onOpenLegal('terms')}
              className="hover:text-amber-300 underline transition-colors"
            >
              Terms of Service
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-amber-500/20 bg-[#04170E] flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
