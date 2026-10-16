/**
 * Commentary Service: Urdu & Punjabi Voice Lines and Speech Synthesizer
 * Supports SpeechSynthesis with intelligent voice fallback and graceful text-only mode.
 */

export interface CommentaryPhrase {
  id: string;
  urdu: string;
  punjabi: string;
  english: string;
  audioKey?: string;
}

export const COMMENTARY_PHRASES: Record<string, CommentaryPhrase> = {
  THULLA: {
    id: 'THULLA',
    urdu: 'اوئے! ٹھلا لگ گیا!',
    punjabi: 'اوئے، ٹھلا پے گیا!',
    english: 'Oye, Thulla lag gaya!',
  },
  ESCAPED: {
    id: 'ESCAPED',
    urdu: 'بچ گیا! شاندار چال!',
    punjabi: 'بچ گیا جی!',
    english: 'Bach gaya! Successfully escaped!',
  },
  ACE_OF_SPADES: {
    id: 'ACE_OF_SPADES',
    urdu: 'حکم کا اِکا پھینکو!',
    punjabi: 'حکم دا اِکا سٹو!',
    english: 'Hukam ka Ikka phenko!',
  },
  BHABHI: {
    id: 'BHABHI',
    urdu: 'بھابھی بن گیا! ہاہا!',
    punjabi: 'بھابھی بن گیا!',
    english: 'Bhabhi ban gaya!',
  },
  NICE_MOVE: {
    id: 'NICE_MOVE',
    urdu: 'واہ! کیا چال ہے!',
    punjabi: 'واہ، کمال دی چال!',
    english: 'Wah, kya chaal hai!',
  },
  YOUR_TURN: {
    id: 'YOUR_TURN',
    urdu: 'اب تمہاری باری ہے!',
    punjabi: 'ہن تہاڈی واری اے!',
    english: 'Ab tumhari baari hai!',
  },
  START_GAME: {
    id: 'START_GAME',
    urdu: 'چلو شاباش، کھیل شروع کرو!',
    punjabi: 'شاباش، کھیل شروع!',
    english: 'Game on! Play carefully!',
  },
};

class CommentaryService {
  private isEnabled: boolean = true;
  private volume: number = 0.8;
  private preferredLang: 'URDU' | 'PUNJABI' | 'ENGLISH' = 'URDU';
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadBestVoice();
      };
      this.loadBestVoice();
    }
  }

  private loadBestVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    // Look for ur-PK, ur, hi-IN, pa, or south asian voice
    const urduVoice = voices.find(
      (v) =>
        v.lang.startsWith('ur') ||
        v.lang === 'ur-PK' ||
        v.lang.startsWith('pa') ||
        v.lang === 'hi-IN'
    );

    this.selectedVoice = urduVoice || voices[0] || null;
    this.voicesLoaded = true;
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  setLanguage(lang: 'URDU' | 'PUNJABI' | 'ENGLISH') {
    this.preferredLang = lang;
  }

  speak(phraseKey: keyof typeof COMMENTARY_PHRASES) {
    if (!this.isEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const phrase = COMMENTARY_PHRASES[phraseKey];
    if (!phrase) return;

    try {
      window.speechSynthesis.cancel(); // Don't queue up long speech queues
      const textToSpeak =
        this.preferredLang === 'PUNJABI'
          ? phrase.punjabi
          : this.preferredLang === 'ENGLISH'
          ? phrase.english
          : phrase.urdu;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.volume = this.volume;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // Graceful fallback to text-only mode
      console.warn('Speech synthesis unavailable, using visual speech bubbles', e);
    }
  }
}

export const commentaryService = new CommentaryService();
