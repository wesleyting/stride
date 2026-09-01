alter table public.items
  add column if not exists pin_position integer;

with ranked as (
  select id, row_number() over (
    partition by user_id, activity_id
    order by sort_order, created_at
  ) - 1 as position
  from public.items
  where is_favorite and not is_archived
)
update public.items item
set pin_position = ranked.position
from ranked
where item.id = ranked.id
  and item.pin_position is null;

create index if not exists items_user_pin_position_idx
  on public.items (user_id, activity_id, pin_position)
  where is_favorite and not is_archived;
