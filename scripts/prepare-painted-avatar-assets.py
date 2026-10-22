"""Export generated paintings without resizing; record sprite bounds and rigid head registration."""
from pathlib import Path
import json
import math
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
VIEWS = ['front', 'front-quarter', 'side', 'back-quarter', 'back']
EYES = {
    'twintails': [[161.81, 311.71, 289.62, 302.06], [222.7, 311.2, 333.08, 298.03], [333.4, 306.17]],
    'waves': [[150.96, 365.03, 285.98, 354.72], [221.57, 360.28, 338.57, 347.83], [328.78, 352]],
    'bun': [[158.65, 379.26, 301.06, 375.03], [265.64, 378.66, 381.42, 368.97], [340.16, 369.54]],
    'braids': [[146.41, 323.58, 298.01, 313.28], [224.94, 320.63, 356.19, 308.15], [330.62, 311.27]],
    'pixie': [[159.57, 378.2, 298.9, 368.54], [220.46, 377.67, 342.1, 366.49], [319.07, 374.16]],
}
NECKS = {
    'twintails': [[201.83, 391.07], [220.34, 389.5]],
    'waves': [[209.56, 426.5], [211.5, 426.5]],
    'bun': [[237.62, 443.5], [241.81, 443.5]],
    'braids': [[216.97, 420.5], [235.44, 419.5]],
    'pixie': [[227.53, 434.5], [210.41, 434.5]],
}
TARGETS = [[179.63, 260.83, 327.64, 248.75], [229.86, 259.03, 357.97, 243.54]]
BOUNDS = {
    'twintails': [[24,100,414,482],[450,101,817,485],[890,99,1233,495],[24,722,390,1095],[441,722,833,1091]],
    'waves': [[9,143,423,519],[425,136,837,527],[855,139,1232,531],[10,691,391,1063],[426,689,832,1063]],
    'bun': [[8,119,440,511],[471,128,862,511],[889,127,1246,510],[45,707,426,1079],[449,712,872,1079]],
    'braids': [[13,73,428,550],[440,73,839,551],[864,76,1244,568],[13,669,423,1166],[453,682,844,1154]],
    'pixie': [[11,148,429,509],[438,148,844,509],[854,153,1238,511],[28,713,413,1070],[437,715,820,1070]],
}

def register(points, target):
    x, y, x2, y2 = points
    tx, ty, tx2, ty2 = target
    scale = math.hypot(tx2 - tx, ty2 - ty) / math.hypot(x2 - x, y2 - y)
    angle = math.atan2(ty2 - ty, tx2 - tx) - math.atan2(y2 - y, x2 - x, )
    a, b = scale * math.cos(angle), scale * math.sin(angle)
    return [a, b, -b, a, tx - a * x + b * y, ty - b * x - a * y]

def export(master, public):
    image = Image.open(master).convert('RGBA')
    public.parent.mkdir(parents=True, exist_ok=True)
    image.save(public, 'WEBP', lossless=True, method=6)
    return image

metadata = {'heads': {}, 'accessories': {}}
for name, eyes in EYES.items():
    master = ROOT / f'assets/avatar-heads-v4/no-ribbon/{name}.png'
    public = ROOT / f'public/images/playground/heads-v4/{name}.webp'
    im = export(master, public)
    matrices = [register(eyes[i], TARGETS[i]) for i in [0, 1]]
    s = math.hypot(matrices[0][0], matrices[0][1])
    x, y = eyes[2]
    matrices.append([s, 0, 0, s, 330.58 - s * x, 247.05 - s * y])
    for i, (x, y) in enumerate(NECKS[name]):
        matrices.append([s, 0, 0, s, (262 if i == 0 else 256) - s * x, 378 - s * y])
    metadata['heads'][name] = {'source': f'/images/playground/heads-v4/{name}.webp', 'width': im.width, 'height': im.height,
        'views': {view: {'cell': i, 'bounds': BOUNDS[name][i], 'matrix': [round(n, 6) for n in matrices[i]],
            **({'sourceEyes': eyes[i], 'referenceEyes': TARGETS[i]} if i < 2 else {})} for i, view in enumerate(VIEWS)}}

rows = {'hair-accessories': [0, 500, 850, 1254], 'bags': [0, 425, 800, 1254], 'earrings': [0, 415, 820, 1254], 'necklaces': [0, 490, 835, 1254]}
for name, boundaries in rows.items():
    im = export(ROOT / f'assets/avatar-accessories-v4/{name}.png', ROOT / f'public/images/playground/accessories-v4/{name}.webp')
    alpha = im.getchannel('A').load()
    crops = []
    for row in range(3):
        for col in range(4):
            left, right = round(col * im.width / 4), round((col + 1) * im.width / 4)
            top, bottom = boundaries[row], boundaries[row + 1]
            points = {(x, y) for y in range(top, bottom) for x in range(left, right) if alpha[x, y] > 180}
            largest = []
            while points:
                point = points.pop()
                pending, component = [point], [point]
                while pending:
                    x, y = pending.pop()
                    for point in [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]:
                        if point in points:
                            points.remove(point)
                            pending.append(point)
                            component.append(point)
                if len(component) > len(largest):
                    largest = component
            assert largest, f'Missing sprite: {name} {row} {col}'
            xs, ys = [p[0] for p in largest], [p[1] for p in largest]
            x, y = max(left, min(xs) - 3), max(top, min(ys) - 3)
            crops.append([x, y, min(right, max(xs) + 4) - x, min(bottom, max(ys) + 4) - y])
    metadata['accessories'][name] = {'source': f'/images/playground/accessories-v4/{name}.webp', 'width': im.width, 'height': im.height, 'crops': crops}

output = ROOT / 'src/data/avatar-art-v4.json'
output.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
print(f'Exported 5 complete-head atlases and 48 painted accessory sprites; metadata: {output.relative_to(ROOT)}')
