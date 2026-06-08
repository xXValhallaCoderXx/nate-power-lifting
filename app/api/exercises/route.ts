import { NextResponse, type NextRequest } from "next/server";
import { searchExercises } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchExercises(q, 30);
  return NextResponse.json(
    results.map((e) => ({
      id: e.id,
      name: e.name,
      equipment: e.equipment,
      category: e.category,
      primaryMuscles: e.primaryMuscles,
    })),
  );
}
