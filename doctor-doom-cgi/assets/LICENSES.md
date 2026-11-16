# Asset sources and licenses

| Asset | Source | License | Used for |
|---|---|---|---|
| Human base mesh `base.obj`, macro/regional targets, Rigify placement spec, skin weights | [MPFB2 / MakeHuman](https://github.com/makehumancommunity/mpfb2) `src/mpfb/data` (commit 9de0707) | CC0 1.0 (`LICENSE.ASSETS.md`) | Body (stage 2), rig placement + weights (stage 3) |
| Rigify | Bundled with Blender 5.1.2 | GPL (generated rigs are free to use) | Control rig (stage 3) |
| Mask base mesh + 2K PBR maps | Generated in the user's 3D AI Studio account (GPT Image 2.5 edit of the user's reference -> Prism 3.1 image-to-3D) | Per the user's 3D AI Studio terms | Mask (stage 4) |
| Procedural shaders | Written in this project | Project-owned | Look-dev |

Downloaded assets live in `assets/` (git-ignored); fetch MPFB2 data with a sparse clone of the repo above.
Doctor Doom is a Marvel character: this is a personal / fan project, not for commercial use.
