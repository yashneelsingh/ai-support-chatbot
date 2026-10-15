import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const source = "D:/Industrial Training Presentation Template [Autosaved].pptx";
const presentation = await PresentationFile.importPptx(await FileBlob.load(source));

console.log(JSON.stringify({
  slideCount: presentation.slides.items.length,
  masterCount: presentation.masters.items.length,
  layoutCount: presentation.layouts.items.length,
  masterNames: presentation.masters.items.map((m) => m.name),
  layoutNames: presentation.layouts.items.map((l) => l.name),
  layoutPlaceholders: presentation.layouts.items.map((l) => ({
    name: l.name,
    placeholders: l.placeholders.summary(),
  })),
}, null, 2));

const snapshot = await presentation.inspect({
  kind: "deck,slide,textbox,shape,layout",
  include: "id,slide,name,title,textPreview,bbox,isPlaceholder,placeholders",
  maxChars: 30000,
});
console.log(snapshot.ndjson);

for (const slideNo of [2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14]) {
  const slide = presentation.slides.getItem(slideNo - 1);
  const layout = await slide.export({ format: "layout" });
  console.log(`LAYOUT_SLIDE_${slideNo}`);
  console.log((await layout.text()).slice(0, 16000));
}
