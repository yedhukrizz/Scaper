import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Sky, SoftShadows, Grid, Stats } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import { EffectComposer, N8AO, SSAO } from '@react-three/postprocessing';
import { Model } from './Model';
import { FPSControls } from './FPSControls';
import { ProceduralEnvironment } from './ProceduralEnvironment';
import { useStore } from '../store';
import { Suspense, useState, useMemo, useEffect } from 'react';
import { inputState } from '../input';

function FpsLimiter({ limit }: { limit: number }) {
  const advance = useThree((state) => state.advance);
  const set = useThree((state) => state.set);
  
  useEffect(() => {
    if (limit === 0) {
      set({ frameloop: 'always' });
      return;
    }
    
    set({ frameloop: 'never' });
    
    const interval = 1000 / limit;
    let lastTime = performance.now();
    let frameId: number;
    
    const loop = (time: number) => {
      frameId = requestAnimationFrame(loop);
      const delta = time - lastTime;
      // We subtract a small amount (like 1ms) from interval to avoid floating point precision missing frames
      if (delta > interval - 1) {
        lastTime = time - (delta % interval);
        advance(time);
      }
    };
    
    frameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frameId);
      set({ frameloop: 'always' });
    };
  }, [limit, advance, set]);
  
  return null;
}

function Crosshair() {
  if (inputState.isMobile) return null; // No crosshair on mobile
  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2 z-50 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 mix-blend-difference" />
  );
}

export function Viewer() {
  const fileUrl = useStore((state) => state.fileUrl);
  const lightIntensity = useStore((state) => state.lightIntensity);
  const shadowBaking = useStore((state) => state.shadowBaking);
  const resolutionScale = useStore((state) => state.resolutionScale);
  const qualityPreset = useStore((state) => state.qualityPreset);
  const collisionEnabled = useStore((state) => state.collisionEnabled);
  const environmentPreset = useStore((state) => state.environmentPreset);
  const fpsLimit = useStore((state) => state.fpsLimit);
  const ambientOcclusion = useStore((state) => state.ambientOcclusion);
  const aoIntensity = useStore((state) => state.aoIntensity);
  const aoEdgeOutline = useStore((state) => state.aoEdgeOutline);
  const aoMode = useStore((state) => state.aoMode);
  const [clickToStart, setClickToStart] = useState(!inputState.isMobile);

  const dprConfig = useMemo(() => {
     const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
     return [1, pixelRatio * resolutionScale] as [number, number];
  }, [resolutionScale]);

  // We only show the crosshair/click-to-start if a model is loaded
  if (!fileUrl) return null;

  const shadowsEnabled = shadowBaking && qualityPreset !== 'low';
  const shadowMapSize = qualityPreset === 'high' ? 2048 : (qualityPreset === 'medium' ? 1024 : 512);

  return (
    <div className="relative h-full w-full bg-gray-900">
      <Canvas 
        shadows={shadowsEnabled} 
        camera={{ position: [0, 1.8, 5], fov: 60 }} 
        dpr={dprConfig}
        gl={{ antialias: true, powerPreference: "high-performance", stencil: false, depth: true }}
      >
        <fog attach="fog" args={['#d1d5db', 10, 200]} />
        <Sky sunPosition={[100, 20, 100]} turbidity={0.1} />
        <ambientLight intensity={lightIntensity * 0.5} />
        <directionalLight
          castShadow={shadowsEnabled}
          position={[50, 50, 50]}
          intensity={lightIntensity * 1.5}
          shadow-mapSize={[shadowMapSize, shadowMapSize]}
          shadow-camera-near={1}
          shadow-camera-far={200}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
          shadow-bias={-0.0001}
        />
        
        {shadowsEnabled && qualityPreset === 'high' && !inputState.isMobile && <SoftShadows size={25} samples={10} focus={0.5} />}

        <Environment preset={environmentPreset as any} />

        <Physics paused={!collisionEnabled}>
          <ProceduralEnvironment />
          <Suspense fallback={null}>
            <Model url={fileUrl} />
          </Suspense>

          {qualityPreset !== 'low' && <Grid infiniteGrid fadeDistance={100} sectionColor="#444" cellColor="#666" position={[0, -0.01, 0]} />}
          
          {/* Ground to catch lower shadows */}
          {collisionEnabled && (
            <RigidBody type="fixed">
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow={shadowsEnabled}>
                <planeGeometry args={[500, 500]} />
                <meshStandardMaterial color="#374151" transparent opacity={0.8} />
              </mesh>
            </RigidBody>
          )}

          <FPSControls />
        </Physics>

        {ambientOcclusion && qualityPreset !== 'low' && (
          <EffectComposer disableNormalPass={aoEdgeOutline} multisampling={0}>
            {aoMode === 'n8ao' ? (
              <N8AO aoRadius={2} intensity={aoIntensity} color="black" />
            ) : (
              <SSAO radius={0.2} intensity={aoIntensity * 10} luminanceInfluence={0.5} color="black" />
            )}
          </EffectComposer>
        )}

        <FpsLimiter limit={fpsLimit} />
      </Canvas>

      <Stats className="!absolute !right-auto !left-6 !top-auto !bottom-6" />

      <Crosshair />
      
      {clickToStart && !inputState.isMobile && (
        <div 
          className="absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center bg-black/60 transition-opacity"
          onClick={() => setClickToStart(false)}
        >
          <div className="rounded-xl bg-white/10 p-6 text-center backdrop-blur-md">
            <h2 className="mb-2 text-2xl font-semibold text-white">Ready to Explore</h2>
            <p className="text-gray-300 mb-4">Click anywhere to start exploring.</p>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
              <div className="flex flex-col items-center rounded-lg bg-black/30 p-2">
                <span className="font-mono text-white">W A S D</span>
                <span>Move</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-black/30 p-2">
                <span className="font-mono text-white">Mouse</span>
                <span>Look</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-black/30 p-2">
                <span className="font-mono text-white">Shift</span>
                <span>Sprint</span>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-black/30 p-2">
                <span className="font-mono text-white">Space</span>
                <span>Jump</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-brand-400 font-medium text-blue-400">Press ESC to unlock cursor</p>
          </div>
        </div>
      )}
    </div>
  );
}
