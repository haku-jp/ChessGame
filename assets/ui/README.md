# 盤・背景・枠アセット仕様 ＋ コピペプロンプト

ここに下記ファイル名で置くと反映。無ければ今の CSS 見た目にフォールバック（壊れない）。

```
assets/ui/
  background.jpg     画面全体の背景
  tile-dark.png      盤の暗マス
  tile-light.png     盤の明マス（やや明るい/紫寄り）
  board-frame.png    盤を囲む装飾枠（中央が完全透過）
```

仕様:
- background: 横長(16:9 など)・JPGでOK。**中央は暗く空けて** UI が読めるように
- tile-dark / tile-light: **正方形**・暗い黒曜石。2枚は材質を統一し明度だけ差を付ける
- board-frame: **正方形・中央が透明な額縁**・PNG(アルファ必須)。盤に 100% ストレッチされるので正方形で

---

## コピペプロンプト

### background.jpg
```
A dark fantasy battlefield temple background, vast obsidian void with faint violet nebula glow and floating embers, dim ancient runes barely lit in the gloom, deep blacks and dark purple, moody atmospheric, darker empty center with subtle vignette so UI reads clearly on top, no characters, no text, cinematic wide background plate, high detail
```
Midjourney: 末尾に `--ar 16:9`

### tile-dark.png
```
A square dark obsidian stone tile, polished black volcanic glass with subtle cracks and faint cold reflections, very dark near-black, flat top-down view, no border, no objects, no text, dark fantasy game board tile, high detail
```
Midjourney: 末尾に `--ar 1:1`

### tile-light.png
```
A square dark obsidian stone tile, polished black-violet volcanic glass with subtle cracks and faint purple reflections, slightly lighter than pure black, flat top-down view, no border, no objects, no text, dark fantasy game board tile, high detail
```
Midjourney: 末尾に `--ar 1:1`

### board-frame.png
```
An ornate golden baroque square frame, intricate dark-fantasy filigree metalwork with decorative corner flourishes, the entire center is a completely empty hollow opening, thin even border band, front flat view, isolated on a plain background, game UI border element, high detail
```
- 生成後に **中央と外側を透過**に切り抜く（中央くり抜き＋背景除去）
- Midjourney: 末尾に `--ar 1:1`

---

## ネガティブ（SD系）
```
text, watermark, signature, characters, people, chess pieces, busy clutter,
（frameのみ追加）filled center, solid middle, picture inside
```

## 確認
ファイルを置いて `index.html` をリロード。背景・盤・枠が差し替わる。
置いていない要素は今の見た目のまま（フォールバック）。
