"use strict";
// Post-processes NBA_Presentation_4K.pptx and injects OOXML slide transitions.
// Run after nba_presentation.js generates the base file.

const fs   = require("fs");
const path = require("path");
const JSZip = require("jszip");

const INPUT  = path.join(__dirname, "NBA_Presentation_4K.pptx");
const OUTPUT = path.join(__dirname, "NBA_Presentation_4K.pptx");

// Per-slide transition XML fragments  (OOXML <p:transition>)
// dir: l=left, r=right, u=up, d=down
const transitions = [
  // 1 – Title: slow dark fade (thruBlk gives the "through black" cinematic effect)
  `<p:transition spd="slow"><p:fade thruBlk="1"/></p:transition>`,

  // 2 – League Overview: push up from below
  `<p:transition spd="med"><p:push dir="u"/></p:transition>`,

  // 3 – Eastern Conference: wipe right (curtain opens)
  `<p:transition spd="med"><p:wipe dir="r"/></p:transition>`,

  // 4 – Western Conference: wipe right
  `<p:transition spd="med"><p:wipe dir="r"/></p:transition>`,

  // 5 – MVP Race: smooth fade
  `<p:transition spd="med"><p:fade/></p:transition>`,

  // 6 – Scoring Elite: push from right
  `<p:transition spd="med"><p:push dir="l"/></p:transition>`,

  // 7 – Playoffs: zoom out (dramatic reveal)
  `<p:transition spd="med"><p:zoom dir="out"/></p:transition>`,

  // 8 – Team of the Year: push up
  `<p:transition spd="med"><p:push dir="u"/></p:transition>`,

  // 9 – Data & Analytics: fade
  `<p:transition spd="med"><p:fade/></p:transition>`,

  // 10 – Closing: slow cinematic fade through black
  `<p:transition spd="slow"><p:fade thruBlk="1"/></p:transition>`,
];

async function main() {
  const buf = fs.readFileSync(INPUT);
  const zip = await JSZip.loadAsync(buf);

  // Slides are numbered slide1.xml … slide10.xml but order in the presentation
  // may differ from filename number. Read ppt/presentation.xml to get the
  // canonical slide order.
  const presXml = await zip.file("ppt/presentation.xml").async("string");

  // Extract rId references in order: <p:sldId id="..." r:id="rIdN"/>
  const sldIdRe = /r:id="(rId\d+)"/g;
  const rIds = [];
  let m;
  while ((m = sldIdRe.exec(presXml)) !== null) rIds.push(m[1]);

  // Map rId → slide filename via ppt/_rels/presentation.xml.rels
  const relsXml = await zip.file("ppt/_rels/presentation.xml.rels").async("string");
  const relRe = /Id="(rId\d+)"[^>]+Target="(slides\/slide\d+\.xml)"/g;
  const ridToFile = {};
  while ((m = relRe.exec(relsXml)) !== null) ridToFile[m[1]] = m[2];

  // Build ordered list of slide file paths (skip non-slide rIds)
  const slideFiles = [];
  for (const rId of rIds) {
    const file = ridToFile[rId];
    if (file) slideFiles.push(file);
  }

  // Inject transitions in presentation order
  let injected = 0;
  for (let i = 0; i < slideFiles.length; i++) {
    const file     = slideFiles[i];
    const fullPath = `ppt/${file}`;
    let xml = await zip.file(fullPath).async("string");

    // Remove any existing transition tag first to avoid duplicates
    xml = xml.replace(/<p:transition[\s\S]*?<\/p:transition>/g, "");

    // Insert before closing </p:sld>
    const trans = transitions[i] || transitions[transitions.length - 1];
    xml = xml.replace("</p:sld>", trans + "</p:sld>");

    zip.file(fullPath, xml);
    injected++;
    console.log(`  Slide ${i + 1} (${file}): transition injected`);
  }

  // ── Also set the presentation to open in Slide Show view by default ──────
  // Modify ppt/viewProps.xml so PowerPoint opens in "normal" view but the
  // standard way to auto-start is to save as .ppsx — instead we mark the
  // last view as "sldShow" so Presenter opens the slideshow on double-click.
  const vp = zip.file("ppt/viewProps.xml");
  if (vp) {
    let vpXml = await vp.async("string");
    // Set lastView to sldShow
    vpXml = vpXml.replace(/lastView="[^"]*"/, 'lastView="sldShow"');
    // If attribute wasn't there, add it to the root element
    if (!vpXml.includes('lastView=')) {
      vpXml = vpXml.replace('<p:viewPr', '<p:viewPr lastView="sldShow"');
    }
    zip.file("ppt/viewProps.xml", vpXml);
    console.log("  viewProps.xml: lastView set to sldShow");
  }

  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  fs.writeFileSync(OUTPUT, out);
  console.log(`\nDone — ${injected} transitions injected → ${OUTPUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
