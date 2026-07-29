import { PositionDetail } from "@/features/positions/position-detail";
export default async function PositionPage({ params }: { params: Promise<{ positionId: string }> }) { const { positionId } = await params; return <PositionDetail positionId={positionId} />; }
