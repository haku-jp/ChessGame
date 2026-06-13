# 駒スプライト仕様

ここに下記のファイル名で PNG を置くと、その駒だけ盤面で本物の見た目に変わる。
ファイルが無い駒は自動で Unicode 字にフォールバックする（壊れない）。

## 必要なファイル（まず12枚）

```
assets/pieces/
  light-pawn.png
  light-knight.png
  light-bishop.png
  light-rook.png
  light-queen.png
  light-king.png
  dark-pawn.png
  dark-knight.png
  dark-bishop.png
  dark-rook.png
  dark-queen.png
  dark-king.png
```

- 特殊駒（Spear/Shield Pawn, War Knight）は **基本駒のスプライトを流用**する。
  （見分けは盤面側の色リングで付くので、専用画像は今は不要）

## 各画像の仕様（ここが揃っていないとバラつく）

| 項目 | 指定 |
|---|---|
| サイズ | 512×512 px（正方形） |
| 形式 | PNG・**背景は完全透過（アルファ付き）** |
| 内容 | **駒の figure だけ**。台座・床・影・円盤は描かない（UI側の光る円盤に乗せる） |
| 構図 | 1体を中央、キャンバスの約80%サイズ。全駒で**同じスケール**（King が一番大きい等の相対差は付けてOKだが画角は統一） |
| 視点 | 全駒で統一（正面 or 軽い3/4） |
| ライティング | 全駒で統一（左上から） |
| light陣営 | 象牙＋金（#e9d8a6 / #f1cf85 系）、神聖な質感 |
| dark陣営 | 紫＋黒曜石（#6c4ab3 / #2a1a44 系）、闇の質感 |
| 画風 | ダークファンタジー。モック画像と同じ「3D風レンダ／厚塗り」 |

## 揃えるコツ（最重要）

AI生成でバラつかせないために:

1. **同じプロンプト骨格＋同じスタイル指定**で全12枚を回す
2. 可能なら **同一 seed / スタイル参照画像** を固定
3. 「**isolated on plain background, no base, no shadow**」を必ず入れる
4. 生成後に背景を透過化（remove.bg等）してサイズ・位置を揃える
5. light/dark は **材質ワードだけ差し替え**て、構図・画角・ライティングは同一に

## プロンプト雛形（{ }を差し替え）

```
A single {king} chess piece, dark fantasy game asset, {ivory and gold ornate}
material, intricate detail, centered single object, front three-quarter view,
soft top-left lighting, isolated on plain neutral background, no base platform,
no floor, no drop shadow, high quality render, consistent game icon style
```

- light陣営: `{ivory and gold ornate}` / 闇なら `{obsidian and purple, dark arcane}`
- `{king}` を pawn / knight / bishop / rook / queen / king に差し替えて12枚

## 確認

PNGを置いたら `prototype-v1/index.html` をリロード。
その駒だけ画像に変われば成功（残りは字のまま＝正常なフォールバック）。
