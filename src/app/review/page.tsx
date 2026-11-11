import { ReviewSession } from "@/components/review-session";
import { PageTitle } from "@/components/ui";
import { getReviewSession } from "@/lib/db/cards";

export default function ReviewPage() {
  const { due, fresh } = getReviewSession();
  return (
    <div>
      <PageTitle en="Review" tr="Tekrar">
        <span className="text-sm text-muted">
          {due.length} due · {fresh.length} new
        </span>
      </PageTitle>
      <ReviewSession due={due} fresh={fresh} />
    </div>
  );
}
