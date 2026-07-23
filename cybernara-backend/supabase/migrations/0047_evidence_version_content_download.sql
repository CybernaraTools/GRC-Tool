-- Store committed evidence bytes for authenticated download/preview.
--
-- Previous evidence uploads kept immutable metadata, hashes, scan records, and
-- custody events, but the uploaded bytes were only used to compute SHA-256 and
-- were not retained. This additive nullable column preserves legacy rows while
-- making every new committed evidence version retrievable through a guarded
-- download endpoint.
alter table evidence_versions add column if not exists content_bytes bytea;
