'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  USER_NAME_KEY, THEME_KEY, DEFAULT_USER_NAME,
  API_PROVIDER_KEY, API_KEY_KEY, API_MODEL_KEY, API_ENDPOINT_KEY,
  ONBOARDING_KEY,
} from '@/lib/constants'

export type Theme = 'light' | 'dark' | 'system'
export type ApiProvider = 'anthropic' | 'openai' | 'alibaba' | 'custom'

interface AppState {
  userName: string
  theme: Theme
  onboardingDone: boolean
  apiProvider: ApiProvider
  apiKey: string
  apiModel: string
  apiEndpoint: string

  setUserName: (name: string) => void
  setTheme: (t: Theme) => void
  setOnboardingDone: (v: boolean) => void
  setApiConfig: (cfg: { provider?: ApiProvider; key?: string; model?: string; endpoint?: string }) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userName: DEFAULT_USER_NAME,
      theme: 'system',
      onboardingDone: false,
      apiProvider: 'alibaba',
      apiKey: '',
      apiModel: 'qwen-plus',
      apiEndpoint: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',

      setUserName: (name) => set({ userName: name }),
      setTheme: (theme) => set({ theme }),
      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
      setApiConfig: (cfg) =>
        set((s) => ({
          apiProvider: cfg.provider ?? s.apiProvider,
          apiKey:      cfg.key      ?? s.apiKey,
          apiModel:    cfg.model    ?? s.apiModel,
          apiEndpoint: cfg.endpoint ?? s.apiEndpoint,
        })),
    }),
    {
      name: 'soobin-app-store',
    }
  )
)
