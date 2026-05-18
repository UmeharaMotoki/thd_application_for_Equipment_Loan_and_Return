-- フォーム選択肢マスタ（category で論理分割）
CREATE TABLE "application_select_option" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_select_option_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "application_select_option_category_isActive_sortOrder_idx"
    ON "application_select_option" ("category", "isActive", "sortOrder");
