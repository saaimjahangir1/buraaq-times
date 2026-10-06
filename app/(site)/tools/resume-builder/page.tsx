import type { Metadata } from "next";
import ResumeBuilder from "@/components/resume/ResumeBuilder";

export const metadata: Metadata = {
  title: "AI Resume Builder",
  description:
    "Turn rough notes about your work, studies and skills into a clean, professional resume, then download it as a PDF. Free, from Buraaq Times.",
  openGraph: {
    title: "AI Resume Builder | Buraaq Times",
    description: "Turn rough notes into a clean, professional resume and download it as a PDF.",
  },
};

export default function ResumeBuilderPage() {
  return (
    // pt-28 clears the fixed navbar — match whatever your other (site) pages use.
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-28 sm:px-6">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          Write the notes.
          <br />
          <span className="text-[#F6A700]">We&apos;ll write the resume.</span>
        </h1>
        <p className="mt-5 text-base leading-relaxed opacity-75 sm:text-lg">
          Tell us what you&apos;ve done in your own words. Our AI turns it into clear, professional bullet points
          without inventing anything, and you download a ready-to-send PDF.
        </p>
      </header>

      <ResumeBuilder />
    </div>
  );
}
