import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { RigidBody, CylinderCollider, CuboidCollider } from '@react-three/rapier';

export function ProceduralEnvironment() {
  const environmentPreset = useStore((state) => state.environmentPreset);
  const qualityPreset = useStore((state) => state.qualityPreset);
  const isHighQuality = qualityPreset === 'high';

  if (environmentPreset === 'forest') {
    return <ForestEnvironment highQuality={isHighQuality} />;
  }
  if (environmentPreset === 'city') {
    return <CityEnvironment highQuality={isHighQuality} />;
  }
  
  // Default simple ground plane if not a specific heavy procedurally generated one
  // Only add ground if it's one of these outdoor ones
  const outdoorPresets = ['sunset', 'dawn', 'night', 'park'];
  if (outdoorPresets.includes(environmentPreset)) {
      return (
          <RigidBody type="fixed" friction={0.5}>
            <mesh receiveShadow rotation={[-Math.PI/2, 0, 0]} position={[0, -0.05, 0]}>
              <planeGeometry args={[300, 300]} />
              <meshStandardMaterial color="#3d4035" />
            </mesh>
          </RigidBody>
      );
  }

  return null;
}

function ForestEnvironment({ highQuality }: { highQuality: boolean }) {
  const treeCount = highQuality ? 300 : 100;
  const radiusOffset = 35; // Generous radius around the model
  const extent = 120;
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const dummySphere = useMemo(() => new THREE.Sphere(), []);
  
  const { positions, scales } = useMemo(() => {
    const pos = [];
    const sca = [];
    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radiusOffset + Math.random() * (extent - radiusOffset);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      pos.push(new THREE.Vector3(x, 0, z));
      sca.push(0.8 + Math.random() * 1.5);
    }
    return { positions: pos, scales: sca };
  }, [treeCount, radiusOffset, extent]);
  
  const trunkRefHigh = useRef<THREE.InstancedMesh>(null);
  const leavesRefHigh = useRef<THREE.InstancedMesh>(null);
  const leavesRefLow = useRef<THREE.InstancedMesh>(null);

  useFrame(({ camera }) => {
    if (!trunkRefHigh.current || !leavesRefHigh.current || !leavesRefLow.current) return;

    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    let countHigh = 0;
    let countLow = 0;

    for (let i = 0; i < treeCount; i++) {
       const pos = positions[i];
       const s = scales[i];
       
       // Culling: Frustum Culling
       dummySphere.center.copy(pos);
       dummySphere.radius = 8 * s; // Approximate tree size
       if (!frustum.intersectsSphere(dummySphere)) {
           continue; // Skip rendering (Occluded outside camera view)
       }

       // Calculate distance for Level of Detail (LOD)
       const dist = camera.position.distanceTo(pos);

       // LOD 0: High Detail (Close)
       if (dist < 80) {
           // High Poly Trunk
           dummy.position.copy(pos);
           dummy.position.y = 2 * s;
           dummy.scale.set(s, s, s);
           dummy.updateMatrix();
           trunkRefHigh.current.setMatrixAt(countHigh, dummy.matrix);
           
           // High Poly Leaves
           dummy.position.y = (4 * s) + (3 * s);
           dummy.updateMatrix();
           leavesRefHigh.current.setMatrixAt(countHigh, dummy.matrix);
           
           countHigh++;
       } 
       // LOD 1: Low Detail (Far away)
       else {
           // Swap to single Low Poly version without trunk
           dummy.position.copy(pos);
           dummy.position.y = (4 * s) + (3 * s);
           dummy.scale.set(s, s, s);
           dummy.updateMatrix();
           leavesRefLow.current.setMatrixAt(countLow, dummy.matrix);
           
           countLow++;
       }
    }

    trunkRefHigh.current.count = countHigh;
    leavesRefHigh.current.count = countHigh;
    leavesRefLow.current.count = countLow;
    
    trunkRefHigh.current.instanceMatrix.needsUpdate = true;
    leavesRefHigh.current.instanceMatrix.needsUpdate = true;
    leavesRefLow.current.instanceMatrix.needsUpdate = true;
  });
  
  return (
    <group>
      <RigidBody type="fixed" friction={0.8}>
        <mesh receiveShadow rotation={[-Math.PI/2, 0, 0]} position={[0, -0.05, 0]}>
          <planeGeometry args={[300, 300]} />
          <meshStandardMaterial color="#2d4c1e" roughness={0.9} />
        </mesh>
      </RigidBody>
      
      {/* LOD 0: High Detail Models */}
      <instancedMesh ref={trunkRefHigh} args={[undefined, undefined, treeCount]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.6, 4, 12]} />
        <meshStandardMaterial color="#4a3b22" roughness={0.9} />
      </instancedMesh>
      
      <instancedMesh ref={leavesRefHigh} args={[undefined, undefined, treeCount]} castShadow receiveShadow>
        <coneGeometry args={[2.5, 6, 12]} />
        <meshStandardMaterial color="#2d5a27" roughness={1.0} />
      </instancedMesh>

      {/* LOD 1: Low Detail Models (Swap in for distance) */}
      <instancedMesh ref={leavesRefLow} args={[undefined, undefined, treeCount]} castShadow receiveShadow>
        <coneGeometry args={[2.5, 6, 4]} />
        <meshStandardMaterial color="#2d5a27" roughness={1.0} />
      </instancedMesh>
      
      {/* Physics colliders for inner ring of trees */}
      <RigidBody type="fixed">
        {positions.map((pos, i) => {
           if (pos.length() < radiusOffset + 25) {
              return <CylinderCollider key={i} args={[2 * scales[i], 0.6 * scales[i]]} position={[pos.x, 2 * scales[i], pos.z]} />
           }
           return null;
        })}
      </RigidBody>
    </group>
  );
}

function CityEnvironment({ highQuality }: { highQuality: boolean }) {
  const buildingCount = highQuality ? 150 : 60;
  const radiusOffset = 45; // Generous radius around the center
  const extent = 180;
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const dummyBox = useMemo(() => new THREE.Box3(), []);
  
  const { positions, scales, heights, rotations } = useMemo(() => {
     const pos = [];
     const sca = [];
     const h = [];
     const rot = [];
     for(let i=0; i<buildingCount; i++) {
       const angle = Math.random() * Math.PI * 2;
       const r = radiusOffset + Math.random() * (extent - radiusOffset);
       pos.push(new THREE.Vector3(Math.cos(angle)*r, 0, Math.sin(angle)*r));
       sca.push(3 + Math.random() * 6); // width / depth
       h.push(10 + Math.random() * 50); // high
       rot.push(Math.random() * Math.PI);
     }
     return {positions: pos, scales: sca, heights: h, rotations: rot};
  }, [buildingCount, radiusOffset, extent]);
  
  const buildingRefHigh = useRef<THREE.InstancedMesh>(null);
  const buildingRefLow = useRef<THREE.InstancedMesh>(null);
  
  useFrame(({ camera }) => {
     if (!buildingRefHigh.current || !buildingRefLow.current) return;

     projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
     frustum.setFromProjectionMatrix(projScreenMatrix);

     let countHigh = 0;
     let countLow = 0;

     for (let i = 0; i < buildingCount; i++) {
        const pos = positions[i];
        const s = scales[i];
        const h = heights[i];
        const rotY = rotations[i];

        // Culling: Frustum Culling
        dummyBox.min.set(pos.x - s/2, 0, pos.z - s/2);
        dummyBox.max.set(pos.x + s/2, h, pos.z + s/2);
        
        if (!frustum.intersectsBox(dummyBox)) {
            continue; // Skip rendering
        }

        const dist = camera.position.distanceTo(pos);

        dummy.position.copy(pos);
        dummy.position.y = h / 2;
        dummy.scale.set(s, h, s);
        dummy.rotation.y = rotY;
        dummy.updateMatrix();

        // LOD 0: High Detail (Close)
        if (dist < 100) {
            buildingRefHigh.current.setMatrixAt(countHigh, dummy.matrix);
            countHigh++;
        } 
        // LOD 1: Low Detail (Far away)
        else {
            buildingRefLow.current.setMatrixAt(countLow, dummy.matrix);
            countLow++;
        }
     }

     buildingRefHigh.current.count = countHigh;
     buildingRefLow.current.count = countLow;
     
     buildingRefHigh.current.instanceMatrix.needsUpdate = true;
     buildingRefLow.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <RigidBody type="fixed" friction={0.8}>
         {/* Road / Ground */}
        <mesh receiveShadow rotation={[-Math.PI/2, 0, 0]} position={[0, -0.05, 0]}>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color="#2d2d2d" roughness={0.8} />
        </mesh>
      </RigidBody>

      <instancedMesh ref={buildingRefHigh} args={[undefined, undefined, buildingCount]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1, 4, 4, 4]} /> {/* Higher poly for LOD 0 */}
        <meshStandardMaterial color="#7a7a7a" roughness={0.6} metalness={0.2} />
      </instancedMesh>
      
      <instancedMesh ref={buildingRefLow} args={[undefined, undefined, buildingCount]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1, 1, 1, 1]} /> {/* Lowest poly for LOD 1 */}
        <meshStandardMaterial color="#7a7a7a" roughness={0.6} metalness={0.2} />
      </instancedMesh>

      {/* Physics colliders for nearest buildings */}
      <RigidBody type="fixed">
        {positions.map((pos, i) => {
           if (pos.length() < radiusOffset + 30) {
              // Note: CuboidCollider args are half-extents
              return <CuboidCollider key={i} args={[scales[i]/2, heights[i]/2, scales[i]/2]} position={[pos.x, heights[i]/2, pos.z]} />
           }
           return null;
        })}
      </RigidBody>
    </group>
  );
}
