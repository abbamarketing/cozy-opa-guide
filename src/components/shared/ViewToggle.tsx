import { LayoutGrid, List, CalendarDays } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type ViewMode = 'kanban' | 'list' | 'calendar';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

const ViewToggle = ({ value, onChange }: ViewToggleProps) => (
  <ToggleGroup
    type="single"
    value={value}
    onValueChange={(v) => { if (v) onChange(v as ViewMode); }}
    className="border border-white/8 rounded-full p-0.5 bg-abba-surface/60"
  >
    <Tooltip>
      <TooltipTrigger asChild>
        <ToggleGroupItem
          value="kanban"
          className="h-7 w-7 rounded-full p-0 data-[state=on]:bg-abba-lime data-[state=on]:text-abba-dark"
          aria-label="Kanban"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </ToggleGroupItem>
      </TooltipTrigger>
      <TooltipContent><p>Kanban</p></TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <ToggleGroupItem
          value="list"
          className="h-7 w-7 rounded-full p-0 data-[state=on]:bg-abba-lime data-[state=on]:text-abba-dark"
          aria-label="Lista"
        >
          <List className="h-3.5 w-3.5" />
        </ToggleGroupItem>
      </TooltipTrigger>
      <TooltipContent><p>Lista</p></TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <ToggleGroupItem
          value="calendar"
          className="h-7 w-7 rounded-full p-0 data-[state=on]:bg-abba-lime data-[state=on]:text-abba-dark"
          aria-label="Calendário"
        >
          <CalendarDays className="h-3.5 w-3.5" />
        </ToggleGroupItem>
      </TooltipTrigger>
      <TooltipContent><p>Calendário</p></TooltipContent>
    </Tooltip>
  </ToggleGroup>
);

export default ViewToggle;
