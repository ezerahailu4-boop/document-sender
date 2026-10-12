"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, MapPin, Mail, Info, RefreshCw, CheckCircle2 } from "lucide-react";

interface DocumentTabsProps {
  documentTab: React.ReactNode;
  routingTab: React.ReactNode;
  discussionTab: React.ReactNode;
  metadataTab: React.ReactNode;
  versionsTab: React.ReactNode;
  auditTab: React.ReactNode;
  commentsCount?: number;
  versionsCount?: number;
  routesCount?: number;
}

export function DocumentTabs({
  documentTab,
  routingTab,
  discussionTab,
  metadataTab,
  versionsTab,
  auditTab,
  commentsCount = 0,
  versionsCount = 1,
  routesCount = 1,
}: DocumentTabsProps) {
  const [activeTab, setActiveTab] = useState("document");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
      <div className="overflow-x-auto pb-1">
        <TabsList className="w-full justify-start h-11 p-1 bg-card border border-border">
          <TabsTrigger value="document" className="gap-1.5 py-2 px-3 text-xs sm:text-sm">
            <FileText size={15} className="text-primary" />
            <span>Document Preview</span>
          </TabsTrigger>

          <TabsTrigger value="routing" className="gap-1.5 py-2 px-3 text-xs sm:text-sm">
            <MapPin size={15} className="text-primary" />
            <span>Routing Journey</span>
            {routesCount > 0 && (
              <span className="ml-1 rounded-full bg-secondary/15 px-1.5 py-0.2 text-[10px] font-semibold text-secondary">
                {routesCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="discussion" className="gap-1.5 py-2 px-3 text-xs sm:text-sm">
            <Mail size={15} className="text-primary" />
            <span>Discussion</span>
            {commentsCount > 0 && (
              <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                {commentsCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="metadata" className="gap-1.5 py-2 px-3 text-xs sm:text-sm">
            <Info size={15} className="text-primary" />
            <span>Metadata & Tags</span>
          </TabsTrigger>

          <TabsTrigger value="versions" className="gap-1.5 py-2 px-3 text-xs sm:text-sm">
            <RefreshCw size={15} className="text-primary" />
            <span>Versions</span>
            {versionsCount > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-foreground">
                v{versionsCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="audit" className="gap-1.5 py-2 px-3 text-xs sm:text-sm">
            <CheckCircle2 size={15} className="text-primary" />
            <span>Audit Trail</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="document" className="m-0 focus-visible:outline-hidden">
        {documentTab}
      </TabsContent>

      <TabsContent value="routing" className="m-0 focus-visible:outline-hidden">
        {routingTab}
      </TabsContent>

      <TabsContent value="discussion" className="m-0 focus-visible:outline-hidden">
        {discussionTab}
      </TabsContent>

      <TabsContent value="metadata" className="m-0 focus-visible:outline-hidden">
        {metadataTab}
      </TabsContent>

      <TabsContent value="versions" className="m-0 focus-visible:outline-hidden">
        {versionsTab}
      </TabsContent>

      <TabsContent value="audit" className="m-0 focus-visible:outline-hidden">
        {auditTab}
      </TabsContent>
    </Tabs>
  );
}
