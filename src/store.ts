import { create } from 'zustand';

interface AppState {
  fileUrl: string | null;
  fileName: string | null;
  blobMap: Record<string, string>;
  scale: number;
  lightIntensity: number;
  shadowBaking: boolean;
  resolutionScale: number;
  qualityPreset: 'low' | 'medium' | 'high';
  locateModelTrigger: number;
  collisionEnabled: boolean;
  fpsLimit: number; // 0 means infinity
  ambientOcclusion: boolean;
  aoIntensity: number;
  aoEdgeOutline: boolean; // Default false to remove the depth outline artifact
  aoMode: 'n8ao' | 'ssao'; // User togglable AO mode
  modelOutlines: boolean;
  isAOBaking: boolean;
  isFastAOBaking: boolean;
  aoBakingProgress: number;
  cameraMode: 'first-person' | 'third-person';
  environmentPreset: string;
  setCameraMode: (mode: 'first-person' | 'third-person') => void;
  setEnvironmentPreset: (preset: string) => void;
  setFile: (url: string | null, name: string | null, blobMap?: Record<string, string>) => void;
  setScale: (scale: number) => void;
  setLightIntensity: (intensity: number) => void;
  setShadowBaking: (baking: boolean) => void;
  setResolutionScale: (scale: number) => void;
  setQualityPreset: (preset: 'low' | 'medium' | 'high') => void;
  setCollisionEnabled: (enabled: boolean) => void;
  setFpsLimit: (limit: number) => void;
  setAmbientOcclusion: (enabled: boolean) => void;
  setAoIntensity: (intensity: number) => void;
  setAoEdgeOutline: (enabled: boolean) => void;
  setAoMode: (mode: 'n8ao' | 'ssao') => void;
  setModelOutlines: (enabled: boolean) => void;
  setIsAOBaking: (isBaking: boolean) => void;
  setIsFastAOBaking: (isBaking: boolean) => void;
  setAoBakingProgress: (progress: number) => void;
  triggerLocateModel: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  fileUrl: null,
  fileName: null,
  blobMap: {},
  scale: 0.01, // Defaulting to 0.01 assuming cm preset in SketchUp translates raw to units
  lightIntensity: 1,
  shadowBaking: true,
  resolutionScale: 1.0,
  qualityPreset: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 'medium' : 'high',
  collisionEnabled: false, // Default to false for better performance (fluidity)
  fpsLimit: 0, // infinity
  ambientOcclusion: false,
  aoIntensity: 1.5,
  aoEdgeOutline: false, // Default false to remove the depth outline artifact
  aoMode: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 'n8ao' : 'ssao',
  modelOutlines: false, // Hide white edge outlines by default
  isAOBaking: false,
  isFastAOBaking: false,
  aoBakingProgress: 0,
  cameraMode: 'first-person',
  environmentPreset: 'city',
  locateModelTrigger: 0,
  setFile: (fileUrl, fileName, blobMap = {}) => {
    const state = get();
    // Clean up old object URLs to prevent memory leaks
    if (state.fileUrl && state.fileUrl !== fileUrl) {
        URL.revokeObjectURL(state.fileUrl);
    }
    Object.values(state.blobMap).forEach(url => {
        URL.revokeObjectURL(url);
    });
    set({ fileUrl, fileName, blobMap });
  },
  setScale: (scale) => set({ scale }),
  setLightIntensity: (lightIntensity) => set({ lightIntensity }),
  setShadowBaking: (shadowBaking) => set({ shadowBaking }),
  setResolutionScale: (resolutionScale) => set({ resolutionScale }),
  setQualityPreset: (qualityPreset) => set({ qualityPreset }),
  setCollisionEnabled: (collisionEnabled) => set({ collisionEnabled }),
  setFpsLimit: (fpsLimit) => set({ fpsLimit }),
  setAmbientOcclusion: (ambientOcclusion) => set({ ambientOcclusion }),
  setAoIntensity: (aoIntensity) => set({ aoIntensity }),
  setAoEdgeOutline: (aoEdgeOutline) => set({ aoEdgeOutline }),
  setAoMode: (aoMode) => set({ aoMode }),
  setModelOutlines: (modelOutlines) => set({ modelOutlines }),
  setIsAOBaking: (isAOBaking) => set({ isAOBaking }),
  setIsFastAOBaking: (isFastAOBaking) => set({ isFastAOBaking }),
  setAoBakingProgress: (aoBakingProgress) => set({ aoBakingProgress }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setEnvironmentPreset: (environmentPreset) => set({ environmentPreset }),
  triggerLocateModel: () => set((state) => ({ locateModelTrigger: state.locateModelTrigger + 1 })),
}));
