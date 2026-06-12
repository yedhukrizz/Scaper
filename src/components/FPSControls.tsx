import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider, useRapier, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { inputState } from '../input';
import { useStore } from '../store';

const keys = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  Space: false,
  ShiftLeft: false,
};

export function FPSControls() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const playerRef = useRef<RapierRigidBody>(null);
  const characterRef = useRef<THREE.Group>(null);
  const { rapier, world } = useRapier();
  const locateModelTrigger = useStore(state => state.locateModelTrigger);
  
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const direction = useRef(new THREE.Vector3());
  const frontVec = useRef(new THREE.Vector3());
  const rightVec = useRef(new THREE.Vector3());
  const bobAngle = useRef(0);

  useEffect(() => {
    if (locateModelTrigger > 0 && playerRef.current) {
        playerRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true);
        playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  }, [locateModelTrigger]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (keys.hasOwnProperty(event.code)) {
        (keys as any)[event.code] = true;
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (keys.hasOwnProperty(event.code)) {
        (keys as any)[event.code] = false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (!playerRef.current) return;
    const dt = Math.min(delta, 0.1);
    
    // 1. Handle Looking
    if (inputState.isMobile) {
        if (inputState.lookDelta.x !== 0 || inputState.lookDelta.y !== 0) {
            euler.current.setFromQuaternion(camera.quaternion);
            euler.current.y -= inputState.lookDelta.x * 0.005;
            euler.current.x -= inputState.lookDelta.y * 0.005;
            // Clamp pitch to prevent breaking neck
            euler.current.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, euler.current.x));
            camera.quaternion.setFromEuler(euler.current);

            inputState.lookDelta.x = 0;
            inputState.lookDelta.y = 0;
        }
    }

    const isLocked = controlsRef.current?.isLocked;
    const isActive = isLocked || inputState.isMobile;

    const collisionEnabled = useStore.getState().collisionEnabled;

    if (!collisionEnabled) {
       // Fly mode (No Physics)
       if (isActive) {
           const flySpeed = (keys.ShiftLeft || inputState.sprint) ? 15.0 : 6.0;
           direction.current.set(0, 0, 0);

           euler.current.setFromQuaternion(camera.quaternion, 'YXZ');
           const yaw = euler.current.y;
           
           frontVec.current.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
           rightVec.current.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

           if (keys.KeyW) direction.current.add(frontVec.current);
           if (keys.KeyS) direction.current.sub(frontVec.current);
           if (keys.KeyD) direction.current.add(rightVec.current);
           if (keys.KeyA) direction.current.sub(rightVec.current);

           if (inputState.isMobile) {
               direction.current.addScaledVector(frontVec.current, inputState.joystick.y);
               direction.current.addScaledVector(rightVec.current, inputState.joystick.x);
           }

           if (direction.current.lengthSq() > 0) {
               direction.current.normalize();
           }

           // Vertical flying
           const upVelocity = (keys.Space || inputState.flyUp ? 1 : 0) + ((keys.ShiftLeft && !keys.Space) || inputState.flyDown ? -1 : 0);
           
           camera.position.addScaledVector(direction.current, flySpeed * dt);
           camera.position.y += upVelocity * flySpeed * dt;
           
           // Synchronize player body so turning on collisions doesn't snap back entirely
           if (playerRef.current) {
               playerRef.current.setTranslation(camera.position, true);
               playerRef.current.setLinvel({x: 0, y: 0, z: 0}, true);
           }
       }
       return;
    }

    const playerBody = playerRef.current;
    const playerPos = playerBody.translation();
    const currentVel = playerBody.linvel();
    
    // Raycast down slightly to check if grounded for jumping and resetting bob
    // Start ray strictly below capsule to avoid hitting itself (capsule halfheight 0.4 + radius 0.4 = 0.8)
    const rayStart = new THREE.Vector3(playerPos.x, playerPos.y - 0.85, playerPos.z);
    const rayDir = new THREE.Vector3(0, -1, 0);
    const ray = new rapier.Ray(rayStart, rayDir);
    // Cast a short ray downwards
    const hit = world.castRay(ray, 0.4, true);
    const isGrounded = hit !== null && hit.timeOfImpact < 0.2;

    // Movement calculation
    let targetVel = new THREE.Vector3(0, 0, 0);
    let speed = 0;

    if (isActive) {
        speed = (keys.ShiftLeft || inputState.sprint) ? 8.0 : 3.5;
        
        // Define movement directions based on camera yaw
        euler.current.setFromQuaternion(camera.quaternion, 'YXZ');
        const yaw = euler.current.y;
        
        frontVec.current.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        rightVec.current.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

        direction.current.set(0, 0, 0);

        // Keyboard
        if (keys.KeyW) direction.current.add(frontVec.current);
        if (keys.KeyS) direction.current.sub(frontVec.current);
        if (keys.KeyD) direction.current.add(rightVec.current);
        if (keys.KeyA) direction.current.sub(rightVec.current);

        // Mobile joystick
        if (inputState.isMobile) {
            direction.current.addScaledVector(frontVec.current, inputState.joystick.y);
            direction.current.addScaledVector(rightVec.current, inputState.joystick.x);
        }

        if (direction.current.lengthSq() > 0) {
            direction.current.normalize();
            targetVel.copy(direction.current).multiplyScalar(speed);
        }

        // Jump
        if (isGrounded && (keys.Space || inputState.jump)) {
            playerBody.applyImpulse({ x: 0, y: 5.0, z: 0 }, true);
            inputState.jump = false;
        }
    }

    // Apply smooth acceleration/deceleration for X and Z
    const accel = isGrounded ? 10.0 : 2.0; // Air control is lower
    const updatedVelX = THREE.MathUtils.lerp(currentVel.x, targetVel.x, dt * accel);
    const updatedVelZ = THREE.MathUtils.lerp(currentVel.z, targetVel.z, dt * accel);

    playerBody.setLinvel({ x: updatedVelX, y: currentVel.y, z: updatedVelZ }, true);

    const cameraMode = useStore.getState().cameraMode;
    // Update Camera position to match player physically + Head bobbing
    let camY = playerPos.y + 0.6; // Eye level above center
    
    if (isGrounded && targetVel.lengthSq() > 0) {
        bobAngle.current += dt * 12 * (speed / 3.5);
        if (cameraMode === 'first-person') {
            camY += Math.abs(Math.sin(bobAngle.current) * 0.06);
        }
    } else {
        bobAngle.current = 0;
    }

    if (cameraMode === 'third-person') {
        const offset = new THREE.Vector3(0, 0, 4).applyQuaternion(camera.quaternion);
        camera.position.set(playerPos.x, camY, playerPos.z).add(offset);
        if (characterRef.current) {
            characterRef.current.rotation.y = euler.current.y;
        }
    } else {
        camera.position.set(playerPos.x, camY, playerPos.z);
    }
  });

  const cameraMode = useStore((state) => state.cameraMode);

  return (
    <>
      {!inputState.isMobile && <PointerLockControls ref={controlsRef} />}
      <RigidBody
        ref={playerRef}
        type="dynamic"
        colliders={false}
        enabledRotations={[false, false, false]}
        position={[0, 5, 0]} // Start above ground
        friction={0} // No friction on body so it easily glides along walls and stairs
        mass={1}
      >
        <CapsuleCollider args={[0.4, 0.4]} />
        {cameraMode === 'third-person' && (
           <group ref={characterRef} rotation={[0, euler.current.y, 0]}>
             <mesh position={[0, 0, 0]} castShadow>
                <capsuleGeometry args={[0.3, 0.6, 4, 16]} />
                <meshStandardMaterial color="#4A90E2" />
             </mesh>
             <mesh position={[0, 0.3, 0.2]}>
                <boxGeometry args={[0.4, 0.2, 0.4]} />
                <meshStandardMaterial color="#2d3748" />
             </mesh>
           </group>
        )}
      </RigidBody>
    </>
  );
}
