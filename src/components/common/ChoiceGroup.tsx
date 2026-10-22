import { useId } from "react";
import { Check } from "lucide-react";

type Choice<T extends string> = { value: T; label: string; description?: string };
type Props<T extends string> = {
  label: string;
  value: T;
  options: readonly Choice<T>[];
  onChange: (value: T) => void;
  layout?: "chips" | "cards";
  required?: boolean;
};

/** Single-choice controls with every option visible and native keyboard navigation. */
export default function ChoiceGroup<T extends string>({ label, value, options, onChange, layout = "chips", required }: Props<T>) {
  const name = useId();
  return <fieldset className="min-w-0 space-y-2.5">
    <legend className="text-xs font-semibold text-page-text">{label}</legend>
    <div className={layout === "cards" ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "flex flex-wrap gap-2"}>
      {options.map(option => <label key={option.value} className={`relative flex min-h-11 min-w-0 cursor-pointer items-center gap-2 border px-3 py-2 text-xs font-medium transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${layout === "cards" ? "rounded-2xl" : "rounded-full"} ${value === option.value ? "border-accent bg-accent/5 text-accent" : "border-page-border bg-white text-page-text hover:bg-gray-50"}`}>
        <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} required={required} className="sr-only" />
        {layout === "cards" && <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${value === option.value ? "border-accent bg-accent text-white" : "border-page-border"}`}>{value === option.value && <Check size={12} strokeWidth={2.5} />}</span>}
        <span className="min-w-0 break-words"><span className="block">{option.label}</span>{option.description && <span className="mt-1 block text-[11px] font-normal leading-5 text-page-text">{option.description}</span>}</span>
      </label>)}
    </div>
  </fieldset>;
}
