export type Neurotype = "Sensory Sensitivity" | "Balanced Focus" | "Under-Aroused Mind";

export type Answers = {
  primaryGoal: "Focus" | "Relax" | "Sleep" | "Meditate";
  driftFrequency: "Always" | "Sometimes" | "Rarely";
  distraction: "Chatter" | "Traffic" | "Other";
  adhd: "Yes" | "No" | "Prefer not to say";
  musicStyle:
    | "Lo-Fi"
    | "Cinematic"
    | "Electronic"
    | "Classical"
    | "Acoustic"
    | "Ambient Nature Sounds"
    | "Other";
  songCount: "1" | "2" | "3" | "4";
  energyRating: number;
  overwhelmRating: number;
};

export type AnswerKey = keyof Answers;

type ChoiceQuestion = {
  kind: "choice";
  id: AnswerKey;
  prompt: string;
  helper?: string;
  options: string[];
};

type RatingQuestion = {
  kind: "rating";
  id: AnswerKey;
  prompt: string;
  helper?: string;
  minLabel: string;
  maxLabel: string;
};

export type Question = ChoiceQuestion | RatingQuestion;

export const QUESTIONS: Question[] = [
  {
    kind: "choice",
    id: "primaryGoal",
    prompt: "What is your primary goal today?",
    options: ["Focus", "Relax", "Sleep", "Meditate"],
  },
  {
    kind: "choice",
    id: "driftFrequency",
    prompt: "How often do you find yourself drifting away from a task?",
    options: ["Always", "Sometimes", "Rarely"],
  },
  {
    kind: "choice",
    id: "distraction",
    prompt: "What distracts you most while working?",
    options: ["Chatter", "Traffic", "Other"],
  },
  {
    kind: "choice",
    id: "adhd",
    prompt: "Do you identify as having ADHD, or do you experience significant attentional challenges?",
    options: ["Yes", "No", "Prefer not to say"],
  },
  {
    kind: "choice",
    id: "musicStyle",
    prompt: "What style of music do you typically enjoy or find least distracting?",
    options: [
      "Lo-Fi",
      "Cinematic",
      "Electronic",
      "Classical",
      "Acoustic",
      "Ambient Nature Sounds",
      "Other",
    ],
  },
  {
    kind: "choice",
    id: "songCount",
    prompt: "How many songs do you want in your playlist?",
    helper: "Each one is generated fresh for this session",
    options: ["1", "2", "3", "4"],
  },
  {
    kind: "rating",
    id: "energyRating",
    prompt: "How energized do you feel right now?",
    helper: "1 = completely drained, 10 = wide awake",
    minLabel: "Drained",
    maxLabel: "Energized",
  },
  {
    kind: "rating",
    id: "overwhelmRating",
    prompt: "How easily overwhelmed by noise or your environment do you feel right now?",
    helper: "1 = nothing fazes me, 10 = everything is too much",
    minLabel: "Unfazed",
    maxLabel: "Overwhelmed",
  },
];

const CALMING_GOALS: Answers["primaryGoal"][] = ["Relax", "Sleep", "Meditate"];
const SENSORY_DISTRACTIONS: Answers["distraction"][] = ["Chatter", "Traffic"];

export function classifyNeurotype(answers: Answers): Neurotype {
  let sensorySensitivity = 0;
  let underArousal = 0;

  if (answers.adhd === "Yes") underArousal += 3;
  if (answers.adhd === "Prefer not to say") underArousal += 1;

  if (answers.driftFrequency === "Always") underArousal += 2;

  if (SENSORY_DISTRACTIONS.includes(answers.distraction)) sensorySensitivity += 2;

  if (CALMING_GOALS.includes(answers.primaryGoal)) sensorySensitivity += 1;

  if (answers.energyRating <= 3) underArousal += 2;

  if (answers.overwhelmRating >= 7) sensorySensitivity += 3;
  else if (answers.overwhelmRating <= 3) underArousal += 1;

  if (Math.max(sensorySensitivity, underArousal) < 3) return "Balanced Focus";
  if (sensorySensitivity > underArousal + 1) return "Sensory Sensitivity";
  if (underArousal > sensorySensitivity + 1) return "Under-Aroused Mind";
  return "Balanced Focus";
}
