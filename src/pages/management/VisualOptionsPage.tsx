import { useState } from "react";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { SettingsPageWrapper } from "@/components/management/SettingsPageWrapper";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DATA_SHEET_SECTIONS,
  PAGE_DATA_SHEET,
} from "@/config/visualPreferences";
import { useVisualPreferences } from "@/hooks/useVisualPreferences";

/**
 * Settings → Visual Options
 *
 * Lets each user choose which columns to show/hide on the Data Sheet tabs.
 * Preferences are stored per-user in `user_visual_preferences` and scoped
 * by RLS to the signed-in user.
 *
 * v1: only the Data Sheet page is wired. The schema (page_key column) lets
 * us add more pages later without migrations.
 */
const VisualOptionsPage = () => {
  const { isColumnHidden, toggleColumn, resetSection, isLoading, isMutating } =
    useVisualPreferences(PAGE_DATA_SHEET);
  const [activePage, setActivePage] = useState<"data_sheet">("data_sheet");

  const handleToggle = async (sectionKey: string, columnId: string) => {
    try {
      await toggleColumn(sectionKey, columnId);
    } catch (e: any) {
      toast.error(`Failed to save preference: ${e.message || "unknown error"}`);
    }
  };

  const handleReset = async (sectionKey: string, sectionLabel: string) => {
    try {
      await resetSection(sectionKey);
      toast.success(`${sectionLabel} reset to defaults`);
    } catch (e: any) {
      toast.error(`Failed to reset: ${e.message || "unknown error"}`);
    }
  };

  return (
    <SettingsPageWrapper
      title="Visual Options"
      description="Choose which columns appear on each data sheet tab. Preferences are saved per user."
    >
      <div className="p-6">
        <Tabs value={activePage} onValueChange={(v) => setActivePage(v as "data_sheet")}>
          <TabsList>
            <TabsTrigger value="data_sheet">Data Sheet</TabsTrigger>
          </TabsList>

          <TabsContent value="data_sheet" className="mt-6">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading preferences…</p>
            ) : (
              <Accordion type="multiple" className="w-full" defaultValue={DATA_SHEET_SECTIONS.map(s => s.key)}>
                {DATA_SHEET_SECTIONS.map((section) => {
                  const visibleCount = section.columns.filter(
                    (c) => !isColumnHidden(section.key, c.id)
                  ).length;
                  const totalCount = section.columns.length;

                  return (
                    <AccordionItem key={section.key} value={section.key}>
                      <AccordionTrigger>
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="text-left">
                            <div className="font-medium">{section.label}</div>
                            {section.description && (
                              <div className="text-xs text-muted-foreground">
                                {section.description}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {visibleCount} / {totalCount} visible
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1">
                          <div className="flex justify-end mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReset(section.key, section.label)}
                              disabled={isMutating}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Reset to defaults
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {section.columns.map((col) => {
                              const hidden = isColumnHidden(section.key, col.id);
                              return (
                                <label
                                  key={col.id}
                                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/40 cursor-pointer"
                                >
                                  <span className="flex items-center gap-2 text-sm">
                                    {hidden ? (
                                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5 text-foreground" />
                                    )}
                                    <span className={hidden ? "text-muted-foreground" : ""}>
                                      {col.label}
                                    </span>
                                  </span>
                                  <Switch
                                    checked={!hidden}
                                    onCheckedChange={() => handleToggle(section.key, col.id)}
                                    disabled={isMutating}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SettingsPageWrapper>
  );
};

export default VisualOptionsPage;
