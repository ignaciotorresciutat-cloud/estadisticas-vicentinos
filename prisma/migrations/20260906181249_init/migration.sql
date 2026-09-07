-- CreateTable
CREATE TABLE "Club" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombreCanonico" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Jugador" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombreCanonico" TEXT NOT NULL,
    "vicentinoN" INTEGER,
    "camada" INTEGER,
    "esJugadorReal" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Partido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL,
    "fechaNota" TEXT,
    "temporada" INTEGER NOT NULL,
    "rivalId" INTEGER NOT NULL,
    "condicion" TEXT NOT NULL,
    "resultadoPropio" INTEGER NOT NULL,
    "resultadoRival" INTEGER NOT NULL,
    "cancha" TEXT,
    "clima" TEXT,
    "campoDeJuego" TEXT,
    "referee" TEXT,
    "categoria" TEXT,
    CONSTRAINT "Partido_rivalId_fkey" FOREIGN KEY ("rivalId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partidoId" INTEGER NOT NULL,
    "jugadorId" INTEGER NOT NULL,
    "rol" TEXT NOT NULL,
    "numeroCamiseta" INTEGER,
    "capitan" BOOLEAN NOT NULL DEFAULT false,
    "ingresoPorId" INTEGER,
    CONSTRAINT "Participacion_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Participacion_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Participacion_ingresoPorId_fkey" FOREIGN KEY ("ingresoPorId") REFERENCES "Jugador" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Puntuacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partidoId" INTEGER NOT NULL,
    "jugadorId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    CONSTRAINT "Puntuacion_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Puntuacion_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tarjeta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partidoId" INTEGER NOT NULL,
    "jugadorId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    CONSTRAINT "Tarjeta_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tarjeta_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_nombreCanonico_key" ON "Club"("nombreCanonico");

-- CreateIndex
CREATE UNIQUE INDEX "Jugador_nombreCanonico_key" ON "Jugador"("nombreCanonico");

-- CreateIndex
CREATE UNIQUE INDEX "Jugador_vicentinoN_key" ON "Jugador"("vicentinoN");

-- CreateIndex
CREATE UNIQUE INDEX "Participacion_partidoId_jugadorId_key" ON "Participacion"("partidoId", "jugadorId");
