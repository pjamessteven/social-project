"use client";

import { Search } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 200,
  className = "",
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange(val), debounceMs);
    },
    [onChange, debounceMs],
  );

  return (
    <div className={`relative rounded-full ${className}`}>
      <Search className="text-muted-foreground absolute top-1/2 left-3 ml-2 h-5 w-5 -translate-y-1/2" />
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="bg-background dark:text-muted-foreground h-[46px] w-full rounded-full border py-2 pr-4 pl-13 text-base"
      />
    </div>
  );
}
