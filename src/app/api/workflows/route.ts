import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) {
    return NextResponse.json({ error: "No profile found" }, { status: 403 });
  }

  // Only allow admins and department heads to list workflows
  const allowedRoles = ["ADMIN", "DEPARTMENT_HEAD"];
  if (!allowedRoles.includes(me.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const workflows = await prisma.workflowDefinition.findMany({
    where: { isActive: true },
    include: {
      rules: {
        orderBy: { ruleOrder: "asc" }
      }
    },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ workflows });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { name, description, rules } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Workflow name is required" }, { status: 400 });
  }

  // Check if workflow already exists
  const existingWorkflow = await prisma.workflowDefinition.findFirst({ where: { name } });
  if (existingWorkflow) {
    return NextResponse.json({ error: "Workflow with this name already exists" }, { status: 400 });
  }

  // Create workflow and rules in a transaction
  const workflow = await prisma.$transaction(async (tx) => {
    const wf = await tx.workflowDefinition.create({
      data: {
        name,
        description: description || null,
        isActive: true
      }
    });

    // Create rules if provided
    if (rules && Array.isArray(rules)) {
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (rule.condition && rule.actionType) {
          await tx.workflowRule.create({
            data: {
              workflowId: wf.id,
              ruleOrder: i,
              condition: typeof rule.condition === "string" ? rule.condition : JSON.stringify(rule.condition),
              actionType: rule.actionType,
              actionConfig: rule.actionConfig ? typeof rule.actionConfig === "string" ? rule.actionConfig : JSON.stringify(rule.actionConfig) : null
            }
          });
        }
      }
    }

    return wf;
  });

  // Fetch the workflow with rules for response
  const workflowWithRules = await prisma.workflowDefinition.findUnique({
    where: { id: workflow.id },
    include: {
      rules: {
        orderBy: { ruleOrder: "asc" }
      }
    }
  });

  return NextResponse.json({ workflow: workflowWithRules }, { status: 201 });
}