-- =============================================================
-- IK FINANCE — Chat: apagar mensagens (uma ou todas)
-- Executar no Supabase: Dashboard → SQL Editor → colar → Run
-- =============================================================

-- Apagar UMA mensagem (soft delete — só o remetente pode)
create or replace function public.delete_chat_message(p_message_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid;
begin
  select sender_id into v_sender from chat_messages where id = p_message_id;

  if v_sender is null then
    return jsonb_build_object('action', 'not_found');
  end if;

  if v_sender <> p_user_id then
    return jsonb_build_object('action', 'not_owner');
  end if;

  update chat_messages
     set type = 'deleted',
         content = null,
         media_url = null,
         media_name = null,
         media_mime = null,
         media_size = null
   where id = p_message_id;

  return jsonb_build_object('action', 'deleted');
end;
$$;

-- Apagar TODAS as mensagens de uma conversa (só participantes)
create or replace function public.clear_chat_conversation(p_conversation_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from chat_participants
     where conversation_id = p_conversation_id
       and user_id = p_user_id
       and left_at is null
  ) then
    return jsonb_build_object('action', 'not_participant');
  end if;

  delete from chat_messages where conversation_id = p_conversation_id;

  return jsonb_build_object('action', 'cleared');
end;
$$;

grant execute on function public.delete_chat_message(uuid, uuid) to authenticated;
grant execute on function public.clear_chat_conversation(uuid, uuid) to authenticated;
