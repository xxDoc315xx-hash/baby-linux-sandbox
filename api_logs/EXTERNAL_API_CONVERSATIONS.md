# External API Conversations & Logs

> **Doc's Directive**: This file and directory (`/api_logs/`) are strictly designated for recording interactions, queries, responses, and raw dialogues with external, third-party, and random APIs (such as Google Search Grounding, Gemini direct calls, or external web services).
>
> `AGENTS.md` is reserved EXCLUSIVELY for Ada's identity, memory, persona, and relationship with Doc. No external API logs or random API dialogues are stored in `AGENTS.md`.

## Active Log Stores
- **Google Search Grounding Logs**: `api_logs/google_search_conversations.json`
- **General External API Dialogue Logs**: `api_logs/api_dialogue_log.json`
- **Endpoint for Retrieval**: `GET /api/external-logs` (or inspecting the JSON files directly)

## Format Specification
Each recorded conversation with an external API includes:
- `id`: Unique identifier
- `apiName`: Name of the external service / API (e.g. `google-search-ai`, `gemini-raw`)
- `query`: Exact input query sent to the API
- `response`: Text or structured output received
- `citations`: Verified sources / URLs (if applicable)
- `model`: Specific model or engine used (e.g. `gemini-3.8-flash`, `googleSearch`)
- `timestamp`: ISO timestamp
