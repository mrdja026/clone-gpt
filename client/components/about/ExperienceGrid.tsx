import ExperienceCard from "./ExperienceCard";
import { EXPERIENCES } from "@/content/experience";

export default function ExperienceGrid() {
  const items = EXPERIENCES;
  return (
    <div className="grid gap-4 md:gap-5 md:grid-cols-2">
      {items.map((item, idx) => (
        <ExperienceCard key={idx} item={item} />
      ))}
    </div>
  );
}
