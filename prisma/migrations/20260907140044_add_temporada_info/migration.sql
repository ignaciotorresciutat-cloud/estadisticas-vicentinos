-- CreateTable
CREATE TABLE "TemporadaInfo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "temporada" INTEGER NOT NULL,
    "torneo" TEXT,
    "posicion" INTEGER,
    "rankingUrba" INTEGER,
    "campeon" BOOLEAN NOT NULL DEFAULT false,
    "ascenso" BOOLEAN NOT NULL DEFAULT false,
    "descenso" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "TemporadaInfo_temporada_key" ON "TemporadaInfo"("temporada");
