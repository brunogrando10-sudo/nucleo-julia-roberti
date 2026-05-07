import { redirect } from "next/navigation";

// A raiz redireciona para o dashboard (o middleware cuida da auth)
export default function Home() {
  redirect("/dashboard");
}
