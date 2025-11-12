import { NextResponse } from "next/server";
import { db } from "@/lib/database/supabase";

export async function GET() {
  try {
    // Get users stats
    const { data: users } = (await (db as any)
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })) as { data?: any[] };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const userStats = {
      total: users?.length || 0,
      active: users?.filter((u) => u.status === "active").length || 0,
      newThisMonth:
        users?.filter((u) => new Date(u.created_at) >= startOfMonth).length ||
        0,
      byRole: {
        clients: users?.filter((u) => u.role === "client").length || 0,
        admins: users?.filter((u) => u.role === "admin").length || 0,
        operators: users?.filter((u) => u.role === "operator").length || 0,
        lawyers: 0, // not present in enum; keep for UI compatibility
      },
    };

    // Get law firms stats
    const { data: lawFirms } = (await (db as any)
      .from("law_firms")
      .select("*")
      .order("created_at", { ascending: false })) as { data?: any[] };

    const lawFirmStats = {
      total: lawFirms?.length || 0,
      active: lawFirms?.filter((f) => f.is_active).length || 0,
      verified: 0, // no is_verified column in current schema
      newThisMonth:
        lawFirms?.filter((f) => new Date(f.created_at) >= startOfMonth)
          .length || 0,
    };

    // Get subscriptions stats
    const { data: subscriptions } = (await (db as any)
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false })) as { data?: any[] };

    const subscriptionStats = {
      total: subscriptions?.length || 0,
      active: subscriptions?.filter((s) => s.status === "active").length || 0,
      trial: 0, // no trial status in current enum
      revenue:
        subscriptions?.reduce((sum, s) => sum + (s.price || 0), 0) || 0,
    };

    // API usage stats placeholder (table may not exist in typed schema)
    const apiStats = {
      totalCalls: 0,
      todayCalls: 0,
      avgResponseTime: 0,
    };

    return NextResponse.json({
      users: userStats,
      lawFirms: lawFirmStats,
      subscriptions: subscriptionStats,
      apiUsage: apiStats,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

