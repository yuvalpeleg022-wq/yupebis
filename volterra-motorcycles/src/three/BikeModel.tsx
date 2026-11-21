import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Model3D, PaintOption } from '../data/motorcycles';
import { patchPaintMaterial, srgbFromHex, type PaintUniforms } from './paintMaterial';

/** Target length (in scene units) every bike is normalised to. */
export const BIKE_LENGTH = 2.2;

interface Props {
  model: Model3D;
  paint?: PaintOption;
  onReady?: () => void;
}

/**
 * Loads a GLB, normalises its size/orientation so every motorcycle sits
 * on the floor at the origin facing +X, enables shadows and installs
 * the paint shader. Suspends while loading (wrap in <Suspense>).
 */
export function BikeModel({ model, paint, onReady }: Props) {
  const gltf = useGLTF(model.url);
  const uniformsRef = useRef<PaintUniforms[]>([]);
  const target = useRef({ mix: 0, tint: new THREE.Color(1, 1, 1), rough: 0.5, roughMix: 0, metal: 0.1, metalMix: 0 });

  const scene = useMemo(() => {
    const root = gltf.scene.clone(true);
    const uniforms: PaintUniforms[] = [];

    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const src = mesh.material as THREE.MeshStandardMaterial;
      const mat = src.clone();
      mat.envMapIntensity = 1.6;
      uniforms.push(patchPaintMaterial(mat, model));
      mesh.material = mat;
    });

    // Orient: longest horizontal axis -> X
    root.rotation.y = model.yaw;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const length = Math.max(size.x, size.z);
    const s = (BIKE_LENGTH / length) * (model.scale ?? 1);

    const wrapper = new THREE.Group();
    wrapper.add(root);
    wrapper.scale.setScalar(s);
    wrapper.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(wrapper);
    const center = b2.getCenter(new THREE.Vector3());
    root.position.x -= center.x / s;
    root.position.z -= center.z / s;
    root.position.y -= b2.min.y / s;

    uniformsRef.current = uniforms;
    return wrapper;
  }, [gltf, model]);

  // Fire once per loaded scene (ref avoids re-firing when the callback identity changes)
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => {
    onReadyRef.current?.();
  }, [scene]);

  // Release cloned materials on unmount
  useEffect(
    () => () => {
      scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m && (o as THREE.Mesh).isMesh) m.dispose();
      });
    },
    [scene],
  );

  // Update paint targets when selection changes
  useEffect(() => {
    const t = target.current;
    if (paint?.tint) {
      srgbFromHex(paint.tint, t.tint);
      t.mix = 1;
    } else {
      t.mix = 0;
    }
    t.roughMix = paint?.roughness != null && paint.tint ? 1 : 0;
    if (paint?.roughness != null) t.rough = paint.roughness;
    t.metalMix = paint?.metalness != null && paint.tint ? 1 : 0;
    if (paint?.metalness != null) t.metal = paint.metalness;
  }, [paint]);

  // Smoothly blend paint changes
  useFrame((_, delta) => {
    const t = target.current;
    const k = 1 - Math.exp(-delta * 6);
    for (const u of uniformsRef.current) {
      // When fading in a new tint from factory paint, snap the colour first
      if (u.uPaintMix.value < 0.02) u.uPaintTint.value.copy(t.tint);
      else u.uPaintTint.value.lerp(t.tint, k);
      u.uPaintMix.value += (t.mix - u.uPaintMix.value) * k;
      u.uPaintRough.value = t.rough;
      u.uPaintRoughMix.value += (t.roughMix - u.uPaintRoughMix.value) * k;
      u.uPaintMetal.value = t.metal;
      u.uPaintMetalMix.value += (t.metalMix - u.uPaintMetalMix.value) * k;
    }
  });

  return <primitive object={scene} />;
}

export function preloadBike(url: string) {
  useGLTF.preload(url);
}

export function clearBike(url: string) {
  useGLTF.clear(url);
}
