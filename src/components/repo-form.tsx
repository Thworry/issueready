import { useId, useState, type FormEvent } from "react";
import type { Language } from "../features/analyzer/model";
import { messages } from "../i18n";

interface RepoFormProps {
  language: Language;
  loading: boolean;
  defaultValue?: string;
  onSubmit: (input: string) => void;
}

const EXAMPLES = [
  {
    slug: "firstcontributions/first-contributions",
    url: "https://github.com/firstcontributions/first-contributions"
  },
  {
    slug: "ossf/scorecard",
    url: "https://github.com/ossf/scorecard"
  }
] as const;

export function RepoForm({
  language,
  loading,
  defaultValue = "",
  onSubmit
}: RepoFormProps) {
  const [value, setValue] = useState(defaultValue);
  const [empty, setEmpty] = useState(false);
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const copy = messages[language];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = value.trim();
    if (!input) {
      setEmpty(true);
      return;
    }

    setEmpty(false);
    onSubmit(input);
  }

  return (
    <form className="repo-form" noValidate onSubmit={submit}>
      <div className="field-group">
        <label className="field-label" htmlFor={inputId}>
          {copy.formLabel}
        </label>
        <input
          aria-describedby={`${helpId}${empty ? ` ${errorId}` : ""}`}
          aria-invalid={empty}
          autoCapitalize="none"
          autoComplete="url"
          autoCorrect="off"
          className="repo-input"
          disabled={loading}
          id={inputId}
          inputMode="url"
          onChange={(event) => {
            setValue(event.target.value);
            if (empty) setEmpty(false);
          }}
          placeholder={copy.formPlaceholder}
          spellCheck={false}
          type="url"
          value={value}
        />
        <p className="field-help" id={helpId}>
          {copy.formHelp}
        </p>
        {empty ? (
          <p className="field-error" id={errorId} role="alert">
            {copy.errors["invalid-url"]}
          </p>
        ) : null}
      </div>

      <button className="primary-action" disabled={loading} type="submit">
        {copy.submit}
      </button>

      <div className="form-examples">
        <span className="form-examples__label">{copy.examples}</span>
        <div className="form-examples__actions">
          {EXAMPLES.map((example) => (
            <button
              className="example-action"
              disabled={loading}
              key={example.slug}
              onClick={() => {
                setValue(example.url);
                setEmpty(false);
              }}
              type="button"
            >
              {example.slug}
            </button>
          ))}
        </div>
      </div>

      <p className="privacy-note">{copy.privacy}</p>
    </form>
  );
}
