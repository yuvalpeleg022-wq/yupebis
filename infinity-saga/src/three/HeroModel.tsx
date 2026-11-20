import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { HERO_MODEL } from '../config/assets';
import type { StoneId } from '../data/films';

export type SocketMap = Partial<Record<StoneId, THREE.Vector3>>;

/**
 * Loads the licensed hero GLB declared in src/config/assets.ts.
 * - Draco and Meshopt compression are supported by drei's useGLTF.
 * - Metal materials are tuned for the cinematic red/gold look.
 * - Socket empties (if named in config) are reported back so stones attach.
 */
export function HeroModel({ url, onSockets }: { url: string; onSockets?: (s: SocketMap) => void }) {
  const gltf = useGLTF(url, true, true);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = 1.6;
      }
    });
    scene.updateMatrixWorld(true);
    if (onSockets) {
      const out: SocketMap = {};
      (Object.keys(HERO_MODEL.stoneSockets) as StoneId[]).forEach((k) => {
        const node = scene.getObjectByName(HERO_MODEL.stoneSockets[k]);
        if (node) out[k] = node.getWorldPosition(new THREE.Vector3());
      });
      onSockets(out);
    }
  }, [scene, onSockets]);

  return (
    <primitive
      object={scene}
      scale={HERO_MODEL.scale}
      position={HERO_MODEL.position}
      rotation={[0, HERO_MODEL.rotationY, 0]}
    />
  );
}
