import { useEffect, useRef, useState } from 'react';
import { inputState } from '../input';
import { useStore } from '../store';

export function MobileControlsOverlay() {
  const fileUrl = useStore((state) => state.fileUrl);
  const collisionEnabled = useStore((state) => state.collisionEnabled);

  const [joystickCenter, setJoystickCenter] = useState<{x: number, y: number} | null>(null);
  const [joystickPos, setJoystickPos] = useState<{x: number, y: number} | null>(null);

  const lookTouchId = useRef<number | null>(null);
  const moveTouchId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!inputState.isMobile || !fileUrl) return;
    const preventDefault = (e: TouchEvent) => {
        // Prevent scrolling and pinch-zoom on the overlay,
        // but allow scrolling on UI panels with overflow
        const target = e.target as HTMLElement | null;
        if (target && target.closest('.overflow-y-auto')) {
            return;
        }
        e.preventDefault();
    };
    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => document.removeEventListener('touchmove', preventDefault);
  }, [fileUrl]);

  if (!inputState.isMobile || !fileUrl) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    const halfW = window.innerWidth / 2;
    Array.from(e.changedTouches).forEach(t => {
        if (t.clientX < halfW && moveTouchId.current === null) {
            moveTouchId.current = t.identifier;
            setJoystickCenter({ x: t.clientX, y: t.clientY });
            setJoystickPos({ x: t.clientX, y: t.clientY });
        } else if (t.clientX >= halfW && lookTouchId.current === null) {
            lookTouchId.current = t.identifier;
            lastLookPos.current = { x: t.clientX, y: t.clientY };
        }
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    Array.from(e.changedTouches).forEach(t => {
        if (t.identifier === moveTouchId.current && joystickCenter) {
            // Vector from center to touch
            let dx = t.clientX - joystickCenter.x;
            let dy = t.clientY - joystickCenter.y;
            const maxR = 50;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > maxR) {
                dx = (dx / dist) * maxR;
                dy = (dy / dist) * maxR;
            }
            setJoystickPos({ x: joystickCenter.x + dx, y: joystickCenter.y + dy });
            // map to [-1, 1]
            inputState.joystick.x = dx / maxR;
            inputState.joystick.y = -(dy / maxR); // forward is +y in store, but screen up is -y
        } else if (t.identifier === lookTouchId.current) {
            const dx = t.clientX - lastLookPos.current.x;
            const dy = t.clientY - lastLookPos.current.y;
            inputState.lookDelta.x += dx;
            inputState.lookDelta.y += dy;
            lastLookPos.current = { x: t.clientX, y: t.clientY };
        }
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    Array.from(e.changedTouches).forEach(t => {
        if (t.identifier === moveTouchId.current) {
            moveTouchId.current = null;
            setJoystickCenter(null);
            setJoystickPos(null);
            inputState.joystick = { x: 0, y: 0 };
        } else if (t.identifier === lookTouchId.current) {
            lookTouchId.current = null;
        }
    });
  };

  return (
    <div 
      className="absolute inset-0 z-30 touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {joystickCenter && joystickPos && (
         <>
           <div 
             className="absolute rounded-full border-2 border-white/40 bg-white/10 backdrop-blur-sm transition-all"
             style={{ 
                left: joystickCenter.x - 50, top: joystickCenter.y - 50, 
                width: 100, height: 100 
             }}
           />
           <div 
             className="absolute rounded-full bg-white/80 shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all"
             style={{ 
                left: joystickPos.x - 25, top: joystickPos.y - 25, 
                width: 50, height: 50 
             }}
           />
         </>
      )}

      {/* Buttons */}
      {collisionEnabled ? (
        <div className="absolute bottom-10 right-10 flex flex-col items-center gap-4">
           {/* Sprint Toggle/Hold */}
           <button 
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 font-bold text-white/80 text-xs shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-sm active:bg-white/40"
              onTouchStart={(e) => { e.stopPropagation(); inputState.sprint = true; }}
              onTouchEnd={(e) => { e.stopPropagation(); inputState.sprint = false; }}
              onTouchCancel={(e) => { e.stopPropagation(); inputState.sprint = false; }}
           >
             SPRINT
           </button>
           {/* Jump Button */}
           <button 
               className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 font-bold text-white/80 shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-sm active:bg-white/40"
               onTouchStart={(e) => { e.stopPropagation(); inputState.jump = true; }}
               onTouchEnd={(e) => { e.stopPropagation(); inputState.jump = false; }}
               onTouchCancel={(e) => { e.stopPropagation(); inputState.jump = false; }}
             >
               JUMP
           </button>
        </div>
      ) : (
        <div className="absolute bottom-10 right-10 flex flex-col items-center gap-4">
           <button 
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 font-bold text-white/80 text-xs shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-sm active:bg-white/40"
              onTouchStart={(e) => { e.stopPropagation(); inputState.flyUp = true; }}
              onTouchEnd={(e) => { e.stopPropagation(); inputState.flyUp = false; }}
              onTouchCancel={(e) => { e.stopPropagation(); inputState.flyUp = false; }}
           >
             UP
           </button>
           <button 
               className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 font-bold text-white/80 text-xs shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-sm active:bg-white/40"
               onTouchStart={(e) => { e.stopPropagation(); inputState.flyDown = true; }}
               onTouchEnd={(e) => { e.stopPropagation(); inputState.flyDown = false; }}
               onTouchCancel={(e) => { e.stopPropagation(); inputState.flyDown = false; }}
             >
               DOWN
           </button>
        </div>
      )}
    </div>
  );
}
