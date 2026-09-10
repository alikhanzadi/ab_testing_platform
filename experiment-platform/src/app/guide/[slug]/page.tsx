import type { Metadata } from "next";
import { getTestBySlug, TEST_CATALOG } from "@/data/testCatalog";
import TestDetailView from "./TestDetailView";

export function generateStaticParams() {
  return TEST_CATALOG.map((test) => ({ slug: test.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const test = getTestBySlug(slug);
  if (!test) return { title: "Test not found — Experiment Studio" };
  return {
    title: `${test.name} — Experiment Studio`,
    description: test.plainEnglish,
  };
}

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TestDetailView slug={slug} />;
}
