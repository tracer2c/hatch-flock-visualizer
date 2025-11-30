import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSOPTemplates, useCreateSOPTemplate, useDailyChecklistItems, useCreateChecklistItem } from "@/hooks/useSOPData";
import { FileText, Plus, Edit, Calendar, CheckSquare, Settings, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';

const SOPManager = () => {
  const { data: sopTemplates, isLoading: templatesLoading } = useSOPTemplates();
  const { data: checklistItems, isLoading: itemsLoading } = useDailyChecklistItems();
  const createSOPTemplate = useCreateSOPTemplate();
  const createChecklistItem = useCreateChecklistItem();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [showEditTemplateDialog, setShowEditTemplateDialog] = useState(false);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    description: '',
    category: 'daily_checklist',
    day_of_incubation: undefined as number | undefined
  });
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    is_required: true,
    applicable_days: [] as number[],
    sop_template_id: ''
  });

  const handleCreateTemplate = async () => {
    await createSOPTemplate.mutateAsync(newTemplate);
    setShowNewTemplateDialog(false);
    setNewTemplate({ title: '', description: '', category: 'daily_checklist', day_of_incubation: undefined });
  };

  const handleCreateItem = async () => {
    const orderIndex = (checklistItems?.length || 0) + 1;
    await createChecklistItem.mutateAsync({
      ...newItem,
      order_index: orderIndex,
    });
    setShowNewItemDialog(false);
    setNewItem({ title: '', description: '', is_required: true, applicable_days: [], sop_template_id: '' });
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate({
      ...template,
      day_of_incubation: template.day_of_incubation || undefined
    });
    setShowEditTemplateDialog(true);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    
    const { error } = await supabase
      .from('sop_templates')
      .update({
        title: editingTemplate.title,
        description: editingTemplate.description,
        category: editingTemplate.category,
        day_of_incubation: editingTemplate.day_of_incubation || null
      })
      .eq('id', editingTemplate.id);

    if (error) {
      toast({ title: "Error updating template", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['sop-templates'] });
      setShowEditTemplateDialog(false);
      setEditingTemplate(null);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const { error } = await supabase
      .from('sop_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      toast({ title: "Error deleting template", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['sop-templates'] });
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem({
      ...item,
      applicable_days: item.applicable_days || []
    });
    setShowEditItemDialog(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    
    const { error } = await supabase
      .from('daily_checklist_items')
      .update({
        title: editingItem.title,
        description: editingItem.description,
        is_required: editingItem.is_required,
        applicable_days: editingItem.applicable_days
      })
      .eq('id', editingItem.id);

    if (error) {
      toast({ title: "Error updating item", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Checklist item updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['daily-checklist-items'] });
      setShowEditItemDialog(false);
      setEditingItem(null);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from('daily_checklist_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast({ title: "Error deleting item", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Checklist item deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['daily-checklist-items'] });
    }
  };

  const toggleApplicableDay = (day: number, isEdit = false) => {
    if (isEdit && editingItem) {
      setEditingItem((prev: any) => ({
        ...prev,
        applicable_days: prev.applicable_days.includes(day)
          ? prev.applicable_days.filter((d: number) => d !== day)
          : [...prev.applicable_days, day].sort((a, b) => a - b)
      }));
    } else {
      setNewItem(prev => ({
        ...prev,
        applicable_days: prev.applicable_days.includes(day)
          ? prev.applicable_days.filter(d => d !== day)
          : [...prev.applicable_days, day].sort((a, b) => a - b)
      }));
    }
  };

  if (templatesLoading || itemsLoading) {
    return <div className="p-4 text-center">Loading SOP management...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          SOP & Checklist Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              SOP Templates
            </TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Checklist Items
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">SOP Templates ({sopTemplates?.length || 0})</h3>
              <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New SOP Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newTemplate.title}
                        onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                        placeholder="Enter template title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newTemplate.description}
                        onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                        placeholder="Enter template description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily_checklist">Daily Checklist</SelectItem>
                          <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="day">Specific Day (Optional)</Label>
                      <Input
                        id="day"
                        type="number"
                        min="1"
                        max="21"
                        value={newTemplate.day_of_incubation || ''}
                        onChange={(e) => setNewTemplate({ 
                          ...newTemplate, 
                          day_of_incubation: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="Leave blank for all days"
                      />
                    </div>
                    <Button onClick={handleCreateTemplate} disabled={!newTemplate.title}>
                      Create Template
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-80">
              <div className="space-y-3">
                {sopTemplates?.map((template) => (
                  <div key={template.id} className="p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{template.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{template.category}</Badge>
                          {template.day_of_incubation && (
                            <Badge variant="secondary">
                              <Calendar className="h-3 w-3 mr-1" />
                              Day {template.day_of_incubation}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(template)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{template.title}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Checklist Items ({checklistItems?.length || 0})</h3>
              <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Checklist Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="item-title">Title</Label>
                      <Input
                        id="item-title"
                        value={newItem.title}
                        onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                        placeholder="Enter checklist item title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="item-description">Description</Label>
                      <Textarea
                        id="item-description"
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        placeholder="Enter detailed description"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newItem.is_required}
                        onCheckedChange={(checked) => setNewItem({ ...newItem, is_required: checked })}
                      />
                      <Label>Required Item</Label>
                    </div>
                    <div>
                      <Label>Applicable Days (1-21)</Label>
                      <div className="grid grid-cols-7 gap-2 mt-2">
                        {Array.from({ length: 21 }, (_, i) => i + 1).map((day) => (
                          <Button
                            key={day}
                            variant={newItem.applicable_days.includes(day) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleApplicableDay(day)}
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreateItem} disabled={!newItem.title}>
                      Create Item
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-80">
              <div className="space-y-3">
                {checklistItems?.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{item.title}</h4>
                          {item.is_required && <Badge variant="destructive">Required</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs text-muted-foreground">Days:</span>
                          {item.applicable_days.slice(0, 5).map((day) => (
                            <Badge key={day} variant="outline" className="text-xs">
                              {day}
                            </Badge>
                          ))}
                          {item.applicable_days.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.applicable_days.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Checklist Item?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{item.title}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Edit Template Dialog */}
        <Dialog open={showEditTemplateDialog} onOpenChange={setShowEditTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit SOP Template</DialogTitle>
            </DialogHeader>
            {editingTemplate && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editingTemplate.title}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingTemplate.description || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select 
                    value={editingTemplate.category} 
                    onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily_checklist">Daily Checklist</SelectItem>
                      <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-day">Specific Day (Optional)</Label>
                  <Input
                    id="edit-day"
                    type="number"
                    min="1"
                    max="21"
                    value={editingTemplate.day_of_incubation || ''}
                    onChange={(e) => setEditingTemplate({ 
                      ...editingTemplate, 
                      day_of_incubation: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateTemplate}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setShowEditTemplateDialog(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Checklist Item Dialog */}
        <Dialog open={showEditItemDialog} onOpenChange={setShowEditItemDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Checklist Item</DialogTitle>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-item-title">Title</Label>
                  <Input
                    id="edit-item-title"
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-item-description">Description</Label>
                  <Textarea
                    id="edit-item-description"
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingItem.is_required}
                    onCheckedChange={(checked) => setEditingItem({ ...editingItem, is_required: checked })}
                  />
                  <Label>Required Item</Label>
                </div>
                <div>
                  <Label>Applicable Days (1-21)</Label>
                  <div className="grid grid-cols-7 gap-2 mt-2">
                    {Array.from({ length: 21 }, (_, i) => i + 1).map((day) => (
                      <Button
                        key={day}
                        variant={editingItem.applicable_days.includes(day) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleApplicableDay(day, true)}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateItem}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setShowEditItemDialog(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SOPManager;