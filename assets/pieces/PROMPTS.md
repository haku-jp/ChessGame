# 駒スプライト用 コピペプロンプト（12枚）

各プロンプトをそのまま画像生成に貼り付け。生成後に背景を透過化し、ファイル名どおり保存。
**揃えるコツ:** 全12枚で同じ seed / スタイル参照を固定し、語尾の共通ブロックは変えない。

---

## light（象牙＋金）

### light-pawn.png
```
A single chess pawn, a small sturdy foot-soldier with a smooth domed helmet head and a simple rounded armored body, sculpted ivory and polished gold with a faint warm holy glow — dark fantasy chess game asset, ornate intricate detail, single centered object, front three-quarter view, soft top-left lighting, isolated on a plain flat neutral grey background, no base, no pedestal, no floor, no drop shadow, entire piece fully in frame, clean high-quality 3D render, consistent game icon style, square 1:1
```

### light-knight.png
```
A single chess knight, a noble armored war-horse head rearing proudly, sculpted ivory and polished gold with a faint warm holy glow — dark fantasy chess game asset, ornate intricate detail, single centered object, front three-quarter view, soft top-left lighting, isolated on a plain flat neutral grey background, no base, no pedestal, no floor, no drop shadow, entire piece fully in frame, clean high-quality 3D render, consistent game icon style, square 1:1
```

### light-bishop.png
```
A single chess bishop, a tall slender hooded figure topped with a cleft mitre, sculpted ivory and polished gold with a faint warm holy glow — dark fantasy chess game asset, ornate intricate detail, single centered object, front three-quarter view, soft top-left lighting, isolated on a plain flat neutral grey background, no base, no pedestal, no floor, no drop shadow, entire piece fully in frame, clean high-quality 3D render, consistent game icon style, square 1:1
```

### light-rook.png
```
A single chess rook, a fortified stone castle turret with crenellated battlements, sculpted ivory and polished gold with a faint warm holy glow — dark fantasy chess game asset, ornate intricate detail, single centered object, front three-quarter view, soft top-left lighting, isolated on a plain flat neutral grey background, no base, no pedestal, no floor, no drop shadow, entire piece fully in frame, clean high-quality 3D render, consistent game icon style, square 1:1
```

### light-queen.png
```
A single chess queen, a tall elegant regal figure wearing a many-pointed jeweled coronet, sculpted ivory and polished gold with a faint warm holy glow — dark fantasy chess game asset, ornate intricate detail, single centered object, front three-quarter view, soft top-left lighting, isolated on a plain flat neutral grey background, no base, no pedestal, no floor, no drop shadow, entire piece fully in frame, clean high-quality 3D render, consistent game icon style, square 1:1
```

### light-king.png
```
A single chess king, a tall commanding regal figure crowned with a cross-topped crown, sculpted ivory and polished gold with a faint warm holy glow — dark fantasy chess game asset, ornate intricate detail, single centered object, front three-quarter view, soft top-left lighting, isolated on a plain flat neutral grey background, no base, no pedestal, no floor, no drop shadow, entire piece fully in frame, clean high-quality 3D render, consistent game icon style, square 1:1
```

---

## dark（黒曜石＋紫）

### dark-pawn.png
```
A single chess pawn, a small sturdy foot-soldier with a smooth domed helmet head and a simple rounded armored body, polished obsidian black and dark amethyst purple with a faint cold arcane glow — dark fantasy chess game asset, ornate intricate detail, single centered object, front three-quarter view, soft top-left lighting, isolated on a plain flat neutral grey background, no base, no pedestal, no floor, no drop shadow, entire piece fully in frame, clean high-quality 3D render, consistent game icon style, square 1:1
```

### dark-knight.png
```
A single chess knight, a menacing armored war-horse head rearing, polished obsidian black and dark amethyst purple with a faint cold arcane glow — dark fantasy chess game asset, ornate intricate detail, single centered object, front three-quarter view, soft top-left lighting, isolated on a plain flat neutral grey background, no base, no pedestal, no floor, no drop shadow, entire piece fully in frame, clean high-quality 3D render, consistent game icon style, square 1:1
```

### dark-bishop.png
```
A single chess bishop, a tall slender hooded figure topped with a cleft mitre, polished obsidian black and dark amethyst purple with a faint cold arcane glow — dark fantasy chess game asset, ornate intricate detail, single centered object, front three-quarter view, soft top-left lighting, isolated on a plain flat neutral grey background, no base, no pedestal, no floor, no drop shadow, entire piece fully in frame, clean high-quality 3D render, consistent game icon style, square 1:1
```

### dark-rook.png
```
A single chess rook, a fortified dark stone castle turret with crenellated battlements, polished obsidian black and dark amethyst purple with a faint cold arcane glow — dark fantasy chess game asset, ornate intricate detail, single centered object, front three-quarter view, soft top-left lighting, isolated on a plain flat neutral grey background, no base, no pedestal, no floor, no drop shadow, entire piece fully in frame, clean high-quality 3D render, consistent game icon style, square 1:1
```

### dark-queen.png
```
A single chess queen, a tall elegant sinister figure wearing a many-pointed jeweled coronet, polished obsidian black and dark amethyst purple with a faint cold arcane glow — dark fantasy chess game asset, ornate intricate detail, single centered object, front three-quarter view, soft top-left lighting, isolated on a plain flat neutral grey background, no base, no pedestal, no floor, no drop shadow, entire piece fully in frame, clean high-quality 3D render, consistent game icon style, square 1:1
```

### dark-king.png
```
A single chess king, a tall imposing dark sovereign crowned with a cross-topped crown, polished obsidian black and dark amethyst purple with a faint cold arcane glow — dark fantasy chess game asset, ornate intricate detail, single centered object, front three-quarter view, soft top-left lighting, isolated on a plain flat neutral grey background, no base, no pedestal, no floor, no drop shadow, entire piece fully in frame, clean high-quality 3D render, consistent game icon style, square 1:1
```

---

## ツール別パラメータ / ネガティブ

- Midjourney 末尾に: `--ar 1:1 --style raw`（必要なら同一 `--sref` で全枚統一）
- Stable Diffusion ネガティブ:
```
base, pedestal, platform, floor, ground, shadow, multiple objects, two pieces, chessboard, text, watermark, signature, busy background, scene
```
- 透過: 生成は「plain grey background」で出し、後で remove.bg 等で背景除去 → 512×512 PNG
