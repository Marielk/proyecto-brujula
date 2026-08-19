import { DecisionFlow } from "../../../../../features/brujula/components/DecisionFlow";

type PageProps = {
  params: Promise<{ simulationId: string }>;
};

export default async function NewDecisionPage({ params }: PageProps) {
  const { simulationId } = await params;
  return <DecisionFlow simulationId={decodeURIComponent(simulationId)} />;
}
