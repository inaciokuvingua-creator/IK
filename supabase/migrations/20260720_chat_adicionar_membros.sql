-- =============================================================
-- IK FINANCE — Chat: adicionar membros a uma conversa
-- Executar no Supabase: Dashboard → SQL Editor → colar → Run
-- =============================================================

-- Adicionar um membro a uma conversa existente.
-- Se a conversa for 'direct', converte automaticamente em 'group'.
-- Só admins (ou o criador) podem adicionar membros.
create or replace function public.add_chat_member(
  p_conversation_id uuid,
  p_requester_id    uuid,
  p_target_user_id  uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv_type      text;
  v_requester_role text;
  v_already        int;
begin
  select c.type into v_conv_type
    from chat_conversations c
   where c.id = p_conversation_id;

  if v_conv_type is null then
    return jsonb_build_object('action', 'not_found');
  end if;

  select cp.role into v_requester_role
    from chat_participants cp
   where cp.conversation_id = p_conversation_id
     and cp.user_id = p_requester_id
     and cp.left_at is null;

  if v_requester_role is null then
    return jsonb_build_object('action', 'not_participant');
  end if;

  if v_requester_role <> 'admin' then
    return jsonb_build_object('action', 'not_admin');
  end if;

  if v_conv_type = 'direct' then
    update chat_conversations set type = 'group' where id = p_conversation_id;
  end if;

  select count(*) into v_already
    from chat_participants
   where conversation_id = p_conversation_id
     and user_id = p_target_user_id;

  if v_already > 0 then
    update chat_participants
       set left_at = null, role = 'member'
     where conversation_id = p_conversation_id
       and user_id = p_target_user_id;
    return jsonb_build_object('action', 'rejoined');
  end if;

  insert into chat_participants (conversation_id, user_id, role)
  values (p_conversation_id, p_target_user_id, 'member');

  return jsonb_build_object('action', 'added');
end;
$$;

grant execute on function public.add_chat_member(uuid, uuid, uuid) to authenticated;

-- Lista os participantes ativos de uma conversa
create or replace function public.list_chat_members(p_conversation_id uuid)
returns table (
  user_id      uuid,
  nome         text,
  avatar_url   text,
  email        text,
  role         text,
  joined_at    timestamptz
)
language sql
security definer
set search_path = public
as $$
  select cp.user_id,
         coalesce(up.nome, up.email, cp.user_id::text) as nome,
         up.avatar_url,
         up.email,
         cp.role,
         cp.joined_at
    from chat_participants cp
    left join user_profiles up on up.user_id = cp.user_id
   where cp.conversation_id = p_conversation_id
     and cp.left_at is null
   order by cp.role desc, cp.joined_at asc;
$$;

grant execute on function public.list_chat_members(uuid) to authenticated;
