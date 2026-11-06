-- KT-19: wording for the target's side of a custom relationship.
-- custom_label = what the source is to the target; inverse_custom_label = what the
-- target is to the source. Only meaningful when type = 'custom'. RLS is unchanged.
-- (custom_label already has a <= 50 length check from the schema migration.)
alter table public.relationships
  add column inverse_custom_label text;

alter table public.relationships
  add constraint relationships_inverse_custom_label_length
    check (char_length(inverse_custom_label) <= 50),
  add constraint relationships_inverse_custom_label_only_custom
    check (inverse_custom_label is null or type = 'custom');
