import { ReviewSession } from "@/components/review-session";
import { getReviewSession } from "@/lib/db/cards";
import { exercisePool, learnerStage } from "@/lib/srs/stage";

export default async function ReviewPage() {
  const [{ due, fresh }, stage, pool] = await Promise.all([getReviewSession(), learnerStage(), exercisePool()]);
  return <ReviewSession due={due} fresh={fresh} stage={stage} pool={pool} />;
}
