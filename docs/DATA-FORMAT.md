# 🗃️ Data file format

You don't need this if you use **Manage Data**. It's for editing the JSON by hand, importing from another tool, or scripting changes.

All content lives in `data/` (or `DATA_DIR`). The server re-reads the files on every page load, so after editing one, refresh the browser. Only `domains.json` and `papers.json` are required. A missing file just leaves its view empty.

| File | Contents |
|------|----------|
| `config.json` | `title`, `subtitle`, `icon`, `pipelineTitle`, `pipelineSubtitle` |
| `domains.json` | `id`, `slug`, `color`, `label`, `fullLabel`, `description`, `target`, `keywords[]` |
| `papers.json` | Papers (format below) |
| `comparison.json` | `dimensions[]` (rubric column names) plus `cells[domainId][paperId][dimensionIndex] = { status, note }`. `status` is `yes`, `partial`, `note`, or `no`. A missing cell means `no` |
| `gaps.json` | `id`, `title`, `priority` (`critical`/`high`/`medium`/`low`), `status` (`open`/`partial`/`closed`), `description`, `evidence[]`, `opportunity`, `searchGuidance` |
| `citations.json` | Keyed by paper id: `{ where, label, text }` |
| `pipeline.json` | `step` (`0` = cross-cutting), `label`, `sublabel`, `color`, `domain`, `papers[]`, `note` |
| `rejected.json` | `id`, `status` (`rejected`/`removed`), `batch`, `title`, `authors`, `venue`, `year`, `reason`, optional `freedNumber` |

## 📄 A paper

```json
{
  "id": 1, "num": "01", "domain": 1, "score": 9, "caution": false,
  "title": "Long Short-Term Memory",
  "authors": "Hochreiter & Schmidhuber",
  "venue": "Neural Computation", "year": 1997,
  "doi": "10.1162/neco.1997.9.8.1735",
  "what": "...", "how": "...", "results": "...", "usage": "...",
  "tags": [{ "label": "Foundational", "type": "yes" }]
}
```

- `id` is unique across all domains. `num` is `id` padded to two digits.
- `score` is a relevance score from 1 to 10.
- Each tag's `type` is `yes` (positive), `warn` (warning), or empty (neutral).
- A paper's domain comes from its `domain` field, so `domains.json` doesn't keep its own list of papers.

## ✅ Validation

Saving from **Manage Data** checks the whole file before writing it. For example:

- ids must be unique
- scores must be from 1 to 10
- every paper's domain must exist
- you can't delete a domain that still has papers

Deleting a paper also removes its citation, comparison scores, and pipeline references. Each save keeps the previous version as `<file>.json.bak`.

Files you edit by hand aren't validated until the next save from the app, so keep them valid JSON. The server refuses to start on malformed JSON and names the file.
