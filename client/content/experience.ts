export type Experience = {
  company: string;
  role: string;
  dateStart: string;
  dateEnd: string;
  bullets?: string[];
  techStack?: string[];
  source?: string;
  featured?: boolean;
};

export const EXPERIENCES: Experience[] = [
  {
    company: "Bosch",
    role: "Senior Software Developer",
    dateStart: "May 2023",
    dateEnd: "Present",
    techStack: [
      "React",
      "TypeScript",
      "Gulp",
      "CSS",
      "React Testing Library",
      "KonvaJS",
    ],
    source: "source",
  },
  {
    company: "Ernst & Young -Technology Consulting",
    role: "Senior Application Consultant",
    dateStart: "April 2021",
    dateEnd: "July 2022",
    techStack: [
      "React",
      "TypeScript",
      "React Native",
      "NestJS",
      "NodeJS",
      "MongoDB",
      "styled-components",
      "SCSS",
    ],
    source: "source",
  },
  {
    company: "Fincore Group",
    role: "Software developer",
    dateStart: "Oct 2015",
    dateEnd: "January 2018",
    techStack: [
      "AngularJS",
      "JavaScript",
      ".NET MVC5",
      ".NET Razor",
      "CSS/SCSS",
      "MySQL",
      "TSQL",
    ],
    source: "source",
  },
  {
    company: "Levi9",
    role: "Software developer",
    dateStart: "September 2022",
    dateEnd: "May 2023",
    techStack: [
      "Next.js",
      "TypeScript",
      "JSS",
      "Jest",
      "Enzyme",
      "React Testing Library",
      "Contentful CMS",
    ],
    source: "source",
  },
  {
    company: "Videobolt.net",
    role: "Software developer",
    dateStart: "Jan 2018",
    dateEnd: "Feb 2021",
    techStack: ["JavaScript", "TypeScript", "Gulp", "SCSS", "React Native"],
    source: "source",
  },
  {
    company: "Independent R&D / Career Break",
    role: "Self-directed research & prototyping",
    dateStart: "Jun 2025",
    dateEnd: "Aug 2025",
    featured: true,
    bullets: [
      "Built full-stack AI pipelines: OCR → chunking → multi-model summarization → role-based analysis",
      "Mastered local LLM deployment (GGUF/llama.cpp/Ollama); optimized inference; resolved C++ build issues",
      "Developed tool-using AI agents orchestrating OCR, summarization, and analysis",
      "Explored AI infra patterns: Docker/Helm, Azure/AKS pipelines, cost-aware GPU hosting",
      "Initiated R&D into RAG and semantic search for Obsidian knowledge bases",
    ],
    source: "source",
  },
];
