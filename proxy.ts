// Next.js 16 renomeou "Middleware" para "Proxy" (mesmo mecanismo). Aqui só
// fazemos a checagem "otimista" via cookie de sessão:
//   1. Redireciona quem não está logado para /login (exceto rotas públicas).
//   2. Redireciona quem está logado com senha provisória (mustChangePassword)
//      para /change-password, até ele definir a própria senha.
//   3. Redireciona quem já está logado (e não precisa trocar senha) para
//      longe de /login e /setup.
// A checagem de verdade (role, dono do samName etc.) acontece em cada Server
// Component/Route Handler via lib/dal.ts.
//
// Não existe auto-cadastro: /setup só cria conta enquanto o sistema não tiver
// nenhum usuário (primeiro admin). Depois disso, só um admin logado cria
// contas novas (com senha provisória), em /admin/usuarios.
import { auth } from "@/auth";

const PUBLIC_PATHS = ["/login", "/setup"];
const CHANGE_PASSWORD_PATH = "/change-password";

export default auth((req) => {
  const { pathname, origin } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const mustChangePassword = !!req.auth?.user?.mustChangePassword;

  if (!isLoggedIn && !isPublic) {
    return Response.redirect(new URL("/login", origin));
  }
  if (isLoggedIn && mustChangePassword && pathname !== CHANGE_PASSWORD_PATH) {
    return Response.redirect(new URL(CHANGE_PASSWORD_PATH, origin));
  }
  if (isLoggedIn && !mustChangePassword && pathname === CHANGE_PASSWORD_PATH) {
    return Response.redirect(new URL("/lancamento", origin));
  }
  if (isLoggedIn && !mustChangePassword && isPublic) {
    return Response.redirect(new URL("/lancamento", origin));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)"],
};
