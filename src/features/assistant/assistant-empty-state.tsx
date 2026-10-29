import { Button } from "@/components/ui/button";
import { ASSISTANT_QUICK_REPLIES } from "@/constants/assistant";

type AssistantEmptyStateProps = {
  onPick: (text: string) => void;
};

/** Quick replies under the greeting before the first message. */
export const AssistantEmptyState = ({ onPick }: AssistantEmptyStateProps) => (
  <div className="flex flex-col gap-2">
    <p className="text-sm text-muted-foreground">Оберіть тему або напишіть своє запитання:</p>
    <ul className="flex flex-wrap gap-2" aria-label="Швидкі відповіді">
      {ASSISTANT_QUICK_REPLIES.map((reply) => (
        <li key={reply}>
          <Button variant="outline" className="rounded-full" onClick={() => onPick(reply)}>
            {reply}
          </Button>
        </li>
      ))}
    </ul>
  </div>
);
