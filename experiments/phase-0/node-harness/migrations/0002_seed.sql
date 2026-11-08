-- Built-in rows use fixed IDs from the reserved built-in namespace (O-020, format per O-038 proposal).
INSERT INTO collection_types (id, key, is_system) VALUES
  ('4d454d30-0000-8000-8000-000000000001', 'PERSON', 1),
  ('4d454d30-0000-8000-8000-000000000002', 'SPACE', 1);
INSERT INTO categories (id, key, template_key, is_system) VALUES
  ('4d454d30-0000-8000-8001-000000000001', 'GIFT_IDEAS', 'WISHLIST', 1),
  ('4d454d30-0000-8000-8001-000000000002', 'NOTES', 'NOTE', 1);
