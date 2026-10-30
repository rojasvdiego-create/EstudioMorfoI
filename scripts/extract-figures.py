"""Reproduce document-figure crops. Requires PyMuPDF, only to regenerate assets.
Normal development/build uses the JPEG files already in public/figures/.
Crop rectangles refer to pixels of the image embedded in the original PDF.
No generative illustrations are used; HTML overlays add target markers.
"""
import json
from pathlib import Path
import fitz
ROOT=Path(__file__).resolve().parents[1]
source=fitz.open(ROOT/'public/source.pdf')
count=0
for group in ['bones','shoulder','forearm','hand']:
    specs=json.loads((ROOT/f'scripts/figures-{group}.json').read_text())
    for spec in specs:
        page=source[spec['sourcePage']-1]
        assert spec['sourceXref'] in [im[0] for im in page.get_images(full=True)], spec
        embedded=source.extract_image(spec['sourceXref'])
        doc=fitz.open(stream=embedded['image'],filetype=embedded['ext'])
        image_page=doc[0]
        scale_x=image_page.rect.width/embedded['width']
        scale_y=image_page.rect.height/embedded['height']
        clip=fitz.Rect(spec['crop'])*fitz.Matrix(scale_x,scale_y)
        assert image_page.rect.contains(clip),spec
        path=ROOT/'public'/spec['output'];path.parent.mkdir(parents=True,exist_ok=True)
        pix=image_page.get_pixmap(clip=clip,matrix=fitz.Matrix(1/scale_x,1/scale_y),alpha=False)
        path.write_bytes(pix.tobytes('jpeg',jpg_quality=90))
        count+=1
print(f'{count} figure crops regenerated from the study PDF.')
