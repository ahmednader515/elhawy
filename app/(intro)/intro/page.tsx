import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { IntroExperience } from "@/components/IntroExperience";
import { authOptions } from "@/lib/auth";

export default async function IntroPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/");
  }

  return <IntroExperience />;
}
