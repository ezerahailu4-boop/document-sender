import { NextRequest } from "next/server";
import { POST as handleDownload, GET as handleGet } from "../route";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; versionId: string }> }
) {
  return handleDownload(req, context);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; versionId: string }> }
) {
  return handleGet(req, context);
}
