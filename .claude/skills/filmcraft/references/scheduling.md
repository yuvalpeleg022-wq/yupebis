# Building a shooting schedule

How a script becomes a set of days a crew can actually shoot. The pipeline is
the same at every tier; only the scale changes. References behind this doc:
"The Complete Film Production Handbook" (Eve Light Honthaner), the AD's working
practice codified in the DGA agreements, and the Movie Magic Scheduling model
that most first ADs and UPMs build in.

The people who own this: the **first assistant director (1st AD)** builds and
runs the schedule; the **UPM / line producer** signs off on cost; the second
AD builds the call sheets and day-out-of-days from it.

## The pipeline

Script -> breakdown -> stripboard -> day-out-of-days -> shooting schedule ->
call sheets. Each stage feeds the next; a change upstream ripples down.

### 1. Script breakdown

Go through the locked script scene by scene and tag every element that costs
money or time: cast, background/extras, stunts, vehicles, animals, props, set
dressing, wardrobe, makeup/hair, special effects, VFX, sound, music,
special equipment. Each scene becomes a **breakdown sheet** carrying: scene
number, INT/EXT, DAY/NIGHT (D/N), set/location name, a one-line synopsis, page
count, and the tagged elements. Standard color-coding for elements (cast, extras,
props, and so on) comes straight from the breakdown-sheet convention.

### 2. The 1/8-page system

Page length is measured in **eighths of a page**, because a script page is
divided into 8 for estimating. A scene that fills a third of a page is 3/8. A
scene running two and a half pages is 2 4/8. Total the eighths across the
schedule and you get the page count you must shoot; total per day and you get
the day's workload. This is the unit the whole schedule is denominated in.

### 3. Stripboard

Every scene becomes a **strip** — one horizontal band carrying scene number,
I/E, D/N, set, page count, cast numbers (each cast member gets a fixed ID
number), and location. Strips are colored by convention: white for interior
day, yellow for exterior day, blue for interior night, green for exterior
night (conventions vary by shop — state which you use). You then **reorder the
strips** into the sequence you will actually shoot, which is almost never
script order.

Black divider strips mark the end of each shooting day; a day's strips are the
scenes for that day.

### Scene-ordering logic

You reorder to cut wasted time and money. The levers, roughly in priority:

- **Group by location.** Shoot everything at a location while you are there.
  A **company move** (packing the whole unit and relocating mid-day) burns
  hours — minimize moves, and when you must move, do it once per day, ideally
  at a meal break.
- **Group by cast.** Keep expensive or day-player cast to consecutive days so
  you pay for fewer total days and fewer hold days (paid days a weekly actor
  is held but not shot).
- **Group by day/night.** Batch night scenes together; flipping a crew
  between day and night calls wrecks turnaround and morale.
- **Respect continuity and story logic** where it constrains — an actor's
  injury makeup, a burning building, weather-dependent looks.
- **Sequence dependencies.** Construction/strike order, a set that gets
  destroyed, a location only available on certain dates.

### 4. Day-out-of-days (DOOD)

A grid: cast (and other trackable elements) down the side, shooting days
across the top. Each cell marks that person's status that day — **Start,
Work, Hold, Finish** (SW, W, H, WF, SWF for a single-day player), plus travel
and idle. The DOOD tells you each actor's first and last day, total work
days, and hold days, which drives their contract and cost. It is the bridge
between the schedule and the cast budget.

### 5. Shooting schedule

The stripboard turned into a readable day-by-day document: for each shooting
day, the date, location(s), scenes in shooting order, page counts, cast
called, and notes. This is what departments prep against.

### 6. Call sheets

The daily marching order, issued the night before. Carries: call times per
person/department, the day's scenes and pages, cast with makeup/set times,
location and parking, sunrise/sunset, weather, nearest hospital, meal times,
and the next day's advance schedule. Built by the 2nd AD from the shooting
schedule.

## Rules that constrain the schedule

These come from union agreements and safety practice. Exact numbers vary by
agreement, region, and year — verify against the current SAG-AFTRA, DGA, and
IATSE agreements for your production before relying.

- **Turnaround.** Minimum rest between wrap and the next day's call, commonly
  quoted around 10 hours for cast and crew (12 on some agreements / for
  weekend-to-weekday). Break it and you owe a **forced-call penalty.**
- **Meal penalties.** Crew must be broken for a meal within a set interval
  (commonly 6 hours from call, then again 6 hours after). Run past it and you
  pay escalating per-person penalties per period. This shapes when you break,
  not just whether.
- **Meal breaks.** Typically a 30-60 minute break not counted as work time;
  a "French hours" continuous-meal arrangement is a negotiated exception.
- **Pages per day by tier.** Rough shapes, verify against your show: TV and
  low-budget features push hard, sometimes 5-8+ pages a day; mid-budget
  features often 2-4; large features with heavy coverage and VFX may do 1-2 or
  less. A single dialogue scene in a room shoots faster per page than an
  action or company-move day.
- **Night shoots.** Slower, colder, safety-sensitive, and they invert
  turnaround for following days. Batch them; give a turnaround day when
  flipping back to days.
- **Weather cover.** For exterior-dependent days, schedule a **cover set** —
  an interior scene ready to shoot if weather kills the exterior — so the day
  is not lost.
- **Child actors.** Legally limited work hours, mandatory schooling/tutoring
  time on set, and a guardian/welfare worker present; limits vary sharply by
  jurisdiction (US state law, UK, etc.). These hard-cap the day and must be
  scheduled around — verify the local rules.
- **Animals.** Humane-oversight presence (in the US, American Humane
  monitoring for the "No Animals Were Harmed" endorsement), handler time, and
  limited working windows. Budget and schedule the wrangler and rest.

## Runnable method: scene list to stripboard and DOOD

Inputs: a script breakdown or a scene list. If you only have a scene list,
first derive per scene: scene number, I/E, D/N, set/location, cast present,
and an estimated page count in eighths. If page counts are unknown, estimate
from scene length and flag the estimate.

**Step 1 — build strips.** One row per scene with number, I/E, D/N,
set/location, pages (eighths), and cast IDs. Assign each cast member a fixed
number.

**Step 2 — sort into shooting order.** Group by location first, then by
day/night within location, then pull cast-heavy scenes together to compress
each actor's span. Insert day-break dividers so each day's page total is
plausible for the tier (state the pages/day target you used). Put company
moves at a meal break and no more than one per day where possible.

**Step 3 — check the constraints.** Flag any day that would break turnaround
(a night day followed by an early call), any exterior day without a cover set,
any child/animal day against its legal window, and any day whose page count
exceeds the tier target.

**Step 4 — produce the stripboard table.** Columns: Day, Date (if known),
Scene, I/E, D/N, Set/Location, Pages, Cast, Notes. Group by shooting day with
a day subtotal of pages.

**Step 5 — produce the DOOD grid.** Cast down the side, shooting days across
the top, cells marked Start/Work/Hold/Finish. Add per-cast totals (work days,
hold days, first/last day).

**Step 6 — label assumptions.** State the pages-per-day target, any estimated
page counts, the strip-color convention used, and which union rules you
assumed. List what must be verified: current turnaround and meal-penalty
numbers for the show's agreements, local child-actor law, and location
availability dates.

Close with the note that turnaround, meal-penalty, and child-labor numbers
vary by agreement and jurisdiction and were assumed, not verified — pull the
current rules before this schedule drives real call times.
