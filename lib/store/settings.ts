/**
 * Settings Store
 *
 * Tracks UI selections and non-sensitive preferences. Post-BYOK-purge
 * (Phase A Step 3), provider API keys live in serverConfig only — this
 * store never touches them. Provider availability is surfaced via
 * `providerStatus` from `lib/config/server.ts` on server-rendered pages.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProviderId } from '@/lib/ai/providers';
import type { TTSProviderId, ASRProviderId } from '@/lib/audio/types';
import { ASR_PROVIDERS, DEFAULT_TTS_VOICES, TTS_PROVIDERS } from '@/lib/audio/constants';
import { PDF_PROVIDERS } from '@/lib/pdf/constants';
import type { PDFProviderId } from '@/lib/pdf/types';
import type { ImageProviderId, VideoProviderId } from '@/lib/media/types';
import { IMAGE_PROVIDERS } from '@/lib/media/image-providers';
import { VIDEO_PROVIDERS } from '@/lib/media/video-providers';
import { WEB_SEARCH_PROVIDERS } from '@/lib/web-search/constants';
import type { WebSearchProviderId } from '@/lib/web-search/types';

/** Available playback speed tiers */
export const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface SettingsState {
  // LLM selection
  providerId: ProviderId;
  modelId: string;

  // Legacy TTS model string (back-compat)
  ttsModel: string;

  // Audio selection
  ttsProviderId: TTSProviderId;
  ttsVoice: string;
  ttsSpeed: number;
  asrProviderId: ASRProviderId;
  asrLanguage: string;

  // PDF selection
  pdfProviderId: PDFProviderId;

  // Image generation selection
  imageProviderId: ImageProviderId;
  imageModelId: string;

  // Video generation selection
  videoProviderId: VideoProviderId;
  videoModelId: string;

  // Web search selection
  webSearchProviderId: WebSearchProviderId;

  // Feature toggles
  imageGenerationEnabled: boolean;
  videoGenerationEnabled: boolean;
  ttsEnabled: boolean;
  asrEnabled: boolean;

  // Playback controls
  ttsMuted: boolean;
  ttsVolume: number;
  autoPlayLecture: boolean;
  playbackSpeed: PlaybackSpeed;

  // Agent settings
  selectedAgentIds: string[];
  maxTurns: string;
  agentMode: 'preset' | 'auto';
  autoAgentCount: number;

  // Layout
  sidebarCollapsed: boolean;
  chatAreaCollapsed: boolean;
  chatAreaWidth: number;

  // Actions
  setModel: (providerId: ProviderId, modelId: string) => void;
  setTtsModel: (model: string) => void;
  setTTSMuted: (muted: boolean) => void;
  setTTSVolume: (volume: number) => void;
  setAutoPlayLecture: (autoPlay: boolean) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setSelectedAgentIds: (ids: string[]) => void;
  setMaxTurns: (turns: string) => void;
  setAgentMode: (mode: 'preset' | 'auto') => void;
  setAutoAgentCount: (count: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setChatAreaCollapsed: (collapsed: boolean) => void;
  setChatAreaWidth: (width: number) => void;
  setTTSProvider: (providerId: TTSProviderId) => void;
  setTTSVoice: (voice: string) => void;
  setTTSSpeed: (speed: number) => void;
  setASRProvider: (providerId: ASRProviderId) => void;
  setASRLanguage: (language: string) => void;
  setTTSEnabled: (enabled: boolean) => void;
  setASREnabled: (enabled: boolean) => void;
  setPDFProvider: (providerId: PDFProviderId) => void;
  setImageProvider: (providerId: ImageProviderId) => void;
  setImageModelId: (modelId: string) => void;
  setVideoProvider: (providerId: VideoProviderId) => void;
  setVideoModelId: (modelId: string) => void;
  setImageGenerationEnabled: (enabled: boolean) => void;
  setVideoGenerationEnabled: (enabled: boolean) => void;
  setWebSearchProvider: (providerId: WebSearchProviderId) => void;
}

function hasProviderId(providerMap: Record<string, unknown>, providerId?: string): boolean {
  return typeof providerId === 'string' && providerId in providerMap;
}

function ensureValidProviderSelections(state: Partial<SettingsState>): void {
  if (!hasProviderId(PDF_PROVIDERS, state.pdfProviderId)) {
    state.pdfProviderId = 'unpdf' as PDFProviderId;
  }
  if (!hasProviderId(WEB_SEARCH_PROVIDERS, state.webSearchProviderId)) {
    state.webSearchProviderId = 'tavily' as WebSearchProviderId;
  }
  if (!hasProviderId(IMAGE_PROVIDERS, state.imageProviderId)) {
    state.imageProviderId = 'seedream' as ImageProviderId;
  }
  if (!hasProviderId(VIDEO_PROVIDERS, state.videoProviderId)) {
    state.videoProviderId = 'seedance' as VideoProviderId;
  }
  if (!hasProviderId(TTS_PROVIDERS, state.ttsProviderId)) {
    state.ttsProviderId = 'browser-native-tts' as TTSProviderId;
  }
  if (!hasProviderId(ASR_PROVIDERS, state.asrProviderId)) {
    state.asrProviderId = 'browser-native' as ASRProviderId;
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providerId: 'openai',
      modelId: '',
      ttsModel: 'openai-tts',

      ttsProviderId: 'browser-native-tts' as TTSProviderId,
      ttsVoice: 'default',
      ttsSpeed: 1.0,
      asrProviderId: 'browser-native' as ASRProviderId,
      asrLanguage: 'zh',

      pdfProviderId: 'unpdf' as PDFProviderId,

      imageProviderId: 'seedream' as ImageProviderId,
      imageModelId: 'doubao-seedream-5-0-260128',

      videoProviderId: 'seedance' as VideoProviderId,
      videoModelId: 'doubao-seedance-1-5-pro-251215',

      webSearchProviderId: 'tavily' as WebSearchProviderId,

      imageGenerationEnabled: false,
      videoGenerationEnabled: false,
      ttsEnabled: true,
      asrEnabled: true,

      ttsMuted: false,
      ttsVolume: 1,
      autoPlayLecture: false,
      playbackSpeed: 1,

      selectedAgentIds: ['default-1', 'default-2', 'default-3'],
      maxTurns: '10',
      agentMode: 'auto',
      autoAgentCount: 3,

      sidebarCollapsed: true,
      chatAreaCollapsed: true,
      chatAreaWidth: 320,

      setModel: (providerId, modelId) => set({ providerId, modelId }),
      setTtsModel: (model) => set({ ttsModel: model }),
      setTTSMuted: (muted) => set({ ttsMuted: muted }),
      setTTSVolume: (volume) => set({ ttsVolume: Math.max(0, Math.min(1, volume)) }),
      setAutoPlayLecture: (autoPlay) => set({ autoPlayLecture: autoPlay }),
      setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
      setSelectedAgentIds: (ids) => set({ selectedAgentIds: ids }),
      setMaxTurns: (turns) => set({ maxTurns: turns }),
      setAgentMode: (mode) => set({ agentMode: mode }),
      setAutoAgentCount: (count) => set({ autoAgentCount: count }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setChatAreaCollapsed: (collapsed) => set({ chatAreaCollapsed: collapsed }),
      setChatAreaWidth: (width) => set({ chatAreaWidth: width }),

      setTTSProvider: (providerId) =>
        set((state) => {
          const shouldUpdateVoice = state.ttsProviderId !== providerId;
          return {
            ttsProviderId: providerId,
            ...(shouldUpdateVoice && { ttsVoice: DEFAULT_TTS_VOICES[providerId] }),
          };
        }),
      setTTSVoice: (voice) => set({ ttsVoice: voice }),
      setTTSSpeed: (speed) => set({ ttsSpeed: speed }),

      setASRProvider: (providerId) =>
        set((state) => {
          const supportedLanguages = ASR_PROVIDERS[providerId]?.supportedLanguages || [];
          const isLanguageValid = supportedLanguages.includes(state.asrLanguage);
          return {
            asrProviderId: providerId,
            ...(isLanguageValid ? {} : { asrLanguage: supportedLanguages[0] || 'auto' }),
          };
        }),
      setASRLanguage: (language) => set({ asrLanguage: language }),

      setTTSEnabled: (enabled) => set({ ttsEnabled: enabled }),
      setASREnabled: (enabled) => set({ asrEnabled: enabled }),

      setPDFProvider: (providerId) => set({ pdfProviderId: providerId }),

      setImageProvider: (providerId) => set({ imageProviderId: providerId }),
      setImageModelId: (modelId) => set({ imageModelId: modelId }),
      setImageGenerationEnabled: (enabled) => set({ imageGenerationEnabled: enabled }),

      setVideoProvider: (providerId) => set({ videoProviderId: providerId }),
      setVideoModelId: (modelId) => set({ videoModelId: modelId }),
      setVideoGenerationEnabled: (enabled) => set({ videoGenerationEnabled: enabled }),

      setWebSearchProvider: (providerId) => set({ webSearchProviderId: providerId }),
    }),
    {
      name: 'settings-storage',
      version: 3,
      // v2 → v3: strip BYOK provider config slices (Phase A Step 3).
      // Provider keys now live in serverConfig only.
      migrate: (persistedState: unknown) => {
        const state = persistedState as Record<string, unknown>;
        delete state.providersConfig;
        delete state.ttsProvidersConfig;
        delete state.asrProvidersConfig;
        delete state.pdfProvidersConfig;
        delete state.imageProvidersConfig;
        delete state.videoProvidersConfig;
        delete state.webSearchProvidersConfig;
        delete state.autoConfigApplied;
        delete state.deepResearchProviderId;
        delete state.deepResearchProvidersConfig;
        ensureValidProviderSelections(state as Partial<SettingsState>);
        return state;
      },
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as object) };
        ensureValidProviderSelections(merged as Partial<SettingsState>);
        return merged as SettingsState;
      },
    },
  ),
);
