import { NextRequest, NextResponse } from "next/server";
import { createServiceRequest } from "../../../db/service";

export const dynamic = "force-dynamic";

export async function POST(request:NextRequest) {
  try {
    const result=await createServiceRequest(await request.json());
    return NextResponse.json(result,{status:201});
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:"No fue posible solicitar atención."},{status:400});
  }
}
