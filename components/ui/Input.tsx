interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-brand-dark/70 mb-1.5">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full px-3 py-2.5 rounded-lg border text-sm
                    text-brand-dark placeholder:text-brand-nude/60
                    focus:outline-none focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium
                    transition-all
                    ${error ? "border-red-300 bg-red-50" : "border-brand-nude/40 bg-brand-light/30"}
                    ${className}`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = "", ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-brand-dark/70 mb-1.5">
          {label}
        </label>
      )}
      <select
        {...props}
        className={`w-full px-3 py-2.5 rounded-lg border text-sm
                    text-brand-dark
                    focus:outline-none focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium
                    transition-all bg-white
                    ${error ? "border-red-300" : "border-brand-nude/40"}
                    ${className}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-brand-dark/70 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        {...props}
        className={`w-full px-3 py-2.5 rounded-lg border text-sm
                    text-brand-dark placeholder:text-brand-nude/60
                    focus:outline-none focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium
                    transition-all resize-none
                    ${error ? "border-red-300 bg-red-50" : "border-brand-nude/40 bg-brand-light/30"}
                    ${className}`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
