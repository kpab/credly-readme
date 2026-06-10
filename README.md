# credly-readme

GitHub Action to sync your earned Credly badges into a GitHub profile README using Credly's public JSON endpoint.

Japanese documentation is available in [README.ja.md](./README.ja.md).

## Features

- Fetches badge data from the public Credly endpoint
- Updates only the README section wrapped by markers
- Commits and pushes changes only when the content actually changed
- Supports `sort`, `max_badges`, `badge_width`, and `dry_run`
- Fails without modifying the README when fetching fails or markers are missing

## Usage

To display badges on your GitHub profile, first create your profile repository named `<your-github-username>/<your-github-username>`.
The `README.md` in that repository is shown on your profile page, so add the marker section below:

```md
## Certifications
<!--START_SECTION:badges-->
<!--END_SECTION:badges-->
```

Then add a workflow to the same profile repository:

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

`actions/checkout` and `permissions: contents: write` are required.

## Profile Setup

1. Create a GitHub profile repository named `<your-github-username>/<your-github-username>`.
2. Add `<!--START_SECTION:badges-->` and `<!--END_SECTION:badges-->` to its `README.md`.
3. Add `.github/workflows/update-credly-badges.yml` and call this action with `uses: kpab/credly-readme@v1`.
4. Set `with.credly_user` to your Credly username.
5. Run the workflow once with `workflow_dispatch` or wait for the scheduled run, then confirm the README is updated.

Minimal repository layout:

```text
<your-github-username>/
├── README.md
└── .github/
    └── workflows/
        └── update-credly-badges.yml
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `credly_user` | yes | - | Credly username |
| `readme_path` | no | `README.md` | Path to the README file to update |
| `section_name` | no | `badges` | Suffix used in `START_SECTION` / `END_SECTION` markers |
| `sort` | no | `LATEST` | `LATEST`, `OLDEST`, or `NAME` |
| `max_badges` | no | `0` | Maximum number of badges to render; `0` means all |
| `badge_width` | no | `100` | Rendered image width in pixels |
| `commit_message` | no | `chore: update credly badges` | Commit message used when README changes |
| `dry_run` | no | `false` | If `true`, logs the generated section without writing or committing |
| `empty_message` | no | `No badges found.` | Fallback text when no badges are available |

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

CI is expected to run lint, tests, `ncc build`, and a generated `dist` diff check.

## Notes

- The endpoint `https://www.credly.com/users/{user}/badges.json` is an unofficial public JSON endpoint and depends on the user's public profile settings.
- If Credly changes or removes that endpoint, this action will be affected.
- The fetch logic includes a 10-second timeout and basic retries for transient network failures.
