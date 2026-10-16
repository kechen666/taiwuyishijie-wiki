"""Generate small, embedded copies for origin-safe Canvas exports (including file://)."""
from pathlib import Path
from io import BytesIO
import base64, json
from PIL import Image

root=Path(__file__).resolve().parent
app=root/'app' if (root/'app').is_dir() else root
icons={}
for file in sorted((app/'assets/icons').glob('*.png')):
    with Image.open(file) as image:
        image=image.convert('RGBA')
        image.thumbnail((128,128),Image.Resampling.LANCZOS)
        buffer=BytesIO()
        image.save(buffer,'WEBP',quality=90,method=6)
    icons['assets/icons/'+file.name]='data:image/webp;base64,'+base64.b64encode(buffer.getvalue()).decode('ascii')
out=app/'export-icons.js'
out.write_text('const TAIWU_EXPORT_ICONS = '+json.dumps(icons,separators=(',',':'))+';\n',encoding='utf8')
print(f'Prepared {len(icons)} embedded export thumbnails, {out.stat().st_size} bytes.')
