# Superpowers 6.4.1 fixtures

Unmodified upstream files from Jesse Vincent's Superpowers, licensed under MIT;
see the adjacent LICENSE. Source package directory at capture:
`/home/user/.cache/opencode/npm/git-superpowers-0958a5557860/1790032840807/node_modules/superpowers`.

| Fixture | Upstream path | Original SHA-256 | Body SHA-256 |
| --- | --- | --- | --- |
| brainstorming.md | skills/brainstorming/SKILL.md | a32d2255354775aa124855aa7100cf276bea096fff4ebb3a0edf57be216e6c72 | 573348866df4a1741c7a92e7e54fcbbaf61eac7fd306c6645297682736886714 |
| writing-plans.md | skills/writing-plans/SKILL.md | 0bc3d36590f7b2c323ed3ec18ff77e9f8ed57af42f5680a02b11a2d20de265cf | db6d58557ba4d445b49755705bfa2f81650fa6ea34531f5da283d688d62e8bd8 |

Body hashes remove only leading YAML frontmatter and normalize CRLF to LF,
preserving remaining whitespace. `tests/expected/` contains independently edited
full bodies derived from these fixtures, under the same upstream license. These
files are test data, excluded from the package; runtime never reads them.
