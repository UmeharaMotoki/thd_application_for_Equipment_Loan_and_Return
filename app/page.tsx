import { redirect } from "next/navigation";

/** トップは機器貸与申請へ誘導（左メニューと同じ画面） */
export default function HomePage() {
  redirect("/equipment-lending");
}
