import type { Language } from "../features/analyzer/model";
import { messages } from "../i18n";

interface LanguageSwitcherProps {
  language: Language;
  onChange: (language: Language) => void;
}

export function LanguageSwitcher({
  language,
  onChange
}: LanguageSwitcherProps) {
  const copy = messages[language];

  return (
    <div
      aria-label={copy.languageLabel}
      className="language-switcher"
      role="group"
    >
      <button
        aria-pressed={language === "en"}
        onClick={() => onChange("en")}
        type="button"
      >
        {copy.english}
      </button>
      <button
        aria-pressed={language === "zh-CN"}
        onClick={() => onChange("zh-CN")}
        type="button"
      >
        {copy.chinese}
      </button>
    </div>
  );
}
