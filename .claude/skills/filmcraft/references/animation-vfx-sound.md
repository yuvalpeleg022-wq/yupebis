# Animation, VFX & Advanced Sound

The three technical crafts `craft-principles.md` keeps brief. Each is a whole discipline with its own pipeline, roles, and failure modes. Common thread: **all three are authored, not captured** — the animated frame, the composited shot, and the "real" location sound are all fabricated deliberately, which is exactly why they succeed or fail on intention, not luck.

---

## Part A — Animation

**The one fact that reshapes everything:** there is no camera pointed at a pre-existing reality. Wind, weight, a blink, an eyeline — all must be *authored*. Nothing is free, no happy accidents. So the craft is built on control of **timing** (how many frames an action takes = its speed/weight) and **spacing** (how the movement is distributed across those frames — even = mechanical, clustered = eased). Same timing, different spacing = completely different movement (Richard Williams, *The Animator's Survival Kit*).

**The pipeline.** Shared front end: development → **storyboards** (the *e-konte* in the Japanese/Ghibli tradition) → **visual development** (character designs, model sheets, color scripts). Then it splits:
- **2D/hand-drawn:** layout → **key animation (genga)** → **in-betweens (douga)** → cleanup → ink & color → composite.
- **3D/CG:** layout (a real virtual-camera blocking step) → **modeling** → **texturing/surfacing** → **rigging** (build the puppet — *no 2D equivalent*; in 2D you redraw every frame, in 3D you pose a pre-built rig) → animation → lighting → **rendering** (the compute-heavy step) → compositing.
2D front-loads drawing skill per frame; 3D front-loads asset/rig construction (build once, reuse) then back-loads render compute.

**The 12 principles** (Thomas & Johnston, *The Illusion of Life*, 1981): squash & stretch · anticipation · staging · straight-ahead vs. pose-to-pose · follow-through & overlapping action · slow in/slow out (ease) · arcs · secondary action · timing · exaggeration · solid drawing · appeal. These are the difference between "moving drawings" and the illusion of life.
- **Pose-to-pose** (set key extremes, then fill) = controlled, plannable, best for acting. **Straight-ahead** (frame-by-frame from the start) = fluid, spontaneous, best for fire/water/FX, but drift-prone. Pros combine them.
- **On ones** (new drawing every frame) = smoothest, most labor. **On twos** (each drawing held two frames) = the workhorse; the eye still reads it smooth. *Spider-Verse* animated leads on twos as a deliberate signature.
- **The exposure/dope/X-sheet** — the animator's frame-by-frame score: one row per frame, columns for drawing numbers, dialogue phonemes, cel layers, and camera instructions.

**The story reel / animatic** — storyboards cut to time against scratch dialogue and temp music: the first watchable version and the film's spine. Because animation is far too expensive to "fix in the edit," pacing and story are tested and rebuilt *here*, before a frame is animated. Pixar reviews its reel 8–9 times before animation starts, progressively replacing boards with layout, then blocking, then final — the animatic literally *becomes* the film.

**Studio philosophies.** **Pixar** — "early on, all our movies suck"; the fix is iterative, driven by the **Braintrust** (trusted filmmaker-peers who watch the reel and give candid notes but have *no authority to mandate changes* — the director owns the fix; candor works precisely because no one can force it). **Ghibli/Miyazaki** — works *without a finished script*; the story is discovered *through* drawing the e-konte, and he insists on **"ma"** (間, negative space/stillness — the pause that lets a film breathe: "if you just have non-stop action with no breathing space, it's just busyness"). **Laika** — hybrid stop-motion + CG cleanup + **3D-printed replacement faces** (tens of thousands per film) for subtle performance. **Anime** — the **production committee** (a consortium of publisher, network, music label, toy maker, distributor sharing risk and rights); the animation studio is usually just a contracted work-for-hire on thin margins.

**Performance without actors — the animator IS the actor.** Standard practice: film yourself acting the shot (video reference), use a desk mirror for expressions — but *push past* the reference, don't rotoscope it. The posing toolkit: **silhouette** (must read as a solid black shape), **line of action** (one dominant curve for energy), **appeal** (readability/charisma).

**Failure modes.** Floaty/weightless motion (spacing lacks acceleration/overlap) · **twinning** (unintended symmetry — both arms/brows doing the identical thing) · no follow-through (everything starts and stops on the same frame) · dead eyes (no darts, no lid/brow micro-movement) · the **uncanny valley** (Mori, 1970 — near-human realism that collapses into revulsion, e.g. *The Polar Express*'s dead eyes) · story problems the reel should have caught, ruinous to fix once animated.

---

## Part B — VFX & modern production tech

**VFX is a production methodology, not a post rescue** — it begins at script breakdown and runs to final color.

**The pipeline:** previs → plates → matchmove/track → modeling → texturing → look-dev → rigging → animation → FX sim → lighting → rendering → compositing → DI.
- **Previs/postvis** — previs blocks camera/staging/timing before the shoot; postvis drops temp CG into real plates during editorial so the cut can be judged before finals exist.
- **Plates** — the live photography VFX is built on; a **clean plate** is the empty-frame pass for paint-outs.
- **Matchmove** — reconstructs the camera's 3D motion so CG locks to the plate; a bad solve makes CG slide.
- **Modeling/texturing/look-dev** — build geometry, paint surface maps, then define physically-based shading (how skin scatters light, how metal reflects) on a neutral HDRI turntable before it hits a shot.
- **FX sim** — physics elements (destruction, fire, water, smoke) in **Houdini** (Pyro, FLIP, Vellum, RBD); big shots layer many solvers.
- **Lighting/rendering/compositing** — light CG to match the plate (using on-set HDRI), render to passes (AOVs), then **comp** integrates passes over the plate with matched grain, motion blur, defocus, and color. Comp is where integration lives or dies.

**Practical vs. digital.** The strongest approach is **hybrid**: a real object photographed under real light gives correct optics and a ground truth CG matches to. *Dune* built functional ornithopters and shot against **sandscreens** (not bluescreens) for natural bounce. *Mad Max: Fury Road* — the "all practical" reputation is a myth (~2,000 of ~2,400 shots had VFX), but the *real stunts and vehicles* are precisely what let the digital work sit invisibly. **Practical grounds CG; CG cleans and extends the practical.**

**Supervisors & on-set data.** The **VFX supervisor** (production-side represents the film; facility-side leads a vendor's artists) translates story into shot requirements and ensures the shoot captures what post needs. **On-set capture kit:** **chrome ball** (360° lighting → HDRI for image-based lighting), **grey ball** (light direction/falloff), **color chart** (accurate color/white balance), **witness cams**, **LIDAR/photogrammetry** (a digital copy of the set), and **clean plates**.

**Virtual production (the LED volume).** A camera-tracked LED wall/ceiling ("the Volume") displays a real-time 3D environment captured **in-camera** (ICVFX). ILM's **StageCraft** on *The Mandalorian* (a 270° wall + ceiling, 50%+ of S1) ran **Unreal Engine** real-time. The **inner frustum** renders the tracked camera's perspective-correct view, giving true **parallax** as the camera moves; the **"brain bar"** operators tune it between takes. Wins: real interactive light and reflections, actors see their world, shot largely finished in-camera. Limits: **moiré** (LED grid vs. sensor), color drift/metameric failure, and resolution/brightness ceilings — and it collapses without millisecond-accurate tracking.

**Motion/performance capture.** **Perfcap** = body mocap + facial + finger capture from one continuous performance. Optical marker systems (Vicon) are the gold standard; markerless trades fidelity for freedom. Andy Serkis & Weta defined it — **Gollum**, then **Caesar** and **Avatar** — the breakthrough being infrared active-LED markers so capture runs *simultaneously with live photography on set*. Great creature work is **mocap + keyframe** (mocap for human truth, keyframe for what a body can't do).

**The DI/color pipeline.** The **colorist** sets "the look" in the **DI (digital intermediate)** — the final creative image pass — in **DaVinci Resolve** (primaries = whole-image balance; secondaries/**power windows** = isolated tracked regions). **ACES** (with per-source IDTs and per-deliverable ODTs) keeps color consistent across every vendor and display. The on-set **DIT** manages the signal path and hands off a color-managed pipeline.

**Plan in prep, don't "fix it in post."** A problem solved in minutes on set (a clean plate, a tracking marker, the HDRI, the lensing) can cost weeks and dollars digitally. **Failure modes:** VFX as a crutch (spectacle the story hasn't earned) · weightless/floaty CG (bad timing, drift) · bad integration (right in isolation, wrong against the plate's light/grain/blur) · uncanny CG humans · and the systemic one — **underbidding, rushed vendor pipelines, and crunch**, where bad CG is a scheduling/labor problem wearing an aesthetic mask.

---

## Part C — Advanced sound & music

**Almost nothing you hear was captured the way you hear it.** Dialogue is re-recorded, footsteps performed months later by a stranger, a spaceship is a slowed-down lawnmower, the "location" ambience built track by track. Great film sound is **authored, not recorded**.

**The pipeline.** **Production sound** (on set: the **production sound mixer** leads, the **boom operator** works the pole, plus lav ISOs and plant mics, all bound by **timecode**) → **dialogue editing** (conform, clean, choose boom vs. lav, smooth room tone) → **ADR** ("looping" — re-performing unusable lines to picture in a booth) → **Foley** (Jack Foley's live performed sync sound, in three categories: **Feet**, **Moves** = cloth, **Specifics** = props) → **sound design/SFX** (the fabricated, non-Foley vocabulary) → **walla** (loop-group crowd murmur) → **the re-recording mix** (all elements balanced to picture on a dub stage). Deliverables: **stems = DME** (Dialogue/Music/Effects, kept separate for versioning) and the **M&E** (music & effects minus dialogue, so foreign distributors dub their own language — a **fully-filled M&E** rebuilds sounds that were hidden under the original dialogue, which is *why* clean Foley matters).

**Spotting sessions** — the team screens the cut and decides, moment by moment, where music and sound go and what they do (a **music spotting** with the composer, a **sound spotting** with the supervising sound editor).

**Roles.** Supervising sound editor (post-sound department head, often also ADR supervisor) · sound designer (fabricates the signature/non-literal sounds — the title was coined for Walter Murch on *Apocalypse Now*) · re-recording mixer (balances stems on the dub stage; big films split dialogue/music from effects) · dialogue editor · Foley artist + Foley mixer · music editor (temp tracks, spotting notes, conforms cues) · composer · orchestrator (realizes the composer's mock-up as a playable score) · music supervisor (licenses source songs).

**Mixing for formats.** A **theatrical** mix exploits a quiet calibrated room's wide dynamic range (it can whisper then peak). **Dolby Atmos** is object-based: a channel **bed** (7.1.2 — stable music/atmospheres) plus **objects** (sounds with positional metadata the renderer places in 3D) — put stable material in beds, make anything that must be pinpointed or move an object. **Loudness** all measures via **ITU-R BS.1770**: EBU R128 targets −23 LUFS (EU broadcast), ATSC A/85 −24 LKFS (US, CALM Act), streaming music ~−14 LUFS, **Netflix gates on dialogue at −27 LKFS**. The theatrical vs. streaming gap isn't science — it's the room: a quiet cinema welcomes wide dynamics, a phone in a noisy place needs a denser, louder, dialogue-protected re-mix.

**The composer's process.** Starts at spotting. Beware **"temp love"** — the film is cut against a **temp track** of existing music, and everyone grows so attached that the original score is judged against it (frame the temp as "a reference, not a contract"). Build identity from **themes/leitmotifs**; the composer delivers a MIDI **mockup** made to "sound real," the **orchestrator** realizes it for live players, and the orchestra records to picture and **click**.

**Diegetic vs. non-diegetic — and the blur.** Diegetic/source music lives in the story world (the car radio, characters hear it); non-diegetic score exists only for the audience. **Source scoring** blends them (visible trumpeters bloom into full orchestra as the camera cuts away). Modern practice blurs further — Zimmer's *Inception* "braaam" began as a scripted *story point* and is both design and score; designed drones and processed field recordings sit between sound design and music.

**Designed, not captured — the masters' method** (find an unexpected organic source, then shape it for story): **Walter Murch** — coined "sound designer"; **worldizing** (re-record a sound played through a speaker into a real space) and **"Dense Clarity, Clear Density"** (the ear parses only ~2.5 conceptual sounds at once — organize by meaning, not literalism); wrote *In the Blink of an Eye*. **Ben Burtt** — the lightsaber = idling projector motor + broken-TV feedback; R2-D2 = his own voice + synth + plumbing tube; *WALL-E*. **Skip Lievsay** (the Coens) — *No Country for Old Men* as a near-scoreless case study in tension built from effects, room tone, and silence. **Randy Thom** (Skywalker Sound) — "design a movie *for* sound" from the script stage, not bolt it on in post (*Cast Away*). Composers: **John Williams** (the Wagnerian **leitmotif** — the two-note *Jaws* motif carries dread the image withholds) · **Hans Zimmer** (soundscape-first, electronic+orchestral, the *Interstellar* organ) · **Hildur Guðnadóttir** (*Joker* cello written to the script and performed to on set; *Chernobyl* scored entirely from field recordings inside a real power plant) · **Jóhann Jóhannsson** (*Sicario*'s descending sub-bass heartbeat; *Arrival*'s tape-looped piano and treated voice).

---

## Sources
Animation — Frank Thomas & Ollie Johnston, *The Illusion of Life* · Richard Williams, *The Animator's Survival Kit* · Ed Catmull, *Creativity, Inc.* (the Braintrust) · Roger Ebert's Miyazaki interview ("ma") · Stratasys/Variety on Laika · Animation Mentor / Animator Island. VFX — CG Spectrum & mimic vfx pipeline guides · fxguide & ILM on StageCraft · befores & afters on Weta perfcap · Blackmagic/ACES · Vicon · SideFX Houdini. Sound — Netflix Partner Help (mix specs, loudness) · Dolby (beds & objects) · Transom & Krotos (Murch) · Designing Sound (Lievsay) · A Sound Effect (Foley) · Twenty Thousand Hertz (Zimmer) · named designer/composer interviews.
