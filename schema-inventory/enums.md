# Cybernara PostgreSQL Enums


### Enum: ai_generation_status

Values:
- `awaiting_review`
- `fallback_used`
- `approved`
- `rejected`

### Enum: ai_review_state

Values:
- `pending_review`
- `approved`
- `rejected`

### Enum: assessment_status

Values:
- `not_started`
- `in_progress`
- `submitted`
- `needs_changes`
- `approved`
- `closed`

### Enum: catalog_owner_scope

Values:
- `global`
- `tenant`

### Enum: catalog_subscription_status

Values:
- `active`
- `paused`
- `revoked`

### Enum: content_pack_status

Values:
- `quarantined`
- `staged`
- `validated`
- `review_pending`
- `published`
- `rejected`

### Enum: cybernara_classification

Values:
- `public`
- `internal`
- `confidential`
- `restricted`

### Enum: evidence_state

Values:
- `pending`
- `quarantined`
- `committed`
- `rejected`

### Enum: mapping_classification

Values:
- `mapped`
- `partial`
- `conflicting`
- `unique`

### Enum: mapping_conflict_resolution_status

Values:
- `open`
- `resolved`
- `wont_fix`

### Enum: mapping_review_decision

Values:
- `approved`
- `rejected`
- `needs_changes`

### Enum: outbox_status

Values:
- `pending`
- `processing`
- `processed`
- `dead_letter`
