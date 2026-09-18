"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@getmed/ui";

export function TagInput({ value, onChange, placeholder, suggestions = [] }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[] }) {
  const [text, setText] = useState("");
  const add = (t: string) => {
    const v = t.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setText("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">
            {t}<button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}><X className="size-3" /></button>
          </span>
        ))}
      </div>
      <Input
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(text);
          }
        }}
        onBlur={() => add(text)}
        className="mt-2"
        list={suggestions.length ? "tag-suggestions" : undefined}
      />
      {suggestions.length ? <datalist id="tag-suggestions">{suggestions.map((s) => <option key={s} value={s} />)}</datalist> : null}
    </div>
  );
}
