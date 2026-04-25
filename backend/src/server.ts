import "dotenv/config";

import { app } from "./app";

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Home Inventory backend running on port ${port}`);
});
