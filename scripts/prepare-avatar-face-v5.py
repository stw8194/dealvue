"""Measure facial sprite bounds and garment contours; do not repaint the source artwork."""
from pathlib import Path
from PIL import Image
import json, re, statistics
root = Path(__file__).resolve().parent.parent
mouth = Image.open(root/'assets/avatar-face-v5/mouths.png').convert('RGBA')
public=root/'public/images/playground/face-v5/mouths.webp';public.parent.mkdir(parents=True,exist_ok=True)
if not public.exists() or (root/'assets/avatar-face-v5/mouths.png').stat().st_mtime > public.stat().st_mtime:
 mouth.save(public,'WEBP',lossless=True,method=6)
crops=[]
for i in range(5):
 x0=round(i%3*mouth.width/3);x1=round((i%3+1)*mouth.width/3)
 y0=round(i//3*mouth.height/2);y1=round((i//3+1)*mouth.height/2)
 points=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if mouth.getpixel((x,y))[3]>180]
 xs,ys=zip(*points);x,y=min(xs)-4,min(ys)-4;crops.append([x,y,max(xs)+5-x,max(ys)+5-y])
paths={'base':'cute-fashion-atlas-v3.png','daily':'collection-daily.png','season':'collection-season.png','dream':'collection-dream.png','tea':'collection-tea.png','adventure':'collection-adventure.png'}
contours={}
head_contour=None
for name,atlas,cell in re.findall(r'\{ id: "([^"]+)"[^\n]*?atlas: "([^"]+)", cell: (\d+)',(root/'src/features/consumer/engagement/playground/data.ts').read_text()):
 cell=int(cell);im=Image.open(root/'public/images/playground'/paths[atlas]).convert('RGBA')
 scale_x=im.width/1536;scale_y=im.height/(1505.28 if atlas=='tea' and cell<3 else 1536)
 offset=[-37.888,-9.216,20.992][cell%3]
 points=[]
 for x in range(0,513,2):
  top=438
  for y in range(360,439):
   sx=round((x-offset+cell%3*512)*scale_x);sy=round((y+(768 if cell>=3 else 0))*scale_y)
   if not(0<=sx<im.width and 0<=sy<im.height):continue
   r,g,b,a=im.getpixel((sx,sy))
   # Old chestnut bob ends above the garment. Exclude it, retain coloured cloth and its texture.
   hair = r-g>20 and g-b>8 and r<(248 if name=="basic" else 228) and (name=="basic" or (g<r*.78 and b<g*.85))
   if a>190 and not hair:
    top=y-1;break
  points.append((x,top))
 smooth=[(x,statistics.median([y for _,y in points[max(0,i-3):i+4]])-2) for i,(x,_) in enumerate(points)]
 def path(rows):return 'M'+'L'.join(f'{x/512:.5f} {y/768:.5f}' for x,y in rows)+'L1 1H0Z'
 if name=='basic':
  # Measured collar/shoulder outline: bright hair highlights must not become garment edges.
  smooth=[(0,450),(120,440),(140,413),(150,402),(160,390),(170,377),(180,367),(190,372),(200,371),(210,370),(220,370),(230,371),(240,378),(250,383),(260,390),(270,385),(280,380),(290,371),(300,365),(310,365),(320,366),(330,371),(340,375),(350,387),(360,401),(370,413),(390,440),(512,450)]
  head_contour=path(smooth)
 def garment_top(x,y):
  floor=374+max(150-x,x-362,0)*.9 if x<150 or x>362 else 350
  return min(y-6,350) if 230<=x<=282 else max(y-6,min(floor,438))
 contours[name]=path([(x,min(y,350) if 230<=x<=282 else y) for x,y in smooth]) if name=="basic" else path([(x,garment_top(x,y)) for x,y in smooth])
(root/'src/data/avatar-face-v5.json').write_text(json.dumps({'mouths':{'source':'/images/playground/face-v5/mouths.webp','width':mouth.width,'height':mouth.height,'crops':crops},'bodyContours':contours,'headGarmentContour':head_contour},ensure_ascii=False,separators=(',',':'))+'\n')
print('Measured',len(contours),'garment contours and',len(crops),'mouth sprites')
