import { Outlet, NavLink, Link } from "react-router-dom";

function Header() {
  const navClass = ({ isActive }) =>
    `rounded-full px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-blue-900 text-white shadow-sm"
        : "text-slate-500 hover:text-blue-700"
    }`;

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-lg font-bold text-blue-900">
          buyMove
        </Link>
        <nav className="flex items-center gap-2">
          <NavLink to="/catalog" className={navClass}>
            Catálogo
          </NavLink>
          <NavLink to="/favorites" className={navClass}>
            Favoritos
          </NavLink>
          <NavLink to="/profile" className={navClass}>
            Perfil
          </NavLink>
          <NavLink to="/login" className={navClass}>
            Entrar
          </NavLink>
          <Link
            to="/vehicle/new"
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500"
          >
            Anunciar veículo
          </Link>
          <Link
            to="/register"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Cadastre-se
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500">
        &copy; {new Date().getFullYear()} buyMove. Todos os direitos reservados.
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <Header />
      <main className="mx-auto w-full flex-1 max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

