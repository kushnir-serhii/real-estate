import type { Flow } from "./diagram-data";

/** Sequence diagram as a CSS grid: each participant owns two sub-columns, arrows run between their centers. */
export const Swimlane = ({ flow }: { flow: Flow }) => {
  const count = flow.participants.length;
  const columns = { gridTemplateColumns: `repeat(${count * 2}, minmax(0, 1fr))` };

  return (
    <div className="overflow-x-auto">
      <div className="relative min-w-160">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {flow.participants.map((name, index) => (
            <div
              key={name}
              className="absolute top-10 bottom-0 border-l border-dashed"
              style={{ left: `${((index * 2 + 1) / (count * 2)) * 100}%` }}
            />
          ))}
        </div>

        <div className="grid" style={columns}>
          {flow.participants.map((name) => (
            <div key={name} className="col-span-2 flex justify-center px-1">
              <span className="relative z-10 rounded-md border bg-primary px-2 py-1 text-center text-xs font-medium text-primary-foreground">
                {name}
              </span>
            </div>
          ))}
        </div>

        <ol className="relative flex flex-col gap-1 pt-3">
          {flow.steps.map((step, index) => {
            const low = Math.min(step.from, step.to);
            const high = Math.max(step.from, step.to);
            const self = low === high;
            const goesLeft = step.to < step.from;
            const gridColumn = self ? `${low * 2 + 2} / span 3` : `${low * 2 + 2} / ${high * 2 + 2}`;
            return (
              <li key={`${index}-${step.label}`} className="grid items-end" style={columns}>
                <div
                  className={`relative z-10 px-1 ${goesLeft ? "text-right" : ""}`}
                  style={{ gridColumn }}
                >
                  <p className="text-xs leading-tight">
                    <span className="mr-1 tabular-nums text-muted-foreground">{index + 1}.</span>
                    {step.label}
                  </p>
                  {self ? (
                    <div className="mt-0.5 h-3 rounded-r-md border-y border-r border-foreground/70" />
                  ) : (
                    <div
                      className={`mt-0.5 flex items-center gap-0 ${goesLeft ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`h-0 flex-1 border-t ${step.back ? "border-dashed border-muted-foreground" : "border-foreground/70"}`}
                      />
                      <span aria-hidden className="-mx-0.5 text-[10px] leading-none text-foreground/70">
                        {goesLeft ? "◀" : "▶"}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};
