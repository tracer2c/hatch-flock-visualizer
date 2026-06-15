import { SET_COLORS, SET_COLOR_HEX, type SetColor } from "@/config/multiStage";

/**
 * Visual 7-swatch color picker for set tagging.
 *
 * Used on Multi-Stage and Single-Stage pages so the technician can match the
 * physical color tag they put on the buggies. Selected swatch grows, shows a
 * white checkmark, and the color name appears below for accessibility.
 */
export function SetColorPicker({
  value,
  onChange,
  label = "Set Color",
  showLabel = true,
}: {
  value: SetColor;
  onChange: (color: SetColor) => void;
  label?: string;
  showLabel?: boolean;
}) {
  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="text-sm font-medium leading-none">{label}</div>
      )}
      <div className="flex flex-wrap gap-2">
        {SET_COLORS.map((color) => {
          const isSelected = value === color;
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`relative h-10 w-10 rounded-full border-2 transition-all ${
                isSelected
                  ? "border-foreground scale-110 shadow-md"
                  : "border-border hover:scale-105"
              }`}
              style={{ backgroundColor: SET_COLOR_HEX[color] }}
              title={color}
              aria-label={`Set color ${color}`}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground capitalize">
        Selected: {value}
      </p>
    </div>
  );
}
