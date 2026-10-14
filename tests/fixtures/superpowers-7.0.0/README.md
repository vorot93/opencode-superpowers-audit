# Superpowers 7.0.0 fixtures

Unmodified upstream files from Jesse Vincent's
[Superpowers](https://github.com/obra/superpowers), licensed under MIT; see the
adjacent LICENSE. The captured package manifest declares version 7.0.0; its
package lock resolves immutable upstream revision
`bb92a77741419a4ab5f06e711a283343f1ada0c3`. Use that revision, not the package
version or a transient cache directory, to recover upstream provenance.

| Fixture | Upstream path | Original SHA-256 |
| --- | --- | --- |
| brainstorming.md | skills/brainstorming/SKILL.md | 6ee10d1481b8a2580d5336ff66c5c08acc9d4b251b13bbc3bfd31be99c261d43 |
| writing-plans.md | skills/writing-plans/SKILL.md | a6c67c1900064347c2a329990dd3c555657c51c3ec53b259a08aa01a2c26139a |

Canonical body hashes are the `supportedHashes` baseline pins in
[`src/superpowers.ts`](../../../src/superpowers.ts). They remove only leading YAML
frontmatter and normalize CRLF to LF, preserving remaining whitespace.
`tests/expected/` contains independently edited
full bodies derived from these fixtures, under the same upstream license. These
files are test data, excluded from the package; runtime never reads them.
