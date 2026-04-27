import "dotenv/config";

import { app } from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  logger.info("Backend listening", { port });
});
