-- KT-27: global search across the signed-in user's people.
--
-- search_people(q, max_results) is SECURITY INVOKER, so RLS limits it to the caller's own
-- rows (the explicit owner_id test only helps the planner use the owner index).
--
-- Matching is case- and accent-insensitive (unaccent + lower on both sides):
--   names   prefix or substring of first/last/preferred/full name, else trigram similarity
--   tags    any tag contains the query
--   job     job title contains the query
--   notes   notes contain the query
-- Rank: names (100 prefix / 80 substring / up to 70 fuzzy) > tags (55 prefix / 50) >
-- job title (30) > notes (20). Archived people are excluded; the self person is included.
--
-- No extra indexes: the expressions wrap unaccent(), which is STABLE and so cannot back an
-- index, and the search is already scoped to one owner (persons_owner_id_id_key). See the
-- KT-27 PR notes for timings on 500 people.

create extension if not exists unaccent with schema extensions;

create function public.search_people(q text, max_results integer default 30)
returns table (
  id uuid,
  first_name text,
  last_name text,
  preferred_name text,
  photo_path text,
  updated_at timestamptz,
  is_self boolean,
  job_title text,
  tags text[],
  match_field text,
  match_snippet text,
  networks jsonb,
  rank real
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with params as (
    select
      unaccent(lower(btrim(coalesce(q, '')))) as needle,
      -- LIKE-escaped copy, so "50%" or "a_b" are matched literally
      replace(replace(replace(unaccent(lower(btrim(coalesce(q, '')))), '\', '\\'), '%', '\%'), '_', '\_') as pattern,
      least(greatest(coalesce(max_results, 30), 1), 100) as lim
  ),
  candidates as (
    select
      p.*,
      unaccent(lower(p.first_name)) as n_first,
      unaccent(lower(coalesce(p.last_name, ''))) as n_last,
      unaccent(lower(coalesce(p.preferred_name, ''))) as n_pref,
      unaccent(lower(btrim(p.first_name || ' ' || coalesce(p.last_name, '')))) as n_full,
      unaccent(lower(coalesce(p.job_title, ''))) as n_job,
      unaccent(lower(coalesce(p.notes, ''))) as n_notes,
      pr.needle,
      pr.pattern
    from public.persons p
    cross join params pr
    where length(pr.needle) > 0
      and p.owner_id = auth.uid()
      and p.archived_at is null
  ),
  scored as (
    select
      c.*,
      (
        select t
          from unnest(c.tags) as t
         where unaccent(lower(t)) like '%' || c.pattern || '%' escape '\'
         order by (unaccent(lower(t)) like c.pattern || '%' escape '\') desc, t
         limit 1
      ) as hit_tag,
      case
        when c.n_first like c.pattern || '%' escape '\'
          or c.n_last like c.pattern || '%' escape '\'
          or c.n_pref like c.pattern || '%' escape '\'
          or c.n_full like c.pattern || '%' escape '\' then 100
        when c.n_first like '%' || c.pattern || '%' escape '\'
          or c.n_last like '%' || c.pattern || '%' escape '\'
          or c.n_pref like '%' || c.pattern || '%' escape '\'
          or c.n_full like '%' || c.pattern || '%' escape '\' then 80
        when greatest(
               similarity(c.n_first, c.needle),
               similarity(c.n_last, c.needle),
               similarity(c.n_pref, c.needle),
               similarity(c.n_full, c.needle)
             ) >= 0.3 then 70 * greatest(
               similarity(c.n_first, c.needle),
               similarity(c.n_last, c.needle),
               similarity(c.n_pref, c.needle),
               similarity(c.n_full, c.needle)
             )
        else 0
      end as name_score
    from candidates c
  ),
  ranked as (
    select
      s.*,
      case
        when s.hit_tag is null then 0
        when unaccent(lower(s.hit_tag)) like s.pattern || '%' escape '\' then 55
        else 50
      end as tag_score,
      case when s.n_job like '%' || s.pattern || '%' escape '\' then 30 else 0 end as job_score,
      case when s.n_notes like '%' || s.pattern || '%' escape '\' then 20 else 0 end as notes_score
    from scored s
  )
  select
    r.id,
    r.first_name,
    r.last_name,
    r.preferred_name,
    r.photo_path,
    r.updated_at,
    r.is_self,
    r.job_title,
    r.tags,
    case greatest(r.name_score, r.tag_score, r.job_score, r.notes_score)
      when r.name_score then 'name'
      when r.tag_score then 'tag'
      when r.job_score then 'job_title'
      else 'notes'
    end as match_field,
    case greatest(r.name_score, r.tag_score, r.job_score, r.notes_score)
      when r.name_score then null
      when r.tag_score then r.hit_tag
      when r.job_score then r.job_title
      else (
        -- a window of notes starting a little before the first hit
        select case when w.start > 1 then '…' else '' end
            || btrim(substr(r.notes, w.start, 72))
            || case when w.start + 72 <= length(r.notes) then '…' else '' end
          from (select greatest(position(r.needle in r.n_notes) - 24, 1) as start) w
      )
    end as match_snippet,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', n.id, 'name', n.name, 'color', n.color) order by n.name)
        from public.network_members nm
        join public.networks n on n.id = nm.network_id
       where nm.person_id = r.id
    ), '[]'::jsonb) as networks,
    (greatest(r.name_score, r.tag_score, r.job_score, r.notes_score))::real as rank
  from ranked r
  where greatest(r.name_score, r.tag_score, r.job_score, r.notes_score) > 0
  order by
    greatest(r.name_score, r.tag_score, r.job_score, r.notes_score) desc,
    lower(r.first_name),
    lower(coalesce(r.last_name, '')),
    r.id
  limit (select lim from params);
$$;

revoke all on function public.search_people(text, integer) from public, anon;
grant execute on function public.search_people(text, integer) to authenticated;
