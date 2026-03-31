import styles from "@/styles/Tags.module.css";
import { useMemo, useState } from "react";

type TagSelectorProps = {
  options: string[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
  labelForValue?: (val: string) => string; // optional label renderer
  placeholder?: string;
};

export default function TagSelector({
  options, selected, onChange, labelForValue, placeholder = "Type tag & press 'Enter'...",
}: TagSelectorProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();

    return options
      .filter((val) => !selected.includes(val))
      .filter((val) => {
        const label = labelForValue ? labelForValue(val) : val;
        return !q || label.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [options, selected, query, labelForValue]);

  const exactExistingMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    return (
      options.find((val) => {
        const label = labelForValue ? labelForValue(val) : val;
        return label.trim().toLowerCase() === q;
      }) || null
    );
  }, [options, query, labelForValue]);

  const exactSelectedMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;

    return selected.some((val) => {
      const label = labelForValue ? labelForValue(val) : val;
      return label.trim().toLowerCase() === q;
    });
  }, [selected, query, labelForValue]);

  const addValue = (val: string) => {
    if (!val || selected.includes(val)) return;
    onChange([...selected, val]);
    setQuery("");
  };

  const addFromQuery = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (exactExistingMatch) {
      addValue(exactExistingMatch);
      return;
    }

    if (!exactSelectedMatch) {
      onChange([...selected, trimmed]);
    }

    setQuery("");
  };

  const remove = (val: string) => {
    onChange(selected.filter((v) => v !== val));
  };

  return (
    <div
      className={styles.tagSelector}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <div className={styles.tags} onClick={() => setIsOpen(true)}>
        {selected.map(val => (
          <span key={val} className={styles.tag}>
            {labelForValue ? labelForValue(val) : val}
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => remove(val)}
            >
              ×
            </button>
          </span>
        ))}

        <input
          className={styles.tagInput}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addFromQuery();
              setIsOpen(true);
            }

            if (e.key === "Backspace" && !query.trim() && selected.length) {
              remove(selected[selected.length - 1]);
            }
          }}
          placeholder={placeholder}
        />
      </div>

      {isOpen && (
        <div className={styles.suggestions}>
          {filteredOptions.map((val) => (
            <button
              key={val}
              type="button"
              className={styles.suggestionButton}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                addValue(val);
                setIsOpen(true);
              }}
            >
              <span className={styles.suggestionTag}>
                {labelForValue ? labelForValue(val) : val}
              </span>
            </button>
          ))}

          {!!query.trim() && !exactExistingMatch && !exactSelectedMatch && (
            <button
              type="button"
              className={styles.suggestionButton}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                addFromQuery();
                setIsOpen(true);
              }}
            >
              <span className={styles.createTagLabel}>Create</span>
              <span className={styles.suggestionTag}>{query.trim()}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
