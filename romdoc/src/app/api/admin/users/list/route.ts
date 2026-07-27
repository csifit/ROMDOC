import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { requirePlatformOperatorAal2Api } from "@/lib/auth/require-platform-operator-aal2-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ALLOWED_PAGE_SIZES = new Set([10, 25, 50]);
const ALLOWED_ROLES = new Set([
  "patient",
  "doctor_applicant",
  "doctor",
  "staff",
  "clinic_manager",
  "manager",
  "admin",
]);
const ALLOWED_STATUSES = new Set(["active", "blocked"]);

type ProfileRecord = {
  id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  account_status: string;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string;
};

type Metrics = {
  total: number;
  active: number;
  blocked: number;
};

type ApiLocale = "ro" | "en" | "de";

const LOAD_ERROR = {
  ro: "Utilizatorii nu au putut fi încărcați.",
  en: "The users could not be loaded.",
  de: "Die Benutzer konnten nicht geladen werden.",
} as const;

function normalizeLocale(value: string | null): ApiLocale {
  return value === "en" || value === "de" ? value : "ro";
}

function integerParameter(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function normalizeSearch(value: string | null) {
  return (value ?? "").trim().slice(0, 120).toLocaleLowerCase();
}

function authSearchValues(user: User | undefined) {
  const metadata = user?.user_metadata ?? {};
  return [
    user?.email,
    user?.phone,
    typeof metadata.first_name === "string" ? metadata.first_name : null,
    typeof metadata.last_name === "string" ? metadata.last_name : null,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLocaleLowerCase());
}

function profileSearchValues(profile: ProfileRecord) {
  return [
    profile.first_name,
    profile.last_name,
    [profile.first_name, profile.last_name].filter(Boolean).join(" "),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLocaleLowerCase());
}

async function listAllAuthUsers() {
  const admin = createAdminClient();
  const users: User[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

async function loadMetrics(): Promise<Metrics> {
  const admin = createAdminClient();
  const [totalResult, activeResult, blockedResult] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("account_status", "active"),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("account_status", "blocked"),
  ]);

  const error = totalResult.error ?? activeResult.error ?? blockedResult.error;
  if (error) throw error;

  return {
    total: totalResult.count ?? 0,
    active: activeResult.count ?? 0,
    blocked: blockedResult.count ?? 0,
  };
}

export async function GET(request: NextRequest) {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  const parameters = request.nextUrl.searchParams;
  const locale = normalizeLocale(parameters.get("locale"));
  const requestedPage = integerParameter(parameters.get("page"), 1);
  const requestedPageSize = integerParameter(parameters.get("pageSize"), 25);
  const pageSize = ALLOWED_PAGE_SIZES.has(requestedPageSize)
    ? requestedPageSize
    : 25;
  const role = parameters.get("role") ?? "all";
  const status = parameters.get("status") ?? "all";
  const search = normalizeSearch(parameters.get("search"));
  const admin = createAdminClient();

  try {
    const metricsPromise = loadMetrics();
    let profiles: ProfileRecord[] = [];
    let totalItems = 0;
    let authMap = new Map<string, User>();
    let page = requestedPage;

    if (search) {
      let allProfilesQuery = admin
        .from("profiles")
        .select(
          "id, role, first_name, last_name, account_status, blocked_at, blocked_reason, created_at"
        );

      if (ALLOWED_ROLES.has(role)) {
        allProfilesQuery = allProfilesQuery.eq("role", role);
      }

      if (ALLOWED_STATUSES.has(status)) {
        allProfilesQuery = allProfilesQuery.eq("account_status", status);
      }

      const [allProfilesResult, authUsers] = await Promise.all([
        allProfilesQuery,
        listAllAuthUsers(),
      ]);

      if (allProfilesResult.error) throw allProfilesResult.error;
      authMap = new Map(authUsers.map((user) => [user.id, user]));

      const matchingProfiles = (
        (allProfilesResult.data ?? []) as ProfileRecord[]
      )
        .filter((profile) => {
          const authUser = authMap.get(profile.id);
          return [...profileSearchValues(profile), ...authSearchValues(authUser)].some(
            (value) => value.includes(search)
          );
        })
        .sort(
          (first, second) =>
            new Date(second.created_at).getTime() -
            new Date(first.created_at).getTime()
        );

      totalItems = matchingProfiles.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      page = Math.min(requestedPage, totalPages);
      const from = (page - 1) * pageSize;
      profiles = matchingProfiles.slice(from, from + pageSize);
    } else {
      let countQuery = admin
        .from("profiles")
        .select("id", { count: "exact", head: true });

      if (ALLOWED_ROLES.has(role)) {
        countQuery = countQuery.eq("role", role);
      }

      if (ALLOWED_STATUSES.has(status)) {
        countQuery = countQuery.eq("account_status", status);
      }

      const countResult = await countQuery;
      if (countResult.error) throw countResult.error;
      totalItems = countResult.count ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      page = Math.min(requestedPage, totalPages);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let pageQuery = admin
        .from("profiles")
        .select(
          "id, role, first_name, last_name, account_status, blocked_at, blocked_reason, created_at"
        )
        .order("created_at", { ascending: false });

      if (ALLOWED_ROLES.has(role)) {
        pageQuery = pageQuery.eq("role", role);
      }

      if (ALLOWED_STATUSES.has(status)) {
        pageQuery = pageQuery.eq("account_status", status);
      }

      const pageResult = await pageQuery.range(from, to);

      if (pageResult.error) throw pageResult.error;
      profiles = (pageResult.data ?? []) as ProfileRecord[];

      const authResults = await Promise.all(
        profiles.map(async (profile) => {
          const { data, error } = await admin.auth.admin.getUserById(profile.id);
          if (error) {
            console.error("Paginated user authentication lookup failed:", error);
            return [profile.id, null] as const;
          }
          return [profile.id, data.user] as const;
        })
      );

      authMap = new Map(
        authResults.filter(
          (entry): entry is readonly [string, User] => Boolean(entry[1])
        )
      );
    }

    const users = profiles.map((profile) => {
      const authUser = authMap.get(profile.id);
      return {
        id: profile.id,
        email: authUser?.email ?? null,
        phone: authUser?.phone ?? null,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role,
        account_status: profile.account_status,
        email_verified: Boolean(authUser?.email_confirmed_at),
        email_confirmed_at: authUser?.email_confirmed_at ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        created_at: profile.created_at,
        blocked_at: profile.blocked_at,
        blocked_reason: profile.blocked_reason,
        is_current_admin:
          profile.id === authorization.profileId && authorization.role === "admin",
        is_current_operator: profile.id === authorization.profileId,
      };
    });

    const metrics = await metricsPromise;

    return NextResponse.json(
      {
        users,
        metrics,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
        },
        operatorRole: authorization.role,
        capabilities: {
          canSuspendUsers: true,
          canChangePrivilegedRoles: authorization.role === "admin",
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Paginated platform users query failed:", error);
    return NextResponse.json(
      {
        code: "users_paginated_load_failed",
        error: LOAD_ERROR[locale],
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
