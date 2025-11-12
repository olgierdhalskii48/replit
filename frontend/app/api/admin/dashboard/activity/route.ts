import { NextResponse } from "next/server";
import { db } from "@/lib/database/supabase";

type Activity = {
  id: string;
  type: "user_registered" | "law_firm_created" | "subscription_created";
  description: string;
  timestamp: string;
  user?: { name: string; email: string };
};

export async function GET() {
  try {
    // Get recent activities from different tables
    const [users, lawFirms, subscriptions] = await Promise.all([
      (db
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)) as unknown as Promise<{ data?: any[] }>,
      (db
        .from("law_firms")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)) as unknown as Promise<{ data?: any[] }>,
      (db
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)) as unknown as Promise<{ data?: any[] }>,
    ]);

    const activities: Activity[] = [];

    // Add user registrations
    users.data?.forEach((user: any) => {
      activities.push({
        id: `user_${user.id}`,
        type: "user_registered",
        description: `Nowy użytkownik zarejestrował się: ${user.email}`,
        timestamp: user.created_at,
        user: {
          name: user.name || (typeof user.email === "string" ? user.email.split("@")[0] : "Użytkownik"),
          email: user.email,
        },
      });
    });

    // Add law firm creations
    lawFirms.data?.forEach((firm: any) => {
      activities.push({
        id: `firm_${firm.id}`,
        type: "law_firm_created",
        description: `Nowa kancelaria została utworzona: ${firm.name}`,
        timestamp: firm.created_at,
      });
    });

    // Add subscription creations
    subscriptions.data?.forEach((sub: any) => {
      activities.push({
        id: `sub_${sub.id}`,
        type: "subscription_created",
        description: `Nowa subskrypcja: ${sub.plan_id}`,
        timestamp: sub.created_at,
      });
    });

    // Sort by timestamp and limit to 20
    const sortedActivities = activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 20);

    return NextResponse.json({ activities: sortedActivities });
  } catch (error) {
    console.error("Error fetching dashboard activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

