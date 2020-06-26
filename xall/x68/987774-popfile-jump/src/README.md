# popfile-jump

ThunderbirdからPopfileのメール振り分け画面に飛ぶボタンを追加するアドオン

## ビルド

--overwrite-destをつけないと2回目のビルド以降更新されない

```bash
web-ext build --overwrite-dest  
```

Addonとして公開する場合は同じバージョンはアップし直せないので、manifest.jsonのバージョンを変えること

## Linter

インストール

```bash
npm install -g addons-linter
```

実行

```bash
addons-linter web-ext-artifacts/popfile_jump-1.0.zip
```

## MacからPopfileをアンインストールする

公式にはインストーラーに含まれているuninstall-popfileを実行する旨記載あるが、Macの最近のバージョンではこのスクリプトが実行出来ない。

dmgをマウントしてutilitiesにあるuninstall-popfileを右クリックしてパッケージの内容を表示を選び、/Contents/Resources/Scripts/main.scptを開く

AppleScriptの実行エディタが出るので再生ボタンを押すと良い
