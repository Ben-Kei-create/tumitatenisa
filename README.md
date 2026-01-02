# 積み立てNISAN

AI全自動生成を前提とした2D落ち物ゲーム。

- 仕様の唯一の正本：game_spec.json
- 実装・更新はAIが行う

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` が自動的に開きます。

## 仕様変更

`game_spec.json` を編集するだけで、ゲームの仕様を変更できます。

- `brothers`: 落下物の種類
- `merge`: 合体ルール（A + A = B など）
- `canvas`: 画面サイズ
- `physics`: 物理設定（重力、床の位置など）
- `spawn`: 生成位置・速度
- `brother`: 兄のサイズ・色
- `score`: スコア設定
- `gameOver`: ゲームオーバー条件
- `controls`: 操作設定

## 画像の追加

`assets/brothers/` ディレクトリに画像を配置すると、自動的に読み込まれます。

- `A.png`: 種類Aの画像
- `B.png`: 種類Bの画像
- `C.png`: 種類Cの画像

画像が無い場合は、色付きの矩形で代替表示されます。

## ビルド

```bash
npm run build
```

`dist/` ディレクトリにビルド結果が出力されます。このディレクトリをzip化して itch.io などにアップロードできます。

## テスト

```bash
npm run test
```

spec検証とTypeScriptビルドのチェックが実行されます。

```bash
npm run validate:spec
```

spec検証のみを実行します。
