import { DecisionDetail } from "../../../../features/brujula/components/DecisionFlow";

type PageProps = {
  params: Promise<{ decisionId: string }>;
};

export default async function DecisionPage({ params }: PageProps) {
  const { decisionId } = await params;
  return <DecisionDetail decisionId={decodeURIComponent(decisionId)} />;
}
