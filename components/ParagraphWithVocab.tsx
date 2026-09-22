import { pickDifficultWords } from "@/lib/vocab";
import DifficultWord from "./DifficultWord";

export default function ParagraphWithVocab({ text }: { text: string }) {
  const difficult = pickDifficultWords(text);
  if (difficult.size === 0) return <p>{text}</p>;

  const pattern = new RegExp(`\\b(${[...difficult].join("|")})\\b`, "gi");
  const parts = text.split(pattern);

  return (
    <p>
      {parts.map((part, i) =>
        difficult.has(part.toLowerCase()) ? (
          <DifficultWord key={i} word={part} sentence={text} />
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}
