import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/supabase";

export async function GET() {
  try {
    const { data: specializations, error } = (await (db as any)
      .from("specializations")
      .select("*")
      .order("created_at", { ascending: false })) as { data?: any[]; error?: any };

    if (error) {
      console.error("Get specializations query error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const response = {
      data: (specializations || []).map((spec: any) => ({
        type: "specializations",
        id: spec.id,
        attributes: {
          name: spec.name,
          code: spec.code,
          description: spec.description,
          is_active: spec.is_active,
          created_at: spec.created_at,
        },
      })),
      meta: {
        total: specializations?.length || 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get specializations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 },
      );
    }

    const payload = {
      name: body.name,
      code: String(body.code).toUpperCase(),
      description: body.description ?? null,
      is_active: true,
    };
    const { data: inserted, error } = (await (db as any)
      .from("specializations")
      .insert(payload)
      .select("*")
      .single()) as { data?: any; error?: any };

    if (error) {
      console.error("Create specialization query error:", error);
      // Unique violation code in Postgres is 23505
      if ((error as any)?.code === "23505") {
        return NextResponse.json(
          { error: "Specialization with this code already exists" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const response = {
      data: {
        type: "specializations",
        id: inserted.id,
        attributes: inserted,
      },
      meta: {
        created_at: inserted.created_at,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Create specialization error:", error);

    // handle known db error shape
    if ((error as any)?.code === "23505") {
      return NextResponse.json(
        { error: "Specialization with this code already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
