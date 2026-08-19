import { DecisionReview } from "../../../../../features/brujula/components/DecisionFlow";

type PageProps = {
  params: Promise<{ decisionId: string }>;
};

export default async function DecisionReviewPage({ params }: PageProps) {
  const { decisionId } = await params;
  return <DecisionReview decisionId={decodeURIComponent(decisionId)} />;
}
