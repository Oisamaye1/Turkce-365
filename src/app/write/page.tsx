import { WritePage } from "@/components/write-page";
import { PageTitle } from "@/components/ui";
import { getLesson } from "@/lib/db/lessons";
import { today } from "@/lib/db/settings";
import { listWritings } from "@/lib/db/writing";
import type { DailyLesson } from "@/lib/lesson/schema";

const FREE_PROMPTS = [
  { prompt: "Introduce yourself: your name, country, job and where you live.", promptTr: "Kendini tanıt.", hints: ["Benim adım …", "…'da yaşıyorum.", "… olarak çalışıyorum."] },
  { prompt: "Describe your morning routine in three to five sentences.", promptTr: "Sabah rutinini anlat.", hints: ["Saat … kalkıyorum.", "Kahvaltıda …", "Sonra …"] },
  { prompt: "Describe your favourite place in Northern Cyprus and why you like it.", promptTr: "Kuzey Kıbrıs'ta en sevdiğin yer.", hints: ["En sevdiğim yer …", "Orada …", "Çünkü …"] },
  { prompt: "Write a short message inviting a colleague for coffee.", promptTr: "Bir iş arkadaşını kahveye davet et.", hints: ["Merhaba …,", "… kahve içelim mi?", "Saat … müsait misin?"] },
  { prompt: "What did you do last weekend? Use the past tense.", promptTr: "Geçen hafta sonu ne yaptın?", hints: ["Cumartesi …", "… gittim.", "… yedim."] },
];

export default async function Write() {
  const date = await today();
  const row = await getLesson(date);
  const lesson = row?.lesson.kind === "daily" ? (row.lesson as DailyLesson) : null;
  const prompts = [...(lesson ? [{ prompt: lesson.writing.prompt, promptTr: lesson.writing.promptTr, hints: lesson.writing.hints, fromLesson: true }] : []), ...FREE_PROMPTS];
  return (
    <div>
      <PageTitle en="Write" tr="Yaz" />
      <WritePage prompts={prompts} lessonDate={lesson ? date : undefined} history={await listWritings(20)} />
    </div>
  );
}
