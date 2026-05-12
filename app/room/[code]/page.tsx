import { RoomClient } from "./RoomClient";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function RoomPage({ params }: PageProps) {
  const { code } = await params;
  return <RoomClient code={code.toUpperCase()} />;
}
