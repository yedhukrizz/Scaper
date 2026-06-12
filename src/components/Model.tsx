import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { useGLTF, Bvh } from '@react-three/drei';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { RigidBody } from '@react-three/rapier';
import { useStore } from '../store';
import { inputState } from '../input';
import * as THREE from 'three';

// Fast Hemisphere Vertex AO Baker
async function bakeVertexAO(scene: THREE.Object3D, onProgress: (p: number) => void) {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) meshes.push(c as THREE.Mesh);
  });

  if (meshes.length === 0) {
    onProgress(100);
    return;
  }

  const raycaster = new THREE.Raycaster();
  raycaster.far = 2.0; // Short rays to capture local crevices
  raycaster.firstHitOnly = true;

  const numRays = 8;
  const dirs: THREE.Vector3[] = [];
  // Hemisphere points
  dirs.push(new THREE.Vector3(0, 1, 0));
  dirs.push(new THREE.Vector3(1, 0.5, 0).normalize());
  dirs.push(new THREE.Vector3(-1, 0.5, 0).normalize());
  dirs.push(new THREE.Vector3(0, 0.5, 1).normalize());
  dirs.push(new THREE.Vector3(0, 0.5, -1).normalize());
  dirs.push(new THREE.Vector3(0.5, 0.7, 0.5).normalize()); 
  dirs.push(new THREE.Vector3(-0.5, 0.7, -0.5).normalize()); 
  dirs.push(new THREE.Vector3(0, -0.2, 0).normalize()); // tiny bit down 

  const totalVerts = meshes.reduce((sum, mesh) => sum + (mesh.geometry.attributes.position?.count || 0), 0);
  if (totalVerts === 0) {
      onProgress(100);
      return;
  }
  let vertsProcessed = 0;
  const targetMeshes = meshes.slice();

  for (const mesh of targetMeshes) {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    if (!pos) continue;

    if (!geo.attributes.color) {
      const colArray = new Float32Array(pos.count * 3);
      colArray.fill(1);
      geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
    }
    const colAttr = geo.attributes.color;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach(m => {
        m.vertexColors = true;
        m.needsUpdate = true;
    });

    const vPos = new THREE.Vector3();
    const vNorm = new THREE.Vector3();
    const rayDir = new THREE.Vector3();
    const upAxis = new THREE.Vector3(0, 1, 0);

    const CHUNK_SIZE = 500; 

    for (let i = 0; i < pos.count; i++) {
        vPos.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        
        let up = new THREE.Vector3(0, 1, 0);
        if (normAttr) {
            vNorm.fromBufferAttribute(normAttr, i).transformDirection(mesh.matrixWorld).normalize();
            if (vNorm.lengthSq() > 0) up.copy(vNorm);
        }

        const q = new THREE.Quaternion().setFromUnitVectors(upAxis, up);

        let hits = 0;
        vPos.addScaledVector(vNorm, 0.005);
        raycaster.ray.origin.copy(vPos);

        for (let r = 0; r < numRays; r++) {
            rayDir.copy(dirs[r]).applyQuaternion(q);
            raycaster.ray.direction.copy(rayDir);
            const intersects = raycaster.intersectObjects(targetMeshes, false);
            if (intersects.length > 0) hits++;
        }

        const aoVal = 1.0 - (hits / numRays) * 0.7; // max 70% dark

        colAttr.setXYZ(i, colAttr.getX(i) * aoVal, colAttr.getY(i) * aoVal, colAttr.getZ(i) * aoVal);
        vertsProcessed++;
        
        if (vertsProcessed % CHUNK_SIZE === 0) {
            onProgress(Math.floor((vertsProcessed / totalVerts) * 100));
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    colAttr.needsUpdate = true;
  }
  onProgress(100);
}

// Instant Geometric Fake AO Baker
async function fastBakeVertexAO(scene: THREE.Object3D, onProgress: (p: number) => void) {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) meshes.push(c as THREE.Mesh);
  });

  if (meshes.length === 0) {
    onProgress(100);
    return;
  }

  const bbox = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const totalHeight = size.y || 1;

  const totalVerts = meshes.reduce((sum, mesh) => sum + (mesh.geometry.attributes.position?.count || 0), 0);
  if (totalVerts === 0) {
      onProgress(100);
      return;
  }

  const vPos = new THREE.Vector3();
  const vNorm = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);

  let vertsProcessed = 0;
  const CHUNK_SIZE = 50000;

  for (const mesh of meshes) {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    if (!pos) continue;

    if (!geo.attributes.color) {
      const colArray = new Float32Array(pos.count * 3);
      colArray.fill(1);
      geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
    }
    const colAttr = geo.attributes.color;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach(m => {
        m.vertexColors = true;
        m.needsUpdate = true;
    });

    for (let i = 0; i < pos.count; i++) {
        vPos.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        
        let upDot = 1.0;
        if (normAttr) {
            vNorm.fromBufferAttribute(normAttr, i).transformDirection(mesh.matrixWorld).normalize();
            upDot = vNorm.dot(upAxis);
        }

        let hFactor = (vPos.y - bbox.min.y) / totalHeight;
        hFactor = Math.max(0, Math.min(1, hFactor));

        const heightAO = 0.5 + Math.pow(hFactor, 0.5) * 0.5;
        const normAO = 0.65 + (upDot * 0.5 + 0.5) * 0.35;

        const aoVal = heightAO * normAO;

        colAttr.setXYZ(i, colAttr.getX(i) * aoVal, colAttr.getY(i) * aoVal, colAttr.getZ(i) * aoVal);
        vertsProcessed++;
        
        if (vertsProcessed % CHUNK_SIZE === 0) {
            onProgress(Math.floor((vertsProcessed / totalVerts) * 100));
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    colAttr.needsUpdate = true;
  }
  onProgress(100);
}

function SceneSetup({ scene, scale }: { scene: THREE.Group | THREE.Scene, scale: number }) {
  const collisionEnabled = useStore((state) => state.collisionEnabled);
  const modelOutlines = useStore((state) => state.modelOutlines);
  const isAOBaking = useStore((state) => state.isAOBaking);
  const isFastAOBaking = useStore((state) => state.isFastAOBaking);
  const setIsAOBaking = useStore((state) => state.setIsAOBaking);
  const setIsFastAOBaking = useStore((state) => state.setIsFastAOBaking);
  const setAoBakingProgress = useStore((state) => state.setAoBakingProgress);

  useEffect(() => {
    if (isFastAOBaking && scene) {
       let canceled = false;
       fastBakeVertexAO(scene, (p) => {
           if (!canceled) setAoBakingProgress(p);
       }).then(() => {
           if (!canceled) {
             setIsFastAOBaking(false);
             setAoBakingProgress(0);
           }
       });
       return () => { canceled = true; };
    }
  }, [isFastAOBaking, scene, setIsFastAOBaking, setAoBakingProgress]);

  useEffect(() => {
    if (isAOBaking && scene) {
       let canceled = false;
       bakeVertexAO(scene, (p) => {
           if (!canceled) setAoBakingProgress(p);
       }).then(() => {
           if (!canceled) {
             setIsAOBaking(false);
             setAoBakingProgress(0);
           }
       });
       return () => { canceled = true; };
    }
  }, [isAOBaking, scene, setIsAOBaking, setAoBakingProgress]);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
          child.visible = modelOutlines;
        } else if (child instanceof THREE.Mesh) {
          child.castShadow = !inputState.isMobile;
          child.receiveShadow = !inputState.isMobile;
          
          // Draw Call / Culling Optimization
          child.frustumCulled = true;
          if (child.geometry) {
              child.geometry.computeBoundingBox();
              child.geometry.computeBoundingSphere();
          }
          
          if (child.material) {
            // Memory optimization: compress textures / don't keep raw buffer if possible
            // Basic material optimization for better lighting response
            child.material.envMapIntensity = 1;
            child.material.needsUpdate = true;
          }
        }
      });
      console.log('Model loaded', scene);
    }
  }, [scene, modelOutlines]);

  if (!collisionEnabled) {
     return (
       <Bvh firstHitOnly>
         <primitive object={scene} scale={[scale, scale, scale]} position={[0, 0, 0]} />
       </Bvh>
     );
  }

  return (
    <RigidBody key={`rb-${scale}`} type="fixed" colliders="trimesh" friction={0.2}>
      <Bvh firstHitOnly>
        <primitive object={scene} scale={[scale, scale, scale]} position={[0, 0, 0]} />
      </Bvh>
    </RigidBody>
  );
}

function GLTFModel({ url, scale }: { url: string, scale: number }) {
  const { scene } = useGLTF(url);
  useEffect(() => {
    return () => {
      useGLTF.preload(url);
    };
  }, [url]);
  return <SceneSetup scene={scene} scale={scale} />;
}

function ColladaModel({ url, scale }: { url: string, scale: number }) {
  const collada = useLoader(ColladaLoader, url);
  // ColladaLoader returns an object with a scene property inside
  return <SceneSetup scene={collada.scene} scale={scale} />;
}

export function Model({ url }: { url: string }) {
  const scale = useStore((state) => state.scale);
  const fileName = useStore((state) => state.fileName) || '';
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'dae') {
    return <ColladaModel url={url} scale={scale} />;
  }
  
  return <GLTFModel url={url} scale={scale} />;
}
