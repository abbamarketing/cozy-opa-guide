import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, GripVertical, Trash2, ListChecks } from 'lucide-react';

export interface SubtaskTemplate {
  id?: string;
  name: string;
  delivery_types: string[];
  sort_order: number;
  requires_approval: boolean;
  is_active: boolean;
}

interface Props {
  templates: SubtaskTemplate[];
  onChange: (templates: SubtaskTemplate[]) => void;
  availableTypes: { value: string; label: string }[];
}

const DELIVERY_TYPE_LABELS: Record<string, string> = {
  youtube_video: 'YouTube',
  instagram_video: 'Instagram',
  thumbnail: 'Thumbnail',
  cover: 'Capa',
};

const SubtaskTemplateEditor = ({ templates, onChange, availableTypes }: Props) => {
  const [newName, setNewName] = useState('');

  const addTemplate = () => {
    if (!newName.trim()) return;
    const newTemplate: SubtaskTemplate = {
      name: newName.trim(),
      delivery_types: availableTypes.map((t) => t.value),
      sort_order: templates.length,
      requires_approval: false,
      is_active: true,
    };
    onChange([...templates, newTemplate]);
    setNewName('');
  };

  const removeTemplate = (index: number) => {
    onChange(templates.filter((_, i) => i !== index));
  };

  const updateTemplate = (index: number, updates: Partial<SubtaskTemplate>) => {
    const updated = templates.map((t, i) => (i === index ? { ...t, ...updates } : t));
    onChange(updated);
  };

  const toggleDeliveryType = (index: number, type: string) => {
    const template = templates[index];
    const types = template.delivery_types.includes(type)
      ? template.delivery_types.filter((t) => t !== type)
      : [...template.delivery_types, type];
    updateTemplate(index, { delivery_types: types });
  };

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <ListChecks className="h-4 w-4" />
        Subtasks por Entrega
      </h3>
      <p className="text-xs text-muted-foreground">
        Defina etapas que serão criadas automaticamente em cada entrega.
      </p>

      {/* Existing templates */}
      <div className="space-y-2">
        {templates.map((template, index) => (
          <div
            key={index}
            className="rounded-lg bg-secondary/50 border border-border/50 p-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={template.name}
                onChange={(e) => updateTemplate(index, { name: e.target.value })}
                className="h-8 bg-background border-border text-sm flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeTemplate(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] text-muted-foreground uppercase">Aplica-se a:</span>
              {availableTypes.map((type) => (
                <label key={type.value} className="flex items-center gap-1 cursor-pointer">
                  <Checkbox
                    checked={template.delivery_types.includes(type.value)}
                    onCheckedChange={() => toggleDeliveryType(index, type.value)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs text-foreground">{type.label}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-xs cursor-pointer">
                <Switch
                  checked={template.requires_approval}
                  onCheckedChange={(v) => updateTemplate(index, { requires_approval: v })}
                  className="scale-75"
                />
                Requer aprovação do cliente
              </Label>
              {template.requires_approval && (
                <Badge variant="outline" className="text-[10px]">
                  Aprovação
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new template */}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ex: Aprovar Roteiro, Edição Final..."
          className="bg-secondary border-border text-sm"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTemplate())}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTemplate}
          disabled={!newName.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {templates.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-lg">
          Nenhuma subtask definida. Entregas serão criadas sem etapas intermediárias.
        </p>
      )}
    </section>
  );
};

export default SubtaskTemplateEditor;
