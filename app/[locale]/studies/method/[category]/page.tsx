import {
  generateCategoryMetadata,
  StudyCategoryPage,
  type CategoryPageParams,
} from "@/app/components/studies/category-page";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: CategoryPageParams;
}): Promise<Metadata> {
  return generateCategoryMetadata("method", params);
}

export default function Page({ params }: { params: CategoryPageParams }) {
  return <StudyCategoryPage kind="method" params={params} />;
}
