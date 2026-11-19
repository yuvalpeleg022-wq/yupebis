/**
 * ASSET PIPELINE — aircraft model source.
 *
 * The site ships with a procedural aircraft (built in code, see ./geometry.ts).
 * To use a professionally modelled aircraft instead:
 *   1. Export from Blender as GLB (+Y up, -Z forward default exporter settings are fine).
 *   2. Optionally compress:  npx gltf-transform optimize in.glb public/models/aeronix-widebody.glb --compress draco --texture-compress ktx2
 *   3. Set `url` below and tune `scale` / `rotation` / `position` so the nose points to +X,
 *      the fuselage is ~8 units long and its centre sits at the origin.
 * Draco and KTX2 decoders are served locally from /public/decoders.
 * See ASSET_REQUIREMENTS.md for the full specification.
 */
export const AIRCRAFT_MODEL = {
  url: null as string | null, // e.g. '/models/aeronix-widebody.glb'
  scale: 1,
  rotation: [0, -Math.PI / 2, 0] as [number, number, number],
  position: [0, 0, 0] as [number, number, number],
  dracoPath: `${import.meta.env.BASE_URL}decoders/draco/`,
  ktx2Path: `${import.meta.env.BASE_URL}decoders/`,
};
