import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) {
    return NextResponse.json({ error: "No profile found" }, { status: 403 });
  }

  // Allow ADMIN and REGISTRY_STAFF
  if (me.role !== "ADMIN" && me.role !== "REGISTRY_STAFF") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { operationType, documentIds, parameters } = await req.json().catch(() => ({}));

  if (!operationType || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    return NextResponse.json(
      { error: "Operation type and non-empty document IDs array are required" },
      { status: 400 }
    );
  }

  // Create bulk operation log
  const bulkOperation = await prisma.bulkOperation.create({
    data: {
      operationType,
      status: "processing",
      initiatedById: me.id,
      itemCount: documentIds.length,
      parameters: parameters
        ? typeof parameters === "string"
          ? parameters
          : JSON.stringify(parameters)
        : null,
    },
  });

  let successCount = 0;
  let failureCount = 0;
  const errorLog: string[] = [];

  try {
    if (operationType === "archive") {
      // Archive all specified documents
      const docsToArchive = await prisma.document.findMany({
        where: { id: { in: documentIds } },
        select: { id: true, referenceNumber: true, status: true },
      });

      for (const doc of docsToArchive) {
        try {
          await prisma.document.update({
            where: { id: doc.id },
            data: { status: "ARCHIVED" },
          });

          await prisma.auditEvent.create({
            data: {
              documentId: doc.id,
              actorName: me.fullName,
              event: "ARCHIVED",
              detail: `Bulk archived by ${me.fullName}`,
            },
          });
          successCount++;
        } catch (e) {
          failureCount++;
          errorLog.push(`Doc ${doc.referenceNumber}: ${e instanceof Error ? e.message : "Error"}`);
        }
      }
    } else if (operationType === "restore") {
      // Restore archived documents to COMPLETED
      const docsToRestore = await prisma.document.findMany({
        where: { id: { in: documentIds }, status: "ARCHIVED" },
        select: { id: true, referenceNumber: true },
      });

      for (const doc of docsToRestore) {
        try {
          await prisma.document.update({
            where: { id: doc.id },
            data: { status: "COMPLETED" },
          });

          await prisma.auditEvent.create({
            data: {
              documentId: doc.id,
              actorName: me.fullName,
              event: "RESTORED",
              detail: `Bulk restored by ${me.fullName}`,
            },
          });
          successCount++;
        } catch (e) {
          failureCount++;
          errorLog.push(`Doc ${doc.referenceNumber}: ${e instanceof Error ? e.message : "Error"}`);
        }
      }
    } else if (operationType === "tag" && parameters?.tagId) {
      // Apply tag to all selected documents
      for (const docId of documentIds) {
        try {
          await prisma.documentTag.upsert({
            where: {
              documentId_tagId: {
                documentId: docId,
                tagId: parameters.tagId,
              },
            },
            create: {
              documentId: docId,
              tagId: parameters.tagId,
              appliedById: me.id,
            },
            update: {
              appliedAt: new Date(),
              appliedById: me.id,
            },
          });
          successCount++;
        } catch (e) {
          failureCount++;
          errorLog.push(`Doc ${docId}: ${e instanceof Error ? e.message : "Error"}`);
        }
      }
    } else {
      throw new Error(`Unsupported bulk operation: ${operationType}`);
    }

    // Complete the bulk operation record
    await prisma.bulkOperation.update({
      where: { id: bulkOperation.id },
      data: {
        status: failureCount === 0 ? "completed" : "completed_with_errors",
        completedAt: new Date(),
        successCount,
        failureCount,
        errorLog: errorLog.length > 0 ? JSON.stringify(errorLog) : null,
      },
    });

    return NextResponse.json({
      bulkOperationId: bulkOperation.id,
      success: true,
      successCount,
      failureCount,
    });
  } catch (err) {
    await prisma.bulkOperation.update({
      where: { id: bulkOperation.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorLog: JSON.stringify([err instanceof Error ? err.message : "Bulk operation failed"]),
      },
    });

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bulk operation failed" },
      { status: 500 }
    );
  }
}