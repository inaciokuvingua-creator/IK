import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Admin-Token",
};

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Simple signed token: base64(payload) + "." + base64(hmac-sha256(payload, secret))
const TOKEN_SECRET = Deno.env.get("ADMIN_TOKEN_SECRET") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function requireEnv(value: string, name: string) {
  if (!value) throw new Error(`${name} not configured`);
  return value;
}

function serviceRoleHeaders(extra: Record<string, string> = {}) {
  const serviceRoleKey = requireEnv(SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
  return {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    ...extra,
  };
}

async function signToken(payload: object): Promise<string> {
  const data = btoa(JSON.stringify(payload));
  const tokenSecret = requireEnv(TOKEN_SECRET, "ADMIN_TOKEN_SECRET");
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(tokenSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  const sigB64 = btoa(String.fromCharCode(...sig));
  return `${data}.${sigB64}`;
}

async function verifyToken(token: string): Promise<{ adminId: string; nome: string } | null> {
  try {
    const [data, sigB64] = token.split(".");
    const tokenSecret = requireEnv(TOKEN_SECRET, "ADMIN_TOKEN_SECRET");
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(tokenSecret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sig = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(atob(data));
    if (payload.exp < Date.now()) return null;
    return { adminId: payload.adminId, nome: payload.nome };
  } catch {
    return null;
  }
}

async function requireAdmin(req: Request, admin: ReturnType<typeof createClient>) {
  const token = req.headers.get("X-Admin-Token") ?? "";
  const payload = await verifyToken(token);
  if (!payload) return null;

  const { data } = await admin.from("admin_users").select("id, nome, role, ativo").eq("id", payload.adminId).maybeSingle();
  if (!data?.ativo) return null;
  return data as { id: string; nome: string; role: string; ativo: boolean };
}

function isSuperAdmin(a: { role: string }) { return a.role === "super_admin"; }

async function logAction(
  admin: ReturnType<typeof createClient>,
  adminId: string,
  adminNome: string,
  acao: string,
  entidade: string,
  entidadeId?: string,
  detalhes?: object
) {
  await admin.from("admin_logs").insert({
    admin_id: adminId,
    admin_nome: adminNome,
    acao,
    entidade,
    entidade_id: entidadeId ?? null,
    detalhes: detalhes ?? null,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/admin-api/, "");

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    requireEnv(SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY")
  );

  try {
    // ── POST /login ───────────────────────────────────────────────────────────
    if (path === "/login" && req.method === "POST") {
      const { username, password } = await req.json();
      if (!username || !password) return err("Credenciais inválidas");

      const identifier = String(username).trim().toLowerCase();
      const query = adminClient
        .from("admin_users")
        .select("id, username, email, password_hash, nome, ativo, role");

      const { data: adminUser } = identifier.includes("@")
        ? await query.eq("email", identifier).maybeSingle()
        : await query.eq("username", identifier).maybeSingle();

      if (!adminUser) return err("Usuário ou senha incorretos", 401);
      if (!adminUser.ativo) return err("Conta suspensa. Contacte o suporte.", 403);

      const valid = await bcrypt.compare(password, adminUser.password_hash);
      if (!valid) return err("Usuário ou senha incorretos", 401);

      await adminClient.from("admin_users").update({ last_login: new Date().toISOString() }).eq("id", adminUser.id);
      await logAction(adminClient, adminUser.id, adminUser.nome, "login", "admin_users", adminUser.id, { username: identifier });

      const token = await signToken({ adminId: adminUser.id, nome: adminUser.nome, exp: Date.now() + 8 * 3600 * 1000 });
      return ok({ token, admin: { id: adminUser.id, username: adminUser.username, nome: adminUser.nome, email: adminUser.email, role: adminUser.role } });
    }

    // All routes below require authentication
    const adminUser = await requireAdmin(req, adminClient);
    if (!adminUser) return err("Não autorizado", 401);

    // ── GET /stats ────────────────────────────────────────────────────────────
    if (path === "/stats" && req.method === "GET") {
      const [usersRes, transacoesRes, cofresRes, negociosRes, patrimoniRes] = await Promise.all([
        adminClient.from("admin_users").select("id, ativo, created_at, last_login").neq("id", "00000000-0000-0000-0000-000000000000"),
        // Use auth.users via RPC for real user stats
        adminClient.rpc("get_users_stats"),
        adminClient.from("transacoes").select("id, tipo, valor, created_at, user_id"),
        adminClient.from("cofres").select("saldo, user_id"),
        adminClient.from("negocios").select("receita_mensal, despesa_mensal, user_id"),
        adminClient.from("patrimonio").select("valor_atual, user_id"),
      ]);

      // Get auth users count via admin API
      const authUsersRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users?page=1&per_page=1`,
        { headers: serviceRoleHeaders() }
      );
      const authData = authUsersRes.ok ? await authUsersRes.json() : { total: 0 };

      // Get all auth users (up to 1000)
      const authUsersAllRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users?page=1&per_page=1000`,
        { headers: serviceRoleHeaders() }
      );
      const authUsersAll = authUsersAllRes.ok ? await authUsersAllRes.json() : { users: [] };
      const users: Array<{ id: string; email: string; created_at: string; last_sign_in_at?: string; banned_until?: string }> = authUsersAll.users ?? [];

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

      const totalUsers = authData.total ?? users.length;
      const newToday = users.filter((u) => u.created_at.startsWith(today)).length;
      const newWeek = users.filter((u) => u.created_at >= weekAgo).length;
      const newMonth = users.filter((u) => u.created_at >= monthAgo).length;
      const activeMonth = users.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= monthAgo).length;

      const txs = (transacoesRes.data ?? []) as Array<{ tipo: string; valor: number; created_at: string }>;
      const totalReceitas = txs.filter((t) => t.tipo === "entrada").reduce((s, t) => s + Number(t.valor), 0);
      const totalDespesas = txs.filter((t) => t.tipo === "saida").reduce((s, t) => s + Number(t.valor), 0);
      const saldoCofres = ((cofresRes.data ?? []) as Array<{ saldo: number }>).reduce((s, c) => s + Number(c.saldo), 0);
      const lucroNegocios = ((negociosRes.data ?? []) as Array<{ receita_mensal: number; despesa_mensal: number }>)
        .reduce((s, n) => s + Number(n.receita_mensal) - Number(n.despesa_mensal), 0);

      // New users per day (last 7 days)
      const dailyNew: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000).toISOString().split("T")[0];
        dailyNew[d] = 0;
      }
      users.forEach((u) => {
        const d = u.created_at.split("T")[0];
        if (d in dailyNew) dailyNew[d]++;
      });

      return ok({
        users: { total: totalUsers, newToday, newWeek, newMonth, activeMonth },
        financeiro: { totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas + saldoCofres + lucroNegocios },
        transacoes: { total: txs.length, hoje: txs.filter((t) => t.created_at.startsWith(today)).length },
        dailyNew: Object.entries(dailyNew).map(([date, count]) => ({ date, count })),
      });
    }

    // ── GET /users ────────────────────────────────────────────────────────────
    if (path === "/users" && req.method === "GET") {
      const search = url.searchParams.get("search") ?? "";
      const page = parseInt(url.searchParams.get("page") ?? "1");
      const perPage = 20;

      const allUsersRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
        { headers: serviceRoleHeaders() }
      );
      const allData = allUsersRes.ok ? await allUsersRes.json() : { users: [], total: 0 };

      let users = allData.users ?? [];
      if (search) {
        const s = search.toLowerCase();
        users = users.filter((u: { email: string }) => u.email.toLowerCase().includes(s));
      }

      // Enrich with record counts
      const userIds = users.map((u: { id: string }) => u.id);
      const [txCounts, cofreCounts, negociosCounts] = await Promise.all([
        adminClient.from("transacoes").select("user_id").in("user_id", userIds),
        adminClient.from("cofres").select("user_id, saldo").in("user_id", userIds),
        adminClient.from("negocios").select("user_id").in("user_id", userIds),
      ]);

      const txByUser: Record<string, number> = {};
      const saldoByUser: Record<string, number> = {};
      const negociosByUser: Record<string, number> = {};

      (txCounts.data ?? []).forEach((r: { user_id: string }) => { txByUser[r.user_id] = (txByUser[r.user_id] ?? 0) + 1; });
      (cofreCounts.data ?? []).forEach((r: { user_id: string; saldo: number }) => { saldoByUser[r.user_id] = (saldoByUser[r.user_id] ?? 0) + Number(r.saldo); });
      (negociosCounts.data ?? []).forEach((r: { user_id: string }) => { negociosByUser[r.user_id] = (negociosByUser[r.user_id] ?? 0) + 1; });

      const enriched = users.map((u: { id: string; email: string; created_at: string; last_sign_in_at?: string; banned_until?: string }) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        banned: !!u.banned_until,
        transacoes: txByUser[u.id] ?? 0,
        saldo_cofres: saldoByUser[u.id] ?? 0,
        negocios: negociosByUser[u.id] ?? 0,
      }));

      return ok({ users: enriched, total: allData.total ?? users.length });
    }

    // ── GET /users/:id ────────────────────────────────────────────────────────
    if (path.startsWith("/users/") && req.method === "GET") {
      const userId = path.split("/users/")[1];
      const userRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users/${userId}`,
        { headers: serviceRoleHeaders() }
      );
      if (!userRes.ok) return err("Usuário não encontrado", 404);
      const user = await userRes.json();

      const [txs, cofres, negocios, patrimonio] = await Promise.all([
        adminClient.from("transacoes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        adminClient.from("cofres").select("*").eq("user_id", userId),
        adminClient.from("negocios").select("*").eq("user_id", userId),
        adminClient.from("patrimonio").select("*").eq("user_id", userId),
      ]);

      return ok({ user, transacoes: txs.data ?? [], cofres: cofres.data ?? [], negocios: negocios.data ?? [], patrimonio: patrimonio.data ?? [] });
    }

    // ── PUT /users/:id ────────────────────────────────────────────────────────
    if (path.startsWith("/users/") && !path.includes("/suspend") && !path.includes("/unsuspend") && req.method === "PUT") {
      const userId = path.split("/users/")[1];
      const { email } = await req.json();

      const updateRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users/${userId}`,
        {
          method: "PUT",
          headers: serviceRoleHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ email }),
        }
      );
      if (!updateRes.ok) return err("Falha ao atualizar usuário");

      await logAction(adminClient, adminUser.id, adminUser.nome, "user_edit", "auth.users", userId, { email });
      return ok({ ok: true });
    }

    // ── POST /users/:id/suspend ───────────────────────────────────────────────
    if (path.endsWith("/suspend") && req.method === "POST") {
      const userId = path.split("/users/")[1].replace("/suspend", "");
      const banUntil = new Date(Date.now() + 10 * 365 * 86400000).toISOString();

      const r = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users/${userId}`,
        {
          method: "PUT",
          headers: serviceRoleHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ ban_duration: "876000h" }),
        }
      );
      if (!r.ok) return err("Falha ao suspender usuário");
      await logAction(adminClient, adminUser.id, adminUser.nome, "user_suspend", "auth.users", userId);
      return ok({ ok: true });
    }

    // ── POST /users/:id/unsuspend ─────────────────────────────────────────────
    if (path.endsWith("/unsuspend") && req.method === "POST") {
      const userId = path.split("/users/")[1].replace("/unsuspend", "");
      const r = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users/${userId}`,
        {
          method: "PUT",
          headers: serviceRoleHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ ban_duration: "none" }),
        }
      );
      if (!r.ok) return err("Falha ao reativar usuário");
      await logAction(adminClient, adminUser.id, adminUser.nome, "user_unsuspend", "auth.users", userId);
      return ok({ ok: true });
    }

    // ── DELETE /users/:id ─────────────────────────────────────────────────────
    if (path.startsWith("/users/") && req.method === "DELETE") {
      const userId = path.split("/users/")[1];
      const r = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users/${userId}`,
        { method: "DELETE", headers: serviceRoleHeaders() }
      );
      if (!r.ok) return err("Falha ao excluir usuário");
      await logAction(adminClient, adminUser.id, adminUser.nome, "user_delete", "auth.users", userId);
      return ok({ ok: true });
    }

    // ── GET /records ──────────────────────────────────────────────────────────
    if (path === "/records" && req.method === "GET") {
      const tabela = url.searchParams.get("tabela") ?? "transacoes";
      const userId = url.searchParams.get("user_id");
      const categoria = url.searchParams.get("categoria");
      const dataInicio = url.searchParams.get("data_inicio");
      const dataFim = url.searchParams.get("data_fim");
      const page = parseInt(url.searchParams.get("page") ?? "1");
      const perPage = 30;
      const from = (page - 1) * perPage;

      let query = adminClient.from(tabela).select("*", { count: "exact" });
      if (userId) query = query.eq("user_id", userId);
      if (tabela === "transacoes") {
        if (categoria) query = query.eq("categoria", categoria);
        if (dataInicio) query = query.gte("data_transacao", dataInicio);
        if (dataFim) query = query.lte("data_transacao", dataFim);
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }
      query = query.range(from, from + perPage - 1);

      const { data, count, error } = await query;
      if (error) return err(error.message);
      return ok({ data: data ?? [], total: count ?? 0 });
    }

    // ── PUT /records/:tabela/:id ──────────────────────────────────────────────
    if (path.startsWith("/records/") && req.method === "PUT") {
      const parts = path.split("/").filter(Boolean); // ["records", tabela, id]
      const tabela = parts[1];
      const id = parts[2];
      const body = await req.json();

      const allowed = ["transacoes", "cofres", "negocios", "patrimonio"];
      if (!allowed.includes(tabela)) return err("Tabela não permitida");

      const { error } = await adminClient.from(tabela).update(body).eq("id", id);
      if (error) return err(error.message);
      await logAction(adminClient, adminUser.id, adminUser.nome, "record_edit", tabela, id, body);
      return ok({ ok: true });
    }

    // ── DELETE /records/:tabela/:id ───────────────────────────────────────────
    if (path.startsWith("/records/") && req.method === "DELETE") {
      const parts = path.split("/").filter(Boolean);
      const tabela = parts[1];
      const id = parts[2];

      const allowed = ["transacoes", "cofres", "negocios", "patrimonio"];
      if (!allowed.includes(tabela)) return err("Tabela não permitida");

      const { error } = await adminClient.from(tabela).delete().eq("id", id);
      if (error) return err(error.message);
      await logAction(adminClient, adminUser.id, adminUser.nome, "record_delete", tabela, id);
      return ok({ ok: true });
    }

    // ── GET /settings ─────────────────────────────────────────────────────────
    if (path === "/settings" && req.method === "GET") {
      const { data } = await adminClient.from("system_settings").select("*").order("chave");
      return ok(data ?? []);
    }

    // ── PUT /settings ─────────────────────────────────────────────────────────
    if (path === "/settings" && req.method === "PUT") {
      const updates: Array<{ chave: string; valor: string }> = await req.json();
      for (const u of updates) {
        await adminClient.from("system_settings").update({ valor: u.valor, updated_at: new Date().toISOString(), updated_by: adminUser.id }).eq("chave", u.chave);
      }
      await logAction(adminClient, adminUser.id, adminUser.nome, "settings_change", "system_settings", undefined, { keys: updates.map((u) => u.chave) });
      return ok({ ok: true });
    }

    // ── GET /logs ─────────────────────────────────────────────────────────────
    if (path === "/logs" && req.method === "GET") {
      const page = parseInt(url.searchParams.get("page") ?? "1");
      const perPage = 30;
      const from = (page - 1) * perPage;
      const { data, count } = await adminClient.from("admin_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + perPage - 1);
      return ok({ logs: data ?? [], total: count ?? 0 });
    }

    // ── GET /marketplace/moderation ─────────────────────────────────────────
    if (path === "/marketplace/moderation" && req.method === "GET") {
      const status = url.searchParams.get("status") ?? "pending";
      const page = parseInt(url.searchParams.get("page") ?? "1");
      const perPage = 20;
      const from = (page - 1) * perPage;
      const queueQuery = adminClient
        .from("marketplace_moderation_queue")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, from + perPage - 1);
      const reportQuery = adminClient
        .from("marketplace_reports")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, from + perPage - 1);
      if (status && status !== "all") {
        queueQuery.eq("status", status);
        reportQuery.eq("status", status === "pending" ? "open" : status);
      }
      const [{ data: queue, count: totalQueue }, { data: reports, count: totalReports }] = await Promise.all([queueQuery, reportQuery]);
      return ok({ queue: queue ?? [], reports: reports ?? [], totalQueue: totalQueue ?? 0, totalReports: totalReports ?? 0 });
    }

    // ── POST /marketplace/moderation/:id ────────────────────────────────────
    if (path.startsWith("/marketplace/moderation/") && req.method === "POST") {
      const id = path.split("/marketplace/moderation/")[1];
      const { status, note } = await req.json();
      const { error } = await adminClient.from("marketplace_moderation_queue").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id, metadata: { note } }).eq("id", id);
      if (error) return err(error.message);
      await logAction(adminClient, adminUser.id, adminUser.nome, `marketplace_${status}`, "marketplace_moderation_queue", id, { note });
      return ok({ ok: true });
    }

    // ── POST /marketplace/reports/:id ───────────────────────────────────────
    if (path.startsWith("/marketplace/reports/") && req.method === "POST") {
      const id = path.split("/marketplace/reports/")[1];
      const { status } = await req.json();
      const { error } = await adminClient.from("marketplace_reports").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id }).eq("id", id);
      if (error) return err(error.message);
      await logAction(adminClient, adminUser.id, adminUser.nome, `report_${status}`, "marketplace_reports", id);
      return ok({ ok: true });
    }

    // ── POST /change-password ─────────────────────────────────────────────────
    if (path === "/change-password" && req.method === "POST") {
      const { current_password, new_password } = await req.json();
      const { data: adminData } = await adminClient.from("admin_users").select("password_hash").eq("id", adminUser.id).maybeSingle();
      if (!adminData) return err("Admin não encontrado");
      const valid = await bcrypt.compare(current_password, adminData.password_hash);
      if (!valid) return err("Senha atual incorreta", 401);
      const newHash = await bcrypt.hash(new_password, 12);
      await adminClient.from("admin_users").update({ password_hash: newHash }).eq("id", adminUser.id);
      await logAction(adminClient, adminUser.id, adminUser.nome, "password_change", "admin_users", adminUser.id);
      return ok({ ok: true });
    }

    // ── GET /team ──────────────────────────────────────────────────────────────
    if (path === "/team" && req.method === "GET") {
      const { data } = await adminClient
        .from("admin_users")
        .select("id, username, nome, email, role, department, ativo, last_login, invite_status, created_at")
        .order("created_at");
      return ok(data ?? []);
    }

    // ── POST /team/invite ──────────────────────────────────────────────────────
    if (path === "/team/invite" && req.method === "POST") {
      if (!isSuperAdmin(adminUser)) return err("Apenas Super Admin pode convidar membros", 403);
      const { email, nome, role, department } = await req.json();
      if (!email || !nome || !role) return err("email, nome e role são obrigatórios");
      const { data, error } = await adminClient
        .from("admin_team_invites")
        .insert({ email, nome, role, department, invited_by: adminUser.id })
        .select().single();
      if (error) return err(error.message);
      await logAction(adminClient, adminUser.id, adminUser.nome, "team_invite", "admin_team_invites", data.id, { email, role });
      return ok(data);
    }

    // ── GET /team/invites ──────────────────────────────────────────────────────
    if (path === "/team/invites" && req.method === "GET") {
      const { data } = await adminClient
        .from("admin_team_invites")
        .select("*")
        .order("created_at", { ascending: false });
      return ok(data ?? []);
    }

    // ── PUT /team/:id ──────────────────────────────────────────────────────────
    if (path.startsWith("/team/") && req.method === "PUT") {
      if (!isSuperAdmin(adminUser)) return err("Apenas Super Admin pode editar membros", 403);
      const memberId = path.replace("/team/", "");
      const body = await req.json();
      const allowed: Record<string, unknown> = {};
      if (body.role)       allowed.role       = body.role;
      if (body.department !== undefined) allowed.department = body.department;
      if (typeof body.ativo === "boolean") allowed.ativo   = body.ativo;
      if (Object.keys(allowed).length === 0) return err("Nada para atualizar");
      const { data, error } = await adminClient.from("admin_users").update(allowed).eq("id", memberId).select().single();
      if (error) return err(error.message);
      await logAction(adminClient, adminUser.id, adminUser.nome, "team_edit", "admin_users", memberId, allowed);
      return ok(data);
    }

    // ── DELETE /team/:id ───────────────────────────────────────────────────────
    if (path.startsWith("/team/") && req.method === "DELETE") {
      if (!isSuperAdmin(adminUser)) return err("Apenas Super Admin pode remover membros", 403);
      const memberId = path.replace("/team/", "");
      if (memberId === adminUser.id) return err("Não pode remover a si mesmo");
      const { error } = await adminClient.from("admin_users").delete().eq("id", memberId);
      if (error) return err(error.message);
      await logAction(adminClient, adminUser.id, adminUser.nome, "team_remove", "admin_users", memberId);
      return ok({ ok: true });
    }

    // ── GET /roles ─────────────────────────────────────────────────────────────
    if (path === "/roles" && req.method === "GET") {
      const { data } = await adminClient.from("admin_roles").select("*").order("nome");
      return ok(data ?? []);
    }

    // ── PUT /roles/:id ─────────────────────────────────────────────────────────
    if (path.startsWith("/roles/") && req.method === "PUT") {
      if (!isSuperAdmin(adminUser)) return err("Apenas Super Admin pode editar cargos", 403);
      const roleId = path.replace("/roles/", "");
      const body = await req.json();
      const { data, error } = await adminClient.from("admin_roles").update({
        nome: body.nome, descricao: body.descricao, permissions: body.permissions, cor: body.cor,
      }).eq("id", roleId).select().single();
      if (error) return err(error.message);
      await logAction(adminClient, adminUser.id, adminUser.nome, "role_edit", "admin_roles", roleId);
      return ok(data);
    }

    // ── GET /company ───────────────────────────────────────────────────────────
    if (path === "/company" && req.method === "GET") {
      const [comp, depts, projs, docs] = await Promise.all([
        adminClient.from("ik_company").select("*").maybeSingle(),
        adminClient.from("ik_departments").select("*, manager:manager_id(nome)").order("nome"),
        adminClient.from("ik_projects").select("*, department:department_id(nome), responsavel:responsavel_id(nome)").order("created_at", { ascending: false }),
        adminClient.from("ik_internal_documents").select("*, autor:autor_id(nome), department:department_id(nome)").order("created_at", { ascending: false }).limit(20),
      ]);
      return ok({ company: comp.data, departments: depts.data ?? [], projects: projs.data ?? [], documents: docs.data ?? [] });
    }

    // ── PUT /company ───────────────────────────────────────────────────────────
    if (path === "/company" && req.method === "PUT") {
      if (!isSuperAdmin(adminUser)) return err("Apenas Super Admin pode editar a empresa", 403);
      const body = await req.json();
      const { data, error } = await adminClient.from("ik_company").update({ ...body, updated_at: new Date().toISOString() }).neq("id", "00000000-0000-0000-0000-000000000000").select().maybeSingle();
      if (error) return err(error.message);
      await logAction(adminClient, adminUser.id, adminUser.nome, "company_edit", "ik_company");
      return ok(data);
    }

    // ── POST /company/departments ──────────────────────────────────────────────
    if (path === "/company/departments" && req.method === "POST") {
      if (!isSuperAdmin(adminUser)) return err("Apenas Super Admin pode criar departamentos", 403);
      const body = await req.json();
      const { data, error } = await adminClient.from("ik_departments").insert(body).select().single();
      if (error) return err(error.message);
      return ok(data);
    }

    // ── POST /company/projects ─────────────────────────────────────────────────
    if (path === "/company/projects" && req.method === "POST") {
      const body = await req.json();
      const { data, error } = await adminClient.from("ik_projects").insert({ ...body, updated_at: new Date().toISOString() }).select().single();
      if (error) return err(error.message);
      await logAction(adminClient, adminUser.id, adminUser.nome, "project_create", "ik_projects", data.id, { nome: body.nome });
      return ok(data);
    }

    // ── PUT /company/projects/:id ──────────────────────────────────────────────
    if (path.startsWith("/company/projects/") && req.method === "PUT") {
      const projId = path.replace("/company/projects/", "");
      const body = await req.json();
      const { data, error } = await adminClient.from("ik_projects").update({ ...body, updated_at: new Date().toISOString() }).eq("id", projId).select().single();
      if (error) return err(error.message);
      return ok(data);
    }

    // ── POST /company/documents ────────────────────────────────────────────────
    if (path === "/company/documents" && req.method === "POST") {
      const body = await req.json();
      const { data, error } = await adminClient.from("ik_internal_documents").insert({ ...body, autor_id: adminUser.id, updated_at: new Date().toISOString() }).select().single();
      if (error) return err(error.message);
      return ok(data);
    }

    // ── GET /company/chat ──────────────────────────────────────────────────────
    if (path === "/company/chat" && req.method === "GET") {
      const tipo = url.searchParams.get("tipo") ?? "geral";
      const { data } = await adminClient.from("ik_internal_chat").select("*").eq("tipo", tipo).order("created_at", { ascending: false }).limit(50);
      return ok((data ?? []).reverse());
    }

    // ── POST /company/chat ─────────────────────────────────────────────────────
    if (path === "/company/chat" && req.method === "POST") {
      const { mensagem, tipo } = await req.json();
      if (!mensagem?.trim()) return err("Mensagem vazia");
      const { data, error } = await adminClient.from("ik_internal_chat").insert({
        admin_id: adminUser.id, admin_nome: adminUser.nome, mensagem, tipo: tipo ?? "geral",
      }).select().single();
      if (error) return err(error.message);
      return ok(data);
    }

    // ── GET /company/activity ──────────────────────────────────────────────────
    if (path === "/company/activity" && req.method === "GET") {
      const p = parseInt(url.searchParams.get("page") ?? "1");
      const limit = 30;
      const offset = (p - 1) * limit;
      const { data, count } = await adminClient.from("admin_activity_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      return ok({ logs: data ?? [], total: count ?? 0 });
    }

    // ── GET /plans/requests ────────────────────────────────────────────────────
    if (path === "/plans/requests" && req.method === "GET") {
      const statusFilter = url.searchParams.get("status") ?? "";
      const p = parseInt(url.searchParams.get("page") ?? "1");
      const limit = 30;
      const offset = (p - 1) * limit;
      let q = adminClient
        .from("plan_requests")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, count, error } = await q;
      if (error) return err(error.message);
      return ok({ requests: data ?? [], total: count ?? 0 });
    }

    // ── PUT /plans/requests/:id ────────────────────────────────────────────────
    if (path.startsWith("/plans/requests/") && req.method === "PUT") {
      const reqId = path.replace("/plans/requests/", "");
      const body = await req.json();
      const allowed: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.status)     allowed.status      = body.status;
      if (body.admin_nota !== undefined) allowed.admin_nota = body.admin_nota;
      if (body.plan)       allowed.plan        = body.plan;
      allowed.admin_id   = adminUser.id;
      allowed.admin_nome = adminUser.nome;
      allowed.reviewed_at = new Date().toISOString();

      const { data: reqData, error: reqErr } = await adminClient
        .from("plan_requests")
        .update(allowed)
        .eq("id", reqId)
        .select()
        .single();
      if (reqErr) return err(reqErr.message);

      // If approved, activate plan on user profile
      if (body.status === "approved" && reqData) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + (reqData.billing === "anual" ? 12 : 1));
        await adminClient
          .from("user_profiles")
          .update({ plan: reqData.plan, plan_expires_at: expiresAt.toISOString(), trial_active: false })
          .eq("user_id", reqData.user_id);

        await adminClient.from("plan_subscriptions").insert({
          user_id: reqData.user_id,
          plan: reqData.plan,
          preco: reqData.preco,
          moeda: reqData.moeda,
          status: "active",
          starts_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        });
      }

      await logAction(adminClient, adminUser.id, adminUser.nome, `plan_request_${body.status}`, "plan_requests", reqId, { plan: reqData?.plan, user: reqData?.user_email });
      return ok(reqData);
    }

    return err("Rota não encontrada", 404);
  } catch (e) {
    console.error("[admin-api]", e);
    return err(String(e), 500);
  }
});
