import { redirect } from "next/navigation";
import { getTeachersFeatureEnabled, listTeachersForHomepage } from "@/lib/db";
import { TeachersBrowseClient } from "./TeachersBrowseClient";

export const revalidate = 60;

export const metadata = {
  title: "اختر المدرسين | منصتي التعليمية",
  description: "تصفح مدرسي المنصة والدورات المتاحة لكل مدرس",
};

export default async function TeachersPage() {
  const enabled = await getTeachersFeatureEnabled();
  if (!enabled) {
    redirect("/");
  }
  const teachers = await listTeachersForHomepage().catch(() => []);

  return <TeachersBrowseClient initialTeachers={teachers} />;
}
