export default function SearchBar({ value, onChange, onSubmit }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className="flex flex-col gap-3 sm:flex-row"
    >
      <input
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        placeholder="Buscar por modelo, versão..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600">
        Buscar
      </button>
    </form>
  );
}

