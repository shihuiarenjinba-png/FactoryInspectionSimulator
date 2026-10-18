# Windowsコード担当への引き継ぎ — FactoryInspectionSimulator

GitHub正本：`https://github.com/shihuiarenjinba-png/FactoryInspectionSimulator/tree/feature/inspection-quality-economy-20261018`

## Windows PCで担当すること
1. 独立した作業フォルダにfeatureブランチをcloneし、コミットSHAを記録。mainを上書きしない。
2. `node --version`（20以上）と `npm test` を実行し、全ログ/終了コードを保存。
3. HTML試作をWindows 11のEdgeで実操作。検査率0/25/50/75/100%、作業者数、修理、校正、残業、納期遅れ、赤字、90日の継続、セーブ/読込/復元をテスト。
4. 壊れたローカルセーブを読み込ませても元JSONが無断上書きされないことを、独立したテスト用Windowsユーザープロファイルで確かめる。
5. 1366×768/1920×1080、DPI100/125/150/200%、キーボード、フォーカスと日本語表示を確認。
6. 正式な製品別Partner Center Identity/Publisher/Versionと承認ロゴが確定した場合に限り、セキュアなElectronホスト等をGitHubの作業ブランチに作り、**正規MSIX**をWindowsでビルド。EXE・ZIP・拡張子変更による偽MSIXは不可。
7. WACK、起動/更新/アンインストール/保存移行、署名、Defender、AppxManifestのIdentityを検証。リリース承認なしに公開しない。

## このタブへの返却情報
- 作業ブランチ、コミットSHA、`npm test` の全ログとActions run ID
- Windows GUI/DPIの操作結果と画面キャプチャ
- MSIX名、SHA256、Manifest Identity・Publisher・Version、WACK XML結果
- セーブ互換性、既知の欠陥と具体的な修正が必要な行動

ライセンスやストアIDを推測で埋めない。開発版のゲームは実店舗・工場の業務システムとして広告しない。
