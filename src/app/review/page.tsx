import { ReviewSession } from "@/components/review-session";
import { getReviewSession } from "@/lib/db/cards";

export default async function ReviewPage() {
  const { due, fresh } = await getReviewSession();
  return <ReviewSession due={due} fresh={fresh} />;
}
