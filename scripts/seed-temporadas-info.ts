import { fileURLToPath } from "node:url";
import { seedTemporadasInfo } from "./temporadas-info";

const CSV_PATH = fileURLToPath(new URL("../data/temporadas_info.csv", import.meta.url));

seedTemporadasInfo(CSV_PATH)
  .then((n) => {
    console.log(`✅ TemporadaInfo cargada: ${n} temporadas.`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
