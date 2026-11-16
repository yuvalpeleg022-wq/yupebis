# Doctor Doom - cinematic CGI character (fan project)

A rigged, armoured, cloth-simulated Doctor Doom built **entirely from Python
scripts** in headless Blender 5.1.2 (`pip install bpy==5.1.2`), one production
stage per script. Every stage opens the previous version, does one coherent
piece of work, inspects it (mesh reports, clearance checks), renders previews
and saves the next version (`work/doom_vNNN.blend`).

Doctor Doom is a Marvel character: this is a personal / fan project, not for
commercial use. Asset licences: [`assets/LICENSES.md`](assets/LICENSES.md).

## Pipeline

| Stage | Script | What it builds | Output |
|---|---|---|---|
| 1 | `s01_setup.py` | scene, units, collections, cameras, preview lights, Cycles/AgX, refs | v001 |
| 2 | `s02_body.py` | MakeHuman/MPFB2 CC0 base mesh + 44 macro/regional targets: tall muscular male, 1.90 m, all-quad, closed, symmetric | v002 |
| 3 | `s03_rig.py` | Rigify human rig (no face) placed on MPFB joints, MPFB hand-made skin weights, 4 pose tests | v003 |
| 4 | `s04a_mask_inspect.py`, `s04b_mask_fit.py` | AI mask (user ref -> GPT-image isolation -> Prism 3.1 3D) decimated, eye-aligned, size-searched for best fit, aged-steel look-dev, head-bone parented | v004 |
| 5 | `s05_undersuit.py` | padded tunic, chainmail sleeves, leather gloves, voxel-fused boots, knit cowl - all cut from the body with clean geometric cuts, real thickness, body weights, clearance passes | v005 |
| 6 | `s06_hood.py` | first hood/cape cloth pass in the hero pose (superseded by stage 10) | v006 |
| 7 | `s07_chest.py` | 6x7 tile lamellar chest plate (nested insets + knot emblem bump), 300+ rivets, straps, star / hammer medallions, hanging chain | v007 |
| 8 | `s08_arms.py` | 4-lame pauldrons, arm wraps, ribbed vambraces, glove-weighted gauntlet plates | v008 |
| 9 | `s09_waist_legs.py` | layered belt + buckle, greaves, knee cops, sabatons, toe caps, boot toe boxes | v009 |
| 10 | `s10_cloth_final.py` | final cloth in the hero pose over all armour: tunic skirt, long trailing cloak, deep hood + mantle; medallions as clasps | v010 |
| 10b | `s10b_cape_refine.py` | cloak re-simulated against a smooth collision hull + floor (long vertical folds, train) | v011 |
| 11 | `s11_render.py` | poster lighting (green rims, warm key, top spot), 1920x1080 Cycles renders, transparent background + shadow catcher | v012 |

Shared code: `doomlib.py` (versions, rendering, contact sheets, mesh reports,
aged-steel material, hero pose), `clothlib.py` (parametric garments,
collider pre-pass, simulate-and-freeze, wool/velvet).

## Running

```bash
pip install bpy==5.1.2 opencv-python-headless numpy scipy Pillow
```

MPFB2 data goes in `assets/mpfb2/` (sparse clone of `makehumancommunity/mpfb2`,
`src/mpfb/data/{3dobjs,targets,rigs,mesh_metadata,uv_layers}`), the AI mask in
`assets/ai_mask/`, references in `refs/`. Then run the stages in order, e.g.

```bash
python3 scripts/s01_setup.py
```

Cloth/render stages accept `DOOM_QUICK=1` for a 2-frame / low-res validation pass.

## Status (what is tested)

* Body: closed, all-quad, symmetric (< 0.1 mm), 1.90 m.
* Rig: generated, every vertex weighted; rest / arms-spread / elbow-fist-knee /
  twist poses rendered and checked (slight elbow volume swell at > 100 deg flex,
  covered by the vambrace).
* Garments: clearance passes against the skin; gauntlet plates deform with the glove.
* Cloth: simulated per pose (hero pose); the Cloth modifiers stay configured
  (disabled) with pin groups and collision collections for re-simulation in
  other poses. Drapes are frozen, so posing the rig far from the hero pose
  needs a re-sim.
* Not done: interactive sculpting (headless Blender has no brush strokes -
  detail comes from modelling, displacement and bump), face rig (masked),
  texture baking for game export.
