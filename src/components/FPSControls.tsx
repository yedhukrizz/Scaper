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
  const logicalPos = useRef(new THREE.Vector3(0, 5, 0));
  const isInitialized = useRef(false);

  useEffect(() => {
    if (locateModelTrigger > 0 && playerRef.current) {
        playerRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true);
        playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        logicalPos.current.set(0, 5, 0);
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
    const playerBody = playerRef.current;
    
    // Initialize logicalPos gracefully from start position
    if (!isInitialized.current) {
       const initialPos = playerBody.translation();
       logicalPos.current.set(initialPos.x, initialPos.y, initialPos.z);
       isInitialized.current = true;
    }
    
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
    const cameraMode = useStore.getState().cameraMode;
    let targetVel = new THREE.Vector3(0, 0, 0);
    let speed = 0;

    // Movement directions
    euler.current.setFromQuaternion(camera.quaternion, 'YXZ');
    const yaw = euler.current.y;
    
    frontVec.current.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    rightVec.current.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    direction.current.set(0, 0, 0);

    if (isActive) {
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
    }

    if (!collisionEnabled) {
       // Fly mode (No Physics)
       if (isActive) {
           speed = (keys.ShiftLeft || inputState.sprint) ? 15.0 : 6.0;
           const upVelocity = (keys.Space || inputState.flyUp ? 1 : 0) + ((keys.ShiftLeft && !keys.Space) || inputState.flyDown ? -1 : 0);
           
           logicalPos.current.addScaledVector(direction.current, speed * dt);
           logicalPos.current.y += upVelocity * speed * dt;
           
           playerBody.setTranslation(logicalPos.current, true);
           playerBody.setLinvel({x: 0, y: 0, z: 0}, true);
       } else {
           // Sync from physics if somehow updated
           const t = playerBody.translation();
           logicalPos.current.set(t.x, t.y, t.z);
       }
    } else {
       // Collision mode (Physics enabled)
       const playerPos = playerBody.translation();
       logicalPos.current.set(playerPos.x, playerPos.y, playerPos.z);
       const currentVel = playerBody.linvel();
       
       const rayStart = new THREE.Vector3(playerPos.x, playerPos.y - 0.85, playerPos.z);
       const rayDir = new THREE.Vector3(0, -1, 0);
       const ray = new rapier.Ray(rayStart, rayDir);
       const hit = world.castRay(ray, 0.4, true);
       const isGrounded = hit !== null && hit.timeOfImpact < 0.2;

       if (isActive) {
           speed = (keys.ShiftLeft || inputState.sprint) ? 8.0 : 3.5;
           if (direction.current.lengthSq() > 0) {
               targetVel.copy(direction.current).multiplyScalar(speed);
           }

           if (isGrounded && (keys.Space || inputState.jump)) {
               playerBody.applyImpulse({ x: 0, y: 5.0, z: 0 }, true);
               inputState.jump = false;
           }
       }

       const accel = isGrounded ? 10.0 : 2.0;
       const updatedVelX = THREE.MathUtils.lerp(currentVel.x, targetVel.x, dt * accel);
       const updatedVelZ = THREE.MathUtils.lerp(currentVel.z, targetVel.z, dt * accel);
       
       playerBody.setLinvel({ x: updatedVelX, y: currentVel.y, z: updatedVelZ }, true);
    }

    // Camera Placement & Third Person Render
    let camY = logicalPos.current.y + 0.6; // Eye level
    
    if (collisionEnabled && speed > 0 && targetVel.lengthSq() > 0) {
        bobAngle.current += dt * 12 * (speed / 3.5);
        if (cameraMode === 'first-person') {
            camY += Math.abs(Math.sin(bobAngle.current) * 0.06);
        }
    } else {
        bobAngle.current = 0;
    }

    if (cameraMode === 'third-person') {
        const offset = new THREE.Vector3(0, 0, 4).applyQuaternion(camera.quaternion);
        camera.position.set(logicalPos.current.x, camY, logicalPos.current.z).add(offset);
        if (characterRef.current) {
            characterRef.current.rotation.y = yaw;
            // Ensures visibility of model if we enter collision mode after flying 
            characterRef.current.visible = true; 
        }
    } else {
        camera.position.set(logicalPos.current.x, camY, logicalPos.current.z);
        if (characterRef.current) {
             characterRef.current.visible = false;
        }
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
        <group ref={characterRef}>
          <mesh position={[0, 0, 0]} castShadow>
             <capsuleGeometry args={[0.3, 0.6, 4, 16]} />
             <meshStandardMaterial color="#4A90E2" />
          </mesh>
          <mesh position={[0, 0.3, 0.2]}>
             <boxGeometry args={[0.4, 0.2, 0.4]} />
             <meshStandardMaterial color="#2d3748" />
          </mesh>
        </group>
      </RigidBody>
    </>
  );
}
