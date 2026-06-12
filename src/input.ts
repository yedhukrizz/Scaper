export const inputState = {
  joystick: { x: 0, y: 0 }, // x: right, y: forward
  lookDelta: { x: 0, y: 0 },
  jump: false,
  flyUp: false,
  flyDown: false,
  sprint: false,
  isMobile: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
};
