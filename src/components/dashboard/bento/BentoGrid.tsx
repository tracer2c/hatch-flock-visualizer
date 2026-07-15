import { useMemo } from "react";
import { Responsive, WidthProvider, Layouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { getWidget } from "./widgets/registry";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Props {
  widgets: string[];
  layouts: Layouts;
  editing: boolean;
  onLayoutChange: (all: Layouts) => void;
  onRemove: (id: string) => void;
}

export function BentoGrid({ widgets, layouts, editing, onLayoutChange, onRemove }: Props) {
  const children = useMemo(
    () =>
      widgets
        .map((id) => {
          const w = getWidget(id);
          if (!w) return null;
          const Comp = w.Component;
          return (
            <div key={id} className="bento-cell">
              <Comp editing={editing} onRemove={() => onRemove(id)} />
            </div>
          );
        })
        .filter(Boolean),
    [widgets, editing, onRemove]
  );

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 900, sm: 0 }}
      cols={{ lg: 12, md: 10, sm: 6 }}
      rowHeight={72}
      margin={[16, 16]}
      containerPadding={[0, 0]}
      isDraggable={editing}
      isResizable={editing}
      draggableHandle=".bento-drag-handle"
      onLayoutChange={(_, all) => onLayoutChange(all)}
      compactType="vertical"
    >
      {children}
    </ResponsiveGridLayout>
  );
}
