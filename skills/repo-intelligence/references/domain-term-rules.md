# Domain Term Extraction Rules

Primary sources:
- Top-level and `src/` folder names
- API route segments
- ORM/entity/model names
- Event/topic/queue names
- TypeScript type/interface/class names

Normalization:
- lowercase
- split by `/`, `_`, `-`, camelCase boundaries
- strip generic engineering stop words (`src`, `lib`, `utils`, `common`, `api`, `service`)

Ranking:
- score by frequency across multiple source categories
- prefer terms found in at least two source categories
- cap glossary to 10-30 top terms

Output:
- include `term`, `score`, and source evidence list for each term
