import { useStore } from '../store';
import { Settings, Sun, Maximize, X, Navigation, Monitor, Gauge } from 'lucide-react';
import { useState } from 'react';

export function UIOverlay() {
  const fileUrl = useStore((state) => state.fileUrl);
  const fileName = useStore((state) => state.fileName);
  const scale = useStore((state) => state.scale);
  const setScale = useStore((state) => state.setScale);
  const lightIntensity = useStore((state) => state.lightIntensity);
  const setLightIntensity = useStore((state) => state.setLightIntensity);
  const shadowBaking = useStore((state) => state.shadowBaking);
  const setShadowBaking = useStore((state) => state.setShadowBaking);
  const resolutionScale = useStore((state) => state.resolutionScale);
  const setResolutionScale = useStore((state) => state.setResolutionScale);
  const qualityPreset = useStore((state) => state.qualityPreset);
  const setQualityPreset = useStore((state) => state.setQualityPreset);
  const fpsLimit = useStore((state) => state.fpsLimit);
  const setFpsLimit = useStore((state) => state.setFpsLimit);
  const ambientOcclusion = useStore((state) => state.ambientOcclusion);
  const setAmbientOcclusion = useStore((state) => state.setAmbientOcclusion);
  const aoIntensity = useStore((state) => state.aoIntensity);
  const setAoIntensity = useStore((state) => state.setAoIntensity);
  const aoEdgeOutline = useStore((state) => state.aoEdgeOutline);
  const setAoEdgeOutline = useStore((state) => state.setAoEdgeOutline);
  const modelOutlines = useStore((state) => state.modelOutlines);
  const setModelOutlines = useStore((state) => state.setModelOutlines);
  const isAOBaking = useStore((state) => state.isAOBaking);
  const isFastAOBaking = useStore((state) => state.isFastAOBaking);
  const aoBakingProgress = useStore((state) => state.aoBakingProgress);
  const setIsAOBaking = useStore((state) => state.setIsAOBaking);
  const setIsFastAOBaking = useStore((state) => state.setIsFastAOBaking);
  const cameraMode = useStore((state) => state.cameraMode);
  const setCameraMode = useStore((state) => state.setCameraMode);
  const environmentPreset = useStore((state) => state.environmentPreset);
  const setEnvironmentPreset = useStore((state) => state.setEnvironmentPreset);
  const collisionEnabled = useStore((state) => state.collisionEnabled);
  const setCollisionEnabled = useStore((state) => state.setCollisionEnabled);
  const triggerLocateModel = useStore((state) => state.triggerLocateModel);
  const setFile = useStore((state) => state.setFile);

  const [isOpen, setIsOpen] = useState(false);

  if (!fileUrl) return null;

  return (
    <>
      {/* Top Bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-6 text-white pb-12">
        <div>
          <h1 className="text-xl font-bold tracking-tight drop-shadow-md">Architectural Viewer</h1>
          <p className="text-sm font-medium text-gray-300 drop-shadow-md">{fileName}</p>
        </div>
        <div className="flex items-center gap-2">
            <button
              onClick={triggerLocateModel}
              title="Locate & Reset Player"
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold shadow-lg transition-colors hover:bg-blue-500"
            >
              <Navigation className="h-4 w-4" />
              <span className="hidden sm:inline">Locate Model</span>
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md shadow-lg transition-colors hover:bg-white/30"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
                onClick={() => setFile(null, null)}
                className="flex items-center gap-2 rounded-full bg-red-500/90 px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur-md transition-colors hover:bg-red-400"
            >
               Close
            </button>
        </div>
      </div>

      {isOpen && (
        <div 
          className="fixed right-6 top-24 z-40 w-80 max-h-[80vh] overflow-y-auto rounded-2xl bg-black/85 p-6 text-white shadow-2xl backdrop-blur-xl border border-white/10 custom-scrollbar"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-semibold text-lg">Scene Settings</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            
             {/* Performance & Quality */}
            <div className="space-y-3 rounded-lg bg-white/5 p-4 border border-white/10">
               <h4 className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                 <Monitor className="h-4 w-4" /> Graphics Quality
               </h4>
               
               <div className="flex rounded-lg bg-black/50 p-1">
                 {['low', 'medium', 'high'].map(preset => (
                    <button
                      key={preset}
                      onClick={() => setQualityPreset(preset as any)}
                      className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors ${qualityPreset === preset ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                    >
                      {preset}
                    </button>
                 ))}
               </div>

               <div className="pt-2 border-t border-white/10 mt-2">
                 <div className="flex items-center justify-between text-xs mb-2">
                   <span className="text-gray-400">Environment Preset</span>
                 </div>
                 <select 
                    value={environmentPreset} 
                    onChange={(e) => setEnvironmentPreset(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 outline-none focus:border-blue-500 rounded py-1.5 px-2 text-xs text-white"
                 >
                   <option value="city">City</option>
                   <option value="sunset">Sunset</option>
                   <option value="dawn">Dawn</option>
                   <option value="night">Night</option>
                   <option value="warehouse">Warehouse</option>
                   <option value="forest">Forest</option>
                   <option value="apartment">Apartment</option>
                   <option value="studio">Studio</option>
                   <option value="park">Park</option>
                   <option value="lobby">Lobby</option>
                 </select>
               </div>
               
               <div className="pt-2 border-t border-white/10 mt-2">
                 <div className="flex items-center justify-between text-xs mb-2">
                   <span className="text-gray-400">FPS Limit</span>
                 </div>
                 <div className="flex flex-wrap gap-1">
                   {[24, 30, 60, 90, 120, 0].map(fps => (
                     <button
                       key={fps}
                       onClick={() => setFpsLimit(fps)}
                       className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${fpsLimit === fps ? 'bg-blue-600 text-white' : 'bg-black/50 text-gray-400 hover:bg-white/10'}`}
                     >
                       {fps === 0 ? 'Max' : fps}
                     </button>
                   ))}
                 </div>
               </div>

               <div className="pt-2 border-t border-white/10 mt-2">
                 <div className="flex items-center justify-between text-xs mb-2">
                   <span className="text-gray-400">Resolution Scale</span>
                   <span className="font-mono text-gray-300">{(resolutionScale * 100).toFixed(0)}%</span>
                 </div>
                 <input
                   type="range"
                   min="0.25"
                   max="2.0"
                   step="0.05"
                   value={resolutionScale}
                   onChange={(e) => setResolutionScale(parseFloat(e.target.value))}
                   className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-blue-500"
                 />
                 <p className="mt-1 text-[10px] text-gray-500 leading-tight">Lower resolution to improve frame rate.</p>
               </div>
            </div>

            {/* Scale Input Group */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Maximize className="h-4 w-4" />
                  <label>Model Scale</label>
                </div>
              </div>
              
              <div className="flex gap-2">
                 <input
                   type="number"
                   value={scale}
                   onChange={(e) => setScale(parseFloat(e.target.value) || 0.001)}
                   step="0.01"
                   min="0.0001"
                   className="w-full rounded-lg bg-black/50 border border-white/20 px-3 py-2 text-sm font-mono text-white outline-none focus:border-blue-500"
                 />
              </div>
              <div className="grid grid-cols-3 gap-2">
                 <button onClick={() => setScale(0.01)} className="rounded bg-white/10 py-1 text-xs hover:bg-white/20 transition-colors">CM (0.01)</button>
                 <button onClick={() => setScale(0.0254)} className="rounded bg-white/10 py-1 text-xs hover:bg-white/20 transition-colors">IN (0.025)</button>
                 <button onClick={() => setScale(1.0)} className="rounded bg-white/10 py-1 text-xs hover:bg-white/20 transition-colors">M (1.0)</button>
              </div>
            </div>

            {/* Light Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Sun className="h-4 w-4" />
                  <label>Light Intensity</label>
                </div>
                <span className="font-mono text-gray-400">{lightIntensity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={lightIntensity}
                onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-blue-500"
              />
            </div>
            
            {/* Shadow Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-4">
                <span className="text-sm text-gray-300">Shadow Baking</span>
                <button 
                  onClick={() => setShadowBaking(!shadowBaking)}
                  disabled={qualityPreset === 'low'}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${qualityPreset === 'low' ? 'opacity-50 bg-gray-700 cursor-not-allowed' : shadowBaking ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shadowBaking ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            <p className="text-[10px] text-gray-500">Disabled automatically on Low quality.</p>
            
            {/* Model Edge Outlines */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-4">
                <span className="text-sm text-gray-300">Model Edge Outlines</span>
                <button 
                  onClick={() => setModelOutlines(!modelOutlines)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${modelOutlines ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${modelOutlines ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            <p className="text-[10px] text-gray-500">Displays wireframe lines built into the 3D model if present.</p>

            {/* AO Settings & Baking */}
            <div className="flex flex-col pt-2 border-t border-white/10 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Ambient Occlusion (AO)</span>
                    <button 
                      onClick={() => setAmbientOcclusion(!ambientOcclusion)}
                      disabled={qualityPreset === 'low'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${qualityPreset === 'low' ? 'opacity-50 bg-gray-700 cursor-not-allowed' : ambientOcclusion ? 'bg-blue-500' : 'bg-gray-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ambientOcclusion ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                
                {ambientOcclusion ? (
                    <div className="space-y-3 rounded bg-black/40 p-3 border border-white/5">
                       <div className="flex items-center justify-between text-xs mb-1">
                         <span className="text-gray-400">Darkness Intensity</span>
                         <span className="font-mono text-gray-300">{aoIntensity.toFixed(1)}</span>
                       </div>
                       <input
                         type="range"
                         min="0.5"
                         max="4.0"
                         step="0.1"
                         value={aoIntensity}
                         onChange={(e) => setAoIntensity(parseFloat(e.target.value))}
                         className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-blue-500"
                       />
                       
                       <div className="flex items-center justify-between pt-1">
                         <span className="text-xs text-gray-400">Stylized Outline Artifact</span>
                         <button 
                           onClick={() => setAoEdgeOutline(!aoEdgeOutline)}
                           className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${aoEdgeOutline ? 'bg-blue-500' : 'bg-gray-600'}`}
                         >
                           <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${aoEdgeOutline ? 'translate-x-5' : 'translate-x-1'}`} />
                         </button>
                       </div>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-2 rounded bg-black/40 p-3 border border-white/5">
                        <p className="text-[10px] text-gray-400 mb-1 leading-tight">If dynamic AO is too heavy, you can bake a static fake-AO directly into the vertices to save performance.</p>
                        <div className="flex gap-2 w-full">
                          <button
                             onClick={() => setIsFastAOBaking(true)}
                             disabled={isAOBaking || isFastAOBaking}
                             className="flex-1 rounded bg-green-600 hover:bg-green-500 disabled:bg-green-800/50 disabled:text-gray-400 py-1.5 text-[11px] font-semibold shadow transition-colors text-center"
                          >
                             {isFastAOBaking ? `${aoBakingProgress}%` : 'Fast (Height)'}
                          </button>
                          <button
                             onClick={() => setIsAOBaking(true)}
                             disabled={isAOBaking || isFastAOBaking}
                             className="flex-1 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 disabled:text-gray-400 py-1.5 text-[11px] font-semibold shadow transition-colors text-center"
                          >
                             {isAOBaking ? `${aoBakingProgress}%` : 'Slow (Raytraced)'}
                          </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Camera Mode Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-4">
                <span className="text-sm text-gray-300">Third Person Mode</span>
                <button 
                  onClick={() => setCameraMode(cameraMode === 'first-person' ? 'third-person' : 'first-person')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${cameraMode === 'third-person' ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${cameraMode === 'third-person' ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            
            {/* Walk Mode Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-4">
                <span className="text-sm text-gray-300">Walk Mode (Gravity)</span>
                <button 
                  onClick={() => setCollisionEnabled(!collisionEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${collisionEnabled ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${collisionEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            <p className="text-[10px] text-gray-500">Turn OFF to FLY through walls and reach other floors. Improves FPS.</p>

          </div>
        </div>
      )}
    </>
  );
}

