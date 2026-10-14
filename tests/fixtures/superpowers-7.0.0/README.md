# Superpowers 7.0.0 fixtures

Unmodified upstream files from Jesse Vincent's Superpowers, licensed under MIT;
see the adjacent LICENSE. Source package directory at capture:
`/home/user/.cache/opencode/npm/git-superpowers-0958a5557860/1791936921016/node_modules/superpowers`.
The package manifest declares version 7.0.0.

| Fixture | Upstream path | Original SHA-256 | Body SHA-256 |
| --- | --- | --- | --- |
| brainstorming.md | skills/brainstorming/SKILL.md | 6ee10d1481b8a2580d5336ff66c5c08acc9d4b251b13bbc3bfd31be99c261d43 | 7066acbd55d8507328effff41bcf611eafca117c5bd7b9ac7fa545096132533a |
| writing-plans.md | skills/writing-plans/SKILL.md | a6c67c1900064347c2a329990dd3c555657c51c3ec53b259a08aa01a2c26139a | 1fa01b954171b1d2b8bc0208dfbc6a01edf8a2ca715d18f76f043952e37e744f |

Body hashes remove only leading YAML frontmatter and normalize CRLF to LF,
preserving remaining whitespace. `tests/expected/` contains independently edited
full bodies derived from these fixtures, under the same upstream license. These
files are test data, excluded from the package; runtime never reads them.
