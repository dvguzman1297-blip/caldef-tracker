import { LaneBuilder } from "@/components/lane-builder";

export default function LanesPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Meal Planning</h1>
      <p className="text-sm opacity-70">Arrange meals into lanes, drag items between them, and save the plan.</p>
      <LaneBuilder />
    </>
  );
}
