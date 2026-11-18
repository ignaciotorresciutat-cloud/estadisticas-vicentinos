-- CreateTable
CREATE TABLE "RankingUrba" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "temporada" INTEGER NOT NULL,
    "posicion" INTEGER NOT NULL,
    "club" TEXT NOT NULL,
    "variacion" INTEGER
);

-- CreateIndex
CREATE UNIQUE INDEX "RankingUrba_temporada_posicion_key" ON "RankingUrba"("temporada", "posicion");
