# credly-readme

Credly の公開 JSON を使って、取得済みバッジを GitHub プロフィール README に自動反映する GitHub Action です。

## Features

- Credly 公開エンドポイントからバッジ一覧を取得
- README マーカー区間だけを安全に置換
- 差分があるときだけ commit / push
- `sort` / `max_badges` / `badge_width` / `dry_run` に対応
- fetch 失敗時やマーカー不在時は README を変更せず失敗終了

## Usage

README に対象マーカーを置いてください。

```md
## Certifications
<!--START_SECTION:badges-->
<!--END_SECTION:badges-->
```

利用側 workflow 例です。

```yaml
name: Update Credly Badges
on:
  schedule:
    - cron: "0 2 * * *"
  workflow_dispatch:
permissions:
  contents: write
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: kpab/credly-readme@v1
        with:
          credly_user: <your-credly-username>
          sort: LATEST
          badge_width: 100
```

`actions/checkout` と `permissions: contents: write` は必須です。

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `credly_user` | yes | - | Credly のユーザー名 |
| `readme_path` | no | `README.md` | 更新対象 README |
| `section_name` | no | `badges` | `START_SECTION` / `END_SECTION` の接尾辞 |
| `sort` | no | `LATEST` | `LATEST` / `OLDEST` / `NAME` |
| `max_badges` | no | `0` | 表示上限。`0` は全件 |
| `badge_width` | no | `100` | 画像幅 |
| `commit_message` | no | `chore: update credly badges` | commit message |
| `dry_run` | no | `false` | `true` なら書き込み・commit なし |
| `empty_message` | no | `No badges found.` | バッジ 0 件時の表示文言 |

## Development

```text
src/
  credly.ts
  render.ts
  readme.ts
  git.ts
  index.ts
tests/
  render.test.ts
  readme.test.ts
```

CI では lint / test / `ncc build` / `dist` 差分確認を行います。

## Notes

- 使用エンドポイント `https://www.credly.com/users/{user}/badges.json` は公開状態に依存する非公式な JSON です。
- エンドポイント仕様変更や停止が起きた場合、この Action も影響を受けます。
- ネットワーク障害に備えて 10 秒タイムアウトと簡易リトライを入れています。
