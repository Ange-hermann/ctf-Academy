import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/student/courses/lesson-player";
import { getLessonDetail } from "@/lib/student/queries/courses";
import { requireStudent } from "@/lib/student/session";

export default async function LessonPage({ params }: PageProps<"/espace-etudiant/cours/[moduleSlug]/[lessonSlug]">) {
  const { moduleSlug, lessonSlug } = await params;
  const ctx = await requireStudent(`/espace-etudiant/cours/${moduleSlug}/${lessonSlug}`);
  const detail = await getLessonDetail(ctx, moduleSlug, lessonSlug);
  if (!detail) notFound();
  return <LessonPlayer detail={detail} timezone={ctx.timezone} />;
}
